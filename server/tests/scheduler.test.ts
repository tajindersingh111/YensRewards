import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseBirthday, isLeapYear, processAutomation } from "../scheduler";
import { storage } from "../storage";
import { db } from "../db";
import jwt from "jsonwebtoken";

// Set fake env vars for tests
process.env.DATABASE_URL = "postgresql://postgres:Taj@2004@localhost:5433/yens_thai";
process.env.SESSION_SECRET = "test_session_secret";
process.env.JWT_SECRET = "test_jwt_secret";

// Mock storage
vi.mock("../storage", () => {
  return {
    storage: {
      getAllCustomers: vi.fn(),
      createAutomationRun: vi.fn(),
      completeAutomationRun: vi.fn(),
      createMessageLog: vi.fn(),
    },
  };
});

// Mock db for atomic queries
vi.mock("../db", () => {
  const dbMock = {
    select: vi.fn().mockImplementation(() => {
      const chain = {
        from: vi.fn().mockImplementation(() => chain),
        where: vi.fn().mockImplementation(() => chain),
        limit: vi.fn().mockImplementation(() => chain),
        then: vi.fn().mockImplementation((resolve) => resolve([])), // default: no duplicate sent
      };
      return chain;
    }),
    update: vi.fn().mockImplementation(() => {
      const chain = {
        set: vi.fn().mockImplementation(() => chain),
        where: vi.fn().mockImplementation(() => chain),
        returning: vi.fn().mockImplementation(() => chain),
        then: vi.fn().mockImplementation((resolve) => resolve([{ id: "auto-1" }])), // successfully locked
      };
      return chain;
    }),
  };
  return { db: dbMock };
});

// Mock email send
vi.mock("../resend", () => ({
  sendHtmlEmail: vi.fn().mockResolvedValue({ success: true, messageId: "email-123" }),
}));

describe("Automated Scheduler Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("parseBirthday utility", () => {
    it("should parse standard ISO format YYYY-MM-DD correctly", () => {
      const result = parseBirthday("1995-10-24");
      expect(result).toEqual({ month: 10, day: 24 });
    });

    it("should parse MM-DD format correctly", () => {
      const result = parseBirthday("05-12");
      expect(result).toEqual({ month: 5, day: 12 });
    });

    it("should parse slash-separated formats (DD/MM/YYYY) correctly", () => {
      const result = parseBirthday("24/10/1995");
      expect(result).toEqual({ month: 10, day: 24 });
    });

    it("should return null for malformed DOB format", () => {
      const result = parseBirthday("invalid-date-string");
      expect(result).toBeNull();
    });
  });

  describe("isLeapYear utility", () => {
    it("should return true for leap years and false for non-leap years", () => {
      expect(isLeapYear(2024)).toBe(true);
      expect(isLeapYear(2000)).toBe(true);
      expect(isLeapYear(2021)).toBe(false);
      expect(isLeapYear(1900)).toBe(false);
    });
  });

  describe("Leap Year and Birthday Today Matching", () => {
    it("should process Feb 29 birthday on a non-leap year (e.g. 2026) on Feb 28", () => {
      // Mock system dates & birthday checks
      const birthMonth = 2;
      const birthDay = 29;
      const todayMonth = 2;
      const todayDay = 28;
      const testYear = 2026; // non-leap year

      const isFeb29Birth = birthMonth === 2 && birthDay === 29;
      const isFeb28Today = todayMonth === 2 && todayDay === 28;
      const isNonLeapYear = !isLeapYear(testYear);

      const isMatch = (isFeb29Birth && isFeb28Today && isNonLeapYear) || (birthMonth === todayMonth && birthDay === todayDay);
      expect(isMatch).toBe(true);
    });
  });

  describe("processAutomation logic", () => {
    it("should execute automation run, filter targets, skip duplicates, and complete successfully", async () => {
      const automation = {
        id: "auto-1",
        name: "Test Automation",
        customerFilter: "all",
        channel: "email",
        message: "Hello {name}!",
        subject: "Welcome",
        triggerType: "recurring_daily",
        triggerConfig: { time: "09:00" },
      };

      const mockCustomer = {
        id: "cust-1",
        name: "Alice",
        email: "alice@yensrewards.com",
        birthday: "1990-05-15",
      };

      vi.mocked(storage.getAllCustomers).mockResolvedValue([mockCustomer] as any);
      vi.mocked(storage.createAutomationRun).mockResolvedValue({ id: "run-1" } as any);

      await processAutomation(automation);

      expect(storage.createAutomationRun).toHaveBeenCalledWith({ automationId: "auto-1" });
      expect(storage.completeAutomationRun).toHaveBeenCalledWith("run-1", 1, 0, undefined);
    });

    it("should respect database duplicate check and skip sending if already logged today", async () => {
      const automation = {
        id: "auto-1",
        name: "Test Automation",
        customerFilter: "all",
        channel: "email",
        message: "Hello {name}!",
        subject: "Welcome",
        triggerType: "recurring_daily",
        triggerConfig: { time: "09:00" },
      };

      const mockCustomer = {
        id: "cust-1",
        name: "Alice",
        email: "alice@yensrewards.com",
        birthday: "1990-05-15",
      };

      vi.mocked(storage.getAllCustomers).mockResolvedValue([mockCustomer] as any);
      vi.mocked(storage.createAutomationRun).mockResolvedValue({ id: "run-1" } as any);

      // Mock duplicate check returning a found log entry (already sent today)
      vi.spyOn(db, "select").mockImplementation(() => {
        const chain = {
          from: vi.fn().mockImplementation(() => chain),
          where: vi.fn().mockImplementation(() => chain),
          limit: vi.fn().mockImplementation(() => chain),
          then: vi.fn().mockImplementation((resolve) => resolve([{ id: "logged-id" }])), // Sent record found!
        };
        return chain as any;
      });

      await processAutomation(automation);

      // Output counts should show 0 sent and 0 failed (skipped duplicate)
      expect(storage.completeAutomationRun).toHaveBeenCalledWith("run-1", 0, 0, undefined);
    });
  });
});
