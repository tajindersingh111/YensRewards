import { Response } from "express";
import * as fs from "fs";
import * as path from "path";
import { env } from "./env";

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  private emailAssetsDir = "/data/uploads/email-assets";

  constructor() {
    // Ensure email assets directory exists
    if (!fs.existsSync(this.emailAssetsDir)) {
      try {
        fs.mkdirSync(this.emailAssetsDir, { recursive: true });
      } catch (err) {
        console.error("Failed to create email assets directory in ObjectStorageService constructor:", err);
      }
    }
  }

  async getEmailAssetUploadURL(filename?: string): Promise<{ uploadURL: string; assetPath: string }> {
    const name = filename || `email_${Date.now()}`;
    const uploadURL = `${env.APP_PUBLIC_URL}/api/admin/email-assets/upload-file?filename=${encodeURIComponent(name)}`;
    const assetPath = `/email-assets/${name}`;
    return { uploadURL, assetPath };
  }

  async setEmailAssetAclPolicy(assetPath: string): Promise<string> {
    const filename = path.basename(assetPath);
    return `/email-assets/${filename}`;
  }

  async uploadLocalFileToEmailAssets(localPath: string, targetFilename: string): Promise<string> {
    try {
      const dest = path.join(this.emailAssetsDir, targetFilename);
      fs.copyFileSync(localPath, dest);
      return `/email-assets/${targetFilename}`;
    } catch (error) {
      console.error('Failed to copy local file to email-assets:', error);
      throw error;
    }
  }

  async listEmailAssets(deduplicate: boolean = false): Promise<Array<{ name: string; url: string; size: number; created: string }>> {
    try {
      if (!fs.existsSync(this.emailAssetsDir)) {
        return [];
      }
      const files = fs.readdirSync(this.emailAssetsDir);
      const assets = files.map(filename => {
        const filePath = path.join(this.emailAssetsDir, filename);
        const stats = fs.statSync(filePath);
        return {
          name: filename,
          url: `/email-assets/${filename}`,
          size: stats.size,
          created: stats.mtime.toISOString(),
        };
      });

      // Sort by creation date descending
      return assets.sort((a, b) => b.created.localeCompare(a.created));
    } catch (error) {
      console.error("Error listing email assets:", error);
      return [];
    }
  }

  // Generic helper to ensure an email asset is uploaded from local assets directory
  private async ensureEmailAssetUploaded(localPath: string, targetFilename: string): Promise<string> {
    try {
      const dest = path.join(this.emailAssetsDir, targetFilename);
      if (fs.existsSync(dest)) {
        return `/email-assets/${targetFilename}`;
      }
      if (fs.existsSync(localPath)) {
        fs.copyFileSync(localPath, dest);
        return `/email-assets/${targetFilename}`;
      }
      return `/email-assets/${targetFilename}`;
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

  // Fallback signature mocks to prevent breaking any imports / types
  async searchPublicObject(filePath: string): Promise<any> {
    return null;
  }
  async canAccessPublicObject(file: any): Promise<boolean> {
    return false;
  }
  async downloadObject(file: any, res: Response, cacheTtlSec: number = 3600) {
    res.status(404).end();
  }
}
