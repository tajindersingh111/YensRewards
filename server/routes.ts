import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin } from "./replitAuth";
import { insertCustomerSchema, insertCustomerCSVSchema, insertTransactionSchema, insertPromotionSchema, insertProductSchema, insertMessageTemplateSchema, users } from "@shared/schema";
import { fromError } from "zod-validation-error";
import { sendSMS } from "./twilio";
import { sendEmail } from "./resend";
import { db } from "./db";
import { eq } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs/promises";

// Configure multer for file uploads to object storage
const publicDir = process.env.PUBLIC_OBJECT_SEARCH_PATHS?.split(',')[0] || '/tmp/public';
const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const uploadDir = path.join(publicDir, 'products');
      try {
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
      } catch (error: any) {
        cb(error, uploadDir);
      }
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}_${Math.round(Math.random() * 1E9)}`;
      cb(null, `product_${uniqueSuffix}${path.extname(file.originalname)}`);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  await setupAuth(app);

  // Version endpoint for auto-update checking
  app.get('/api/version', (req, res) => {
    res.json({ version: 'v94' });
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const email = req.user.claims.email;
      const isAdminClaim = req.user.claims.is_admin === true;
      const isTestMode = process.env.REPLIT_DEPLOYMENT === undefined; // True only in local/test, false in deployments
      
      console.log('🔑 Auth check - User ID:', userId, 'Email:', email, 'is_admin claim:', isAdminClaim, 'isTestMode:', isTestMode);
      let user = await storage.getUser(userId);
      console.log('👤 User from DB (initial):', JSON.stringify(user, null, 2));
      
      // If user doesn't exist, create them (can happen in OIDC test mode)
      if (!user) {
        console.log('⚠️  User not found, creating user from claims...');
        // Determine role: ONLY for NEW users in test mode, honor is_admin claim
        const roleForNewUser = (isTestMode && isAdminClaim) ? 'admin' : 'barista';
        
        user = await storage.upsertUser({
          id: userId,
          email: email || '',
          firstName: req.user.claims.first_name || '',
          lastName: req.user.claims.last_name || '',
          profileImageUrl: req.user.claims.profile_image_url || null,
          role: roleForNewUser,
        });
        console.log('✅ User created with role:', user.role, JSON.stringify(user, null, 2));
      } else if (isTestMode && isAdminClaim && user.role !== 'admin') {
        // In test mode only, upgrade existing users with is_admin claim to admin role
        console.log('⬆️  Upgrading existing user to admin (test mode + is_admin claim)');
        await db.update(users).set({ role: 'admin' }).where(eq(users.id, userId));
        user.role = 'admin';
        console.log('✅ User upgraded to admin:', JSON.stringify(user, null, 2));
      }
      // Note: Existing users WITHOUT is_admin claim keep their database role (no downgrade)
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // One-time admin promotion endpoint (protected by authentication + secret)
  app.post('/api/auth/promote-admin', isAuthenticated, async (req: any, res) => {
    try {
      const { secret } = req.body;
      const ADMIN_SECRET = process.env.ADMIN_PROMOTION_SECRET || 'yens-admin-2025';
      
      if (secret !== ADMIN_SECRET) {
        return res.status(403).json({ message: "Invalid secret" });
      }

      const userId = req.user.claims.sub;
      const email = req.user.claims.email;
      const firstName = req.user.claims.first_name || '';
      const lastName = req.user.claims.last_name || '';
      
      // First ensure the user exists (in case of OIDC test mode)
      await storage.upsertUser({
        id: userId,
        email,
        firstName,
        lastName,
        profileImageUrl: req.user.claims.profile_image_url || null,
      });
      
      // Then update the user's role to admin
      await db.update(users).set({ role: 'admin' }).where(eq(users.id, userId));
      
      console.log(`✅ Promoted user ${email} (${userId}) to admin`);
      
      res.json({ message: "Successfully promoted to admin", email, userId });
    } catch (error) {
      console.error("Error promoting to admin:", error);
      res.status(500).json({ message: "Failed to promote to admin" });
    }
  });

  // ============ Testing Endpoints (Admin Only) ============
  
  // Test SMS sending
  app.post('/api/admin/test-sms', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { phone, message } = req.body;
      
      if (!phone || !message) {
        return res.status(400).json({ message: "Phone and message are required" });
      }

      console.log(`📱 Testing SMS to ${phone}`);
      const result = await sendSMS(phone, message);
      
      if (result.success) {
        res.json({ 
          success: true, 
          messageId: result.messageId,
          message: "SMS sent successfully" 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: result.error || "Failed to send SMS" 
        });
      }
    } catch (error: any) {
      console.error("Error testing SMS:", error);
      res.status(500).json({ message: error.message || "Failed to send test SMS" });
    }
  });

  // Test email sending
  app.post('/api/admin/test-email', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { email, subject, message } = req.body;
      
      if (!email || !subject || !message) {
        return res.status(400).json({ message: "Email, subject, and message are required" });
      }

      console.log(`📧 Testing email to ${email}`);
      const result = await sendEmail(email, subject, message);
      
      if (result.success) {
        res.json({ 
          success: true, 
          messageId: result.messageId,
          message: "Email sent successfully" 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: result.error || "Failed to send email" 
        });
      }
    } catch (error: any) {
      console.error("Error testing email:", error);
      res.status(500).json({ message: error.message || "Failed to send test email" });
    }
  });

  // ============ Customer API Endpoints ============
  
  // Search customers by phone number (for Barista app)
  // IMPORTANT: This route must come BEFORE /api/customers/:id to avoid "search" being treated as an ID
  app.get('/api/customers/search', async (req, res) => {
    try {
      const query = req.query.q as string;
      
      // Validate query length
      if (!query || query.length < 3) {
        return res.status(400).json({ message: "Query must be at least 3 characters" });
      }
      
      const customers = await storage.searchCustomersByPhone(query, 10);
      res.json(customers);
    } catch (error) {
      console.error("Error searching customers:", error);
      res.status(500).json({ message: "Failed to search customers" });
    }
  });

  // Get customer by phone
  app.get('/api/customers/phone/:phone', async (req, res) => {
    try {
      const customer = await storage.getCustomerByPhone(req.params.phone);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({ message: "Failed to fetch customer" });
    }
  });

  // Get customer by referral code
  app.get('/api/customers/referral/:code', async (req, res) => {
    try {
      const customer = await storage.getCustomerByReferralCode(req.params.code);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({ message: "Failed to fetch customer" });
    }
  });

  // Get customer by ID
  app.get('/api/customers/:id', async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({ message: "Failed to fetch customer" });
    }
  });

  // Create customer
  app.post('/api/customers', async (req, res) => {
    try {
      const validatedData = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(validatedData);
      res.status(201).json(customer);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: fromError(error).toString() });
      }
      console.error("Error creating customer:", error);
      res.status(500).json({ message: "Failed to create customer" });
    }
  });

  // Update customer (Admin only)
  app.patch('/api/admin/customers/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const customer = await storage.updateCustomer(req.params.id, req.body);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error updating customer:", error);
      res.status(500).json({ message: "Failed to update customer" });
    }
  });

  // Get customer transactions
  app.get('/api/customers/:id/transactions', async (req, res) => {
    try {
      const transactions = await storage.getCustomerTransactions(req.params.id);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  // Get customer promotions with read status
  app.get('/api/customers/:id/promotions', async (req, res) => {
    try {
      const promotions = await storage.getCustomerPromotions(req.params.id);
      res.json(promotions);
    } catch (error) {
      console.error("Error fetching promotions:", error);
      res.status(500).json({ message: "Failed to fetch promotions" });
    }
  });

  // Get unread notification count
  app.get('/api/customers/:id/notifications/unread-count', async (req, res) => {
    try {
      const count = await storage.getUnreadCount(req.params.id);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  // Mark promotion as read
  app.post('/api/customers/:customerId/promotions/:promotionId/read', async (req, res) => {
    try {
      await storage.markAsRead(req.params.customerId, req.params.promotionId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking as read:", error);
      res.status(500).json({ message: "Failed to mark as read" });
    }
  });

  // Mark all promotions as read
  app.post('/api/customers/:id/promotions/read-all', async (req, res) => {
    try {
      await storage.markAllAsRead(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all as read:", error);
      res.status(500).json({ message: "Failed to mark all as read" });
    }
  });

  // ============ Barista API Endpoints ============

  // Create transaction (process purchase)
  // TODO: Add barista authentication in production
  app.post('/api/transactions', async (req, res) => {
    try {
      const validatedData = insertTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(validatedData);
      
      // Get updated customer data
      const customer = await storage.getCustomer(validatedData.customerId);
      
      res.status(201).json({ transaction, customer });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: fromError(error).toString() });
      }
      console.error("Error creating transaction:", error);
      res.status(500).json({ message: "Failed to create transaction" });
    }
  });

  // ============ Admin API Endpoints ============
  // All admin endpoints require authentication and admin role

  // Get analytics/KPIs
  app.get('/api/admin/analytics', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const analytics = await storage.getAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Get all customers
  app.get('/api/admin/customers', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const customers = await storage.getAllCustomers();
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  // Update customer
  app.patch('/api/admin/customers/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const customer = await storage.updateCustomer(req.params.id, req.body);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error updating customer:", error);
      res.status(500).json({ message: "Failed to update customer" });
    }
  });

  // Send direct message to customer
  app.post('/api/admin/customers/:id/message', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const customerId = req.params.id;
      const { message, subject, channel } = req.body;

      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      const customer = await storage.getCustomer(customerId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      const results: any = {
        inApp: null,
        sms: null,
        email: null,
      };

      // Send In-App notification if channel includes in-app
      if (channel && channel.includes('in-app')) {
        try {
          // Create a promotion for this message
          const promotion = await storage.createPromotion({
            title: subject || 'Direct Message',
            message: message,
            targetTier: null, // Direct messages are not tier-specific
          });

          // Create customer notification to link this customer to the promotion
          await storage.createNotification({
            customerId: customer.id,
            promotionId: promotion.id,
          });

          results.inApp = { success: true, promotionId: promotion.id };
          console.log(`✅ In-app message created for customer ${customer.name} (promotion ID: ${promotion.id})`);
        } catch (error: any) {
          console.error("Error creating in-app message:", error);
          results.inApp = { success: false, error: error.message };
        }
      }

      // Send SMS if channel includes sms
      if (channel && channel.includes('sms') && customer.phone) {
        try {
          const smsResult = await sendSMS(customer.phone, message);
          results.sms = smsResult;
          
          // Log SMS message
          await storage.createMessageLog({
            customerId: customer.id,
            channel: 'sms',
            recipient: customer.phone,
            subject: null,
            message,
            status: smsResult.success ? 'sent' : 'failed',
            externalId: smsResult.messageId || null,
            errorMessage: smsResult.error || null,
          });
        } catch (error: any) {
          console.error("Error sending SMS:", error);
          results.sms = { success: false, error: error.message };
        }
      }

      // Send Email if channel includes email
      if (channel && channel.includes('email') && customer.email) {
        try {
          const emailResult = await sendEmail(
            customer.email,
            subject || 'Message from Yens Thai Ice Cream',
            message
          );
          results.email = emailResult;

          // Log email message
          await storage.createMessageLog({
            customerId: customer.id,
            channel: 'email',
            recipient: customer.email,
            subject: subject || null,
            message,
            status: emailResult.success ? 'sent' : 'failed',
            externalId: emailResult.messageId || null,
            errorMessage: emailResult.error || null,
          });
        } catch (error: any) {
          console.error("Error sending email:", error);
          results.email = { success: false, error: error.message };
        }
      }

      // Check if at least one channel succeeded
      const success = results.inApp?.success || results.sms?.success || results.email?.success;
      
      if (!success) {
        return res.status(500).json({ 
          message: "Failed to send message via any channel",
          results 
        });
      }

      // Build success message based on which channels succeeded
      let successMessage = "Message sent successfully";
      const successChannels = [];
      if (results.inApp?.success) successChannels.push("in-app notification");
      if (results.sms?.success) successChannels.push("SMS");
      if (results.email?.success) successChannels.push("email");
      
      if (successChannels.length > 0) {
        successMessage = `Message sent via ${successChannels.join(", ")}`;
      }

      res.json({
        message: successMessage,
        results,
      });
    } catch (error) {
      console.error("Error sending message to customer:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Import customers from CSV
  app.post('/api/admin/import-customers', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { customers } = req.body;
      
      if (!Array.isArray(customers) || customers.length === 0) {
        return res.status(400).json({ message: "Invalid customer data" });
      }
      
      let imported = 0;
      let skipped = 0;
      
      for (const customerData of customers) {
        try {
          // Check if customer already exists by phone
          const existing = await storage.getCustomerByPhone(customerData.phone);
          if (existing) {
            skipped++;
            continue;
          }
          
          // Validate and create customer
          const validatedData = insertCustomerSchema.parse(customerData);
          await storage.createCustomer(validatedData);
          imported++;
        } catch (error) {
          console.error("Error importing customer:", error);
          skipped++;
        }
      }
      
      res.json({ 
        imported, 
        skipped, 
        total: customers.length,
        message: `Successfully imported ${imported} customers, skipped ${skipped}` 
      });
    } catch (error) {
      console.error("Error importing customers:", error);
      res.status(500).json({ message: "Failed to import customers" });
    }
  });

  // Filter customers with advanced criteria
  app.post('/api/admin/customers/filter', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const filters = req.body;
      const customers = await storage.getFilteredCustomers(filters);
      res.json(customers);
    } catch (error) {
      console.error("Error filtering customers:", error);
      res.status(500).json({ message: "Failed to filter customers" });
    }
  });

  // Send bulk message to multiple customers
  app.post('/api/admin/customers/bulk-message', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { customerIds, message, subject, channel } = req.body;

      if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
        return res.status(400).json({ message: "Customer IDs required" });
      }

      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      if (!channel || !['sms', 'email', 'both'].includes(channel)) {
        return res.status(400).json({ message: "Valid channel required (sms, email, or both)" });
      }

      // Get all customers
      const customers = await Promise.all(
        customerIds.map(id => storage.getCustomer(id))
      );

      const validCustomers = customers.filter(c => c !== undefined);

      if (validCustomers.length === 0) {
        return res.status(404).json({ message: "No valid customers found" });
      }

      let smsSent = 0;
      let smsFailures = 0;
      let emailsSent = 0;
      let emailFailures = 0;

      // Send messages to each customer
      for (const customer of validCustomers) {
        if (!customer) continue;

        // Replace placeholders in message
        const personalizedMessage = message
          .replace(/{name}/g, customer.name)
          .replace(/{points}/g, customer.points.toString())
          .replace(/{tier}/g, customer.tier);

        const personalizedSubject = subject
          ? subject
              .replace(/{name}/g, customer.name)
              .replace(/{points}/g, customer.points.toString())
              .replace(/{tier}/g, customer.tier)
          : 'Message from Yens Thai Ice Cream';

        // Send SMS if channel is sms or both
        if ((channel === 'sms' || channel === 'both') && customer.phone) {
          try {
            const smsResult = await sendSMS(customer.phone, personalizedMessage);
            
            if (smsResult.success) {
              smsSent++;
            } else {
              smsFailures++;
            }

            // Log SMS message
            await storage.createMessageLog({
              customerId: customer.id,
              channel: 'sms',
              recipient: customer.phone,
              subject: null,
              message: personalizedMessage,
              status: smsResult.success ? 'sent' : 'failed',
              externalId: smsResult.messageId || null,
              errorMessage: smsResult.error || null,
            });
          } catch (error: any) {
            console.error(`Error sending SMS to ${customer.phone}:`, error);
            smsFailures++;
          }
        }

        // Send Email if channel is email or both
        if ((channel === 'email' || channel === 'both') && customer.email) {
          try {
            const emailResult = await sendEmail(
              customer.email,
              personalizedSubject,
              personalizedMessage
            );

            if (emailResult.success) {
              emailsSent++;
            } else {
              emailFailures++;
            }

            // Log email message
            await storage.createMessageLog({
              customerId: customer.id,
              channel: 'email',
              recipient: customer.email,
              subject: personalizedSubject,
              message: personalizedMessage,
              status: emailResult.success ? 'sent' : 'failed',
              externalId: emailResult.messageId || null,
              errorMessage: emailResult.error || null,
            });
          } catch (error: any) {
            console.error(`Error sending email to ${customer.email}:`, error);
            emailFailures++;
          }
        }
      }

      res.json({
        message: "Bulk messaging complete",
        totalCustomers: validCustomers.length,
        sms: {
          sent: smsSent,
          failed: smsFailures,
        },
        email: {
          sent: emailsSent,
          failed: emailFailures,
        },
      });
    } catch (error) {
      console.error("Error sending bulk messages:", error);
      res.status(500).json({ message: "Failed to send bulk messages" });
    }
  });

  // Create promotion
  app.post('/api/admin/promotions', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const validatedData = insertPromotionSchema.parse(req.body);
      const promotion = await storage.createPromotion(validatedData);
      res.status(201).json(promotion);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: fromError(error).toString() });
      }
      console.error("Error creating promotion:", error);
      res.status(500).json({ message: "Failed to create promotion" });
    }
  });

  // Get all promotions
  app.get('/api/admin/promotions', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const promotions = await storage.getAllPromotions();
      res.json(promotions);
    } catch (error) {
      console.error("Error fetching promotions:", error);
      res.status(500).json({ message: "Failed to fetch promotions" });
    }
  });

  // ============ Product API Endpoints ============
  
  // Get all products
  app.get('/api/products', async (req, res) => {
    try {
      const products = await storage.getAllProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  // Get product by ID
  app.get('/api/products/:id', async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  // Get products by category
  app.get('/api/products/category/:category', async (req, res) => {
    try {
      const products = await storage.getProductsByCategory(req.params.category);
      res.json(products);
    } catch (error) {
      console.error("Error fetching products by category:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  // Create product (admin only)
  app.post('/api/admin/products', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const validatedData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(validatedData);
      res.status(201).json(product);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: fromError(error).toString() });
      }
      console.error("Error creating product:", error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  // Update product (admin only)
  app.patch('/api/admin/products/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const product = await storage.updateProduct(req.params.id, req.body);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  // Delete product (admin only)
  app.delete('/api/admin/products/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      await storage.deleteProduct(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Bulk import products from CSV
  app.post('/api/admin/products/import', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { products } = req.body;
      
      if (!Array.isArray(products) || products.length === 0) {
        return res.status(400).json({ message: "Products array is required" });
      }

      const imported = [];
      const errors = [];

      for (const product of products) {
        try {
          const validatedData = insertProductSchema.parse(product);
          const created = await storage.createProduct(validatedData as any);
          imported.push(created);
        } catch (error: any) {
          errors.push({
            product: product.name || 'Unknown',
            error: error.message,
          });
        }
      }

      res.json({
        success: true,
        imported: imported.length,
        errors: errors.length,
        details: errors,
      });
    } catch (error) {
      console.error("Error importing products:", error);
      res.status(500).json({ message: "Failed to import products" });
    }
  });

  // Upload product image (admin only)
  app.post('/api/admin/upload-product-image', isAuthenticated, isAdmin, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Generate public URL for the uploaded file
      const filename = req.file.filename;
      const publicUrl = `/products/${filename}`;

      res.json({ url: publicUrl });
    } catch (error) {
      console.error("Error uploading product image:", error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  // Import customers from CSV (admin only)
  app.post('/api/admin/customers/import', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { customers: customerData } = req.body;
      
      if (!Array.isArray(customerData) || customerData.length === 0) {
        return res.status(400).json({ message: "Customers array is required" });
      }

      const imported = [];
      const updated = [];
      const errors = [];

      for (let i = 0; i < customerData.length; i++) {
        const customer = customerData[i];
        try {
          // Validate against Zod schema first
          const validationResult = insertCustomerCSVSchema.safeParse(customer);
          
          if (!validationResult.success) {
            const errorMessages = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
            throw new Error(`Validation failed: ${errorMessages}`);
          }

          const validData = validationResult.data;

          // Normalize customer data with proper defaults
          const normalized: any = {
            name: validData.name.trim(),
            phone: validData.phone.trim(),
          };

          // Optional fields from validated data
          if (validData.email?.trim()) normalized.email = validData.email.trim();
          if (validData.gender?.trim()) normalized.gender = validData.gender.trim();
          
          // Normalize birthday to MM-DD format (month-day only)
          if (validData.birthday?.trim()) {
            try {
              const birthdayStr = validData.birthday.trim();
              let month: number;
              let day: number;
              let year: number | null = null;
              
              // Handle DD/MM/YYYY format (Thai format with /)
              if (birthdayStr.includes('/')) {
                const parts = birthdayStr.split('/');
                if (parts.length === 3) {
                  day = parseInt(parts[0]);
                  month = parseInt(parts[1]);
                  year = parseInt(parts[2]);
                } else {
                  throw new Error(`Invalid birthday format: ${birthdayStr}`);
                }
              }
              // Handle MM-DD or YYYY-MM-DD format (with -)
              else if (birthdayStr.includes('-')) {
                const parts = birthdayStr.split('-');
                if (parts.length === 2) {
                  // MM-DD format - already normalized
                  month = parseInt(parts[0]);
                  day = parseInt(parts[1]);
                } else if (parts.length === 3) {
                  // YYYY-MM-DD format
                  year = parseInt(parts[0]);
                  month = parseInt(parts[1]);
                  day = parseInt(parts[2]);
                } else {
                  throw new Error(`Invalid birthday format: ${birthdayStr}`);
                }
              } else {
                throw new Error(`Invalid birthday format: ${birthdayStr}`);
              }
              
              // Validate month and day ranges
              if (isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
                throw new Error(`Invalid month/day values: ${birthdayStr}`);
              }
              
              // Handle Thai Buddhist Era (B.E.) years - convert to Gregorian
              const currentYear = new Date().getFullYear();
              if (year !== null && !isNaN(year) && year > currentYear + 100) {
                // Likely Buddhist Era year (B.E. = C.E. + 543)
                year = year - 543;
              }
              
              // Filter out future dates (invalid birthdays from CSV import errors)
              if (year !== null && !isNaN(year)) {
                const birthDate = new Date(year, month - 1, day);
                const today = new Date();
                if (birthDate > today) {
                  throw new Error(`Birthday cannot be in the future: ${birthdayStr}`);
                }
              }
              
              // Normalize to MM-DD format (zero-padded)
              const monthStr = month.toString().padStart(2, '0');
              const dayStr = day.toString().padStart(2, '0');
              normalized.birthday = `${monthStr}-${dayStr}`;
            } catch (e: any) {
              console.warn(`Invalid birthday for ${validData.phone}:`, e.message);
              // Skip invalid birthday - don't store it
            }
          }
          
          if (validData.tag?.trim()) normalized.tag = validData.tag.trim();
          if (validData.lineUid?.trim()) normalized.lineUid = validData.lineUid.trim();
          if (validData.registerBranch?.trim()) normalized.registerBranch = validData.registerBranch.trim();

          // Parse numeric fields (points must be whole numbers - database column is INTEGER)
          if (validData.points !== undefined && validData.points.trim()) {
            const pointsNum = Number(validData.points.trim());
            if (Number.isFinite(pointsNum) && Number.isInteger(pointsNum)) {
              normalized.points = pointsNum;
            } else if (Number.isFinite(pointsNum)) {
              // Fractional points detected - reject row
              throw new Error(`Points must be a whole number, got: "${validData.points}"`);
            } else {
              throw new Error(`Invalid points value: "${validData.points}"`);
            }
          }

          // Convert totalSpent to decimal string
          if (validData.totalSpent?.trim()) {
            const cleanedSpend = validData.totalSpent.replace(/,/g, '');
            const spendNum = parseFloat(cleanedSpend);
            if (!isNaN(spendNum)) {
              normalized.totalSpent = spendNum.toFixed(2);
            }
          }

          // Normalize tier (case insensitive)
          if (validData.tier?.trim()) {
            normalized.tier = validData.tier.toLowerCase().trim();
          }

          // Parse dates (DD/MM/YYYY format to UTC Date)
          if (validData.registerDate?.trim()) {
            try {
              const parts = validData.registerDate.split(/[\/\s]/);
              if (parts.length >= 3) {
                const day = parseInt(parts[0]);
                const month = parseInt(parts[1]);
                const year = parseInt(parts[2]);
                // Use Date.UTC to create consistent dates
                const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
                if (!isNaN(date.getTime())) {
                  normalized.registerDate = date;
                }
              }
            } catch (e) {
              console.warn(`Invalid registerDate for ${validData.phone}:`, validData.registerDate);
            }
          }

          if (validData.lastUse?.trim()) {
            try {
              const parts = validData.lastUse.split(/[\/\s]/);
              if (parts.length >= 3) {
                const day = parseInt(parts[0]);
                const month = parseInt(parts[1]);
                const year = parseInt(parts[2]);
                let hour = 0;
                let minute = 0;
                
                if (parts.length > 3 && parts[3].includes(':')) {
                  const timeParts = parts[3].split(':');
                  hour = parseInt(timeParts[0]) || 0;
                  minute = parseInt(timeParts[1]) || 0;
                }
                
                // Use Date.UTC for consistent parsing
                const date = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
                if (!isNaN(date.getTime())) {
                  normalized.lastUse = date;
                }
              }
            } catch (e) {
              console.warn(`Invalid lastUse for ${validData.phone}:`, validData.lastUse);
            }
          }

          // Upsert customer by phone
          const result = await storage.upsertCustomerByPhone(normalized);
          
          if (result.action === 'insert') {
            imported.push(result.customer);
          } else {
            updated.push(result.customer);
          }
        } catch (error: any) {
          errors.push({
            row: i + 1,
            phone: customer.phone || 'Unknown',
            name: customer.name || 'Unknown',
            error: error.message,
          });
          console.error(`Error importing customer row ${i + 1}:`, error.message);
        }
      }

      res.json({
        success: true,
        imported: imported.length,
        updated: updated.length,
        failed: errors.length,
        total: customerData.length,
        errors,
      });
    } catch (error) {
      console.error("Error importing customers:", error);
      res.status(500).json({ message: "Failed to import customers" });
    }
  });

  // Bulk delete customers (admin only)
  app.post('/api/admin/customers/bulk-delete', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { filter, reason, confirmPhrase } = req.body;

      // Validate confirm phrase
      if (confirmPhrase !== "DELETE") {
        return res.status(422).json({ message: "Invalid confirmation phrase. Type 'DELETE' to confirm." });
      }

      // Validate filter
      if (!filter || typeof filter !== 'object') {
        return res.status(400).json({ message: "Filter is required" });
      }

      // Keep dates as ISO strings - storage layer handles UTC parsing
      const deleteFilter: any = {};
      if (filter.createdAfter) {
        deleteFilter.createdAfter = filter.createdAfter; // Keep as ISO string
      }
      if (filter.createdBefore) {
        deleteFilter.createdBefore = filter.createdBefore; // Keep as ISO string
      }
      if (filter.tags && Array.isArray(filter.tags)) {
        deleteFilter.tags = filter.tags;
      }
      if (filter.hasZeroTotals !== undefined) {
        deleteFilter.hasZeroTotals = filter.hasZeroTotals;
      }

      // Perform bulk delete
      const result = await storage.bulkDeleteCustomers(deleteFilter);

      if (result.deletedCount === 0) {
        return res.status(404).json({ message: "No customers matched the filter criteria" });
      }

      // Log the deletion for audit
      const userId = (req.user as any)?.email || 'unknown';
      console.log(`Bulk delete by admin ${userId}: ${result.deletedCount} customers deleted. Reason: ${reason || 'Not provided'}`);

      res.json({
        success: true,
        deletedCount: result.deletedCount,
        message: `Successfully deleted ${result.deletedCount} customer(s)`,
      });
    } catch (error) {
      console.error("Error bulk deleting customers:", error);
      res.status(500).json({ message: "Failed to delete customers" });
    }
  });

  // ============ Message Template API Endpoints (Admin Only) ============
  
  // Get all message templates
  app.get('/api/admin/message-templates', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const templates = await storage.getAllMessageTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  // Get templates by type
  app.get('/api/admin/message-templates/type/:type', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const templates = await storage.getMessageTemplatesByType(req.params.type);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  // Get default template for a type
  app.get('/api/admin/message-templates/default/:type', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const template = await storage.getDefaultMessageTemplate(req.params.type);
      if (!template) {
        return res.status(404).json({ message: "No default template found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching default template:", error);
      res.status(500).json({ message: "Failed to fetch default template" });
    }
  });

  // Create message template
  app.post('/api/admin/message-templates', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const validatedData = insertMessageTemplateSchema.parse(req.body);
      const template = await storage.createMessageTemplate(validatedData);
      res.status(201).json(template);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: fromError(error).toString() });
      }
      console.error("Error creating template:", error);
      res.status(500).json({ message: "Failed to create template" });
    }
  });

  // Update message template
  app.patch('/api/admin/message-templates/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const template = await storage.updateMessageTemplate(req.params.id, req.body);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error updating template:", error);
      res.status(500).json({ message: "Failed to update template" });
    }
  });

  // Delete message template
  app.delete('/api/admin/message-templates/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      await storage.deleteMessageTemplate(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting template:", error);
      res.status(500).json({ message: "Failed to delete template" });
    }
  });

  // ============ Birthday Message Sending Endpoints (Admin Only) ============
  
  // Send birthday messages to specific customers
  app.post('/api/admin/send-birthday-messages', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { customerIds, templateId } = req.body;
      
      if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
        return res.status(400).json({ message: "Customer IDs required" });
      }

      // Get template
      let template;
      if (templateId) {
        template = await storage.getMessageTemplate(templateId);
      } else {
        template = await storage.getDefaultMessageTemplate('birthday');
      }

      if (!template) {
        return res.status(404).json({ message: "No birthday template found" });
      }

      // Get customers and send messages
      const customers = await Promise.all(
        customerIds.map(id => storage.getCustomer(id))
      );

      const results = await Promise.all(
        customers
          .filter(customer => customer !== undefined)
          .map(async (customer) => {
            if (!customer) return null;
            
            // Replace placeholders in template
            const personalizedMessage = template.message
              .replace(/{name}/g, customer.name)
              .replace(/{points}/g, customer.points.toString())
              .replace(/{tier}/g, customer.tier);

            const personalizedSubject = template.subject
              ? template.subject
                  .replace(/{name}/g, customer.name)
                  .replace(/{points}/g, customer.points.toString())
                  .replace(/{tier}/g, customer.tier)
              : null;

            // Send via SMS if channel includes SMS
            let smsResult = null;
            if (template.channel === 'sms' || template.channel === 'both') {
              if (customer.phone) {
                smsResult = await sendSMS(customer.phone, personalizedMessage);
                
                // Log the SMS message
                await storage.createMessageLog({
                  customerId: customer.id,
                  templateId: template.id,
                  channel: 'sms',
                  recipient: customer.phone,
                  subject: null,
                  message: personalizedMessage,
                  status: smsResult.success ? 'sent' : 'failed',
                  externalId: smsResult.messageId || null,
                  errorMessage: smsResult.error || null,
                });
              }
            }

            // Send via Email if channel includes Email
            let emailResult = null;
            if (template.channel === 'email' || template.channel === 'both') {
              if (customer.email && personalizedSubject) {
                emailResult = await sendEmail(customer.email, personalizedSubject, personalizedMessage);
                
                // Log the email message
                await storage.createMessageLog({
                  customerId: customer.id,
                  templateId: template.id,
                  channel: 'email',
                  recipient: customer.email,
                  subject: personalizedSubject,
                  message: personalizedMessage,
                  status: emailResult.success ? 'sent' : 'failed',
                  externalId: emailResult.messageId || null,
                  errorMessage: emailResult.error || null,
                });
              }
            }

            return {
              customerId: customer.id,
              name: customer.name,
              phone: customer.phone,
              email: customer.email,
              smsResult,
              emailResult,
              success: (smsResult?.success || template.channel !== 'sms') && (emailResult === null || template.channel !== 'email')
            };
          })
      );

      const filteredResults = results.filter(r => r !== null);
      const successCount = filteredResults.filter(r => r.success).length;

      res.json({
        message: `Messages sent to ${successCount}/${filteredResults.length} customers`,
        sent: successCount,
        total: filteredResults.length,
        details: filteredResults
      });
    } catch (error) {
      console.error("Error sending birthday messages:", error);
      res.status(500).json({ message: "Failed to send birthday messages" });
    }
  });

  // Get all message logs (admin only)
  app.get('/api/admin/messages', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const logs = await storage.getMessageLogs();
      
      // Enrich with customer names
      const enrichedLogs = await Promise.all(
        logs.map(async (log) => {
          const customer = await storage.getCustomer(log.customerId);
          return {
            ...log,
            customerName: customer?.name || 'Unknown',
          };
        })
      );

      res.json(enrichedLogs);
    } catch (error) {
      console.error("Error fetching message logs:", error);
      res.status(500).json({ message: "Failed to fetch message logs" });
    }
  });

  // Get message statistics (admin only)
  app.get('/api/admin/messages/stats', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const logs = await storage.getMessageLogs();
      
      const stats = {
        total: logs.length,
        sent: logs.filter(l => l.status === 'sent').length,
        delivered: logs.filter(l => l.status === 'delivered').length,
        failed: logs.filter(l => l.status === 'failed').length,
        pending: logs.filter(l => l.status === 'pending').length,
        smsCount: logs.filter(l => l.channel === 'sms').length,
        emailCount: logs.filter(l => l.channel === 'email').length,
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching message stats:", error);
      res.status(500).json({ message: "Failed to fetch message stats" });
    }
  });

  // Retry failed message (admin only)
  app.post('/api/admin/messages/:id/retry', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const logs = await storage.getMessageLogs();
      const messageLog = logs.find(l => l.id === id);

      if (!messageLog) {
        res.status(404).json({ message: "Message not found" });
        return;
      }

      if (messageLog.status !== 'failed') {
        res.status(400).json({ message: "Only failed messages can be retried" });
        return;
      }

      // Reset to pending and clear error
      await storage.updateMessageLogStatus(id, 'pending', undefined, undefined);

      // If SMS, attempt to resend immediately
      if (messageLog.channel === 'sms') {
        try {
          const twilioResult = await sendSMS(messageLog.recipient, messageLog.message);
          
          if (twilioResult.success && twilioResult.messageId) {
            await storage.updateMessageLogStatus(
              id,
              'sent',
              twilioResult.messageId,
              undefined
            );
          } else {
            await storage.updateMessageLogStatus(
              id,
              'failed',
              undefined,
              twilioResult.error || 'Unknown error'
            );
          }
        } catch (error) {
          await storage.updateMessageLogStatus(
            id,
            'failed',
            undefined,
            error instanceof Error ? error.message : 'Failed to send SMS'
          );
        }
      }

      // If email, attempt to resend immediately
      if (messageLog.channel === 'email') {
        try {
          const subject = messageLog.subject || 'Message from Yens Thai Ice Cream';
          const emailResult = await sendEmail(messageLog.recipient, subject, messageLog.message);
          
          if (emailResult.success && emailResult.messageId) {
            await storage.updateMessageLogStatus(
              id,
              'sent',
              emailResult.messageId,
              undefined
            );
          } else {
            await storage.updateMessageLogStatus(
              id,
              'failed',
              undefined,
              emailResult.error || 'Unknown error'
            );
          }
        } catch (error) {
          await storage.updateMessageLogStatus(
            id,
            'failed',
            undefined,
            error instanceof Error ? error.message : 'Failed to send email'
          );
        }
      }

      res.json({ message: "Message retry initiated" });
    } catch (error) {
      console.error("Error retrying message:", error);
      res.status(500).json({ message: "Failed to retry message" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
