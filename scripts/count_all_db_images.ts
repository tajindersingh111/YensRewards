import pg from 'pg';

const pool = new pg.Pool({
  connectionString: "postgresql://postgres:pSVJIsYkqvRmYbSVnpfSxrTfrGBhgaqY@tokaido.proxy.rlwy.net:29751/railway",
  ssl: { rejectUnauthorized: false },
});

async function run() {
  console.log("🔍 Fetching list of all tables in Railway PostgreSQL Database...\n");

  const tablesRes = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `);

  const tables = tablesRes.rows.map(r => r.table_name);
  console.log(`📋 Found ${tables.length} tables in Railway DB:`, tables.join(', '));
  console.log('\n----------------------------------------\n');

  let grandTotalImages = 0;

  for (const table of tables) {
    try {
      const colsRes = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = $1;
      `, [table]);

      const cols = colsRes.rows.map(r => r.column_name);
      const imgCols = cols.filter(c => c.toLowerCase().includes('image') || c.toLowerCase().includes('photo') || c.toLowerCase().includes('artwork') || c.toLowerCase().includes('url'));

      if (imgCols.length > 0) {
        console.log(`📌 Table "${table}" has potential image columns: ${imgCols.join(', ')}`);
        for (const col of imgCols) {
          const countRes = await pool.query(`SELECT COUNT(*) as cnt FROM "${table}" WHERE "${col}" IS NOT NULL AND "${col}"::text != ''`);
          const count = parseInt(countRes.rows[0].cnt, 10);
          console.log(`   - Column "${col}": ${count} records with non-empty values`);
          if (col.toLowerCase().includes('image') || col.toLowerCase().includes('photo') || col.toLowerCase().includes('artwork')) {
            grandTotalImages += count;
          }
        }
      }
    } catch (e: any) {
      console.log(`⚠️ Could not query table "${table}": ${e.message}`);
    }
  }

  console.log(`\n========================================`);
  console.log(`🌟 TOTAL IMAGE RECORDS FOUND ACROSS DB: ${grandTotalImages}`);
  console.log(`========================================\n`);

  await pool.end();
}

run();
