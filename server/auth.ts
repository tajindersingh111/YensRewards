import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "./env";
import { User } from "@shared/schema";
import { storage } from "./storage";

const MemoryStore = createMemoryStore(session);

// Constants for JWT
const JWT_ACCESS_SECRET = env.JWT_ACCESS_SECRET;
const JWT_REFRESH_SECRET = env.JWT_REFRESH_SECRET;
const ACCESS_TOKEN_EXPIRY = "1h";
const REFRESH_TOKEN_EXPIRY = "7d";

// Customer app JWT (long-lived, separate secret from staff tokens)
const CUSTOMER_JWT_SECRET = `${env.JWT_SECRET}_customer_app`;
const CUSTOMER_TOKEN_EXPIRY = "30d";

/** Signs a long-lived JWT for a customer app session. */
export function signCustomerToken(customerId: string): string {
  return jwt.sign({ customerId, type: 'customer' }, CUSTOMER_JWT_SECRET, { expiresIn: CUSTOMER_TOKEN_EXPIRY });
}

export interface SessionUser extends User {
  accessToken?: string;
  refreshToken?: string;
}

export function setupAuth(app: Express) {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  app.use(session({
    secret: env.SESSION_SECRET,
    store: new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: 'lax',
      maxAge: sessionTtl,
    },
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  // Global JWT authentication middleware to support Bearer token auth in Passport-based checkers
  app.use(async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const payload = jwt.verify(token, JWT_ACCESS_SECRET) as { userId: string };
        const user = await storage.getUser(payload.userId);
        if (user && user.isActive) {
          req.user = user;
          req.isAuthenticated = () => true;
        }
      } catch (err) {
        // Token invalid or expired - ignore here, let downstream middlewares handle it
      }
    }
    next();
  });

  passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
  }, async (email, password, done) => {
    try {
      const user = await storage.getUserByEmail(email);
      if (!user || !user.password) {
        return done(null, false, { message: "Invalid email or password" });
      }
      
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return done(null, false, { message: "Invalid email or password" });
      }

      if (!user.isActive) {
        return done(null, false, { message: "Account is disabled" });
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Auth Routes

  app.post("/api/auth/refresh", async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required", code: "REFRESH_TOKEN_MISSING" });
    }

    try {
      const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { userId: string; app_id?: string };
      const storedToken = await storage.getRefreshToken(refreshToken);
      
      if (!storedToken || new Date(storedToken.expiresAt) < new Date()) {
        if (storedToken) {
          await storage.deleteRefreshToken(refreshToken);
        }
        return res.status(401).json({ message: "Refresh token is invalid or expired", code: "REFRESH_TOKEN_EXPIRED" });
      }

      const user = await storage.getUser(payload.userId);
      if (!user || !user.isActive) {
        return res.status(401).json({ message: "User account is inactive or not found", code: "USER_INACTIVE" });
      }

      // Rotate token: delete old, issue new pair
      await storage.deleteRefreshToken(refreshToken);
      const tokens = await generateTokens(user.id, payload.app_id || 'web');
      
      res.json(tokens);
    } catch (err: any) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Refresh token has expired", code: "REFRESH_TOKEN_EXPIRED" });
      }
      res.status(401).json({ message: "Refresh token is invalid", code: "REFRESH_TOKEN_INVALID" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    const { refreshToken } = req.body;
    if (refreshToken) {
      try {
        await storage.deleteRefreshToken(refreshToken);
      } catch (err) {
        console.error("Error during refresh token invalidation:", err);
      }
    }
    
    req.logout((err) => {
      if (err) {
        console.error("Session logout error:", err);
      }
      res.json({ success: true, message: "Logged out successfully" });
    });
  });

  app.get("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
      }
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.error("Session destroy error:", destroyErr);
        }
        res.clearCookie("connect.sid");
        
        const referer = req.get("referer") || "";
        if (referer.includes("/admin")) {
          res.redirect("/admin/login");
        } else if (referer.includes("/barista")) {
          res.redirect("/barista");
        } else if (referer.includes("/customer")) {
          res.redirect("/customer");
        } else {
          res.redirect("/");
        }
      });
    });
  });
}

// Helper functions
export async function generateTokens(userId: string, appId: string = 'web') {
  const user = await storage.getUser(userId);
  const role = user?.role || 'barista';

  const accessToken = jwt.sign({ userId, role, app_id: appId }, JWT_ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
  const refreshToken = jwt.sign({ userId, app_id: appId }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await storage.createRefreshToken({
    token: refreshToken,
    userId,
    device: appId,
    expiresAt: expiresAt.toISOString(),
  });

  return { accessToken, refreshToken };
}

export function sanitizeUser(user: any) {
  if (!user) return null;
  const { password, twoFactorSecret, ...safeUser } = user;
  return safeUser;
}

// Middlewares
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  // Check for JWT in header first (Mobile/Flutter)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];

    // 1. Try customer JWT first (customer app)
    try {
      const payload = jwt.verify(token, CUSTOMER_JWT_SECRET) as { customerId: string; type?: string };
      if (payload.type === 'customer' && payload.customerId) {
        (req as any).customerId = payload.customerId;
        return next();
      }
    } catch {
      // Not a customer token — fall through to staff JWT check
    }

    // 2. Try staff JWT
    try {
      const payload = jwt.verify(token, JWT_ACCESS_SECRET) as { userId: string; role?: string; app_id?: string };
      // Attach user to request for downstream middlewares
      storage.getUser(payload.userId).then(user => {
        if (user && user.isActive) {
          req.user = user;
          (req as any).jwtPayload = payload; // Attach JWT claims
          return next();
        }
        return res.status(401).json({ message: "User account is inactive or not found", code: "USER_INACTIVE" });
      });
      return;
    } catch (err: any) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token has expired", code: "TOKEN_EXPIRED" });
      }
      return res.status(401).json({ message: "Token is invalid", code: "TOKEN_INVALID" });
    }
  }

  // Fallback to session (Web Admin Panel)
  if (req.isAuthenticated()) {
    const user = req.user as User;
    if (user.isActive) {
      return next();
    }
    return res.status(401).json({ message: "User account is inactive", code: "USER_INACTIVE" });
  }
  
  res.status(401).json({ message: "Authentication token or session missing", code: "TOKEN_MISSING" });
};

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as User | undefined;
  const jwtPayload = (req as any).jwtPayload;
  
  // Check role from either JWT payload or authenticated user object
  const role = jwtPayload?.role || user?.role;
  if (role === "admin") {
    return next();
  }
  res.status(403).json({ message: "Forbidden: Admin access required", code: "FORBIDDEN_ADMIN" });
};

export const requireSameOrigin = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === "production") {
    const origin = req.get("origin") || req.get("referer");
    const host = req.get("host");
    if (origin && !origin.includes(host!)) {
      return res.status(403).json({ message: "Forbidden: Cross-site request" });
    }
  }
  next();
};

export async function resolveDbUser(user: any) {
  if (user.id) return user;
  return storage.getUser(user.userId);
}
