// Google Sheets backup via Replit Connectors SDK (google-sheet connector)
// Scopes: drive.file + spreadsheets — tokens handled automatically, never cache the client.
import { ReplitConnectors } from "@replit/connectors-sdk";
import { db } from "./db";
import { appSettings } from "@shared/schema";
import { eq } from "drizzle-orm";

const SALES_SHEET_KEY = "google_backup_sales_sheet_id";
const CUST_SHEET_KEY  = "google_backup_customers_sheet_id";

async function sheetsRequest(path: string, options: RequestInit = {}): Promise<any> {
  const connectors = new ReplitConnectors();
  return connectors.proxy("google-sheet", path, options as any);
}

async function getSheetId(key: string): Promise<string | null> {
  const rows = await db.select().from(appSettings).where(eq(appSettings.key, key));
  return rows[0]?.value ?? null;
}

async function saveSheetId(key: string, id: string): Promise<void> {
  await db.insert(appSettings).values({ key, value: id })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: id } });
}

async function createSpreadsheet(title: string): Promise<string> {
  const res = await sheetsRequest("/v4/spreadsheets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      properties: { title },
      sheets: [{ properties: { title: "Data" } }],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Create sheet failed: ${JSON.stringify(data.error)}`);
  return data.spreadsheetId as string;
}

async function writeToSheet(spreadsheetId: string, rows: string[][]): Promise<void> {
  // 1. Clear existing content
  const clearRes = await sheetsRequest(
    `/v4/spreadsheets/${spreadsheetId}/values:batchClear`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ranges: ["Data!A:ZZ"] }),
    }
  );
  const clearData = await clearRes.json();
  if (clearData.error) throw new Error(`Clear failed: ${JSON.stringify(clearData.error)}`);

  // 2. Write fresh data from A1
  const range = encodeURIComponent("Data!A1");
  const writeRes = await sheetsRequest(
    `/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values: rows }),
    }
  );
  const writeData = await writeRes.json();
  if (writeData.error) throw new Error(`Write failed: ${JSON.stringify(writeData.error)}`);
}

function csvToRows(csv: string): string[][] {
  if (!csv) return [];
  return csv.split("\n").map(line => {
    const cells: string[] = [];
    let inQuote = false;
    let cur = "";
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === "," && !inQuote) { cells.push(cur); cur = ""; }
      else cur += ch;
    }
    cells.push(cur);
    return cells;
  });
}

export async function uploadBackupToSheets(
  files: { name: string; title: string; settingsKey: string; content: string }[]
): Promise<{ success: boolean; message: string }> {
  const results: string[] = [];
  let anyFailed = false;

  for (const file of files) {
    try {
      let sheetId = await getSheetId(file.settingsKey);

      if (!sheetId) {
        sheetId = await createSpreadsheet(file.title);
        await saveSheetId(file.settingsKey, sheetId);
        console.log(`💾 Created Google Sheet "${file.title}" (${sheetId})`);
      }

      const rows = csvToRows(file.content);
      await writeToSheet(sheetId, rows);
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
