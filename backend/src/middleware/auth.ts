import { Request, Response, NextFunction } from 'express';
import { authService, User } from '../services/authService';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
      userId?: string;
    }
  }
}

// Type for authenticated requests
export interface AuthenticatedRequest extends Request {
  user: User;
  userId: string;
}

/**
 * Authentication middleware that validates JWT tokens
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = authService.extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      res.status(401).json({
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authorization token is required',
          timestamp: new Date(),
        },
      });
      return;
    }

    const user = await authService.validateSession(token);
    
    if (!user) {
      res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
          timestamp: new Date(),
        },
      });
      return;
    }

    // Attach user information to request
    req.user = user;
    req.userId = user.id;
    
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(401).json({
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed',
        timestamp: new Date(),
      },
    });
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token provided
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = authService.extractTokenFromHeader(req.headers.authorization);
    
    if (token) {
      const user = await authService.validateSession(token);
      if (user) {
        req.user = user;
        req.userId = user.id;
      }
    }
    
    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    // Continue without authentication
    next();
  }
};

/**
 * Middleware to ensure user is authenticated (stricter check)
 */
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || !req.userId) {
    res.status(401).json({
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'User must be authenticated to access this resource',
        timestamp: new Date(),
      },
    });
    return;
  }
  
  next();
};

/**
 * Middleware to ensure user has admin privileges
 */
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || !req.userId) {
    res.status(401).json({
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'User must be authenticated to access this resource',
        timestamp: new Date(),
      },
    });
    return;
  }
  
  // Check if user has admin role
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    res.status(403).json({
      error: {
        code: 'INSUFFICIENT_PRIVILEGES',
        message: 'Admin privileges required to access this resource',
        timestamp: new Date(),
      },
    });
    return;
  }
  
  next();
};

/**
 * Middleware to ensure user has super admin privileges
 */
export const requireSuperAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || !req.userId) {
    res.status(401).json({
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'User must be authenticated to access this resource',
        timestamp: new Date(),
      },
    });
    return;
  }
  
  // Check if user has super admin role
  if (req.user.role !== 'super_admin') {
    res.status(403).json({
      error: {
        code: 'INSUFFICIENT_PRIVILEGES',
        message: 'Super admin privileges required to access this resource',
        timestamp: new Date(),
      },
    });
    return;
  }
  
  next();
};