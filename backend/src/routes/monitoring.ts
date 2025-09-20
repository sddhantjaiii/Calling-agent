import { Router, Request, Response } from 'express';
import database from '../config/database';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/monitoring/database
 * Get comprehensive database connection pool statistics
 */
router.get('/database', async (req: Request, res: Response) => {
  try {
    const stats = database.getDetailedStats();
    const healthStatus = await database.healthCheck();
    
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      health: {
        status: healthStatus ? 'healthy' : 'unhealthy',
        connected: database.connected
      },
      connectionPool: stats.pool,
      configuration: stats.config,
      performance: stats.performance,
      recommendations: generateRecommendations(stats)
    };

    logger.info('Database monitoring stats retrieved', {
      health: response.health.status,
      totalConnections: stats.pool.totalConnections,
      activeConnections: stats.pool.activeConnections,
      queryCount: stats.pool.queryCount
    });

    res.json(response);
  } catch (error) {
    logger.error('Failed to retrieve database monitoring stats', {
      error: error instanceof Error ? error.message : error
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve database monitoring statistics',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/monitoring/database/health
 * Simple health check endpoint for load balancers
 */
router.get('/database/health', async (req: Request, res: Response) => {
  try {
    const isHealthy = await database.healthCheck();
    const stats = database.getPoolStats();
    
    if (isHealthy) {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        connections: {
          total: stats.totalConnections,
          active: stats.activeConnections,
          idle: stats.idleConnections
        }
      });
    } else {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Database health check failed'
      });
    }
  } catch (error) {
    logger.error('Database health check endpoint failed', {
      error: error instanceof Error ? error.message : error
    });

    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

/**
 * GET /api/monitoring/database/metrics
 * Get real-time connection pool metrics
 */
router.get('/database/metrics', (req: Request, res: Response) => {
  try {
    const stats = database.getPoolStats();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics: {
        connections: {
          total: stats.totalConnections,
          active: stats.activeConnections,
          idle: stats.idleConnections,
          waiting: stats.waitingClients
        },
        queries: {
          total: stats.queryCount,
          slow: stats.slowQueryCount,
          averageTime: Math.round(stats.averageQueryTime),
          slowPercentage: stats.queryCount > 0 ? 
            Math.round((stats.slowQueryCount / stats.queryCount) * 100) : 0
        },
        errors: {
          connectionErrors: stats.connectionErrors,
          errorRate: stats.queryCount > 0 ? 
            Math.round((stats.connectionErrors / stats.queryCount) * 100) : 0
        },
        health: {
          status: stats.healthCheckStatus,
          lastCheck: stats.lastHealthCheck
        }
      }
    });
  } catch (error) {
    logger.error('Failed to retrieve database metrics', {
      error: error instanceof Error ? error.message : error
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve database metrics',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/monitoring/database/refresh
 * Force refresh connection pool health check
 */
router.post('/database/refresh', async (req: Request, res: Response) => {
  try {
    const isHealthy = await database.healthCheck();
    const stats = database.getPoolStats();
    
    logger.info('Manual database health check performed', {
      healthy: isHealthy,
      totalConnections: stats.totalConnections,
      activeConnections: stats.activeConnections
    });

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      health: {
        status: isHealthy ? 'healthy' : 'unhealthy',
        lastCheck: stats.lastHealthCheck
      },
      connections: {
        total: stats.totalConnections,
        active: stats.activeConnections,
        idle: stats.idleConnections,
        waiting: stats.waitingClients
      }
    });
  } catch (error) {
    logger.error('Manual database health check failed', {
      error: error instanceof Error ? error.message : error
    });

    res.status(500).json({
      success: false,
      error: 'Failed to perform health check',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Generate performance recommendations based on current metrics
 */
function generateRecommendations(stats: any): string[] {
  const recommendations: string[] = [];
  
  // Connection pool recommendations
  if (stats.pool.activeConnections / stats.pool.totalConnections > 0.8) {
    recommendations.push('Consider increasing maximum connection pool size - high utilization detected');
  }
  
  if (stats.pool.waitingClients > 0) {
    recommendations.push('Clients are waiting for connections - consider increasing pool size or optimizing query performance');
  }
  
  // Query performance recommendations
  if (stats.performance.slowQueryPercentage > 10) {
    recommendations.push('High percentage of slow queries detected - review and optimize database queries');
  }
  
  if (stats.performance.errorRate > 5) {
    recommendations.push('High error rate detected - investigate connection issues and query failures');
  }
  
  // Health recommendations
  if (stats.pool.healthCheckStatus !== 'healthy') {
    recommendations.push('Database health check failing - investigate database connectivity and performance');
  }
  
  if (stats.pool.connectionErrors > 10) {
    recommendations.push('Multiple connection errors detected - check database server status and network connectivity');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Connection pool is performing optimally');
  }
  
  return recommendations;
}

export default router;