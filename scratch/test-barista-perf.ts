import { db } from "../server/db";
import { baristaPerformance, transactions, users } from "../shared/schema";
import { desc } from "drizzle-orm";

async function test() {
  try {
    console.log("=== USERS (Staff) ===");
    const staff = await db.select().from(users);
    console.log(staff.map(u => ({ id: u.id, email: u.email, role: u.role, name: `${u.firstName} ${u.lastName}` })));

    console.log("\n=== BARISTA PERFORMANCE RECORDS ===");
    const perf = await db.select().from(baristaPerformance);
    console.log(perf);

    console.log("\n=== LATEST 5 TRANSACTIONS ===");
    const txs = await db.select().from(transactions).orderBy(desc(transactions.createdAt)).limit(5);
    console.log(txs);
  } catch (error) {
    console.error("Database query failed:", error);
  } finally {
    process.exit(0);
  }
}

test();
