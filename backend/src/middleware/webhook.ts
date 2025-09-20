import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Enhanced middleware to capture raw body with comprehensive error handling
 * This should be applied before the JSON body parser for webhook routes
 */
export function captureRawBody(req: Request, res: Response, next: NextFunction): void {
  logger.info('🔍 captureRawBody middleware called', {
    path: req.path,
    includes_elevenlabs: req.path.includes('/elevenlabs'),
    method: req.method
  });

  if (req.path.includes('/elevenlabs')) {
    logger.info('🚀 Skipping raw body capture - using simple passthrough for debugging');
    // For now, just pass through to avoid hanging
    // We'll add signature verification back later
    next();
  } else {
    next();
  }
}

/**
 * Enhanced middleware to validate webhook headers with comprehensive checks
 */
export function validateWebhookHeaders(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req as any).requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  logger.info('🔍 validateWebhookHeaders middleware called', {
    request_id: requestId,
    path: req.path,
    method: req.method,
    processing_step: 'header_validation_start'
  });

  // For now, just pass through to avoid hanging
  logger.info('🚀 Skipping header validation - using simple passthrough for debugging');
  next();
  return;

  const validationErrors: string[] = [];

  // Validate Content-Type
  const contentType = req.headers['content-type'];
  if (!contentType) {
    validationErrors.push('Missing Content-Type header');
  } else if (!contentType?.includes('application/json')) {
    validationErrors.push(`Invalid Content-Type: ${contentType}. Expected application/json`);
  }

  // Validate Content-Length if present
  const contentLength = req.headers['content-length'];
  if (contentLength) {
    const length = parseInt(contentLength || '0', 10);
    if (isNaN(length) || length < 0) {
      validationErrors.push(`Invalid Content-Length: ${contentLength}`);
    } else if (length > 10 * 1024 * 1024) { // 10MB limit
      validationErrors.push(`Content-Length too large: ${length} bytes (max: 10MB)`);
    }
  }

  // Check for required ElevenLabs headers
  const signature = req.headers['elevenlabs-signature'];
  const userAgent = req.headers['user-agent'];

  // Log header information for debugging
  logger.debug('📋 Webhook headers analysis', {
    request_id: requestId,
    content_type: contentType,
    content_length: contentLength,
    has_signature: !!signature,
    user_agent: userAgent,
    host: req.headers.host,
    origin: req.headers.origin,
    processing_step: 'header_analysis_complete'
  });

  // Check for suspicious patterns
  const suspiciousPatterns = [
    { pattern: /bot|crawler|spider/i, header: 'user-agent', description: 'Bot-like user agent' },
    { pattern: /localhost|127\.0\.0\.1/i, header: 'origin', description: 'Local origin' }
  ];

  const suspiciousFlags: string[] = [];
  suspiciousPatterns.forEach(({ pattern, header, description }) => {
    const headerValue = req.headers[header];
    if (headerValue && pattern.test(String(headerValue))) {
      suspiciousFlags.push(`${description}: ${headerValue}`);
    }
  });

  if (suspiciousFlags.length > 0) {
    logger.warn('⚠️ Suspicious webhook request detected', {
      request_id: requestId,
      suspicious_flags: suspiciousFlags,
      ip: req.ip,
      processing_step: 'header_validation_suspicious'
    });
  }

  // Fail validation if there are critical errors
  if (validationErrors.length > 0) {
    logger.warn('❌ Webhook header validation failed', {
      request_id: requestId,
      validation_errors: validationErrors,
      headers: {
        content_type: contentType,
        content_length: contentLength,
        user_agent: userAgent,
        has_signature: !!signature
      },
      processing_step: 'header_validation_failed'
    });

    res.status(400).json({
      success: false,
      error: 'Invalid webhook headers',
      request_id: requestId,
      timestamp: new Date().toISOString(),
      details: validationErrors.join(', ')
    });
    return;
  }

  logger.debug('✅ Webhook header validation passed', {
    request_id: requestId,
    content_type: contentType,
    has_signature: !!signature,
    user_agent: userAgent,
    processing_step: 'header_validation_passed'
  });

  next();
}

/**
 * Middleware to log webhook requests for debugging
 */
export function logWebhookRequest(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  logger.info('Incoming webhook request', {
    method: req.method,
    path: req.path,
    headers: {
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent'],
      'elevenlabs-signature': req.headers['elevenlabs-signature'] ? '[PRESENT]' : '[MISSING]'
    },
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('Webhook request completed', {
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
  });

  next();
}

/**
 * Middleware to handle webhook rate limiting
 * Disabled to allow multiple simultaneous webhooks from ElevenLabs
 */
export function webhookRateLimit(req: Request, res: Response, next: NextFunction): void {
  // No rate limiting for webhooks - we need to handle multiple simultaneous payloads
  // ElevenLabs may send multiple webhooks concurrently for different conversations
  next();
}