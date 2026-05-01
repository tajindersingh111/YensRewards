// Google Sheets backup via Replit Connectors SDK (google-sheet connector)
// Scopes: drive.file + spreadsheets — tokens handled automatically, never cache the client.
// Files are placed/moved into TARGET_FOLDER_ID (user's shared Yen's Drive folder).
import { ReplitConnectors } from "@replit/connectors-sdk";
import { db } from "./db";
import { appSettings } from "@shared/schema";
import { eq } from "drizzle-orm";

const SALES_SHEET_KEY  = "google_backup_sales_sheet_id";
const CUST_SHEET_KEY   = "google_backup_customers_sheet_id";
const TARGET_FOLDER_ID = "1rrmM_lcRhHY1oxRNob6qGxiHeWmFYVtz";

// ── Sheets API proxy ─────────────────────────────────────────────────────────

async function sheetsRequest(path: string, options: RequestInit = {}): Promise<any> {
  const connectors = new ReplitConnectors();
  return connectors.proxy("google-sheet", path, options as any);
}

// ── Drive API (raw fetch with token from listConnections) ────────────────────

async function getDriveToken(): Promise<string | null> {
  try {
    const connectors = new ReplitConnectors();
    const connections = await connectors.listConnections({ connector_names: "google-sheet" });
    return (connections[0] as any)?.settings?.access_token ?? null;
  } catch {
    return null;
  }
}

async function moveToFolder(fileId: string, token: string): Promise<void> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${TARGET_FOLDER_ID}&fields=id`;
  const res  = await fetch(url, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (data.error) {
    console.warn(`⚠️  Could not move sheet ${fileId} to folder: ${data.error.message}`);
  }
}

// ── App-settings helpers ──────────────────────────────────────────────────────

async function getSheetId(key: string): Promise<string | null> {
  const rows = await db.select().from(appSettings).where(eq(appSettings.key, key));
  return rows[0]?.value ?? null;
}

async function saveSheetId(key: string, id: string): Promise<void> {
  await db.insert(appSettings).values({ key, value: id })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: id } });
}

// ── Spreadsheet lifecycle ─────────────────────────────────────────────────────

async function createSpreadsheet(title: string): Promise<string> {
  const res  = await sheetsRequest("/v4/spreadsheets", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({
      properties: { title },
      sheets:     [{ properties: { title: "Data" } }],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Create sheet failed: ${JSON.stringify(data.error)}`);
  return data.spreadsheetId as string;
}

async function writeToSheet(spreadsheetId: string, rows: string[][]): Promise<void> {
  const clearRes  = await sheetsRequest(
    `/v4/spreadsheets/${spreadsheetId}/values:batchClear`,
    {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ ranges: ["Data!A:ZZ"] }),
    }
  );
  const clearData = await clearRes.json();
  if (clearData.error) throw new Error(`Clear failed: ${JSON.stringify(clearData.error)}`);

  const range    = encodeURIComponent("Data!A1");
  const writeRes = await sheetsRequest(
    `/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`,
    {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ values: rows }),
    }
  );
  const writeData = await writeRes.json();
  if (writeData.error) throw new Error(`Write failed: ${JSON.stringify(writeData.error)}`);
}

// ── CSV → 2-D array ───────────────────────────────────────────────────────────

function csvToRows(csv: string): string[][] {
  if (!csv) return [];
  return csv.split("\n").map(line => {
    const cells: string[] = [];
    let inQuote = false;
    let cur = "";
    for (const ch of line) {
      if (ch === '"')              { inQuote = !inQuote; }
      else if (ch === "," && !inQuote) { cells.push(cur); cur = ""; }
      else                         { cur += ch; }
    }
    cells.push(cur);
    return cells;
  });
}

// ── Public entry point ────────────────────────────────────────────────────────

export async function uploadBackupToSheets(
  files: { name: string; title: string; settingsKey: string; content: string }[]
): Promise<{ success: boolean; message: string }> {
  const driveToken = await getDriveToken();
  const results: string[] = [];
  let anyFailed = false;

  for (const file of files) {
    try {
      let sheetId = await getSheetId(file.settingsKey);
      const isNew = !sheetId;

      if (isNew) {
        sheetId = await createSpreadsheet(file.title);
        await saveSheetId(file.settingsKey, sheetId);
        console.log(`💾 Created Google Sheet "${file.title}" (${sheetId})`);
      }

      // Place new sheets in the target folder; also ensure existing ones are moved there.
      if (driveToken) {
        await moveToFolder(sheetId!, driveToken);
        if (isNew) console.log(`📁 Moved "${file.title}" → Drive folder ${TARGET_FOLDER_ID}`);
      } else {
        console.warn(`⚠️  No Drive token available — sheet stays in My Drive root`);
      }

      const rows = csvToRows(file.content);
      await writeToSheet(sheetId!, rows);
      results.push(`${file.name} ✓`);
    } catch (err) {
      anyFailed = true;
      results.push(`${file.name} ✗: ${String(err)}`);
      console.error(`💾 Google Sheets backup error for ${file.name}:`, err);
    }
  }

  return {
    success: !anyFailed,
    message: `Google Sheets: ${results.join(" | ")}`,
  };
}
