import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin } from "./replitAuth";
import { insertCustomerSchema, insertCustomerCSVSchema, insertTransactionSchema, insertPromotionSchema, insertProductSchema, insertMessageTemplateSchema, insertSiteSchema, insertWorkScheduleSchema, insertBaristaAnnouncementSchema, insertWeeklySpecialSchema, insertDailySalesSchema, users, dailySales } from "@shared/schema";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import { sendSMS } from "./twilio";
import { sendEmail } from "./resend";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import multer from "multer";
import * as XLSX from "xlsx";

// Helper function to replace merge fields in messages
function replaceMergeFields(text: string, customer: { name: string; points: number; tier: string }): string {
  return text
    .replace(/\{name\}/g, customer.name)
    .replace(/\{points\}/g, customer.points.toString())
    .replace(/\{tier\}/g, customer.tier);
}

// Helper function to sanitize user objects by removing sensitive fields
function sanitizeUser(user: any) {
  if (!user) return null;
  const { password, twoFactorSecret, ...safeUser } = user;
  return safeUser;
}

// Helper function to sanitize array of users
function sanitizeUsers(users: any[]) {
  return users.map(sanitizeUser);
}

// Configure multer for file uploads (memory storage for Excel files)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve public product images from object storage
  app.get("/products/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(`products/${filePath}`);
      if (!file) {
        return res.status(404).json({ error: "Image not found" });
      }

      // Verify the file is marked as public via ACL policy
      const canAccess = await objectStorageService.canAccessPublicObject(file);
      if (!canAccess) {
        return res.status(403).json({ error: "Access denied" });
      }

      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error serving product image:", error);
      if (!res.headersSent) {
        return res.status(500).json({ error: "Failed to serve image" });
      }
    }
  });
  
  // Setup authentication
  await setupAuth(app);

  // Version endpoint for auto-update checking
  app.get('/api/version', (req, res) => {
    res.json({ version: 'v94' });
  });

  // Test Resend connection (admin only)
  app.post('/api/admin/test-resend', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      console.log(`🧪 Testing Resend connection with email: ${email}`);
      const result = await sendEmail(email, "Test Email from Yens", "This is a test email to verify Resend integration is working correctly.");
      
      console.log(`📧 Resend test result:`, result);
      
      if (result.success) {
        res.json({ 
          success: true, 
          message: "Test email sent successfully",
          messageId: result.messageId 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Failed to send test email",
          error: result.error 
        });
      }
    } catch (error: any) {
      console.error("❌ Resend test error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error testing Resend connection",
        error: error.message 
      });
    }
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
      }
      // Note: Existing users keep their database role (database role is authoritative)
      
      res.json(sanitizeUser(user));
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
      
      console.log(`🔧 Promoting user ${email} (${userId}) to admin...`);
      
      // First ensure the user exists in the database
      // upsertUser will create if needed, or update profile if exists (preserving role)
      const user = await storage.upsertUser({
        id: userId,
        email,
        firstName,
        lastName,
        profileImageUrl: req.user.claims.profile_image_url || null,
      });
      
      console.log(`📊 User after upsert - role: ${user.role}`);
      
      // Now update the user's role to admin
      const result = await db.update(users)
        .set({ role: 'admin' })
        .where(eq(users.id, userId))
        .returning();
      
      if (!result || result.length === 0) {
        console.error(`❌ Failed to update role for ${email} (${userId})`);
        return res.status(500).json({ message: "Failed to update user role" });
      }
      
      console.log(`✅ Successfully promoted ${email} (${userId}) to admin - final role: ${result[0].role}`);
      
      res.json({ message: "Successfully promoted to admin", email, userId });
    } catch (error) {
      console.error("Error promoting to admin:", error);
      res.status(500).json({ message: "Failed to promote to admin" });
    }
  });

  // ============ User Management Endpoints (Admin Only) ============
  
  // Get all users
  app.get('/api/admin/users', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      res.json(sanitizeUsers(allUsers));
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Create a new user
  app.post('/api/admin/users', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { email, firstName, lastName, role } = req.body;
      
      if (!email || !role) {
        return res.status(400).json({ message: "Email and role are required" });
      }

      // Validate role
      if (!['admin', 'manager', 'barista'].includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be admin, manager, or barista" });
      }

      // Create user with a temporary ID (will be replaced on first login)
      const user = await storage.createUser({
        email,
        firstName: firstName || '',
        lastName: lastName || '',
        role,
      });
      
      console.log(`✅ Created user: ${email} with role ${role}`);
      res.json(sanitizeUser(user));
    } catch (error: any) {
      console.error("Error creating user:", error);
      if (error.code === '23505') { // Unique violation
        return res.status(409).json({ message: "User with this email already exists" });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Update user role
  app.patch('/api/admin/users/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      
      if (!role) {
        return res.status(400).json({ message: "Role is required" });
      }

      // Validate role
      if (!['admin', 'manager', 'barista'].includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be admin, manager, or barista" });
      }

      const user = await storage.updateUserRole(id, role);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log(`✅ Updated user ${user.email} role to ${role}`);
      res.json(sanitizeUser(user));
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Toggle user active status
  app.patch('/api/admin/users/:id/active', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ message: "isActive must be a boolean" });
      }

      const user = await storage.updateUser(id, { isActive });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log(`✅ ${isActive ? 'Enabled' : 'Disabled'} user ${user.email}`);
      res.json(sanitizeUser(user));
    } catch (error) {
      console.error("Error updating user active status:", error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  // Update user details (email, name)
  app.patch('/api/admin/users/:id/details', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { email, firstName, lastName } = req.body;
      
      // At least one field must be provided
      if (!email && !firstName && !lastName) {
        return res.status(400).json({ message: "At least one field (email, firstName, or lastName) is required" });
      }

      // Validate email format if provided
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      const user = await storage.updateUserDetails(id, { email, firstName, lastName });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log(`✅ Updated user ${id} details`);
      res.json(sanitizeUser(user));
    } catch (error: any) {
      console.error("Error updating user details:", error);
      // Check for duplicate email error (both from storage layer and DB)
      if (error.message?.includes("already in use") || error.code === '23505') {
        return res.status(409).json({ message: "Email is already in use by another user" });
      }
      res.status(500).json({ message: "Failed to update user details" });
    }
  });

  // Delete user
  app.delete('/api/admin/users/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Prevent deleting yourself
      if (id === (req as any).user?.claims.sub) {
        return res.status(400).json({ message: "You cannot delete your own account" });
      }

      await storage.deleteUser(id);
      console.log(`✅ Deleted user ${id}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // ============ Password & 2FA Endpoints (Admin Only) ============

  // Set user password
  app.post('/api/admin/users/:id/password', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { password } = req.body;

      if (!password || password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      // Hash password with bcrypt (10 rounds)
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const user = await storage.setUserPassword(id, hashedPassword);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      console.log(`✅ Set password for user ${id}`);
      res.json({ success: true, message: "Password set successfully" });
    } catch (error: any) {
      console.error("Error setting password:", error);
      res.status(500).json({ message: "Failed to set password" });
    }
  });

  // Setup 2FA (generate secret and return QR code URI)
  app.post('/api/admin/users/:id/2fa/setup', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Generate TOTP secret
      const OTPAuth = await import('otpauth');
      const totp = new OTPAuth.TOTP({
        issuer: 'Yens Thai Ice Cream',
        label: user.email || user.firstName || 'Admin User',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
      });

      const secret = totp.secret.base32;
      const uri = totp.toString(); // otpauth:// URI for QR code

      console.log(`✅ Generated 2FA secret for user ${id}`);
      res.json({ 
        success: true, 
        secret,
        uri, // This will be used to generate QR code on frontend
        message: "2FA secret generated. Scan QR code with authenticator app." 
      });
    } catch (error: any) {
      console.error("Error setting up 2FA:", error);
      res.status(500).json({ message: "Failed to setup 2FA" });
    }
  });

  // Enable 2FA (verify token and save secret)
  app.post('/api/admin/users/:id/2fa/enable', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { secret, token } = req.body;

      if (!secret || !token) {
        return res.status(400).json({ message: "Secret and token are required" });
      }

      // Verify the token before enabling
      const OTPAuth = await import('otpauth');
      const totp = new OTPAuth.TOTP({
        secret,
        digits: 6,
        period: 30,
        algorithm: 'SHA1',
      });

      const delta = totp.validate({ token, window: 1 });
      if (delta === null) {
        return res.status(400).json({ message: "Invalid verification code" });
      }

      const user = await storage.enable2FA(id, secret);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      console.log(`✅ Enabled 2FA for user ${id}`);
      res.json({ success: true, message: "2FA enabled successfully" });
    } catch (error: any) {
      console.error("Error enabling 2FA:", error);
      res.status(500).json({ message: "Failed to enable 2FA" });
    }
  });

  // Disable 2FA
  app.post('/api/admin/users/:id/2fa/disable', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      const user = await storage.disable2FA(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      console.log(`✅ Disabled 2FA for user ${id}`);
      res.json({ success: true, message: "2FA disabled successfully" });
    } catch (error: any) {
      console.error("Error disabling 2FA:", error);
      res.status(500).json({ message: "Failed to disable 2FA" });
    }
  });

  // Verify 2FA token (for login or verification)
  app.post('/api/auth/verify-2fa', async (req, res) => {
    try {
      const { userId, token } = req.body;

      if (!userId || !token) {
        return res.status(400).json({ message: "User ID and token are required" });
      }

      const isValid = await storage.verify2FAToken(userId, token);
      
      if (isValid) {
        console.log(`✅ 2FA verification successful for user ${userId}`);
        res.json({ success: true, message: "Verification successful" });
      } else {
        console.log(`❌ 2FA verification failed for user ${userId}`);
        res.status(400).json({ success: false, message: "Invalid verification code" });
      }
    } catch (error: any) {
      console.error("Error verifying 2FA:", error);
      res.status(500).json({ message: "Failed to verify 2FA token" });
    }
  });

  // Password-based login endpoint (alongside Replit Auth)
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user || !user.password) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const isValidPassword = await storage.verifyUserPassword(user.id, password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Check if account is active
      if (!user.isActive) {
        console.log(`❌ Login denied - account disabled for user ${user.id}`);
        return res.status(403).json({ message: "Your account has been disabled. Please contact an administrator." });
      }

      // Check if 2FA is enabled
      if (user.twoFactorEnabled) {
        console.log(`🔐 User ${user.id} requires 2FA verification`);
        return res.json({ 
          success: true, 
          requires2FA: true,
          userId: user.id,
          message: "Password correct. 2FA verification required." 
        });
      }

      // Create session for password-based login
      const sessionUser = {
        claims: {
          sub: user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          profile_image_url: user.profileImageUrl,
          is_admin: user.role === 'admin',
        },
        expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 1 week
      };

      (req as any).login(sessionUser, (err: any) => {
        if (err) {
          console.error("Error creating session:", err);
          return res.status(500).json({ message: "Failed to create session" });
        }
        
        console.log(`✅ Password login successful for user ${user.id}`);
        res.json({ 
          success: true, 
          requires2FA: false,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
          },
          message: "Login successful" 
        });
      });
    } catch (error: any) {
      console.error("Error during password login:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Complete login with 2FA
  app.post('/api/auth/login-2fa', async (req, res) => {
    try {
      const { userId, token } = req.body;

      if (!userId || !token) {
        return res.status(400).json({ message: "User ID and token are required" });
      }

      const isValid = await storage.verify2FAToken(userId, token);
      if (!isValid) {
        return res.status(400).json({ message: "Invalid verification code" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if account is active
      if (!user.isActive) {
        console.log(`❌ 2FA login denied - account disabled for user ${user.id}`);
        return res.status(403).json({ message: "Your account has been disabled. Please contact an administrator." });
      }

      // Create session after successful 2FA
      const sessionUser = {
        claims: {
          sub: user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          profile_image_url: user.profileImageUrl,
          is_admin: user.role === 'admin',
        },
        expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 1 week
      };

      (req as any).login(sessionUser, (err: any) => {
        if (err) {
          console.error("Error creating session after 2FA:", err);
          return res.status(500).json({ message: "Failed to create session" });
        }
        
        console.log(`✅ 2FA login successful for user ${user.id}`);
        res.json({ 
          success: true,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
          },
          message: "Login successful" 
        });
      });
    } catch (error: any) {
      console.error("Error during 2FA login:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // ============ Account Management Endpoints ============

  // Get account status (password set, 2FA enabled)
  app.get('/api/auth/account-status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let user = await storage.getUser(userId);
      
      // Auto-create user if they don't exist yet (OIDC first-time login)
      if (!user) {
        console.log('⚠️  Account status - User not found, creating from claims...');
        const email = req.user.claims.email;
        const firstName = req.user.claims.first_name || '';
        const lastName = req.user.claims.last_name || '';
        const isAdmin = req.user.claims.is_admin || false;
        
        user = await storage.upsertUser({
          id: userId,
          email,
          firstName,
          lastName,
          profileImageUrl: req.user.claims.profile_image_url || null,
          role: isAdmin ? 'admin' : 'barista',
        });
        console.log('✅ User created for account status:', user.role);
      }

      res.json({
        hasPassword: !!user.password,
        twoFactorEnabled: user.twoFactorEnabled || false,
      });
    } catch (error: any) {
      console.error("Error getting account status:", error);
      res.status(500).json({ message: "Failed to get account status" });
    }
  });

  // Set or update password
  app.post('/api/auth/set-password', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { currentPassword, newPassword } = req.body;

      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // If user already has a password, verify current password
      if (user.password) {
        if (!currentPassword) {
          return res.status(400).json({ message: "Current password required" });
        }

        const bcrypt = await import('bcrypt');
        const valid = await bcrypt.compare(currentPassword, user.password);
        if (!valid) {
          return res.status(401).json({ message: "Current password is incorrect" });
        }
      }

      // Hash new password
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await db.update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, userId));

      console.log(`✅ Password ${user.password ? 'updated' : 'set'} for user ${userId}`);
      res.json({ success: true, message: "Password updated successfully" });
    } catch (error: any) {
      console.error("Error setting password:", error);
      res.status(500).json({ message: "Failed to set password" });
    }
  });

  // Setup 2FA (generate QR code)
  app.post('/api/auth/setup-2fa', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.password) {
        return res.status(400).json({ message: "Password must be set before enabling 2FA" });
      }

      // Generate secret and QR code
      const { TOTP, Secret } = await import('otpauth');
      const secret = new Secret();
      const totp = new TOTP({
        issuer: "Yens Thai Ice Cream",
        label: user.email || user.id,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: secret,
      });

      // Generate QR code
      const QRCode = await import('qrcode');
      const qrCodeUrl = await QRCode.toDataURL(totp.toString());

      // Store secret temporarily (not enabled yet)
      await db.update(users)
        .set({ twoFactorSecret: secret.base32 })
        .where(eq(users.id, userId));

      console.log(`✅ 2FA setup initiated for user ${userId}`);
      res.json({ 
        success: true,
        qrCode: qrCodeUrl,
        secret: secret.base32,
      });
    } catch (error: any) {
      console.error("Error setting up 2FA:", error);
      res.status(500).json({ message: "Failed to setup 2FA" });
    }
  });

  // Verify and enable 2FA
  app.post('/api/auth/verify-2fa-setup', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { token } = req.body;

      if (!token || token.length !== 6) {
        return res.status(400).json({ message: "Invalid verification code" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.twoFactorSecret) {
        return res.status(400).json({ message: "2FA setup not initiated" });
      }

      // Verify token
      const { TOTP, Secret } = await import('otpauth');
      const totp = new TOTP({
        issuer: "Yens Thai Ice Cream",
        label: user.email || user.id,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: Secret.fromBase32(user.twoFactorSecret),
      });

      const delta = totp.validate({ token, window: 1 });
      if (delta === null) {
        return res.status(401).json({ message: "Invalid verification code" });
      }

      // Enable 2FA
      await db.update(users)
        .set({ twoFactorEnabled: true })
        .where(eq(users.id, userId));

      console.log(`✅ 2FA enabled for user ${userId}`);
      res.json({ success: true, message: "2FA enabled successfully" });
    } catch (error: any) {
      console.error("Error verifying 2FA setup:", error);
      res.status(500).json({ message: "Failed to verify 2FA" });
    }
  });

  // Disable 2FA
  app.post('/api/auth/disable-2fa', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      await db.update(users)
        .set({ 
          twoFactorEnabled: false,
          twoFactorSecret: null,
        })
        .where(eq(users.id, userId));

      console.log(`✅ 2FA disabled for user ${userId}`);
      res.json({ success: true, message: "2FA disabled successfully" });
    } catch (error: any) {
      console.error("Error disabling 2FA:", error);
      res.status(500).json({ message: "Failed to disable 2FA" });
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
      
      // Check if customer with this phone already exists
      const existingCustomer = await storage.getCustomerByPhone(validatedData.phone);
      if (existingCustomer) {
        return res.status(409).json({ 
          message: "A customer with this phone number already exists",
          customer: existingCustomer 
        });
      }
      
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
  app.post('/api/transactions', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertTransactionSchema.parse(req.body);
      
      // Add barista ID from authenticated user
      const transactionData = {
        ...validatedData,
        baristaId: (req.user as any)!.claims.sub,
      };
      
      const transaction = await storage.createTransaction(transactionData);
      
      // Get updated customer data
      const customer = await storage.getCustomer(validatedData.customerId);
      
      // Update barista performance if baristaId is present
      if (transactionData.baristaId) {
        // Get active weekly special for bonus points
        const weeklySpecial = await storage.getActiveWeeklySpecial();
        const bonusPoints = (validatedData.includedSpecialOffer && weeklySpecial) ? weeklySpecial.bonusPoints : 0;
        
        // Update performance stats (don't await - fire and forget to avoid slowing down response)
        updateBaristaPerformanceAfterTransaction(
          transactionData.baristaId,
          parseFloat(validatedData.amount),
          validatedData.includedSpecialOffer || false,
          validatedData.isNewCustomer || false,
          bonusPoints
        ).catch(error => {
          console.error("Error updating barista performance:", error);
        });
      }
      
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

  // Get overview analytics/KPIs (for Dashboard tab - legacy)
  app.get('/api/admin/overview-analytics', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const analytics = await storage.getAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching overview analytics:", error);
      res.status(500).json({ message: "Failed to fetch overview analytics" });
    }
  });

  // Get weekly overview
  app.get('/api/admin/weekly-overview', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const overview = await storage.getWeeklyOverview();
      res.json(overview);
    } catch (error) {
      console.error("Error fetching weekly overview:", error);
      res.status(500).json({ message: "Failed to fetch weekly overview" });
    }
  });

  // Get all customers (with optional pagination and search)
  app.get('/api/admin/customers', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : undefined;
      const search = req.query.search as string | undefined;

      // If pagination params provided, use paginated query
      if (page !== undefined && pageSize !== undefined) {
        // Validate pagination params
        if (page < 1 || pageSize < 1 || pageSize > 200) {
          return res.status(400).json({ message: "Invalid pagination parameters" });
        }

        const result = await storage.listCustomers({ page, pageSize, search });
        res.json(result);
      } else {
        // Legacy behavior: return all customers
        const customers = await storage.getAllCustomers();
        res.json(customers);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  // Get duplicate phone numbers (must come before /:id route)
  app.get('/api/admin/customers/duplicates', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const duplicates = await storage.getDuplicatePhoneNumbers();
      res.json(duplicates);
    } catch (error) {
      console.error("Error fetching duplicate phone numbers:", error);
      res.status(500).json({ message: "Failed to fetch duplicates" });
    }
  });

  // Delete individual customer
  app.delete('/api/admin/customers/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const customerId = req.params.id;
      const customer = await storage.getCustomer(customerId);
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      await storage.deleteCustomer(customerId);
      
      console.log(`✅ Customer deleted: ${customer.name} (${customer.phone}) by admin`);
      res.json({ success: true, message: "Customer deleted successfully" });
    } catch (error) {
      console.error("Error deleting customer:", error);
      res.status(500).json({ message: "Failed to delete customer" });
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

      // Replace merge fields with actual customer data
      const personalizedMessage = replaceMergeFields(message, customer);
      const personalizedSubject = subject ? replaceMergeFields(subject, customer) : subject;

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
            title: personalizedSubject || 'Direct Message',
            message: personalizedMessage,
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
          const smsResult = await sendSMS(customer.phone, personalizedMessage);
          results.sms = smsResult;
          
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
          console.error("Error sending SMS:", error);
          results.sms = { success: false, error: error.message };
        }
      }

      // Send Email if channel includes email
      if (channel && channel.includes('email') && customer.email) {
        try {
          const emailResult = await sendEmail(
            customer.email,
            personalizedSubject || 'Message from Yens Thai Ice Cream',
            personalizedMessage
          );
          results.email = emailResult;

          // Log email message
          await storage.createMessageLog({
            customerId: customer.id,
            channel: 'email',
            recipient: customer.email,
            subject: personalizedSubject || null,
            message: personalizedMessage,
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

  // Get sales metrics for current and last month
  app.get('/api/admin/sales-metrics', isAuthenticated, isAdmin, async (req, res) => {
    try {
      // Calculate current month range
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      // Calculate last month range
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      // Fetch current month sales
      const currentMonthSales = await db.select()
        .from(dailySales)
        .where(sql`${dailySales.date} >= ${currentMonthStart.toISOString().split('T')[0]} AND ${dailySales.date} <= ${currentMonthEnd.toISOString().split('T')[0]}`);
      
      // Fetch last month sales
      const lastMonthSales = await db.select()
        .from(dailySales)
        .where(sql`${dailySales.date} >= ${lastMonthStart.toISOString().split('T')[0]} AND ${dailySales.date} <= ${lastMonthEnd.toISOString().split('T')[0]}`);

      // Calculate metrics
      const currentMonthRevenue = currentMonthSales.reduce((sum, sale) => sum + parseFloat(sale.totalSales), 0);
      const lastMonthRevenue = lastMonthSales.reduce((sum, sale) => sum + parseFloat(sale.totalSales), 0);
      const momGrowth = lastMonthRevenue > 0 
        ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
        : 0;
      const avgTransaction = currentMonthSales.length > 0 
        ? currentMonthRevenue / currentMonthSales.length 
        : 0;
      const transactionCount = currentMonthSales.length;

      res.json({
        currentMonthRevenue,
        lastMonthRevenue,
        momGrowth,
        avgTransaction,
        transactionCount,
      });
    } catch (error) {
      console.error("Error fetching sales metrics:", error);
      res.status(500).json({ message: "Failed to fetch sales metrics" });
    }
  });

  // Get sales overview data (recent 50 records for display)
  app.get('/api/admin/sales-overview', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const sales = await db.select()
        .from(dailySales)
        .orderBy(sql`${dailySales.date} DESC, ${dailySales.orderChannel}`)
        .limit(50);
      
      res.json(sales);
    } catch (error) {
      console.error("Error fetching sales overview:", error);
      res.status(500).json({ message: "Failed to fetch sales data" });
    }
  });

  // Get sales tracker metrics (today, week, month)
  app.get('/api/admin/sales-tracker-metrics', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Calculate week start (Monday)
      const dayOfWeek = now.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - daysToMonday);
      const weekStartStr = weekStart.toISOString().split('T')[0];
      
      // Calculate month start
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      
      // Fetch all sales for calculations
      const allSales = await db.select().from(dailySales);
      
      // Calculate metrics using string comparison
      const todaySales = allSales
        .filter(s => s.date === today)
        .reduce((sum, s) => sum + parseFloat(s.totalSales), 0);
      
      const weekSales = allSales
        .filter(s => s.date >= weekStartStr && s.date <= today)
        .reduce((sum, s) => sum + parseFloat(s.totalSales), 0);
      
      const monthSales = allSales
        .filter(s => s.date >= monthStart && s.date <= today)
        .reduce((sum, s) => sum + parseFloat(s.totalSales), 0);
      
      res.json({
        todaySales,
        weekSales,
        monthSales,
      });
    } catch (error) {
      console.error("Error fetching sales tracker metrics:", error);
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });

  // Get analytics dashboard data
  app.get('/api/admin/analytics', isAuthenticated, isAdmin, async (req, res) => {
    try {
      // Fetch all sales data (will be used for all calculations)
      const allSales = await db.select().from(dailySales);

      if (allSales.length === 0) {
        return res.json({
          summary: {
            totalRevenue: 0,
            momGrowth: 0,
            avgTransaction: 0,
            totalTransactions: 0,
          },
          monthlyTrends: [],
          channelPerformance: [],
          dayAnalysis: [],
          topPerformers: {
            channels: [],
            bestDay: 'N/A',
            bestMonth: 'N/A',
          },
        });
      }

      // Calculate current and last month metrics for summary using string comparison
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1; // 1-12
      const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

      // Format dates as YYYY-MM-DD for string comparison
      const currentMonthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const lastMonthStart = `${lastMonthYear}-${String(lastMonth).padStart(2, '0')}-01`;
      const nextMonthStart = currentMonth === 12 
        ? `${currentYear + 1}-01-01` 
        : `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;

      console.log('🔍 Date filters:', { currentMonthStart, lastMonthStart, nextMonthStart });

      const currentMonthSales = allSales.filter(s => s.date >= currentMonthStart && s.date < nextMonthStart);
      const lastMonthSales = allSales.filter(s => s.date >= lastMonthStart && s.date < currentMonthStart);

      const currentMonthRevenue = currentMonthSales.reduce((sum, s) => sum + parseFloat(s.totalSales), 0);
      const lastMonthRevenue = lastMonthSales.reduce((sum, s) => sum + parseFloat(s.totalSales), 0);
      const momGrowth = lastMonthRevenue > 0 ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;
      const avgTransaction = currentMonthSales.length > 0 ? currentMonthRevenue / currentMonthSales.length : 0;

      console.log('📊 Analytics Summary:', {
        currentMonth: `${currentYear}-${currentMonth}`,
        currentMonthSales: currentMonthSales.length,
        currentMonthRevenue,
        lastMonthRevenue,
        momGrowth,
        avgTransaction
      });

      // Monthly Trends (last 12 months)
      const monthlyTrendsMap = new Map<string, { totalSales: number; netSales: number }>();
      allSales.forEach(sale => {
        const date = new Date(sale.date);
        const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        const existing = monthlyTrendsMap.get(monthKey) || { totalSales: 0, netSales: 0 };
        monthlyTrendsMap.set(monthKey, {
          totalSales: existing.totalSales + parseFloat(sale.totalSales),
          netSales: existing.netSales + parseFloat(sale.netSales),
        });
      });

      const monthlyTrends = Array.from(monthlyTrendsMap.entries())
        .map(([month, data]) => ({ month, ...data }))
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
        .slice(-12);

      // Channel Performance
      const channelMap = new Map<string, { revenue: number; transactions: number }>();
      allSales.forEach(sale => {
        const existing = channelMap.get(sale.orderChannel) || { revenue: 0, transactions: 0 };
        channelMap.set(sale.orderChannel, {
          revenue: existing.revenue + parseFloat(sale.totalSales),
          transactions: existing.transactions + 1,
        });
      });

      const channelPerformance = Array.from(channelMap.entries())
        .map(([channel, data]) => ({
          channel,
          revenue: data.revenue,
          transactions: data.transactions,
          avgTransaction: data.revenue / data.transactions,
        }))
        .sort((a, b) => b.revenue - a.revenue);

      // Day of Week Analysis
      const dayMap = new Map<string, { revenue: number; transactions: number }>();
      const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      
      allSales.forEach(sale => {
        const day = sale.dayOfWeek || '';
        const existing = dayMap.get(day) || { revenue: 0, transactions: 0 };
        dayMap.set(day, {
          revenue: existing.revenue + parseFloat(sale.totalSales),
          transactions: existing.transactions + 1,
        });
      });

      const dayAnalysis = dayOrder
        .map(day => ({
          day,
          revenue: dayMap.get(day)?.revenue || 0,
          transactions: dayMap.get(day)?.transactions || 0,
        }));

      // Top Performers
      const bestDay = dayAnalysis.length > 0
        ? dayAnalysis.reduce((max, d) => d.revenue > max.revenue ? d : max).day
        : 'N/A';

      const bestMonth = monthlyTrends.length > 0
        ? monthlyTrends.reduce((max, m) => m.totalSales > max.totalSales ? m : max).month
        : 'N/A';

      res.json({
        summary: {
          totalRevenue: currentMonthRevenue,
          momGrowth,
          avgTransaction,
          totalTransactions: currentMonthSales.length,
        },
        monthlyTrends,
        channelPerformance,
        dayAnalysis,
        topPerformers: {
          channels: channelPerformance,
          bestDay,
          bestMonth,
        },
      });
    } catch (error) {
      console.error("Error fetching analytics data:", error);
      res.status(500).json({ message: "Failed to fetch analytics data" });
    }
  });

  // Add a new daily sale manually
  app.post('/api/admin/sales', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const validatedData = insertDailySalesSchema.parse(req.body);
      const userId = (req.user as any).claims.sub;

      // Calculate day of week from date
      const date = new Date(validatedData.date);
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });

      const [newSale] = await db.insert(dailySales).values({
        ...validatedData,
        dayOfWeek,
        importedBy: userId,
      }).onConflictDoUpdate({
        target: [dailySales.date, dailySales.orderChannel],
        set: {
          netSales: validatedData.netSales,
          grabFee: validatedData.grabFee,
          totalSales: validatedData.totalSales,
          importedAt: sql`CURRENT_TIMESTAMP`,
        }
      }).returning();

      res.json(newSale);
    } catch (error) {
      console.error("Error adding sale:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromError(error).toString() });
      }
      res.status(500).json({ message: "Failed to add sale record" });
    }
  });

  // Import daily sales from Excel file
  app.post('/api/admin/import-sales-excel', isAuthenticated, isAdmin, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Get admin user ID for tracking imports
      const userId = (req.user as any).claims.sub;

      // Helper function to normalize column names (handle casing/whitespace)
      const normalizeColumnName = (name: string): string => {
        return name.toLowerCase().trim().replace(/\s+/g, '_');
      };

      // Helper function to safely parse numeric value
      const parseNumeric = (value: any): number => {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
          // Remove commas and parse
          const cleaned = value.replace(/,/g, '');
          const num = Number(cleaned);
          return isNaN(num) ? 0 : num;
        }
        return 0;
      };

      // Parse Excel file  
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      let totalImported = 0;
      let totalSkipped = 0;
      const errors: string[] = [];

      // Process each sheet (month)
      for (const sheetName of workbook.SheetNames) {
        console.log(`Processing sheet: ${sheetName}`);
        const worksheet = workbook.Sheets[sheetName];
        // Keep raw: true (default) to preserve Excel serial dates as numbers
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        for (const rawRow of jsonData as any[]) {
          try {
            // Normalize row keys
            const row: any = {};
            for (const [key, value] of Object.entries(rawRow)) {
              row[normalizeColumnName(key)] = value;
            }

            // Get date from normalized key
            const dateValue = row['date'];
            
            // Skip weekly total rows (they don't have a date in proper format)
            if (!dateValue || typeof dateValue !== 'number') {
              continue;
            }

            // Convert Excel serial date to YYYY-MM-DD
            // Excel dates are stored as days since 1900-01-01 (with a leap year bug at 1900)
            const excelEpoch = new Date(1899, 11, 30); // Dec 30, 1899
            const jsDate = new Date(excelEpoch.getTime() + (dateValue * 86400000));
            const date = jsDate.toISOString().split('T')[0];
            
            // Extract and trim data using normalized keys
            // Handle day of week from 'day' column OR the first unnamed column (__empty)
            const dayOfWeek = (row['day'] || row['__empty'] || row[''] || '').toString().trim();
            const orderChannel = (row['order_channel'] || '').toString().trim();
            const netSales = parseNumeric(row['net_sales']);
            const grabFee = parseNumeric(row['grab'] || row['grab_fee']);
            const totalSales = parseNumeric(row['total_sales']);

            // Skip invalid rows
            if (!orderChannel || orderChannel === '' || totalSales === 0) {
              continue;
            }

            // Insert into database with unique constraint handling (importedBy is optional)
            await db.insert(dailySales).values({
              date,
              dayOfWeek,
              orderChannel,
              netSales: netSales.toFixed(2),
              grabFee: grabFee.toFixed(2),
              totalSales: totalSales.toFixed(2),
            }).onConflictDoUpdate({
              target: [dailySales.date, dailySales.orderChannel],
              set: {
                netSales: netSales.toFixed(2),
                grabFee: grabFee.toFixed(2),
                totalSales: totalSales.toFixed(2),
                importedAt: sql`CURRENT_TIMESTAMP`,
              }
            }); // Update on conflict to refresh data

            totalImported++;
          } catch (error) {
            console.error(`Error importing row:`, rawRow, error);
            totalSkipped++;
            if (errors.length < 10) {
              errors.push(`Sheet ${sheetName}: ${error instanceof Error ? error.message : String(error)}`);
            }
          }
        }
      }

      res.json({
        imported: totalImported,
        skipped: totalSkipped,
        sheetsProcessed: workbook.SheetNames.length,
        message: `Successfully imported ${totalImported} sales records from ${workbook.SheetNames.length} months`,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error("Error importing Excel file:", error);
      res.status(500).json({ message: "Failed to import Excel file", error: String(error) });
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
      // Convert empty string to null for numeric fields
      const cleanedData = {
        ...req.body,
        cost: req.body.cost === '' ? null : req.body.cost,
        price: req.body.price === '' ? null : req.body.price,
      };
      const validatedData = insertProductSchema.parse(cleanedData);
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
  // Get presigned URL for product image upload
  app.post('/api/admin/product-images/upload-url', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getProductImageUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error generating product image upload URL:", error);
      res.status(500).json({ message: "Failed to generate upload URL" });
    }
  });

  // Set ACL policy after product image upload
  app.post('/api/admin/product-images/set-acl', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { imageURL } = req.body;
      if (!imageURL) {
        return res.status(400).json({ message: "Image URL is required" });
      }

      const objectStorageService = new ObjectStorageService();
      const imagePath = await objectStorageService.setProductImageAclPolicy(imageURL);
      res.json({ url: imagePath });
    } catch (error) {
      console.error("Error setting product image ACL:", error);
      res.status(500).json({ message: "Failed to set image ACL" });
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

  // Send custom messages (admin only)
  app.post('/api/admin/messages/send', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { channel, recipientType, tier, customerIds, subject, message } = req.body;

      if (!message || !channel) {
        return res.status(400).json({ message: "Message and channel are required" });
      }

      // Get target customers based on recipient type
      let targetCustomers = [];
      
      if (recipientType === 'all') {
        targetCustomers = await storage.getAllCustomers();
      } else if (recipientType === 'tier' && tier) {
        const allCustomers = await storage.getAllCustomers();
        targetCustomers = allCustomers.filter(c => c.tier === tier);
      } else if (recipientType === 'individual' && customerIds && Array.isArray(customerIds)) {
        targetCustomers = await Promise.all(
          customerIds.map(id => storage.getCustomer(id))
        );
        targetCustomers = targetCustomers.filter(c => c !== undefined);
      } else {
        return res.status(400).json({ message: "Invalid recipient configuration" });
      }

      if (targetCustomers.length === 0) {
        return res.status(400).json({ message: "No customers found matching criteria" });
      }

      // Send messages to all target customers
      const results = await Promise.all(
        targetCustomers.map(async (customer) => {
          if (!customer) return null;

          // For app channel, create notification
          if (channel === 'app') {
            // Create a promotion to represent the app notification
            const promotion = await storage.createPromotion({
              title: subject || 'Message',
              message: message,
              targetTier: tier || null,
            });

            // Create customer notification
            await storage.createNotification({
              customerId: customer.id,
              promotionId: promotion.id,
            });

            // Log the app message
            await storage.createMessageLog({
              customerId: customer.id,
              templateId: null,
              channel: 'app',
              recipient: customer.phone,
              subject: subject || null,
              message: message,
              status: 'sent',
              externalId: promotion.id,
              errorMessage: null,
            });

            return { success: true, channel: 'app', customer: customer.name };
          }

          // For SMS channel
          if (channel === 'sms' && customer.phone) {
            const smsResult = await sendSMS(customer.phone, message);
            
            await storage.createMessageLog({
              customerId: customer.id,
              templateId: null,
              channel: 'sms',
              recipient: customer.phone,
              subject: null,
              message: message,
              status: smsResult.success ? 'sent' : 'failed',
              externalId: smsResult.messageId || null,
              errorMessage: smsResult.error || null,
            });

            return { success: smsResult.success, channel: 'sms', customer: customer.name };
          }

          // For email channel
          if (channel === 'email' && customer.email) {
            const emailSubject = subject || 'Message from Yens Thai Ice Cream';
            const emailResult = await sendEmail(customer.email, emailSubject, message);
            
            await storage.createMessageLog({
              customerId: customer.id,
              templateId: null,
              channel: 'email',
              recipient: customer.email,
              subject: emailSubject,
              message: message,
              status: emailResult.success ? 'sent' : 'failed',
              externalId: emailResult.messageId || null,
              errorMessage: emailResult.error || null,
            });

            return { success: emailResult.success, channel: 'email', customer: customer.name };
          }

          return { success: false, reason: 'No valid contact method' };
        })
      );

      const successful = results.filter(r => r && r.success).length;
      const failed = results.filter(r => r && !r.success).length;

      res.json({
        success: true,
        sent: successful,
        failed: failed,
        total: targetCustomers.length,
      });
    } catch (error) {
      console.error("Error sending messages:", error);
      res.status(500).json({ message: "Failed to send messages" });
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

  // ============================================
  // Sites API - Physical locations management
  // ============================================

  // Get active sites (public endpoint for baristas/customers)
  app.get('/api/sites', async (req, res) => {
    try {
      const allSites = await storage.getAllSites();
      // Filter to only return active sites
      const activeSites = allSites.filter(site => site.isActive);
      res.json(activeSites);
    } catch (error) {
      console.error("Error fetching active sites:", error);
      res.status(500).json({ message: "Failed to fetch sites" });
    }
  });

  // Get all sites (admin only)
  app.get('/api/admin/sites', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const sites = await storage.getAllSites();
      res.json(sites);
    } catch (error) {
      console.error("Error fetching sites:", error);
      res.status(500).json({ message: "Failed to fetch sites" });
    }
  });

  // Get single site
  app.get('/api/admin/sites/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const site = await storage.getSite(req.params.id);
      if (!site) {
        return res.status(404).json({ message: "Site not found" });
      }
      res.json(site);
    } catch (error) {
      console.error("Error fetching site:", error);
      res.status(500).json({ message: "Failed to fetch site" });
    }
  });

  // Create new site
  app.post('/api/admin/sites', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const validatedData = insertSiteSchema.parse(req.body);
      const site = await storage.createSite(validatedData);
      res.status(201).json(site);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: fromError(error).toString() });
      }
      console.error("Error creating site:", error);
      res.status(500).json({ message: "Failed to create site" });
    }
  });

  // Update site
  app.patch('/api/admin/sites/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const site = await storage.updateSite(req.params.id, req.body);
      if (!site) {
        return res.status(404).json({ message: "Site not found" });
      }
      res.json(site);
    } catch (error) {
      console.error("Error updating site:", error);
      res.status(500).json({ message: "Failed to update site" });
    }
  });

  // Delete site
  app.delete('/api/admin/sites/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      await storage.deleteSite(req.params.id);
      res.json({ message: "Site deleted successfully" });
    } catch (error) {
      console.error("Error deleting site:", error);
      res.status(500).json({ message: "Failed to delete site" });
    }
  });

  // ============ Barista Time Tracking Routes ============
  
  // Get current user's active time entry (currently clocked in)
  app.get('/api/barista/time-entry/current', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const entry = await storage.getCurrentTimeEntry(userId);
      res.json(entry || null);
    } catch (error) {
      console.error("Error getting current time entry:", error);
      res.status(500).json({ message: "Failed to get current time entry" });
    }
  });

  // Clock in
  app.post('/api/barista/clock-in', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { siteId, date } = req.body;
      if (!siteId || !date) {
        return res.status(400).json({ message: "Site ID and date are required" });
      }

      const entry = await storage.clockIn(userId, siteId, date);
      console.log(`✅ User ${userId} clocked in at site ${siteId}`);
      res.status(201).json(entry);
    } catch (error: any) {
      console.error("Error clocking in:", error);
      // Return 400 for validation errors (already clocked in, invalid site, etc.)
      if (error.message?.includes("already clocked in") || 
          error.message?.includes("Invalid site") || 
          error.message?.includes("inactive site")) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to clock in" });
    }
  });

  // Clock out
  app.post('/api/barista/clock-out/:timeEntryId', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // First, verify ownership BEFORE mutating the record
      const existingEntry = await storage.getTimeEntry(req.params.timeEntryId);
      if (!existingEntry) {
        return res.status(404).json({ message: "Time entry not found" });
      }

      if (existingEntry.userId !== userId) {
        console.log(`❌ User ${userId} attempted to clock out another user's entry ${req.params.timeEntryId}`);
        return res.status(403).json({ message: "Forbidden" });
      }

      // Now safe to clock out
      const entry = await storage.clockOut(req.params.timeEntryId);

      console.log(`✅ User ${userId} clocked out from time entry ${req.params.timeEntryId}`);
      res.json(entry);
    } catch (error: any) {
      console.error("Error clocking out:", error);
      // Return 400 for validation errors
      if (error.message?.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      if (error.message?.includes("Already clocked out")) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to clock out" });
    }
  });

  // Get time entries for current user
  app.get('/api/barista/time-entries', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { startDate, endDate } = req.query;
      const entries = await storage.getTimeEntries(
        userId,
        startDate as string | undefined,
        endDate as string | undefined
      );
      res.json(entries);
    } catch (error) {
      console.error("Error getting time entries:", error);
      res.status(500).json({ message: "Failed to get time entries" });
    }
  });

  // ============ Barista Work Schedule Routes ============
  
  // Get work schedules for current user
  app.get('/api/barista/schedules', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { startDate, endDate } = req.query;
      const schedules = await storage.getUserWorkSchedules(
        userId,
        startDate as string | undefined,
        endDate as string | undefined
      );
      res.json(schedules);
    } catch (error) {
      console.error("Error getting schedules:", error);
      res.status(500).json({ message: "Failed to get schedules" });
    }
  });

  // ============ Barista Announcements Routes ============
  
  // Get active barista announcements
  app.get('/api/barista/announcements', isAuthenticated, async (req, res) => {
    try {
      const announcements = await storage.getActiveAnnouncements();
      res.json(announcements);
    } catch (error) {
      console.error("Error getting announcements:", error);
      res.status(500).json({ message: "Failed to get announcements" });
    }
  });

  // ============ Admin Work Schedule Routes ============
  
  // Get all work schedules
  app.get('/api/admin/work-schedules', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const schedules = await storage.getAllWorkSchedules();
      res.json(schedules);
    } catch (error) {
      console.error("Error getting all schedules:", error);
      res.status(500).json({ message: "Failed to get schedules" });
    }
  });

  // Get work schedule by ID
  app.get('/api/admin/work-schedules/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const schedule = await storage.getWorkSchedule(req.params.id);
      if (!schedule) {
        return res.status(404).json({ message: "Schedule not found" });
      }
      res.json(schedule);
    } catch (error) {
      console.error("Error getting schedule:", error);
      res.status(500).json({ message: "Failed to get schedule" });
    }
  });

  // Create work schedule (single or weekly series)
  app.post('/api/admin/work-schedules', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { mode, ...data } = req.body;
      
      // Weekly mode: create series with multiple schedules
      if (mode === 'weekly') {
        const { weekStartDate, daysOfWeek, repeatWeeks, userId, siteId, startTime, endTime, notes } = data;
        
        // Validation
        if (!userId || !siteId) {
          return res.status(400).json({ message: "Weekly mode requires userId and siteId" });
        }
        if (!weekStartDate || typeof weekStartDate !== 'string') {
          return res.status(400).json({ message: "Weekly mode requires valid weekStartDate" });
        }
        if (!daysOfWeek || !Array.isArray(daysOfWeek) || daysOfWeek.length === 0) {
          return res.status(400).json({ message: "Weekly mode requires at least one day selected" });
        }
        if (!startTime || !endTime) {
          return res.status(400).json({ message: "Weekly mode requires startTime and endTime" });
        }
        const weeks = Number(repeatWeeks);
        if (isNaN(weeks) || weeks < 1 || weeks > 52) {
          return res.status(400).json({ message: "Repeat weeks must be between 1 and 52" });
        }
        
        const createdBy = (req.user as any)?.claims?.sub;
        const result = await storage.createWorkScheduleSeries(
          {
            userId,
            siteId,
            weekStartDate,
            daysOfWeek,
            repeatWeeks: weeks,
            startTime,
            endTime,
            notes: notes || null,
          },
          createdBy
        );
        
        res.json({
          mode: 'weekly',
          seriesId: result.series.id,
          schedulesCreated: result.schedules.length,
          schedules: result.schedules,
        });
      } else {
        // Single mode: create one schedule
        const validated = insertWorkScheduleSchema.parse(data);
        const newSchedule = await storage.createWorkSchedule(validated);
        res.json({ mode: 'single', schedule: newSchedule, schedulesCreated: 1 });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Error creating schedule:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create schedule";
      res.status(500).json({ message: errorMessage });
    }
  });

  // Update work schedule
  app.patch('/api/admin/work-schedules/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const updates = insertWorkScheduleSchema.partial().parse(req.body);
      const updated = await storage.updateWorkSchedule(req.params.id, updates);
      if (!updated) {
        return res.status(404).json({ message: "Schedule not found" });
      }
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Error updating schedule:", error);
      res.status(500).json({ message: "Failed to update schedule" });
    }
  });

  // Delete work schedule
  app.delete('/api/admin/work-schedules/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      await storage.deleteWorkSchedule(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting schedule:", error);
      res.status(500).json({ message: "Failed to delete schedule" });
    }
  });

  // Delete work schedule series (deletes all occurrences)
  app.delete('/api/admin/work-schedule-series/:seriesId', isAuthenticated, isAdmin, async (req, res) => {
    try {
      await storage.deleteWorkScheduleSeries(req.params.seriesId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting schedule series:", error);
      res.status(500).json({ message: "Failed to delete schedule series" });
    }
  });

  // ============ Admin Barista Announcements Routes ============
  
  // Get all barista announcements (including inactive)
  app.get('/api/admin/barista-announcements', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const announcements = await storage.getAllAnnouncements();
      res.json(announcements);
    } catch (error) {
      console.error("Error getting all announcements:", error);
      res.status(500).json({ message: "Failed to get announcements" });
    }
  });

  // Get barista announcement by ID
  app.get('/api/admin/barista-announcements/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const announcement = await storage.getAnnouncement(req.params.id);
      if (!announcement) {
        return res.status(404).json({ message: "Announcement not found" });
      }
      res.json(announcement);
    } catch (error) {
      console.error("Error getting announcement:", error);
      res.status(500).json({ message: "Failed to get announcement" });
    }
  });

  // Create barista announcement
  app.post('/api/admin/barista-announcements', isAuthenticated, isAdmin, async (req, res) => {
    try {
      console.log("Creating announcement with data:", JSON.stringify(req.body, null, 2));
      const validated = insertBaristaAnnouncementSchema.parse(req.body);
      const newAnnouncement = await storage.createAnnouncement(validated);
      res.json(newAnnouncement);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error:", JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Error creating announcement:", error);
      res.status(500).json({ message: "Failed to create announcement" });
    }
  });

  // Update barista announcement
  app.patch('/api/admin/barista-announcements/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const updates = insertBaristaAnnouncementSchema.partial().parse(req.body);
      const updated = await storage.updateAnnouncement(req.params.id, updates);
      if (!updated) {
        return res.status(404).json({ message: "Announcement not found" });
      }
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Error updating announcement:", error);
      res.status(500).json({ message: "Failed to update announcement" });
    }
  });

  // Delete barista announcement
  app.delete('/api/admin/barista-announcements/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      await storage.deleteAnnouncement(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting announcement:", error);
      res.status(500).json({ message: "Failed to delete announcement" });
    }
  });

  // === BARISTA-FACING ROUTES ===

  // Get work schedules for logged-in barista
  app.get('/api/work-schedules/me', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)!.claims.sub;
      const schedules = await storage.getUserWorkSchedules(userId);
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching work schedules:", error);
      res.status(500).json({ message: "Failed to fetch work schedules" });
    }
  });

  // Get active barista announcements
  app.get('/api/barista-announcements', isAuthenticated, async (req, res) => {
    try {
      const announcements = await storage.getActiveAnnouncements();
      res.json(announcements);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      res.status(500).json({ message: "Failed to fetch announcements" });
    }
  });

  // === WEEKLY SPECIALS - ADMIN ROUTES ===
  
  // Get all weekly specials
  app.get('/api/admin/weekly-specials', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const specials = await storage.getAllWeeklySpecials();
      res.json(specials);
    } catch (error) {
      console.error("Error fetching weekly specials:", error);
      res.status(500).json({ message: "Failed to fetch weekly specials" });
    }
  });

  // Create weekly special
  app.post('/api/admin/weekly-specials', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const specialData = insertWeeklySpecialSchema.parse(req.body);
      const special = await storage.createWeeklySpecial(specialData);
      res.status(201).json(special);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Error creating weekly special:", error);
      res.status(500).json({ message: "Failed to create weekly special" });
    }
  });

  // Update weekly special
  app.patch('/api/admin/weekly-specials/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const updates = insertWeeklySpecialSchema.partial().parse(req.body);
      const updated = await storage.updateWeeklySpecial(req.params.id, updates);
      if (!updated) {
        return res.status(404).json({ message: "Weekly special not found" });
      }
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Error updating weekly special:", error);
      res.status(500).json({ message: "Failed to update weekly special" });
    }
  });

  // Delete weekly special
  app.delete('/api/admin/weekly-specials/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      await storage.deleteWeeklySpecial(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting weekly special:", error);
      res.status(500).json({ message: "Failed to delete weekly special" });
    }
  });

  // === WEEKLY SPECIALS - BARISTA ROUTES ===
  
  // Get active weekly special
  app.get('/api/weekly-special/active', isAuthenticated, async (req, res) => {
    try {
      const special = await storage.getActiveWeeklySpecial();
      res.json(special || null);
    } catch (error) {
      console.error("Error fetching active weekly special:", error);
      res.status(500).json({ message: "Failed to fetch active weekly special" });
    }
  });

  // === BARISTA PERFORMANCE ROUTES ===
  
  // Get weekly leaderboard
  app.get('/api/barista/leaderboard', isAuthenticated, async (req, res) => {
    try {
      const weekStart = req.query.weekStart as string || getMonday(new Date()).toISOString().split('T')[0];
      const limit = parseInt(req.query.limit as string) || 10;
      const leaderboard = await storage.getWeeklyLeaderboard(weekStart, limit);
      res.json(leaderboard);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  // Get my performance stats
  app.get('/api/barista/performance/me', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)!.claims.sub;
      const weekStart = req.query.weekStart as string || getMonday(new Date()).toISOString().split('T')[0];
      const performance = await storage.getBaristaPerformance(userId, weekStart);
      res.json(performance || null);
    } catch (error) {
      console.error("Error fetching performance:", error);
      res.status(500).json({ message: "Failed to fetch performance" });
    }
  });

  // Get performance history
  app.get('/api/barista/performance/history', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)!.claims.sub;
      const limit = parseInt(req.query.limit as string) || 10;
      const history = await storage.getUserPerformanceHistory(userId, limit);
      res.json(history);
    } catch (error) {
      console.error("Error fetching performance history:", error);
      res.status(500).json({ message: "Failed to fetch performance history" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to get Monday of current week
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

// Helper function to update barista performance after transaction
async function updateBaristaPerformanceAfterTransaction(
  baristaId: string,
  amount: number,
  isSpecialOffer: boolean,
  isNewCustomerSignup: boolean,
  weeklySpecialBonusPoints: number = 0
) {
  const weekStart = getMonday(new Date()).toISOString().split('T')[0];
  
  // Get existing performance for this week
  const existing = await storage.getBaristaPerformance(baristaId, weekStart);
  
  // Calculate points: 1 point per transaction + special offer bonus + new customer bonus
  const basePoints = 1; // 1 point per transaction
  const specialOfferPoints = isSpecialOffer ? weeklySpecialBonusPoints : 0;
  const newCustomerPoints = isNewCustomerSignup ? 2 : 0; // 2 bonus points for new customer
  const totalNewPoints = basePoints + specialOfferPoints + newCustomerPoints;
  
  const performanceData = {
    userId: baristaId,
    weekStart,
    transactionCount: (existing?.transactionCount || 0) + 1,
    specialOffersSold: (existing?.specialOffersSold || 0) + (isSpecialOffer ? 1 : 0),
    newCustomerSignups: (existing?.newCustomerSignups || 0) + (isNewCustomerSignup ? 1 : 0),
    totalPoints: (existing?.totalPoints || 0) + totalNewPoints,
    weeklyRank: existing?.weeklyRank || null,
  };
  
  await storage.updateBaristaPerformance(performanceData);
}
