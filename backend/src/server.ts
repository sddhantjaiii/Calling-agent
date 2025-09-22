import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import routes from './routes';
import database from './config/database';
import {
  errorHandler,
  notFoundHandler,

  inputSanitization,
  contentSecurityPolicy,
  requestSizeLimit,
  sanitizeRequest,
  requestLogger,
  setupGlobalErrorHandlers,
  logger
} from './middleware';
import { performanceMonitoring, addPerformanceEndpoints } from './middleware/performanceMonitoring';
import { scheduledTaskService } from './services/scheduledTaskService';
import { webhookRetryService } from './services/webhookRetryService';

// Load environment variables
dotenv.config();

// Set timezone for the Node.js process - critical for Vercel deployment
// This ensures all Date operations use IST instead of UTC
// Use APP_TIMEZONE for Vercel (TZ is reserved), fallback to TZ for local development
const timezone = process.env.APP_TIMEZONE || process.env.TZ || 'Asia/Kolkata';
process.env.TZ = timezone;
logger.info(`Application timezone set to: ${timezone}`);
console.log(`🌍 Application timezone set to: ${timezone}`);

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL;

// Parse multiple frontend URLs from environment variable
const FRONTEND_URLS = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : [];

// Setup global error handlers
setupGlobalErrorHandlers();

// Initialize database connection
async function initializeDatabase() {
  try {
    await database.initialize();
    logger.info('Database connection established');
    console.log('✅ Database connection established');
  } catch (error) {
    logger.error('Failed to initialize database', { error: error instanceof Error ? error.message : error });
    console.error('❌ Failed to initialize database:', error);
    process.exit(1);
  }
}

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security middleware - order matters!
app.use(helmet({
  contentSecurityPolicy: false, // We'll use our custom CSP
  crossOriginEmbedderPolicy: false // Allow embedding for development
}));

// Content Security Policy
app.use(contentSecurityPolicy);

// Request size limiting
app.use(requestSizeLimit('10mb'));

// Rate limiting will be applied within routes after authentication
// This allows user-based rate limiting for authenticated requests

