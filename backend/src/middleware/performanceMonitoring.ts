import { Request, Response, NextFunction } from 'express';
import database from '../config/database';
import { logger } from '../utils/logger';

interface PerformanceMetrics {
  requestId: string;
  method: string;
  url: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  statusCode?: number;
  connectionPoolStats?: any;
  queryCount?: number;
  slowQueries?: number;
}

// Store active requests for monitoring
const activeRequests = new Map<string, PerformanceMetrics>();

/**
 * Performance monitoring middleware for tracking database connection pool usage
 */
export function performanceMonitoring(req: Request, res: Response, next: NextFunction): void {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  // Store initial metrics
  const initialStats = database.getPoolStats();
  const metrics: PerformanceMetrics = {
    requestId,
    method: req.method,
    url: req.originalUrl || req.url,
    startTime,
    connectionPoolStats: initialStats
  };
  
  activeRequests.set(requestId, metrics);
  
  // Add request ID to request object for tracking
  (req as any).requestId = requestId;
  
  // Override res.end to capture completion metrics
  const originalEnd = res.end.bind(res);
  res.end = function(this: Response, chunk?: any, encoding?: any, cb?: () => void): Response {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Get final connection pool stats
    const finalStats = database.getPoolStats();
    
    // Update metrics
    metrics.endTime = endTime;
    metrics.duration = duration;
    metrics.statusCode = res.statusCode;
    metrics.queryCount = finalStats.queryCount - initialStats.queryCount;
    metrics.slowQueries = finalStats.slowQueryCount - initialStats.slowQueryCount;
    
    // Log performance metrics
    logPerformanceMetrics(metrics, finalStats);
    
    // Clean up
    activeRequests.delete(requestId);
    
    // Call original end method with proper return type
    return originalEnd(chunk, encoding, cb);
  };
  
  next();
}

/**
 * Log performance metrics with connection pool information
 */
function logPerformanceMetrics(metrics: PerformanceMetrics, finalStats: any): void {
  const logData = {
    requestId: metrics.requestId,
    method: metrics.method,
    url: metrics.url,
    duration: metrics.duration,
    statusCode: metrics.statusCode,
    queriesExecuted: metrics.queryCount,
    slowQueries: metrics.slowQueries,
    connectionPool: {
      totalConnections: finalStats.totalConnections,
      activeConnections: finalStats.activeConnections,
      idleConnections: finalStats.idleConnections,
      waitingClients: finalStats.waitingClients,
      healthStatus: finalStats.healthCheckStatus
    }
  };
  
  // Log based on performance thresholds
  if (metrics.duration! > 5000) {
    logger.warn('Very slow request detected', logData);
  } else if (metrics.duration! > 2000) {
    logger.warn('Slow request detected', logData);
  } else if (metrics.slowQueries! > 0) {
    logger.info('Request with slow queries', logData);
  } else {
    logger.debug('Request completed', logData);
  }
  
  // Log connection pool warnings
  if (finalStats.waitingClients > 0) {
    logger.warn('Clients waiting for database connections', {
      waitingClients: finalStats.waitingClients,
      totalConnections: finalStats.totalConnections,
      activeConnections: finalStats.activeConnections
    });
  }
  
  if (finalStats.activeConnections / finalStats.totalConnections > 0.8) {
    logger.warn('High connection pool utilization', {
      utilization: Math.round((finalStats.activeConnections / finalStats.totalConnections) * 100) + '%',
      activeConnections: finalStats.activeConnections,
      totalConnections: finalStats.totalConnections
    });
  }
}

/**
 * Get current performance metrics for all active requests
 */
export function getActiveRequestMetrics(): PerformanceMetrics[] {
  const currentTime = Date.now();
  return Array.from(activeRequests.values()).map(metrics => ({
    ...metrics,
    duration: currentTime - metrics.startTime
  }));
}

/**
 * Get performance summary statistics
 */
export function getPerformanceSummary(): {
  activeRequests: number;
  connectionPool: any;
  recommendations: string[];
} {
  const stats = database.getDetailedStats();
  const activeRequestCount = activeRequests.size;
  
  const recommendations: string[] = [];
  
  // Generate performance recommendations
  if (activeRequestCount > 10) {
    recommendations.push('High number of concurrent requests - monitor for performance impact');
  }
  
  if (stats.pool.waitingClients > 0) {
    recommendations.push('Clients waiting for connections - consider increasing pool size');
  }
  
  if (stats.performance.slowQueryPercentage > 10) {
    recommendations.push('High percentage of slow queries - optimize database queries');
  }
  
  if (stats.performance.errorRate > 5) {
    recommendations.push('High error rate - investigate connection issues');
  }
  
  return {
    activeRequests: activeRequestCount,
    connectionPool: stats,
    recommendations
  };
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Middleware to add performance monitoring endpoints
 */
export function addPerformanceEndpoints(req: Request, res: Response, next: NextFunction): void {
  // Add performance data to health check responses
  if (req.path === '/health' && req.method === 'GET') {
    const originalJson = res.json.bind(res);
    res.json = function(this: Response, data: any): Response {
      const performanceData = getPerformanceSummary();
      const enhancedData = {
        ...data,
        performance: {
          activeRequests: performanceData.activeRequests,
          connectionPool: {
            total: performanceData.connectionPool.pool.totalConnections,
            active: performanceData.connectionPool.pool.activeConnections,
            idle: performanceData.connectionPool.pool.idleConnections,
            waiting: performanceData.connectionPool.pool.waitingClients,
            health: performanceData.connectionPool.pool.healthCheckStatus
          },
          recommendations: performanceData.recommendations
        }
      };
      return originalJson(enhancedData);
    };
  }
  
  next();
}