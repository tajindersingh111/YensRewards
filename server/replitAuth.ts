import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  console.log('🍪 Session config - Using sameSite: none (required for cross-site OIDC redirect)');
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true, // Required for sameSite: none
      sameSite: 'none', // Required for cross-site OIDC callback redirect
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    console.log('🔄 Callback called, hostname:', req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, (err: any, user: any, info: any) => {
      console.log('🔄 Callback auth result:', { err, hasUser: !!user, info });
      
      if (err) {
        console.error('❌ Callback error:', err);
        return next(err);
      }
      
      if (!user) {
        console.log('❌ No user from auth');
        return res.redirect("/api/login");
      }
      
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error('❌ Login error:', loginErr);
          return next(loginErr);
        }
        console.log('✅ Login successful, session ID:', req.sessionID);
        return res.redirect("/admin");
      });
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  console.log('🔐 isAuthenticated check:', {
    isAuth: req.isAuthenticated(),
    hasUser: !!req.user,
    hasExpiresAt: !!user?.expires_at,
    sessionID: req.sessionID,
    cookies: req.headers.cookie,
  });

  if (!req.isAuthenticated() || !user?.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};

// Middleware to check if user is an admin (must be used after isAuthenticated)
export const isAdmin: RequestHandler = async (req, res, next) => {
  const user = req.user as any;
  const userId = user?.claims?.sub;
  const isAdminClaim = user?.claims?.is_admin === true;
  const isTestMode = process.env.REPLIT_DEPLOYMENT === undefined; // True only in local/test, false in deployments

  console.log('🔒 isAdmin middleware - User:', userId, 'is_admin claim:', isAdminClaim, 'isTestMode:', isTestMode);

  if (!userId) {
    console.log('❌ isAdmin - No userId found');
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    // In test mode only, trust the is_admin OIDC claim to avoid race conditions
    // In deployments (staging/production), always check the database
    let isUserAdmin: boolean;
    
    if (isTestMode && isAdminClaim) {
      console.log('✅ isAdmin - Access granted via is_admin claim (test mode)');
      isUserAdmin = true;
    } else {
      isUserAdmin = await storage.isUserAdmin(userId);
      console.log('🔒 isAdmin check result from DB for', userId, ':', isUserAdmin);
    }
    
    if (!isUserAdmin) {
      const dbUser = await storage.getUser(userId);
      console.log('❌ isAdmin - Access denied. User role:', dbUser?.role, 'Email:', dbUser?.email);
      return res.status(403).json({ message: "Forbidden: Admin access required" });
    }
    
    console.log('✅ isAdmin - Access granted');
    return next();
  } catch (error) {
    console.error("Error checking admin status:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
