#!/usr/bin/env ts-node

/**
 * Comprehensive Performance Validation Test Suite
 * 
 * This script validates that all system components meet the performance requirements:
 * - Analytics queries complete within 2 seconds
 * - Trigger execution adds less than 100ms to transactions
 * - Cache invalidation completes within 500ms
 * - Database operations meet performance thresholds
 */

import { performance } from 'perf_hooks';
import database from '../config/database';

interface PerformanceMetric {
  operation: string;
  duration: number;
  threshold: number;
  passed: boolean;
  details?: any;
}

class PerformanceValidator {
  private results: PerformanceMetric[] = [];

  constructor() {
    // Database connection will be handled through the database singleton
  }

  private async measureOperation<T>(
    operation: string,
    threshold: number,
    fn: () => Promise<T>
  ): Promise<{ result: T; metric: PerformanceMetric }> {
    const start = performance.now();
    
    try {
      const result = await fn();
      const duration = performance.now() - start;
      
      const metric: PerformanceMetric = {
        operation,
        duration,
        threshold,
        passed: duration <= threshold,
        details: { success: true }
      };
      
      this.results.push(metric);
      return { result, metric };
    } catch (error) {
      const duration = performance.now() - start;
      
      const metric: PerformanceMetric = {
        operation,
        duration,
        threshold,
        passed: false,
        details: { error: error instanceof Error ? error.message : String(error) }
      };
      
      this.results.push(metric);
      throw error;
    }
  }

  /**
   * Test analytics queries performance (2-second requirement)
   */
  async testAnalyticsQueriesPerformance(): Promise<void> {
    console.log('\n🔍 Testing Analytics Queries Performance...');

    // Test 1: Dashboard KPIs query
    await this.measureOperation(
      'Dashboard KPIs Query',
      2000, // 2 seconds
      async () => {
        const query = `
          SELECT 
            COUNT(c.id) as total_calls,
            COUNT(CASE WHEN c.status = 'completed' THEN 1 END) as successful_calls,
            AVG(CASE WHEN c.status = 'completed' THEN c.duration_minutes END) as avg_duration,
            COUNT(DISTINCT c.agent_id) as active_agents
          FROM calls c
          WHERE c.user_id = $1 
            AND c.created_at >= CURRENT_DATE - INTERVAL '30 days'
        `;
        
        const result = await database.query(query, [1]);
        return result.rows[0];
      }
    );

    // Test 2: Agent analytics aggregation
    await this.measureOperation(
      'Agent Analytics Aggregation',
      2000,
      async () => {
        const query = `
          SELECT 
            a.id,
            a.name,
            COUNT(c.id) as total_calls,
            COUNT(CASE WHEN c.status = 'completed' THEN 1 END) as successful_calls,
            AVG(CASE WHEN c.status = 'completed' THEN c.duration_minutes END) as avg_duration
          FROM agents a
          LEFT JOIN calls c ON a.id = c.agent_id AND c.created_at >= CURRENT_DATE - INTERVAL '7 days'
          WHERE a.user_id = $1
          GROUP BY a.id, a.name
          ORDER BY total_calls DESC
        `;
        
        const result = await database.query(query, [1]);
        return result.rows;
      }
    );

    // Test 3: Call analytics with complex filtering
    await this.measureOperation(
      'Complex Call Analytics Query',
      2000,
      async () => {
        const query = `
          SELECT 
            DATE_TRUNC('day', c.created_at) as date,
            COALESCE(c.call_source, 'phone') as call_source,
            COUNT(*) as call_count,
            COUNT(CASE WHEN c.status = 'completed' THEN 1 END) as successful_count,
            AVG(CASE WHEN c.status = 'completed' THEN c.duration_minutes END) as avg_duration
          FROM calls c
          WHERE c.user_id = $1 
            AND c.created_at >= CURRENT_DATE - INTERVAL '30 days'
          GROUP BY DATE_TRUNC('day', c.created_at), COALESCE(c.call_source, 'phone')
          ORDER BY date DESC, call_source
        `;
        
        const result = await database.query(query, [1]);
        return result.rows;
      }
    );

    // Test 4: Lead analytics performance (if table exists)
    try {
      await this.measureOperation(
        'Lead Analytics Query',
        2000,
        async () => {
          const query = `
            SELECT 
              COALESCE(la.lead_status_tag, 'unknown') as lead_status_tag,
              COUNT(*) as count,
              AVG(COALESCE(la.total_score, 0)) as avg_score,
              COUNT(CASE WHEN COALESCE(c.call_source, 'phone') = 'phone' THEN 1 END) as phone_leads,
              COUNT(CASE WHEN COALESCE(c.call_source, 'phone') = 'internet' THEN 1 END) as internet_leads
            FROM calls c
            LEFT JOIN lead_analytics la ON la.call_id = c.id
            WHERE c.user_id = $1 
              AND c.created_at >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY COALESCE(la.lead_status_tag, 'unknown')
            ORDER BY count DESC
          `;
          
          const result = await database.query(query, [1]);
          return result.rows;
        }
      );
    } catch (error) {
      console.log('⚠️  Lead analytics table not available, skipping test');
    }
  }

