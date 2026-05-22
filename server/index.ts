import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { setupAuth } from "./auth";
import { setupVite, serveStatic, log } from "./vite";
import { ObjectStorageService } from "./objectStorage";
import { setEmailLogoUrl } from "./resend";
import { startScheduler } from "./scheduler";
import { storage } from "./storage";
import fs from "fs";
import path from "path";
import { db } from "./db";
import { env } from "./env";
import { eq, and, gte, lt, lte, inArray, sql } from "drizzle-orm";
import { dailySales, users, sites, customers as customersTable } from "@shared/schema";
import crypto from "crypto";
const uuidv4 = () => crypto.randomUUID();
import bcrypt from "bcryptjs";

// Ensure at least one admin user exists
async function ensureDefaultAdmin() {
  try {
    const hashedPassword = await bcrypt.hash("123456", 10);
    const admins = await db.select().from(users).where(eq(users.role, 'admin')).limit(1);
    if (admins.length === 0) {
      log("No admin user found, creating default admin...");
      await db.insert(users).values({
        id: uuidv4(),
        email: "admin@yensrewards.com",
        password: hashedPassword,
        firstName: "System",
        lastName: "Admin",
        role: "admin",
        isActive: true,
      });
      log("Default admin credentials created.");
    } else {
      log(`Admin user found, force-updating password for ${admins[0].email}...`);
      await db.update(users).set({ password: hashedPassword }).where(eq(users.id, admins[0].id));
      log("Admin password updated successfully.");
    }
  } catch (err) {
    log("Error ensuring default admin: " + String(err));
  }
}

// ONE-TIME: Restore 147 missing customers from January 2026 CSV upload
async function restoreMissingCustomers() {
  try {
    const check = await db.select({ c: sql<number>`count(*)` }).from(customersTable);
    const existing = Number(check[0]?.c || 0);
    if (existing >= 620) {
      log(`Customer restoration: already have ${existing} customers, skipping`);
      return;
    }
    log(`Customer restoration: only ${existing} customers found, restoring from CSV...`);

    const fsModule = await import('fs');
    const pathModule = await import('path');
    const csvPath = pathModule.resolve(process.cwd(), 'server/assets/member-active-2026-01-16_1768629832619.csv');
    if (!fsModule.existsSync(csvPath)) {
      log('Customer restoration: CSV file not found, skipping');
      return;
    }

    const lines = fsModule.readFileSync(csvPath, 'utf-8').split('\n').filter((l: string) => l.trim());
    const headers = parseCSVLine(lines[0]);

    const existingRows = await db.select({ phone: customersTable.phone }).from(customersTable);
    const existingPhones = new Set(existingRows.map((r: any) => r.phone));

    let inserted = 0, skipped = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      const get = (name: string) => cols[headers.indexOf(name)] || '';

      const rawPhone = get('Phone Number').trim().replace(/\s+/g, '');
      if (!rawPhone) { skipped++; continue; }
      const phone = rawPhone.startsWith('0') ? '+66' + rawPhone.substring(1) : rawPhone;

      if (existingPhones.has(phone) || existingPhones.has(rawPhone)) { skipped++; continue; }

      const id = uuidv4();
      const name = get('Crm Name').trim() || 'Unknown';
      const tierRaw = (get('Membership Tier') || '').toLowerCase().trim();
      const tier = ['gold', 'silver', 'bronze'].includes(tierRaw) ? tierRaw : 'member';
      const email = get('Email').trim() || null;
      const gender = get('Gender').trim() || null;

      const bdParts = (get('Birthdate') || '').split('/');
      const birthday = bdParts.length >= 2 ? `${bdParts[1].padStart(2, '0')}-${bdParts[0].padStart(2, '0')}` : null;

      const parseDate = (raw: string) => {
        const dp = raw.split(' ')[0].split('/');
        if (dp.length === 3) return new Date(`${dp[2]}-${dp[1].padStart(2, '0')}-${dp[0].padStart(2, '0')}`);
        return null;
      };
      const registerDate = parseDate(get('Register Date'));
      const registerBranch = get('Register Branch').trim() || null;
      const totalSpent = parseFloat(get('Total Spending') || '0') || 0;
      const points = parseInt(get('Point') || '0') || 0;
      const lastUse = parseDate(get('Last Use'));
      const tag = get('Tag').trim() || null;
      const lineUid = get('Line UID').trim() || null;
      const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      try {
        await db.insert(customersTable).values({
          id,
          name,
          phone,
          email,
          gender,
          birthday,
          points,
          tier,
          referralCode,
          totalSpent: totalSpent.toString(),
          createdAt: (registerDate ?? new Date()).toISOString(),
          registerDate: registerDate?.toISOString() ?? null,
          registerBranch,
          lastUse: lastUse?.toISOString() ?? null,
          tag,
          lineUid
        }).onConflictDoNothing();
        inserted++;
        existingPhones.add(phone);
      } catch (_err) { skipped++; }
    }

    const after = await db.select({ c: sql<number>`count(*)` }).from(customersTable);
    log(`Customer restoration complete: inserted ${inserted}, skipped ${skipped}. Total now: ${after[0].c}`);
  } catch (err) {
    log(`Customer restoration warning: ${err instanceof Error ? err.message : err}`);
  }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else { current += ch; }
  }
  result.push(current.trim());
  return result;
}

