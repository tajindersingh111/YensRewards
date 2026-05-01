import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { ObjectStorageService } from "./objectStorage";
import { setEmailLogoUrl } from "./resend";
import { startScheduler } from "./scheduler";
import { storage } from "./storage";
import fs from "fs";
import path from "path";
import { db } from "./db";
import { dailySales } from "@shared/schema";
import { sql as drizzleSql, eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

// ONE-TIME: Restore 147 missing customers from January 2026 CSV upload
async function restoreMissingCustomers() {
  try {
    const check = await db.execute(drizzleSql`SELECT COUNT(*) as c FROM customers`);
    const existing = parseInt((check.rows[0] as any).c || '0');
    if (existing >= 620) {
      log(`Customer restoration: already have ${existing} customers, skipping`);
      return;
    }
    log(`Customer restoration: only ${existing} customers found, restoring from CSV...`);

    const fsModule = await import('fs');
    const pathModule = await import('path');
    const csvPath = pathModule.resolve(process.cwd(), 'attached_assets/member-active-2026-01-16_1768629832619.csv');
    if (!fsModule.existsSync(csvPath)) {
      log('Customer restoration: CSV file not found, skipping');
      return;
    }

    const lines = fsModule.readFileSync(csvPath, 'utf-8').split('\n').filter((l: string) => l.trim());
    const headers = parseCSVLine(lines[0]);

    const existingRows = await db.execute(drizzleSql`SELECT phone FROM customers`);
    const existingPhones = new Set(existingRows.rows.map((r: any) => r.phone));

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
      const tier = ['gold','silver','bronze'].includes(tierRaw) ? tierRaw : 'member';
      const email = get('Email').trim() || null;
      const gender = get('Gender').trim() || null;

      const bdParts = (get('Birthdate') || '').split('/');
      const birthday = bdParts.length >= 2 ? `${bdParts[1].padStart(2,'0')}-${bdParts[0].padStart(2,'0')}` : null;

      const parseDate = (raw: string) => {
        const dp = raw.split(' ')[0].split('/');
        if (dp.length === 3) return new Date(`${dp[2]}-${dp[1].padStart(2,'0')}-${dp[0].padStart(2,'0')}`);
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
        await db.execute(drizzleSql`
          INSERT INTO customers (
            id, name, phone, email, gender, birthday, points, tier,
            referral_code, total_spent, created_at, register_date,
            register_branch, last_use, tag, line_uid
          ) VALUES (
            ${id}, ${name}, ${phone}, ${email}, ${gender}, ${birthday},
            ${points}, ${tier}, ${referralCode}, ${totalSpent},
            ${registerDate ?? new Date()}, ${registerDate ?? null},
            ${registerBranch}, ${lastUse ?? null}, ${tag}, ${lineUid}
          )
          ON CONFLICT DO NOTHING
        `);
        inserted++;
        existingPhones.add(phone);
      } catch (_err) { skipped++; }
    }

    const after = await db.execute(drizzleSql`SELECT COUNT(*) as c FROM customers`);
    log(`Customer restoration complete: inserted ${inserted}, skipped ${skipped}. Total now: ${(after.rows[0] as any).c}`);
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

// ONE-TIME: Restore Mar 30 – Apr 19 2026 PDF sales data wiped by db:push --force
// Safe to run repeatedly: uses ON CONFLICT DO NOTHING so no duplicates
async function restoreMissingPdfSalesData() {
  try {
    const check = await db.execute(drizzleSql`SELECT COUNT(*) as c FROM daily_sales WHERE date >= '2026-03-30'`);
    const existing = parseInt((check.rows[0] as any).c || '0');
    if (existing >= 40) {
      log(`Sales restoration: already have ${existing} records from 2026, skipping`);
      return;
    }
    log(`Sales restoration: found only ${existing} records from 2026, restoring PDF data...`);

    const admins = await db.execute(drizzleSql`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);
    const adminId = (admins.rows[0] as any)?.id || 'KZ-L18';

    const transactions = [
      // Report 1: 30/03/26 – 05/04/26
      { date: '2026-03-30', day: 'Mon', channel: 'SHOP', net: 1401.00 },
      { date: '2026-03-31', day: 'Tue', channel: 'SHOP', net: 2377.00 },
      { date: '2026-04-01', day: 'Wed', channel: 'SHOP', net: 2140.00 },
      { date: '2026-04-02', day: 'Thu', channel: 'SHOP', net: 2292.00 },
      { date: '2026-04-03', day: 'Fri', channel: 'SHOP', net: 1580.00 },
      { date: '2026-04-04', day: 'Sat', channel: 'SHOP', net: 1078.00 },
      { date: '2026-04-05', day: 'Sun', channel: 'SHOP', net: 1994.00 },
      // Report 2: 06/04/26 – 12/04/26
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
      // Report 3: 13/04/26 – 19/04/26
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
      // Report 4: 20/04/26 – 26/04/26
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
      await db.execute(drizzleSql`
        INSERT INTO daily_sales (id, date, day_of_week, order_channel, net_sales, grab_fee, total_sales, other_sales, imported_by, imported_at, created_at)
        VALUES (${id}, ${tx.date}, ${tx.day}, ${tx.channel}, ${tx.net}, 0, ${tx.net}, 0, ${adminId}, NOW(), NOW())
        ON CONFLICT (date, order_channel) DO NOTHING
      `);
      inserted++;
    }

    const finalCount = await db.execute(drizzleSql`SELECT COUNT(*) as c FROM daily_sales WHERE date >= '2026-03-30'`);
    log(`Sales restoration complete: inserted up to ${inserted} records. 2026+ rows now: ${(finalCount.rows[0] as any).c}`);
  } catch (err) {
    log(`Sales restoration warning: ${err instanceof Error ? err.message : err}`);
    console.error('Sales restoration error:', err);
  }
}

// Ensure the post-commit git hook for GitHub auto-sync is always installed.
// The hook is written to .git/hooks/post-commit every startup so it survives
// any Replit environment resets. Token is read at hook-run time from GITHUB_TOKEN.
function ensureGitHubSyncHook() {
  try {
    const hooksDir = path.resolve(process.cwd(), ".git", "hooks");
    const hookPath = path.join(hooksDir, "post-commit");
    const hookContent = `#!/bin/bash
# Auto-sync to GitHub after every Replit checkpoint commit
# Token is read from the GITHUB_TOKEN Replit secret at runtime.
if [ -z "$GITHUB_TOKEN" ]; then
  exit 0
fi
REMOTE_URL="https://Leonardfraser:\${GITHUB_TOKEN}@github.com/Leonardfraser/YensRewards.git"
BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null || echo "main")
git push "$REMOTE_URL" "\${BRANCH}:main" --quiet 2>&1 | sed "s/\${GITHUB_TOKEN}/***REDACTED***/g" || true
`;
    if (!fs.existsSync(hooksDir)) {
      log("GitHub sync hook: .git/hooks directory not found, skipping");
      return;
    }
    const existing = fs.existsSync(hookPath) ? fs.readFileSync(hookPath, "utf8") : "";
    if (existing !== hookContent) {
      fs.writeFileSync(hookPath, hookContent, { mode: 0o755 });
      log("GitHub sync hook installed (post-commit → YensRewards)");
    } else {
      log("GitHub sync hook already up to date");
    }
  } catch (err) {
    log(`GitHub sync hook setup warning: ${err instanceof Error ? err.message : err}`);
  }
}

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

// Log startup info
log(`Starting server in ${process.env.NODE_ENV || 'development'} mode`);
log(`REPLIT_DEPLOYMENT: ${process.env.REPLIT_DEPLOYMENT || 'not set'}`);
log(`DATABASE_URL: ${process.env.DATABASE_URL ? 'set' : 'not set'}`);
log(`SESSION_SECRET: ${process.env.SESSION_SECRET ? 'set' : 'not set'}`);
log(`VONAGE_API_KEY: ${process.env.VONAGE_API_KEY ? 'set' : 'NOT SET'}`);
log(`VONAGE_API_SECRET: ${process.env.VONAGE_API_SECRET ? 'set' : 'NOT SET'}`);

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
    log('Registering routes...');
    const server = await registerRoutes(app);
    log('Routes registered successfully');

    // ONE-TIME restore: insert Mar 30–Apr 26 2026 PDF sales into production DB
    await restoreMissingPdfSalesData();

    // ONE-TIME restore: re-import 147 missing customers from Jan 2026 CSV upload
    await restoreMissingCustomers();
    
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
      const message = err.message || "Internal Server Error";
      
      log(`Error: ${status} - ${message}`);
      console.error('Request error:', err);

      if (!res.headersSent) {
        res.status(status).json({ message });
      }
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
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
    const port = parseInt(process.env.PORT || '5000', 10);
    // Ensure GitHub auto-sync hook is always present
    ensureGitHubSyncHook();

    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`Server ready and serving on port ${port}`);
      
      // Start the scheduled message processor
      startScheduler();
    });
  } catch (error) {
    console.error('Fatal error during server startup:', error);
    log(`Startup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
})();
