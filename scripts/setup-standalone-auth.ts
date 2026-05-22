import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function setupAuth() {
  console.log("🚀 Setting up standalone auth...");

  const adminEmail = "admin@yensrewards.com";
  const defaultPassword = "AdminPassword123!"; // Change this in production!

  const existingAdmin = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);

  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  if (existingAdmin.length > 0) {
    console.log(`Updating existing admin password for ${adminEmail}...`);
    await db.update(users)
      .set({ password: hashedPassword, role: "admin", isActive: true })
      .where(eq(users.email, adminEmail));
  } else {
    console.log(`Creating new admin user ${adminEmail}...`);
    await db.insert(users).values({
      email: adminEmail,
      password: hashedPassword,
      firstName: "System",
      lastName: "Admin",
      role: "admin",
      isActive: true,
    });
  }

  console.log("✅ Standalone auth setup complete!");
  console.log(`Email: ${adminEmail}`);
  console.log(`Password: ${defaultPassword}`);
}

setupAuth().catch(console.error);