// ONE-TIME: Restore Dec 29 2025 – Apr 26 2026 PDF sales data wiped by db:push --force
// Safe to run repeatedly: uses ON CONFLICT DO NOTHING so no duplicates
async function restoreMissingPdfSalesData() {
  try {
    const check = await db.select({ c: sql<number>`count(*)` }).from(dailySales).where(gte(dailySales.date, '2025-12-29'));
    const existing = Number(check[0]?.c || 0);
    if (existing >= 180) {
      log(`Sales restoration: already have ${existing} records from Dec 2025+, skipping`);
      return;
    }
    log(`Sales restoration: found only ${existing} records from Dec 2025+, restoring PDF data...`);

    const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, 'admin')).limit(1);
    const adminId = admins[0]?.id || 'KZ-L18';

    // Each entry: date, day-of-week, channel, net_sales, other_sales (optional)
    const transactions: { date: string; day: string; channel: string; net: number; other?: number }[] = [
      // ── 29 Dec 2025 – 04 Jan 2026 ──────────────────────────────────────────
      { date: '2025-12-29', day: 'Mon', channel: 'LIGHTFESTIVAL', net: 6380.00 },
      { date: '2025-12-29', day: 'Mon', channel: 'SHOP', net: 1289.00 },
      { date: '2025-12-30', day: 'Tue', channel: 'LIGHTFESTIVAL', net: 6366.00 },
      { date: '2025-12-30', day: 'Tue', channel: 'SHOP', net: 1253.00 },
      { date: '2025-12-31', day: 'Wed', channel: 'LIGHTFESTIVAL', net: 8125.00 },
      { date: '2025-12-31', day: 'Wed', channel: 'SHOP', net: 1540.00 },
      { date: '2026-01-01', day: 'Thu', channel: 'LIGHTFESTIVAL', net: 6105.00 },
      { date: '2026-01-01', day: 'Thu', channel: 'SHOP', net: 1253.00 },
      { date: '2026-01-02', day: 'Fri', channel: 'LIGHTFESTIVAL', net: 6940.00 },
      { date: '2026-01-02', day: 'Fri', channel: 'SHOP', net: 999.00 },
      { date: '2026-01-03', day: 'Sat', channel: 'LIGHTFESTIVAL', net: 6852.00 },
      { date: '2026-01-03', day: 'Sat', channel: 'SHOP', net: 1195.00 },
      { date: '2026-01-04', day: 'Sun', channel: 'SHOP', net: 944.00 },
      // ── 05 Jan – 11 Jan 2026 ───────────────────────────────────────────────
      { date: '2026-01-05', day: 'Mon', channel: 'SHOP', net: 1209.00 },
      { date: '2026-01-05', day: 'Mon', channel: 'MISC', net: 2841.00 },
      { date: '2026-01-06', day: 'Tue', channel: 'SHOP', net: 1103.00 },
      { date: '2026-01-07', day: 'Wed', channel: 'SHOP', net: 1312.00 },
      { date: '2026-01-08', day: 'Thu', channel: 'SHOP', net: 1304.00 },
      { date: '2026-01-09', day: 'Fri', channel: 'SHOP', net: 1100.00 },
      { date: '2026-01-09', day: 'Fri', channel: 'RIVER', net: 1943.00 },
      { date: '2026-01-10', day: 'Sat', channel: 'SHOP', net: 890.00 },
      { date: '2026-01-10', day: 'Sat', channel: 'RIVER', net: 1906.00 },
      { date: '2026-01-10', day: 'Sat', channel: 'MISC', net: 6543.00 },
      { date: '2026-01-11', day: 'Sun', channel: 'SHOP', net: 1478.00 },
      // ── 12 Jan – 18 Jan 2026 ───────────────────────────────────────────────
      { date: '2026-01-12', day: 'Mon', channel: 'SHOP', net: 1870.00 },
      { date: '2026-01-13', day: 'Tue', channel: 'SHOP', net: 1413.00 },
      { date: '2026-01-14', day: 'Wed', channel: 'SHOP', net: 710.00 },
      { date: '2026-01-15', day: 'Thu', channel: 'SHOP', net: 875.00 },
      { date: '2026-01-16', day: 'Fri', channel: 'SHOP', net: 1086.00 },
      { date: '2026-01-16', day: 'Fri', channel: 'RIVER', net: 1924.00 },
      { date: '2026-01-17', day: 'Sat', channel: 'SHOP', net: 2158.00 },
      { date: '2026-01-17', day: 'Sat', channel: 'RIVER', net: 2169.00 },
      { date: '2026-01-18', day: 'Sun', channel: 'SHOP', net: 1533.00 },
      // ── 19 Jan – 25 Jan 2026 ───────────────────────────────────────────────
      { date: '2026-01-19', day: 'Mon', channel: 'SHOP', net: 1195.00 },
      { date: '2026-01-20', day: 'Tue', channel: 'SHOP', net: 1220.00 },
      { date: '2026-01-21', day: 'Wed', channel: 'SHOP', net: 1009.00 },
      { date: '2026-01-22', day: 'Thu', channel: 'SHOP', net: 1189.00 },
      { date: '2026-01-23', day: 'Fri', channel: 'SHOP', net: 1451.00 },
      { date: '2026-01-23', day: 'Fri', channel: 'RIVER', net: 2876.00 },
      { date: '2026-01-24', day: 'Sat', channel: 'SUCHADA', net: 2738.99 },
      { date: '2026-01-24', day: 'Sat', channel: 'SHOP', net: 1078.00 },
      { date: '2026-01-25', day: 'Sun', channel: 'SUCHADA', net: 4573.00 },
      { date: '2026-01-25', day: 'Sun', channel: 'SHOP', net: 1342.99 },
      // ── 26 Jan – 01 Feb 2026 ───────────────────────────────────────────────
      { date: '2026-01-26', day: 'Mon', channel: 'SHOP', net: 863.00 },
      { date: '2026-01-27', day: 'Tue', channel: 'SHOP', net: 804.00 },
      { date: '2026-01-28', day: 'Wed', channel: 'SHOP', net: 745.00 },
      { date: '2026-01-29', day: 'Thu', channel: 'SHOP', net: 1240.00 },
      { date: '2026-01-30', day: 'Fri', channel: 'SHOP', net: 1714.00 },
      { date: '2026-01-31', day: 'Sat', channel: 'SHOP', net: 1400.00 },
      { date: '2026-02-01', day: 'Sun', channel: 'SHOP', net: 1728.00 },
      // ── 09 Feb 2026 (from Feb 9-15 report; Feb 2-8 not available) ──────────
      { date: '2026-02-09', day: 'Mon', channel: 'SHOP', net: 1474.00 },
      // ── 10 Feb – 21 Feb 2026 ───────────────────────────────────────────────
      { date: '2026-02-10', day: 'Tue', channel: 'SHOP', net: 1935.00 },
      { date: '2026-02-10', day: 'Tue', channel: 'COCA COLA', net: 4975.00 },
      { date: '2026-02-10', day: 'Tue', channel: 'CNY', net: 5452.00 },
      { date: '2026-02-10', day: 'Tue', channel: 'CARAVAN TRUCK', net: 2202.00 },
      { date: '2026-02-11', day: 'Wed', channel: 'SHOP', net: 260.00 },
      { date: '2026-02-11', day: 'Wed', channel: 'COCA COLA', net: 8910.00 },
      { date: '2026-02-11', day: 'Wed', channel: 'CNY', net: 7673.00 },
      { date: '2026-02-11', day: 'Wed', channel: 'CARAVAN TRUCK', net: 3270.00 },
      { date: '2026-02-12', day: 'Thu', channel: 'SHOP', net: 465.00 },
      { date: '2026-02-12', day: 'Thu', channel: 'COCA COLA', net: 8320.00 },
      { date: '2026-02-12', day: 'Thu', channel: 'CNY', net: 8381.00 },
      { date: '2026-02-12', day: 'Thu', channel: 'CARAVAN TRUCK', net: 3869.00 },
      { date: '2026-02-13', day: 'Fri', channel: 'SHOP', net: 349.00 },
      { date: '2026-02-13', day: 'Fri', channel: 'COCA COLA', net: 8465.00 },
      { date: '2026-02-13', day: 'Fri', channel: 'CNY', net: 7790.00 },
      { date: '2026-02-13', day: 'Fri', channel: 'CARAVAN TRUCK', net: 3980.00 },
      { date: '2026-02-14', day: 'Sat', channel: 'SHOP', net: 620.00 },
      { date: '2026-02-14', day: 'Sat', channel: 'COCA COLA', net: 15500.00 },
      { date: '2026-02-14', day: 'Sat', channel: 'CNY', net: 10183.00 },
      { date: '2026-02-14', day: 'Sat', channel: 'CARAVAN TRUCK', net: 5206.00 },
      { date: '2026-02-15', day: 'Sun', channel: 'SHOP', net: 679.00 },
      { date: '2026-02-15', day: 'Sun', channel: 'COCA COLA', net: 7090.00 },
      { date: '2026-02-15', day: 'Sun', channel: 'CNY', net: 6866.00 },
      { date: '2026-02-15', day: 'Sun', channel: 'CARAVAN TRUCK', net: 2856.00 },
      { date: '2026-02-16', day: 'Mon', channel: 'CNY', net: 7384.00 },
      { date: '2026-02-16', day: 'Mon', channel: 'COCA COLA', net: 8850.00 },
      { date: '2026-02-16', day: 'Mon', channel: 'CARAVAN TRUCK', net: 3860.00 },
      { date: '2026-02-17', day: 'Tue', channel: 'CARAVAN TRUCK', net: 5497.00 },
      { date: '2026-02-17', day: 'Tue', channel: 'SHOP', net: 235.00 },
      { date: '2026-02-17', day: 'Tue', channel: 'CNY', net: 6028.00 },
      { date: '2026-02-17', day: 'Tue', channel: 'COCA COLA', net: 15620.00 },
      { date: '2026-02-18', day: 'Wed', channel: 'CARAVAN TRUCK', net: 6238.00 },
      { date: '2026-02-18', day: 'Wed', channel: 'CNY', net: 8169.00 },
      { date: '2026-02-18', day: 'Wed', channel: 'COCA COLA', net: 18380.00 },
      { date: '2026-02-18', day: 'Wed', channel: 'SHOP', net: 570.00 },
      { date: '2026-02-19', day: 'Thu', channel: 'CNY', net: 8128.00 },
      { date: '2026-02-19', day: 'Thu', channel: 'CARAVAN TRUCK', net: 9771.00 },
      { date: '2026-02-19', day: 'Thu', channel: 'COCA COLA', net: 28540.00 },
      { date: '2026-02-20', day: 'Fri', channel: 'SHOP', net: 59.95 },
      { date: '2026-02-20', day: 'Fri', channel: 'CARAVAN TRUCK', net: 3404.00 },
      { date: '2026-02-20', day: 'Fri', channel: 'COCA COLA', net: 10607.00 },
      { date: '2026-02-20', day: 'Fri', channel: 'CNY', net: 6965.00 },
      { date: '2026-02-21', day: 'Sat', channel: 'CARAVAN TRUCK', net: 1718.00 },
      { date: '2026-02-21', day: 'Sat', channel: 'CNY', net: 7503.00 },
      { date: '2026-02-21', day: 'Sat', channel: 'COCA COLA', net: 6990.00 },
      // ── 23 Feb – 01 Mar 2026 (Feb 22 not in any report) ───────────────────
      { date: '2026-02-23', day: 'Mon', channel: 'SHOP', net: 1598.00 },
      { date: '2026-02-24', day: 'Tue', channel: 'SHOP', net: 1514.00 },
      { date: '2026-02-25', day: 'Wed', channel: 'SHOP', net: 1117.00 },
      { date: '2026-02-26', day: 'Thu', channel: 'SHOP', net: 1659.00 },
      { date: '2026-02-27', day: 'Fri', channel: 'SHOP', net: 2769.00 },
      { date: '2026-02-28', day: 'Sat', channel: 'SHOP', net: 1498.00 },
      { date: '2026-03-01', day: 'Sun', channel: 'SHOP', net: 1350.00 },
      // ── 02 Mar – 08 Mar 2026 ───────────────────────────────────────────────
      { date: '2026-03-02', day: 'Mon', channel: 'SHOP', net: 1439.00 },
      { date: '2026-03-03', day: 'Tue', channel: 'SHOP', net: 2110.00 },
      { date: '2026-03-04', day: 'Wed', channel: 'SHOP', net: 1312.00 },
      { date: '2026-03-05', day: 'Thu', channel: 'SHOP', net: 2619.00 },
      { date: '2026-03-06', day: 'Fri', channel: 'SHOP', net: 1589.00 },
      { date: '2026-03-06', day: 'Fri', channel: 'MUSIC IN THE PARK', net: 7473.00 },
      { date: '2026-03-07', day: 'Sat', channel: 'SHOP', net: 2320.00 },
      { date: '2026-03-07', day: 'Sat', channel: 'MUSIC IN THE PARK', net: 10870.00 },
      { date: '2026-03-08', day: 'Sun', channel: 'SHOP', net: 1603.00 },
      { date: '2026-03-08', day: 'Sun', channel: 'MUSIC IN THE PARK', net: 16285.00 },
      // ── 09 Mar – 15 Mar 2026 ───────────────────────────────────────────────
      { date: '2026-03-09', day: 'Mon', channel: 'SHOP', net: 1559.00 },
      { date: '2026-03-10', day: 'Tue', channel: 'SHOP', net: 2080.00 },
      { date: '2026-03-11', day: 'Wed', channel: 'SHOP', net: 1437.00 },
      { date: '2026-03-12', day: 'Thu', channel: 'SHOP', net: 2484.00 },
      { date: '2026-03-13', day: 'Fri', channel: 'SHOP', net: 2009.00, other: 587.00 },
      { date: '2026-03-13', day: 'Fri', channel: 'RIVER', net: 2712.00 },
      { date: '2026-03-13', day: 'Fri', channel: 'CARAVAN TRUCK', net: 1526.00 },
      { date: '2026-03-14', day: 'Sat', channel: 'SHOP', net: 1963.00 },
      { date: '2026-03-14', day: 'Sat', channel: 'RIVER', net: 3427.00 },
      { date: '2026-03-14', day: 'Sat', channel: 'CARAVAN TRUCK', net: 1953.00 },
      { date: '2026-03-15', day: 'Sun', channel: 'SHOP', net: 7527.00 },
      // ── 16 Mar – 22 Mar 2026 ───────────────────────────────────────────────
      { date: '2026-03-16', day: 'Mon', channel: 'SHOP', net: 3416.00 },
      { date: '2026-03-17', day: 'Tue', channel: 'SHOP', net: 4510.96 },
      { date: '2026-03-18', day: 'Wed', channel: 'SHOP', net: 3481.00 },
      { date: '2026-03-19', day: 'Thu', channel: 'SHOP', net: 3292.00 },
      { date: '2026-03-20', day: 'Fri', channel: 'SHOP', net: 3005.00 },
      { date: '2026-03-20', day: 'Fri', channel: 'RIVER', net: 7064.00 },
      { date: '2026-03-21', day: 'Sat', channel: 'SHOP', net: 1983.00 },
      { date: '2026-03-21', day: 'Sat', channel: 'RIVER', net: 6640.00 },
      { date: '2026-03-22', day: 'Sun', channel: 'SHOP', net: 1977.00 },
      // ── 23 Mar – 29 Mar 2026 ───────────────────────────────────────────────
      { date: '2026-03-23', day: 'Mon', channel: 'SHOP', net: 1787.00 },
      { date: '2026-03-24', day: 'Tue', channel: 'SHOP', net: 1429.00 },
      { date: '2026-03-25', day: 'Wed', channel: 'SHOP', net: 2340.00 },
      { date: '2026-03-26', day: 'Thu', channel: 'SHOP', net: 2583.00 },
      { date: '2026-03-27', day: 'Fri', channel: 'SHOP', net: 2583.00 },
      { date: '2026-03-27', day: 'Fri', channel: 'RIVER', net: 4769.00 },
      { date: '2026-03-27', day: 'Fri', channel: 'CARAVAN TRUCK', net: 1661.00 },
      { date: '2026-03-28', day: 'Sat', channel: 'SHOP', net: 3491.00 },
      { date: '2026-03-28', day: 'Sat', channel: 'SUCHADA', net: 4193.00 },
      { date: '2026-03-28', day: 'Sat', channel: 'RIVER', net: 3069.00 },
      { date: '2026-03-29', day: 'Sun', channel: 'SHOP', net: 2583.00 },
      { date: '2026-03-29', day: 'Sun', channel: 'SUCHADA', net: 4389.00 },
      // ── 30 Mar – 05 Apr 2026 ───────────────────────────────────────────────
      { date: '2026-03-30', day: 'Mon', channel: 'SHOP', net: 1401.00 },
      { date: '2026-03-31', day: 'Tue', channel: 'SHOP', net: 2377.00 },
      { date: '2026-04-01', day: 'Wed', channel: 'SHOP', net: 2140.00 },
      { date: '2026-04-02', day: 'Thu', channel: 'SHOP', net: 2292.00 },
      { date: '2026-04-03', day: 'Fri', channel: 'SHOP', net: 1580.00 },
      { date: '2026-04-04', day: 'Sat', channel: 'SHOP', net: 1078.00 },
      { date: '2026-04-05', day: 'Sun', channel: 'SHOP', net: 1994.00 },
      // ── 06 Apr – 12 Apr 2026 ───────────────────────────────────────────────
      { date: '2026-04-06', day: 'Mon', channel: 'SHOP', net: 2502.00 },
      { date: '2026-04-07', day: 'Tue', channel: 'SHOP', net: 3799.00 },
      { date: '2026-04-08', day: 'Wed', channel: 'SHOP', net: 2156.00 },
      { date: '2026-04-09', day: 'Thu', channel: 'SHOP', net: 1792.00 },
      { date: '2026-04-10', day: 'Fri', channel: 'SHOP', net: 2182.00 },
      { date: '2026-04-10', day: 'Fri', channel: 'RIVER', net: 2540.00 },
      { date: '2026-04-10', day: 'Fri', channel: 'CARAVAN TRUCK', net: 1514.00 },
      { date: '2026-04-11', day: 'Sat', channel: 'SHOP', net: 1412.00 },
      { date: '2026-04-11', day: 'Sat', channel: 'RIVER', net: 3194.00 },
      { date: '2026-04-11', day: 'Sat', channel: 'CARAVAN TRUCK', net: 1128.00 },
      { date: '2026-04-12', day: 'Sun', channel: 'SHOP', net: 1941.00 },
      { date: '2026-04-12', day: 'Sun', channel: 'MISC', net: 2041.00 },
      // ── 13 Apr – 19 Apr 2026 (Songkran) ───────────────────────────────────
      { date: '2026-04-13', day: 'Mon', channel: 'SONGKRAN FESTIVAL', net: 5273.00 },
      { date: '2026-04-13', day: 'Mon', channel: 'SHOP', net: 904.00 },
      { date: '2026-04-14', day: 'Tue', channel: 'SONGKRAN FESTIVAL', net: 4690.00 },
      { date: '2026-04-14', day: 'Tue', channel: 'SHOP', net: 851.00 },
      { date: '2026-04-15', day: 'Wed', channel: 'SONGKRAN FESTIVAL', net: 2780.00 },
      { date: '2026-04-15', day: 'Wed', channel: 'SHOP', net: 1224.00 },
      { date: '2026-04-16', day: 'Thu', channel: 'SHOP', net: 2304.00 },
      { date: '2026-04-17', day: 'Fri', channel: 'SHOP', net: 1826.00 },
      { date: '2026-04-17', day: 'Fri', channel: 'RIVER', net: 4112.00 },
      { date: '2026-04-17', day: 'Fri', channel: 'CARAVAN TRUCK', net: 2196.00 },
      { date: '2026-04-18', day: 'Sat', channel: 'SHOP', net: 2238.00 },
      { date: '2026-04-19', day: 'Sun', channel: 'SHOP', net: 2093.00 },
      // ── 20 Apr – 26 Apr 2026 ───────────────────────────────────────────────
      { date: '2026-04-20', day: 'Mon', channel: 'SHOP', net: 1441.00 },
      { date: '2026-04-21', day: 'Tue', channel: 'SHOP', net: 1824.00 },
      { date: '2026-04-22', day: 'Wed', channel: 'SHOP', net: 1600.00 },
      { date: '2026-04-23', day: 'Thu', channel: 'SHOP', net: 1726.00 },
      { date: '2026-04-24', day: 'Fri', channel: 'SHOP', net: 1786.00 },
      { date: '2026-04-24', day: 'Fri', channel: 'RIVER', net: 2964.00 },
      { date: '2026-04-25', day: 'Sat', channel: 'SHOP', net: 1089.00 },
      { date: '2026-04-25', day: 'Sat', channel: 'RIVER', net: 2064.00 },
      { date: '2026-04-26', day: 'Sun', channel: 'UNIVERSITY', net: 16087.00 },
    ];

    let inserted = 0;
    for (const tx of transactions) {
      const id = uuidv4();
      const otherSales = tx.other ?? 0;
      const totalSales = tx.net + otherSales;
      await db.insert(dailySales).values({
        id,
        date: tx.date,
        dayOfWeek: tx.day,
        orderChannel: tx.channel,
        netSales: tx.net.toString(),
        grabFee: "0",
        totalSales: totalSales.toString(),
        otherSales: otherSales.toString(),
        importedBy: adminId,
        importedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }).onConflictDoNothing();
      inserted++;
    }

    const finalCount = await db.select({ c: sql<number>`count(*)` }).from(dailySales).where(gte(dailySales.date, '2025-12-29'));
    log(`Sales restoration complete: attempted ${inserted} records. Dec 2025+ rows now: ${finalCount[0].c}`);
  } catch (err) {
    log(`Sales restoration warning: ${err instanceof Error ? err.message : err}`);
    console.error('Sales restoration error:', err);
  }
}

