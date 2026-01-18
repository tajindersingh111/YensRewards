import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin } from "./replitAuth";
import { insertCustomerSchema, insertCustomerCSVSchema, insertTransactionSchema, insertPromotionSchema, insertProductSchema, insertMessageTemplateSchema, insertSiteSchema, insertWorkScheduleSchema, insertBaristaAnnouncementSchema, insertWeeklySpecialSchema, insertDailySalesSchema, users, dailySales, sites, lineLinkingCodes, customerReviews, insertCustomerReviewSchema } from "@shared/schema";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import { sendSMS } from "./twilio";
import { sendEmail, sendHtmlEmail } from "./resend";
import { sendLineMessage, verifyLineSignature, replyLineMessage, getLineProfile, LineWebhookBody, WebhookEvent, replyLineTemplatedMessage, sendLineTemplatedMessage } from "./line";
import { db } from "./db";
import { eq, sql, and, gt, lt } from "drizzle-orm";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import multer from "multer";
import * as XLSX from "xlsx";

// Helper function to normalize day of week names to canonical short form
function normalizeDayOfWeek(day: string): string {
  const normalized = day.trim().toLowerCase();
  
  // Map all variations to canonical short form
  const dayMap: Record<string, string> = {
    'monday': 'Mon',
    'mon': 'Mon',
    'mon.': 'Mon',
    'tuesday': 'Tue',
    'tue': 'Tue',
    'tue.': 'Tue',
    'tues': 'Tue',
    'tues.': 'Tue',
    'wednesday': 'Wed',
    'wed': 'Wed',
    'wed.': 'Wed',
    'thursday': 'Thu',
    'thu': 'Thu',
    'thu.': 'Thu',
    'thur': 'Thu',
    'thur.': 'Thu',
    'thurs': 'Thu',
    'thurs.': 'Thu',
    'friday': 'Fri',
    'fri': 'Fri',
    'fri.': 'Fri',
    'saturday': 'Sat',
    'sat': 'Sat',
    'sat.': 'Sat',
    'sunday': 'Sun',
    'sun': 'Sun',
    'sun.': 'Sun',
  };
  
  return dayMap[normalized] || day;
}

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

// ============================================
// LINE Linking Code Storage (database-backed with TTL)
// ============================================
const LINKING_CODE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function generateLinkingCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing chars like 0/O, 1/I
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `LINK-${code}`;
}

async function getOrCreateLinkingCode(customerId: string): Promise<string> {
  // Check if customer already has a valid unexpired code
  const existing = await db.select()
    .from(lineLinkingCodes)
    .where(and(
      eq(lineLinkingCodes.customerId, customerId),
      eq(lineLinkingCodes.used, false),
      gt(lineLinkingCodes.expiresAt, new Date())
    ))
    .limit(1);
  
  if (existing.length > 0) {
    console.log(`🔗 Returning existing LINE linking code ${existing[0].code} for customer ${customerId}`);
    return existing[0].code;
  }
  
  // Generate new unique code
  let code: string;
  let attempts = 0;
  do {
    code = generateLinkingCode();
    const existingCode = await db.select().from(lineLinkingCodes).where(eq(lineLinkingCodes.code, code)).limit(1);
    if (existingCode.length === 0) break;
    attempts++;
  } while (attempts < 10);
  
  const expiresAt = new Date(Date.now() + LINKING_CODE_TTL_MS);
  await db.insert(lineLinkingCodes).values({
    code,
    customerId,
    expiresAt,
    used: false
  });
  
  console.log(`🔗 Generated new LINE linking code ${code} for customer ${customerId}, expires at ${expiresAt.toISOString()}`);
  return code;
}

async function validateLinkingCode(code: string): Promise<string | null> {
  const upperCode = code.toUpperCase();
  const result = await db.select()
    .from(lineLinkingCodes)
    .where(and(
      eq(lineLinkingCodes.code, upperCode),
      eq(lineLinkingCodes.used, false),
      gt(lineLinkingCodes.expiresAt, new Date())
    ))
    .limit(1);
  
  if (result.length === 0) {
    console.log(`❌ LINE linking code ${upperCode} not found, used, or expired`);
    return null;
  }
  
  console.log(`✅ LINE linking code ${upperCode} is valid for customer ${result[0].customerId}`);
  return result[0].customerId;
}

async function consumeLinkingCode(code: string): Promise<void> {
  const upperCode = code.toUpperCase();
  await db.update(lineLinkingCodes)
    .set({ used: true })
    .where(eq(lineLinkingCodes.code, upperCode));
  console.log(`🔗 Consumed LINE linking code ${upperCode}`);
}

// Clean up expired codes periodically (database cleanup)
setInterval(async () => {
  try {
    await db.delete(lineLinkingCodes)
      .where(lt(lineLinkingCodes.expiresAt, new Date()));
  } catch (error) {
    console.error('Error cleaning up expired linking codes:', error);
  }
}, 5 * 60 * 1000); // Clean every 5 minutes

