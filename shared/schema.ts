import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, decimal, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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

// Admin users table
export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull().default("admin"), // admin, barista
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Barista users table (staff who process transactions)
export const baristaUsers = pgTable("barista_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  location: text("location").notNull(),
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

export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  createdAt: true,
});

export const insertBaristaUserSchema = createInsertSchema(baristaUsers).omit({
  id: true,
  createdAt: true,
});

// Types
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type Promotion = typeof promotions.$inferSelect;
export type InsertPromotion = z.infer<typeof insertPromotionSchema>;

export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;

export type BaristaUser = typeof baristaUsers.$inferSelect;
export type InsertBaristaUser = z.infer<typeof insertBaristaUserSchema>;
