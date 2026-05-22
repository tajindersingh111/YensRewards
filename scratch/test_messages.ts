import { storage } from "../server/storage";
import { db } from "../server/db";
import { scheduledMessages } from "../shared/schema";
import { eq } from "drizzle-orm";

async function testMessages() {
  console.log("Starting scheduled messages test...");
  try {
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 2); // 2 hours in the future
    
    console.log("Creating scheduled message record...");
    const msg = await storage.createScheduledMessage({
      channel: "sms",
      recipientType: "tier",
      recipientTier: "gold",
      recipientIds: null,
      templateId: null,
      subject: null,
      message: "Test scheduling from script",
      scheduledFor: futureDate.toISOString(),
      timezone: "Asia/Bangkok",
      status: "pending",
      createdBy: null,
    });

    console.log("Scheduled message created with ID:", msg.id);

    // Fetch and check
    console.log("Verifying scheduled message retrieval...");
    const fetched = await storage.getScheduledMessage(msg.id);
    if (!fetched) {
      throw new Error("Failed to retrieve scheduled message by ID!");
    }
    console.log("Successfully retrieved. Message text:", fetched.message);

    const list = await storage.getScheduledMessages();
    console.log(`Total scheduled messages: ${list.length}`);
    const foundInList = list.some(item => item.id === msg.id);
    if (!foundInList) {
      throw new Error("Created message not found in the list of all scheduled messages!");
    }
    console.log("✅ Message successfully verified in database!");

    // Clean up
    console.log("Cleaning up test message...");
    await db.delete(scheduledMessages).where(eq(scheduledMessages.id, msg.id));
    console.log("✅ Cleaned up successfully!");

  } catch (error: any) {
    console.error("❌ Test failed:", error.message);
  }
}

testMessages().then(() => process.exit(0));
