
const { db } = require('./server/db');
const { users } = require('./shared/schema');
const { eq } = require('drizzle-orm');

async function checkAdmin() {
  try {
    const adminUsers = await db.select().from(users).where(eq(users.role, 'admin'));
    console.log('Admin Users:');
    adminUsers.forEach(u => {
      console.log(`- ${u.email} (Active: ${u.isActive})`);
    });
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAdmin();