// ONE-TIME: Restore missing 2025 sales — Oct 2025 (entirely absent), Nov 22-30, Dec 1-28
// Source: Annual PDF (01/01/25–25/12/25) + December monthly PDF (01/12/25–31/12/25)
async function restoreMissing2025SalesData() {
  try {
    const check = await db.select({ c: sql<number>`count(*)` }).from(dailySales).where(and(gte(dailySales.date, '2025-01-01'), lt(dailySales.date, '2026-01-01')));
    const existing = Number(check[0]?.c || 0);
    if (existing >= 560) {
      log(`2025 sales check: already have ${existing} rows for 2025, skipping`);
      return;
    }
    log(`2025 sales check: found ${existing} rows for 2025, restoring missing Oct/Nov/Dec data...`);

    const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, 'admin')).limit(1);
    const adminId = admins[0]?.id || 'KZ-L18';

    const txns: { date: string; day: string; channel: string; net: number }[] = [
      // ── October 2025 (entirely missing from DB) ──
      { date: '2025-10-01', day: 'Wed', channel: 'SHOP', net: 1000.00 },
      { date: '2025-10-01', day: 'Wed', channel: 'Shop', net: 2199.00 },
      { date: '2025-10-02', day: 'Thu', channel: 'Shop', net: 1788.00 },
      { date: '2025-10-03', day: 'Fri', channel: 'Shop', net: 1890.00 },
      { date: '2025-10-04', day: 'Sat', channel: 'Shop', net: 1279.00 },
      { date: '2025-10-05', day: 'Sun', channel: 'Shop', net: 1673.00 },
      { date: '2025-10-06', day: 'Mon', channel: 'Shop', net: 1009.00 },
      { date: '2025-10-07', day: 'Tue', channel: 'Shop', net: 2143.00 },
      { date: '2025-10-08', day: 'Wed', channel: 'Shop', net: 1549.00 },
      { date: '2025-10-09', day: 'Thu', channel: 'Shop', net: 1937.00 },
      { date: '2025-10-10', day: 'Fri', channel: 'Shop', net: 1961.00 },
      { date: '2025-10-11', day: 'Sat', channel: 'Shop', net: 1251.00 },
      { date: '2025-10-12', day: 'Sun', channel: 'Shop', net: 1905.00 },
      { date: '2025-10-13', day: 'Mon', channel: 'Shop', net: 1508.00 },
      { date: '2025-10-14', day: 'Tue', channel: 'Shop', net: 1143.00 },
      { date: '2025-10-15', day: 'Wed', channel: 'Shop', net: 1859.00 },
      { date: '2025-10-16', day: 'Thu', channel: 'Shop', net: 1879.00 },
      { date: '2025-10-17', day: 'Fri', channel: 'Shop', net: 1681.00 },
      { date: '2025-10-18', day: 'Sat', channel: 'Shop', net: 1444.00 },
      { date: '2025-10-19', day: 'Sun', channel: 'Shop', net: 1910.00 },
      { date: '2025-10-20', day: 'Mon', channel: 'Shop', net: 1168.00 },
      { date: '2025-10-21', day: 'Tue', channel: 'Shop', net: 1919.00 },
      { date: '2025-10-22', day: 'Wed', channel: 'Shop', net: 1915.00 },
      { date: '2025-10-23', day: 'Thu', channel: 'Shop', net: 2243.00 },
      { date: '2025-10-24', day: 'Fri', channel: 'Shop', net: 1044.00 },
      { date: '2025-10-25', day: 'Sat', channel: 'Shop', net: 1014.00 },
      { date: '2025-10-26', day: 'Sun', channel: 'Shop', net: 0.00 },
      { date: '2025-10-27', day: 'Mon', channel: 'Shop', net: 0.00 },
      { date: '2025-10-28', day: 'Tue', channel: 'Shop', net: 1576.00 },
      { date: '2025-10-29', day: 'Wed', channel: 'Shop', net: 1673.00 },
      { date: '2025-10-30', day: 'Thu', channel: 'Shop', net: 2370.00 },
      { date: '2025-10-31', day: 'Fri', channel: 'Shop', net: 2015.00 },
      // ── November 22–30 2025 (missing from DB) ──
      { date: '2025-11-22', day: 'Sat', channel: 'River', net: 1412.00 },
      { date: '2025-11-22', day: 'Sat', channel: 'Shop', net: 1309.00 },
      { date: '2025-11-23', day: 'Sun', channel: 'BOX', net: 1615.00 },
      { date: '2025-11-23', day: 'Sun', channel: 'Shop', net: 1765.00 },
      { date: '2025-11-24', day: 'Mon', channel: 'BOX', net: 1075.00 },
      { date: '2025-11-24', day: 'Mon', channel: 'Shop', net: 1214.00 },
      { date: '2025-11-25', day: 'Tue', channel: 'RIVERBOAT', net: 4639.00 },
      { date: '2025-11-25', day: 'Tue', channel: 'Shop', net: 1420.00 },
      { date: '2025-11-26', day: 'Wed', channel: 'Shop', net: 1104.00 },
      { date: '2025-11-26', day: 'Wed', channel: 'RIVERBOAT', net: 3949.00 },
      { date: '2025-11-27', day: 'Thu', channel: 'FOOD', net: 5000.00 },
      { date: '2025-11-27', day: 'Thu', channel: 'Shop', net: 1616.00 },
      { date: '2025-11-27', day: 'Thu', channel: 'RIVERBOAT', net: 2925.00 },
      { date: '2025-11-28', day: 'Fri', channel: 'Shop', net: 823.00 },
      { date: '2025-11-28', day: 'Fri', channel: 'RIVERBOAT', net: 3746.00 },
      { date: '2025-11-28', day: 'Fri', channel: 'FOOD', net: 1600.00 },
      { date: '2025-11-29', day: 'Sat', channel: 'RIVERBOAT', net: 3612.00 },
      { date: '2025-11-29', day: 'Sat', channel: 'SUCHADA', net: 2925.00 },
      { date: '2025-11-30', day: 'Sun', channel: 'RIVERBOAT', net: 3192.00 },
      { date: '2025-11-30', day: 'Sun', channel: 'SUCHADA', net: 3596.00 },
      // ── December 1–28 2025 (missing from DB; Dec 29-31 already restored) ──
      { date: '2025-12-01', day: 'Mon', channel: 'Shop', net: 1390.00 },
      { date: '2025-12-02', day: 'Tue', channel: 'Shop', net: 3499.00 },
      { date: '2025-12-03', day: 'Wed', channel: 'Shop', net: 980.00 },
      { date: '2025-12-04', day: 'Thu', channel: 'Shop', net: 1682.00 },
      { date: '2025-12-04', day: 'Thu', channel: 'CHUM SEANT EVENT', net: 2501.00 },
      { date: '2025-12-05', day: 'Fri', channel: 'Shop', net: 1731.00 },
      { date: '2025-12-05', day: 'Fri', channel: 'LATYAO', net: 3526.00 },
      { date: '2025-12-06', day: 'Sat', channel: 'Shop', net: 1334.00 },
      { date: '2025-12-06', day: 'Sat', channel: 'LATYAO', net: 3447.00 },
      { date: '2025-12-07', day: 'Sun', channel: 'Shop', net: 2030.00 },
      { date: '2025-12-07', day: 'Sun', channel: 'LATYAO', net: 1452.00 },
      { date: '2025-12-07', day: 'Sun', channel: 'UNIVERSITY', net: 8666.00 },
      { date: '2025-12-08', day: 'Mon', channel: 'Shop', net: 1215.00 },
      { date: '2025-12-09', day: 'Tue', channel: 'Shop', net: 1139.00 },
      { date: '2025-12-09', day: 'Tue', channel: 'LATYAO', net: 2453.00 },
      { date: '2025-12-10', day: 'Wed', channel: 'Shop', net: 1318.00 },
      { date: '2025-12-11', day: 'Thu', channel: 'Shop', net: 685.00 },
      { date: '2025-12-12', day: 'Fri', channel: 'Shop', net: 1589.00 },
      { date: '2025-12-12', day: 'Fri', channel: 'RIVER', net: 2741.00 },
      { date: '2025-12-13', day: 'Sat', channel: 'Shop', net: 1095.00 },
      { date: '2025-12-13', day: 'Sat', channel: 'RIVER', net: 2274.00 },
      { date: '2025-12-15', day: 'Mon', channel: 'Shop', net: 844.00 },
      { date: '2025-12-16', day: 'Tue', channel: 'Shop', net: 1453.00 },
      { date: '2025-12-17', day: 'Wed', channel: 'Shop', net: 1500.00 },
      { date: '2025-12-18', day: 'Thu', channel: 'Shop', net: 1189.00 },
      { date: '2025-12-19', day: 'Fri', channel: 'Shop', net: 1265.00 },
      { date: '2025-12-19', day: 'Fri', channel: 'RIVER', net: 2125.00 },
      { date: '2025-12-20', day: 'Sat', channel: 'Shop', net: 1409.00 },
      { date: '2025-12-20', day: 'Sat', channel: 'SUCHADA', net: 3645.00 },
      { date: '2025-12-23', day: 'Tue', channel: 'Shop', net: 888.00 },
      { date: '2025-12-23', day: 'Tue', channel: 'LIGHTFESTIVAL', net: 9070.00 },
      { date: '2025-12-25', day: 'Thu', channel: 'LIGHTFESTIVAL', net: 7105.00 },
      { date: '2025-12-25', day: 'Thu', channel: 'UNIVERSITY', net: 1377.00 },
      { date: '2025-12-26', day: 'Fri', channel: 'LIGHTFESTIVAL', net: 8880.00 },
      { date: '2025-12-26', day: 'Fri', channel: 'SHOP', net: 1724.00 },
      { date: '2025-12-27', day: 'Sat', channel: 'LIGHTFESTIVAL', net: 8518.00 },
      { date: '2025-12-27', day: 'Sat', channel: 'SHOP', net: 1669.00 },
      { date: '2025-12-28', day: 'Sun', channel: 'LIGHTFESTIVAL', net: 6005.00 },
      { date: '2025-12-28', day: 'Sun', channel: 'SHOP', net: 1032.00 },
    ];

    let inserted = 0;
    for (const tx of txns) {
      const id = uuidv4();
      await db.insert(dailySales).values({
        id,
        date: tx.date,
        dayOfWeek: tx.day,
        orderChannel: tx.channel,
        netSales: tx.net.toString(),
        grabFee: "0",
        totalSales: tx.net.toString(),
        otherSales: "0",
        importedBy: adminId,
        importedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }).onConflictDoNothing();
      inserted++;
    }

    const afterCount = await db.select({ c: sql<number>`count(*)` }).from(dailySales)
      .where(and(gte(dailySales.date, '2025-01-01'), lt(dailySales.date, '2026-01-01')));
    log(`2025 sales restoration: attempted ${inserted} records. 2025 total now: ${afterCount[0]?.c}`);
  } catch (err) {
    log(`2025 sales restoration warning: ${err instanceof Error ? err.message : err}`);
    console.error('2025 sales restoration error:', err);
  }
}