// Enhanced CORS configuration for frontend integration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    // Parse allowed origins from environment variables
    const corsOrigins = process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',').map(url => url.trim())
      : [];

    // In dev, optionally allow common localhost origins if DEV_ALLOW_LOCALHOST=true
    const devLocalhost = (process.env.NODE_ENV !== 'production' && process.env.DEV_ALLOW_LOCALHOST === 'true')
      ? ['http://localhost:8080','http://localhost:3000','http://127.0.0.1:8080','http://127.0.0.1:3000']
      : [];

    const allowedOrigins = [
      ...FRONTEND_URLS,
      ...corsOrigins,
      ...devLocalhost
    ];

    // Remove duplicates from allowed origins
    const uniqueAllowedOrigins = [...new Set(allowedOrigins)];
    
    if (uniqueAllowedOrigins.includes(origin)) {
      console.log(`✅ CORS allowed origin: ${origin}`);
      callback(null, true);
    } else {
      console.warn(`❌ CORS blocked origin: ${origin}`);
      console.log(`📝 Allowed origins: ${uniqueAllowedOrigins.join(', ')}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'X-File-Name'
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ],
  maxAge: 86400 // 24 hours
}));

// Body parsing middleware
// Special handling for Stripe webhooks - they need raw body for signature verification
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

// Skip JSON parsing entirely for upload routes
app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || '';

  // Debug logging for upload routes
  if (req.path.includes('/upload')) {
    console.log('🔄 Server middleware - Upload route detected:', {
      path: req.path,
      method: req.method,
      contentType: contentType,
      contentLength: req.headers['content-length'],
      skipJsonParsing: true
    });
    return next(); // Skip all JSON processing for uploads
  }

  // Skip JSON parsing for multipart form data
  if (contentType.includes('multipart/form-data') ||
    contentType.includes('application/octet-stream')) {
    console.log('🔄 Server middleware - Multipart detected, skipping JSON parsing');
    return next();
  }

  // Only apply JSON parsing for actual JSON content
  if (contentType.includes('application/json') || contentType === '') {
    express.json({
      limit: '10mb',
      verify: (req, res, buf) => {
        try {
          JSON.parse(buf.toString());
        } catch (e) {
          (res as express.Response).status(400).json({
            error: {
              code: 'INVALID_JSON',
              message: 'Invalid JSON in request body',
              timestamp: new Date().toISOString()
            }
          });
          return;
        }
      }
    })(req, res, next);
  } else {
    next();
  }
});

app.use(express.urlencoded({
  extended: true,
  limit: '10mb',
  parameterLimit: 100 // Limit number of parameters
}));

// Input sanitization middleware (applied after body parsing)
app.use(sanitizeRequest);

// Input validation and sanitization for security
app.use(inputSanitization());

// Request logging middleware
app.use(requestLogger);

// Performance monitoring middleware (after request logging)
app.use(performanceMonitoring);

// Add performance data to health endpoints
app.use(addPerformanceEndpoints);

// Health check endpoint with enhanced monitoring
app.get('/health', (_req, res) => {
  const memoryUsage = process.memoryUsage();
  const memoryInMB = {
    rss: Math.round(memoryUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    external: Math.round(memoryUsage.external / 1024 / 1024)
  };

  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: Math.round(process.uptime()),
    memory: memoryUsage,
    memoryMB: memoryInMB,
    pid: process.pid
  });
});

// Development-only rate limit reset endpoint
if (process.env.NODE_ENV === 'development') {
  app.post('/dev/reset-rate-limits', (req, res) => {
    // Clear the rate limit store
    const { clearRateLimitStore } = require('./middleware/rateLimit');
    if (clearRateLimitStore) {
      clearRateLimitStore();
    }
    res.json({
      message: 'Rate limits cleared',
      clientIp: req.ip,
      timestamp: new Date().toISOString()
    });
  });
}

// API routes
app.use('/api', routes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', notFoundHandler);

// Start server after database initialization
async function startServer() {
  await initializeDatabase();

  // Clear rate limits on server startup to unblock any previously blocked IPs
  const { clearRateLimitStore } = require('./middleware/rateLimit');
  if (clearRateLimitStore) {
    clearRateLimitStore();
    console.log('🔓 Rate limits cleared on server startup');
  }

  const server = app.listen(PORT, async () => {
    const startupInfo = {
      port: PORT,
      frontendUrl: FRONTEND_URL,
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      pid: process.pid
    };

    logger.info('Server started successfully', startupInfo);
    console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Frontend URL: ${FRONTEND_URL || '(not set)'}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    const printedCorsOrigins = [
      ...FRONTEND_URLS,
      ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(url => url.trim()) : []),
      ...((process.env.NODE_ENV !== 'production' && process.env.DEV_ALLOW_LOCALHOST === 'true') ? ['http://localhost:8080','http://localhost:8081','http://localhost:8082','http://localhost:5173'] : [])
    ];
    console.log(`🔒 CORS Origins: ${[...new Set(printedCorsOrigins)].join(', ')}`);

    // Start scheduled tasks
    try {
      scheduledTaskService.startScheduledTasks();
      logger.info('Scheduled tasks started');
    } catch (error) {
      logger.error('Failed to start scheduled tasks', { error });
    }

    // Start webhook retry processor
    try {
      webhookRetryService.startRetryProcessor();
      logger.info('Webhook retry processor started');
    } catch (error) {
      logger.error('Failed to start webhook retry processor', { error });
    }

    // Start database notification listener for cache invalidation
    // TEMPORARILY DISABLED - potential memory leak/connection issue
    // try {
    //   await databaseNotificationListener.startListening();
    //   logger.info('Database notification listener started');
    // } catch (error) {
    //   logger.error('Failed to start database notification listener', { error });
    // }
  });

  // Handle server errors
  server.on('error', (error: any) => {
    logger.error('Server error', { error: error.message, code: error.code });
    console.error('Server error:', error);
  });

  return server;
}

// Handle graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully`);
  console.log(`${signal} received, shutting down gracefully`);

  try {
    // Stop scheduled tasks
    scheduledTaskService.stopScheduledTasks();
    logger.info('Scheduled tasks stopped');

    // Stop webhook retry processor
    webhookRetryService.stopRetryProcessor();
    logger.info('Webhook retry processor stopped');

    // Stop database notification listener
    // TEMPORARILY DISABLED - potential memory leak/connection issue
    // await databaseNotificationListener.stopListening();
    // logger.info('Database notification listener stopped');

    // Close database connection
    await database.close();
    logger.info('Database connection closed');

    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', { error });
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer().catch((error) => {
  logger.error('Failed to start server', { error: error.message, stack: error.stack });
  console.error('Failed to start server:', error);
  process.exit(1);
});

export default app;