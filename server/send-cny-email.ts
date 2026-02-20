import { db } from "./db";
import { customers } from "@shared/schema";
import { isNotNull, ne, sql } from "drizzle-orm";
import { sendBatchEmails } from "./resend";

const SUBJECT = "เชิญร่วมฉลองตรุษจีนกับเรา! / Celebrate Chinese New Year with us!";
const HTML_CONTENT = `
<img src="https://app.yensthai.com/email-assets/email_1770458330709_22eee315-2a90-4553-929f-1b01e41c0c55.png" alt="Celebrate Chinese New Year 2026" style="max-width: 100%; height: auto; border-radius: 8px;">
`;

async function main() {
  console.log("Fetching customers with email addresses...");
  
  const customerList = await db
    .select({ id: customers.id, name: customers.name, email: customers.email })
    .from(customers)
    .where(sql`${customers.email} IS NOT NULL AND ${customers.email} != ''`);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const uniqueEmails = new Map<string, string>();
  let skipped = 0;
  for (const c of customerList) {
    if (c.email) {
      const emailLower = c.email.toLowerCase().trim();
      if (!emailRegex.test(emailLower)) {
        console.log(`Skipping invalid email: "${c.email}" (${c.name})`);
        skipped++;
        continue;
      }
      if (!uniqueEmails.has(emailLower)) {
        uniqueEmails.set(emailLower, c.name || "Customer");
      }
    }
  }

  console.log(`Found ${customerList.length} customers with emails, ${uniqueEmails.size} valid unique emails, ${skipped} skipped (invalid)`);

  const emails = Array.from(uniqueEmails.entries()).map(([email, name]) => ({
    to: email,
    subject: SUBJECT,
    html: HTML_CONTENT,
    isHtml: true,
  }));

  console.log(`Sending ${emails.length} emails...`);
  console.log(`Started at: ${new Date().toISOString()}`);

  const result = await sendBatchEmails(emails, (sent, failed, total) => {
    console.log(`Progress: ${sent + failed}/${total} (${sent} sent, ${failed} failed)`);
  });

  console.log(`\nCompleted at: ${new Date().toISOString()}`);
  console.log(`Results: ${result.sent} sent, ${result.failed} failed out of ${emails.length} total`);
  
  if (result.failed > 0) {
    console.log("\nFailed emails:");
    result.results.filter(r => !r.success).forEach(r => {
      console.log(`  ${r.to}: ${r.error}`);
    });
  }

  process.exit(0);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
