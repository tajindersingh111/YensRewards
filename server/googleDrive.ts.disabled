// Google Drive integration via Replit Connectors SDK
// Uses the proxy pattern — tokens are handled automatically, never cache the client.
import { ReplitConnectors } from "@replit/connectors-sdk";

const FOLDER_NAME = "YensThai Backups";
const BOUNDARY = "yens_backup_part_boundary";

async function driveRequest(path: string, options: RequestInit = {}): Promise<any> {
  const connectors = new ReplitConnectors();
  return connectors.proxy("google-drive", path, options as any);
}

async function findFolder(): Promise<string | null> {
  try {
    const q = encodeURIComponent(
      `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
    );
    const res = await driveRequest(`/drive/v3/files?q=${q}&fields=files(id,name)`);
    const data = await res.json();
    if (data.files && data.files.length > 0) return data.files[0].id as string;
    return null;
  } catch {
    return null;
  }
}

async function createFolder(): Promise<string> {
  const res = await driveRequest("/drive/v3/files", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Drive folder create failed: ${JSON.stringify(data.error)}`);
  return data.id as string;
}

async function findFile(name: string, folderId: string): Promise<string | null> {
  try {
    const q = encodeURIComponent(
      `name='${name}' and '${folderId}' in parents and trashed=false`
    );
    const res = await driveRequest(`/drive/v3/files?q=${q}&fields=files(id,name)`);
    const data = await res.json();
    if (data.files && data.files.length > 0) return data.files[0].id as string;
    return null;
  } catch {
    return null;
  }
}

function buildMultipartBody(metadata: Record<string, any>, csvContent: string): string {
  return [
    `--${BOUNDARY}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(metadata),
    `--${BOUNDARY}`,
    "Content-Type: text/csv; charset=UTF-8",
    "",
    csvContent,
    `--${BOUNDARY}--`,
  ].join("\r\n");
}

async function upsertFile(name: string, content: string, folderId: string): Promise<void> {
  const existingId = await findFile(name, folderId);
  const contentType = `multipart/related; boundary=${BOUNDARY}`;

  if (existingId) {
    // Update existing file — don't include parents (immutable via multipart)
    const body = buildMultipartBody({ name, mimeType: "text/csv" }, content);
    const res = await driveRequest(
      `/upload/drive/v3/files/${existingId}?uploadType=multipart`,
      { method: "PATCH", headers: { "Content-Type": contentType }, body }
    );
    const data = await res.json();
    if (data.error) throw new Error(`Drive update failed for ${name}: ${JSON.stringify(data.error)}`);
  } else {
    // Create new file with parent folder
    const body = buildMultipartBody(
      { name, mimeType: "text/csv", parents: [folderId] },
      content
    );
    const res = await driveRequest(
      "/upload/drive/v3/files?uploadType=multipart",
      { method: "POST", headers: { "Content-Type": contentType }, body }
    );
    const data = await res.json();
    if (data.error) throw new Error(`Drive create failed for ${name}: ${JSON.stringify(data.error)}`);
  }
}

export async function uploadBackupToDrive(
  files: { name: string; content: string }[]
): Promise<{ success: boolean; message: string }> {
  try {
    let folderId = await findFolder();
    if (!folderId) {
      folderId = await createFolder();
    }
    for (const file of files) {
      await upsertFile(file.name, file.content, folderId);
    }
    return { success: true, message: `${files.length} files uploaded to Google Drive → "${FOLDER_NAME}/"` };
  } catch (err) {
    return { success: false, message: `Google Drive upload failed: ${String(err)}` };
  }
}
