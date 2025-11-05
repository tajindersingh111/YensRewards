import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin } from "./replitAuth";
import { insertCustomerSchema, insertTransactionSchema, insertPromotionSchema, insertProductSchema, insertMessageTemplateSchema } from "@shared/schema";
import { fromError } from "zod-validation-error";
import { sendSMS } from "./twilio";
import { sendEmail } from "./resend";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  await setupAuth(app);

  // Version endpoint for auto-update checking
  app.get('/api/version', (req, res) => {
    res.json({ version: 'v64' });
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log('🔑 Auth check - User ID:', userId);
      const user = await storage.getUser(userId);
      console.log('👤 User from DB:', JSON.stringify(user, null, 2));
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // ============ Customer API Endpoints ============
  
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
