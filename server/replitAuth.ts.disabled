import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler, Request } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

interface OidcClaims {
  sub: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  profile_image_url?: string;
  is_admin?: boolean;
  exp?: number;
}

interface SessionUser {
  claims: OidcClaims;
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
}

/** Resolve a DB user from a session user object, trying sub then email. */
export async function resolveDbUser(sessionUser: SessionUser) {
  const sub = sessionUser.claims?.sub;
  const email = sessionUser.claims?.email;
  let dbUser = sub ? await storage.getUser(sub) : undefined;
  if (!dbUser && email) {
    dbUser = await storage.getUserByEmail(email);
  }
  return dbUser;
}

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
  
  // Validate required environment variables
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set - session store will fail');
    throw new Error('DATABASE_URL is required for session store');
  }
  
  if (!process.env.SESSION_SECRET) {
    console.error('❌ SESSION_SECRET is not set - session will fail');
    throw new Error('SESSION_SECRET is required for session management');
  }
  
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
    errorLog: (err) => {
      console.error('❌ Session store error:', err);
    },
  });
  
  // Handle session store connection errors
  sessionStore.on('error', (err) => {
    console.error('❌ Session store connection error:', err);
  });
  
  // Determine if we're in production (Replit deployments always use HTTPS)
  const isProduction = process.env.REPLIT_DEPLOYMENT !== undefined;
  console.log(`🍪 Session config - isProduction: ${isProduction}, Using sameSite: lax`);
  
  return session({
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction, // Only require secure in production
      // INVARIANT: this MUST remain 'lax' (or 'strict') in production.
      // Loosening to 'none' removes the browser-level CSRF barrier and
      // requires a full token-based CSRF solution to compensate.
      sameSite: 'lax', // blocks cross-site form POSTs (CSRF) while still allowing OIDC top-level GET redirects
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: SessionUser,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims() as OidcClaims;
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(claims: OidcClaims): Promise<void> {
  const isTestMode = process.env.REPLIT_DEPLOYMENT === undefined;
  const isAdminClaim = claims.is_admin === true;
  const email = claims.email;
  const sub = claims.sub;

  // Check whether this user already exists in the database (by sub then email)
  let existingUser = await storage.getUser(sub);
  if (!existingUser && email) {
    existingUser = await storage.getUserByEmail(email);
  }

  if (!existingUser) {
    // In test mode allow auto-creation so developers can work locally
    if (isTestMode) {
      const role = isAdminClaim ? "admin" : "barista";
      await storage.upsertUser({
        id: sub,
        email,
        firstName: claims.first_name,
        lastName: claims.last_name,
        profileImageUrl: claims.profile_image_url ?? null,
        role,
      });
    } else {
      // In production, reject logins from users who were not pre-created by an admin
      throw new Error("ACCOUNT_NOT_AUTHORIZED");
    }
    return;
  }

  // Align DB id with OIDC sub when they differ (e.g. admin pre-created user).
  // For a brand-new invited user (no FK references yet) this succeeds and makes
  // claims.sub == users.id throughout the rest of the app — eliminating the
  // need for email-fallback lookups in every route handler.
  // If the user already has FK-referenced rows, the update fails silently and
  // resolveDbUser() handles the email fallback everywhere auth middleware is used.
  if (existingUser.id !== sub) {
    await storage.alignUserOidcId(existingUser.id, sub);
  }

  // User exists — only update profile fields, never change role or isActive
  type UserProfileUpdate = {
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string | null;
    updatedAt: Date;
    role?: string;
  };
  const updateData: UserProfileUpdate = {
    firstName: claims.first_name,
    lastName: claims.last_name,
    profileImageUrl: claims.profile_image_url ?? null,
    updatedAt: new Date(),
  };
  // In test mode keep the convenience of honoring the is_admin claim for the role
  if (isTestMode && isAdminClaim) {
    updateData.role = "admin";
  }
  await storage.updateUser(existingUser.id, updateData);
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
    try {
      const claims = tokens.claims() as OidcClaims;
      await upsertUser(claims);

      // After upserting, confirm the account is active.
      // resolveDbUser checks by sub then by email so pre-invited users work
      // regardless of which ID they were created with.
      const sessionUser: SessionUser = { claims };
      const dbUser = await resolveDbUser(sessionUser);
      if (!dbUser || !dbUser.isActive) {
        return verified(null, false, { message: "Account is disabled" });
      }

      const user: SessionUser = { claims };
      updateUserSession(user, tokens);
      verified(null, user);
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "ACCOUNT_NOT_AUTHORIZED") {
        return verified(null, false, { message: "Account not authorized. Contact an administrator." });
      }
      return verified(err instanceof Error ? err : new Error(String(err)));
    }
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
        console.log('❌ No user from auth, reason:', info?.message);
        // Redirect with an error message so the user understands why they cannot log in
        const reason = encodeURIComponent(info?.message || "Login failed");
        return res.redirect(`/?error=${reason}`);
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
  const sessionUser = req.user as SessionUser | undefined;

  console.log('🔐 isAuthenticated check:', {
    isAuth: req.isAuthenticated(),
    hasUser: !!sessionUser,
    hasExpiresAt: !!sessionUser?.expires_at,
    sessionID: req.sessionID,
  });

  if (!req.isAuthenticated() || !sessionUser?.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Enforce isActive: disabled accounts lose access immediately.
  // resolveDbUser checks by OIDC sub first, then by email — this handles
  // pre-invited staff whose DB id was admin-assigned (not equal to OIDC sub).
  try {
    const dbUser = await resolveDbUser(sessionUser);
    if (!dbUser || !dbUser.isActive) {
      req.logout(() => {});
      return res.status(401).json({ message: "Account is disabled" });
    }
  } catch (err: unknown) {
    console.error('❌ isAuthenticated - error checking isActive:', err);
    return res.status(500).json({ message: "Internal server error" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= sessionUser.expires_at) {
    return next();
  }

  const refreshToken = sessionUser.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(sessionUser, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};

// Middleware to check if user is an admin (must be used after isAuthenticated)
export const isAdmin: RequestHandler = async (req, res, next) => {
  const sessionUser = req.user as SessionUser | undefined;
  const isAdminClaim = sessionUser?.claims?.is_admin === true;
  const isTestMode = process.env.REPLIT_DEPLOYMENT === undefined;

  console.log('🔒 isAdmin middleware - sub:', sessionUser?.claims?.sub, 'is_admin claim:', isAdminClaim, 'isTestMode:', isTestMode);

  if (!sessionUser?.claims?.sub) {
    console.log('❌ isAdmin - No userId found');
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    // Resolve the canonical DB user (sub → email fallback) so that admin
    // checks work correctly regardless of whether the DB id matches the OIDC sub.
    const dbUser = await resolveDbUser(sessionUser);

    if (!dbUser) {
      console.log('❌ isAdmin - DB user not found');
      return res.status(403).json({ message: "Forbidden: Admin access required" });
    }

    // In test mode, trust the is_admin OIDC claim as a convenience shortcut
    const isUserAdmin = (isTestMode && isAdminClaim) || dbUser.role === "admin";
    console.log('🔒 isAdmin check for', dbUser.email, '— role:', dbUser.role, '→', isUserAdmin ? 'granted' : 'denied');

    if (!isUserAdmin) {
      return res.status(403).json({ message: "Forbidden: Admin access required" });
    }

    console.log('✅ isAdmin - Access granted');
    return next();
  } catch (error) {
    console.error("Error checking admin status:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Explicit CSRF defence for sensitive state-changing auth/account-management
 * endpoints.  SameSite=lax already blocks cross-site form POSTs in modern
 * browsers, but this server-side check provides defence-in-depth by
 * validating that the request Origin (or Referer fallback) matches the
 * server's own host.  Requests without any Origin/Referer header are allowed
 * from same-scheme same-host fetch() calls (the header is omitted on same-
 * origin navigations in some environments), so we only reject when the header
 * is explicitly present and does not match.
 */
function originMatchesHost(req: Request): boolean {
  // Use the externally-visible host from the Host header (which Express
  // already honours, including X-Forwarded-Host when trust proxy is enabled).
  // This is correct behind TLS-terminating proxies where socket.localPort
  // would reflect the internal app port rather than the browser-visible 443.
  const hostHeader = req.get("host") ?? ""; // e.g. "app.example.com" or "localhost:5000"
  const serverProtocol = req.protocol;      // respects X-Forwarded-Proto

  function isSameOrigin(headerValue: string): boolean {
    try {
      const parsed = new URL(headerValue);
      const incomingHost = parsed.host; // includes port if non-default
      if (incomingHost !== hostHeader) return false;
      if (parsed.protocol.replace(/:$/, "") !== serverProtocol) return false;
      return true;
    } catch {
      return false;
    }
  }

  const origin = req.headers["origin"];
  if (origin) return isSameOrigin(origin);

  const referer = req.headers["referer"];
  if (referer) return isSameOrigin(referer);

  // No Origin or Referer present.
  // In production: fail closed — legitimate browser fetch() and XMLHttpRequest
  // calls on the same origin always send the Origin header on POST/PUT/PATCH/DELETE,
  // so its absence from an authenticated state-changing request is suspicious.
  // In development: allow (some test clients and curl omit these headers).
  const isProduction = process.env.REPLIT_DEPLOYMENT !== undefined;
  return !isProduction;
}

export const requireSameOrigin: RequestHandler = (req, res, next) => {
  if (!originMatchesHost(req)) {
    console.warn(`🛡️  CSRF check failed for ${req.method} ${req.path} — Origin: ${req.headers["origin"]}`);
    return res.status(403).json({ message: "Forbidden: cross-site request rejected" });
  }
  return next();
};
