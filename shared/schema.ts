import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, decimal, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Staff users table for Replit Auth (baristas and admins)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: text("role").notNull().default("barista"), // barista or admin
  location: text("location"), // for baristas
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customers table - loyalty program members
export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  email: text("email"),
  photo: text("photo"),
  birthday: text("birthday"),
  points: integer("points").notNull().default(0),
  tier: text("tier").notNull().default("bronze"), // bronze, silver, gold
  referralCode: text("referral_code").notNull().unique(),
  referredBy: varchar("referred_by"),
  totalSpent: decimal("total_spent", { precision: 10, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Transactions table - purchase history
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  points: integer("points").notNull(),
  location: text("location").notNull(),
  receiptUrl: text("receipt_url"),
  type: text("type").notNull().default("purchase"), // purchase, reward, birthday_bonus, referral
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Promotions table - SMS campaigns
export const promotions = pgTable("promotions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  message: text("message").notNull(),
  targetTier: text("target_tier"), // null = all customers
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  sentCount: integer("sent_count").notNull().default(0),
});

// Customer Notifications - tracks which promotions each customer has seen
export const customerNotifications = pgTable("customer_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  promotionId: varchar("promotion_id").notNull().references(() => promotions.id),
  isRead: boolean("is_read").notNull().default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});


// Insert schemas with validation
export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  points: true,
  tier: true,
  referralCode: true,
  totalSpent: true,
  createdAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertPromotionSchema = createInsertSchema(promotions).omit({
  id: true,
  sentAt: true,
  sentCount: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCustomerNotificationSchema = createInsertSchema(customerNotifications).omit({
  id: true,
  createdAt: true,
  isRead: true,
  readAt: true,
});

// Types
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type Promotion = typeof promotions.$inferSelect;
export type InsertPromotion = z.infer<typeof insertPromotionSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = typeof users.$inferInsert;

export type CustomerNotification = typeof customerNotifications.$inferSelect;
export type InsertCustomerNotification = z.infer<typeof insertCustomerNotificationSchema>;
