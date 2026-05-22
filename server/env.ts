import { log } from "./vite";

export interface Env {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL: string;
  SESSION_SECRET: string;
  JWT_SECRET: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  REDIS_URL?: string;
  VONAGE_API_KEY?: string;
  VONAGE_API_SECRET?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_API_KEY?: string;
  TWILIO_API_KEY_SECRET?: string;
  TWILIO_PHONE_NUMBER?: string;
  TWILIO_MESSAGING_SERVICE_SID?: string;
}

export function auditEnv(): Env {
  const NODE_ENV = process.env.NODE_ENV || "development";
  const isProduction = NODE_ENV === "production";

  // PORT
  const PORT = parseInt(process.env.PORT || "5000", 10);

  // DATABASE_URL
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    if (isProduction) {
      throw new Error("FATAL: DATABASE_URL environment variable is required in production mode.");
    } else {
      log("Warning: DATABASE_URL is not set. Defaulting to local PostgreSQL fallback.");
    }
  }

  // SESSION_SECRET
  let SESSION_SECRET = process.env.SESSION_SECRET;
  if (!SESSION_SECRET) {
    if (isProduction) {
      throw new Error("FATAL: SESSION_SECRET environment variable is required in production mode.");
    } else {
      log("Warning: SESSION_SECRET is not set. Using local development fallback secret.");
      SESSION_SECRET = "yens_rewards_local_fallback_secret_2026";
    }
  }

  // JWT_SECRET
  let JWT_SECRET = process.env.JWT_SECRET;
  let JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
  let JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

  if (!JWT_SECRET) {
    log("Warning: JWT_SECRET is not set. Using defaults or falls back to access/refresh secrets.");
    JWT_SECRET = "yens_rewards_default_jwt_secret_2026";
  }

  if (!JWT_ACCESS_SECRET) {
    JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || `${JWT_SECRET}_access`;
  }
  if (!JWT_REFRESH_SECRET) {
    JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || `${JWT_SECRET}_refresh`;
  }

  // Optional: REDIS_URL
  const REDIS_URL = process.env.REDIS_URL;
  if (!REDIS_URL) {
    log("Notice: REDIS_URL is not set. Background jobs/caching will run in-memory.");
  }

  // Optional: Vonage API Credentials
  const VONAGE_API_KEY = process.env.VONAGE_API_KEY;
  const VONAGE_API_SECRET = process.env.VONAGE_API_SECRET;
  if (!VONAGE_API_KEY || !VONAGE_API_SECRET) {
    log("Notice: Vonage API credentials (VONAGE_API_KEY, VONAGE_API_SECRET) are missing. SMS notifications via Vonage will be disabled.");
  }

  // Optional: Twilio API Credentials
  const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
  const TWILIO_API_KEY = process.env.TWILIO_API_KEY;
  const TWILIO_API_KEY_SECRET = process.env.TWILIO_API_KEY_SECRET;
  const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
  const TWILIO_MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_API_KEY || !TWILIO_API_KEY_SECRET) {
    log("Notice: Twilio API credentials (TWILIO_ACCOUNT_SID, TWILIO_API_KEY, etc.) are incomplete. Twilio fallback notifications will be disabled.");
  }

  log(`Environment successfully validated in [${NODE_ENV}] mode.`);

  return {
    NODE_ENV,
    PORT,
    DATABASE_URL: DATABASE_URL || "postgresql://postgres:Taj@2004@localhost:5433/yens_thai",
    SESSION_SECRET,
    JWT_SECRET,
    JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET,
    REDIS_URL,
    VONAGE_API_KEY,
    VONAGE_API_SECRET,
    TWILIO_ACCOUNT_SID,
    TWILIO_API_KEY,
    TWILIO_API_KEY_SECRET,
    TWILIO_PHONE_NUMBER,
    TWILIO_MESSAGING_SERVICE_SID,
  };
}

export const env = auditEnv();
