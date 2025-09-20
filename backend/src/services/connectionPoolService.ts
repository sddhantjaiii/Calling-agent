import { Pool, PoolClient, PoolConfig } from 'pg';
import { logger } from '../utils/logger';

export interface ConnectionPoolMetrics {
  totalConnections: number;
  idleConnections: number;
  waitingClients: number;
  activeConnections: number;
  connectionErrors: number;
  queryCount: number;
  slowQueryCount: number;
  averageQueryTime: number;
  lastHealthCheck: Date | null;
  healthCheckStatus: 'healthy' | 'unhealthy' | 'unknown';
}

export interface ConnectionPoolConfig extends PoolConfig {
  // Enhanced configuration options
  healthCheckInterval?: number;
  slowQueryThreshold?: number;
  maxRetries?: number;
  retryDelay?: number;
  connectionTimeout?: number;
  queryTimeout?: number;
}

export class ConnectionPoolService {
  private pool: Pool;
  private metrics: ConnectionPoolMetrics;
  private healthCheckInterval: any | null = null;
  private config: ConnectionPoolConfig;
  private isShuttingDown: boolean = false;

  constructor(config: ConnectionPoolConfig) {
    this.config = {
      // Default optimal settings for PostgreSQL connection pooling
      max: 20, // Maximum number of clients in the pool
      min: 5,  // Minimum number of clients to keep in the pool
      idleTimeoutMillis: 300000, // 5 minutes - keep idle clients
      connectionTimeoutMillis: 10000, // 10 seconds connection timeout
      maxUses: 7500, // Close connection after 7500 uses
      allowExitOnIdle: false, // Keep pool alive
      
      // Enhanced configuration
      healthCheckInterval: 30000, // 30 seconds
      slowQueryThreshold: 1000, // 1 second
      maxRetries: 3,
      retryDelay: 1000, // 1 second base delay
      queryTimeout: 30000, // 30 seconds query timeout
      
      ...config
    };

    this.pool = new Pool(this.config);
    this.metrics = this.initializeMetrics();
    this.setupEventHandlers();
    this.startHealthChecks();
  }

  private initializeMetrics(): ConnectionPoolMetrics {
    return {
      totalConnections: 0,
      idleConnections: 0,
      waitingClients: 0,
      activeConnections: 0,
      connectionErrors: 0,
      queryCount: 0,
      slowQueryCount: 0,
      averageQueryTime: 0,
      lastHealthCheck: null,
      healthCheckStatus: 'unknown'
    };
  }

  private setupEventHandlers(): void {
    // Connection established
    this.pool.on('connect', (client: PoolClient) => {
      logger.info('New database client connected to pool', {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      });

      // Enforce IST for this session
      client.query("SET TIME ZONE 'Asia/Kolkata'").catch((err) => {
        logger.warn('Failed to set session time zone to Asia/Kolkata', { error: err?.message });
      });
    });

    // Connection error
    this.pool.on('error', (err: Error, client: PoolClient) => {
      this.metrics.connectionErrors++;
      logger.error('Unexpected error on idle database client', {
        error: err.message,
        stack: err.stack,
        totalErrors: this.metrics.connectionErrors
      });
    });

    // Client removed from pool
    this.pool.on('remove', (client: PoolClient) => {
      logger.info('Database client removed from pool', {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount
      });
    });

    // Acquire client from pool
    this.pool.on('acquire', (client: PoolClient) => {
      logger.debug('Client acquired from pool', {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      });
    });
  }

