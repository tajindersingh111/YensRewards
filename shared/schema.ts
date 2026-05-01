import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, serial, timestamp, decimal, boolean, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
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

// Staff users table for Replit Auth (baristas, managers, and admins)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: text("role").notNull().default("barista"), // barista, manager, or admin
  location: text("location"), // for baristas/managers
  password: varchar("password"), // bcrypt hashed password (nullable - optional auth method)
  twoFactorSecret: varchar("two_factor_secret"), // TOTP secret for 2FA (nullable)
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true), // Admin can disable access remotely
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
  baristaId: varchar("barista_id").references(() => users.id), // Track which barista processed
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  points: integer("points").notNull(),
  location: text("location").notNull(),
  receiptUrl: text("receipt_url"),
  type: text("type").notNull().default("purchase"), // purchase, reward, birthday_bonus, referral
  includedSpecialOffer: boolean("included_special_offer").notNull().default(false), // Did barista sell weekly special?
  isNewCustomer: boolean("is_new_customer").notNull().default(false), // Was this a new customer signup?
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
  promoFocus: boolean("promo_focus").notNull().default(false), // Highlight as promotional focus
  available: boolean("available").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Message Templates table - for birthday and promotional SMS/email/LINE messages
export const messageTemplates = pgTable("message_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateKey: text("template_key").unique(), // Unique key for lookup: email_welcome, line_birthday, etc.
  name: text("name").notNull(),
  type: text("type").notNull(), // welcome, birthday, promotion, points_update, tier_status, line_invite, account_linked
  channel: text("channel").notNull(), // sms, email, line
  subject: text("subject"), // Email subject (null for SMS/LINE)
  message: text("message").notNull(), // Plain text template with placeholders: {{name}}, {{points}}, {{tier}}
  htmlContent: text("html_content"), // HTML content for email templates
  jsonContent: text("json_content"), // JSON Flex Message content for LINE templates
  variables: text("variables").array(), // List of available placeholders: ["customerName", "points", "tier"]
  isDefault: boolean("is_default").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Message Log table - tracks all sent messages
export const messageLog = pgTable("message_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  templateId: varchar("template_id").references(() => messageTemplates.id),
  channel: text("channel").notNull(), // sms, email, line, app
  recipient: text("recipient").notNull(), // phone, email, or LINE UID
  subject: text("subject"), // Email subject (null for SMS/LINE)
  message: text("message").notNull(),
  status: text("status").notNull().default("pending"), // pending, sent, failed, delivered
  externalId: text("external_id"), // Twilio SID, email provider ID, or LINE message ID
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Scheduled Messages table - for sending messages at a specific time
export const scheduledMessages = pgTable("scheduled_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  channel: text("channel").notNull(), // sms, email, line
  recipientType: text("recipient_type").notNull(), // all, tier, individual, birthday_today, birthday_week
  recipientTier: text("recipient_tier"), // bronze, silver, gold, platinum (when recipientType is 'tier')
  recipientIds: text("recipient_ids").array(), // Customer IDs (when recipientType is 'individual')
  templateId: varchar("template_id").references(() => messageTemplates.id),
  subject: text("subject"), // Email subject
  message: text("message").notNull(), // Message content (HTML for email)
  scheduledFor: timestamp("scheduled_for").notNull(), // When to send (UTC)
  timezone: text("timezone").notNull().default("Asia/Bangkok"), // User's timezone for display
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed, cancelled
  processingStartedAt: timestamp("processing_started_at"), // For idempotency/lock
  sentCount: integer("sent_count").default(0),
  failedCount: integer("failed_count").default(0),
  errorMessage: text("error_message"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Automations table - automated message rules triggered by schedule or events
export const automations = pgTable("automations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  triggerType: text("trigger_type").notNull(), // 'recurring_daily', 'recurring_weekly', 'recurring_monthly', 'one_time'
  triggerConfig: jsonb("trigger_config").notNull().$type<{ time?: string; dayOfWeek?: string; dayOfMonth?: number; date?: string }>(),
  customerFilter: text("customer_filter").notNull().default("all"), // 'all', 'tier_bronze', 'tier_silver', 'tier_gold', 'tier_platinum', 'birthday_today', 'inactive_30d', 'inactive_60d'
  channel: text("channel").notNull(), // 'email', 'sms', 'line', 'app'
  templateId: varchar("template_id").references(() => messageTemplates.id),
  subject: text("subject"),
  message: text("message").notNull(),
  nextRunAt: timestamp("next_run_at"),
  lastRunAt: timestamp("last_run_at"),
  runCount: integer("run_count").notNull().default(0),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Automation Runs table - execution history log for each automation
export const automationRuns = pgTable("automation_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  automationId: varchar("automation_id").notNull().references(() => automations.id, { onDelete: 'cascade' }),
  triggeredAt: timestamp("triggered_at").notNull().defaultNow(),
  status: text("status").notNull().default("running"), // 'running', 'completed', 'failed'
  sentCount: integer("sent_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  errorMessage: text("error_message"),
  completedAt: timestamp("completed_at"),
});

// Sites table - physical locations/stalls where Yens products are sold
export const sites = pgTable("sites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // Site name (e.g., "Central Plaza Stall", "Mobile Van #1")
  channelName: text("channel_name").notNull(), // Sales channel identifier (e.g., "SHOP", "RIVER", "GRAB")
  type: text("type").notNull(), // "stall" or "mobile_van"
  location: text("location").notNull(), // Address or area description
  operatingDays: text("operating_days").array(), // ["monday", "tuesday", etc.]
  openTime: text("open_time"), // "09:00"
  closeTime: text("close_time"), // "18:00"
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"), // For ad-hoc sites or special instructions
  managerId: varchar("manager_id").references(() => users.id), // Optional: assigned manager
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Time Entries table - tracks barista clock in/out times
export const timeEntries = pgTable("time_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id), // Barista who clocked in
  siteId: varchar("site_id").notNull().references(() => sites.id), // Location where they're working
  date: text("date").notNull(), // YYYY-MM-DD format
  clockInTime: timestamp("clock_in_time").notNull(), // When they clocked in
  clockOutTime: timestamp("clock_out_time"), // When they clocked out (null if still clocked in)
  notes: text("notes"), // Optional notes
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Work Schedules table - barista work schedules
// Weekly schedule series configuration
export const workScheduleSeries = pgTable("work_schedule_series", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id), // Barista for this series
  siteId: varchar("site_id").notNull().references(() => sites.id), // Location for this series
  weekStartDate: text("week_start_date").notNull(), // ISO date of Monday starting the series (YYYY-MM-DD)
  daysOfWeek: text("days_of_week").array().notNull(), // e.g., ['monday', 'wednesday', 'friday']
  repeatWeeks: integer("repeat_weeks").notNull().default(1), // Number of weeks to repeat (1, 2, 4, 8, 12)
  startTime: text("start_time").notNull(), // HH:MM format
  endTime: text("end_time").notNull(), // HH:MM format
  notes: text("notes"), // Optional notes for the series
  createdBy: varchar("created_by").references(() => users.id), // Admin who created this series
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Individual work schedule occurrences
export const workSchedules = pgTable("work_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id), // Barista assigned to shift
  siteId: varchar("site_id").notNull().references(() => sites.id), // Location of shift
  scheduledDate: text("scheduled_date").notNull(), // YYYY-MM-DD format
  startTime: text("start_time").notNull(), // HH:MM format (e.g., "09:00")
  endTime: text("end_time").notNull(), // HH:MM format (e.g., "17:00")
  notes: text("notes"), // Optional shift notes
  seriesId: varchar("series_id").references(() => workScheduleSeries.id), // Link to parent series (null for single-day schedules)
  occurrenceIndex: integer("occurrence_index"), // Index within series (null for single-day schedules)
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Barista Announcements table - promotions and notices for baristas
export const baristaAnnouncements = pgTable("barista_announcements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(), // Announcement title
  content: text("content").notNull(), // Announcement body
  type: text("type").notNull().default("general"), // general, promotion, incentive, policy
  isActive: boolean("is_active").notNull().default(true), // Show/hide announcement
  priority: integer("priority").notNull().default(0), // Higher priority shows first
  expiresAt: timestamp("expires_at"), // Optional expiry date
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Weekly Specials table - featured promotions for baristas to push
export const weeklySpecials = pgTable("weekly_specials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(), // e.g., "Mango Sticky Rice Sundae"
  description: text("description").notNull(), // What makes it special
  productId: varchar("product_id").references(() => products.id), // Optional link to product
  imageUrl: text("image_url"), // Optional image
  bonusPoints: integer("bonus_points").notNull().default(5), // Extra points for barista when sold
  startDate: text("start_date").notNull(), // YYYY-MM-DD
  endDate: text("end_date").notNull(), // YYYY-MM-DD
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Barista Performance table - tracks weekly/monthly performance
export const baristaPerformance = pgTable("barista_performance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  weekStart: text("week_start").notNull(), // YYYY-MM-DD (Monday of week)
  transactionCount: integer("transaction_count").notNull().default(0), // # transactions completed
  specialOffersSold: integer("special_offers_sold").notNull().default(0), // # weekly specials sold
  newCustomerSignups: integer("new_customer_signups").notNull().default(0), // # new customers registered
  totalPoints: integer("total_points").notNull().default(0), // Total points earned this week
  weeklyRank: integer("weekly_rank"), // Ranking among all baristas (1 = first place)
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  // Unique constraint for atomic upserts - prevents race conditions
  userWeekUnique: uniqueIndex("barista_performance_user_week_unique").on(table.userId, table.weekStart),
}));

// Daily Sales table - tracks sales by site from Excel imports
export const dailySales = pgTable("daily_sales", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: text("date").notNull(), // YYYY-MM-DD
  dayOfWeek: text("day_of_week").notNull(), // Sun, Mon, Tue, Wed, Thu, Fri, Sat
  orderChannel: text("order_channel").notNull(), // Shop, Supalai, Balloon, Box, River, Army, Lamp, etc.
  netSales: decimal("net_sales", { precision: 10, scale: 2 }).notNull(), // Sales before fees
  otherSales: decimal("other_sales", { precision: 10, scale: 2 }).default("0"), // Other revenue (e.g., tips, delivery)
  otherSalesNote: text("other_sales_note"), // Optional note/reference for other sales (e.g., "Catering", "Tips")
  grabFee: decimal("grab_fee", { precision: 10, scale: 2 }).default("0"), // Delivery platform fees
  totalSales: decimal("total_sales", { precision: 10, scale: 2 }).notNull(), // Total sales
  importedBy: varchar("imported_by").references(() => users.id), // Admin who imported
  importedAt: timestamp("imported_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
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

// Customer Reviews table - store customer feedback and ratings
export const customerReviews = pgTable("customer_reviews", {
  id: serial("id").primaryKey(), // Auto-increment serial
  customerId: varchar("customer_id").references(() => customers.id).notNull(),
  rating: integer("rating").notNull(), // 1-5 stars
  feedbackTags: text("feedback_tags").array(), // ["delicious", "fast_service", "good_value", etc.]
  comment: text("comment"), // Optional free-form comment (max 500 chars)
  googlePlaceId: text("google_place_id"), // Google Place ID for the review
  syncedToGoogle: boolean("synced_to_google").notNull().default(false), // Tracking if synced
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCustomerReviewSchema = createInsertSchema(customerReviews).omit({
  id: true,
  createdAt: true,
  syncedToGoogle: true,
});

export type CustomerReview = typeof customerReviews.$inferSelect;
export type InsertCustomerReview = z.infer<typeof insertCustomerReviewSchema>;

// LINE Linking Codes table - persistent storage for linking codes
export const lineLinkingCodes = pgTable("line_linking_codes", {
  code: varchar("code", { length: 10 }).primaryKey(), // e.g., LINK-ABCD
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
});

export const insertLineLinkingCodeSchema = createInsertSchema(lineLinkingCodes).omit({ createdAt: true });
export type LineLinkingCode = typeof lineLinkingCodes.$inferSelect;
export type InsertLineLinkingCode = z.infer<typeof insertLineLinkingCodeSchema>;

// Shop Events table - calendar events for planning (expos, promotions, meetings, etc.)
export const shopEvents = pgTable("shop_events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull().default("event"), // event, expo, promotion, holiday, meeting, catering, other
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  allDay: boolean("all_day").notNull().default(false),
  location: text("location"),
  notes: text("notes"),
  color: text("color"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
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
