import {
  type Customer,
  type InsertCustomer,
  type Transaction,
  type InsertTransaction,
  type Promotion,
  type InsertPromotion,
  type User,
  type UpsertUser,
  type CustomerNotification,
  type InsertCustomerNotification,
  type Product,
  type InsertProduct,
} from "@shared/schema";
import { db } from "./db";
import { customers, transactions, promotions, users, customerNotifications, products } from "@shared/schema";
import { eq, desc, sql, and, asc } from "drizzle-orm";

export interface IStorage {
  // Auth methods (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  isUserAdmin(id: string): Promise<boolean>;
  
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
  getCustomerPromotions(customerId: string): Promise<Array<Promotion & { isRead: boolean }>>;
  
  // Notification methods
  createNotification(notification: InsertCustomerNotification): Promise<CustomerNotification>;
  getUnreadCount(customerId: string): Promise<number>;
  markAsRead(customerId: string, promotionId: string): Promise<void>;
  markAllAsRead(customerId: string): Promise<void>;
  
  // Analytics methods
  getAnalytics(): Promise<{
    totalSales: number;
    totalCustomers: number;
    avgTransaction: number;
    pointsRedeemed: number;
    salesByLocation: Array<{ label: string; value: number }>;
    recentTransactions: Transaction[];
  }>;
  
  // Product methods
  getAllProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  getProductsByCategory(category: string): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<Product>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<void>;
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

  async isUserAdmin(id: string): Promise<boolean> {
    const user = await this.getUser(id);
    return user?.role === "admin";
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

  async getCustomerPromotions(customerId: string): Promise<Array<Promotion & { isRead: boolean }>> {
    const customer = await this.getCustomer(customerId);
    if (!customer) return [];
    
    // Get all promotions that apply to this customer (either targetTier matches or no targetTier)
    const allPromos = await db
      .select()
      .from(promotions)
      .orderBy(desc(promotions.sentAt));
    
    const relevantPromos = allPromos.filter(p => 
      !p.targetTier || p.targetTier === '' || p.targetTier === 'all' || p.targetTier === customer.tier
    );
    
    // Get notification status for each promo
    const promosWithReadStatus = await Promise.all(
      relevantPromos.map(async (promo) => {
        const notification = await db
          .select()
          .from(customerNotifications)
          .where(
            and(
              eq(customerNotifications.customerId, customerId),
              eq(customerNotifications.promotionId, promo.id)
            )
          )
          .limit(1);
        
        return {
          ...promo,
          isRead: notification.length > 0 ? notification[0].isRead : false,
        };
      })
    );
    
    return promosWithReadStatus;
  }

  // Notification methods
  async createNotification(insertNotification: InsertCustomerNotification): Promise<CustomerNotification> {
    const result = await db
      .insert(customerNotifications)
      .values(insertNotification)
      .returning();
    
    return result[0];
  }

  async getUnreadCount(customerId: string): Promise<number> {
    // Get all promotions relevant to this customer
    const promosWithStatus = await this.getCustomerPromotions(customerId);
    
    // Count unread promotions (those that exist but aren't marked as read)
    const unreadCount = promosWithStatus.filter(p => !p.isRead).length;
    
    return unreadCount;
  }

  async markAsRead(customerId: string, promotionId: string): Promise<void> {
    // Check if notification already exists
    const existing = await db
      .select()
      .from(customerNotifications)
      .where(
        and(
          eq(customerNotifications.customerId, customerId),
          eq(customerNotifications.promotionId, promotionId)
        )
      )
      .limit(1);
    
    if (existing.length > 0) {
      // Update existing
      await db
        .update(customerNotifications)
        .set({ isRead: true, readAt: new Date() })
        .where(eq(customerNotifications.id, existing[0].id));
    } else {
      // Create new notification marked as read
      await db
        .insert(customerNotifications)
        .values({
          customerId,
          promotionId,
          isRead: true,
          readAt: new Date(),
        });
    }
  }

  async markAllAsRead(customerId: string): Promise<void> {
    // Get all promotions for this customer
    const promosWithStatus = await this.getCustomerPromotions(customerId);
    
    // Mark each as read
    await Promise.all(
      promosWithStatus.map(promo => this.markAsRead(customerId, promo.id))
    );
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

  // Product methods
  async getAllProducts(): Promise<Product[]> {
    return await db.select().from(products).orderBy(asc(products.sortOrder), asc(products.name));
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const result = await db.select().from(products).where(eq(products.id, id));
    return result[0];
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(eq(products.category, category))
      .orderBy(asc(products.sortOrder), asc(products.name));
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const result = await db
      .insert(products)
      .values(insertProduct)
      .returning();
    
    return result[0];
  }

  async updateProduct(id: string, product: Partial<Product>): Promise<Product | undefined> {
    const result = await db
      .update(products)
      .set({ ...product, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    
    return result[0];
  }

  async deleteProduct(id: string): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }
}

export const storage = new DbStorage();