// ONE-TIME: Import 2024 sales data from Excel (Jul–Nov 2024)
// Shop channel: daily POS aggregates from Consolidated Data sheet
// Market channels (W/J/D/M/แข่งเรือ): from MARKET sheet — event-based revenue
async function restore2024SalesData() {
  try {
    const check = await db.select({ c: sql<number>`count(*)` }).from(dailySales)
      .where(and(gte(dailySales.date, '2024-07-01'), lt(dailySales.date, '2024-12-01')));
    const existing = Number(check[0]?.c || 0);
    if (existing >= 100) {
      log(`2024 sales check: already have ${existing} Jul–Nov 2024 rows, skipping`);
      return;
    }
    log(`2024 sales check: found ${existing} Jul–Nov 2024 rows, importing Excel data...`);

    const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, 'admin')).limit(1);
    const adminId = admins[0]?.id || 'KZ-L18';

    // Daily Shop aggregates from Consolidated Data sheet (Jul 24 – Nov 30 2024)
    const shopData: { date: string; day: string; net: number }[] = [
      { date: '2024-07-24', day: 'Wed', net: 5221.00 }, { date: '2024-07-25', day: 'Thu', net: 1912.00 },
      { date: '2024-07-26', day: 'Fri', net: 3853.00 }, { date: '2024-07-27', day: 'Sat', net: 1356.00 },
      { date: '2024-07-28', day: 'Sun', net: 5018.00 }, { date: '2024-07-29', day: 'Mon', net: 2931.00 },
      { date: '2024-07-30', day: 'Tue', net: 2401.00 }, { date: '2024-07-31', day: 'Wed', net: 2779.00 },
      { date: '2024-08-01', day: 'Thu', net: 1583.00 }, { date: '2024-08-02', day: 'Fri', net: 1986.00 },
      { date: '2024-08-03', day: 'Sat', net: 2716.00 }, { date: '2024-08-04', day: 'Sun', net: 4404.00 },
      { date: '2024-08-05', day: 'Mon', net: 2552.00 }, { date: '2024-08-06', day: 'Tue', net: 2671.00 },
      { date: '2024-08-07', day: 'Wed', net: 2440.00 }, { date: '2024-08-08', day: 'Thu', net: 2587.00 },
      { date: '2024-08-09', day: 'Fri', net: 2484.00 }, { date: '2024-08-10', day: 'Sat', net: 2435.00 },
      { date: '2024-08-11', day: 'Sun', net: 4431.00 }, { date: '2024-08-12', day: 'Mon', net: 4355.00 },
      { date: '2024-08-13', day: 'Tue', net: 2997.00 }, { date: '2024-08-14', day: 'Wed', net: 1587.00 },
      { date: '2024-08-15', day: 'Thu', net: 2858.00 }, { date: '2024-08-16', day: 'Fri', net: 3004.00 },
      { date: '2024-08-17', day: 'Sat', net: 3072.00 }, { date: '2024-08-18', day: 'Sun', net: 3639.00 },
      { date: '2024-08-19', day: 'Mon', net: 2893.00 }, { date: '2024-08-20', day: 'Tue', net: 3505.00 },
      { date: '2024-08-21', day: 'Wed', net: 1869.00 }, { date: '2024-08-22', day: 'Thu', net: 3413.00 },
      { date: '2024-08-23', day: 'Fri', net: 2720.00 }, { date: '2024-08-24', day: 'Sat', net: 2998.00 },
      { date: '2024-08-25', day: 'Sun', net: 2878.00 }, { date: '2024-08-26', day: 'Mon', net: 2978.00 },
      { date: '2024-08-27', day: 'Tue', net: 1103.00 }, { date: '2024-08-28', day: 'Wed', net: 2564.00 },
      { date: '2024-08-29', day: 'Thu', net: 3841.00 }, { date: '2024-08-30', day: 'Fri', net: 6223.00 },
      { date: '2024-08-31', day: 'Sat', net: 5406.00 }, { date: '2024-09-01', day: 'Sun', net: 4121.00 },
      { date: '2024-09-02', day: 'Mon', net: 3648.00 }, { date: '2024-09-03', day: 'Tue', net: 3638.00 },
      { date: '2024-09-04', day: 'Wed', net: 3129.00 }, { date: '2024-09-05', day: 'Thu', net: 3196.00 },
      { date: '2024-09-06', day: 'Fri', net: 4170.00 }, { date: '2024-09-07', day: 'Sat', net: 3195.00 },
      { date: '2024-09-08', day: 'Sun', net: 4044.00 }, { date: '2024-09-09', day: 'Mon', net: 2987.00 },
      { date: '2024-09-10', day: 'Tue', net: 2390.00 }, { date: '2024-09-11', day: 'Wed', net: 2023.00 },
      { date: '2024-09-12', day: 'Thu', net: 2483.00 }, { date: '2024-09-13', day: 'Fri', net: 2074.00 },
      { date: '2024-09-14', day: 'Sat', net: 2874.00 }, { date: '2024-09-15', day: 'Sun', net: 2396.00 },
      { date: '2024-09-16', day: 'Mon', net: 4176.00 }, { date: '2024-09-17', day: 'Tue', net: 2062.00 },
      { date: '2024-09-18', day: 'Wed', net: 3338.00 }, { date: '2024-09-19', day: 'Thu', net: 2987.00 },
      { date: '2024-09-20', day: 'Fri', net: 2793.00 }, { date: '2024-09-21', day: 'Sat', net: 1965.00 },
      { date: '2024-09-22', day: 'Sun', net: 1668.00 }, { date: '2024-09-23', day: 'Mon', net: 2089.00 },
      { date: '2024-09-24', day: 'Tue', net: 2328.00 }, { date: '2024-09-25', day: 'Wed', net: 2565.00 },
      { date: '2024-09-26', day: 'Thu', net: 1444.00 }, { date: '2024-09-27', day: 'Fri', net: 1752.00 },
      { date: '2024-09-28', day: 'Sat', net: 2912.00 }, { date: '2024-09-29', day: 'Sun', net: 2948.00 },
      { date: '2024-09-30', day: 'Mon', net: 1203.00 }, { date: '2024-10-01', day: 'Tue', net: 2496.00 },
      { date: '2024-10-02', day: 'Wed', net: 1528.00 }, { date: '2024-10-03', day: 'Thu', net: 2258.00 },
      { date: '2024-10-04', day: 'Fri', net: 2362.00 }, { date: '2024-10-05', day: 'Sat', net: 2368.00 },
      { date: '2024-10-06', day: 'Sun', net: 2174.00 }, { date: '2024-10-07', day: 'Mon', net: 2654.00 },
      { date: '2024-10-08', day: 'Tue', net: 1565.00 }, { date: '2024-10-09', day: 'Wed', net: 3212.00 },
      { date: '2024-10-10', day: 'Thu', net: 3066.00 }, { date: '2024-10-11', day: 'Fri', net: 3529.00 },
      { date: '2024-10-12', day: 'Sat', net: 1732.00 }, { date: '2024-10-13', day: 'Sun', net: 1893.00 },
      { date: '2024-10-14', day: 'Mon', net: 2167.00 }, { date: '2024-10-15', day: 'Tue', net: 1995.00 },
      { date: '2024-10-16', day: 'Wed', net: 1950.00 }, { date: '2024-10-17', day: 'Thu', net: 2286.00 },
      { date: '2024-10-18', day: 'Fri', net: 2000.00 }, { date: '2024-10-19', day: 'Sat', net: 1313.00 },
      { date: '2024-10-20', day: 'Sun', net: 2019.00 }, { date: '2024-10-21', day: 'Mon', net: 1656.00 },
      { date: '2024-10-22', day: 'Tue', net: 2211.00 }, { date: '2024-10-23', day: 'Wed', net: 1788.00 },
      { date: '2024-10-24', day: 'Thu', net: 1483.00 }, { date: '2024-10-25', day: 'Fri', net: 1430.00 },
      { date: '2024-10-28', day: 'Mon', net: 1680.00 }, { date: '2024-10-29', day: 'Tue', net: 1530.00 },
      { date: '2024-10-30', day: 'Wed', net: 1149.00 }, { date: '2024-10-31', day: 'Thu', net: 1121.00 },
      { date: '2024-11-01', day: 'Fri', net: 1695.00 }, { date: '2024-11-02', day: 'Sat', net: 1927.00 },
      { date: '2024-11-03', day: 'Sun', net: 2003.00 }, { date: '2024-11-04', day: 'Mon', net: 1322.00 },
      { date: '2024-11-05', day: 'Tue', net: 983.00 }, { date: '2024-11-06', day: 'Wed', net: 1927.00 },
      { date: '2024-11-07', day: 'Thu', net: 1654.00 }, { date: '2024-11-08', day: 'Fri', net: 1372.00 },
      { date: '2024-11-09', day: 'Sat', net: 1761.00 }, { date: '2024-11-10', day: 'Sun', net: 1546.00 },
      { date: '2024-11-11', day: 'Mon', net: 2212.00 }, { date: '2024-11-12', day: 'Tue', net: 1917.00 },
      { date: '2024-11-13', day: 'Wed', net: 2160.00 }, { date: '2024-11-14', day: 'Thu', net: 1248.00 },
      { date: '2024-11-15', day: 'Fri', net: 1594.00 }, { date: '2024-11-16', day: 'Sat', net: 1592.00 },
      { date: '2024-11-17', day: 'Sun', net: 2545.00 }, { date: '2024-11-18', day: 'Mon', net: 1399.00 },
      { date: '2024-11-19', day: 'Tue', net: 1514.00 }, { date: '2024-11-20', day: 'Wed', net: 2198.00 },
      { date: '2024-11-21', day: 'Thu', net: 2008.00 }, { date: '2024-11-22', day: 'Fri', net: 2253.00 },
      { date: '2024-11-23', day: 'Sat', net: 2088.00 }, { date: '2024-11-24', day: 'Sun', net: 3203.00 },
      { date: '2024-11-25', day: 'Mon', net: 1833.00 }, { date: '2024-11-26', day: 'Tue', net: 2038.00 },
      { date: '2024-11-27', day: 'Wed', net: 1896.00 }, { date: '2024-11-28', day: 'Thu', net: 2357.00 },
      { date: '2024-11-29', day: 'Fri', net: 3969.00 }, { date: '2024-11-30', day: 'Sat', net: 1606.00 },
    ];

    // Market event data from MARKET sheet (channel codes: W, J, D, M, แข่งเรือ)
    const marketData: { date: string; day: string; channel: string; net: number }[] = [
      { date: '2024-08-16', day: 'Fri', channel: 'W', net: 1770 },
      { date: '2024-08-17', day: 'Sat', channel: 'W', net: 3990 },
      { date: '2024-08-31', day: 'Sat', channel: 'J', net: 3815 },
      { date: '2024-08-31', day: 'Sat', channel: 'W', net: 4760 },
      { date: '2024-09-01', day: 'Sun', channel: 'J', net: 5270 },
      { date: '2024-09-06', day: 'Fri', channel: 'W', net: 5867 },
      { date: '2024-09-07', day: 'Sat', channel: 'J', net: 3550 },
      { date: '2024-09-07', day: 'Sat', channel: 'W', net: 4210 },
      { date: '2024-09-08', day: 'Sun', channel: 'J', net: 6714 },
      { date: '2024-09-13', day: 'Fri', channel: 'W', net: 1120 },
      { date: '2024-09-14', day: 'Sat', channel: 'J', net: 5510 },
      { date: '2024-09-14', day: 'Sat', channel: 'W', net: 4250 },
      { date: '2024-09-15', day: 'Sun', channel: 'J', net: 5460 },
      { date: '2024-09-20', day: 'Fri', channel: 'W', net: 3330 },
      { date: '2024-09-21', day: 'Sat', channel: 'J', net: 6790 },
      { date: '2024-09-21', day: 'Sat', channel: 'W', net: 190 },
      { date: '2024-09-22', day: 'Sun', channel: 'J', net: 5535 },
      { date: '2024-10-04', day: 'Fri', channel: 'W', net: 4290 },
      { date: '2024-10-05', day: 'Sat', channel: 'J', net: 5815 },
      { date: '2024-10-05', day: 'Sat', channel: 'W', net: 6205 },
      { date: '2024-10-07', day: 'Mon', channel: 'D', net: 4386 },
      { date: '2024-10-11', day: 'Fri', channel: 'W', net: 3980 },
      { date: '2024-10-12', day: 'Sat', channel: 'J', net: 2990 },
      { date: '2024-10-12', day: 'Sat', channel: 'W', net: 4930 },
      { date: '2024-10-13', day: 'Sun', channel: 'J', net: 2910 },
      { date: '2024-10-14', day: 'Mon', channel: 'D', net: 7455 },
      { date: '2024-10-18', day: 'Fri', channel: 'W', net: 1260 },
      { date: '2024-10-19', day: 'Sat', channel: 'J', net: 4165 },
      { date: '2024-10-20', day: 'Sun', channel: 'J', net: 2690 },
      { date: '2024-10-21', day: 'Mon', channel: 'D', net: 4080 },
      { date: '2024-10-24', day: 'Thu', channel: 'แข่งเรือ', net: 4745 },
      { date: '2024-10-25', day: 'Fri', channel: 'แข่งเรือ', net: 8589 },
      { date: '2024-10-26', day: 'Sat', channel: 'แข่งเรือ', net: 7440 },
      { date: '2024-10-27', day: 'Sun', channel: 'แข่งเรือ', net: 6982 },
      { date: '2024-10-28', day: 'Mon', channel: 'D', net: 5850 },
      { date: '2024-11-01', day: 'Fri', channel: 'W', net: 4341 },
      { date: '2024-11-02', day: 'Sat', channel: 'J', net: 4820 },
      { date: '2024-11-02', day: 'Sat', channel: 'W', net: 4306 },
      { date: '2024-11-03', day: 'Sun', channel: 'J', net: 6068 },
      { date: '2024-11-04', day: 'Mon', channel: 'D', net: 5268 },
      { date: '2024-11-08', day: 'Fri', channel: 'W', net: 5263 },
      { date: '2024-11-09', day: 'Sat', channel: 'J', net: 5080 },
      { date: '2024-11-09', day: 'Sat', channel: 'W', net: 6270 },
      { date: '2024-11-10', day: 'Sun', channel: 'J', net: 5197 },
      { date: '2024-11-11', day: 'Mon', channel: 'D', net: 5556 },
      { date: '2024-11-15', day: 'Fri', channel: 'W', net: 4719 },
      { date: '2024-11-16', day: 'Sat', channel: 'J', net: 1592 },
      { date: '2024-11-16', day: 'Sat', channel: 'W', net: 4664 },
      { date: '2024-11-17', day: 'Sun', channel: 'J', net: 2508 },
      { date: '2024-11-18', day: 'Mon', channel: 'D', net: 4408 },
      { date: '2024-11-22', day: 'Fri', channel: 'W', net: 4627 },
      { date: '2024-11-23', day: 'Sat', channel: 'W', net: 2404 },
      { date: '2024-11-23', day: 'Sat', channel: 'J', net: 4888 },
      { date: '2024-11-24', day: 'Sun', channel: 'M', net: 0 },
      { date: '2024-11-25', day: 'Mon', channel: 'D', net: 5609 },
      { date: '2024-11-29', day: 'Fri', channel: 'W', net: 3188 },
      { date: '2024-11-30', day: 'Sat', channel: 'M', net: 2578 },
      { date: '2024-11-30', day: 'Sat', channel: 'W', net: 3692 },
    ];

    let inserted = 0;
    for (const s of shopData) {
      const id = uuidv4();
      await db.insert(dailySales).values({
        id,
        date: s.date,
        dayOfWeek: s.day,
        orderChannel: 'Shop',
        netSales: s.net.toString(),
        grabFee: "0",
        totalSales: s.net.toString(),
        otherSales: "0",
        importedBy: adminId,
        importedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }).onConflictDoNothing();
      inserted++;
    }
    for (const m of marketData) {
      const id = uuidv4();
      await db.insert(dailySales).values({
        id,
        date: m.date,
        dayOfWeek: m.day,
        orderChannel: m.channel,
        netSales: m.net.toString(),
        grabFee: "0",
        totalSales: m.net.toString(),
        otherSales: "0",
        importedBy: adminId,
        importedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }).onConflictDoNothing();
      inserted++;
    }

    const afterCount = await db.select({ c: sql<number>`count(*)` }).from(dailySales).where(and(gte(dailySales.date, '2024-07-01'), lt(dailySales.date, '2024-12-01')));
    log(`2024 sales import: attempted ${inserted} records. Jul–Nov 2024 rows now: ${afterCount[0].c}`);
  } catch (err) {
    log(`2024 sales import warning: ${err instanceof Error ? err.message : err}`);
    console.error('2024 sales import error:', err);
  }
}

