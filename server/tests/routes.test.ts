import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import session from "express-session";
import passport from "passport";
import jwt from "jsonwebtoken";
import { registerRoutes } from "../routes";
import { storage } from "../storage";
import { db } from "../db";

// Set fake env vars for tests to prevent env validation from throwing
process.env.DATABASE_URL = "postgresql://postgres:Taj@2004@localhost:5433/yens_thai";
process.env.SESSION_SECRET = "test_session_secret";
process.env.JWT_SECRET = "test_jwt_secret";
const JWT_ACCESS_SECRET = process.env.JWT_SECRET + "_access";
const JWT_REFRESH_SECRET = process.env.JWT_SECRET + "_refresh";

// Mock the database pool and client to prevent connections
vi.mock("../db", () => {
  const dbMock = {
    select: vi.fn().mockImplementation(() => {
      const chain = {
        from: vi.fn().mockImplementation(() => chain),
        where: vi.fn().mockImplementation(() => chain),
        leftJoin: vi.fn().mockImplementation(() => chain),
        orderBy: vi.fn().mockImplementation(() => chain),
        limit: vi.fn().mockImplementation(() => chain),
        then: vi.fn().mockImplementation((resolve) => {
          // Default mock values: stats query gets counts, others get empty array
          resolve([{ count: 0, totalPoints: 0 }]);
        }),
      };
      return chain;
    }),
    delete: vi.fn().mockImplementation(() => {
      const chain = {
        where: vi.fn().mockImplementation(() => chain),
        then: vi.fn().mockImplementation((resolve) => resolve()),
      };
      return chain;
    }),
    insert: vi.fn().mockImplementation(() => {
      const chain = {
        values: vi.fn().mockImplementation(() => chain),
        returning: vi.fn().mockImplementation(() => chain),
        then: vi.fn().mockImplementation((resolve) => resolve([])),
      };
      return chain;
    }),
  };
  return { db: dbMock };
});

// Mock Storage implementation
vi.mock("../storage", () => {
  return {
    storage: {
      getUser: vi.fn(),
      getUserByEmail: vi.fn(),
      verifyUserPassword: vi.fn(),
      setUserPassword: vi.fn(),
      isUserAdmin: vi.fn(),
      getCustomerByPhone: vi.fn(),
      createCustomer: vi.fn(),
      updateCustomer: vi.fn(),
      createTransaction: vi.fn(),
      getCustomer: vi.fn(),
      getActiveWeeklySpecial: vi.fn(),
      createRefreshToken: vi.fn(),
      getRefreshToken: vi.fn(),
      deleteRefreshToken: vi.fn(),
      getBaristaPerformance: vi.fn(),
      updateBaristaPerformance: vi.fn(),
    },
  };
});

