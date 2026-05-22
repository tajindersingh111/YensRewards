import fs from 'fs';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backupPath = path.join(__dirname, 'neon_backup.json');
const dbPath = path.resolve(__dirname, '..', 'sqlite.db');

if (!fs.existsSync(backupPath)) {
  console.error("❌ ERROR: neon_backup.json not found! Run the extraction script first.");
  process.exit(1);
}

console.log("⏳ Reading backup file...");
const data = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));

console.log(`⏳ Connecting to local SQLite DB at: ${dbPath}`);
const db = new Database(dbPath);

// Temporarily disable foreign keys to allow merging tables in any order
db.pragma('foreign_keys = OFF');

console.log("📊 Starting merge process...");

for (const [tableName, rows] of Object.entries(data)) {
  if (rows.length === 0) {
    console.log(`➖ Skipping empty table: ${tableName}`);
    continue;
  }
  
  // Get columns from the first row
  const keys = Object.keys(rows[0]);
  const columns = keys.map(k => `"${k}"`).join(', ');
  const placeholders = keys.map(() => '?').join(', ');
  
  // Using INSERT OR REPLACE to perform a merge/upsert based on primary keys
  const insertStmt = db.prepare(`INSERT OR REPLACE INTO "${tableName}" (${columns}) VALUES (${placeholders})`);
  
  const insertMany = db.transaction((rowsToInsert) => {
    for (const row of rowsToInsert) {
      const values = keys.map(k => {
        let val = row[k];
        // SQLite uses 1/0 for booleans
        if (typeof val === 'boolean') {
          return val ? 1 : 0;
        }
        // Stringify JSON objects and arrays
        if (typeof val === 'object' && val !== null && !(val instanceof Date)) {
          return JSON.stringify(val);
        }
        return val;
      });
      insertStmt.run(values);
    }
  });

  try {
    insertMany(rows);
    console.log(`✅ Merged ${rows.length} rows into [${tableName}]`);
  } catch (err) {
    console.error(`❌ Error merging table [${tableName}]:`, err.message);
  }
}

// Re-enable foreign keys
db.pragma('foreign_keys = ON');
db.close();

console.log("\n🎉 Merge Complete! Your SQLite database is now synced with Neon's data.");