// Ensure the post-commit git hook for GitHub auto-sync is always installed.
// The hook is written to .git/hooks/post-commit every startup so it survives
// any Replit environment resets. Token is read at hook-run time from GITHUB_TOKEN.


// v3.17.15 - Build birthday email template with dynamic image URL
function buildBirthdayHtml(imageUrl: string): string {
  return `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 20px 0;">
    <h1 style="color: #1e40af; margin: 0;">🎂 สุขสันต์วันเกิด คุณ{{name}}! 🎂</h1>
    <p style="color: #4b5563; font-size: 16px;">Happy Birthday from Yens Thai Ice Cream!</p>
  </div>
  
  <div style="text-align: center; margin: 20px 0;">
    <img src="${imageUrl}" alt="Happy Birthday from Yens" style="max-width: 100%; height: auto; border-radius: 12px;">
  </div>
  
  <div style="background-color: #dcfce7; padding: 20px; border-radius: 12px; margin: 20px 0;">
    <h2 style="color: #166534; margin: 0 0 10px 0; text-align: center;">🎁 ของขวัญวันเกิดพิเศษ</h2>
    <p style="color: #166534; text-align: center; margin: 0;">ซื้อครบ 35 บาท รับฟรี!</p>
    <ul style="color: #166534; margin: 10px 0; padding-left: 20px;">
      <li>ไอศกรีม 1 สกู๊ป หรือ</li>
      <li>ชามะลิเย็น 1 แก้ว</li>
    </ul>
    <p style="color: #166534; text-align: center; font-size: 14px;">ใช้ได้ภายใน 7 วันนับจากวันเกิด</p>
  </div>
  
  <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <h3 style="color: #374151; margin: 0 0 10px 0; font-size: 14px;">เงื่อนไขการใช้สิทธิ์:</h3>
    <ol style="color: #6b7280; font-size: 12px; margin: 0; padding-left: 20px;">
      <li>ใช้ได้เฉพาะวันเกิดและภายใน 7 วันหลังวันเกิดเท่านั้น</li>
      <li>ต้องซื้อสินค้าขั้นต่ำ 35 บาท</li>
      <li>เลือกรับไอศกรีม 1 สกู๊ป หรือ ชามะลิเย็น 1 แก้ว</li>
      <li>ใช้ได้ 1 สิทธิ์ต่อ 1 วันเกิดเท่านั้น</li>
      <li>ไม่สามารถใช้ร่วมกับโปรโมชันอื่นได้</li>
      <li>กรุณาแสดงอีเมลนี้และบัตรประชาชนเพื่อยืนยันวันเกิด</li>
      <li>สงวนสิทธิ์ในการเปลี่ยนแปลงเงื่อนไขโดยไม่ต้องแจ้งให้ทราบล่วงหน้า</li>
      <li>ใช้ได้ที่ร้าน Yens Thai Ice Cream ทุกสาขา</li>
    </ol>
  </div>
  
  <p style="text-align: center; color: #6b7280; font-size: 14px;">มารับของขวัญวันเกิดได้ที่ Yens Thai Ice Cream ทุกสาขา! 🎉</p>
</div>`;
}

