import 'dotenv/config';
import { db } from '../server/db';
import { transactions } from '../shared/schema';
import { and, eq, sql } from 'drizzle-orm';

async function testSqlCast() {
  console.log('Testing SQL casting for transactions table...');
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const result = await db
      .select({
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(transactions)
      .where(
        and(
          sql`CAST(${transactions.createdAt} AS TIMESTAMPTZ) >= ${twentyFourHoursAgo}::timestamptz`
        )
      );
    console.log('SQL cast check succeeded! Result:', result[0]);
  } catch (error) {
    console.error('SQL cast check failed:', error);
  }
}

testSqlCast();
