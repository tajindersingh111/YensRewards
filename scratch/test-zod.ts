import 'dotenv/config';
import { insertTransactionSchema } from '../shared/schema';
import { db } from '../server/db';
import { transactions } from '../shared/schema';

console.log('Testing insertTransactionSchema parsing...');

try {
  // Test numeric as number
  const parsed1 = insertTransactionSchema.parse({
    customerId: 'some-customer-id',
    amount: 35.5,
    points: 10,
    location: 'Test Site',
    type: 'purchase'
  });
  console.log('Successfully parsed number:', parsed1);
} catch (error) {
  console.error('Failed to parse number:', error);
}

try {
  // Test numeric as string
  const parsed2 = insertTransactionSchema.parse({
    customerId: 'some-customer-id',
    amount: '35.5',
    points: 10,
    location: 'Test Site',
    type: 'purchase'
  });
  console.log('Successfully parsed string:', parsed2);
} catch (error) {
  console.error('Failed to parse string:', error);
}
