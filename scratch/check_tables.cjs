const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '..', 'sqlite.db');
const db = new Database(dbPath);

const tables = ['users', 'customers', 'sites', 'products', 'daily_sales'];

console.log('--- Database Table Counts ---');
for (const table of tables) {
  try {
    const row = db.prepare(`SELECT count(*) as count FROM ${table}`).get();
    console.log(`${table}: ${row.count} rows`);
  } catch (err) {
    console.error(`Error querying table ${table}: ${err.message}`);
  }
}

try {
  console.log('\n--- Sites Sample (Channels) ---');
  const sitesList = db.prepare('SELECT id, name, channel_name, type, is_active FROM sites LIMIT 5').all();
  console.table(sitesList);
} catch (err) {
  console.error(`Error querying sites: ${err.message}`);
}

try {
  console.log('\n--- Products Sample ---');
  const productsList = db.prepare('SELECT id, name, category, price, available FROM products LIMIT 5').all();
  console.table(productsList);
} catch (err) {
  console.error(`Error querying products: ${err.message}`);
}

db.close();
