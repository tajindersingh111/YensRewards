import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { ObjectStorageService } from "./objectStorage";
import { setEmailLogoUrl } from "./resend";
import { startScheduler } from "./scheduler";
import { storage } from "./storage";

// v3.17.14 - Correct birthday email template content
const CORRECT_BIRTHDAY_HTML = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 20px 0;">
    <h1 style="color: #1e40af; margin: 0;">🎂 สุขสันต์วันเกิด คุณ{{name}}! 🎂</h1>
    <p style="color: #4b5563; font-size: 16px;">Happy Birthday from Yens Thai Ice Cream!</p>
  </div>
  
  <div style="text-align: center; margin: 20px 0;">
    <img src="https://storage.googleapis.com/yens-loyalty-bucket/birthday-graphic-2026.jpg" alt="Birthday" style="max-width: 100%; height: auto; border-radius: 12px;">
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

async function ensureCorrectBirthdayTemplate() {
  try {
    const templates = await storage.getMessageTemplatesByChannel('email');
    const birthdayTemplate = templates.find(t => t.type === 'birthday');
    
    if (birthdayTemplate) {
      const currentLength = birthdayTemplate.htmlContent?.length || 0;
      // Only update if content is different (check by length as quick comparison)
      if (currentLength !== CORRECT_BIRTHDAY_HTML.length) {
        log('Updating birthday template: ' + currentLength + ' chars -> ' + CORRECT_BIRTHDAY_HTML.length + ' chars');
        await storage.updateMessageTemplate(birthdayTemplate.id, {
          htmlContent: CORRECT_BIRTHDAY_HTML,
          message: CORRECT_BIRTHDAY_HTML,
          subject: '🎂 สุขสันต์วันเกิด {{name}}! Happy Birthday from Yens',
          name: 'HAPPY BIRTHDAY TO YOU!'
        });
        log('Birthday template updated successfully');
      } else {
        log('Birthday template already has correct content');
      }
    } else {
      log('No birthday email template found');
    }
  } catch (error) {
    log('Warning: Failed to update birthday template');
    console.error('Birthday template update error:', error);
  }
}

const app = express();

// Log startup info
log(`Starting server in ${process.env.NODE_ENV || 'development'} mode`);
log(`REPLIT_DEPLOYMENT: ${process.env.REPLIT_DEPLOYMENT || 'not set'}`);
log(`DATABASE_URL: ${process.env.DATABASE_URL ? 'set' : 'not set'}`);
log(`SESSION_SECRET: ${process.env.SESSION_SECRET ? 'set' : 'not set'}`);

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
    
    // Initialize email logo from object storage
    try {
      const objectStorage = new ObjectStorageService();
      const logoUrl = await objectStorage.ensureYensLogoUploaded();
      setEmailLogoUrl(logoUrl);
      log(`Email logo initialized: ${logoUrl}`);
    } catch (error) {
      log('Warning: Failed to initialize email logo, using fallback text');
      console.error('Logo initialization error:', error);
    }
    
    // v3.17.14: Ensure birthday template has correct content (fixes production database)
    await ensureCorrectBirthdayTemplate();

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
