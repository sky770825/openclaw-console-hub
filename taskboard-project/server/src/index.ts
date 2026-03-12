import express from "express";
import cors from "cors";
import { logger } from "./utils/logger.js";
import { getEnhancedHealth } from "./utils/health.js";

// Import route modules
import { tasksRouter } from "./routes/tasks.js";
import { reviewsRouter } from "./routes/reviews.js";
import { n8nRouter } from "./routes/n8n.js";
import { telegramRouter } from "./routes/telegram.js";
import { systemRouter } from "./routes/system.js";
import { memoriesRouter } from "./routes/memories.js";
import { researchCenterRouter } from "./routes/research-center.js";
import { communityRouter } from "./routes/community.js";

const app = express();
const PORT = process.env.PORT || 3011;

// ============================================================================
// Middleware Configuration
// ============================================================================

// CORS Configuration: Allowed Origins from Env
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(",") 
  : ["http://localhost:3000"]; // Default for development

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes("*")) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// ============================================================================
// Security Middleware
// ============================================================================

/**
 * Basic Auth Middleware
 * Protects the dashboard/API access
 */
const basicAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const user = process.env.OPENCLAW_DASHBOARD_BASIC_USER;
  const pass = process.env.OPENCLAW_DASHBOARD_BASIC_PASS;

  // If no auth is configured, skip (security warning should be logged)
  if (!user || !pass) {
    if (process.env.NODE_ENV === 'production') {
      logger.warn({ category: 'security' }, "WARNING: Dashboard Basic Auth is NOT configured in production!");
    }
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.setHeader('WWW-Authenticate', 'Basic realm="OpenClaw Dashboard"');
    return res.status(401).send('Authentication required');
  }

  const auth = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
  if (auth[0] === user && auth[1] === pass) {
    return next();
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="OpenClaw Dashboard"');
  return res.status(401).send('Invalid credentials');
};

/**
 * API Key Validation (Write Operations Security)
 * Ensures only authorized clients can modify data
 */
const apiKeyAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const apiKey = process.env.OPENCLAW_API_KEY;
  const method = req.method;
  
  // Define which methods require API Key (P0 requirement: Write validation)
  const isWriteOperation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  
  if (isWriteOperation) {
    const providedKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      if (process.env.NODE_ENV === 'production') {
        return res.status(500).json({ error: "Server configuration error: API Key missing" });
      }
      return next(); // Allow in dev if not set
    }

    if (providedKey !== apiKey) {
      return res.status(403).json({ 
        error: "Forbidden: Invalid or missing API Key for write operations" 
      });
    }
  }
  
  next();
};

// Apply Security Middlewares
app.use(basicAuth);
app.use(apiKeyAuth);

// ============================================================================
// Routes
// ============================================================================

// Health check endpoint (must be before API routes for monitoring)
app.get("/health", async (_req, res) => {
  const health = await getEnhancedHealth();
  res.json(health);
});

// API Routes
app.use("/api/tasks", tasksRouter);
app.use("/api/reviews", reviewsRouter);
app.use("/api/n8n", n8nRouter);
app.use("/api/telegram", telegramRouter);
app.use("/api/system", systemRouter);
app.use("/api/memories", memoriesRouter);
app.use("/api/research", researchCenterRouter);
app.use("/api/community", communityRouter);

// ============================================================================
// Error Handling
// ============================================================================

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ error: err.message, stack: err.stack }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
});

// ============================================================================
// Server Startup
// ============================================================================

// Start server only if not in test mode
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    logger.info({ port: PORT, category: 'startup' }, `[OpenClaw] Server running on port ${PORT}`);
    logger.info({ origins: allowedOrigins, category: 'startup' }, `[OpenClaw] CORS Allowed Origins: ${allowedOrigins.join(", ")}`);

    if (process.env.TELEGRAM_ALLOW_ANY_CHAT === 'false') {
      logger.info({ category: 'startup' }, `[OpenClaw] Telegram security: Restricted to authorized chats only.`);
    }

    logger.info({ category: 'startup' }, `[OpenClaw] Routes loaded: /api/tasks, /api/reviews, /api/n8n, /api/telegram, /api/system, /api/memories, /api/research`);
  });

  // Initialize WebSocket Server for Communication Deck
  import('./services/websocket.js').then(({ initializeWebSocket }) => {
    initializeWebSocket(server);
    logger.info({ category: 'startup' }, '[OpenClaw] WebSocket Server & Firewall initialized');
  }).catch(err => {
    logger.error({ category: 'startup', error: err }, '[OpenClaw] Failed to initialize WebSocket Server');
  });
}

export default app;
