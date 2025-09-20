#!/usr/bin/env ts-node

/**
 * Performance Monitoring Script
 * 
 * This script continuously monitors system performance metrics
 * and alerts when thresholds are exceeded.
 */

import { performance } from 'perf_hooks';
import database from '../config/database';

interface PerformanceThreshold {
  metric: string;
  threshold: number;
  unit: string;
  query: string;
  critical: boolean;
}

class PerformanceMonitor {
  private thresholds: PerformanceThreshold[] = [
    {
      metric: 'Average Query Response Time',
      threshold: 2000,
      unit: 'ms',
      query: `
        SELECT 
          AVG(total_exec_time) as avg_time
        FROM pg_stat_statements 
        WHERE query LIKE '%calls%' OR query LIKE '%analytics%'
      `,
      critical: true
    },
    {
      metric: 'Active Database Connections',
      threshold: 80,
      unit: 'connections',
      query: `
        SELECT COUNT(*) as active_connections
        FROM pg_stat_activity 
        WHERE state = 'active'
      `,
      critical: false
    },
    {
      metric: 'Cache Hit Ratio',
      threshold: 95,
      unit: '%',
      query: `
        SELECT 
          ROUND(
            (sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read))) * 100, 2
          ) as cache_hit_ratio
        FROM pg_statio_user_tables
      `,
      critical: true
    },
    {
      metric: 'Table Scan Ratio',
      threshold: 10,
      unit: '%',
      query: `
        SELECT 
          ROUND(
            (sum(seq_scan) / NULLIF(sum(seq_scan) + sum(idx_scan), 0)) * 100, 2
          ) as table_scan_ratio
        FROM pg_stat_user_tables
      `,
      critical: false
    }
  ];

  constructor() {
    // Database connection handled by singleton
  }

