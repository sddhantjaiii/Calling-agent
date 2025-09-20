import { Request, Response, NextFunction } from 'express';
import { UserModel } from '../models/User';
import AdminAuditLogModel from '../models/AdminAuditLog';

// Extend Express Request interface to include admin context
declare global {
  namespace Express {
    interface Request {
      isAdmin?: boolean;
      isSuperAdmin?: boolean;
      adminUser?: any;
    }
  }
}

/**
 * Middleware to check if user has admin privileges
 */
export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // First check if user is authenticated
    if (!req.user || !req.userId) {
      res.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'User must be authenticated to access admin resources',
          timestamp: new Date(),
        },
      });
      return;
    }

    // Get user from database to check role
    const userModel = new UserModel();
    const user = await userModel.findById(req.userId);
    
    if (!user) {
      res.status(401).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found in system',
          timestamp: new Date(),
        },
      });
      return;
    }

    // Check if user has admin privileges
    if (!userModel.isAdmin(user)) {
      res.status(403).json({
        error: {
          code: 'ADMIN_ACCESS_REQUIRED',
          message: 'Admin privileges required to access this resource',
          timestamp: new Date(),
        },
      });
      return;
    }

    // Check if user account is active
    if (!user.is_active) {
      res.status(403).json({
        error: {
          code: 'ACCOUNT_SUSPENDED',
          message: 'Admin account is suspended',
          timestamp: new Date(),
        },
      });
      return;
    }

    // Attach admin context to request
    req.isAdmin = true;
    req.isSuperAdmin = userModel.isSuperAdmin(user);
    req.adminUser = user;
    
    next();
  } catch (error) {
    console.error('Admin authentication middleware error:', error);
    res.status(500).json({
      error: {
        code: 'ADMIN_AUTH_ERROR',
        message: 'Failed to verify admin privileges',
        timestamp: new Date(),
      },
    });
  }
};

/**
 * Middleware to check if user has super admin privileges
 */
export const requireSuperAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // First check if user is authenticated
    if (!req.user || !req.userId) {
      res.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'User must be authenticated to access super admin resources',
          timestamp: new Date(),
        },
      });
      return;
    }

    // Get user from database to check role
    const userModel = new UserModel();
    const user = await userModel.findById(req.userId);
    
    if (!user) {
      res.status(401).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found in system',
          timestamp: new Date(),
        },
      });
      return;
    }

    // Check if user has super admin privileges
    if (!userModel.isSuperAdmin(user)) {
      res.status(403).json({
        error: {
          code: 'SUPER_ADMIN_ACCESS_REQUIRED',
          message: 'Super admin privileges required to access this resource',
          timestamp: new Date(),
        },
      });
      return;
    }

    // Check if user account is active
    if (!user.is_active) {
      res.status(403).json({
        error: {
          code: 'ACCOUNT_SUSPENDED',
          message: 'Super admin account is suspended',
          timestamp: new Date(),
        },
      });
      return;
    }

    // Attach admin context to request
    req.isAdmin = true;
    req.isSuperAdmin = true;
    req.adminUser = user;
    
    next();
  } catch (error) {
    console.error('Super admin authentication middleware error:', error);
    res.status(500).json({
      error: {
        code: 'SUPER_ADMIN_AUTH_ERROR',
        message: 'Failed to verify super admin privileges',
        timestamp: new Date(),
      },
    });
  }
};

/**
 * Middleware to log admin actions for audit trail
 */
export const logAdminAction = (action: string, resourceType: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Store original res.json to intercept response
      const originalJson = res.json;
      let responseData: any;
      
      res.json = function(data: any) {
        responseData = data;
        return originalJson.call(this, data);
      };

      // Store original res.end to log after response
      const originalEnd = res.end;
      res.end = function(...args: any[]) {
        // Log the action after response is sent
        if (req.adminUser && res.statusCode < 400) {
          setImmediate(async () => {
            try {
              const logData = {
                admin_user_id: req.adminUser.id,
                action,
                resource_type: resourceType,
                resource_id: req.params.id || req.params.userId || req.body.id,
                target_user_id: req.params.userId || req.body.userId,
                details: {
                  method: req.method,
                  url: req.originalUrl,
                  body: req.method !== 'GET' ? req.body : undefined,
                  query: Object.keys(req.query).length > 0 ? req.query : undefined,
                  response_status: res.statusCode,
                  response_data: responseData
                },
                ip_address: req.ip || req.connection.remoteAddress,
                user_agent: req.get('User-Agent')
              };

              await AdminAuditLogModel.logAction(logData);
            } catch (error) {
              console.error('Failed to log admin action:', error);
            }
          });
        }
        
        return (originalEnd as any).apply(this, args);
      };

      next();
    } catch (error) {
      console.error('Admin action logging middleware error:', error);
      next(); // Continue even if logging fails
    }
  };
};

/**
 * Helper function to manually log admin actions
 */
export const logAdminActionManual = async (
  adminUserId: string,
  action: string,
  resourceType: string,
  details: {
    resource_id?: string;
    target_user_id?: string;
    details?: Record<string, any>;
    ip_address?: string;
    user_agent?: string;
  }
): Promise<void> => {
  try {
    await AdminAuditLogModel.logAction({
      admin_user_id: adminUserId,
      action,
      resource_type: resourceType,
      ...details
    });
  } catch (error) {
    console.error('Failed to manually log admin action:', error);
  }
};