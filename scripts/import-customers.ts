import { db } from "../server/db";
import { customers } from "../shared/schema";
import { readFileSync } from "fs";
import { eq } from "drizzle-orm";

interface CSVCustomer {
  name: string;
  tier: string;
  phone: string;
  email?: string;
  gender?: string;
  birthday?: string;
  registerDate?: string;
  registerBranch?: string;
  totalSpent?: string;
  points?: number;
  lastUse?: string;
  tag?: string;
  lineUid?: string;
}

function generateReferralCode(): string {
  return `YENS${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr || !dateStr.trim()) return null;
  
  try {
    const parts = dateStr.split(/[\/\s]/);
    if (parts.length >= 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      const time = parts.length > 3 ? parts[3] : '00:00';
      const dateString = `${year}-${month}-${day} ${time}`;
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date;
    }
  } catch (e) {
    console.warn(`Failed to parse date: ${dateStr}`);
  }
  return null;
}

async function importCustomers() {
  console.log("📁 Reading customer CSV file...");
  
  const csvContent = readFileSync("attached_assets/member-active-2025-11-04 (1)_1763102554264.csv", "utf-8");
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  console.log(`📊 Found ${lines.length - 1} customers to import`);
  
  let imported = 0;
  let updated = 0;
  let failed = 0;
  const errors: Array<{phone: string, error: string}> = [];
  
  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    
    // Parse CSV (handle quoted values)
    const regex = /"([^"]*)"|([^,]+)/g;
    const values: string[] = [];
    let match;
    while ((match = regex.exec(line)) !== null) {
      values.push(match[1] || match[2] || '');
    }
    
    if (values.length < 3) {
      console.warn(`⚠️  Skipping invalid row ${i}: insufficient columns`);
      failed++;
      continue;
    }
    
    const name = values[0]?.trim();
    const tier = values[1]?.trim().toLowerCase() || 'member';
    const phone = values[2]?.trim();
    const email = values[3]?.trim() || undefined;
    const gender = values[4]?.trim() || undefined;
    const birthday = values[5]?.trim() || undefined;
    const registerDateStr = values[6]?.trim();
    const registerBranch = values[7]?.trim() || undefined;
    const totalSpentStr = values[8]?.trim();
    const pointsStr = values[9]?.trim();
    const lastUseStr = values[10]?.trim();
    const tag = values[11]?.trim() || undefined;
    const lineUid = values[12]?.trim() || undefined;
    
    if (!name || !phone) {
      console.warn(`⚠️  Skipping row ${i}: missing name or phone`);
      failed++;
      continue;
    }
    
    try {
      // Check if customer exists
      const existing = await db.select().from(customers).where(eq(customers.phone, phone)).limit(1);
      
      const customerData: any = {
        name,
        phone,
        email,
        gender,
        birthday,
        registerBranch,
        tag,
        lineUid,
        tier,
      };
      
      // Parse numeric fields
      if (pointsStr) {
        customerData.points = parseInt(pointsStr) || 0;
      }
      
      if (totalSpentStr) {
        const spendNum = parseFloat(totalSpentStr.replace(/,/g, ''));
        if (!isNaN(spendNum)) {
          customerData.totalSpent = spendNum.toFixed(2);
        }
      }
      
      // Parse dates
      if (registerDateStr) {
        const date = parseDate(registerDateStr);
        if (date) customerData.registerDate = date;
      }
      
      if (lastUseStr) {
        const date = parseDate(lastUseStr);
        if (date) customerData.lastUse = date;
      }
      
      if (existing.length > 0) {
        // Update existing customer
        await db.update(customers)
          .set(customerData)
          .where(eq(customers.phone, phone));
        updated++;
        if (updated % 50 === 0) {
          console.log(`   Updated ${updated} customers...`);
        }
      } else {
        // Insert new customer with referral code
        await db.insert(customers).values({
          ...customerData,
          referralCode: generateReferralCode(),
          points: customerData.points ?? 0,
          tier: customerData.tier ?? 'member',
          totalSpent: customerData.totalSpent ?? '0.00',
        });
        imported++;
        if (imported % 50 === 0) {
          console.log(`   Imported ${imported} customers...`);
        }
      }
    } catch (error: any) {
      failed++;
      errors.push({ phone, error: error.message });
      console.error(`❌ Error importing customer ${phone}:`, error.message);
    }
  }
  
  console.log("\n✅ Import Complete!");
  console.log(`📥 Imported: ${imported} new customers`);
  console.log(`🔄 Updated: ${updated} existing customers`);
  console.log(`❌ Failed: ${failed} customers`);
  
  if (errors.length > 0) {
    console.log("\n⚠️  Errors:");
    errors.slice(0, 10).forEach(err => {
      console.log(`   ${err.phone}: ${err.error}`);
    });
    if (errors.length > 10) {
      console.log(`   ... and ${errors.length - 10} more errors`);
    }
  }
  
  process.exit(0);
}

importCustomers().catch((error) => {
  console.error("💥 Fatal error:", error);
  process.exit(1);
});
