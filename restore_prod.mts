import { neon } from "@neondatabase/serverless";
import { v4 as uuidv4 } from "uuid";

// Use NEON_DATABASE_URL for the production Neon database
const dbUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!dbUrl) throw new Error("No database URL found");
console.log("Connecting via:", dbUrl.substring(0, 30) + '...');

const sql = neon(dbUrl);

async function run() {
  const before = await sql`SELECT COUNT(*) as c FROM daily_sales`;
  console.log(`Production rows before: ${before[0].c}`);
  
  // Get a valid admin user ID from production
  const admins = await sql`SELECT id FROM users WHERE role = 'admin' LIMIT 1`;
  const adminId = admins[0]?.id || 'KZ-L18';
  console.log(`Using admin ID: ${adminId}`);
  
  const transactions = [
    // Report 1: 30/03/26 to 05/04/26
    { date: '2026-04-05', day: 'Sun', channel: 'SHOP', net: 1994.00 },
    { date: '2026-04-04', day: 'Sat', channel: 'SHOP', net: 1078.00 },
    { date: '2026-04-03', day: 'Fri', channel: 'SHOP', net: 1580.00 },
    { date: '2026-04-02', day: 'Thu', channel: 'SHOP', net: 2292.00 },
    { date: '2026-04-01', day: 'Wed', channel: 'SHOP', net: 2140.00 },
    { date: '2026-03-31', day: 'Tue', channel: 'SHOP', net: 2377.00 },
    { date: '2026-03-30', day: 'Mon', channel: 'SHOP', net: 1401.00 },
    // Report 2: 06/04/26 to 12/04/26
    { date: '2026-04-12', day: 'Sun', channel: 'SHOP', net: 1941.00 },
    { date: '2026-04-12', day: 'Sun', channel: 'MISC', net: 2041.00 },
    { date: '2026-04-11', day: 'Sat', channel: 'SHOP', net: 1412.00 },
    { date: '2026-04-11', day: 'Sat', channel: 'RIVER', net: 3194.00 },
    { date: '2026-04-11', day: 'Sat', channel: 'CARAVAN TRUCK', net: 1128.00 },
    { date: '2026-04-10', day: 'Fri', channel: 'SHOP', net: 2182.00 },
    { date: '2026-04-10', day: 'Fri', channel: 'RIVER', net: 2540.00 },
    { date: '2026-04-10', day: 'Fri', channel: 'CARAVAN TRUCK', net: 1514.00 },
    { date: '2026-04-09', day: 'Thu', channel: 'SHOP', net: 1792.00 },
    { date: '2026-04-08', day: 'Wed', channel: 'SHOP', net: 2156.00 },
    { date: '2026-04-07', day: 'Tue', channel: 'SHOP', net: 3799.00 },
    { date: '2026-04-06', day: 'Mon', channel: 'SHOP', net: 2502.00 },
    // Report 3: 13/04/26 to 19/04/26
    { date: '2026-04-19', day: 'Sun', channel: 'SHOP', net: 2093.00 },
    { date: '2026-04-18', day: 'Sat', channel: 'SHOP', net: 2238.00 },
    { date: '2026-04-17', day: 'Fri', channel: 'SHOP', net: 1826.00 },
    { date: '2026-04-17', day: 'Fri', channel: 'RIVER', net: 4112.00 },
    { date: '2026-04-17', day: 'Fri', channel: 'CARAVAN TRUCK', net: 2196.00 },
    { date: '2026-04-16', day: 'Thu', channel: 'SHOP', net: 2304.00 },
    { date: '2026-04-15', day: 'Wed', channel: 'SONGKRAN FESTIVAL', net: 2780.00 },
    { date: '2026-04-15', day: 'Wed', channel: 'SHOP', net: 1224.00 },
    { date: '2026-04-14', day: 'Tue', channel: 'SONGKRAN FESTIVAL', net: 4690.00 },
    { date: '2026-04-14', day: 'Tue', channel: 'SHOP', net: 851.00 },
    { date: '2026-04-13', day: 'Mon', channel: 'SONGKRAN FESTIVAL', net: 5273.00 },
    { date: '2026-04-13', day: 'Mon', channel: 'SHOP', net: 904.00 },
  ];

  let inserted = 0;
  for (const tx of transactions) {
    const id = uuidv4();
    await sql`
      INSERT INTO daily_sales (id, date, day_of_week, order_channel, net_sales, grab_fee, total_sales, other_sales, imported_by, imported_at, created_at)
      VALUES (${id}, ${tx.date}, ${tx.day}, ${tx.channel}, ${tx.net}, 0, ${tx.net}, 0, ${adminId}, NOW(), NOW())
      ON CONFLICT (date, order_channel) DO UPDATE SET
        net_sales = EXCLUDED.net_sales,
        total_sales = EXCLUDED.total_sales,
        imported_by = ${adminId},
        imported_at = NOW()
    `;
    inserted++;
    console.log(`✓ ${tx.date} ${tx.channel} ฿${tx.net}`);
  }

  const after = await sql`SELECT COUNT(*) as c FROM daily_sales`;
  console.log(`\n✅ Done: ${inserted} records restored. Production rows now: ${after[0].c}`);
}

run().catch(console.error);