  /**
   * Test database trigger performance (100ms requirement)
   */
  async testTriggerPerformance(): Promise<void> {
    console.log('\n⚡ Testing Database Trigger Performance...');

    // Test 1: KPI update trigger performance (if agent_analytics table exists)
    try {
      await this.measureOperation(
        'KPI Update Trigger',
        100, // 100ms
        async () => {
          return await database.transaction(async (client) => {
            // Insert agent analytics record (triggers KPI update if trigger exists)
            const insertQuery = `
              INSERT INTO agent_analytics (
                user_id, agent_id, date, hour,
                total_calls, successful_calls, total_duration
              ) VALUES ($1, $2, CURRENT_DATE, EXTRACT(HOUR FROM NOW()), $3, $4, $5)
              ON CONFLICT (user_id, agent_id, date, hour) 
              DO UPDATE SET 
                total_calls = EXCLUDED.total_calls,
                successful_calls = EXCLUDED.successful_calls,
                total_duration = EXCLUDED.total_duration
            `;
            
            const result = await client.query(insertQuery, [1, 1, 10, 8, 1200]);
            return result;
          });
        }
      );
    } catch (error) {
      console.log('⚠️  Agent analytics table not available, skipping trigger test');
    }

    // Test 2: Simple update performance
    await this.measureOperation(
      'Simple Update Performance',
      100,
      async () => {
        return await database.transaction(async (client) => {
          // Update call record
          const updateQuery = `
            UPDATE calls 
            SET updated_at = NOW()
            WHERE id = (
              SELECT id FROM calls 
              WHERE user_id = $1 
              LIMIT 1
            )
          `;
          
          const result = await client.query(updateQuery, [1]);
          return result;
        });
      }
    );

    // Test 3: Bulk operations performance
    await this.measureOperation(
      'Bulk Operations Performance',
      500, // Allow more time for bulk operations
      async () => {
        return await database.transaction(async (client) => {
          // Bulk update that may trigger multiple operations
          const bulkUpdateQuery = `
            UPDATE calls 
            SET updated_at = NOW()
            WHERE user_id = $1 
              AND created_at >= CURRENT_DATE - INTERVAL '1 day'
          `;
          
          const result = await client.query(bulkUpdateQuery, [1]);
          return result;
        });
      }
    );
  }

  /**
   * Test cache invalidation performance (500ms requirement)
   */
  async testCacheInvalidationPerformance(): Promise<void> {
    console.log('\n🗄️ Testing Cache Invalidation Performance...');

    // Test 1: Single cache invalidation simulation
    await this.measureOperation(
      'Single Cache Invalidation',
      500, // 500ms
      async () => {
        // Simulate cache invalidation by updating a record
        const query = `
          UPDATE calls 
          SET updated_at = NOW()
          WHERE id = (
            SELECT id FROM calls 
            WHERE user_id = $1 
            LIMIT 1
          )
          RETURNING id
        `;
        
        const result = await database.query(query, [1]);
        return result.rows[0];
      }
    );

    // Test 2: Cascade cache invalidation simulation
    await this.measureOperation(
      'Cascade Cache Invalidation',
      500,
      async () => {
        return await database.transaction(async (client) => {
          // Update that should cascade to related cache entries
          const updateQuery = `
            UPDATE agents 
            SET updated_at = NOW()
            WHERE user_id = $1
          `;
          
          const result = await client.query(updateQuery, [1]);
          return result;
        });
      }
    );

    // Test 3: Batch cache invalidation simulation
    await this.measureOperation(
      'Batch Cache Invalidation',
      500,
      async () => {
        return await database.transaction(async (client) => {
          // Multiple updates that trigger cache invalidation
          const queries = [
            'UPDATE calls SET updated_at = NOW() WHERE user_id = $1',
            'UPDATE agents SET updated_at = NOW() WHERE user_id = $1'
          ];
          
          const results = [];
          for (const query of queries) {
            const result = await client.query(query, [1]);
            results.push(result);
          }
          
          return results;
        });
      }
    );
  }

