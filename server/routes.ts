import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertCustomerSchema, insertTransactionSchema, insertPromotionSchema, insertProductSchema } from "@shared/schema";
import { fromError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  await setupAuth(app);

  // Version endpoint for auto-update checking
  app.get('/api/version', (req, res) => {
    res.json({ version: 'v62' });
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
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

  // Get analytics/KPIs
  // TODO: Add admin authentication in production
  app.get('/api/admin/analytics', async (req, res) => {
    try {
      const analytics = await storage.getAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Get all customers
  // TODO: Add admin authentication in production
  app.get('/api/admin/customers', async (req, res) => {
    try {
      const customers = await storage.getAllCustomers();
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  // Update customer
  // TODO: Add admin authentication in production
  app.patch('/api/admin/customers/:id', async (req, res) => {
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
  // TODO: Add admin authentication in production
  app.post('/api/admin/import-customers', async (req, res) => {
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
  // TODO: Add admin authentication in production
  app.post('/api/admin/promotions', async (req, res) => {
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
  // TODO: Add admin authentication in production
  app.get('/api/admin/promotions', async (req, res) => {
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
  // TODO: Add admin authentication in production
  app.post('/api/admin/products', async (req, res) => {
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
  // TODO: Add admin authentication in production
  app.patch('/api/admin/products/:id', async (req, res) => {
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
  // TODO: Add admin authentication in production
  app.delete('/api/admin/products/:id', async (req, res) => {
    try {
      await storage.deleteProduct(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