  /**
   * Initialize the connection pool with retry logic
   */
  async initialize(): Promise<void> {
    let attempts = 0;
    const maxRetries = this.config.maxRetries || 3;
    const baseDelay = this.config.retryDelay || 1000;

    while (attempts < maxRetries) {
      try {
        // Test the connection
        const client = await this.pool.connect();
        await client.query('SELECT NOW()');
        client.release();

        // Warm up the pool
        await this.warmupPool();

        logger.info('Database connection pool initialized successfully', {
          maxConnections: this.config.max,
          minConnections: this.config.min,
          idleTimeout: this.config.idleTimeoutMillis,
          connectionTimeout: this.config.connectionTimeoutMillis
        });

        this.metrics.healthCheckStatus = 'healthy';
        return;
      } catch (error) {
        attempts++;
        this.metrics.connectionErrors++;
        
        logger.error(`Database connection attempt ${attempts} failed`, {
          error: error instanceof Error ? error.message : error,
          attempt: attempts,
          maxRetries
        });

        if (attempts >= maxRetries) {
          this.metrics.healthCheckStatus = 'unhealthy';
          throw new Error(`Failed to initialize database connection pool after ${maxRetries} attempts: ${error}`);
        }

        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempts - 1);
        logger.info(`Retrying database connection in ${delay}ms...`);
        await this.sleep(delay);
      }
    }
  }

  /**
   * Warm up the connection pool by creating initial connections
   */
  private async warmupPool(): Promise<void> {
    try {
      const minConnections = this.config.min || 5;
      const warmupPromises: Promise<void>[] = [];

      for (let i = 0; i < minConnections; i++) {
        warmupPromises.push(
          this.pool.connect().then(client => {
            client.release();
          })
        );
      }

      await Promise.all(warmupPromises);
      logger.info(`Connection pool warmed up with ${minConnections} connections`);
    } catch (error) {
      logger.warn('Pool warmup failed, but continuing', {
        error: error instanceof Error ? error.message : error
      });
    }
  }

  /**
   * Get a client from the connection pool with retry logic
   */
  async getClient(): Promise<PoolClient> {
    let attempts = 0;
    const maxRetries = this.config.maxRetries || 3;
    const baseDelay = this.config.retryDelay || 1000;

    while (attempts < maxRetries) {
      try {
        const client = await this.pool.connect();
        this.updateMetrics();
        return client;
      } catch (error) {
        attempts++;
        this.metrics.connectionErrors++;
        
        logger.error(`Failed to get database client (attempt ${attempts})`, {
          error: error instanceof Error ? error.message : error,
          attempt: attempts,
          maxRetries
        });

        if (attempts >= maxRetries) {
          this.metrics.healthCheckStatus = 'unhealthy';
          throw new Error(`Failed to get database client after ${maxRetries} attempts: ${error}`);
        }

        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempts - 1);
        await this.sleep(delay);
      }
    }

    throw new Error('Unexpected error in getClient method');
  }

  /**
   * Execute a query with automatic client management and performance monitoring
   */
  async query(text: string, params?: any[]): Promise<any> {
    const startTime = Date.now();
    const client = await this.getClient();

    try {
      const result = await client.query(text, params);
      
      // Update metrics
      const duration = Date.now() - startTime;
      this.metrics.queryCount++;
      this.updateAverageQueryTime(duration);

      // Log slow queries
      const slowQueryThreshold = this.config.slowQueryThreshold || 1000;
      if (duration > slowQueryThreshold) {
        this.metrics.slowQueryCount++;
        logger.warn('Slow query detected', {
          duration,
          query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
          params: params ? params.length : 0
        });
      }

      logger.debug('Query executed successfully', {
        duration,
        queryLength: text.length,
        paramCount: params ? params.length : 0
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Database query error', {
        error: error instanceof Error ? error.message : error,
        duration,
        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        params: params ? params.length : 0
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute a transaction with automatic rollback on error
   */
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    const startTime = Date.now();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      
      const duration = Date.now() - startTime;
      logger.debug('Transaction completed successfully', { duration });
      
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      const duration = Date.now() - startTime;
      
      logger.error('Transaction rolled back due to error', {
        error: error instanceof Error ? error.message : error,
        duration
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Perform health check on the connection pool
   */
  async healthCheck(): Promise<boolean> {
    try {
      const startTime = Date.now();
      const result = await this.query('SELECT 1 as health, NOW() as timestamp');
      const duration = Date.now() - startTime;
      
      const isHealthy = result.rows[0].health === 1;
      this.metrics.lastHealthCheck = new Date();
      this.metrics.healthCheckStatus = isHealthy ? 'healthy' : 'unhealthy';
      
      logger.debug('Health check completed', {
        healthy: isHealthy,
        duration,
        timestamp: result.rows[0].timestamp
      });
      
      return isHealthy;
    } catch (error) {
      this.metrics.lastHealthCheck = new Date();
      this.metrics.healthCheckStatus = 'unhealthy';
      
      logger.error('Health check failed', {
        error: error instanceof Error ? error.message : error
      });
      
      return false;
    }
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    const interval = this.config.healthCheckInterval || 30000;
    
    this.healthCheckInterval = setInterval(async () => {
      if (!this.isShuttingDown) {
        await this.healthCheck();
        this.updateMetrics();
      }
    }, interval);

    logger.info('Health check monitoring started', {
      interval: interval / 1000 + ' seconds'
    });
  }

  /**
   * Stop health checks
   */
  private stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      logger.info('Health check monitoring stopped');
    }
  }

  /**
   * Update connection pool metrics
   */
  private updateMetrics(): void {
    this.metrics.totalConnections = this.pool.totalCount;
    this.metrics.idleConnections = this.pool.idleCount;
    this.metrics.waitingClients = this.pool.waitingCount;
    this.metrics.activeConnections = this.pool.totalCount - this.pool.idleCount;
  }

  /**
   * Update average query time
   */
  private updateAverageQueryTime(duration: number): void {
    if (this.metrics.queryCount === 1) {
      this.metrics.averageQueryTime = duration;
    } else {
      // Calculate running average
      this.metrics.averageQueryTime = 
        (this.metrics.averageQueryTime * (this.metrics.queryCount - 1) + duration) / this.metrics.queryCount;
    }
  }

  /**
   * Get comprehensive connection pool statistics
   */
  getPoolStats(): ConnectionPoolMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Get detailed pool information for monitoring
   */
  getDetailedStats(): {
    pool: ConnectionPoolMetrics;
    config: Partial<ConnectionPoolConfig>;
    performance: {
      queriesPerSecond: number;
      slowQueryPercentage: number;
      errorRate: number;
    };
  } {
    const stats = this.getPoolStats();
    
    return {
      pool: stats,
      config: {
        max: this.config.max,
        min: this.config.min,
        idleTimeoutMillis: this.config.idleTimeoutMillis,
        connectionTimeoutMillis: this.config.connectionTimeoutMillis,
        slowQueryThreshold: this.config.slowQueryThreshold
      },
      performance: {
        queriesPerSecond: stats.queryCount > 0 ? stats.queryCount / (Date.now() / 1000) : 0,
        slowQueryPercentage: stats.queryCount > 0 ? (stats.slowQueryCount / stats.queryCount) * 100 : 0,
        errorRate: stats.queryCount > 0 ? (stats.connectionErrors / stats.queryCount) * 100 : 0
      }
    };
  }

  /**
   * Gracefully close all connections
   */
  async close(): Promise<void> {
    this.isShuttingDown = true;
    this.stopHealthChecks();
    
    try {
      await this.pool.end();
      logger.info('Database connection pool closed gracefully', {
        finalStats: this.getPoolStats()
      });
    } catch (error) {
      logger.error('Error closing database connection pool', {
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Utility function for sleep/delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get connection status
   */
  get isHealthy(): boolean {
    return this.metrics.healthCheckStatus === 'healthy';
  }

  /**
   * Get pool instance (for advanced operations)
   */
  get poolInstance(): Pool {
    return this.pool;
  }
}