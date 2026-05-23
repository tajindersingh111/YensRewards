import { db } from "../server/db";
import { baristaPerformance } from "../shared/schema";
import { eq, and } from "drizzle-orm";

async function fix() {
  try {
    console.log("Fetching all records with week_start = '2026-05-17'...");
    const badRecords = await db
      .select()
      .from(baristaPerformance)
      .where(eq(baristaPerformance.weekStart, "2026-05-17"));

    console.log(`Found ${badRecords.length} record(s) to fix.`);

    for (const record of badRecords) {
      console.log(`Processing user ${record.userId}...`);
      
      // Check if target record (2026-05-18) already exists
      const [existingTarget] = await db
        .select()
        .from(baristaPerformance)
        .where(
          and(
            eq(baristaPerformance.userId, record.userId),
            eq(baristaPerformance.weekStart, "2026-05-18")
          )
        );

      if (existingTarget) {
        console.log(`Target record '2026-05-18' already exists for user ${record.userId}. Merging...`);
        // Merge values
        const updatedCount = (existingTarget.transactionCount || 0) + (record.transactionCount || 0);
        const updatedSpecials = (existingTarget.specialOffersSold || 0) + (record.specialOffersSold || 0);
        const updatedSignups = (existingTarget.newCustomerSignups || 0) + (record.newCustomerSignups || 0);
        const updatedPoints = (existingTarget.totalPoints || 0) + (record.totalPoints || 0);

        await db
          .update(baristaPerformance)
          .set({
            transactionCount: updatedCount,
            specialOffersSold: updatedSpecials,
            newCustomerSignups: updatedSignups,
            totalPoints: updatedPoints,
            updatedAt: new Date().toISOString()
          })
          .where(eq(baristaPerformance.id, existingTarget.id));

        console.log(`Deleting bad record ${record.id} after merge...`);
        await db
          .delete(baristaPerformance)
          .where(eq(baristaPerformance.id, record.id));
      } else {
        console.log(`Updating weekStart to '2026-05-18' for record ${record.id}...`);
        await db
          .update(baristaPerformance)
          .set({
            weekStart: "2026-05-18",
            updatedAt: new Date().toISOString()
          })
          .where(eq(baristaPerformance.id, record.id));
      }
    }
    
    console.log("Migration complete!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    process.exit(0);
  }
}

fix();
