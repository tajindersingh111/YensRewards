import fs from 'fs';
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const neonUrl = process.env.DATABASE_URL;

if (!neonUrl) {
  console.error("❌ ERROR: DATABASE_URL not found in .env");
  process.exit(1);
}

const client = new Client({
  connectionString: neonUrl,
  ssl: {
    rejectUnauthorized: false
  }
});

async function extractData() {
  try {
    console.log("⏳ Connecting to Neon Database...");
    await client.connect();
    console.log("✅ Connected successfully!");

    // Get all tables in the public schema
    const tablesQuery = `
      SELECT tablename 
      FROM pg_catalog.pg_tables 
      WHERE schemaname = 'public';
    `;
    
    const { rows: tables } = await client.query(tablesQuery);
    const backupData = {};

    console.log(`📊 Found ${tables.length} tables. Starting extraction...`);

    for (const table of tables) {
      const tableName = table.tablename;
      console.log(`- Extracting ${tableName}...`);
      
      const { rows } = await client.query(`SELECT * FROM "${tableName}"`);
      backupData[tableName] = rows;
    }

    const backupPath = './scratch/neon_backup.json';
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    
    console.log(`\n🎉 Extraction Complete! All data saved to: ${backupPath}`);
    
  } catch (err) {
    console.error("❌ Error during extraction:", err);
  } finally {
    await client.end();
  }
}

extractData();
