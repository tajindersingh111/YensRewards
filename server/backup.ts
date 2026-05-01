import { db } from "./db";
import { sql } from "drizzle-orm";

const GITHUB_OWNER = "Leonardfraser";
const GITHUB_REPO = "YensRewards";
const BACKUP_BRANCH = "main";

function toCSV(rows: Record<string, any>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: any): string => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const lines = [
    headers.join(","),
    ...rows.map(r => headers.map(h => escape(r[h])).join(",")),
  ];
  return lines.join("\n");
}

async function getFileSha(path: string, token: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}?ref=${BACKUP_BRANCH}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } }
    );
    if (!res.ok) return null;
    const data = await res.json() as any;
    return data.sha ?? null;
  } catch {
    return null;
  }
}

async function pushFile(path: string, content: string, message: string, token: string): Promise<void> {
  const sha = await getFileSha(path, token);
  const body: Record<string, any> = {
    message,
    content: Buffer.from(content).toString("base64"),
    branch: BACKUP_BRANCH,
  };
  if (sha) body.sha = sha;

  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub push failed for ${path}: ${res.status} ${err}`);
  }
}

export async function runDailyBackup(): Promise<{ success: boolean; message: string }> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return { success: false, message: "GITHUB_TOKEN not set — backup skipped" };
  }

  const today = new Date().toISOString().split("T")[0];

  try {
    // ── Export daily_sales ──────────────────────────────────────────────────
    const salesResult = await db.execute(sql`
      SELECT date, day_of_week, order_channel, net_sales, grab_fee, other_sales,
             other_sales_note, total_sales, imported_at, created_at
      FROM daily_sales ORDER BY date, order_channel
    `);
    const salesCSV = toCSV(salesResult.rows as Record<string, any>[]);

    // ── Export customers ────────────────────────────────────────────────────
    const custResult = await db.execute(sql`
      SELECT id, name, phone, email, birthday, points, tier, referral_code,
             total_spent, gender, register_date, register_branch, last_use, tag, created_at
      FROM customers ORDER BY created_at
    `);
    const custCSV = toCSV(custResult.rows as Record<string, any>[]);

    // ── Push both files to GitHub ───────────────────────────────────────────
    const commitMsg = `Daily backup ${today}`;
    await pushFile("backups/daily_sales.csv", salesCSV, commitMsg, token);
    await pushFile("backups/customers.csv", custCSV, commitMsg, token);

    const salesRows = salesResult.rows.length;
    const custRows = custResult.rows.length;
    return {
      success: true,
      message: `Backup complete: ${salesRows} sales rows, ${custRows} customers → GitHub backups/`,
    };
  } catch (err) {
    return { success: false, message: `Backup failed: ${String(err)}` };
  }
}
