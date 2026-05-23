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
      console.log(`Auth debug: Attempting login for ${email}`);
      const user = await storage.getUserByEmail(email);
      if (!user || !user.password) {
        console.log(`Auth debug: User not found or has no password for ${email}`);
        return done(null, false, { message: "Invalid email or password" });
      }
      
      console.log(`Auth debug: Found user ${user.email}, comparing password...`);
      const isMatch = await bcrypt.compare(password, user.password);
      console.log(`Auth debug: Password match for ${email}: ${isMatch} (Provided length: ${password.length})`);
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
  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", async (err: any, user: User, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Login failed" });

      req.logIn(user, async (loginErr) => {
        if (loginErr) return next(loginErr);

        const tokens = await generateTokens(user.id);
        res.json({
          success: true,
          user: sanitizeUser(user),
          ...tokens
        });
      });
    })(req, res, next);
  });

  app.post("/api/auth/refresh", async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ message: "Refresh token required" });

    try {
      const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { userId: string };
      const storedToken = await storage.getRefreshToken(refreshToken);
      
      if (!storedToken || new Date(storedToken.expiresAt) < new Date()) {
        if (storedToken) await storage.deleteRefreshToken(refreshToken);
        return res.status(401).json({ message: "Invalid or expired refresh token" });
      }

      const user = await storage.getUser(payload.userId);
      if (!user || !user.isActive) {
        return res.status(401).json({ message: "User not found or inactive" });
      }

      const tokens = await generateTokens(user.id);
      // Optional: Rotate refresh token
      await storage.deleteRefreshToken(refreshToken);
      
      res.json(tokens);
    } catch (err) {
      res.status(401).json({ message: "Invalid refresh token" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await storage.deleteRefreshToken(refreshToken);
    }
    req.logout(() => {
      res.json({ success: true });
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
export async function generateTokens(userId: string) {
  const accessToken = jwt.sign({ userId }, JWT_ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
  const refreshToken = jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await storage.createRefreshToken({
    token: refreshToken,
    userId,
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
    try {
      const payload = jwt.verify(token, JWT_ACCESS_SECRET) as { userId: string };
      // Attach user to request for downstream middlewares
      storage.getUser(payload.userId).then(user => {
        if (user && user.isActive) {
          req.user = user;
          return next();
        }
        res.status(401).json({ message: "Unauthorized" });
      });
      return;
    } catch (err) {
      return res.status(401).json({ message: "Token expired or invalid" });
    }
  }

  // Fallback to session (Web)
  if (req.isAuthenticated()) {
    const user = req.user as User;
    if (user.isActive) {
      return next();
    }
  }
  
  console.log(`❌ Auth check failed for path ${req.path}`);
  res.status(401).json({ message: "Unauthorized" });
};

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as User | undefined;
  if (user && user.role === "admin") {
    return next();
  }
  res.status(403).json({ message: "Forbidden: Admin access required" });
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
