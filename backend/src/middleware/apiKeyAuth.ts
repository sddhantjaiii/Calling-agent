import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// API Key authentication middleware for external services
export interface ApiKeyRequest extends Request {
  apiKeyValid?: boolean;
  apiKeySource?: string;
}

/**
 * Middleware to authenticate API key for external services
 * This is used for endpoints that external services (like ElevenLabs) call
 */
export const authenticateApiKey = (req: ApiKeyRequest, res: Response, next: NextFunction): void => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      logger.warn('API key missing in external request:', {
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      res.status(401).json({ 
        error: 'API key required',
        message: 'Please provide a valid API key in the X-API-Key header'
      });
      return;
    }

    // For now, we'll use a simple API key validation
    // In production, this should be configurable and stored securely
    const validApiKeys = [
      process.env.ELEVENLABS_API_KEY, // Allow ElevenLabs to use their own API key
      process.env.EXTERNAL_API_KEY,   // Dedicated external API key
      'contact-lookup-key-dev'        // Development key
    ].filter(Boolean);

    if (!validApiKeys.includes(apiKey)) {
      logger.warn('Invalid API key used in external request:', {
        path: req.path,
        ip: req.ip,
        apiKeyPrefix: apiKey.substring(0, 8) + '...',
        userAgent: req.get('User-Agent')
      });
      res.status(401).json({ 
        error: 'Invalid API key',
        message: 'The provided API key is not valid'
      });
      return;
    }

    // Mark request as authenticated
    req.apiKeyValid = true;
    req.apiKeySource = 'external';
    
    logger.info('External API request authenticated:', {
      path: req.path,
      ip: req.ip,
      apiKeyPrefix: apiKey.substring(0, 8) + '...'
    });

    next();
  } catch (error) {
    logger.error('Error in API key authentication:', error);
    res.status(500).json({ 
      error: 'Authentication error',
      message: 'Failed to authenticate API key'
    });
  }
};

/**
 * Optional API key authentication - allows both authenticated and unauthenticated requests
 * This is useful for endpoints that can work with or without authentication
 */
export const optionalApiKeyAuth = (req: ApiKeyRequest, res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    // No API key provided, continue without authentication
    req.apiKeyValid = false;
    next();
    return;
  }

  // API key provided, validate it
  authenticateApiKey(req, res, next);
};

/**
 * Rate limiting for external API requests
 * More restrictive than internal API rate limiting
 */
export const externalApiRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  // For now, just log the request
  // In production, implement proper rate limiting based on IP/API key
  logger.info('External API request:', {
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  next();
};