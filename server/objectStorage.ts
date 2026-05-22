import { Storage, File } from "@google-cloud/storage";
import { Response } from "express";
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

// Initialize GCS client with standard credentials if available, 
// otherwise fall back to Replit sidecar if running on Replit,
// or a mock client for local development.
export const objectStorageClient = process.env.GCS_KEY_FILE 
  ? new Storage({ keyFilename: process.env.GCS_KEY_FILE })
  : process.env.GCS_PROJECT_ID && process.env.GCS_CLIENT_EMAIL && process.env.GCS_PRIVATE_KEY
    ? new Storage({
        projectId: process.env.GCS_PROJECT_ID,
        credentials: {
          client_email: process.env.GCS_CLIENT_EMAIL,
          private_key: process.env.GCS_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }
      })
    : process.env.REPLIT_ID 
      ? new Storage({
          credentials: {
            audience: "replit",
            subject_token_type: "access_token",
            token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
            type: "external_account",
            credential_source: {
              url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
              format: {
                type: "json",
                subject_token_field_name: "access_token",
              },
            },
            universe_domain: "googleapis.com",
          },
          projectId: "",
        })
      : new Storage(); // Fallback for local dev (will use local-object-storage mocks)

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  constructor() {}

  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((path) => path.trim())
          .filter((path) => path.length > 0)
      )
    );
    if (paths.length === 0) {
      console.error("PUBLIC_OBJECT_SEARCH_PATHS environment variable not configured");
      return [];
    }
    return paths;
  }

  async searchPublicObject(filePath: string): Promise<File | null> {
    const searchPaths = this.getPublicObjectSearchPaths();
    if (searchPaths.length === 0) {
      console.error("No public object search paths configured");
      return null;
    }

    for (const searchPath of searchPaths) {
      try {
        const fullPath = `${searchPath}/${filePath}`;
        const { bucketName, objectName } = parseObjectPath(fullPath);
        const bucket = objectStorageClient.bucket(bucketName);
        const file = bucket.file(objectName);

        const [exists] = await file.exists();
        if (exists) {
          return file;
        }
      } catch (error) {
        console.error(`Error searching in path ${searchPath}:`, error);
        continue;
      }
    }

    return null;
  }

  async downloadObject(file: File, res: Response, cacheTtlSec: number = 3600) {
    try {
      const [metadata] = await file.getMetadata();
      const aclPolicy = await getObjectAclPolicy(file);
      const isPublic = aclPolicy?.visibility === "public";

      res.set({
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Content-Length": metadata.size,
        "Cache-Control": `${
          isPublic ? "public" : "private"
        }, max-age=${cacheTtlSec}`,
      });

      const stream = file.createReadStream();

      stream.on("error", (err) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        } else {
          // Response already started, terminate it
          res.end();
        }
      });

      stream.on("end", () => {
        res.end();
      });

      stream.pipe(res, { end: false });
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to download file" });
      }
    }
  }

  async getProductImageUploadURL(): Promise<string> {
    const publicSearchPaths = this.getPublicObjectSearchPaths();
    const publicPath = publicSearchPaths[0];

    const imageId = `product_${Date.now()}_${randomUUID()}`;
    const fullPath = `${publicPath}/products/${imageId}`;

    const { bucketName, objectName } = parseObjectPath(fullPath);

    return signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900,
    });
  }

  async getEmailAssetUploadURL(filename?: string): Promise<{ uploadURL: string; assetPath: string }> {
    const publicSearchPaths = this.getPublicObjectSearchPaths();
    const publicPath = publicSearchPaths[0];

    const assetId = `email_${Date.now()}_${randomUUID()}`;
    const extension = filename ? filename.split('.').pop() : 'jpg';
    const fullPath = `${publicPath}/email-assets/${assetId}.${extension}`;

    const { bucketName, objectName } = parseObjectPath(fullPath);

    const uploadURL = await signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900,
    });

    return {
      uploadURL,
      assetPath: `/email-assets/${assetId}.${extension}`,
    };
  }

  async setEmailAssetAclPolicy(rawPath: string): Promise<string> {
    const { bucketName, objectName } = this.parseEmailAssetPath(rawPath);

    const isValidPath = objectName.includes('/email-assets/') || objectName.startsWith('email-assets/');
    if (!isValidPath) {
      console.error(`Invalid object path: ${objectName}, expected to contain 'email-assets/'`);
      throw new Error('Invalid object path: must be in email-assets/ directory');
    }

    const bucket = objectStorageClient.bucket(bucketName);
    const objectFile = bucket.file(objectName);

    const [exists] = await objectFile.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }

    await setObjectAclPolicy(objectFile, {
      owner: "admin",
      visibility: "public",
    });

    const filename = objectName.split('/').pop();
    return `/email-assets/${filename}`;
  }

  async listEmailAssets(deduplicate: boolean = false): Promise<Array<{ name: string; url: string; size: number; created: string }>> {
    // If not on Replit, return empty list to trigger local upload bypass logic
    // If not on Replit or GCS not fully configured, return empty list to trigger local upload bypass logic
    const isGcsConfigured = !!(process.env.GCS_KEY_FILE || (process.env.GCS_PROJECT_ID && process.env.GCS_CLIENT_EMAIL && process.env.GCS_PRIVATE_KEY));
    if (!isGcsConfigured && !process.env.REPLIT_ID) {
      return [];
    }

    const publicSearchPaths = this.getPublicObjectSearchPaths();
    const publicPath = publicSearchPaths[0];
    
    const { bucketName, objectName } = parseObjectPath(`${publicPath}/email-assets/`);
    const bucket = objectStorageClient.bucket(bucketName);
    
    try {
      const [files] = await bucket.getFiles({ prefix: objectName });
      const allAssets = files
        .filter(file => !file.name.endsWith('/'))
        .map(file => ({
          name: file.name.split('/').pop() || file.name,
          url: `/email-assets/${file.name.split('/').pop()}`,
          size: parseInt(file.metadata.size as string) || 0,
          created: file.metadata.timeCreated as string || new Date().toISOString(),
          md5Hash: (file.metadata.md5Hash as string) || '',
        }));

      if (deduplicate) {
        const seen = new Map<string, typeof allAssets[0]>();
        for (const asset of allAssets) {
          const key = asset.md5Hash ? `hash:${asset.md5Hash}` : `size:${asset.size}:${asset.name}`;
          if (!seen.has(key) || asset.created > seen.get(key)!.created) {
            seen.set(key, asset);
          }
        }
        return Array.from(seen.values())
          .map(({ md5Hash, ...rest }) => rest)
          .sort((a, b) => b.created.localeCompare(a.created));
      }

      return allAssets.map(({ md5Hash, ...rest }) => rest);
    } catch (error) {
      console.error("Error listing email assets:", error);
      return [];
    }
  }

  private parseEmailAssetPath(rawPath: string): {
    bucketName: string;
    objectName: string;
  } {
    if (rawPath.startsWith("https://storage.googleapis.com/")) {
      const url = new URL(rawPath);
      const pathParts = url.pathname.split("/");
      return {
        bucketName: pathParts[1],
        objectName: pathParts.slice(2).join("/"),
      };
    }

    const publicSearchPaths = this.getPublicObjectSearchPaths();
    const publicPath = publicSearchPaths[0];
    return parseObjectPath(`${publicPath}${rawPath}`);
  }

  async setProductImageAclPolicy(rawPath: string): Promise<string> {
    const { bucketName, objectName } = this.parseProductImagePath(rawPath);

    // Validate that object is in the products/ directory (may be public/products/ or just products/)
    const isValidPath = objectName.includes('/products/') || objectName.startsWith('products/');
    if (!isValidPath) {
      console.error(`Invalid object path: ${objectName}, expected to contain 'products/'`);
      throw new Error('Invalid object path: must be in products/ directory');
    }

    const bucket = objectStorageClient.bucket(bucketName);
    const objectFile = bucket.file(objectName);

    const [exists] = await objectFile.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }

    // Set ACL metadata (server will enforce this when serving images)
    await setObjectAclPolicy(objectFile, {
      owner: "admin",
      visibility: "public",
    });

    // Note: We don't call makePublic() because Replit's object storage has
    // Public Access Prevention enabled. Instead, images are served through
    // our proxy endpoint (/products/:filePath) which enforces ACL policies.

    // Extract just the filename for the return path
    const filename = objectName.split('/').pop();
    return `/products/${filename}`;
  }

  async canAccessPublicObject(file: File): Promise<boolean> {
    try {
      const aclPolicy = await getObjectAclPolicy(file);
      // If no ACL policy exists, deny access (should have been set during upload)
      if (!aclPolicy) {
        return false;
      }
      // Only allow access if visibility is explicitly public
      return aclPolicy.visibility === "public";
    } catch (error) {
      console.error("Error checking ACL policy:", error);
      return false;
    }
  }

  private parseProductImagePath(rawPath: string): {
    bucketName: string;
    objectName: string;
  } {
    if (rawPath.startsWith("https://storage.googleapis.com/")) {
      const url = new URL(rawPath);
      const pathParts = url.pathname.split("/");
      return {
        bucketName: pathParts[1],
        objectName: pathParts.slice(2).join("/"),
      };
    }

    const publicSearchPaths = this.getPublicObjectSearchPaths();
    const publicPath = publicSearchPaths[0];
    return parseObjectPath(`${publicPath}${rawPath}`);
  }

  // Upload a local file to email-assets and return the public URL path
  async uploadLocalFileToEmailAssets(localFilePath: string, targetFilename: string): Promise<string> {
    try {
      // Check if file exists locally
      if (!fs.existsSync(localFilePath)) {
        throw new Error(`Local file not found: ${localFilePath}`);
      }

      // If not on Replit, just return the target asset path directly
      const isGcsConfigured = !!(process.env.GCS_KEY_FILE || (process.env.GCS_PROJECT_ID && process.env.GCS_CLIENT_EMAIL && process.env.GCS_PRIVATE_KEY));
      if (!isGcsConfigured && !process.env.REPLIT_ID) {
        console.log(`Local development mode: skipping upload for ${targetFilename}`);
        return `/email-assets/${targetFilename}`;
      }

      // Get upload URL
      const { uploadURL, assetPath } = await this.getEmailAssetUploadURL(targetFilename);
      
      // Read file content
      const fileContent = fs.readFileSync(localFilePath);
      
      // Determine content type
      const ext = path.extname(targetFilename).toLowerCase();
      const contentTypes: Record<string, string> = {
        '.webp': 'image/webp',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
      };
      const contentType = contentTypes[ext] || 'application/octet-stream';

      // Upload using signed URL
      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
        },
        body: fileContent,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status}`);
      }

      const publicPath = await this.setEmailAssetAclPolicy(uploadURL);
      return publicPath;
    } catch (error) {
      console.error('Failed to upload local file to email-assets:', error);
      throw error;
    }
  }

  // Generic helper to ensure an email asset is uploaded
  private async ensureEmailAssetUploaded(localPath: string, targetFilename: string): Promise<string> {
    try {
      const assets = await this.listEmailAssets();
      const existing = assets.find(a => a.name === targetFilename);
      
      if (existing) {
        return existing.url;
      }
      
      return await this.uploadLocalFileToEmailAssets(localPath, targetFilename);
    } catch (error) {
      console.error(`Failed to ensure ${targetFilename} is uploaded:`, error);
      throw error;
    }
  }

  // Ensure Yens logo is uploaded
  async ensureYensLogoUploaded(): Promise<string> {
    return this.ensureEmailAssetUploaded(
      './server/assets/Yens_logo_high_res_1766925576641.png',
      'yens-logo-official-hires.png'
    );
  }

  // Ensure birthday graphic is uploaded
  async ensureBirthdayGraphicUploaded(): Promise<string> {
    return this.ensureEmailAssetUploaded(
      './server/assets/WhatsApp_Image_2026-01-20_at_12.12.50_1768965601005.jpeg',
      'birthday-graphic-2026.jpeg'
    );
  }
}

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return {
    bucketName,
    objectName,
  };
}

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  // If not on Replit, return a local mock URL to prevent ECONNREFUSED
  const isGcsConfigured = !!(process.env.GCS_KEY_FILE || (process.env.GCS_PROJECT_ID && process.env.GCS_CLIENT_EMAIL && process.env.GCS_PRIVATE_KEY));
  if (!isGcsConfigured && !process.env.REPLIT_ID) {
    return `http://localhost:5000/local-object-storage/${bucketName}/${objectName}`;
  }

  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    }
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}, ` +
        `make sure you're running on Replit`
    );
  }

  const { signed_url: signedURL } = await response.json();
  return signedURL;
}
