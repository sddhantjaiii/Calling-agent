import { PoolClient, PoolConfig } from 'pg';
import * as dotenv from 'dotenv';
import { ConnectionPoolService, ConnectionPoolMetrics, ConnectionPoolConfig } from '../services/connectionPoolService';
import { logger } from '../utils/logger';

dotenv.config();

interface DatabaseConfig extends PoolConfig {
  connectionString: string;
  ssl?: {
    rejectUnauthorized: boolean;
  };
  // Enhanced configuration options
  healthCheckInterval?: number;
  slowQueryThreshold?: number;
  maxRetries?: number;
  retryDelay?: number;
  queryTimeout?: number;
}

class DatabaseConnection {
  private connectionPool: ConnectionPoolService;
  private isConnected: boolean = false;

  constructor() {
    const config: DatabaseConfig = {
      connectionString: process.env.DATABASE_URL || '',
      ssl: { rejectUnauthorized: false }, // Always use SSL for Neon

      // Optimized connection pool settings for performance
      max: 20, // Increased maximum connections for better concurrency
      min: 5,  // Increased minimum connections for faster response
      idleTimeoutMillis: 300000, // 5 minutes - keep idle clients for frequent operations
      connectionTimeoutMillis: 10000, // 10 seconds for Neon database
      maxUses: 7500, // Close connection after 7500 uses to prevent memory leaks
      allowExitOnIdle: false, // Keep the pool alive

      // Enhanced configuration for monitoring and performance
      healthCheckInterval: 30000, // 30 seconds health check
      slowQueryThreshold: 1000, // 1 second slow query threshold
      maxRetries: 3, // Maximum retry attempts
      retryDelay: 1000, // 1 second base retry delay
      queryTimeout: 30000, // 30 seconds query timeout
    };

    this.connectionPool = new ConnectionPoolService(config);
  }

  // Event handlers are now managed by ConnectionPoolService

  /**
   * Initialize database connection with enhanced retry logic and monitoring
   */
  async initialize(): Promise<void> {
    try {
      await this.connectionPool.initialize();
      this.isConnected = true;

      logger.info('Enhanced database connection pool initialized successfully');
      console.log('✅ Enhanced database connection pool established');
    } catch (error) {
      this.isConnected = false;
      logger.error('Failed to initialize enhanced database connection pool', {
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  // Pool warmup is now handled by ConnectionPoolService

  /**
   * Get a client from the enhanced connection pool
   */
  async getClient(): Promise<PoolClient> {
    try {
      return await this.connectionPool.getClient();
    } catch (error) {
      this.isConnected = false;
      logger.error('Failed to get database client from enhanced pool', {
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Execute a query with enhanced monitoring and performance tracking
   */
  async query(text: string, params?: any[]): Promise<any> {
    return await this.connectionPool.query(text, params);
  }

  /**
   * Execute a transaction with enhanced error handling and monitoring
   */
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    return await this.connectionPool.transaction(callback);
  }

  /**
   * Enhanced health check with detailed monitoring
   */
  async healthCheck(): Promise<boolean> {
    return await this.connectionPool.healthCheck();
  }

  /**
   * Get comprehensive connection pool statistics and metrics
   */
  getPoolStats(): ConnectionPoolMetrics {
    return this.connectionPool.getPoolStats();
  }

  /**
   * Get detailed pool statistics for monitoring and performance analysis
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
    return this.connectionPool.getDetailedStats();
  }

  /**
   * Gracefully close enhanced connection pool
   */
  async close(): Promise<void> {
    try {
      await this.connectionPool.close();
      this.isConnected = false;
      logger.info('Enhanced database connection pool closed successfully');
    } catch (error) {
      logger.error('Error closing enhanced database connection pool', {
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Get connection status
   */
  get connected(): boolean {
    return this.isConnected && this.connectionPool.isHealthy;
  }

  /**
   * Get the underlying connection pool service for advanced operations
   */
  get poolService(): ConnectionPoolService {
    return this.connectionPool;
  }
}

// Create singleton instance
const database = new DatabaseConnection();

// Export pool for direct database access in tests
export const pool = database;

export default database;
export { DatabaseConnection };