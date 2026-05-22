
const { db } = require('./server/db');
const { timeEntries, users } = require('./shared/schema');
const { desc } = require('drizzle-orm');

async function checkData() {
  try {
    const entries = await db.select().from(timeEntries).orderBy(desc(timeEntries.clockInTime)).limit(5);
    console.log('Recent Time Entries:');
    for (const e of entries) {
      console.log(`- ID: ${e.id}, UserID: ${e.userId}, Date: ${e.date}, ClockIn: ${e.clockInTime}`);
      const user = await db.select().from(users).where({ id: e.userId }).limit(1);
      if (user.length > 0) {
        console.log(`  -> Matched User: ${user[0].email} / ${user[0].firstName}`);
      } else {
        console.log(`  -> NO MATCHING USER FOUND in DB for id ${e.userId}`);
      }
    }
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkData();
