import { Request, Response, NextFunction } from 'express';

// Enhanced rate limiting middleware - prevents abuse and manages API usage
interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked: boolean;
  blockUntil?: number;
}

interface RateLimitStore {
  [key: string]: RateLimitEntry;
}

const store: RateLimitStore = {};

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now && (!store[key].blockUntil || store[key].blockUntil < now)) {
      delete store[key];
    }
  });
}, 5 * 60 * 1000);

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  blockDuration?: number; // How long to block after exceeding limit
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  onLimitReached?: (req: Request, res: Response) => void;
}

export const createRateLimit = (options: RateLimitOptions) => {
  const {
    windowMs,
    maxRequests,
    blockDuration = 0,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = (req: Request) => req.ip || 'unknown',
    onLimitReached
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator(req);
    const now = Date.now();

    // Check if IP is currently blocked
    if (store[key]?.blocked && store[key].blockUntil && now < store[key].blockUntil) {
      const remainingTime = Math.ceil((store[key].blockUntil! - now) / 1000);
      res.status(429).json({
        error: {
          code: 'IP_TEMPORARILY_BLOCKED',
          message: `IP temporarily blocked. Try again in ${remainingTime} seconds`,
          retryAfter: remainingTime,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // Initialize or reset counter if window expired
    if (!store[key] || now > store[key].resetTime) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs,
        blocked: false
      };
      next();
      return;
    }

    // Check if limit exceeded
    if (store[key].count >= maxRequests) {
      // Block IP if blockDuration is set
      if (blockDuration > 0) {
        store[key].blocked = true;
        store[key].blockUntil = now + blockDuration;
      }

      // Call custom handler if provided
      if (onLimitReached) {
        onLimitReached(req, res);
      }

      const resetTime = Math.ceil((store[key].resetTime - now) / 1000);
      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later',
          retryAfter: resetTime,
          limit: maxRequests,
          remaining: 0,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // Increment counter
    store[key].count++;

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - store[key].count));
    res.setHeader('X-RateLimit-Reset', new Date(store[key].resetTime).toISOString());

    next();
  };
};

// Enhanced rate limiting configurations
export const generalRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: process.env.NODE_ENV === 'development' ? 1000 : 300, // Increased production limit
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, fallback to IP
    const userId = (req as any).user?.id;
    return userId ? `user:${userId}` : req.ip || 'unknown';
  }
});

export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: process.env.NODE_ENV === 'development' ? 50 : 5, // Much higher limit for development
  blockDuration: process.env.NODE_ENV === 'development' ? 0 : 30 * 60 * 1000, // No blocking in development
  keyGenerator: (req: Request) => req.ip || 'unknown',
  onLimitReached: (req: Request, res: Response) => {
    console.warn(`Authentication rate limit exceeded for IP: ${req.ip}`);
  }
});

export const uploadRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes (shorter window for development)
  maxRequests: 50, // More generous limit for development
  keyGenerator: (req: Request) => req.ip || 'unknown'
});

export const webhookRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // Allow high frequency for webhooks
  keyGenerator: (req: Request) => req.ip || 'unknown'
});

export const adminRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 200, // Higher limit for admin operations
  keyGenerator: (req: Request) => req.ip || 'unknown'
});

// Very lenient rate limit for session validation
export const sessionValidationRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 requests per minute should be plenty
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.id;
    return userId ? `session:${userId}` : req.ip || 'unknown';
  }
});

// User-specific rate limiting (requires authentication)
export const createUserRateLimit = (options: RateLimitOptions) => {
  return createRateLimit({
    ...options,
    keyGenerator: (req: Request) => {
      // Use user ID if authenticated, fallback to IP
      const userId = (req as any).user?.id;
      return userId ? `user:${userId}` : req.ip || 'unknown';
    }
  });
};

export const userApiRateLimit = createUserRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60 // 60 requests per minute per user
});

export const userUploadRateLimit = createUserRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5 // 5 uploads per hour per user
});

// Development utility to clear rate limit store
export const clearRateLimitStore = () => {
  Object.keys(store).forEach(key => {
    delete store[key];
  });
  console.log('Rate limit store cleared');
};

// Get current rate limit status for debugging
export const getRateLimitStatus = (ip: string) => {
  return store[ip] || null;
};