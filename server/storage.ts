import {
  type Customer,
  type InsertCustomer,
  type Transaction,
  type InsertTransaction,
  type Promotion,
  type InsertPromotion,
  type User,
  type UpsertUser,
  type InsertUser,
  type CustomerNotification,
  type InsertCustomerNotification,
  type Product,
  type InsertProduct,
  type MessageTemplate,
  type InsertMessageTemplate,
  type MessageLog,
  type InsertMessageLog,
  type Site,
  type InsertSite,
} from "@shared/schema";
import { db } from "./db";
import { customers, transactions, promotions, users, customerNotifications, products, messageTemplates, messageLog, sites } from "@shared/schema";
import { eq, desc, sql, and, asc } from "drizzle-orm";

export interface IStorage {
  // Auth methods (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  isUserAdmin(id: string): Promise<boolean>;
  
  // User management methods
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUserRole(id: string, role: string): Promise<User | undefined>;
  updateUserDetails(id: string, details: { email?: string; firstName?: string; lastName?: string }): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;
  
  // Password & 2FA methods
  setUserPassword(userId: string, hashedPassword: string): Promise<User | undefined>;
  verifyUserPassword(userId: string, password: string): Promise<boolean>;
  getUserByEmail(email: string): Promise<User | undefined>;
  enable2FA(userId: string, secret: string): Promise<User | undefined>;
  disable2FA(userId: string): Promise<User | undefined>;
  verify2FAToken(userId: string, token: string): Promise<boolean>;
  get2FASecret(userId: string): Promise<string | null>;
  
  // Customer methods
  getCustomer(id: string): Promise<Customer | undefined>;
  getCustomerByPhone(phone: string): Promise<Customer | undefined>;
  getCustomerByReferralCode(code: string): Promise<Customer | undefined>;
  searchCustomersByPhone(query: string, limit?: number): Promise<Customer[]>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<Customer>): Promise<Customer | undefined>;
  upsertCustomerByPhone(customer: InsertCustomer & Partial<Customer>): Promise<{ action: 'insert' | 'update', customer: Customer }>;
  getAllCustomers(): Promise<Customer[]>;
  listCustomers(params: {
    page: number;
    pageSize: number;
    search?: string;
  }): Promise<{ data: Customer[]; totalCount: number }>;
  getFilteredCustomers(filters: {
    tier?: string[];
    minSpend?: number;
    maxSpend?: number;
    minPoints?: number;
    maxPoints?: number;
    searchQuery?: string;
    registeredAfter?: Date;
    registeredBefore?: Date;
  }): Promise<Customer[]>;
  bulkDeleteCustomers(filter: {
    createdAfter?: string;
    createdBefore?: string;
    tags?: string[];
    hasZeroTotals?: boolean;
  }): Promise<{ deletedCount: number; deletedIds: string[] }>;
  deleteCustomer(id: string): Promise<void>;
  getDuplicatePhoneNumbers(): Promise<Array<{ phone: string; count: number; customers: Customer[] }>>;
  
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
  
  getWeeklyOverview(): Promise<{
    thisWeek: {
      revenue: number;
      transactions: number;
      avgTransaction: number;
      pointsIssued: number;
      pointsRedeemed: number;
      newCustomers: number;
      returningCustomers: number;
    };
    lastWeek: {
      revenue: number;
      transactions: number;
      avgTransaction: number;
    };
    dailyData: Array<{
      date: string;
      revenue: number;
      transactions: number;
    }>;
    topProducts: Array<{
      productName: string;
      revenue: number;
      quantity: number;
    }>;
    bestDay: {
      date: string;
      revenue: number;
    };
  }>;
  
  // Product methods
  getAllProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  getProductsByCategory(category: string): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<Product>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<void>;
  
  // Message Template methods
  getAllMessageTemplates(): Promise<MessageTemplate[]>;
  getMessageTemplate(id: string): Promise<MessageTemplate | undefined>;
  getMessageTemplatesByType(type: string): Promise<MessageTemplate[]>;
  getDefaultMessageTemplate(type: string): Promise<MessageTemplate | undefined>;
  createMessageTemplate(template: InsertMessageTemplate): Promise<MessageTemplate>;
  updateMessageTemplate(id: string, template: Partial<MessageTemplate>): Promise<MessageTemplate | undefined>;
  deleteMessageTemplate(id: string): Promise<void>;
  
  // Message Log methods
  createMessageLog(log: InsertMessageLog): Promise<MessageLog>;
  getMessageLogs(customerId?: string): Promise<MessageLog[]>;
  updateMessageLogStatus(id: string, status: string, externalId?: string, errorMessage?: string): Promise<void>;
  
  // Site methods
  getAllSites(): Promise<Site[]>;
  getSite(id: string): Promise<Site | undefined>;
  createSite(site: InsertSite): Promise<Site>;
  updateSite(id: string, site: Partial<Site>): Promise<Site | undefined>;
  deleteSite(id: string): Promise<void>;
}

