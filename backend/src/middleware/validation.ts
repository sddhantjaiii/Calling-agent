import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';

// Enhanced validation middleware - validates request data and sanitizes input
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254; // RFC 5321 limit
};

export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s\-()]+$/;
  const cleanPhone = phone.replace(/\D/g, '');
  return phoneRegex.test(phone) && cleanPhone.length >= 10 && cleanPhone.length <= 15;
};

export const validateUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

export const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return String(input);
  return input.trim()
    .replace(/[<>'"]/g, '') // Remove potentially dangerous characters
    .substring(0, 1000); // Limit length
};

export const sanitizeHtml = (input: string): string => {
  if (typeof input !== 'string') return String(input);
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
};

// Validation result handler
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: errors.array().map(error => ({
          field: error.type === 'field' ? (error as any).path : 'unknown',
          message: error.msg,
          value: error.type === 'field' ? (error as any).value : undefined
        })),
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  next();
};

// Common validation chains
export const validationChains = {
  // User registration validation
  registration: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .isLength({ max: 254 })
      .withMessage('Valid email address is required (max 254 characters)'),
    
    body('name')
      .isLength({ min: 2, max: 50 })
      .matches(/^[a-zA-Z\s\-'\.]+$/)
      .withMessage('Name must be 2-50 characters and contain only letters, spaces, hyphens, apostrophes, and periods'),
    
    body('password')
      .optional()
      .isLength({ min: 8, max: 128 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must be 8-128 characters with uppercase, lowercase, number, and special character')
  ],

  // Agent creation/update validation
  agent: [
    body('name')
      .isLength({ min: 1, max: 100 })
      .matches(/^[a-zA-Z0-9\s\-_]+$/)
      .withMessage('Agent name must be 1-100 characters and contain only letters, numbers, spaces, hyphens, and underscores'),
    
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),
    
    body('type')
      .isIn(['ChatAgent', 'CallAgent'])
      .withMessage('Agent type must be either ChatAgent or CallAgent')
  ],

  // Contact validation
  contact: [
    body('name')
      .isLength({ min: 1, max: 100 })
      .matches(/^[a-zA-Z\s\-'\.]+$/)
      .withMessage('Contact name must be 1-100 characters and contain only letters, spaces, hyphens, apostrophes, and periods'),
    
    body('phone')
      .isMobilePhone('any')
      .withMessage('Valid phone number is required'),
    
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email address is required'),
    
    body('company')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Company name must be less than 100 characters')
  ],

  // UUID parameter validation
  uuid: [
    param('id')
      .isUUID()
      .withMessage('Valid UUID is required')
  ],

  // Pagination validation
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Page must be between 1 and 1000'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],

  // Search validation
  search: [
    query('search')
      .optional()
      .isLength({ min: 1, max: 100 })
      .matches(/^[a-zA-Z0-9\s\-_@\.]+$/)
      .withMessage('Search query must be 1-100 characters and contain only letters, numbers, spaces, hyphens, underscores, @ and periods')
  ],

  // Credit purchase validation
  creditPurchase: [
    body('amount')
      .isInt({ min: 50, max: 10000 })
      .withMessage('Credit amount must be between 50 and 10000'),
    
    body('paymentMethodId')
      .isLength({ min: 1 })
      .matches(/^pm_[a-zA-Z0-9]+$/)
      .withMessage('Valid Stripe payment method ID is required')
  ],

  // File upload validation
  fileUpload: [
    body('filename')
      .optional()
      .isLength({ max: 255 })
      .matches(/^[a-zA-Z0-9\s\-_\.]+$/)
      .withMessage('Filename must be less than 255 characters and contain only letters, numbers, spaces, hyphens, underscores, and periods')
  ]
};

// Legacy validation functions for backward compatibility
export const validateRegistration = (req: Request, res: Response, next: NextFunction): void => {
  const { email, name } = req.body;

  if (!email || !validateEmail(email)) {
    res.status(400).json({
      error: {
        code: 'INVALID_EMAIL',
        message: 'Valid email address is required',
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  if (!name || name.trim().length < 2 || name.trim().length > 50) {
    res.status(400).json({
      error: {
        code: 'INVALID_NAME',
        message: 'Name must be between 2 and 50 characters long',
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  req.body.email = sanitizeInput(email);
  req.body.name = sanitizeInput(name);
  next();
};

// Request sanitization middleware
export const sanitizeRequest = (req: Request, res: Response, next: NextFunction): void => {
  // Sanitize body
  if (req.body && typeof req.body === 'object') {
    for (const [key, value] of Object.entries(req.body)) {
      if (typeof value === 'string') {
        req.body[key] = sanitizeInput(value);
      }
    }
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') {
        req.query[key] = sanitizeInput(value);
      }
    }
  }

  // Sanitize route parameters
  if (req.params && typeof req.params === 'object') {
    for (const [key, value] of Object.entries(req.params)) {
      if (typeof value === 'string') {
        req.params[key] = sanitizeInput(value);
      }
    }
  }

  next();
};