// Configure multer for file uploads (memory storage for Excel files)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint - responds immediately without database check
  // This is used by deployment health checks
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

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
    res.json({ version: 'v3.17.6' });
  });

  // Development-only: Quick test Resend connection (no auth required)
  if (process.env.NODE_ENV !== 'production') {
    app.post('/api/dev/test-resend', async (req, res) => {
      try {
        const { email } = req.body;
        if (!email) {
          return res.status(400).json({ message: "Email is required" });
        }

        console.log(`🧪 [DEV] Testing Resend connection with email: ${email}`);
        const result = await sendEmail(email, "Test Email from Yens Thai Ice Cream", "สวัสดีค่ะ! This is a test email to verify Resend integration is working correctly.\n\nIf you received this, the email system is configured properly!");
        
        console.log(`📧 [DEV] Resend test result:`, JSON.stringify(result));
        
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
        console.error("❌ [DEV] Resend test error:", error);
        res.status(500).json({ 
          success: false, 
          message: "Error testing Resend connection",
          error: error.message 
        });
      }
    });
  }

  // Check Resend configuration (admin only)
  app.get('/api/admin/resend-config', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { getUncachableResendClient } = await import('./resend');
      const { fromEmail } = await getUncachableResendClient();
      res.json({ 
        success: true, 
        fromEmail: fromEmail,
        message: "Resend is configured"
      });
    } catch (error: any) {
      console.error("❌ Resend config check error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Resend not configured",
        error: error.message 
      });
    }
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
      console.log('👤 User from DB by ID:', JSON.stringify(user, null, 2));
      
      // If user not found by ID, try by email (handles case where user was created with different ID)
      if (!user && email) {
        console.log('🔍 User not found by ID, trying by email...');
        user = await storage.getUserByEmail(email);
        console.log('👤 User from DB by email:', JSON.stringify(user, null, 2));
      }
      
      // If user still doesn't exist, create them (can happen in OIDC test mode)
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
      
      console.log(`📊 User after upsert - ID: ${user.id}, role: ${user.role}`);
      
      // Now update the user's role to admin (use user.id from upsert, not userId from claims)
      const result = await db.update(users)
        .set({ role: 'admin' })
        .where(eq(users.id, user.id))
        .returning();
      
      if (!result || result.length === 0) {
        console.error(`❌ Failed to update role for ${email} (${user.id})`);
        return res.status(500).json({ message: "Failed to update user role" });
      }
      
      console.log(`✅ Successfully promoted ${email} (${user.id}) to admin - final role: ${result[0].role}`);
      
      res.json({ message: "Successfully promoted to admin", email, userId: user.id });
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

  // Get LINE linking code for a customer (by phone)
  app.get('/api/customers/phone/:phone/line-link-code', async (req, res) => {
    try {
      const customer = await storage.getCustomerByPhone(req.params.phone);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      // Don't generate code if already linked
      if (customer.lineUid) {
        return res.json({ alreadyLinked: true, linkCode: null });
      }
      
      const linkCode = await getOrCreateLinkingCode(customer.id);
      res.json({ alreadyLinked: false, linkCode });
    } catch (error) {
      console.error("Error generating LINE link code:", error);
      res.status(500).json({ message: "Failed to generate link code" });
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
      console.log("Updating customer:", req.params.id, "with data:", JSON.stringify(req.body));
      
      // Transform date strings to Date objects for the database
      const updateData = { ...req.body };
      if (updateData.registerDate) {
        updateData.registerDate = new Date(updateData.registerDate);
      }
      if (updateData.lastUse) {
        updateData.lastUse = new Date(updateData.lastUse);
      }
      
      const customer = await storage.updateCustomer(req.params.id, updateData);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error: any) {
      console.error("Error updating customer:", error?.message || error);
      console.error("Stack:", error?.stack);
      res.status(500).json({ message: "Failed to update customer", error: error?.message });
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

  // Get all customers (with optional pagination, search, sorting, and filtering)
  app.get('/api/admin/customers', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : undefined;
      const search = req.query.search as string | undefined;
      const sortBy = req.query.sortBy as 'name' | 'totalSpent' | 'points' | 'createdAt' | undefined;
      const sortOrder = req.query.sortOrder as 'asc' | 'desc' | undefined;
      const tierFilter = req.query.tier as string | undefined;

      // If pagination params provided, use paginated query
      if (page !== undefined && pageSize !== undefined) {
        // Validate pagination params
        if (page < 1 || pageSize < 1 || pageSize > 200) {
          return res.status(400).json({ message: "Invalid pagination parameters" });
        }

        const result = await storage.listCustomers({ page, pageSize, search, sortBy, sortOrder, tierFilter });
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

  // Get all customers (no pagination) - for insights/analytics
  app.get('/api/admin/customers/all', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const customers = await storage.getAllCustomers();
      res.json(customers);
    } catch (error) {
      console.error("Error fetching all customers:", error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  // Get customers with birthday today or this week
  app.get('/api/admin/customers/birthdays', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { filter } = req.query; // 'today' or 'week'
      const customers = await storage.getAllCustomers();
      
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize to midnight
      const todayMonth = today.getMonth() + 1;
      const todayDay = today.getDate();
      
      // Get current week's date range (Sunday to Saturday), normalized to midnight
      const dayOfWeek = today.getDay();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - dayOfWeek);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999); // End of day
      
      const birthdayCustomers = customers.filter(customer => {
        if (!customer.birthday) return false;
        
        try {
          // Parse birthday from various formats: MM-DD, MM/DD, YYYY-MM-DD
          let birthMonth: number = 0, birthDay: number = 0;
          const birthdayStr = customer.birthday.toString().trim();
          
          if (birthdayStr.includes('-')) {
            const parts = birthdayStr.split('-');
            if (parts.length === 2) {
              // MM-DD format
              birthMonth = parseInt(parts[0], 10);
              birthDay = parseInt(parts[1], 10);
            } else if (parts.length === 3) {
              // YYYY-MM-DD format
              birthMonth = parseInt(parts[1], 10);
              birthDay = parseInt(parts[2], 10);
            }
          } else if (birthdayStr.includes('/')) {
            const parts = birthdayStr.split('/');
            if (parts.length === 2) {
              // MM/DD format
              birthMonth = parseInt(parts[0], 10);
              birthDay = parseInt(parts[1], 10);
            } else if (parts.length === 3) {
              // MM/DD/YYYY or YYYY/MM/DD format
              if (parts[0].length === 4) {
                // YYYY/MM/DD
                birthMonth = parseInt(parts[1], 10);
                birthDay = parseInt(parts[2], 10);
              } else {
                // MM/DD/YYYY
                birthMonth = parseInt(parts[0], 10);
                birthDay = parseInt(parts[1], 10);
              }
            }
          } else if (!isNaN(Date.parse(birthdayStr))) {
            // Try parsing as ISO date string
            const parsedDate = new Date(birthdayStr);
            birthMonth = parsedDate.getMonth() + 1;
            birthDay = parsedDate.getDate();
          }
          
          if (!birthMonth || !birthDay || isNaN(birthMonth) || isNaN(birthDay)) return false;
          if (birthMonth < 1 || birthMonth > 12 || birthDay < 1 || birthDay > 31) return false;
          
          if (filter === 'today') {
            return birthMonth === todayMonth && birthDay === todayDay;
          } else if (filter === 'week') {
            // Check if birthday (this year) falls within current week
            const thisYearBirthday = new Date(today.getFullYear(), birthMonth - 1, birthDay);
            thisYearBirthday.setHours(0, 0, 0, 0); // Normalize to midnight
            return thisYearBirthday >= weekStart && thisYearBirthday <= weekEnd;
          }
          return false;
        } catch (e) {
          console.error(`Failed to parse birthday for customer: ${customer.id}`, e);
          return false;
        }
      });
      
      res.json(birthdayCustomers);
    } catch (error) {
      console.error("Error fetching birthday customers:", error);
      res.status(500).json({ message: "Failed to fetch birthday customers" });
    }
  });

  // Get customer IDs who received birthday messages today
  app.get('/api/admin/customers/birthdays/sent-today', isAuthenticated, isAdmin, async (req, res) => {
    try {
      // Get all message logs
      const allLogs = await storage.getMessageLogs();
      
      // Get today's date in Bangkok timezone
      const bangkokNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
      const todayStart = new Date(bangkokNow);
      todayStart.setHours(0, 0, 0, 0);
      
      // Filter for birthday messages sent today
      const birthdayMessagesSentToday = allLogs.filter(log => {
        // Check if message contains birthday-related keywords
        const isBirthday = log.subject?.toLowerCase().includes('birthday') ||
                          log.subject?.toLowerCase().includes('วันเกิด') ||
                          log.message?.toLowerCase().includes('happy birthday') ||
                          log.message?.toLowerCase().includes('สุขสันต์วันเกิด');
        
        // Check if sent today
        const sentDate = log.sentAt || log.createdAt;
        if (!sentDate) return false;
        
        const logDate = new Date(sentDate);
        const logDateBangkok = new Date(logDate.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
        logDateBangkok.setHours(0, 0, 0, 0);
        
        const isSentToday = logDateBangkok.getTime() === todayStart.getTime();
        
        // Only count successfully sent messages
        const isSuccess = log.status === 'sent' || log.status === 'delivered';
        
        return isBirthday && isSentToday && isSuccess;
      });
      
      // Get unique customer IDs
      const customerIds = [...new Set(birthdayMessagesSentToday.map(log => log.customerId))];
      
      res.json({ customerIds });
    } catch (error) {
      console.error("Error fetching birthday messages sent today:", error);
      res.status(500).json({ message: "Failed to fetch birthday messages" });
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

  // Get sales tracker metrics (Best Channel, Best Day, Best Month, YTD)
  app.get('/api/admin/sales-tracker-metrics', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Calculate year start (January 1st) using UTC
      const yearStart = `${now.getUTCFullYear()}-01-01`;
      
      // Calculate current month start (first day of current month) using UTC
      const monthStartUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const monthStart = monthStartUTC.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Calculate current week start (Monday) using UTC to match database dates
      const currentDayUTC = now.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      let daysToSubtract;
      if (currentDayUTC === 0) {
        daysToSubtract = 6; // Sunday: go back 6 days to previous Monday
      } else {
        daysToSubtract = currentDayUTC - 1; // Mon-Sat: go back to Monday of this week
      }
      const mondayUTC = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - daysToSubtract,
        0, 0, 0, 0
      ));
      const weekStart = mondayUTC.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Calculate last week start (previous Monday) and end (previous Sunday)
      const lastMondayUTC = new Date(Date.UTC(
        mondayUTC.getUTCFullYear(),
        mondayUTC.getUTCMonth(),
        mondayUTC.getUTCDate() - 7,
        0, 0, 0, 0
      ));
      const lastSundayUTC = new Date(Date.UTC(
        mondayUTC.getUTCFullYear(),
        mondayUTC.getUTCMonth(),
        mondayUTC.getUTCDate() - 1,
        0, 0, 0, 0
      ));
      const lastWeekStart = lastMondayUTC.toISOString().split('T')[0];
      const lastWeekEnd = lastSundayUTC.toISOString().split('T')[0];
      
      // Calculate last month start and end
      const lastMonthStartUTC = new Date(Date.UTC(
        now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear(),
        now.getUTCMonth() === 0 ? 11 : now.getUTCMonth() - 1,
        1
      ));
      const lastMonthEndUTC = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        0  // Last day of previous month
      ));
      const lastMonthStart = lastMonthStartUTC.toISOString().split('T')[0];
      const lastMonthEnd = lastMonthEndUTC.toISOString().split('T')[0];
      
      // Fetch all sales for calculations
      const allSales = await db.select().from(dailySales);
      
      // Calculate Current Week Revenue (Monday to today)
      const currentWeekSales = allSales
        .filter(s => s.date >= weekStart && s.date <= today)
        .reduce((sum, s) => sum + parseFloat(s.totalSales), 0);
      
      // Calculate Last Week Revenue (previous Monday to Sunday)
      const lastWeekSales = allSales
        .filter(s => s.date >= lastWeekStart && s.date <= lastWeekEnd)
        .reduce((sum, s) => sum + parseFloat(s.totalSales), 0);
      
      // Calculate Current Month Revenue (1st to today)
      const currentMonthSales = allSales
        .filter(s => s.date >= monthStart && s.date <= today)
        .reduce((sum, s) => sum + parseFloat(s.totalSales), 0);
      
      // Calculate Last Month Revenue (full month)
      const lastMonthSales = allSales
        .filter(s => s.date >= lastMonthStart && s.date <= lastMonthEnd)
        .reduce((sum, s) => sum + parseFloat(s.totalSales), 0);
      
      // Calculate YTD (Year to Date) - from Jan 1 to today (using netSales for consistency with reports)
      const ytdSalesData = allSales.filter(s => s.date >= yearStart && s.date <= today);
      const ytdSales = ytdSalesData.reduce((sum, s) => sum + parseFloat(s.netSales), 0);
      const ytdTransactionCount = ytdSalesData.length;
      
      // Calculate transaction counts for week and month
      const currentWeekTransactions = allSales.filter(s => s.date >= weekStart && s.date <= today).length;
      const currentMonthTransactions = allSales.filter(s => s.date >= monthStart && s.date <= today).length;
      
      // Calculate days elapsed for projections
      const daysElapsedWeek = Math.floor((new Date(today).getTime() - new Date(weekStart).getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const daysElapsedMonth = now.getUTCDate();
      const daysInMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
      const daysElapsedYear = Math.floor((new Date(today).getTime() - new Date(yearStart).getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      // Calculate same month last year for YoY comparison
      const lastYearMonthStart = `${now.getUTCFullYear() - 1}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`;
      const lastYearMonthEnd = `${now.getUTCFullYear() - 1}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(daysElapsedMonth).padStart(2, '0')}`;
      const sameMonthLastYear = allSales
        .filter(s => s.date >= lastYearMonthStart && s.date <= lastYearMonthEnd)
        .reduce((sum, s) => sum + parseFloat(s.netSales), 0);
      
      // Calculate same YTD period last year
      const lastYearStart = `${now.getUTCFullYear() - 1}-01-01`;
      const lastYearToday = `${now.getUTCFullYear() - 1}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
      const ytdLastYear = allSales
        .filter(s => s.date >= lastYearStart && s.date <= lastYearToday)
        .reduce((sum, s) => sum + parseFloat(s.netSales), 0);
      
      // FY2026 Annual Target from business forecast
      const annualTarget = 1732028;
      const weeklyTarget = annualTarget / 52;
      const monthlyTarget = annualTarget / 12;
      
      // Filter sales to current year only for best channel/day/month
      // Use fresh Date() to ensure we get the actual current year
      const currentYear = new Date().getFullYear();
      console.log(`[Sales Tracker] Filtering for year: ${currentYear}, Total sales records: ${allSales.length}`);
      const currentYearSales = allSales.filter(s => s.date.startsWith(String(currentYear)));
      console.log(`[Sales Tracker] Current year sales count: ${currentYearSales.length}`);
      
      // Find best channel (highest total sales) - Current Year Only
      const channelTotals = currentYearSales.reduce((acc, sale) => {
        const channel = sale.orderChannel;
        if (!acc[channel]) {
          acc[channel] = 0;
        }
        acc[channel] += parseFloat(sale.totalSales);
        return acc;
      }, {} as Record<string, number>);
      
      const bestChannel = Object.entries(channelTotals).length > 0
        ? Object.entries(channelTotals).sort(([, a], [, b]) => b - a)[0]
        : null;
      
      // Find best single calendar date (highest total sales on one date) - Current Year Only
      // Group sales by date and find the date with highest combined sales
      const dateTotals = currentYearSales.reduce((acc, sale) => {
        const date = sale.date;
        const dayOfWeek = sale.dayOfWeek;
        if (!acc[date]) {
          acc[date] = { total: 0, dayOfWeek };
        }
        acc[date].total += parseFloat(sale.totalSales);
        return acc;
      }, {} as Record<string, { total: number; dayOfWeek: string }>);
      
      const bestDay = Object.entries(dateTotals).length > 0
        ? Object.entries(dateTotals)
            .map(([date, data]) => ({ date, dayOfWeek: data.dayOfWeek, total: data.total }))
            .sort((a, b) => b.total - a.total)[0]
        : null;
      
      // Find best month (highest total sales) - Current Year Only
      const monthTotals = currentYearSales.reduce((acc, sale) => {
        const month = sale.date.substring(0, 7); // YYYY-MM
        if (!acc[month]) {
          acc[month] = 0;
        }
        acc[month] += parseFloat(sale.totalSales);
        return acc;
      }, {} as Record<string, number>);
      
      const bestMonth = Object.entries(monthTotals).length > 0
        ? Object.entries(monthTotals).sort(([, a], [, b]) => b - a)[0]
        : null;
      
      res.json({
        currentWeekSales,
        lastWeekSales,
        currentMonthSales,
        lastMonthSales,
        ytdSales,
        bestChannel: bestChannel ? { name: bestChannel[0], total: bestChannel[1] } : null,
        bestDay: bestDay ? { date: bestDay.date, dayOfWeek: bestDay.dayOfWeek, total: bestDay.total } : null,
        bestMonth: bestMonth ? { month: bestMonth[0], total: bestMonth[1] } : null,
        // Debug info
        filterYear: currentYear,
        totalSalesRecords: allSales.length,
        currentYearRecords: currentYearSales.length,
        // Enhanced CFO metrics
        currentWeekTransactions,
        currentMonthTransactions,
        ytdTransactionCount,
        daysElapsedWeek,
        daysElapsedMonth,
        daysInMonth,
        daysElapsedYear,
        sameMonthLastYear,
        ytdLastYear,
        annualTarget,
        weeklyTarget,
        monthlyTarget,
        // Calculated projections
        weeklyDailyAvg: daysElapsedWeek > 0 ? currentWeekSales / daysElapsedWeek : 0,
        monthlyDailyAvg: daysElapsedMonth > 0 ? currentMonthSales / daysElapsedMonth : 0,
        projectedMonthEnd: daysElapsedMonth > 0 ? (currentMonthSales / daysElapsedMonth) * daysInMonth : 0,
        projectedAnnual: daysElapsedYear > 0 ? (ytdSales / daysElapsedYear) * 365 : 0,
        weeklyTargetPercent: weeklyTarget > 0 ? (currentWeekSales / weeklyTarget) * 100 : 0,
        monthlyTargetPercent: monthlyTarget > 0 ? (currentMonthSales / monthlyTarget) * 100 : 0,
        annualTargetPercent: annualTarget > 0 ? (ytdSales / annualTarget) * 100 : 0,
        yoyMonthGrowth: sameMonthLastYear > 0 ? ((currentMonthSales - sameMonthLastYear) / sameMonthLastYear) * 100 : 0,
        yoyYtdGrowth: ytdLastYear > 0 ? ((ytdSales - ytdLastYear) / ytdLastYear) * 100 : 0,
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

      const currentMonthRevenue = currentMonthSales.reduce((sum, s) => sum + parseFloat(s.netSales), 0);
      const lastMonthRevenue = lastMonthSales.reduce((sum, s) => sum + parseFloat(s.netSales), 0);
      const momGrowth = lastMonthRevenue > 0 ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;
      const avgTransaction = currentMonthSales.length > 0 ? currentMonthRevenue / currentMonthSales.length : 0;

      // CFO-Level Metrics: YTD and Annual Target
      const yearStart = `${currentYear}-01-01`;
      const today = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const ytdSalesData = allSales.filter(s => s.date >= yearStart && s.date <= today);
      const ytdRevenue = ytdSalesData.reduce((sum, s) => sum + parseFloat(s.netSales), 0);
      const ytdTransactions = ytdSalesData.length;
      
      // Same period last year for YoY comparison
      const lastYearStart = `${currentYear - 1}-01-01`;
      const lastYearToday = `${currentYear - 1}-${String(currentMonth).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const sameMonthLastYearStart = `${currentYear - 1}-${String(currentMonth).padStart(2, '0')}-01`;
      const sameMonthLastYearEnd = `${currentYear - 1}-${String(currentMonth).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      
      const sameMonthLastYear = allSales
        .filter(s => s.date >= sameMonthLastYearStart && s.date <= sameMonthLastYearEnd)
        .reduce((sum, s) => sum + parseFloat(s.netSales), 0);
      const ytdLastYear = allSales
        .filter(s => s.date >= lastYearStart && s.date <= lastYearToday)
        .reduce((sum, s) => sum + parseFloat(s.netSales), 0);

      // Targets from business forecast
      const annualTarget = 1732028;
      const monthlyTarget = annualTarget / 12;
      const daysElapsedMonth = now.getDate();
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
      const daysElapsedYear = Math.floor((new Date(today).getTime() - new Date(yearStart).getTime()) / (1000 * 60 * 60 * 24)) + 1;

      // Projections
      const projectedMonthEnd = daysElapsedMonth > 0 ? (currentMonthRevenue / daysElapsedMonth) * daysInMonth : 0;
      const projectedAnnual = daysElapsedYear > 0 ? (ytdRevenue / daysElapsedYear) * 365 : 0;
      const monthlyTargetPercent = monthlyTarget > 0 ? (currentMonthRevenue / monthlyTarget) * 100 : 0;
      const annualTargetPercent = annualTarget > 0 ? (ytdRevenue / annualTarget) * 100 : 0;
      const yoyMonthGrowth = sameMonthLastYear > 0 ? ((currentMonthRevenue - sameMonthLastYear) / sameMonthLastYear) * 100 : 0;
      const yoyYtdGrowth = ytdLastYear > 0 ? ((ytdRevenue - ytdLastYear) / ytdLastYear) * 100 : 0;
      const dailyAverage = daysElapsedMonth > 0 ? currentMonthRevenue / daysElapsedMonth : 0;

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

      // Filter to YTD sales (used by both channel and day analysis)
      const startOfYear = `${currentYear}-01-01`;
      const ytdSales = allSales.filter(s => s.date >= startOfYear);

      // Channel Performance - use YTD and netSales to match Day Total calculation
      const channelMap = new Map<string, { revenue: number; transactions: number }>();
      ytdSales.forEach(sale => {
        const existing = channelMap.get(sale.orderChannel) || { revenue: 0, transactions: 0 };
        channelMap.set(sale.orderChannel, {
          revenue: existing.revenue + parseFloat(sale.netSales),
          transactions: existing.transactions + 1,
        });
      });

      const channelPerformance = Array.from(channelMap.entries())
        .map(([channel, data]) => ({
          channel,
          revenue: Math.round(data.revenue * 100) / 100,
          transactions: data.transactions,
          avgTransaction: Math.round((data.revenue / data.transactions) * 100) / 100,
        }))
        .sort((a, b) => b.revenue - a.revenue);

      // Day of Week Analysis - use netSales and YTD (ytdSales defined above)
      const dayMap = new Map<string, { revenue: number; transactions: number }>();
      const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      
      ytdSales.forEach(sale => {
        const day = normalizeDayOfWeek(sale.dayOfWeek || '');
        if (day) {
          const existing = dayMap.get(day) || { revenue: 0, transactions: 0 };
          dayMap.set(day, {
            revenue: existing.revenue + parseFloat(sale.netSales),
            transactions: existing.transactions + 1,
          });
        }
      });

      const dayAnalysis = dayOrder
        .map(day => ({
          day,
          revenue: Math.round((dayMap.get(day)?.revenue || 0) * 100) / 100,
          transactions: dayMap.get(day)?.transactions || 0,
        }));

      // Top Performers
      const bestDay = dayAnalysis.length > 0
        ? dayAnalysis.reduce((max, d) => d.revenue > max.revenue ? d : max).day
        : 'N/A';

      const bestMonth = monthlyTrends.length > 0
        ? monthlyTrends.reduce((max, m) => m.totalSales > max.totalSales ? m : max).month
        : 'N/A';

      // Generate last year's monthly trends for YoY comparison
      const lastYearMonthlyTrendsMap = new Map<string, { totalSales: number; netSales: number }>();
      allSales.forEach(sale => {
        const saleDate = new Date(sale.date);
        const saleYear = saleDate.getFullYear();
        if (saleYear === currentYear - 1) {
          const monthKey = saleDate.toLocaleDateString('en-US', { month: 'short' });
          const existing = lastYearMonthlyTrendsMap.get(monthKey) || { totalSales: 0, netSales: 0 };
          lastYearMonthlyTrendsMap.set(monthKey, {
            totalSales: existing.totalSales + parseFloat(sale.totalSales),
            netSales: existing.netSales + parseFloat(sale.netSales),
          });
        }
      });

      // Merge current year and last year trends for chart comparison
      const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const combinedMonthlyTrends = monthOrder.map(month => {
        const currentYearData = monthlyTrends.find(m => m.month.startsWith(month));
        const lastYearData = lastYearMonthlyTrendsMap.get(month);
        return {
          month,
          currentYearSales: currentYearData?.netSales || 0,
          lastYearSales: lastYearData?.netSales || 0,
          currentYearTotal: currentYearData?.totalSales || 0,
          lastYearTotal: lastYearData?.totalSales || 0,
        };
      });

      // Find best single day (date) in current year
      const currentYearSalesOnly = allSales.filter(s => s.date.startsWith(String(currentYear)));
      const dateTotals = currentYearSalesOnly.reduce((acc, sale) => {
        const date = sale.date;
        if (!acc[date]) acc[date] = 0;
        acc[date] += parseFloat(sale.netSales);
        return acc;
      }, {} as Record<string, number>);
      
      const bestSingleDay = Object.entries(dateTotals).length > 0
        ? Object.entries(dateTotals).sort(([, a], [, b]) => b - a)[0]
        : null;

      res.json({
        summary: {
          totalRevenue: currentMonthRevenue,
          momGrowth,
          avgTransaction,
          totalTransactions: currentMonthSales.length,
        },
        // CFO-Level Metrics
        cfoMetrics: {
          ytdRevenue,
          ytdTransactions,
          annualTarget,
          monthlyTarget,
          projectedMonthEnd,
          projectedAnnual,
          monthlyTargetPercent,
          annualTargetPercent,
          yoyMonthGrowth,
          yoyYtdGrowth,
          dailyAverage,
          daysElapsedMonth,
          daysInMonth,
          daysElapsedYear,
          sameMonthLastYear,
          ytdLastYear,
          bestSingleDay: bestSingleDay ? { date: bestSingleDay[0], total: bestSingleDay[1] } : null,
        },
        monthlyTrends,
        combinedMonthlyTrends,
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
    console.log('📊 Adding new sale:', JSON.stringify(req.body));
    try {
      const validatedData = insertDailySalesSchema.parse(req.body);
      const userId = (req.user as any).claims.sub;
      console.log('✅ Validated sale data:', JSON.stringify(validatedData));

      // Calculate day of week from date
      const date = new Date(validatedData.date);
      const rawDayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });
      const dayOfWeek = normalizeDayOfWeek(rawDayOfWeek);

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

      console.log('✅ Sale saved successfully:', JSON.stringify(newSale));
      res.json(newSale);
    } catch (error) {
      console.error("Error adding sale:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromError(error).toString() });
      }
      res.status(500).json({ message: "Failed to add sale record" });
    }
  });

  // Update an existing daily sale
  app.patch('/api/admin/sales/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertDailySalesSchema.parse(req.body);

      // Parse numeric fields and recalculate totalSales
      const netSales = parseFloat(validatedData.netSales);
      const otherSales = validatedData.otherSales ? parseFloat(validatedData.otherSales) : 0;
      const grabFee = validatedData.grabFee ? parseFloat(validatedData.grabFee) : 0;
      const totalSales = netSales + otherSales;

      // Calculate day of week from date if date is being updated
      const date = new Date(validatedData.date);
      const rawDayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });
      const dayOfWeek = normalizeDayOfWeek(rawDayOfWeek);

      const [updatedSale] = await db.update(dailySales)
        .set({
          date: validatedData.date,
          orderChannel: validatedData.orderChannel,
          netSales: netSales.toFixed(2),
          otherSales: otherSales.toFixed(2),
          grabFee: grabFee.toFixed(2),
          totalSales: totalSales.toFixed(2),
          dayOfWeek,
          importedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(dailySales.id, id))
        .returning();

      if (!updatedSale) {
        return res.status(404).json({ message: "Sale record not found" });
      }

      res.json(updatedSale);
    } catch (error) {
      console.error("Error updating sale:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromError(error).toString() });
      }
      res.status(500).json({ message: "Failed to update sale record" });
    }
  });

  // Delete a daily sale
  app.delete('/api/admin/sales/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      const [deletedSale] = await db.delete(dailySales)
        .where(eq(dailySales.id, id))
        .returning();

      if (!deletedSale) {
        return res.status(404).json({ message: "Sale record not found" });
      }

      res.json({ message: "Sale deleted successfully", sale: deletedSale });
    } catch (error) {
      console.error("Error deleting sale:", error);
      res.status(500).json({ message: "Failed to delete sale record" });
    }
  });

  // Generate sales report for date range
  app.get('/api/admin/sales/report', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start and end dates are required" });
      }
      
      console.log(`📊 Generating report for ${startDate} to ${endDate}`);
      
      // Fetch sales in date range
      const sales = await db.select().from(dailySales)
        .where(sql`${dailySales.date} >= ${startDate} AND ${dailySales.date} <= ${endDate}`)
        .orderBy(sql`${dailySales.date} DESC`);
      
      // Calculate summary metrics
      const totalNetSales = sales.reduce((sum, s) => sum + parseFloat(s.netSales), 0);
      const totalOtherSales = sales.reduce((sum, s) => sum + parseFloat(s.otherSales || '0'), 0);
      const totalSales = sales.reduce((sum, s) => sum + parseFloat(s.totalSales), 0);
      const transactionCount = sales.length;
      const avgTransaction = transactionCount > 0 ? totalNetSales / transactionCount : 0;
      
      // Channel breakdown
      const channelMap = new Map<string, { revenue: number; count: number }>();
      sales.forEach(sale => {
        const existing = channelMap.get(sale.orderChannel) || { revenue: 0, count: 0 };
        channelMap.set(sale.orderChannel, {
          revenue: existing.revenue + parseFloat(sale.netSales),
          count: existing.count + 1,
        });
      });
      const channelBreakdown = Array.from(channelMap.entries())
        .map(([channel, data]) => ({
          channel,
          revenue: Math.round(data.revenue * 100) / 100,
          count: data.count,
        }))
        .sort((a, b) => b.revenue - a.revenue);
      
      // Day of week breakdown
      const dayMap = new Map<string, { revenue: number; count: number }>();
      sales.forEach(sale => {
        const day = normalizeDayOfWeek(sale.dayOfWeek || '');
        if (day) {
          const existing = dayMap.get(day) || { revenue: 0, count: 0 };
          dayMap.set(day, {
            revenue: existing.revenue + parseFloat(sale.netSales),
            count: existing.count + 1,
          });
        }
      });
      const dayBreakdown = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({
        day,
        revenue: Math.round((dayMap.get(day)?.revenue || 0) * 100) / 100,
        count: dayMap.get(day)?.count || 0,
      }));
      
      res.json({
        startDate,
        endDate,
        summary: {
          totalNetSales: Math.round(totalNetSales * 100) / 100,
          totalOtherSales: Math.round(totalOtherSales * 100) / 100,
          totalSales: Math.round(totalSales * 100) / 100,
          transactionCount,
          avgTransaction: Math.round(avgTransaction * 100) / 100,
        },
        channelBreakdown,
        dayBreakdown,
        transactions: sales.map(s => ({
          id: s.id,
          date: s.date,
          channel: s.orderChannel,
          netSales: parseFloat(s.netSales),
          otherSales: parseFloat(s.otherSales || '0'),
          totalSales: parseFloat(s.totalSales),
          dayOfWeek: s.dayOfWeek,
        })),
      });
    } catch (error: any) {
      console.error("Error generating report:", error);
      res.status(500).json({ message: "Failed to generate report", error: error.message });
    }
  });

  // Validate that day-of-week totals match YTD total
  app.get('/api/admin/sales/validate-totals', isAuthenticated, isAdmin, async (req, res) => {
    console.log('🔍 Validating sales totals...');
    try {
      const currentYear = new Date().getFullYear();
      const startOfYear = `${currentYear}-01-01`;
      
      // Get all sales for YTD
      const allSales = await db.select().from(dailySales)
        .where(sql`${dailySales.date} >= ${startOfYear}`);
      
      // Calculate YTD total
      const ytdTotal = allSales.reduce((sum, sale) => sum + parseFloat(sale.totalSales), 0);
      const ytdRounded = Math.round(ytdTotal * 100) / 100;
      
      // Calculate day-of-week breakdown
      const dayMap = new Map<string, number>();
      allSales.forEach(sale => {
        const day = normalizeDayOfWeek(sale.dayOfWeek || '');
        if (day) {
          dayMap.set(day, (dayMap.get(day) || 0) + parseFloat(sale.totalSales));
        }
      });
      
      // Sum of all days
      let daySum = 0;
      const dayBreakdown: Record<string, number> = {};
      ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(day => {
        const amount = Math.round((dayMap.get(day) || 0) * 100) / 100;
        dayBreakdown[day] = amount;
        daySum += amount;
      });
      daySum = Math.round(daySum * 100) / 100;
      
      // Count records missing day_of_week
      const missingDayCount = allSales.filter(s => !s.dayOfWeek || s.dayOfWeek.trim() === '').length;
      
      const difference = Math.round((ytdRounded - daySum) * 100) / 100;
      const isValid = Math.abs(difference) < 0.01 && missingDayCount === 0;
      
      console.log(`✅ YTD: ฿${ytdRounded}, Day Sum: ฿${daySum}, Diff: ฿${difference}, Missing: ${missingDayCount}`);
      
      res.json({
        success: true,
        isValid,
        ytdTotal: ytdRounded,
        daySum,
        difference,
        missingDayOfWeek: missingDayCount,
        totalRecords: allSales.length,
        dayBreakdown,
        message: isValid 
          ? `All totals match! YTD ฿${ytdRounded.toLocaleString('en-US', { minimumFractionDigits: 2 })} = Day totals ฿${daySum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
          : missingDayCount > 0
            ? `${missingDayCount} records missing day-of-week. Click "Fix Data" first.`
            : `Mismatch: YTD ฿${ytdRounded.toLocaleString()} vs Days ฿${daySum.toLocaleString()} (diff: ฿${difference})`
      });
    } catch (error: any) {
      console.error("Error validating totals:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to validate totals",
        error: error.message 
      });
    }
  });

  // Fix missing day_of_week values (one-time data repair)
  app.post('/api/admin/sales/fix-day-of-week', isAuthenticated, isAdmin, async (req, res) => {
    console.log('🔧 Starting day_of_week fix...');
    try {
      // Find all records with missing day_of_week
      const recordsToFix = await db.select()
        .from(dailySales)
        .where(sql`${dailySales.dayOfWeek} IS NULL OR ${dailySales.dayOfWeek} = ''`);
      
      console.log(`📊 Found ${recordsToFix.length} records with missing day_of_week`);
      
      if (recordsToFix.length === 0) {
        return res.json({ 
          success: true, 
          message: "No records need fixing - all day_of_week values are already set!",
          fixed: 0 
        });
      }

      let fixedCount = 0;
      const errors: string[] = [];

      for (const record of recordsToFix) {
        try {
          // Calculate day of week from date
          const date = new Date(record.date + 'T00:00:00Z');
          const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
          const normalizedDay = normalizeDayOfWeek(dayOfWeek);
          
          // Update the record
          await db.update(dailySales)
            .set({ dayOfWeek: normalizedDay })
            .where(eq(dailySales.id, record.id));
          
          fixedCount++;
        } catch (err: any) {
          errors.push(`Failed to fix record ${record.id}: ${err.message}`);
        }
      }

      console.log(`✅ Fixed ${fixedCount} records`);
      
      res.json({ 
        success: true, 
        message: `Successfully fixed ${fixedCount} of ${recordsToFix.length} records`,
        fixed: fixedCount,
        total: recordsToFix.length,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error: any) {
      console.error("Error fixing day_of_week:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to fix day_of_week values",
        error: error.message 
      });
    }
  });

  // Import daily sales from Excel file
  app.post('/api/admin/import-sales-excel', isAuthenticated, isAdmin, upload.single('file'), async (req, res) => {
    console.log('📊 Excel import request received');
    console.log('📁 File info:', req.file ? `${req.file.originalname} (${req.file.size} bytes)` : 'No file');
    
    try {
      if (!req.file) {
        console.error('❌ No file uploaded');
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Get admin user ID for tracking imports
      const userId = (req.user as any).claims.sub;
      console.log('👤 Importing as user:', userId);

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
        console.log(`📄 Processing sheet: ${sheetName}`);
        const worksheet = workbook.Sheets[sheetName];
        // Keep raw: true (default) to preserve Excel serial dates as numbers
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        console.log(`📊 Found ${jsonData.length} rows in sheet ${sheetName}`);

        for (const rawRow of jsonData as any[]) {
          try {
            // Check if this is a header row (contains text "Date" or "Order Channel")
            const firstCell = rawRow['__EMPTY'] || rawRow['__EMPTY_1'] || '';
            if (typeof firstCell === 'string' && (firstCell === 'Date' || firstCell === 'Order Channel')) {
              console.log(`⏭️  Skipping header row`);
              continue;
            }

            // Handle both named columns and __EMPTY columns (for files without headers)
            // Map __EMPTY columns to their actual meaning based on position
            const dateValue = rawRow['Date'] || rawRow['date'] || rawRow['__EMPTY_1'];
            const orderChannel = (rawRow['Order Channel'] || rawRow['order_channel'] || rawRow['__EMPTY_2'] || '').toString().trim();
            const rawDayOfWeek = (rawRow['Day'] || rawRow['day'] || rawRow['__EMPTY'] || rawRow[''] || '').toString().trim();
            
            // Skip weekly total rows (they don't have a date in proper format)
            if (!dateValue || typeof dateValue !== 'number') {
              console.log(`⏭️  Skipping row - invalid date:`, { dateValue, orderChannel });
              continue;
            }

            // Convert Excel serial date to YYYY-MM-DD
            // Excel dates are stored as days since 1900-01-01 (with a leap year bug at 1900)
            const excelEpoch = new Date(1899, 11, 30); // Dec 30, 1899
            const jsDate = new Date(excelEpoch.getTime() + (dateValue * 86400000));
            const date = jsDate.toISOString().split('T')[0];
            
            // Extract data - handle both __EMPTY columns and named columns
            const dayOfWeek = normalizeDayOfWeek(rawDayOfWeek);
            
            // Net Sales can be in __EMPTY_3 or __EMPTY_4 (there are duplicate columns)
            const netSalesRaw = rawRow['Net Sales'] || rawRow['net_sales'] || rawRow['__EMPTY_3'] || rawRow['__EMPTY_4'] || 0;
            const netSales = parseNumeric(netSalesRaw);
            
            // Total Sales is in __EMPTY_5
            const totalSalesRaw = rawRow['Total Sales'] || rawRow['total_sales'] || rawRow['__EMPTY_5'] || 0;
            const totalSales = parseNumeric(totalSalesRaw);
            
            // Grab Fee if available
            const grabFee = parseNumeric(rawRow['Grab Fee'] || rawRow['grab_fee'] || rawRow['grab'] || 0);

            // Skip invalid rows (only skip if no order channel - allow zero sales)
            if (!orderChannel || orderChannel === '') {
              console.log(`⏭️  Skipping row - no order channel:`, { date, orderChannel, netSales, totalSales });
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

  // ============================================
  // EMAIL ASSET ROUTES
  // ============================================

  // Get presigned URL for email asset upload
  app.post('/api/admin/email-assets/upload-url', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { filename } = req.body;
      const objectStorageService = new ObjectStorageService();
      const result = await objectStorageService.getEmailAssetUploadURL(filename);
      res.json(result);
    } catch (error) {
      console.error("Error generating email asset upload URL:", error);
      res.status(500).json({ message: "Failed to generate upload URL" });
    }
  });

  // Set ACL policy after email asset upload
  app.post('/api/admin/email-assets/set-acl', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { assetPath } = req.body;
      if (!assetPath) {
        return res.status(400).json({ message: "Asset path is required" });
      }

      const objectStorageService = new ObjectStorageService();
      const url = await objectStorageService.setEmailAssetAclPolicy(assetPath);
      res.json({ url });
    } catch (error) {
      console.error("Error setting email asset ACL:", error);
      res.status(500).json({ message: "Failed to set asset ACL" });
    }
  });

  // List all email assets
  app.get('/api/admin/email-assets', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const assets = await objectStorageService.listEmailAssets();
      res.json(assets);
    } catch (error) {
      console.error("Error listing email assets:", error);
      res.status(500).json({ message: "Failed to list email assets" });
    }
  });

  // Serve email assets (public proxy)
  app.get('/email-assets/:filePath', async (req, res) => {
    try {
      const { filePath } = req.params;
      const objectStorageService = new ObjectStorageService();
      const file = await objectStorageService.searchPublicObject(`email-assets/${filePath}`);
      
      if (!file) {
        return res.status(404).json({ message: "Asset not found" });
      }

      const canAccess = await objectStorageService.canAccessPublicObject(file);
      if (!canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      await objectStorageService.downloadObject(file, res, 86400);
    } catch (error) {
      console.error("Error serving email asset:", error);
      res.status(500).json({ message: "Failed to serve asset" });
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
          // Be forgiving: if points is invalid, default to 0 and continue importing the customer
          if (validData.points !== undefined && validData.points.trim()) {
            const pointsNum = Number(validData.points.trim());
            if (Number.isFinite(pointsNum) && Number.isInteger(pointsNum)) {
              normalized.points = pointsNum;
            } else if (Number.isFinite(pointsNum)) {
              // Fractional points - round to nearest integer
              console.warn(`Fractional points for ${validData.phone}: "${validData.points}" - rounding to ${Math.round(pointsNum)}`);
              normalized.points = Math.round(pointsNum);
            } else {
              // Invalid points (date, text, etc.) - default to 0 and continue
              console.warn(`Invalid points for ${validData.phone}: "${validData.points}" - defaulting to 0`);
              normalized.points = 0;
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

          // Normalize tier (case insensitive) with validation and mapping
          if (validData.tier?.trim()) {
            const tierValue = validData.tier.toLowerCase().trim();
            
            // Valid tier values
            const validTiers = ['bronze', 'silver', 'gold', 'platinum'];
            
            // Map common CSV tier names to valid tiers
            const tierMappings: Record<string, string> = {
              'member': 'bronze',
              'new': 'bronze',
              'regular': 'bronze',
              'basic': 'bronze',
              'standard': 'bronze',
              'vip': 'gold',
              'premium': 'platinum',
            };
            
            if (validTiers.includes(tierValue)) {
              normalized.tier = tierValue;
            } else if (tierMappings[tierValue]) {
              normalized.tier = tierMappings[tierValue];
            } else if (/^0[0-9]{9,}$/.test(tierValue)) {
              // This looks like a phone number - data corruption, use default
              console.warn(`Tier value looks like phone number, defaulting to bronze: ${tierValue}`);
              normalized.tier = 'bronze';
            } else {
              // Unknown tier value - default to bronze
              console.warn(`Unknown tier value "${tierValue}", defaulting to bronze`);
              normalized.tier = 'bronze';
            }
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

  // Clean up invalid email values (admin only)
  app.post('/api/admin/customers/cleanup-emails', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const result = await db.execute(sql`
        UPDATE customers 
        SET email = NULL 
        WHERE email IN ('Male', 'Female', 'male', 'female', 'Anonymous')
        OR (email IS NOT NULL AND email != '' AND email NOT LIKE '%@%' AND email NOT LIKE '%@%')
      `);
      
      res.json({
        success: true,
        message: "Email cleanup completed",
        rowsAffected: result.rowCount || 0
      });
    } catch (error) {
      console.error("Error cleaning up emails:", error);
      res.status(500).json({ message: "Failed to clean up emails" });
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

  // Get templates by channel (email or line)
  app.get('/api/admin/message-templates/channel/:channel', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const templates = await storage.getMessageTemplatesByChannel(req.params.channel);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates by channel:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  // Get template by key
  app.get('/api/admin/message-templates/key/:key', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const template = await storage.getMessageTemplateByKey(req.params.key);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching template by key:", error);
      res.status(500).json({ message: "Failed to fetch template" });
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

  // Seed default birthday templates
  app.post('/api/admin/message-templates/seed-defaults', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const existingTemplates = await storage.getAllMessageTemplates();
      const hasBirthdayTemplates = existingTemplates.some(t => t.type === 'birthday');

      if (hasBirthdayTemplates) {
        return res.json({ 
          message: "Default templates already exist", 
          created: 0 
        });
      }

      // Create default birthday templates
      const templates = [
        {
          name: "Birthday Greeting (Thai - SMS)",
          type: "birthday",
          channel: "sms",
          subject: null,
          message: "สุขสันต์วันเกิด {name}! 🎂\nรับส่วนลด 20% วันนี้เท่านั้น\nคุณมี {points} แต้มสะสม!",
          isDefault: true,
        },
        {
          name: "Birthday Greeting (Thai - LINE)",
          type: "birthday",
          channel: "line",
          subject: null,
          message: "🎉 สุขสันต์วันเกิด {name}! 🎂\n\nขอให้มีความสุขมากๆในวันพิเศษของคุณ!\n\n🎁 รับของขวัญพิเศษ: ส่วนลด 20% วันนี้เท่านั้น!\n⭐ คุณมี {points} แต้มสะสมแล้ว\n👑 สมาชิกระดับ {tier}\n\nมาเฉลิมฉลองกับเรา Yens Thai Ice Cream! 🍦",
          isDefault: false,
        },
        {
          name: "Birthday Greeting (English - SMS)",
          type: "birthday",
          channel: "sms",
          subject: null,
          message: "Happy Birthday {name}! 🎉\nEnjoy 20% OFF today!\nYou have {points} points!",
          isDefault: false,
        },
        {
          name: "Birthday Greeting (English - LINE)",
          type: "birthday",
          channel: "line",
          subject: null,
          message: "🎉 Happy Birthday {name}! 🎂\n\nWishing you a wonderful day filled with joy!\n\n🎁 Special Gift: 20% OFF today only!\n⭐ You have {points} loyalty points\n👑 {tier} member\n\nCelebrate with Yens Thai Ice Cream! 🍦",
          isDefault: false,
        },
        {
          name: "Birthday Greeting (English - Email)",
          type: "birthday",
          channel: "email",
          subject: "🎂 Happy Birthday from Yens Thai Ice Cream!",
          message: "Dear {name},\n\nHappy Birthday! 🎉\n\nWe're thrilled to celebrate your special day with you!\n\nAs our valued {tier} member with {points} loyalty points, we'd like to offer you a special birthday gift:\n\n🎁 20% OFF your entire purchase today!\n\nVisit any Yens location and mention this birthday offer. Valid for today only.\n\nThank you for being part of the Yens family!\n\nBest wishes,\nYens Thai Ice Cream Team 🍦",
          isDefault: false,
        },
      ];

      const created = await Promise.all(
        templates.map(template => storage.createMessageTemplate(template))
      );

      res.json({ 
        message: "Default birthday templates created successfully", 
        created: created.length,
        templates: created
      });
    } catch (error) {
      console.error("Error seeding default templates:", error);
      res.status(500).json({ message: "Failed to seed default templates" });
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
      
      // Calculate today's stats (Bangkok timezone)
      const now = new Date();
      const bangkokOffset = 7 * 60 * 60 * 1000; // UTC+7
      const bangkokNow = new Date(now.getTime() + bangkokOffset);
      const todayStart = new Date(bangkokNow);
      todayStart.setHours(0, 0, 0, 0);
      const todayStartUTC = new Date(todayStart.getTime() - bangkokOffset);
      
      const todayLogs = logs.filter(l => {
        const sentAt = l.sentAt ? new Date(l.sentAt) : new Date(l.createdAt);
        return sentAt >= todayStartUTC;
      });
      
      const stats = {
        total: logs.length,
        sent: logs.filter(l => l.status === 'sent').length,
        delivered: logs.filter(l => l.status === 'delivered').length,
        failed: logs.filter(l => l.status === 'failed').length,
        pending: logs.filter(l => l.status === 'pending').length,
        smsCount: logs.filter(l => l.channel === 'sms').length,
        emailCount: logs.filter(l => l.channel === 'email').length,
        lineCount: logs.filter(l => l.channel === 'line').length,
        // Today's stats
        todayTotal: todayLogs.length,
        todaySent: todayLogs.filter(l => l.status === 'sent').length,
        todayFailed: todayLogs.filter(l => l.status === 'failed').length,
        todayEmail: todayLogs.filter(l => l.channel === 'email').length,
        todaySms: todayLogs.filter(l => l.channel === 'sms').length,
        todayLine: todayLogs.filter(l => l.channel === 'line').length,
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
      let targetCustomers: any[] = [];
      
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
      } else if (recipientType === 'birthday_today' || recipientType === 'birthday_week') {
        // Get customers with birthdays today or this week
        const allCustomers = await storage.getAllCustomers();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayMonth = today.getMonth() + 1;
        const todayDay = today.getDate();
        
        // Week range calculation
        const dayOfWeek = today.getDay();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - dayOfWeek);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        
        targetCustomers = allCustomers.filter(customer => {
          if (!customer.birthday) return false;
          
          try {
            const birthdayStr = customer.birthday.toString().trim();
            let birthMonth: number = 0, birthDay: number = 0;
            
            if (birthdayStr.includes('-')) {
              const parts = birthdayStr.split('-');
              if (parts.length === 2) {
                birthMonth = parseInt(parts[0], 10);
                birthDay = parseInt(parts[1], 10);
              } else if (parts.length === 3) {
                birthMonth = parseInt(parts[1], 10);
                birthDay = parseInt(parts[2], 10);
              }
            } else if (birthdayStr.includes('/')) {
              const parts = birthdayStr.split('/');
              if (parts.length === 2) {
                birthMonth = parseInt(parts[0], 10);
                birthDay = parseInt(parts[1], 10);
              } else if (parts.length === 3) {
                if (parts[0].length === 4) {
                  birthMonth = parseInt(parts[1], 10);
                  birthDay = parseInt(parts[2], 10);
                } else {
                  birthMonth = parseInt(parts[0], 10);
                  birthDay = parseInt(parts[1], 10);
                }
              }
            } else if (!isNaN(Date.parse(birthdayStr))) {
              const parsedDate = new Date(birthdayStr);
              birthMonth = parsedDate.getMonth() + 1;
              birthDay = parsedDate.getDate();
            }
            
            if (!birthMonth || !birthDay || isNaN(birthMonth) || isNaN(birthDay)) return false;
            
            if (recipientType === 'birthday_today') {
              return birthMonth === todayMonth && birthDay === todayDay;
            } else {
              const thisYearBirthday = new Date(today.getFullYear(), birthMonth - 1, birthDay);
              thisYearBirthday.setHours(0, 0, 0, 0);
              return thisYearBirthday >= weekStart && thisYearBirthday <= weekEnd;
            }
          } catch (e) {
            return false;
          }
        });
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

          // Replace merge fields with customer data
          const personalizedMessage = message
            .replace(/\{name\}/g, customer.name)
            .replace(/\{points\}/g, customer.points.toString())
            .replace(/\{tier\}/g, customer.tier);
          
          const personalizedSubject = subject
            ? subject
                .replace(/\{name\}/g, customer.name)
                .replace(/\{points\}/g, customer.points.toString())
                .replace(/\{tier\}/g, customer.tier)
            : null;

          // For app channel, create notification
          if (channel === 'app') {
            // Create a promotion to represent the app notification
            const promotion = await storage.createPromotion({
              title: personalizedSubject || 'Message',
              message: personalizedMessage,
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
              subject: personalizedSubject || null,
              message: personalizedMessage,
              status: 'sent',
              externalId: promotion.id,
              errorMessage: null,
            });

            return { success: true, channel: 'app', customer: customer.name };
          }

          // For SMS channel
          if (channel === 'sms' && customer.phone) {
            const smsResult = await sendSMS(customer.phone, personalizedMessage);
            
            await storage.createMessageLog({
              customerId: customer.id,
              templateId: null,
              channel: 'sms',
              recipient: customer.phone,
              subject: null,
              message: personalizedMessage,
              status: smsResult.success ? 'sent' : 'failed',
              externalId: smsResult.messageId || null,
              errorMessage: smsResult.error || null,
            });

            return { success: smsResult.success, channel: 'sms', customer: customer.name };
          }

          // For email channel
          if (channel === 'email' && customer.email) {
            const emailSubject = personalizedSubject || 'Message from Yens Thai Ice Cream';
            
            // Detect if message contains HTML (starts with HTML tag or contains common HTML elements)
            const isHtmlContent = personalizedMessage.trim().startsWith('<') || 
              /<(div|table|html|body|head|style|img|a|span|p|br|h[1-6]|ul|ol|li)\b/i.test(personalizedMessage);
            
            // Use appropriate email function based on content type
            const emailResult = isHtmlContent 
              ? await sendHtmlEmail(customer.email, emailSubject, personalizedMessage)
              : await sendEmail(customer.email, emailSubject, personalizedMessage);
            
            await storage.createMessageLog({
              customerId: customer.id,
              templateId: null,
              channel: 'email',
              recipient: customer.email,
              subject: emailSubject,
              message: personalizedMessage,
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
          
          // Detect if message contains HTML
          const isHtmlContent = messageLog.message.trim().startsWith('<') || 
            /<(div|table|html|body|head|style|img|a|span|p|br|h[1-6]|ul|ol|li)\b/i.test(messageLog.message);
          
          const emailResult = isHtmlContent
            ? await sendHtmlEmail(messageLog.recipient, subject, messageLog.message)
            : await sendEmail(messageLog.recipient, subject, messageLog.message);
          
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

  // Send LINE messages (admin only)
  app.post('/api/admin/messages/send-line', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { recipientType, tier, customerIds, message } = req.body;

      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      // Validate message length (LINE limit is 5,000 characters)
      if (message.length > 5000) {
        return res.status(400).json({ message: "Message exceeds LINE's 5,000 character limit" });
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

      // Filter to only customers with LINE UIDs
      const customersWithLine = targetCustomers.filter(c => c && c.lineUid);

      if (customersWithLine.length === 0) {
        return res.status(400).json({ message: "No customers found with LINE accounts" });
      }

      // Send LINE messages to all target customers with LINE UIDs
      const results = [];
      let skipped = 0;

      for (const customer of customersWithLine) {
        // Double-check customer has lineUid (defense in depth)
        if (!customer || !customer.lineUid) {
          console.warn(`Skipping customer ${customer?.id} - missing LINE UID`);
          skipped++;
          continue;
        }

        try {
          const lineResult = await sendLineMessage(customer.lineUid, message);
          
          await storage.createMessageLog({
            customerId: customer.id,
            templateId: null,
            channel: 'line',
            recipient: customer.lineUid,
            subject: null,
            message: message,
            status: lineResult.success ? 'sent' : 'failed',
            externalId: lineResult.messageId || null,
            errorMessage: lineResult.error || null,
          });

          results.push({ 
            success: lineResult.success, 
            channel: 'line', 
            customer: customer.name 
          });
        } catch (error) {
          console.error(`Error sending LINE message to ${customer.name}:`, error);
          results.push({ 
            success: false, 
            channel: 'line', 
            customer: customer.name 
          });
        }
      }

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      res.json({
        success: true,
        sent: successful,
        failed: failed,
        skipped: skipped,
        total: customersWithLine.length,
      });
    } catch (error) {
      console.error("Error sending LINE messages:", error);
      res.status(500).json({ message: "Failed to send LINE messages" });
    }
  });

  // ============================================
  // Scheduled Messages
  // ============================================

  // Get all scheduled messages
  app.get('/api/admin/messages/scheduled', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const messages = await storage.getScheduledMessages();
      res.json(messages);
    } catch (error) {
      console.error("Error fetching scheduled messages:", error);
      res.status(500).json({ message: "Failed to fetch scheduled messages" });
    }
  });

  // Create a scheduled message
  app.post('/api/admin/messages/schedule', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.user?.id;
      const { channel, recipientType, tier, customerIds, subject, message, scheduledFor, timezone } = req.body;

      if (!channel || !recipientType || !message || !scheduledFor) {
        return res.status(400).json({ message: "Missing required fields: channel, recipientType, message, scheduledFor" });
      }

      // Validate email subject
      if (channel === 'email' && !subject) {
        return res.status(400).json({ message: "Email subject is required" });
      }

      // Validate recipient configuration
      if (recipientType === 'tier' && !tier) {
        return res.status(400).json({ message: "Tier is required when recipient type is 'tier'" });
      }
      if (recipientType === 'individual' && (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0)) {
        return res.status(400).json({ message: "Customer IDs are required when recipient type is 'individual'" });
      }

      // Parse scheduled time
      const scheduledDate = new Date(scheduledFor);
      if (isNaN(scheduledDate.getTime())) {
        return res.status(400).json({ message: "Invalid scheduled date" });
      }

      // Scheduled time must be in the future
      if (scheduledDate <= new Date()) {
        return res.status(400).json({ message: "Scheduled time must be in the future" });
      }

      const scheduledMessage = await storage.createScheduledMessage({
        channel,
        recipientType,
        recipientTier: tier || null,
        recipientIds: customerIds || null,
        templateId: null,
        subject: subject || null,
        message,
        scheduledFor: scheduledDate,
        timezone: timezone || 'Asia/Bangkok',
        status: 'pending',
        createdBy: userId || null,
      });

      res.json({ success: true, scheduledMessage });
    } catch (error) {
      console.error("Error scheduling message:", error);
      res.status(500).json({ message: "Failed to schedule message" });
    }
  });

  // Cancel a scheduled message
  app.post('/api/admin/messages/scheduled/:id/cancel', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      const existingMessage = await storage.getScheduledMessage(id);
      if (!existingMessage) {
        return res.status(404).json({ message: "Scheduled message not found" });
      }
      
      if (existingMessage.status !== 'pending') {
        return res.status(400).json({ message: "Can only cancel pending messages" });
      }

      const cancelled = await storage.cancelScheduledMessage(id);
      res.json({ success: true, scheduledMessage: cancelled });
    } catch (error) {
      console.error("Error cancelling scheduled message:", error);
      res.status(500).json({ message: "Failed to cancel scheduled message" });
    }
  });

  // ============================================
  // LINE Webhook - Customer auto-linking
  // ============================================

  // LINE Webhook test endpoint (for debugging)
  app.get('/api/line/webhook', (req, res) => {
    console.log('🔍 LINE webhook GET test accessed');
    res.json({ 
      status: 'ok', 
      message: 'LINE webhook endpoint is reachable',
      timestamp: new Date().toISOString()
    });
  });

  // LINE Webhook endpoint (public - called by LINE Platform)
  app.post('/api/line/webhook', async (req, res) => {
    try {
      // Immediate logging - this MUST appear for any request
      console.log('📥 ========== LINE WEBHOOK RECEIVED ==========');
      console.log('📥 Headers:', JSON.stringify(req.headers, null, 2));
      console.log('📥 Body:', JSON.stringify(req.body, null, 2));
      console.log('📥 =============================================');
      
      const body = req.body as LineWebhookBody;
      
      // Handle LINE verification request (empty events array) - respond 200 OK immediately
      // LINE sends this to verify the webhook URL is working
      if (!body.events || body.events.length === 0) {
        console.log('✅ LINE webhook verification - empty events, responding OK');
        return res.status(200).json({ message: 'OK' });
      }
      
      // For actual events, verify signature
      const signature = req.headers['x-line-signature'] as string;
      
      if (!signature) {
        console.warn('⚠️ LINE webhook: Missing signature');
        return res.status(401).json({ message: 'Missing signature' });
      }

      // Get raw body - try multiple sources
      let rawBody = (req as any).rawBody;
      
      // Fallback: if rawBody not captured, use stringified body
      if (!rawBody && req.body) {
        rawBody = JSON.stringify(req.body);
        console.log('📝 Using stringified body as fallback');
      }
      
      if (!rawBody) {
        console.error('❌ LINE webhook: Raw body not captured');
        return res.status(500).json({ message: 'Raw body not available' });
      }

      console.log(`📝 Raw body length: ${rawBody.length}, Signature: ${signature.substring(0, 20)}...`);

      if (!verifyLineSignature(rawBody, signature)) {
        console.warn('⚠️ LINE webhook: Invalid signature');
        console.log('📝 Body preview:', rawBody.substring(0, 100));
        return res.status(401).json({ message: 'Invalid signature' });
      }

      console.log('✅ LINE signature verified');

      // Process each event
      for (const event of body.events) {
        const lineUserId = event.source?.userId;
        
        if (!lineUserId) {
          console.log('⚠️ Event without userId, skipping');
          continue;
        }

        console.log(`📩 LINE event: ${event.type} from ${lineUserId}`);

        // Handle follow event (customer adds bot as friend)
        if (event.type === 'follow') {
          try {
            // Get LINE profile
            const profile = await getLineProfile(lineUserId);
            console.log(`👤 LINE profile: ${profile.displayName}`);

            // Check if customer already exists with this LINE UID
            const allCustomers = await storage.getAllCustomers();
            const existingByLine = allCustomers.find(c => c.lineUid === lineUserId);

            if (existingByLine) {
              console.log(`✅ Customer already linked: ${existingByLine.name}`);
              
              // Send beautiful welcome back Flex Message
              if ('replyToken' in event && event.replyToken) {
                await replyLineTemplatedMessage(
                  event.replyToken,
                  'welcome',
                  {
                    customerName: existingByLine.name,
                    points: existingByLine.points
                  }
                );
              }
            } else {
              // Send instructions to link account (plain text for simplicity)
              if ('replyToken' in event && event.replyToken) {
                await replyLineMessage(
                  event.replyToken,
                  `🍦 สวัสดี! ยินดีต้อนรับสู่ Yens Thai Ice Cream!\n\nเชื่อมต่อบัญชีเพื่อรับ 50 คะแนนโบนัส!\n\n📱 วิธีที่ 1: คัดลอกรหัส LINK-XXXX จากแอพลูกค้าแล้วส่งมาที่นี่\n\n📞 วิธีที่ 2: ส่งเบอร์โทรศัพท์ของคุณ\nตัวอย่าง: 0812345678`
                );
              }
            }
          } catch (error) {
            console.error('❌ Error handling follow event:', error);
          }
        }

        // Handle message event (customer sends a message)
        if (event.type === 'message' && event.message.type === 'text') {
          const messageText = event.message.text.trim();
          
          // Check if message is a linking code (format: LINK-XXXX)
          const linkCodeMatch = messageText.toUpperCase().match(/^LINK-([A-Z0-9]{4})$/);
          
          if (linkCodeMatch) {
            const fullCode = `LINK-${linkCodeMatch[1]}`;
            const customerId = await validateLinkingCode(fullCode);
            
            if (customerId) {
              try {
                const customer = await storage.getCustomer(customerId);
                if (customer) {
                  // Link LINE UID to customer and award bonus points
                  const LINE_BONUS_POINTS = 50;
                  const wasNotLinked = !customer.lineUid;
                  
                  await storage.updateCustomer(customer.id, {
                    lineUid: lineUserId,
                    points: wasNotLinked ? customer.points + LINE_BONUS_POINTS : customer.points
                  });
                  
                  // Consume the code so it can't be reused
                  await consumeLinkingCode(fullCode);
                  
                  console.log(`✅ Linked ${customer.name} to LINE via code ${fullCode}: ${lineUserId}${wasNotLinked ? ` (+${LINE_BONUS_POINTS} bonus points!)` : ''}`);
                  
                  // Send beautiful Flex Message for account linked
                  if ('replyToken' in event && event.replyToken) {
                    await replyLineTemplatedMessage(
                      event.replyToken,
                      'account_linked',
                      {
                        customerName: customer.name,
                        phone: customer.phone
                      }
                    );
                  }
                } else {
                  if ('replyToken' in event && event.replyToken) {
                    await replyLineMessage(
                      event.replyToken,
                      `❌ ไม่พบบัญชีลูกค้า กรุณาลองใหม่อีกครั้ง`
                    );
                  }
                }
              } catch (error) {
                console.error('❌ Error linking via code:', error);
              }
            } else {
              // Invalid or expired code
              if ('replyToken' in event && event.replyToken) {
                await replyLineMessage(
                  event.replyToken,
                  `❌ รหัสไม่ถูกต้องหรือหมดอายุแล้ว\n\nกรุณาขอรหัสใหม่จากแอพลูกค้า หรือส่งเบอร์โทรศัพท์ของคุณ`
                );
              }
            }
            continue; // Don't process further for this event
          }
          
          // Check if message looks like a phone number
          const phoneMatch = messageText.replace(/[\s\-\(\)]/g, '').match(/^(\+66|66|0)?(\d{8,9})$/);
          
          if (phoneMatch) {
            // Normalize phone number (remove +66/66 prefix, add 0 if needed)
            let phone = phoneMatch[2];
            if (!phone.startsWith('0') && phone.length === 9) {
              phone = '0' + phone;
            } else if (phone.length === 8) {
              phone = '0' + phone;
            }
            
            console.log(`📞 Phone number received: ${phone}`);

            try {
              // Find customer by phone number
              const allCustomers = await storage.getAllCustomers();
              const customerByPhone = allCustomers.find(c => 
                c.phone.replace(/[\s\-]/g, '') === phone || 
                c.phone.replace(/[\s\-]/g, '').endsWith(phone)
              );

              if (customerByPhone) {
                // Check if already linked to another LINE account
                if (customerByPhone.lineUid && customerByPhone.lineUid !== lineUserId) {
                  if ('replyToken' in event && event.replyToken) {
                    await replyLineMessage(
                      event.replyToken,
                      `⚠️ เบอร์นี้เชื่อมต่อกับ LINE อื่นแล้ว\n\nกรุณาติดต่อพนักงานเพื่อขอความช่วยเหลือ`
                    );
                  }
                } else {
                  // Link LINE UID to customer and award bonus points
                  const LINE_BONUS_POINTS = 50;
                  const wasNotLinked = !customerByPhone.lineUid;
                  
                  await storage.updateCustomer(customerByPhone.id, {
                    lineUid: lineUserId,
                    // Award bonus points only if this is first time linking
                    points: wasNotLinked ? customerByPhone.points + LINE_BONUS_POINTS : customerByPhone.points
                  });

                  console.log(`✅ Linked ${customerByPhone.name} to LINE: ${lineUserId}${wasNotLinked ? ` (+${LINE_BONUS_POINTS} bonus points!)` : ''}`);

                  // Send beautiful Flex Message for account linked
                  if ('replyToken' in event && event.replyToken) {
                    await replyLineTemplatedMessage(
                      event.replyToken,
                      'account_linked',
                      {
                        customerName: customerByPhone.name,
                        phone: phone
                      }
                    );
                  }
                }
              } else {
                // Phone not found - offer to register
                if ('replyToken' in event && event.replyToken) {
                  await replyLineMessage(
                    event.replyToken,
                    `❓ ไม่พบเบอร์นี้ในระบบ\n\nกรุณาลงทะเบียนที่หน้าร้าน หรือถามพนักงาน`
                  );
                }
              }
            } catch (error) {
              console.error('❌ Error linking customer:', error);
            }
          } else {
            // Not a phone number or linking code - send help message
            if ('replyToken' in event && event.replyToken) {
              await replyLineMessage(
                event.replyToken,
                `🍦 Yens Thai Ice Cream\n\nเชื่อมต่อบัญชีเพื่อรับ 50 คะแนนโบนัส!\n\n📱 ส่งรหัส LINK-XXXX จากแอพลูกค้า\n📞 หรือส่งเบอร์โทรศัพท์ของคุณ\n\nตัวอย่าง: 0812345678`
              );
            }
          }
        }

        // Handle unfollow event (customer blocks/removes bot)
        if (event.type === 'unfollow') {
          console.log(`👋 User unfollowed: ${lineUserId}`);
          // Optionally: Clear lineUid from customer record
          // We'll keep it linked in case they re-follow later
        }
      }

      res.status(200).json({ message: 'OK' });
    } catch (error) {
      console.error('❌ LINE webhook error:', error);
      res.status(500).json({ message: 'Internal server error' });
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

  // Seed default sites (for production setup)
  app.post('/api/admin/sites/seed-defaults', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const existingSites = await storage.getAllSites();
      
      // Only seed if there are fewer than 5 sites (to avoid duplicates)
      if (existingSites.length >= 5) {
        return res.status(400).json({ 
          message: "Sites already exist. Delete existing sites first if you want to reseed." 
        });
      }

      const defaultSites = [
        { name: 'Yens Head Office', channelName: 'SHOP', type: 'stall' as const, isActive: true, location: 'Head Office Location', operatingDays: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'], openTime: '09:00', closeTime: '21:00' },
        { name: 'Supalai Location', channelName: 'SUPALAI', type: 'stall' as const, isActive: true, location: 'Supalai', operatingDays: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'], openTime: '10:00', closeTime: '20:00' },
        { name: 'Balloon Event', channelName: 'BALLOON', type: 'mobile_van' as const, isActive: true, location: 'Various', operatingDays: ['saturday','sunday'], openTime: '10:00', closeTime: '20:00' },
        { name: 'Box Location', channelName: 'BOX', type: 'stall' as const, isActive: true, location: 'Box Area', operatingDays: ['monday','tuesday','wednesday','thursday','friday'], openTime: '09:00', closeTime: '18:00' },
        { name: 'River Market', channelName: 'RIVER', type: 'mobile_van' as const, isActive: true, location: 'River', operatingDays: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'], openTime: '10:00', closeTime: '20:00' },
        { name: 'Army Base', channelName: 'ARMY', type: 'stall' as const, isActive: true, location: 'Army Location', operatingDays: ['monday','tuesday','wednesday','thursday','friday'], openTime: '08:00', closeTime: '17:00' },
        { name: 'Lamp Area', channelName: 'LAMP', type: 'stall' as const, isActive: true, location: 'Lamp', operatingDays: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'], openTime: '10:00', closeTime: '22:00' },
        { name: 'CNY Events', channelName: 'CNY', type: 'mobile_van' as const, isActive: true, location: 'Various CNY Locations', operatingDays: ['saturday','sunday'], openTime: '09:00', closeTime: '21:00' },
        { name: 'University Campus', channelName: 'UNIVERSITY', type: 'stall' as const, isActive: true, location: 'University', operatingDays: ['monday','tuesday','wednesday','thursday','friday'], openTime: '08:00', closeTime: '18:00' },
        { name: 'Grab Delivery', channelName: 'GRAB', type: 'stall' as const, isActive: true, location: 'Online - Grab Platform', operatingDays: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'], openTime: '00:00', closeTime: '23:59' },
        { name: 'FoodPanda Delivery', channelName: 'FOODPANDA', type: 'stall' as const, isActive: true, location: 'Online - FoodPanda Platform', operatingDays: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'], openTime: '00:00', closeTime: '23:59' },
        { name: 'LINE MAN Delivery', channelName: 'LINEMAN', type: 'stall' as const, isActive: true, location: 'Online - LINE MAN Platform', operatingDays: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'], openTime: '00:00', closeTime: '23:59' },
        { name: 'Shopee Food', channelName: 'SHOPEE', type: 'stall' as const, isActive: true, location: 'Online - Shopee Platform', operatingDays: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'], openTime: '00:00', closeTime: '23:59' },
        { name: 'Shopzy Platform', channelName: 'SHOPZY', type: 'stall' as const, isActive: true, location: 'Online - Shopzy', operatingDays: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'], openTime: '00:00', closeTime: '23:59' },
        { name: 'G2 Location', channelName: 'G2', type: 'stall' as const, isActive: true, location: 'G2 Area', operatingDays: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'], openTime: '10:00', closeTime: '20:00' },
      ];

      // Validate all data before inserting to ensure data integrity
      const validatedSites = defaultSites.map(siteData => insertSiteSchema.parse(siteData));
      
      // Use storage layer's bulk create method for atomic transaction
      const createdSites = await storage.bulkCreateSites(validatedSites);

      res.status(201).json({ 
        message: `Successfully created ${createdSites.length} default sites`, 
        sites: createdSites 
      });
    } catch (error) {
      console.error("Error seeding default sites:", error);
      res.status(500).json({ message: "Failed to seed default sites" });
    }
  });

  // Update site
  app.patch('/api/admin/sites/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      // Validate update data using partial of insertSiteSchema to preserve channelName validation
      const updateSiteSchema = insertSiteSchema.partial();
      const validatedData = updateSiteSchema.parse(req.body);
      
      const site = await storage.updateSite(req.params.id, validatedData);
      if (!site) {
        return res.status(404).json({ message: "Site not found" });
      }
      res.json(site);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: fromError(error).toString() });
      }
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

  // === DATA DOWNLOADS ROUTE ===
  
  // Download export files (admin only)
  app.get('/api/admin/downloads/:filename', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { filename } = req.params;
      const fs = await import('fs');
      const path = await import('path');
      
      // Security: only allow specific filenames
      const allowedFiles = ['failed_customers_export.csv'];
      if (!allowedFiles.includes(filename)) {
        return res.status(404).json({ message: "File not found" });
      }
      
      const filePath = path.join(process.cwd(), 'public', 'downloads', filename);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Set headers for file download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      res.status(500).json({ message: "Failed to download file" });
    }
  });

  // ============================================
  // Customer Reviews API
  // ============================================
  
  // Submit a customer review
  app.post('/api/reviews', async (req, res) => {
    try {
      const reviewData = insertCustomerReviewSchema.parse(req.body);
      
      // Insert the review into the database
      const [newReview] = await db.insert(customerReviews).values({
        customerId: reviewData.customerId || null,
        rating: reviewData.rating,
        feedbackTags: reviewData.feedbackTags || [],
        comment: reviewData.comment || null,
        siteId: reviewData.siteId || null,
        googlePlaceId: reviewData.googlePlaceId || null,
      }).returning();
      
      console.log(`⭐ New review submitted: ${reviewData.rating} stars`);
      
      res.json(newReview);
    } catch (error) {
      console.error("Error submitting review:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromError(error).message });
      }
      res.status(500).json({ message: "Failed to submit review" });
    }
  });
  
  // Get all reviews (admin)
  app.get('/api/reviews', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const reviews = await db.select().from(customerReviews).orderBy(customerReviews.createdAt);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
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
