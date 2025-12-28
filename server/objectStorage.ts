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

export const objectStorageClient = new Storage({
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
});

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

  async listEmailAssets(): Promise<Array<{ name: string; url: string; size: number; created: string }>> {
    const publicSearchPaths = this.getPublicObjectSearchPaths();
    const publicPath = publicSearchPaths[0];
    
    const { bucketName, objectName } = parseObjectPath(`${publicPath}/email-assets/`);
    const bucket = objectStorageClient.bucket(bucketName);
    
    try {
      const [files] = await bucket.getFiles({ prefix: objectName });
      return files
        .filter(file => !file.name.endsWith('/'))
        .map(file => ({
          name: file.name.split('/').pop() || file.name,
          url: `/email-assets/${file.name.split('/').pop()}`,
          size: parseInt(file.metadata.size as string) || 0,
          created: file.metadata.timeCreated as string || new Date().toISOString(),
        }));
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

      // Set ACL policy to make it public
      const publicPath = await this.setEmailAssetAclPolicy(uploadURL);
      
      console.log(`✅ Uploaded ${targetFilename} to email-assets: ${publicPath}`);
      return publicPath;
    } catch (error) {
      console.error(`Failed to upload local file to email-assets:`, error);
      throw error;
    }
  }

  // Check if logo exists in email-assets, upload if not
  async ensureYensLogoUploaded(): Promise<string> {
    // Use the higher-quality PNG logo instead of compressed WebP
    const logoFilename = 'yens-logo-hq.png';
    const localLogoPath = './attached_assets/yens logo_1760702216221.png';
    
    try {
      // Check if HIGH-QUALITY logo already exists in email-assets
      const assets = await this.listEmailAssets();
      const existingLogo = assets.find(a => a.name === logoFilename);
      
      if (existingLogo) {
        console.log(`✅ Yens HQ logo already exists in email-assets: ${existingLogo.url}`);
        return existingLogo.url;
      }
      
      // Upload the high-quality PNG logo (always upload fresh to ensure quality)
      console.log(`📤 Uploading high-quality Yens logo (PNG): ${localLogoPath}`);
      const logoUrl = await this.uploadLocalFileToEmailAssets(localLogoPath, logoFilename);
      return logoUrl;
    } catch (error) {
      console.error('Failed to ensure Yens logo is uploaded:', error);
      throw error;
    }
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
