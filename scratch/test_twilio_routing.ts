import "dotenv/config";
import { sendSMS, isTwilioConfigured } from "../server/twilio";

async function testRouting() {
  console.log("Testing SMS routing and configuration detection...");
  try {
    console.log("Is Twilio configured with real credentials?:", isTwilioConfigured());
    
    console.log("\n1. Testing routing for non-Thai number (+15551234567)...");
    const resultUS = await sendSMS("+15551234567", "Hello from test script");
    console.log("US routing result:", resultUS);
    
    console.log("\n2. Testing routing for Thai number (+66812345678)...");
    // Since Vonage has valid credentials in .env, we expect it to attempt sending or fail at carrier level (since it's a dummy number)
    // rather than throwing a Twilio SDK constructor initialization crash.
    const resultTH = await sendSMS("+66812345678", "Hello from test script");
    console.log("Thai routing result:", resultTH);
    
    console.log("\n✅ Auto-routing test completed!");
  } catch (err: any) {
    console.error("❌ Unexpected test exception:", err.message);
  }
}

testRouting().then(() => process.exit(0));