export class DbStorage implements IStorage {
  // Auth methods (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // First check if a user with this email already exists (only if email is provided)
    if (userData.email) {
      const existingUserByEmail = await db
        .select()
        .from(users)
        .where(eq(users.email, userData.email))
        .limit(1);

      if (existingUserByEmail.length > 0) {
        // Update existing user by email - PRESERVE role field
        const result = await db
          .update(users)
          .set({
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            profileImageUrl: userData.profileImageUrl,
            // DO NOT update role - preserve existing role in database
            updatedAt: new Date(),
          })
          .where(eq(users.email, userData.email))
          .returning();
        return result[0];
      }
    }

    // Otherwise, do normal upsert by ID - PRESERVE role field on update
    const result = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          // DO NOT update role - preserve existing role in database
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

  // User management methods
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async createUser(userData: InsertUser): Promise<User> {
    const result = await db.insert(users).values(userData).returning();
    return result[0];
  }

  async updateUserRole(id: string, role: string): Promise<User | undefined> {
    const result = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async updateUserDetails(id: string, details: { email?: string; firstName?: string; lastName?: string }): Promise<User | undefined> {
    let normalizedEmail: string | undefined;
    
    // Normalize and check for duplicate email if email is being updated (case-insensitive)
    if (details.email !== undefined) {
      normalizedEmail = details.email.toLowerCase();
      
      // Find any user with the same email (case-insensitive)
      const allUsers = await db.select().from(users);
      const existingUser = allUsers.find(
        u => u.email.toLowerCase() === normalizedEmail && u.id !== id
      );
      
      if (existingUser) {
        throw new Error("Email is already in use by another user");
      }
    }

    const updateData: any = { updatedAt: new Date() };
    
    // Store email in lowercase for consistency
    if (normalizedEmail !== undefined) updateData.email = normalizedEmail;
    if (details.firstName !== undefined) updateData.firstName = details.firstName;
    if (details.lastName !== undefined) updateData.lastName = details.lastName;
    
    const result = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Password & 2FA methods
  async setUserPassword(userId: string, hashedPassword: string): Promise<User | undefined> {
    const result = await db
      .update(users)
      .set({ 
        password: hashedPassword,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }

  async verifyUserPassword(userId: string, password: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user?.password) {
      return false;
    }
    const bcrypt = await import('bcrypt');
    return await bcrypt.compare(password, user.password);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const normalizedEmail = email.toLowerCase().trim();
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);
    return result[0];
  }

  async enable2FA(userId: string, secret: string): Promise<User | undefined> {
    const result = await db
      .update(users)
      .set({ 
        twoFactorSecret: secret,
        twoFactorEnabled: true,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }

  async disable2FA(userId: string): Promise<User | undefined> {
    const result = await db
      .update(users)
      .set({ 
        twoFactorSecret: null,
        twoFactorEnabled: false,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }

  async verify2FAToken(userId: string, token: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user?.twoFactorSecret || !user.twoFactorEnabled) {
      return false;
    }
    
    const OTPAuth = await import('otpauth');
    const totp = new OTPAuth.TOTP({
      secret: user.twoFactorSecret,
      digits: 6,
      period: 30,
      algorithm: 'SHA1',
    });
    
    // Validate with 1-step window for clock drift
    const delta = totp.validate({ token, window: 1 });
    return delta !== null;
  }

  async get2FASecret(userId: string): Promise<string | null> {
    const user = await this.getUser(userId);
    return user?.twoFactorSecret || null;
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

  async searchCustomersByPhone(query: string, limit: number = 10): Promise<Customer[]> {
    // Sanitize query - only keep digits and + symbol
    const sanitized = query.replace(/[^0-9+]/g, '');
    
    // Use ILIKE with wildcards on both sides to match anywhere in phone number
    // This handles different formats: +66812345678, 0812345678, etc.
    const result = await db
      .select()
      .from(customers)
      .where(sql`${customers.phone} ILIKE ${'%' + sanitized + '%'}`)
      .orderBy(customers.name)
      .limit(limit);
    
    return result;
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

  async upsertCustomerByPhone(customer: InsertCustomer & Partial<Customer>): Promise<{ action: 'insert' | 'update', customer: Customer }> {
    // Check if customer exists by phone
    const existing = await this.getCustomerByPhone(customer.phone);
    
    if (existing) {
      // Update existing customer (only fields that are explicitly provided)
      const updateData: Partial<Customer> = {};
      
      // Only update fields that are explicitly provided in the customer object
      if (customer.name !== undefined) updateData.name = customer.name;
      if (customer.email !== undefined) updateData.email = customer.email;
      if (customer.photo !== undefined) updateData.photo = customer.photo;
      if (customer.gender !== undefined) updateData.gender = customer.gender;
      if (customer.birthday !== undefined) updateData.birthday = customer.birthday;
      if (customer.tag !== undefined) updateData.tag = customer.tag;
      if (customer.lineUid !== undefined) updateData.lineUid = customer.lineUid;
      if (customer.registerBranch !== undefined) updateData.registerBranch = customer.registerBranch;
      if (customer.registerDate !== undefined) updateData.registerDate = customer.registerDate;
      if (customer.lastUse !== undefined) updateData.lastUse = customer.lastUse;
      
      // Update points/tier/spending if explicitly provided
      if (customer.points !== undefined) updateData.points = customer.points;
      if (customer.tier !== undefined) updateData.tier = customer.tier;
      if (customer.totalSpent !== undefined) updateData.totalSpent = customer.totalSpent;
      
      const updated = await this.updateCustomer(existing.id, updateData);
      return { action: 'update', customer: updated! };
    } else {
      // Create new customer with proper defaults
      const insertData: InsertCustomer & Partial<Customer> = {
        ...customer,
        // Ensure required defaults
        points: customer.points ?? 0,
        tier: customer.tier ?? 'member',
        totalSpent: customer.totalSpent ?? '0.00',
      };
      
      const created = await this.createCustomer(insertData);
      return { action: 'insert', customer: created };
    }
  }

  async getAllCustomers(): Promise<Customer[]> {
    return await db.select().from(customers).orderBy(desc(customers.createdAt));
  }

  async listCustomers(params: {
    page: number;
    pageSize: number;
    search?: string;
  }): Promise<{ data: Customer[]; totalCount: number }> {
    const { page, pageSize, search } = params;
    const offset = (page - 1) * pageSize;

    // Build base query with optional search
    let query = db.select().from(customers);
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(customers);

    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      const searchCondition = sql`(
        ${customers.name} ILIKE ${searchTerm} OR 
        ${customers.phone} ILIKE ${searchTerm} OR 
        ${customers.email} ILIKE ${searchTerm}
      )`;
      query = query.where(searchCondition) as any;
      countQuery = countQuery.where(searchCondition) as any;
    }

    // Execute both queries in parallel
    const [data, countResult] = await Promise.all([
      query.orderBy(desc(customers.createdAt)).limit(pageSize).offset(offset),
      countQuery
    ]);

    const totalCount = countResult[0]?.count ?? 0;

    return { data, totalCount };
  }

  async getFilteredCustomers(filters: {
    tier?: string[];
    minSpend?: number;
    maxSpend?: number;
    minPoints?: number;
    maxPoints?: number;
    searchQuery?: string;
    registeredAfter?: Date;
    registeredBefore?: Date;
  }): Promise<Customer[]> {
    let query = db.select().from(customers);

    const conditions = [];

    // Tier filter
    if (filters.tier && filters.tier.length > 0) {
      conditions.push(sql`${customers.tier} IN (${sql.join(filters.tier.map(t => sql.raw(`'${t}'`)), sql`, `)})`);
    }

    // Spend range filter
    if (filters.minSpend !== undefined) {
      conditions.push(sql`${customers.totalSpent} >= ${filters.minSpend}`);
    }
    if (filters.maxSpend !== undefined) {
      conditions.push(sql`${customers.totalSpent} <= ${filters.maxSpend}`);
    }

    // Points range filter
    if (filters.minPoints !== undefined) {
      conditions.push(sql`${customers.points} >= ${filters.minPoints}`);
    }
    if (filters.maxPoints !== undefined) {
      conditions.push(sql`${customers.points} <= ${filters.maxPoints}`);
    }

    // Search query (name, phone, email)
    if (filters.searchQuery) {
      const searchTerm = `%${filters.searchQuery}%`;
      conditions.push(
        sql`(
          ${customers.name} ILIKE ${searchTerm} OR 
          ${customers.phone} ILIKE ${searchTerm} OR 
          ${customers.email} ILIKE ${searchTerm}
        )`
      );
    }

    // Date range filters
    if (filters.registeredAfter) {
      conditions.push(sql`${customers.createdAt} >= ${filters.registeredAfter}`);
    }
    if (filters.registeredBefore) {
      conditions.push(sql`${customers.createdAt} <= ${filters.registeredBefore}`);
    }

    // Apply all conditions
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query.orderBy(desc(customers.totalSpent));
  }

  async bulkDeleteCustomers(filter: {
    createdAfter?: string; // ISO string
    createdBefore?: string; // ISO string
    tags?: string[];
    hasZeroTotals?: boolean;
  }): Promise<{ deletedCount: number; deletedIds: string[] }> {
    const conditions = [];

    // Date range filters
    if (filter.createdAfter) {
      conditions.push(sql`${customers.createdAt} >= ${filter.createdAfter}`);
    }
    if (filter.createdBefore) {
      // Use strict < comparison (frontend already added +1 day for inclusive behavior)
      conditions.push(sql`${customers.createdAt} < ${filter.createdBefore}`);
    }

    // Tags filter
    if (filter.tags && filter.tags.length > 0) {
      conditions.push(sql`${customers.tag} IN (${sql.join(filter.tags.map(t => sql.raw(`'${t}'`)), sql`, `)})`);
    }

    // Zero totals filter
    if (filter.hasZeroTotals) {
      conditions.push(sql`${customers.totalSpent} = 0`);
    }

    // Find customers matching the filter
    let query = db.select({ id: customers.id }).from(customers);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const matchingCustomers = await query;
    const customerIds = matchingCustomers.map(c => c.id);

    if (customerIds.length === 0) {
      return { deletedCount: 0, deletedIds: [] };
    }

    // Delete related data (transactions, notifications, message logs)
    // These will cascade delete due to foreign key constraints
    await db.delete(transactions).where(sql`${transactions.customerId} IN (${sql.join(customerIds.map(id => sql.raw(`'${id}'`)), sql`, `)})`);
    await db.delete(customerNotifications).where(sql`${customerNotifications.customerId} IN (${sql.join(customerIds.map(id => sql.raw(`'${id}'`)), sql`, `)})`);
    await db.delete(messageLog).where(sql`${messageLog.customerId} IN (${sql.join(customerIds.map(id => sql.raw(`'${id}'`)), sql`, `)})`);

    // Delete customers
    await db.delete(customers).where(sql`${customers.id} IN (${sql.join(customerIds.map(id => sql.raw(`'${id}'`)), sql`, `)})`);

    return {
      deletedCount: customerIds.length,
      deletedIds: customerIds,
    };
  }

  async deleteCustomer(id: string): Promise<void> {
    // Delete related data first (transactions, notifications, message logs)
    await db.delete(transactions).where(eq(transactions.customerId, id));
    await db.delete(customerNotifications).where(eq(customerNotifications.customerId, id));
    await db.delete(messageLog).where(eq(messageLog.customerId, id));
    
    // Delete the customer
    await db.delete(customers).where(eq(customers.id, id));
  }

  async getDuplicatePhoneNumbers(): Promise<Array<{ phone: string; count: number; customers: Customer[] }>> {
    // Find all phone numbers that appear more than once
    const duplicatePhones = await db
      .select({
        phone: customers.phone,
        count: sql<number>`count(*)::int`,
      })
      .from(customers)
      .groupBy(customers.phone)
      .having(sql`count(*) > 1`)
      .orderBy(sql`count(*) desc`);
    
    // For each duplicate phone, fetch all customers with that phone
    const result = await Promise.all(
      duplicatePhones.map(async (dup) => {
        const duplicateCustomers = await db
          .select()
          .from(customers)
          .where(eq(customers.phone, dup.phone))
          .orderBy(desc(customers.createdAt));
        
        return {
          phone: dup.phone,
          count: dup.count,
          customers: duplicateCustomers,
        };
      })
    );
    
    return result;
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

  async getWeeklyOverview(): Promise<{
    thisWeek: {
      revenue: number;
      transactions: number;
      avgTransaction: number;
      pointsIssued: number;
      pointsRedeemed: number;
      newCustomers: number;
      returningCustomers: number;
    };
    lastWeek: {
      revenue: number;
      transactions: number;
      avgTransaction: number;
    };
    dailyData: Array<{
      date: string;
      revenue: number;
      transactions: number;
    }>;
    topProducts: Array<{
      productName: string;
      revenue: number;
      quantity: number;
    }>;
    bestDay: {
      date: string;
      revenue: number;
    };
  }> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Calculate week boundaries
    const dayOfWeek = today.getDay();
    const startOfThisWeek = new Date(today);
    startOfThisWeek.setDate(today.getDate() - dayOfWeek);
    
    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);
    
    const endOfLastWeek = new Date(startOfThisWeek);
    
    // Get this week's transactions
    const thisWeekTransactions = await db
      .select()
      .from(transactions)
      .where(sql`${transactions.createdAt} >= ${startOfThisWeek}`);
    
    // Get last week's transactions
    const lastWeekTransactions = await db
      .select()
      .from(transactions)
      .where(
        and(
          sql`${transactions.createdAt} >= ${startOfLastWeek}`,
          sql`${transactions.createdAt} < ${endOfLastWeek}`
        )
      );
    
    // Calculate this week's metrics
    const thisWeekRevenue = thisWeekTransactions
      .filter(t => t.type === 'purchase')
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
    
    const thisWeekTransCount = thisWeekTransactions.filter(t => t.type === 'purchase').length;
    const thisWeekAvgTrans = thisWeekTransCount > 0 ? thisWeekRevenue / thisWeekTransCount : 0;
    
    const thisWeekPointsIssued = thisWeekTransactions
      .filter(t => t.type === 'purchase')
      .reduce((sum, t) => sum + t.points, 0);
    
    const thisWeekPointsRedeemed = thisWeekTransactions
      .filter(t => t.type === 'reward')
      .reduce((sum, t) => sum + Math.abs(t.points), 0);
    
    // Calculate last week's metrics
    const lastWeekRevenue = lastWeekTransactions
      .filter(t => t.type === 'purchase')
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
    
    const lastWeekTransCount = lastWeekTransactions.filter(t => t.type === 'purchase').length;
    const lastWeekAvgTrans = lastWeekTransCount > 0 ? lastWeekRevenue / lastWeekTransCount : 0;
    
    // Get new customers this week
    const newCustomersThisWeek = await db
      .select()
      .from(customers)
      .where(sql`${customers.createdAt} >= ${startOfThisWeek}`);
    
    // Get unique returning customers this week (had transaction before this week)
    const returningCustomerIds = new Set<string>();
    for (const trans of thisWeekTransactions) {
      const customer = await db
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.id, trans.customerId),
            sql`${customers.createdAt} < ${startOfThisWeek}`
          )
        )
        .limit(1);
      
      if (customer.length > 0) {
        returningCustomerIds.add(trans.customerId);
      }
    }
    
    // Get daily data for the last 7 days
    const dailyData: Array<{ date: string; revenue: number; transactions: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);
      
      const dayTransactions = thisWeekTransactions.filter(t => {
        const transDate = new Date(t.createdAt);
        return transDate >= date && transDate < nextDate && t.type === 'purchase';
      });
      
      const dayRevenue = dayTransactions.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
      
      dailyData.push({
        date: date.toISOString().split('T')[0],
        revenue: dayRevenue,
        transactions: dayTransactions.length,
      });
    }
    
    // Find best day
    const bestDay = dailyData.reduce((best, day) => 
      day.revenue > best.revenue ? day : best
    , dailyData[0] || { date: '', revenue: 0 });
    
    // Get top products (mock data for now - will need product tracking in transactions)
    const topProducts: Array<{ productName: string; revenue: number; quantity: number }> = [];
    
    return {
      thisWeek: {
        revenue: thisWeekRevenue,
        transactions: thisWeekTransCount,
        avgTransaction: thisWeekAvgTrans,
        pointsIssued: thisWeekPointsIssued,
        pointsRedeemed: thisWeekPointsRedeemed,
        newCustomers: newCustomersThisWeek.length,
        returningCustomers: returningCustomerIds.size,
      },
      lastWeek: {
        revenue: lastWeekRevenue,
        transactions: lastWeekTransCount,
        avgTransaction: lastWeekAvgTrans,
      },
      dailyData,
      topProducts,
      bestDay,
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

  // Message Template methods
  async getAllMessageTemplates(): Promise<MessageTemplate[]> {
    return await db.select().from(messageTemplates).orderBy(desc(messageTemplates.createdAt));
  }

  async getMessageTemplate(id: string): Promise<MessageTemplate | undefined> {
    const result = await db.select().from(messageTemplates).where(eq(messageTemplates.id, id));
    return result[0];
  }

  async getMessageTemplatesByType(type: string): Promise<MessageTemplate[]> {
    return await db
      .select()
      .from(messageTemplates)
      .where(eq(messageTemplates.type, type))
      .orderBy(desc(messageTemplates.isDefault), desc(messageTemplates.createdAt));
  }

  async getDefaultMessageTemplate(type: string): Promise<MessageTemplate | undefined> {
    const result = await db
      .select()
      .from(messageTemplates)
      .where(and(eq(messageTemplates.type, type), eq(messageTemplates.isDefault, true)))
      .limit(1);
    return result[0];
  }

  async createMessageTemplate(insertTemplate: InsertMessageTemplate): Promise<MessageTemplate> {
    // If this is set as default, unset other defaults for the same type
    if (insertTemplate.isDefault) {
      await db
        .update(messageTemplates)
        .set({ isDefault: false })
        .where(eq(messageTemplates.type, insertTemplate.type));
    }

    const result = await db
      .insert(messageTemplates)
      .values(insertTemplate)
      .returning();
    
    return result[0];
  }

  async updateMessageTemplate(id: string, template: Partial<MessageTemplate>): Promise<MessageTemplate | undefined> {
    // If this is set as default, unset other defaults for the same type
    if (template.isDefault && template.type) {
      await db
        .update(messageTemplates)
        .set({ isDefault: false })
        .where(and(eq(messageTemplates.type, template.type), sql`${messageTemplates.id} != ${id}`));
    }

    const result = await db
      .update(messageTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(messageTemplates.id, id))
      .returning();
    
    return result[0];
  }

  async deleteMessageTemplate(id: string): Promise<void> {
    await db.delete(messageTemplates).where(eq(messageTemplates.id, id));
  }

  // Message Log methods
  async createMessageLog(log: InsertMessageLog): Promise<MessageLog> {
    const result = await db.insert(messageLog).values({
      ...log,
      sentAt: log.status === 'sent' ? new Date() : null,
    }).returning();
    return result[0];
  }

  async getMessageLogs(customerId?: string): Promise<MessageLog[]> {
    if (customerId) {
      return await db
        .select()
        .from(messageLog)
        .where(eq(messageLog.customerId, customerId))
        .orderBy(desc(messageLog.createdAt));
    }
    return await db
      .select()
      .from(messageLog)
      .orderBy(desc(messageLog.createdAt))
      .limit(100);
  }

  async updateMessageLogStatus(
    id: string,
    status: string,
    externalId?: string,
    errorMessage?: string
  ): Promise<void> {
    const updates: any = {
      status,
      externalId: externalId || null,
      errorMessage: errorMessage || null,
    };
    
    if (status === 'sent') {
      updates.sentAt = new Date();
    } else if (status === 'delivered') {
      updates.deliveredAt = new Date();
    }

    await db
      .update(messageLog)
      .set(updates)
      .where(eq(messageLog.id, id));
  }

  // Site methods
  async getAllSites(): Promise<Site[]> {
    return await db.select().from(sites).orderBy(asc(sites.name));
  }

  async getSite(id: string): Promise<Site | undefined> {
    const result = await db.select().from(sites).where(eq(sites.id, id));
    return result[0];
  }

  async createSite(insertSite: InsertSite): Promise<Site> {
    const result = await db
      .insert(sites)
      .values(insertSite)
      .returning();
    return result[0];
  }

  async updateSite(id: string, site: Partial<Site>): Promise<Site | undefined> {
    const result = await db
      .update(sites)
      .set({ ...site, updatedAt: new Date() })
      .where(eq(sites.id, id))
      .returning();
    return result[0];
  }

  async deleteSite(id: string): Promise<void> {
    await db.delete(sites).where(eq(sites.id, id));
  }
}

export const storage = new DbStorage();
