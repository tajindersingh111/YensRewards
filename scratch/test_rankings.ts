import { storage } from "../server/storage";
import { db } from "../server/db";
import { baristaPerformance, users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function testRankings() {
  console.log("Starting rankings test...");
  try {
    // 1. Let's find some existing barista users or check what data exists
    const allUsers = await storage.getAllUsers();
    const baristas = allUsers.filter(u => u.role === "barista" || u.role === "manager");
    console.log(`Found ${baristas.length} baristas in DB.`);
    
    if (baristas.length < 2) {
      console.log("Creating test baristas to verify ranking mechanism...");
      const b1 = await storage.createUser({
        email: "test_barista1@example.com",
        firstName: "Alpha",
        lastName: "Barista",
        role: "barista",
        isActive: true,
      });
      const b2 = await storage.createUser({
        email: "test_barista2@example.com",
        firstName: "Beta",
        lastName: "Barista",
        role: "barista",
        isActive: true,
      });
      const b3 = await storage.createUser({
        email: "test_barista3@example.com",
        firstName: "Gamma",
        lastName: "Barista",
        role: "barista",
        isActive: true,
      });
      baristas.push(b1, b2, b3);
    }

    // 2. Set up performance records for a specific test week
    const testWeek = "2026-05-18"; // Monday of the test week
    
    // Clear any existing performance data for this week and these baristas for clean test
    for (const b of baristas.slice(0, 3)) {
      await db.delete(baristaPerformance).where(eq(baristaPerformance.userId, b.id));
    }

    console.log("Upserting performance records with known points...");
    // Let's create:
    // Barista 0: 100 points
    // Barista 1: 150 points
    // Barista 2: 100 points (to test ties!)
    
    await storage.updateBaristaPerformance({
      userId: baristas[0].id,
      weekStart: testWeek,
      transactionCount: 10,
      specialOffersSold: 2,
      newCustomerSignups: 1,
      totalPoints: 100,
      weeklyRank: null,
    });

    await storage.updateBaristaPerformance({
      userId: baristas[1].id,
      weekStart: testWeek,
      transactionCount: 15,
      specialOffersSold: 4,
      newCustomerSignups: 2,
      totalPoints: 150,
      weeklyRank: null,
    });

    await storage.updateBaristaPerformance({
      userId: baristas[2].id,
      weekStart: testWeek,
      transactionCount: 8,
      specialOffersSold: 1,
      newCustomerSignups: 3,
      totalPoints: 100,
      weeklyRank: null,
    });

    console.log("Fetching summary from storage layer...");
    const summary = await storage.getAllBaristaPerformanceSummary(testWeek);
    
    console.log("Results summary:");
    for (const item of summary) {
      console.log(`Barista: ${item.user.firstName} ${item.user.lastName} | Points: ${item.totalPoints} | Dynamic Rank: ${item.weeklyRank}`);
    }

    // Verify ordering and ranks
    if (summary[0].totalPoints !== 150 || summary[0].weeklyRank !== 1) {
      throw new Error("Rank 1 is incorrect!");
    }
    
    if (summary[1].weeklyRank !== 2 || summary[2].weeklyRank !== 2) {
      throw new Error("Ties rank calculation is incorrect! Both 100 points should be Rank #2.");
    }
    
    console.log("✅ Dynamic ranking and tie handling tests passed successfully!");

    // Clean up test performance rows
    for (const b of baristas.slice(0, 3)) {
      await db.delete(baristaPerformance).where(eq(baristaPerformance.userId, b.id));
    }
    
    // Clean up created users if they were test users
    for (const b of baristas.slice(0, 3)) {
      if (b.email?.startsWith("test_barista")) {
        await db.delete(users).where(eq(users.id, b.id));
      }
    }
    console.log("Cleaned up test data.");

  } catch (error: any) {
    console.error("❌ Test failed:", error.message);
  }
}

testRankings().then(() => process.exit(0));
