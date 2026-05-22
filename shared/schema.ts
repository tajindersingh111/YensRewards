import { sqliteTable, text, integer, real, index, uniqueIndex, blob, numeric, boolean } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import crypto from "crypto";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for standalone auth
export const sessions = sqliteTable(
  "sessions",
  {
    sid: text("sid").primaryKey(),
    sess: text("sess").notNull(),
    expire: text("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Staff users table (baristas, managers, and admins)
export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  role: text("role").notNull().default("barista"), // barista, manager, or admin
  location: text("location"), // for baristas/managers
  password: text("password"), // bcrypt hashed password (nullable - optional auth method)
  twoFactorSecret: text("two_factor_secret"), // TOTP secret for 2FA (nullable)
  twoFactorEnabled: integer("two_factor_enabled", { mode: 'boolean' }).notNull().default(false),
  isActive: integer("is_active", { mode: 'boolean' }).notNull().default(true), // Admin can disable access remotely
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Refresh tokens for standalone auth
export const refreshTokens = sqliteTable("refresh_tokens", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  token: text("token").unique().notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  device: text("device"),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Customers table - loyalty program members
export const customers = sqliteTable("customers", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  email: text("email"),
  photo: text("photo"),
  birthday: text("birthday"),
  points: integer("points").notNull().default(0),
  tier: text("tier").notNull().default("bronze"), // bronze, silver, gold, platinum
  referralCode: text("referral_code").notNull().unique(),
  referredBy: text("referred_by"),
  totalSpent: real("total_spent", { precision: 10, scale: 2 }).notNull().default("0"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  // Additional fields for CSV import (matching production database column names)
  gender: text("gender"),
  registerDate: text("register_date"),
  registerBranch: text("register_branch"),
  lastUse: text("last_use"),
  tag: text("tag"),
  lineUid: text("line_uid"),
  isLineActive: integer("is_line_active", { mode: 'boolean' }).notNull().default(true), // false when customer unfollows LINE bot
  lastUnfollowAt: text("last_unfollow_at"), // audit trail of last unfollow event
  relinkCount: integer("relink_count").notNull().default(0), // number of times customer has re-linked LINE
},
(table) => [
  uniqueIndex("customers_line_uid_unique_idx").on(table.lineUid),
]);

// Transactions table - purchase history
export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  customerId: text("customer_id").notNull().references(() => customers.id),
  baristaId: text("barista_id").references(() => users.id), // Track which barista processed
  amount: real("amount", { precision: 10, scale: 2 }).notNull(),
  points: integer("points").notNull(),
  location: text("location").notNull(),
  receiptUrl: text("receipt_url"),
  type: text("type").notNull().default("purchase"), // purchase, reward, birthday_bonus, referral
  includedSpecialOffer: integer("included_special_offer", { mode: 'boolean' }).notNull().default(false), // Did barista sell weekly special?
  isNewCustomer: integer("is_new_customer", { mode: 'boolean' }).notNull().default(false), // Was this a new customer signup?
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Promotions table - SMS campaigns
export const promotions = sqliteTable("promotions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  message: text("message").notNull(),
  targetTier: text("target_tier"), // null = all customers
  sentAt: text("sent_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  sentCount: integer("sent_count").notNull().default(0),
});

// Customer Notifications - tracks which promotions each customer has seen
export const customerNotifications = sqliteTable("customer_notifications", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  customerId: text("customer_id").notNull().references(() => customers.id),
  promotionId: text("promotion_id").notNull().references(() => promotions.id),
  isRead: integer("is_read", { mode: 'boolean' }).notNull().default(false),
  readAt: text("read_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Products table - menu items
export const products = sqliteTable("products", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  productCode: text("product_code"), // Product code from POS
  name: text("name").notNull(),
  description: text("description"),
  price: real("price", { precision: 10, scale: 2 }).notNull(),
  cost: real("cost", { precision: 10, scale: 2 }), // Cost price
  category: text("category").notNull(), // soft_serve, milk_tea, fruit_tea, shakes, sundaes, float_drinks
  imageUrl: text("image_url"),
  badge: text("badge"), // new, popular, limited, sale, null
  featured: integer("featured", { mode: 'boolean' }).notNull().default(false),
  promoFocus: integer("promo_focus", { mode: 'boolean' }).notNull().default(false), // Highlight as promotional focus
  available: integer("available", { mode: 'boolean' }).notNull().default(true),
  isRedeemable: integer("is_redeemable", { mode: 'boolean' }).notNull().default(false), // Can be redeemed with loyalty points
  pointCost: integer("point_cost").notNull().default(100), // Points required for redemption
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Message Templates table - for birthday and promotional SMS/email/LINE messages
export const messageTemplates = sqliteTable("message_templates", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  templateKey: text("template_key").unique(), // Unique key for lookup: email_welcome, line_birthday, etc.
  name: text("name").notNull(),
  type: text("type").notNull(), // welcome, birthday, promotion, points_update, tier_status, line_invite, account_linked
  channel: text("channel").notNull(), // sms, email, line
  subject: text("subject"), // Email subject (null for SMS/LINE)
  message: text("message").notNull(), // Plain text template with placeholders: {{name}}, {{points}}, {{tier}}
  htmlContent: text("html_content"), // HTML content for email templates
  jsonContent: text("json_content"), // JSON Flex Message content for LINE templates
  variables: text("variables"), // List of available placeholders: ["customerName", "points", "tier"]
  isDefault: integer("is_default", { mode: 'boolean' }).notNull().default(false),
  isActive: integer("is_active", { mode: 'boolean' }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Message Log table - tracks all sent messages
export const messageLog = sqliteTable("message_log", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  customerId: text("customer_id").notNull().references(() => customers.id),
  templateId: text("template_id").references(() => messageTemplates.id),
  channel: text("channel").notNull(), // sms, email, line, app
  recipient: text("recipient").notNull(), // phone, email, or LINE UID
  subject: text("subject"), // Email subject (null for SMS/LINE)
  message: text("message").notNull(),
  status: text("status").notNull().default("pending"), // pending, sent, failed, delivered
  externalId: text("external_id"), // Twilio SID, email provider ID, or LINE message ID
  errorMessage: text("error_message"),
  sentAt: text("sent_at"),
  deliveredAt: text("delivered_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Scheduled Messages table - for sending messages at a specific time
export const scheduledMessages = sqliteTable("scheduled_messages", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  channel: text("channel").notNull(), // sms, email, line
  recipientType: text("recipient_type").notNull(), // all, tier, individual, birthday_today, birthday_week
  recipientTier: text("recipient_tier"), // bronze, silver, gold, platinum (when recipientType is 'tier')
  recipientIds: text("recipient_ids"), // Customer IDs (when recipientType is 'individual')
  templateId: text("template_id").references(() => messageTemplates.id),
  subject: text("subject"), // Email subject
  message: text("message").notNull(), // Message content (HTML for email)
  scheduledFor: text("scheduled_for").notNull(), // When to send (UTC)
  timezone: text("timezone").notNull().default("Asia/Bangkok"), // User's timezone for display
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed, cancelled
  processingStartedAt: text("processing_started_at"), // For idempotency/lock
  sentCount: integer("sent_count").default(0),
  failedCount: integer("failed_count").default(0),
  errorMessage: text("error_message"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Automations table - automated message rules triggered by schedule or events
export const automations = sqliteTable("automations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  isActive: integer("is_active", { mode: 'boolean' }).notNull().default(true),
  triggerType: text("trigger_type").notNull(), // 'recurring_daily', 'recurring_weekly', 'recurring_monthly', 'one_time'
  triggerConfig: text("trigger_config").notNull().$type<{ time?: string; dayOfWeek?: string; dayOfMonth?: number; date?: string }>(),
  customerFilter: text("customer_filter").notNull().default("all"), // 'all', 'tier_bronze', 'tier_silver', 'tier_gold', 'tier_platinum', 'birthday_today', 'inactive_30d', 'inactive_60d'
  channel: text("channel").notNull(), // 'email', 'sms', 'line', 'app'
  templateId: text("template_id").references(() => messageTemplates.id),
  subject: text("subject"),
  message: text("message").notNull(),
  nextRunAt: text("next_run_at"),
  lastRunAt: text("last_run_at"),
  runCount: integer("run_count").notNull().default(0),
  createdBy: text("created_by").references(() => users.id),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Automation Runs table - execution history log for each automation
export const automationRuns = sqliteTable("automation_runs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  automationId: text("automation_id").notNull().references(() => automations.id, { onDelete: 'cascade' }),
  triggeredAt: text("triggered_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  status: text("status").notNull().default("running"), // 'running', 'completed', 'failed'
  sentCount: integer("sent_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  errorMessage: text("error_message"),
  completedAt: text("completed_at"),
});

// Sites table - physical locations/stalls where Yens products are sold
export const sites = sqliteTable("sites", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(), // Site name (e.g., "Central Plaza Stall", "Mobile Van #1")
  channelName: text("channel_name").notNull(), // Sales channel identifier (e.g., "SHOP", "RIVER", "GRAB")
  type: text("type").notNull(), // "stall" or "mobile_van"
  location: text("location").notNull(), // Address or area description
  operatingDays: text("operating_days"), // ["monday", "tuesday", etc.]
  openTime: text("open_time"), // "09:00"
  closeTime: text("close_time"), // "18:00"
  isActive: integer("is_active", { mode: 'boolean' }).notNull().default(true),
  notes: text("notes"), // For ad-hoc sites or special instructions
  managerId: text("manager_id").references(() => users.id), // Optional: assigned manager
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Time Entries table - tracks barista clock in/out times
export const timeEntries = sqliteTable("time_entries", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id), // Barista who clocked in
  siteId: text("site_id").notNull().references(() => sites.id), // Location where they're working
  date: text("date").notNull(), // YYYY-MM-DD format
  clockInTime: text("clock_in_time").notNull(), // When they clocked in
  clockOutTime: text("clock_out_time"), // When they clocked out (null if still clocked in)
  notes: text("notes"), // Optional notes
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Work Schedules table - barista work schedules
// Weekly schedule series configuration
export const workScheduleSeries = sqliteTable("work_schedule_series", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id), // Barista for this series
  siteId: text("site_id").notNull().references(() => sites.id), // Location for this series
  weekStartDate: text("week_start_date").notNull(), // ISO date of Monday starting the series (YYYY-MM-DD)
  daysOfWeek: text("days_of_week").notNull(), // e.g., ['monday', 'wednesday', 'friday']
  repeatWeeks: integer("repeat_weeks").notNull().default(1), // Number of weeks to repeat (1, 2, 4, 8, 12)
  startTime: text("start_time").notNull(), // HH:MM format
  endTime: text("end_time").notNull(), // HH:MM format
  notes: text("notes"), // Optional notes for the series
  createdBy: text("created_by").references(() => users.id), // Admin who created this series
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Individual work schedule occurrences
export const workSchedules = sqliteTable("work_schedules", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id), // Barista assigned to shift
  siteId: text("site_id").notNull().references(() => sites.id), // Location of shift
  scheduledDate: text("scheduled_date").notNull(), // YYYY-MM-DD format
  startTime: text("start_time").notNull(), // HH:MM format (e.g., "09:00")
  endTime: text("end_time").notNull(), // HH:MM format (e.g., "17:00")
  notes: text("notes"), // Optional shift notes
  seriesId: text("series_id").references(() => workScheduleSeries.id), // Link to parent series (null for single-day schedules)
  occurrenceIndex: integer("occurrence_index"), // Index within series (null for single-day schedules)
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Barista Announcements table - promotions and notices for baristas
export const baristaAnnouncements = sqliteTable("barista_announcements", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(), // Announcement title
  content: text("content").notNull(), // Announcement body
  type: text("type").notNull().default("general"), // general, promotion, incentive, policy
  isActive: integer("is_active", { mode: 'boolean' }).notNull().default(true), // Show/hide announcement
  priority: integer("priority").notNull().default(0), // Higher priority shows first
  expiresAt: text("expires_at"), // Optional expiry date
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Weekly Specials table - featured promotions for baristas to push
export const weeklySpecials = sqliteTable("weekly_specials", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(), // e.g., "Mango Sticky Rice Sundae"
  description: text("description").notNull(), // What makes it special
  productId: text("product_id").references(() => products.id), // Optional link to product
  imageUrl: text("image_url"), // Optional image
  bonusPoints: integer("bonus_points").notNull().default(5), // Extra points for barista when sold
  startDate: text("start_date").notNull(), // YYYY-MM-DD
  endDate: text("end_date").notNull(), // YYYY-MM-DD
  isActive: integer("is_active", { mode: 'boolean' }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Barista Performance table - tracks weekly/monthly performance
export const baristaPerformance = sqliteTable("barista_performance", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id),
  weekStart: text("week_start").notNull(), // YYYY-MM-DD (Monday of week)
  transactionCount: integer("transaction_count").notNull().default(0), // # transactions completed
  specialOffersSold: integer("special_offers_sold").notNull().default(0), // # weekly specials sold
  newCustomerSignups: integer("new_customer_signups").notNull().default(0), // # new customers registered
  totalPoints: integer("total_points").notNull().default(0), // Total points earned this week
  weeklyRank: integer("weekly_rank"), // Ranking among all baristas (1 = first place)
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  // Unique constraint for atomic upserts - prevents race conditions
  userWeekUnique: uniqueIndex("barista_performance_user_week_unique").on(table.userId, table.weekStart),
}));

// Daily Sales table - tracks sales by site from Excel imports
export const dailySales = sqliteTable("daily_sales", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  date: text("date").notNull(), // YYYY-MM-DD
  dayOfWeek: text("day_of_week").notNull(), // Sun, Mon, Tue, Wed, Thu, Fri, Sat
  orderChannel: text("order_channel").notNull(), // Shop, Supalai, Balloon, Box, River, Army, Lamp, etc.
  netSales: real("net_sales", { precision: 10, scale: 2 }).notNull(), // Sales before fees
  otherSales: real("other_sales", { precision: 10, scale: 2 }).default("0"), // Other revenue (e.g., tips, delivery)
  otherSalesNote: text("other_sales_note"), // Optional note/reference for other sales (e.g., "Catering", "Tips")
  grabFee: real("grab_fee", { precision: 10, scale: 2 }).default("0"), // Delivery platform fees
  totalSales: real("total_sales", { precision: 10, scale: 2 }).notNull(), // Total sales
  importedBy: text("imported_by").references(() => users.id), // Admin who imported
  importedAt: text("imported_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  // Unique constraint: one entry per date + orderChannel
  uniqueIndex("daily_sales_date_channel_idx").on(table.date, table.orderChannel),
]);


// Insert schemas with validation
export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  referralCode: true,
  createdAt: true,
}).extend({
  // Allow dates as strings (ISO format) or Date objects for API compatibility
  registerDate: z.union([z.string(), z.date(), z.null()]).optional().transform(val => {
    if (!val) return null;
    if (val instanceof Date) return val;
    return new Date(val);
  }),
  lastUse: z.union([z.string(), z.date(), z.null()]).optional().transform(val => {
    if (!val) return null;
    if (val instanceof Date) return val;
    return new Date(val);
  }),
});

// Public registration schema — only safe fields; prevents loyalty fraud via
// attacker-controlled points, tier, totalSpent, registerBranch, tag, lineUid
export const publicInsertCustomerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional().nullable(),
  photo: z.string().optional().nullable(),
  birthday: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
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

export const insertScheduledMessageSchema = createInsertSchema(scheduledMessages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  processingStartedAt: true,
  sentCount: true,
  failedCount: true,
});

export const insertSiteSchema = createInsertSchema(sites).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  channelName: z.string().min(1, "Channel name is required").max(20, "Channel name must be 20 characters or less").regex(/^[A-Z0-9 _-]+$/, "Channel name must contain only uppercase letters, numbers, spaces, hyphens, and underscores"),
});

export const insertTimeEntrySchema = createInsertSchema(timeEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkScheduleSeriesSchema = createInsertSchema(workScheduleSeries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkScheduleSchema = createInsertSchema(workSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBaristaAnnouncementSchema = createInsertSchema(baristaAnnouncements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWeeklySpecialSchema = createInsertSchema(weeklySpecials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBaristaPerformanceSchema = createInsertSchema(baristaPerformance).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDailySalesSchema = createInsertSchema(dailySales).omit({
  id: true,
  dayOfWeek: true,
  importedBy: true,
  importedAt: true,
  createdAt: true,
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

export type ScheduledMessage = typeof scheduledMessages.$inferSelect;
export type InsertScheduledMessage = z.infer<typeof insertScheduledMessageSchema>;

export type Site = typeof sites.$inferSelect;
export type InsertSite = z.infer<typeof insertSiteSchema>;

export type TimeEntry = typeof timeEntries.$inferSelect;
export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;

export type WorkScheduleSeries = typeof workScheduleSeries.$inferSelect;
export type InsertWorkScheduleSeries = z.infer<typeof insertWorkScheduleSeriesSchema>;

export type WorkSchedule = typeof workSchedules.$inferSelect;
export type InsertWorkSchedule = z.infer<typeof insertWorkScheduleSchema>;

export type BaristaAnnouncement = typeof baristaAnnouncements.$inferSelect;
export type InsertBaristaAnnouncement = z.infer<typeof insertBaristaAnnouncementSchema>;

export type WeeklySpecial = typeof weeklySpecials.$inferSelect;
export type InsertWeeklySpecial = z.infer<typeof insertWeeklySpecialSchema>;

export type BaristaPerformance = typeof baristaPerformance.$inferSelect;
export type InsertBaristaPerformance = z.infer<typeof insertBaristaPerformanceSchema>;

export type DailySales = typeof dailySales.$inferSelect;
export type InsertDailySales = z.infer<typeof insertDailySalesSchema>;

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type InsertRefreshToken = typeof refreshTokens.$inferInsert;

// Customer Reviews table - store customer feedback and ratings
export const customerReviews = sqliteTable("customer_reviews", {
  id: integer("id").primaryKey({ autoIncrement: true }), // Auto-increment serial
  customerId: text("customer_id").references(() => customers.id).notNull(),
  rating: integer("rating").notNull(), // 1-5 stars
  feedbackTags: text("feedback_tags"), // ["delicious", "fast_service", "good_value", etc.]
  comment: text("comment"), // Optional free-form comment (max 500 chars)
  googlePlaceId: text("google_place_id"), // Google Place ID for the review
  syncedToGoogle: integer("synced_to_google", { mode: 'boolean' }).notNull().default(false), // Tracking if synced
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insertCustomerReviewSchema = createInsertSchema(customerReviews).omit({
  id: true,
  createdAt: true,
  syncedToGoogle: true,
});

export type CustomerReview = typeof customerReviews.$inferSelect;
export type InsertCustomerReview = z.infer<typeof insertCustomerReviewSchema>;

// LINE Linking Codes table - persistent storage for linking codes
export const lineLinkingCodes = sqliteTable("line_linking_codes", {
  code: text("code", { length: 10 }).primaryKey(), // e.g., LINK-ABCD
  customerId: text("customer_id").notNull().references(() => customers.id),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  expiresAt: text("expires_at").notNull(),
  used: integer("used", { mode: 'boolean' }).notNull().default(false),
});

export const insertLineLinkingCodeSchema = createInsertSchema(lineLinkingCodes).omit({ createdAt: true });
export type LineLinkingCode = typeof lineLinkingCodes.$inferSelect;
export type InsertLineLinkingCode = z.infer<typeof insertLineLinkingCodeSchema>;

// Shop Events table - calendar events for planning (expos, promotions, meetings, etc.)
export const shopEvents = sqliteTable("shop_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull().default("event"), // event, expo, promotion, holiday, meeting, catering, other
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  allDay: integer("all_day", { mode: 'boolean' }).notNull().default(false),
  location: text("location"),
  notes: text("notes"),
  color: text("color"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insertShopEventSchema = createInsertSchema(shopEvents).omit({
  id: true,
  createdAt: true,
}).extend({
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional().nullable(),
});

export type ShopEvent = typeof shopEvents.$inferSelect;
export type InsertShopEvent = z.infer<typeof insertShopEventSchema>;

export const insertAutomationSchema = createInsertSchema(automations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  nextRunAt: true,
  lastRunAt: true,
  runCount: true,
});

export const insertAutomationRunSchema = createInsertSchema(automationRuns).omit({
  id: true,
  triggeredAt: true,
  completedAt: true,
});

export type Automation = typeof automations.$inferSelect;
export type InsertAutomation = z.infer<typeof insertAutomationSchema>;
export type AutomationRun = typeof automationRuns.$inferSelect;
export type InsertAutomationRun = z.infer<typeof insertAutomationRunSchema>;

// App Settings table - key/value store for configurable business settings
export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export type AppSetting = typeof appSettings.$inferSelect;