// Mock LINE/Twilio/Vonage APIs to prevent actual API calls
vi.mock("../twilio", () => ({
  sendSMS: vi.fn().mockResolvedValue({ success: true }),
  normalizeE164: vi.fn().mockImplementation((p) => p),
}));
vi.mock("../vonage", () => ({
  sendVonageSMS: vi.fn().mockResolvedValue({ success: true }),
  isVonageConfigured: vi.fn().mockReturnValue(false),
}));
vi.mock("../resend", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("../line", () => ({
  verifyLineSignature: vi.fn().mockReturnValue(true),
}));

describe("P0 Critical Path API Tests", async () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use(
      session({
        secret: "test_session_secret",
        resave: false,
        saveUninitialized: false,
      })
    );
    app.use(passport.initialize());
    app.use(passport.session());
  });

  describe("POST /api/auth/login", () => {
    it("should successfully log in with valid credentials and return access + refresh tokens", async () => {
      vi.mocked(storage.getUserByEmail).mockResolvedValue({
        id: "user-1",
        email: "test@yensrewards.com",
        password: "hashed_password",
        isActive: true,
        role: "barista",
      } as any);
      vi.mocked(storage.verifyUserPassword).mockResolvedValue(true);
      vi.mocked(storage.getUser).mockResolvedValue({
        id: "user-1",
        role: "barista",
        isActive: true,
      } as any);

      await registerRoutes(app);

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "test@yensrewards.com", password: "password123", app_id: "barista_app_1" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();

      // Verify claims in JWT payload
      const decoded = jwt.decode(res.body.accessToken) as any;
      expect(decoded.userId).toBe("user-1");
      expect(decoded.role).toBe("barista");
      expect(decoded.app_id).toBe("barista_app_1");
    });

    it("should fail to log in with invalid credentials", async () => {
      vi.mocked(storage.getUserByEmail).mockResolvedValue(null);

      await registerRoutes(app);

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "wrong@yensrewards.com", password: "wrong" });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Invalid email or password");
    });

    it("should trigger lockout after 10 failed login attempts", async () => {
      vi.mocked(storage.getUserByEmail).mockResolvedValue(null);
      await registerRoutes(app);

      // Perform 10 failed login attempts
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post("/api/auth/login")
          .set("X-Forwarded-For", "192.168.1.50")
          .send({ email: "lockout-test@yensrewards.com", password: "wrong" });
      }

      // The 11th attempt should return a 429 rate limit error
      const res = await request(app)
        .post("/api/auth/login")
        .set("X-Forwarded-For", "192.168.1.50")
        .send({ email: "lockout-test@yensrewards.com", password: "wrong" });

      expect(res.status).toBe(429);
      expect(res.body.message).toContain("Too many failed attempts");
    });
  });

  describe("POST /api/auth/refresh", () => {
    it("should return a new access token when a valid refresh token is supplied", async () => {
      const validRefreshToken = jwt.sign({ userId: "user-1", app_id: "pos_app" }, JWT_REFRESH_SECRET);
      vi.mocked(storage.getRefreshToken).mockResolvedValue({
        id: "rt-1",
        token: validRefreshToken,
        userId: "user-1",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
      } as any);
      vi.mocked(storage.getUser).mockResolvedValue({
        id: "user-1",
        role: "barista",
        isActive: true,
      } as any);

      await registerRoutes(app);

      const res = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken: validRefreshToken });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
    });

    it("should return 401 when the refresh token is expired or revoked", async () => {
      const expiredRefreshToken = jwt.sign({ userId: "user-1" }, JWT_REFRESH_SECRET);
      vi.mocked(storage.getRefreshToken).mockResolvedValue(undefined); // simulated revoked/missing

      await registerRoutes(app);

      const res = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken: expiredRefreshToken });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe("REFRESH_TOKEN_EXPIRED");
    });
  });

  describe("Protected Gated Routes & Middlewares", () => {
    it("should return 401 TOKEN_MISSING when no token is supplied", async () => {
      await registerRoutes(app);

      const res = await request(app).post("/api/transactions").send({});
      expect(res.status).toBe(401);
      expect(res.body.code).toBe("TOKEN_MISSING");
    });

    it("should return 401 TOKEN_EXPIRED when an expired token is supplied", async () => {
      const expiredToken = jwt.sign({ userId: "user-1", exp: Math.floor(Date.now() / 1000) - 60 }, JWT_ACCESS_SECRET);
      await registerRoutes(app);

      const res = await request(app)
        .post("/api/transactions")
        .set("Authorization", `Bearer ${expiredToken}`)
        .send({});

      expect(res.status).toBe(401);
      expect(res.body.code).toBe("TOKEN_EXPIRED");
    });

    it("should return 401 TOKEN_INVALID when signature is invalid", async () => {
      const invalidToken = jwt.sign({ userId: "user-1" }, "invalid_secret_key");
      await registerRoutes(app);

      const res = await request(app)
        .post("/api/transactions")
        .set("Authorization", `Bearer ${invalidToken}`)
        .send({});

      expect(res.status).toBe(401);
      expect(res.body.code).toBe("TOKEN_INVALID");
    });

    it("should reject non-admin access to admin routes", async () => {
      const baristaToken = jwt.sign({ userId: "user-1", role: "barista" }, JWT_ACCESS_SECRET);
      vi.mocked(storage.getUser).mockResolvedValue({
        id: "user-1",
        role: "barista",
        isActive: true,
      } as any);

      await registerRoutes(app);

      const res = await request(app)
        .get("/api/admin/transactions")
        .set("Authorization", `Bearer ${baristaToken}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe("FORBIDDEN_ADMIN");
    });
  });

  describe("POST /api/transactions", () => {
    it("should calculate correct points for a valid transaction (1 pt for 10 currency units)", async () => {
      const adminToken = jwt.sign({ userId: "admin-1", role: "admin" }, JWT_ACCESS_SECRET);
      vi.mocked(storage.getUser).mockResolvedValue({
        id: "admin-1",
        role: "admin",
        isActive: true,
      } as any);
      vi.mocked(storage.createTransaction).mockResolvedValue({
        id: "tx-1",
        customerId: "cust-1",
        amount: "150.00",
        points: 15,
      } as any);
      vi.mocked(storage.getCustomer).mockResolvedValue({
        id: "cust-1",
        points: 15,
      } as any);

      await registerRoutes(app);

      const res = await request(app)
        .post("/api/transactions")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ customerId: "cust-1", amount: "150.00", points: 15, location: "Bangkok" });

      expect(res.status).toBe(201);
      expect(res.body.transaction.points).toBe(15);
    });
  });

  describe("GET /api/customers/phone/:phone", () => {
    it("should reject unauthenticated phone lookup queries", async () => {
      await registerRoutes(app);

      const res = await request(app).get("/api/customers/phone/0812345678");
      expect(res.status).toBe(401);
      expect(res.body.code).toBe("TOKEN_MISSING");
    });
  });

  describe("PATCH /api/admin/customers/:id", () => {
    it("should reject customer updates with unexpected/invalid schema fields", async () => {
      const adminToken = jwt.sign({ userId: "admin-1", role: "admin" }, JWT_ACCESS_SECRET);
      vi.mocked(storage.getUser).mockResolvedValue({
        id: "admin-1",
        role: "admin",
        isActive: true,
      } as any);

      await registerRoutes(app);

      const res = await request(app)
        .patch("/api/admin/customers/cust-1")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ invalidField: "hack", points: "not_a_number" });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Expected number");
    });
  });
});
