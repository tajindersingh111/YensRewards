import pg from 'pg';

const pool = new pg.Pool({
  connectionString: "postgresql://postgres:pSVJIsYkqvRmYbSVnpfSxrTfrGBhgaqY@tokaido.proxy.rlwy.net:29751/railway",
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const res = await pool.query('SELECT id, product_code, name, image_url FROM products LIMIT 10');
  console.log(res.rows);
  await pool.end();
}

run();
