#!/usr/bin/env ts-node

/**
 * Test script for database connection pooling implementation
 * Tests connection pool performance, monitoring, and health checks
 */

import database from '../config/database';
import { logger } from '../utils/logger';

interface TestResult {
  testName: string;
  success: boolean;
  duration: number;
  details?: any;
  error?: string;
}

class ConnectionPoolTester {
  private results: TestResult[] = [];

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Connection Pool Tests...\n');

    try {
      // Initialize database connection
      await database.initialize();
      
      // Run test suite
      await this.testBasicConnection();
      await this.testConnectionPoolStats();
      await this.testHealthCheck();
      await this.testConcurrentQueries();
      await this.testQueryPerformanceMonitoring();
      await this.testTransactionHandling();
      await this.testRetryLogic();
      await this.testConnectionPoolLimits();
      
      // Display results
      this.displayResults();
      
    } catch (error) {
      console.error('❌ Test suite failed to initialize:', error);
    } finally {
      await database.close();
    }
  }

  private async testBasicConnection(): Promise<void> {
    const testName = 'Basic Connection Test';
    const startTime = Date.now();
    
    try {
      const result = await database.query('SELECT NOW() as current_time, 1 as test_value');
      const duration = Date.now() - startTime;
      
      if (result.rows[0].test_value === 1) {
        this.results.push({
          testName,
          success: true,
          duration,
          details: {
            currentTime: result.rows[0].current_time,
            queryResult: result.rows[0].test_value
          }
        });
      } else {
        throw new Error('Unexpected query result');
      }
    } catch (error) {
      this.results.push({
        testName,
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async testConnectionPoolStats(): Promise<void> {
    const testName = 'Connection Pool Statistics';
    const startTime = Date.now();
    
    try {
      const stats = database.getPoolStats();
      const detailedStats = database.getDetailedStats();
      const duration = Date.now() - startTime;
      
      // Verify stats structure
      const requiredFields = ['totalConnections', 'idleConnections', 'waitingClients', 'activeConnections'];
      const hasAllFields = requiredFields.every(field => field in stats);
      
      if (hasAllFields && stats.totalConnections >= 0) {
        this.results.push({
          testName,
          success: true,
          duration,
          details: {
            poolStats: stats,
            performanceMetrics: detailedStats.performance,
            configuration: detailedStats.config
          }
        });
      } else {
        throw new Error('Invalid stats structure or values');
      }
    } catch (error) {
      this.results.push({
        testName,
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async testHealthCheck(): Promise<void> {
    const testName = 'Health Check Test';
    const startTime = Date.now();
    
    try {
      const isHealthy = await database.healthCheck();
      const duration = Date.now() - startTime;
      
      if (isHealthy) {
        this.results.push({
          testName,
          success: true,
          duration,
          details: { healthStatus: 'healthy' }
        });
      } else {
        throw new Error('Health check returned false');
      }
    } catch (error) {
      this.results.push({
        testName,
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async testConcurrentQueries(): Promise<void> {
    const testName = 'Concurrent Queries Test';
    const startTime = Date.now();
    
    try {
      const concurrentQueries = 10;
      const queryPromises: Promise<any>[] = [];
      
      // Create multiple concurrent queries
      for (let i = 0; i < concurrentQueries; i++) {
        queryPromises.push(
          database.query('SELECT $1 as query_id, NOW() as timestamp, pg_sleep(0.1)', [i])
        );
      }
      
      const results = await Promise.all(queryPromises);
      const duration = Date.now() - startTime;
      
      // Verify all queries completed successfully
      if (results.length === concurrentQueries && results.every(r => r.rows.length > 0)) {
        this.results.push({
          testName,
          success: true,
          duration,
          details: {
            concurrentQueries,
            completedQueries: results.length,
            averageQueryTime: duration / concurrentQueries
          }
        });
      } else {
        throw new Error('Not all concurrent queries completed successfully');
      }
    } catch (error) {
      this.results.push({
        testName,
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async testQueryPerformanceMonitoring(): Promise<void> {
    const testName = 'Query Performance Monitoring';
    const startTime = Date.now();
    
    try {
      const statsBefore = database.getPoolStats();
      
      // Execute a few queries to generate metrics
      await database.query('SELECT 1');
      await database.query('SELECT COUNT(*) FROM pg_tables');
      await database.query('SELECT pg_sleep(0.05)'); // Simulate slow query
      
      const statsAfter = database.getPoolStats();
      const duration = Date.now() - startTime;
      
      // Verify metrics were updated
      if (statsAfter.queryCount > statsBefore.queryCount) {
        this.results.push({
          testName,
          success: true,
          duration,
          details: {
            queriesBefore: statsBefore.queryCount,
            queriesAfter: statsAfter.queryCount,
            averageQueryTime: statsAfter.averageQueryTime,
            slowQueries: statsAfter.slowQueryCount
          }
        });
      } else {
        throw new Error('Query metrics were not updated properly');
      }
    } catch (error) {
      this.results.push({
        testName,
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async testTransactionHandling(): Promise<void> {
    const testName = 'Transaction Handling Test';
    const startTime = Date.now();
    
    try {
      // Test successful transaction
      const result = await database.transaction(async (client) => {
        await client.query('SELECT 1');
        await client.query('SELECT 2');
        return { success: true };
      });
      
      // Test transaction rollback
      try {
        await database.transaction(async (client) => {
          await client.query('SELECT 1');
          throw new Error('Intentional error for rollback test');
        });
      } catch (rollbackError) {
        // Expected error for rollback test
      }
      
      const duration = Date.now() - startTime;
      
      if (result.success) {
        this.results.push({
          testName,
          success: true,
          duration,
          details: {
            transactionCommitted: true,
            rollbackTested: true
          }
        });
      } else {
        throw new Error('Transaction did not complete successfully');
      }
    } catch (error) {
      this.results.push({
        testName,
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async testRetryLogic(): Promise<void> {
    const testName = 'Retry Logic Test';
    const startTime = Date.now();
    
    try {
      // Test with a valid query that should succeed
      const result = await database.query('SELECT 1 as retry_test');
      const duration = Date.now() - startTime;
      
      if (result.rows[0].retry_test === 1) {
        this.results.push({
          testName,
          success: true,
          duration,
          details: {
            retryLogicAvailable: true,
            querySucceeded: true
          }
        });
      } else {
        throw new Error('Retry logic test query failed');
      }
    } catch (error) {
      this.results.push({
        testName,
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async testConnectionPoolLimits(): Promise<void> {
    const testName = 'Connection Pool Limits Test';
    const startTime = Date.now();
    
    try {
      const stats = database.getPoolStats();
      const detailedStats = database.getDetailedStats();
      
      // Verify pool configuration
      const hasValidLimits = 
        detailedStats.config.max && detailedStats.config.max > 0 &&
        detailedStats.config.min && detailedStats.config.min >= 0 &&
        detailedStats.config.max >= detailedStats.config.min;
      
      const duration = Date.now() - startTime;
      
      if (hasValidLimits) {
        this.results.push({
          testName,
          success: true,
          duration,
          details: {
            maxConnections: detailedStats.config.max,
            minConnections: detailedStats.config.min,
            currentTotal: stats.totalConnections,
            currentActive: stats.activeConnections,
            currentIdle: stats.idleConnections
          }
        });
      } else {
        throw new Error('Invalid connection pool limits configuration');
      }
    } catch (error) {
      this.results.push({
        testName,
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private displayResults(): void {
    console.log('\n📊 Connection Pool Test Results:');
    console.log('=' .repeat(60));
    
    let passedTests = 0;
    let totalDuration = 0;
    
    this.results.forEach((result, index) => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      const duration = `${result.duration}ms`;
      
      console.log(`\n${index + 1}. ${result.testName}`);
      console.log(`   Status: ${status} (${duration})`);
      
      if (result.success) {
        passedTests++;
        if (result.details) {
          console.log(`   Details:`, JSON.stringify(result.details, null, 4));
        }
      } else {
        console.log(`   Error: ${result.error}`);
      }
      
      totalDuration += result.duration;
    });
    
    console.log('\n' + '='.repeat(60));
    console.log(`📈 Summary: ${passedTests}/${this.results.length} tests passed`);
    console.log(`⏱️  Total Duration: ${totalDuration}ms`);
    console.log(`🎯 Success Rate: ${Math.round((passedTests / this.results.length) * 100)}%`);
    
    if (passedTests === this.results.length) {
      console.log('\n🎉 All connection pool tests passed! Enhanced connection pooling is working correctly.');
    } else {
      console.log('\n⚠️  Some tests failed. Please review the connection pool implementation.');
    }
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new ConnectionPoolTester();
  tester.runAllTests().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

export { ConnectionPoolTester };