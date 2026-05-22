const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '..', 'sqlite.db');
const db = new Database(dbPath);

try {
  console.log('Cleaning up test data...');
  
  const salesResult = db.prepare("DELETE FROM daily_sales WHERE order_channel = 'TESTSTALL'").run();
  console.log(`Deleted ${salesResult.changes} test sales rows.`);

  const sitesResult = db.prepare("DELETE FROM sites WHERE channel_name = 'TESTSTALL'").run();
  console.log(`Deleted ${sitesResult.changes} test sites rows.`);

  const productsResult = db.prepare("DELETE FROM products WHERE name = 'Test Choco Shake'").run();
  console.log(`Deleted ${productsResult.changes} test products rows.`);

  console.log('✅ Cleanup complete!');
} catch (err) {
  console.error('❌ Error during cleanup:', err.message);
} finally {
  db.close();
}
