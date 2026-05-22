import { storage } from "../server/storage";
import { db } from "../server/db";
import { shopEvents } from "../shared/schema";
import { eq } from "drizzle-orm";

async function testCalendarEvents() {
  console.log("Starting Shop Calendar Events Test...");
  try {
    const startTimeStr = "2026-05-22T14:30:00.000Z";
    const endTimeStr = "2026-05-22T18:30:00.000Z";

    console.log("1. Creating a calendar event with time...");
    const event = await storage.createShopEvent({
      title: "Barista Meeting",
      description: "Discussing new espresso beans",
      type: "meeting",
      startDate: new Date(startTimeStr).toISOString(),
      endDate: new Date(endTimeStr).toISOString(),
      allDay: false,
      location: "Main Cafe",
      notes: "Prepare samples",
      color: "bg-slate-500",
    });

    console.log("Event created successfully! ID:", event.id);
    console.log("Saved startDate in database:", event.startDate);
    console.log("Saved endDate in database:", event.endDate);

    // Verify time is preserved
    if (!event.startDate.includes("T14:30") && !event.startDate.includes("14:30")) {
      throw new Error(`Time information was lost! startDate: ${event.startDate}`);
    }
    console.log("✅ Creation preserved time information!");

    console.log("2. Retrieving event from storage...");
    const retrievedEvents = await storage.getShopEvents();
    const fetched = retrievedEvents.find(e => e.id === event.id);
    if (!fetched) {
      throw new Error("Created event not found in retrieved list!");
    }
    console.log("Retrieved startDate:", fetched.startDate);
    console.log("Retrieved endDate:", fetched.endDate);

    console.log("3. Updating event (PATCH validation test)...");
    const updatedStartTime = "2026-05-22T15:00:00.000Z";
    const updated = await storage.updateShopEvent(event.id, {
      title: "Rescheduled Barista Meeting",
      startDate: new Date(updatedStartTime).toISOString(),
    });

    if (!updated) {
      throw new Error("Failed to update event!");
    }
    console.log("Updated title:", updated.title);
    console.log("Updated startDate:", updated.startDate);

    if (!updated.startDate.includes("T15:00") && !updated.startDate.includes("15:00")) {
      throw new Error(`Updated time was lost! startDate: ${updated.startDate}`);
    }
    console.log("✅ Update preserved time information!");

    // Clean up
    console.log("4. Cleaning up test event...");
    await db.delete(shopEvents).where(eq(shopEvents.id, event.id));
    console.log("✅ Cleaned up successfully!");
    console.log("🎉 ALL TESTS PASSED!");

  } catch (error: any) {
    console.error("❌ Test failed:", error.message);
  }
}

testCalendarEvents().then(() => process.exit(0));
