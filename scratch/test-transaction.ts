import 'dotenv/config';
import { storage } from '../server/db';
import { db } from '../server/db';
import { customers, users, transactions } from '../shared/schema';
import { storage as dbStorage } from '../server/storage';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

async function testTransaction() {
  console.log('Testing createTransaction function against database...');
  try {
    // 1. Find or create a test barista user
    let barista = await db.query.users.findFirst({
      where: eq(users.role, 'barista')
    });
    if (!barista) {
      // Find admin
      barista = await db.query.users.findFirst();
    }
    if (!barista) {
      console.log('No user found, creating a test user...');
      const [newUser] = await db.insert(users).values({
        id: crypto.randomUUID(),
        username: 'test_barista',
        password: 'hashedpassword',
        role: 'barista',
        fullName: 'Test Barista',
        phone: '1234567890',
        isActive: true,
      }).returning();
      barista = newUser;
    }
    console.log('Using barista:', barista.username, 'ID:', barista.id);

    // 2. Find or create a test customer
    let customer = await db.query.customers.findFirst();
    if (!customer) {
      console.log('No customer found, creating a test customer...');
      const [newCustomer] = await db.insert(customers).values({
        id: crypto.randomUUID(),
        name: 'Test Customer',
        phone: '0812345678',
        referralCode: 'TESTREF123',
        totalSpent: '0',
        points: 0,
      }).returning();
      customer = newCustomer;
    }
    console.log('Using customer:', customer.name, 'ID:', customer.id, 'Points:', customer.points, 'TotalSpent:', customer.totalSpent);

    // 3. Try to call createTransaction with a string amount
    console.log('Calling createTransaction with amount as string "35.50"...');
    const transaction = await dbStorage.createTransaction({
      customerId: customer.id,
      baristaId: barista.id,
      amount: '35.50',
      points: 10,
      location: 'CARAVAN TRUCK',
      type: 'purchase',
      includedSpecialOffer: false,
      isNewCustomer: false
    });
    console.log('Transaction created successfully! Transaction ID:', transaction.id);

    // 4. Retrieve the updated customer
    const updatedCustomer = await dbStorage.getCustomer(customer.id);
    console.log('Updated customer:', updatedCustomer?.name, 'Points:', updatedCustomer?.points, 'TotalSpent:', updatedCustomer?.totalSpent);
  } catch (error) {
    console.error('Error during transaction test:', error);
  }
}

testTransaction();
