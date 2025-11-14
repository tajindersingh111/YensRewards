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
  tier: text("tier").notNull().default("bronze"), // bronze, silver, gold, platinum
  referralCode: text("referral_code").notNull().unique(),
  referredBy: varchar("referred_by"),
  totalSpent: decimal("total_spent", { precision: 10, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // Additional fields for CSV import (matching production database column names)
  gender: text("gender"),
  registerDate: timestamp("register_date"),
  registerBranch: text("register_branch"),
  lastUse: timestamp("last_use"),
  tag: text("tag"),
  lineUid: text("line_uid"),
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

// Products table - menu items
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productCode: text("product_code"), // Product code from POS
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  cost: decimal("cost", { precision: 10, scale: 2 }), // Cost price
  category: text("category").notNull(), // soft_serve, milk_tea, fruit_tea, shakes, sundaes, float_drinks
  imageUrl: text("image_url"),
  badge: text("badge"), // new, popular, limited, sale, null
  featured: boolean("featured").notNull().default(false),
  available: boolean("available").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Message Templates table - for birthday and promotional SMS/email messages
export const messageTemplates = pgTable("message_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // birthday, promotion, reminder
  channel: text("channel").notNull(), // sms, email, both
  subject: text("subject"), // Email subject (null for SMS)
  message: text("message").notNull(), // Template with placeholders: {name}, {points}, {tier}
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Message Log table - tracks all sent messages
export const messageLog = pgTable("message_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  templateId: varchar("template_id").references(() => messageTemplates.id),
  channel: text("channel").notNull(), // sms, email
  recipient: text("recipient").notNull(), // phone or email
  subject: text("subject"), // Email subject
  message: text("message").notNull(),
  status: text("status").notNull().default("pending"), // pending, sent, failed, delivered
  externalId: text("external_id"), // Twilio SID or email provider ID
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});


// Insert schemas with validation
export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  referralCode: true,
  createdAt: true,
});

// CSV Import schema - all fields as strings from CSV, server will coerce types
export const insertCustomerCSVSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().optional(),
  gender: z.string().optional(),
  birthday: z.string().optional(),
  points: z.string().optional(), // Will be parsed to number on server
  tier: z.string().optional(),
  totalSpent: z.string().optional(),
  registerDate: z.string().optional(), // Will be parsed to Date on server
  registerBranch: z.string().optional(),
  lastUse: z.string().optional(), // Will be parsed to Date on server
  tag: z.string().optional(),
  lineUid: z.string().optional(),
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

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  productCode: z.string().optional(),
  cost: z.string().optional(),
});

export const insertMessageTemplateSchema = createInsertSchema(messageTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageLogSchema = createInsertSchema(messageLog).omit({
  id: true,
  createdAt: true,
  sentAt: true,
  deliveredAt: true,
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

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type CustomerNotification = typeof customerNotifications.$inferSelect;
export type InsertCustomerNotification = z.infer<typeof insertCustomerNotificationSchema>;

export type MessageTemplate = typeof messageTemplates.$inferSelect;
export type InsertMessageTemplate = z.infer<typeof insertMessageTemplateSchema>;

export type MessageLog = typeof messageLog.$inferSelect;
export type InsertMessageLog = z.infer<typeof insertMessageLogSchema>;
