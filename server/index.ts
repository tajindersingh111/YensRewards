import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { ObjectStorageService } from "./objectStorage";
import { setEmailLogoUrl } from "./resend";

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
    });
  } catch (error) {
    console.error('Fatal error during server startup:', error);
    log(`Startup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
})();