async function ensureCorrectBirthdayTemplate(imageUrl: string) {
  try {
    const templates = await storage.getMessageTemplatesByChannel('email');
    const birthdayTemplate = templates.find(t => t.type === 'birthday');
    const correctHtml = buildBirthdayHtml(imageUrl);

    if (birthdayTemplate) {
      // Compare full HTML content to detect any differences
      const currentContent = (birthdayTemplate.htmlContent || '').trim();
      const needsUpdate = currentContent !== correctHtml.trim();

      if (needsUpdate) {
        log('Updating birthday template');
        await storage.updateMessageTemplate(birthdayTemplate.id, {
          htmlContent: correctHtml,
          message: correctHtml,
          subject: 'สุขสันต์วันเกิด {{name}}! Happy Birthday from Yens',
          name: 'HAPPY BIRTHDAY TO YOU!'
        });
        log('Birthday template updated');
      }
    }
  } catch (error) {
    console.error('Birthday template update error:', error);
  }
}

const app = express();

// Trust the first proxy hop so that req.ip resolves correctly behind a load balancer.
// Without this, Express would return the proxy's IP and x-forwarded-for could be
// trivially spoofed by a direct client.
app.set('trust proxy', 1);

// Integrate helmet for HTTP headers hardening
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// Ensure the local attached_assets folder exists
if (!fs.existsSync("./attached_assets")) {
  fs.mkdirSync("./attached_assets", { recursive: true });
  log("Created missing attached_assets directory");
}