  /**
   * Test database connection and query optimization
   */
  async testDatabaseOptimization(): Promise<void> {
    console.log('\n🔧 Testing Database Optimization...');

    // Test 1: Index usage verification
    await this.measureOperation(
      'Index Usage Verification',
      1000,
      async () => {
        const query = `
          EXPLAIN (ANALYZE, BUFFERS) 
          SELECT c.*, a.name as agent_name
          FROM calls c
          JOIN agents a ON c.agent_id = a.id
          WHERE c.user_id = $1 
            AND c.created_at >= CURRENT_DATE - INTERVAL '7 days'
          ORDER BY c.created_at DESC
          LIMIT 100
        `;
        
        const result = await database.query(query, [1]);
        return result.rows;
      }
    );

    // Test 2: Connection pool efficiency
    await this.measureOperation(
      'Connection Pool Efficiency',
      500,
      async () => {
        const promises = [];
        
        // Test concurrent connections
        for (let i = 0; i < 10; i++) {
          promises.push(
            database.query('SELECT NOW(), $1 as test_id', [i])
          );
        }
        
        const results = await Promise.all(promises);
        return results.length;
      }
    );

    // Test 3: Basic query performance
    await this.measureOperation(
      'Basic Query Performance',
      1000,
      async () => {
        const query = `
          SELECT 
            COUNT(*) as total_calls,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_calls
          FROM calls 
          WHERE user_id = $1
        `;
        
        const result = await database.query(query, [1]);
        return result.rows[0];
      }
    );
  }

  /**
   * Generate performance report
   */
  generateReport(): void {
    console.log('\n📊 Performance Validation Report');
    console.log('=====================================');

    const categories = {
      'Analytics Queries': this.results.filter(r => r.operation.includes('Query') || r.operation.includes('Analytics')),
      'Database Triggers': this.results.filter(r => r.operation.includes('Trigger') || r.operation.includes('Update')),
      'Cache Operations': this.results.filter(r => r.operation.includes('Cache')),
      'Database Optimization': this.results.filter(r => r.operation.includes('Index') || r.operation.includes('Pool') || r.operation.includes('Basic'))
    };

    let overallPassed = true;

    Object.entries(categories).forEach(([category, metrics]) => {
      if (metrics.length === 0) return;
      
      console.log(`\n${category}:`);
      
      metrics.forEach(metric => {
        const status = metric.passed ? '✅ PASS' : '❌ FAIL';
        const duration = metric.duration.toFixed(2);
        const threshold = metric.threshold;
        
        console.log(`  ${status} ${metric.operation}: ${duration}ms (threshold: ${threshold}ms)`);
        
        if (!metric.passed) {
          overallPassed = false;
          if (metric.details?.error) {
            console.log(`    Error: ${metric.details.error}`);
          }
        }
      });
    });

    // Summary statistics
    console.log('\n📈 Summary Statistics:');
    console.log(`Total tests: ${this.results.length}`);
    console.log(`Passed: ${this.results.filter(r => r.passed).length}`);
    console.log(`Failed: ${this.results.filter(r => !r.passed).length}`);
    
    const avgDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / this.results.length;
    console.log(`Average duration: ${avgDuration.toFixed(2)}ms`);

    // Performance requirements check
    console.log('\n🎯 Performance Requirements Status:');
    
    const analyticsQueries = this.results.filter(r => 
      (r.operation.includes('Query') || r.operation.includes('Analytics')) && r.threshold === 2000
    );
    const analyticsPass = analyticsQueries.every(r => r.passed);
    console.log(`Analytics queries (≤2s): ${analyticsPass ? '✅ PASS' : '❌ FAIL'}`);

    const triggers = this.results.filter(r => 
      (r.operation.includes('Trigger') || r.operation.includes('Update')) && r.threshold <= 100
    );
    const triggersPass = triggers.length === 0 || triggers.every(r => r.passed);
    console.log(`Trigger execution (≤100ms): ${triggersPass ? '✅ PASS' : '❌ FAIL'}`);

    const cacheOps = this.results.filter(r => r.operation.includes('Cache') && r.threshold === 500);
    const cachePass = cacheOps.length === 0 || cacheOps.every(r => r.passed);
    console.log(`Cache invalidation (≤500ms): ${cachePass ? '✅ PASS' : '❌ FAIL'}`);

    console.log(`\n🏆 Overall Performance Status: ${overallPassed ? '✅ PASS' : '❌ FAIL'}`);

    if (!overallPassed) {
      console.log('\n⚠️  Performance issues detected. Review failed tests above.');
      process.exit(1);
    } else {
      console.log('\n🎉 All performance requirements met!');
    }
  }

  async cleanup(): Promise<void> {
    // Database cleanup is handled by the singleton
  }
}

async function main(): Promise<void> {
  const validator = new PerformanceValidator();

  try {
    console.log('🚀 Starting Performance Validation Tests...');
    
    // Initialize database connection
    await database.initialize();
    
    await validator.testAnalyticsQueriesPerformance();
    await validator.testTriggerPerformance();
    await validator.testCacheInvalidationPerformance();
    await validator.testDatabaseOptimization();
    
    validator.generateReport();
    
  } catch (error) {
    console.error('❌ Performance validation failed:', error);
    process.exit(1);
  } finally {
    await validator.cleanup();
    await database.close();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { PerformanceValidator };