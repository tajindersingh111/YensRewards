import {
  type Customer,
  type InsertCustomer,
  type Transaction,
  type InsertTransaction,
  type Promotion,
  type InsertPromotion,
  type User,
  type UpsertUser,
} from "@shared/schema";
import { db } from "./db";
import { customers, transactions, promotions, users } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";

export interface IStorage {
  // Auth methods (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Customer methods
  getCustomer(id: string): Promise<Customer | undefined>;
  getCustomerByPhone(phone: string): Promise<Customer | undefined>;
  getCustomerByReferralCode(code: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<Customer>): Promise<Customer | undefined>;
  getAllCustomers(): Promise<Customer[]>;
  
  // Transaction methods
  getTransaction(id: string): Promise<Transaction | undefined>;
  getCustomerTransactions(customerId: string): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  
  // Promotion methods
  createPromotion(promotion: InsertPromotion): Promise<Promotion>;
  getAllPromotions(): Promise<Promotion[]>;
  
  // Analytics methods
  getAnalytics(): Promise<{
    totalSales: number;
    totalCustomers: number;
    avgTransaction: number;
    pointsRedeemed: number;
    salesByLocation: Array<{ label: string; value: number }>;
    recentTransactions: Transaction[];
  }>;
}

export class DbStorage implements IStorage {
  // Auth methods (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const result = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result[0];
  }

  // Customer methods
  async getCustomer(id: string): Promise<Customer | undefined> {
    const result = await db.select().from(customers).where(eq(customers.id, id));
    return result[0];
  }

  async getCustomerByPhone(phone: string): Promise<Customer | undefined> {
    const result = await db.select().from(customers).where(eq(customers.phone, phone));
    return result[0];
  }

  async getCustomerByReferralCode(code: string): Promise<Customer | undefined> {
    const result = await db.select().from(customers).where(eq(customers.referralCode, code));
    return result[0];
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    // Generate unique referral code
    const referralCode = `YENS${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    const result = await db
      .insert(customers)
      .values({ ...insertCustomer, referralCode })
      .returning();
    
    return result[0];
  }

  async updateCustomer(id: string, customer: Partial<Customer>): Promise<Customer | undefined> {
    const result = await db
      .update(customers)
      .set(customer)
      .where(eq(customers.id, id))
      .returning();
    
    return result[0];
  }

  async getAllCustomers(): Promise<Customer[]> {
    return await db.select().from(customers).orderBy(desc(customers.createdAt));
  }

  // Transaction methods
  async getTransaction(id: string): Promise<Transaction | undefined> {
    const result = await db.select().from(transactions).where(eq(transactions.id, id));
    return result[0];
  }

  async getCustomerTransactions(customerId: string): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.customerId, customerId))
      .orderBy(desc(transactions.createdAt));
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const result = await db
      .insert(transactions)
      .values(insertTransaction)
      .returning();
    
    // Update customer points and total spent
    const customer = await this.getCustomer(insertTransaction.customerId);
    if (customer) {
      const newPoints = customer.points + insertTransaction.points;
      const newTotalSpent = parseFloat(customer.totalSpent) + parseFloat(insertTransaction.amount.toString());
      
      // Determine tier based on points
      let tier = "bronze";
      if (newPoints >= 1000) tier = "gold";
      else if (newPoints >= 500) tier = "silver";
      
      await this.updateCustomer(insertTransaction.customerId, {
        points: newPoints,
        totalSpent: newTotalSpent.toString(),
        tier,
      });
    }
    
    return result[0];
  }

  // Promotion methods
  async createPromotion(insertPromotion: InsertPromotion): Promise<Promotion> {
    const result = await db
      .insert(promotions)
      .values(insertPromotion)
      .returning();
    
    return result[0];
  }

  async getAllPromotions(): Promise<Promotion[]> {
    return await db.select().from(promotions).orderBy(desc(promotions.sentAt));
  }

  // Analytics methods
  async getAnalytics(): Promise<{
    totalSales: number;
    totalCustomers: number;
    avgTransaction: number;
    pointsRedeemed: number;
    salesByLocation: Array<{ label: string; value: number }>;
    recentTransactions: Transaction[];
  }> {
    // Get all transactions for this month
    const allTransactions = await db.select().from(transactions);
    const totalSales = allTransactions.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
    
    // Get total customers
    const allCustomers = await db.select().from(customers);
    const totalCustomers = allCustomers.length;
    
    // Calculate average transaction
    const avgTransaction = allTransactions.length > 0 ? totalSales / allTransactions.length : 0;
    
    // Get points redeemed (count redemption transactions)
    const redemptionTransactions = allTransactions.filter(t => t.type === 'redemption');
    const pointsRedeemed = redemptionTransactions.reduce((sum, t) => sum + t.points, 0);
    
    // Group sales by location
    const locationMap = new Map<string, number>();
    allTransactions.forEach(t => {
      const current = locationMap.get(t.location) || 0;
      locationMap.set(t.location, current + parseFloat(t.amount.toString()));
    });
    
    const salesByLocation = Array.from(locationMap.entries()).map(([label, value]) => ({ label, value }));
    
    // Get recent transactions
    const recentTransactions = await db
      .select()
      .from(transactions)
      .orderBy(desc(transactions.createdAt))
      .limit(10);
    
    return {
      totalSales,
      totalCustomers,
      avgTransaction,
      pointsRedeemed,
      salesByLocation,
      recentTransactions,
    };
  }
}

export const storage = new DbStorage();
