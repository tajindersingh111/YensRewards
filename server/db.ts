import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from "@shared/schema";
import { env } from "./env";

const isProduction = env.NODE_ENV === "production";
const useSSL = !env.DATABASE_URL.includes("localhost") && !env.DATABASE_URL.includes("127.0.0.1");

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  ssl: useSSL ? { rejectUnauthorized: false } : undefined,
  max: isProduction ? 15 : 3,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client:', err);
});

export const db = drizzle(pool, { schema });