  /**
   * Check if pg_stat_statements extension is available
   */
  async checkExtensions(): Promise<void> {
    try {
      const result = await database.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
        ) as has_pg_stat_statements
      `);
      
      if (!result.rows[0].has_pg_stat_statements) {
        console.warn('⚠️  pg_stat_statements extension not available - some metrics will be skipped');
        // Remove queries that depend on pg_stat_statements
        this.thresholds = this.thresholds.filter(t => !t.query.includes('pg_stat_statements'));
      }
    } catch (error) {
      console.warn('⚠️  Could not check extensions:', (error as Error).message);
    }
  }

  /**
   * Monitor a specific performance metric
   */
  async monitorMetric(threshold: PerformanceThreshold): Promise<{
    metric: string;
    value: number;
    threshold: number;
    passed: boolean;
    critical: boolean;
  }> {
    const start = performance.now();
    
    try {
      const result = await database.query(threshold.query);
      const queryTime = performance.now() - start;
      
      if (result.rows.length === 0) {
        throw new Error('No data returned');
      }
      
      const value = parseFloat(Object.values(result.rows[0])[0] as string) || 0;
      
      // For cache hit ratio, we want higher values to be better
      // For response time and table scan ratio, we want lower values to be better
      const passed = threshold.metric.includes('Cache Hit') 
        ? value >= threshold.threshold
        : value <= threshold.threshold;
      
      console.log(`📊 ${threshold.metric}: ${value}${threshold.unit} (query: ${queryTime.toFixed(2)}ms)`);
      
      return {
        metric: threshold.metric,
        value,
        threshold: threshold.threshold,
        passed,
        critical: threshold.critical
      };
      
    } catch (error) {
      console.warn(`⚠️  Could not monitor ${threshold.metric}:`, (error as Error).message);
      return {
        metric: threshold.metric,
        value: -1,
        threshold: threshold.threshold,
        passed: false,
        critical: threshold.critical
      };
    }
  }

  /**
   * Test specific performance scenarios
   */
  async testPerformanceScenarios(): Promise<void> {
    console.log('\n🧪 Testing Performance Scenarios...');

    // Test 1: Dashboard query performance
    const dashboardStart = performance.now();
    try {
      await database.query(`
        SELECT 
          COUNT(c.id) as total_calls,
          COUNT(CASE WHEN c.status = 'completed' THEN 1 END) as successful_calls,
          AVG(CASE WHEN c.status = 'completed' THEN c.duration END) as avg_duration
        FROM calls c
        WHERE c.user_id = 1 
          AND c.created_at >= CURRENT_DATE - INTERVAL '30 days'
      `);
      
      const dashboardTime = performance.now() - dashboardStart;
      const dashboardPassed = dashboardTime <= 2000;
      
      console.log(`${dashboardPassed ? '✅' : '❌'} Dashboard query: ${dashboardTime.toFixed(2)}ms`);
      
    } catch (error) {
      console.warn('⚠️  Dashboard query test failed:', (error as Error).message);
    }

    // Test 2: Analytics aggregation performance
    const analyticsStart = performance.now();
    try {
      await database.query(`
        SELECT 
          DATE_TRUNC('day', c.created_at) as date,
          COUNT(*) as call_count,
          COUNT(CASE WHEN c.status = 'completed' THEN 1 END) as successful_count
        FROM calls c
        WHERE c.user_id = 1 
          AND c.created_at >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY DATE_TRUNC('day', c.created_at)
        ORDER BY date DESC
      `);
      
      const analyticsTime = performance.now() - analyticsStart;
      const analyticsPassed = analyticsTime <= 2000;
      
      console.log(`${analyticsPassed ? '✅' : '❌'} Analytics query: ${analyticsTime.toFixed(2)}ms`);
      
    } catch (error) {
      console.warn('⚠️  Analytics query test failed:', (error as Error).message);
    }

    // Test 3: Trigger simulation
    const triggerStart = performance.now();
    try {
      await database.transaction(async (client) => {
      
      try {
        await client.query('BEGIN');
        
        // Simulate trigger execution
        await client.query(`
          INSERT INTO agent_analytics (
            user_id, agent_id, date, hour,
            total_calls, successful_calls, total_duration
          ) VALUES (1, 1, CURRENT_DATE, EXTRACT(HOUR FROM NOW()), 5, 4, 600)
          ON CONFLICT (user_id, agent_id, date, hour) 
          DO UPDATE SET 
            total_calls = EXCLUDED.total_calls,
            successful_calls = EXCLUDED.successful_calls,
            total_duration = EXCLUDED.total_duration
        `);
        
        await client.query('ROLLBACK');
        
      } finally {
        client.release();
      }
      });
      
      const triggerTime = performance.now() - triggerStart;
      const triggerPassed = triggerTime <= 100;
      
      console.log(`${triggerPassed ? '✅' : '❌'} Trigger simulation: ${triggerTime.toFixed(2)}ms`);
      
    } catch (error) {
      console.warn('⚠️  Trigger simulation test failed:', (error as Error).message);
    }
  }

  /**
   * Run performance monitoring
   */
  async runMonitoring(): Promise<void> {
    console.log('🔍 Performance Monitoring Report');
    console.log('================================');
    console.log(`Timestamp: ${new Date().toISOString()}`);

    await this.checkExtensions();

    const results = [];
    
    for (const threshold of this.thresholds) {
      const result = await this.monitorMetric(threshold);
      results.push(result);
    }

    await this.testPerformanceScenarios();

    // Generate alerts
    console.log('\n🚨 Performance Alerts:');
    
    const criticalIssues = results.filter(r => !r.passed && r.critical);
    const warnings = results.filter(r => !r.passed && !r.critical);
    
    if (criticalIssues.length === 0 && warnings.length === 0) {
      console.log('✅ No performance issues detected');
    } else {
      if (criticalIssues.length > 0) {
        console.log('\n🔴 Critical Issues:');
        criticalIssues.forEach(issue => {
          console.log(`  ❌ ${issue.metric}: ${issue.value} (threshold: ${issue.threshold})`);
        });
      }
      
      if (warnings.length > 0) {
        console.log('\n🟡 Warnings:');
        warnings.forEach(warning => {
          console.log(`  ⚠️  ${warning.metric}: ${warning.value} (threshold: ${warning.threshold})`);
        });
      }
    }

    // Recommendations
    console.log('\n💡 Recommendations:');
    
    if (criticalIssues.some(i => i.metric.includes('Query Response'))) {
      console.log('• Review slow queries and add appropriate indexes');
      console.log('• Consider query optimization or caching strategies');
    }
    
    if (criticalIssues.some(i => i.metric.includes('Cache Hit'))) {
      console.log('• Increase database shared_buffers configuration');
      console.log('• Review query patterns for cache efficiency');
    }
    
    if (warnings.some(w => w.metric.includes('Connections'))) {
      console.log('• Monitor connection pool usage');
      console.log('• Consider connection pooling optimization');
    }
    
    if (warnings.some(w => w.metric.includes('Table Scan'))) {
      console.log('• Review queries for missing indexes');
      console.log('• Analyze query execution plans');
    }

    console.log('\n📊 Performance Summary:');
    console.log(`Metrics checked: ${results.length}`);
    console.log(`Passed: ${results.filter(r => r.passed).length}`);
    console.log(`Critical issues: ${criticalIssues.length}`);
    console.log(`Warnings: ${warnings.length}`);
  }

  async cleanup(): Promise<void> {
    await database.close();
  }
}

async function main(): Promise<void> {
  const monitor = new PerformanceMonitor();

  try {
    await database.initialize();
    await monitor.runMonitoring();
  } catch (error) {
    console.error('❌ Performance monitoring failed:', error);
    process.exit(1);
  } finally {
    await monitor.cleanup();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { PerformanceMonitor };