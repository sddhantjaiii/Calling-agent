import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import DOMPurify from 'isomorphic-dompurify';

// Security middleware - comprehensive input sanitization and validation
export interface SecurityConfig {
  enableSqlInjectionPrevention: boolean;
  enableXssProtection: boolean;
  enableInputSanitization: boolean;
  maxRequestSize: string;
}

const defaultSecurityConfig: SecurityConfig = {
  enableSqlInjectionPrevention: true,
  enableXssProtection: true,
  enableInputSanitization: true,
  maxRequestSize: '10mb'
};

// SQL injection prevention patterns
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
  /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
  /(--|\/\*|\*\/|;)/g,
  /(\b(CHAR|NCHAR|VARCHAR|NVARCHAR)\s*\(\s*\d+\s*\))/gi,
  /(\b(CAST|CONVERT|SUBSTRING|ASCII|CHAR_LENGTH)\s*\()/gi
];

// XSS prevention patterns
// const XSS_PATTERNS = [
//   /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
//   /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
//   /javascript:/gi,
//   /on\w+\s*=/gi,
//   /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
//   /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi
// ];

/**
 * Sanitize input string to prevent SQL injection and XSS attacks
 */
export const sanitizeString = (input: string, config: SecurityConfig = defaultSecurityConfig): string => {
  if (typeof input !== 'string') {
    return String(input);
  }

  let sanitized = input.trim();

  // SQL injection prevention
  if (config.enableSqlInjectionPrevention) {
    SQL_INJECTION_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });
  }

  // XSS protection using DOMPurify
  if (config.enableXssProtection) {
    sanitized = DOMPurify.sanitize(sanitized, { 
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: []
    });
  }

  // Additional input sanitization
  if (config.enableInputSanitization) {
    // Remove potentially dangerous characters
    sanitized = sanitized.replace(/[<>'"]/g, '');
    // Limit length to prevent buffer overflow attacks
    sanitized = sanitized.substring(0, 10000);
  }

  return sanitized;
};

/**
 * Recursively sanitize object properties
 */
export const sanitizeObject = (obj: any, config: SecurityConfig = defaultSecurityConfig): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj, config);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, config));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const sanitizedKey = sanitizeString(key, config);
      sanitized[sanitizedKey] = sanitizeObject(value, config);
    }
    return sanitized;
  }

  return obj;
};

/**
 * Middleware to sanitize request body, query, and params
 */
export const inputSanitization = (config: SecurityConfig = defaultSecurityConfig) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Sanitize request body
      if (req.body) {
        req.body = sanitizeObject(req.body, config);
      }

      // Sanitize query parameters
      if (req.query) {
        req.query = sanitizeObject(req.query, config);
      }

      // Sanitize route parameters
      if (req.params) {
        req.params = sanitizeObject(req.params, config);
      }

      next();
    } catch (error) {
      console.error('Input sanitization error:', error);
      res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid input data provided',
          timestamp: new Date().toISOString()
        }
      });
    }
  };
};

/**
 * Enhanced CORS configuration with security headers
 */
export const secureCorsMidleware = (allowedOrigins: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.headers.origin;
    
    // Check if origin is allowed
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (allowedOrigins.length === 0) {
      // Allow all origins in development (not recommended for production)
      res.setHeader('Access-Control-Allow-Origin', '*');
    }

    // Security headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

    // Additional security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    next();
  };
};

/**
 * Request validation middleware using express-validator
 */
export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: errors.array(),
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  next();
};

/**
 * Common validation rules
 */
export const validationRules = {
  // Email validation
  email: body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email address is required'),

  // Password validation
  password: body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, number, and special character'),

  // Name validation
  name: body('name')
    .isLength({ min: 2, max: 50 })
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name must be 2-50 characters and contain only letters and spaces'),

  // Phone number validation
  phone: body('phone')
    .isMobilePhone('any')
    .withMessage('Valid phone number is required'),

  // UUID validation for IDs
  uuid: param('id')
    .isUUID()
    .withMessage('Valid UUID is required'),

  // Pagination validation
  page: query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  limit: query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  // Search query validation
  search: query('search')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Search query must be less than 100 characters')
};

/**
 * Content Security Policy middleware
 */
export const contentSecurityPolicy = (req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '));

  next();
};

/**
 * Request size limiting middleware
 */
export const requestSizeLimit = (maxSize: string = '10mb') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = req.headers['content-length'];
    
    if (contentLength) {
      const sizeInMB = parseInt(contentLength) / (1024 * 1024);
      const maxSizeInMB = parseInt(maxSize.replace('mb', ''));
      
      if (sizeInMB > maxSizeInMB) {
        res.status(413).json({
          error: {
            code: 'REQUEST_TOO_LARGE',
            message: `Request size exceeds maximum allowed size of ${maxSize}`,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }
    }

    next();
  };
};

/**
 * IP whitelist middleware for admin endpoints
 */
export const ipWhitelist = (allowedIPs: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    
    // In development, allow all IPs
    if (process.env.NODE_ENV === 'development' || allowedIPs.length === 0) {
      next();
      return;
    }

    if (!allowedIPs.includes(clientIP)) {
      console.warn(`Blocked request from unauthorized IP: ${clientIP}`);
      res.status(403).json({
        error: {
          code: 'IP_NOT_ALLOWED',
          message: 'Access denied from this IP address',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    next();
  };
};