// Log startup info
log(`Starting server in ${env.NODE_ENV} mode`);

// Extend Request type to include rawBody
declare global {
  namespace Express {
    interface Request {
      rawBody?: string;
    }
  }
}

// Increase limit to 50MB to handle receipt photo uploads
// Capture raw body for LINE webhook signature verification
app.use(express.json({
  limit: '50mb',
  verify: (req: Request, res, buf) => {
    // Store raw body for LINE webhook signature verification
    if (req.path === '/api/line/webhook') {
      (req as any).rawBody = buf.toString('utf8');
    }
  }
}));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Run database migrations/sync in production
    if (env.NODE_ENV === "production") {
      try {
        log("Production mode: Running database schema sync via drizzle-kit push...");
        const { execSync } = await import("child_process");
        execSync("npx drizzle-kit push", { stdio: "inherit" });
        log("Database schema sync completed successfully.");
      } catch (err) {
        log("Database schema sync warning: " + (err instanceof Error ? err.message : String(err)));
      }
    }

    // Ensure default admin exists first thing
    await ensureDefaultAdmin();

    log('Setting up authentication...');
    setupAuth(app);

    log('Registering routes...');
    const server = await registerRoutes(app);
    log('Routes registered successfully');

    // Ensure default admin exists
    await ensureDefaultAdmin();

    // ONE-TIME restore: insert Mar 30–Apr 26 2026 PDF sales into production DB
    await restoreMissingPdfSalesData();

    // ONE-TIME restore: re-import 147 missing customers from Jan 2026 CSV upload
    await restoreMissingCustomers();

    // ONE-TIME restore: insert missing 2025 sales (Oct, Nov 22-30, Dec 1-28)
    await restoreMissing2025SalesData();

    // ONE-TIME import: Jul–Nov 2024 sales from Excel data
    await restore2024SalesData();

    // ONE-TIME: ensure all sales channels from historical data exist in sites table
    try {
      log("Channel sync: fetching existing sites...");
      const existingSites = await db.select({ channelName: sites.channelName }).from(sites);
      const existingChannels = new Set(existingSites.map((r: any) => r.channelName));
      log(`Channel sync: found ${existingChannels.size} existing channels`);

      const allChannels = [
        { name: 'Caravan Truck', channelName: 'CARAVAN TRUCK', type: 'mobile_van' },
        { name: 'Coca Cola Event', channelName: 'COCA COLA', type: 'mobile_van' },
        { name: 'Light Festival', channelName: 'LIGHTFESTIVAL', type: 'mobile_van' },
        { name: 'Songkran Festival', channelName: 'SONGKRAN FESTIVAL', type: 'mobile_van' },
        { name: 'Music in the Park', channelName: 'MUSIC IN THE PARK', type: 'mobile_van' },
        { name: 'Valentine Event', channelName: 'VALENTINE', type: 'mobile_van' },
        { name: 'River Boat Market', channelName: 'RIVERBOAT', type: 'mobile_van' },
        { name: 'Suchada Market', channelName: 'SUCHADA', type: 'mobile_van' },
        { name: 'Latyao Market', channelName: 'LATYAO', type: 'mobile_van' },
        { name: 'Temple Market', channelName: 'TEMPLE', type: 'mobile_van' },
        { name: 'Leycatong Market', channelName: 'LEYCATONG', type: 'mobile_van' },
        { name: 'Chum Seant Event', channelName: 'CHUM SEANT EVENT', type: 'mobile_van' },
        { name: 'Krokpra Market', channelName: 'KROKPRA', type: 'mobile_van' },
        { name: 'Rongsri Market', channelName: 'RONGSRI', type: 'mobile_van' },
        { name: 'River Market 35', channelName: 'RIVER 35', type: 'mobile_van' },
        { name: 'River Market 110', channelName: 'RIVER 110', type: 'mobile_van' },
        { name: 'Misc Sales', channelName: 'MISC', type: 'stall' },
        { name: 'Food Court', channelName: 'FOOD', type: 'stall' },
        { name: 'CP Partnership', channelName: 'CP', type: 'stall' },
        { name: 'CP All Partnership', channelName: 'CP ALL', type: 'stall' },
        { name: 'CP All (Alt)', channelName: 'CPALL', type: 'stall' },
        { name: 'University (Alt)', channelName: 'UNVERSITY', type: 'stall' },
      ];

      log("Channel sync: cleaning up obsolete channels...");
      const obsoleteChannels = ['W', 'J', 'D', 'M', 'แข่งเรือ'];
      for (const channelCode of obsoleteChannels) {
        await db.delete(sites).where(eq(sites.channelName, channelCode));
      }

      const missing = allChannels.filter(c => !existingChannels.has(c.channelName));
      log(`Channel sync: ${missing.length} missing channels to add`);

      if (missing.length > 0) {
        for (const ch of missing) {
          log(`Channel sync: adding ${ch.channelName}...`);
          await db.insert(sites).values({
            id: uuidv4(),
            name: ch.name,
            channelName: ch.channelName,
            type: ch.type,
            location: 'Various',
            operatingDays: JSON.stringify(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
            openTime: '09:00',
            closeTime: '21:00',
            isActive: true,
          });
        }
        log(`Channel sync: successfully added ${missing.length} channels`);
      } else {
        log("Channel sync: all channels already exist");
      }
    } catch (err) {
      log("Channel sync failed with error: " + String(err));
      if (err instanceof Error) console.error(err.stack);
    }

    // ONE-TIME fix: Dec 30 2024 Shop grab_fee was 0, should be 116.01 (from daily Excel file)
    try {
      const dec30Check = await db.select({ grabFee: dailySales.grabFee }).from(dailySales)
        .where(and(eq(dailySales.date, '2024-12-30'), eq(dailySales.orderChannel, 'Shop')));

      if (dec30Check.length > 0 && Number(dec30Check[0].grabFee) === 0) {
        await db.update(dailySales)
          .set({
            grabFee: "116.01",
            totalSales: sql`CAST(net_sales AS REAL) + 116.01`
          })
          .where(and(eq(dailySales.date, '2024-12-30'), eq(dailySales.orderChannel, 'Shop')));
        log("Fixed Dec 30 2024 Shop grab_fee: 0 → 116.01");
      }
    } catch (err) {
      log("Dec 30 grab fee fix skipped: " + String(err));
    }

    // Initialize email assets from object storage
    const objectStorage = new ObjectStorageService();

    try {
      const logoUrl = await objectStorage.ensureYensLogoUploaded();
      setEmailLogoUrl(logoUrl);
      log(`Email logo initialized: ${logoUrl}`);
    } catch (error) {
      log('Warning: Failed to initialize email logo, using fallback text');
      console.error('Logo initialization error:', error);
    }

    // v3.17.15: Upload birthday graphic and update template with correct image URL
    try {
      const birthdayGraphicUrl = await objectStorage.ensureBirthdayGraphicUploaded();
      // Use full URL for email clients (relative paths won't work in emails)
      const fullImageUrl = 'https://app.yensthai.com' + birthdayGraphicUrl;
      await ensureCorrectBirthdayTemplate(fullImageUrl);
    } catch (error) {
      log('Warning: Failed to initialize birthday graphic');
      console.error('Birthday graphic initialization error:', error);
    }

    // Global error handler - logs error but doesn't rethrow to prevent crashes
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = env.NODE_ENV === "production" && status === 500
        ? "Internal Server Error"
        : err.message || "Internal Server Error";

      log(`Error: ${status} - ${message}`);
      if (env.NODE_ENV !== "production") {
        console.error('Request error:', err);
      } else {
        console.error('Request error:', err.message || err);
      }

      if (!res.headersSent) {
        res.status(status).json({
          message,
          ...(env.NODE_ENV !== "production" ? { stack: err.stack } : {})
        });
      }
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (env.NODE_ENV !== "production") {
      // Serve static files from public directory in development mode
      const path = await import("path");
      app.use(express.static(path.resolve(import.meta.dirname, "..", "public")));

      // Serve static files from object storage public directory
      const objectStoragePublicDir = process.env.PUBLIC_OBJECT_SEARCH_PATHS?.split(',')[0];
      if (objectStoragePublicDir) {
        app.use(express.static(objectStoragePublicDir));
      }

      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    // const port = parseInt(process.env.PORT || '5000', 10);


    // server.listen({
    //   port,
    //   host: "127.0.0.1",
    // }, () => {
    //   log(`Server ready and serving on port ${port}`);

    //   // Start the scheduled message processor
    //   startScheduler();
    // });
    const port = parseInt(process.env.PORT || '5000', 10);

    server.listen({
      port,
      host: "0.0.0.0",
    }, () => {
      log(`Server ready and serving on port ${port}`);
      startScheduler();
    });//////new one 
  } catch (error) {
    console.error('Fatal error during server startup:', error);
    log(`Startup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
})();
