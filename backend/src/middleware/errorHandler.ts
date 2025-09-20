import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

// Enhanced error handling middleware - centralized error processing with comprehensive logging
export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
  isOperational?: boolean;
  userId?: string;
}

// Error categories for better classification
export enum ErrorCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  DATABASE = 'DATABASE',
  INTERNAL = 'INTERNAL'
}

// Custom error classes
export class AppError extends Error implements ApiError {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;
  public details?: any;
  public userId?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_SERVER_ERROR',
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error classes
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', true, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR', true);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR', true);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND', true);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', true);
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string = 'External service error') {
    super(`${service}: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR', true, { service });
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed') {
    super(message, 500, 'DATABASE_ERROR', true);
  }
}

// Logging utility
class Logger {
  private logDir: string;
  private errorLogFile: string;
  private accessLogFile: string;

  constructor() {
    // Use /tmp/logs for Vercel compatibility
    if (process.env.VERCEL || process.env.NOW_REGION || process.env.NOW) {
      this.logDir = path.join('/tmp', 'logs');
    } else {
      this.logDir = path.join(process.cwd(), 'logs');
    }
    this.errorLogFile = path.join(this.logDir, 'error.log');
    this.accessLogFile = path.join(this.logDir, 'access.log');
    // Try to create logs directory if possible
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
      this.canWriteLogs = true;
    } catch (e) {
      this.canWriteLogs = false;
    }
  }

  private formatLogEntry(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...meta
    };
    return JSON.stringify(logEntry) + '\n';
  }

  private canWriteLogs: boolean = true;
  private writeToFile(filename: string, content: string): void {
    if (!this.canWriteLogs) return;
    try {
      fs.appendFileSync(filename, content);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  error(message: string, meta?: any): void {
    const logEntry = this.formatLogEntry('ERROR', message, meta);
    this.writeToFile(this.errorLogFile, logEntry);
    // Always log to console in production on Vercel
    if (process.env.NODE_ENV === 'development' || !this.canWriteLogs) {
      console.error('ERROR:', message, meta);
    }
  }

  warn(message: string, meta?: any): void {
    const logEntry = this.formatLogEntry('WARN', message, meta);
    this.writeToFile(this.errorLogFile, logEntry);
    if (process.env.NODE_ENV === 'development' || !this.canWriteLogs) {
      console.warn('WARN:', message, meta);
    }
  }

  info(message: string, meta?: any): void {
    const logEntry = this.formatLogEntry('INFO', message, meta);
    this.writeToFile(this.accessLogFile, logEntry);
    if (process.env.NODE_ENV === 'development' || !this.canWriteLogs) {
      console.info('INFO:', message, meta);
    }
  }

  debug(message: string, meta?: any): void {
    if (process.env.NODE_ENV === 'development') {
      const logEntry = this.formatLogEntry('DEBUG', message, meta);
      this.writeToFile(this.accessLogFile, logEntry);
      console.debug('DEBUG:', message, meta);
    }
  }
}

export const logger = new Logger();

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const originalSend = res.send;

  // Override res.send to capture response
  res.send = function(body: any) {
    const duration = Date.now() - startTime;
    const userId = (req as any).user?.id || 'anonymous';
    
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      contentLength: res.get('Content-Length')
    });

    return originalSend.call(this, body);
  };

  next();
};

// Enhanced error handler
export const errorHandler = (err: ApiError, req: Request, res: Response, next: NextFunction): void => {
  // Don't handle if response already sent
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || 500;
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  const isOperational = (err as AppError).isOperational !== false;
  const userId = (req as any).user?.id || 'anonymous';

  // Log error details
  const errorMeta = {
    message: err.message,
    stack: err.stack,
    statusCode,
    errorCode,
    url: req.url,
    method: req.method,
    userId,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    body: req.body,
    query: req.query,
    params: req.params,
    isOperational,
    details: (err as AppError).details
  };

  if (statusCode >= 500) {
    logger.error('Server Error', errorMeta);
  } else if (statusCode >= 400) {
    logger.warn('Client Error', errorMeta);
  }

  // Prepare error response
  const errorResponse: any = {
    error: {
      code: errorCode,
      message: isOperational ? err.message : 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    }
  };

  // Add details in development mode
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.details = (err as AppError).details;
    errorResponse.error.stack = err.stack;
  }

  // Add request ID for tracking
  const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  errorResponse.error.requestId = requestId;

  res.status(statusCode).json(errorResponse);
};

// 404 handler with logging
export const notFoundHandler = (req: Request, res: Response): void => {
  const userId = (req as any).user?.id || 'anonymous';
  
  logger.warn('404 Not Found', {
    method: req.method,
    url: req.url,
    userId,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Endpoint ${req.method} ${req.path} not found`,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  });
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Global unhandled error handlers
export const setupGlobalErrorHandlers = (): void => {
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled Promise Rejection', {
      reason: reason?.message || reason,
      stack: reason?.stack,
      promise: promise.toString()
    });
    
    // Graceful shutdown
    process.exit(1);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception', {
      message: error.message,
      stack: error.stack
    });
    
    // Graceful shutdown
    process.exit(1);
  });

  // Handle SIGTERM
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
  });

  // Handle SIGINT
  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
  });
};

// Error monitoring and alerting (placeholder for future implementation)
export const monitorError = (error: ApiError, req: Request): void => {
  // This could integrate with services like Sentry, DataDog, etc.
  if (error.statusCode && error.statusCode >= 500) {
    // Send alert for server errors
    logger.error('Critical Error Alert', {
      message: error.message,
      code: error.code,
      url: req.url,
      method: req.method,
      userId: (req as any).user?.id
    });
  }
};