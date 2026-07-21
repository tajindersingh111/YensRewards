import pg from 'pg';

const pool = new pg.Pool({
  connectionString: "postgresql://postgres:pSVJIsYkqvRmYbSVnpfSxrTfrGBhgaqY@tokaido.proxy.rlwy.net:29751/railway",
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const res = await pool.query("SELECT id, name, image_url FROM products WHERE name LIKE '%Kiwi%' OR name LIKE '%Cappuccino%' OR name LIKE '%Cookie%' OR name LIKE '%Chocolate%' OR name LIKE '%Triple%'");
  console.log(res.rows);
  await pool.end();
}

run();
