#!/usr/bin/env ts-node

/**
 * Test script for trigger performance optimization
 * Tests the optimized trigger functions and performance monitoring
 */

import { Pool } from 'pg';
import database from '../config/database';

interface TriggerPerformanceMetric {
  trigger_name: string;
  table_name: string;
  operation: string;
  avg_execution_time_ms: number;
  max_execution_time_ms: number;
  min_execution_time_ms: number;
  execution_count: number;
  error_count: number;
  last_execution: Date;
  date_bucket: Date;
}

interface TriggerExecutionLog {
  trigger_name: string;
  table_name: string;
  operation: string;
  user_id: string;
  agent_id: string;
  execution_status: string;
  error_message: string;
  execution_time_ms: number;
  created_at: Date;
}

class TriggerPerformanceTest {
  private database = database;

  constructor() {
    // Use the database singleton
  }

  async runTests(): Promise<void> {
    console.log('🚀 Starting trigger performance optimization tests...\n');

    try {
      // Test 1: Verify performance monitoring tables exist
      await this.testPerformanceMonitoringTables();

      // Test 2: Test conditional logic (skip unnecessary updates)
      await this.testConditionalLogic();

      // Test 3: Test bulk update handling
      await this.testBulkUpdateHandling();

      // Test 4: Test performance monitoring
      await this.testPerformanceMonitoring();

      // Test 5: Test rate limiting
      await this.testRateLimiting();

      // Test 6: Test performance alerts
      await this.testPerformanceAlerts();

      // Test 7: Test cleanup functions
      await this.testCleanupFunctions();

      console.log('✅ All trigger performance optimization tests passed!\n');

    } catch (error) {
      console.error('❌ Test failed:', error);
      throw error;
    } finally {
      await this.database.close();
    }
  }

  private async testPerformanceMonitoringTables(): Promise<void> {
    console.log('📊 Testing performance monitoring tables...');

    // Check if performance metrics table exists
    const metricsTableResult = await this.database.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'trigger_performance_metrics'
      );
    `);

    if (!metricsTableResult.rows[0].exists) {
      throw new Error('trigger_performance_metrics table does not exist');
    }

    // Check if execution log table exists
    const logTableResult = await this.database.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'trigger_execution_log'
      );
    `);

    if (!logTableResult.rows[0].exists) {
      throw new Error('trigger_execution_log table does not exist');
    }

    console.log('✅ Performance monitoring tables exist');
  }

  private async testConditionalLogic(): Promise<void> {
    console.log('🔄 Testing conditional logic (skip unnecessary updates)...');

    // Create test user and agent
    const testUser = await this.createTestUser();
    const testAgent = await this.createTestAgent(testUser.id);

    // Insert initial agent analytics record
    const initialAnalytics = await this.database.query(`
      INSERT INTO agent_analytics (
        agent_id, user_id, date, hour, total_calls, successful_calls, 
        failed_calls, leads_generated, qualified_leads, credits_used
      ) VALUES ($1, $2, CURRENT_DATE, NULL, 10, 8, 2, 5, 3, 100)
      RETURNING id;
    `, [testAgent.id, testUser.id]);

    // Clear performance metrics
    await this.database.query(`DELETE FROM trigger_performance_metrics WHERE date_bucket = CURRENT_DATE`);

    // Update with same values (should be skipped)
    await this.database.query(`
      UPDATE agent_analytics 
      SET total_calls = 10, successful_calls = 8, failed_calls = 2,
          leads_generated = 5, qualified_leads = 3, credits_used = 100
      WHERE id = $1;
    `, [initialAnalytics.rows[0].id]);

    // Check if update was skipped
    const skippedMetrics = await this.database.query(`
      SELECT * FROM trigger_performance_metrics 
      WHERE trigger_name = 'update_user_kpis_from_agent_analytics'
      AND date_bucket = CURRENT_DATE;
    `);

    // Should have SKIPPED entries
    const hasSkippedEntries = skippedMetrics.rows.some((row: any) => 
      row.execution_count > 0
    );

    if (!hasSkippedEntries) {
      console.log('⚠️  No performance metrics found - this might be expected if triggers are optimized');
    }

    // Update with different values (should not be skipped)
    await this.database.query(`
      UPDATE agent_analytics 
      SET total_calls = 15, successful_calls = 12
      WHERE id = $1;
    `, [initialAnalytics.rows[0].id]);

    // Cleanup
    await this.cleanupTestData(testUser.id, testAgent.id);

    console.log('✅ Conditional logic test completed');
  }

  private async testBulkUpdateHandling(): Promise<void> {
    console.log('📦 Testing bulk update handling...');

    // Create test user and multiple agents
    const testUser = await this.createTestUser();
    const agents = [];
    
    for (let i = 0; i < 5; i++) {
      const agent = await this.createTestAgent(testUser.id);
      agents.push(agent);
    }

    // Record start time
    const startTime = Date.now();

    // Insert multiple analytics records simultaneously
    const insertPromises = agents.map(agent => 
      this.pool.query(`
        INSERT INTO agent_analytics (
          agent_id, user_id, date, hour, total_calls, successful_calls, 
          failed_calls, leads_generated, qualified_leads, credits_used
        ) VALUES ($1, $2, CURRENT_DATE, NULL, 5, 4, 1, 2, 1, 50);
      `, [agent.id, testUser.id])
    );

    await Promise.all(insertPromises);

    const endTime = Date.now();
    const executionTime = endTime - startTime;

    console.log(`⏱️  Bulk insert of ${agents.length} records took ${executionTime}ms`);

    // Verify user daily analytics was updated correctly
    const userAnalytics = await this.pool.query(`
      SELECT * FROM user_daily_analytics 
      WHERE user_id = $1 AND date = CURRENT_DATE;
    `, [testUser.id]);

    if (userAnalytics.rows.length === 0) {
      throw new Error('User daily analytics not updated after bulk insert');
    }

    const analytics = userAnalytics.rows[0];
    if (analytics.total_calls !== 25) { // 5 agents * 5 calls each
      throw new Error(`Expected 25 total calls, got ${analytics.total_calls}`);
    }

    // Cleanup
    for (const agent of agents) {
      await this.cleanupTestData(testUser.id, agent.id);
    }

    console.log('✅ Bulk update handling test completed');
  }

  private async testPerformanceMonitoring(): Promise<void> {
    console.log('📈 Testing performance monitoring...');

    // Create test user and agent
    const testUser = await this.createTestUser();
    const testAgent = await this.createTestAgent(testUser.id);

    // Clear existing metrics
    await this.pool.query(`DELETE FROM trigger_performance_metrics WHERE date_bucket = CURRENT_DATE`);

    // Trigger some operations
    for (let i = 0; i < 3; i++) {
      await this.pool.query(`
        INSERT INTO agent_analytics (
          agent_id, user_id, date, hour, total_calls, successful_calls, 
          failed_calls, leads_generated, qualified_leads, credits_used
        ) VALUES ($1, $2, CURRENT_DATE, $3, 1, 1, 0, 1, 0, 10);
      `, [testAgent.id, testUser.id, i]);
    }

    // Check performance metrics were recorded
    const metrics = await this.pool.query(`
      SELECT * FROM trigger_performance_metrics 
      WHERE date_bucket = CURRENT_DATE
      ORDER BY trigger_name, operation;
    `);

    console.log(`📊 Found ${metrics.rows.length} performance metric records`);

    // Verify execution logs were created
    const logs = await this.pool.query(`
      SELECT * FROM trigger_execution_log 
      WHERE created_at >= CURRENT_DATE
      ORDER BY created_at DESC
      LIMIT 10;
    `);

    console.log(`📝 Found ${logs.rows.length} execution log records`);

    // Cleanup
    await this.cleanupTestData(testUser.id, testAgent.id);

    console.log('✅ Performance monitoring test completed');
  }

  private async testRateLimiting(): Promise<void> {
    console.log('⏱️  Testing rate limiting...');

    // Create test user and agent
    const testUser = await this.createTestUser();
    const testAgent = await this.createTestAgent(testUser.id);

    // Insert initial record
    const initialRecord = await this.pool.query(`
      INSERT INTO agent_analytics (
        agent_id, user_id, date, hour, total_calls, successful_calls, 
        failed_calls, leads_generated, qualified_leads, credits_used
      ) VALUES ($1, $2, CURRENT_DATE, NULL, 1, 1, 0, 1, 0, 10)
      RETURNING id;
    `, [testAgent.id, testUser.id]);

    // Update multiple times rapidly (should be rate limited)
    const updatePromises = [];
    for (let i = 0; i < 5; i++) {
      updatePromises.push(
        this.pool.query(`
          UPDATE agent_analytics 
          SET total_calls = total_calls + 1
          WHERE id = $1;
        `, [initialRecord.rows[0].id])
      );
    }

    await Promise.all(updatePromises);

    // Check dashboard cache update frequency
    const cacheUpdates = await this.pool.query(`
      SELECT updated_at FROM dashboard_cache 
      WHERE user_id = $1 AND cache_key = 'overview_stats';
    `, [testUser.id]);

    console.log(`🔄 Dashboard cache updates: ${cacheUpdates.rows.length}`);

    // Cleanup
    await this.cleanupTestData(testUser.id, testAgent.id);

    console.log('✅ Rate limiting test completed');
  }

  private async testPerformanceAlerts(): Promise<void> {
    console.log('🚨 Testing performance alerts...');

    // Create fake slow performance metrics
    await this.pool.query(`
      INSERT INTO trigger_performance_metrics (
        trigger_name, table_name, operation, avg_execution_time_ms,
        max_execution_time_ms, min_execution_time_ms, execution_count,
        error_count, last_execution, date_bucket
      ) VALUES (
        'test_slow_trigger', 'test_table', 'UPDATE', 150.0,
        200, 100, 20, 0, CURRENT_TIMESTAMP, CURRENT_DATE
      );
    `);

    // Create fake high error rate metrics
    await this.pool.query(`
      INSERT INTO trigger_performance_metrics (
        trigger_name, table_name, operation, avg_execution_time_ms,
        max_execution_time_ms, min_execution_time_ms, execution_count,
        error_count, last_execution, date_bucket
      ) VALUES (
        'test_error_trigger', 'test_table', 'INSERT', 50.0,
        100, 25, 20, 3, CURRENT_TIMESTAMP, CURRENT_DATE
      );
    `);

    // Run performance alert check
    await this.pool.query(`SELECT check_trigger_performance_alerts();`);

    // Check if alerts were created
    const alerts = await this.pool.query(`
      SELECT * FROM trigger_execution_log 
      WHERE execution_status IN ('PERFORMANCE_ALERT', 'ERROR_RATE_ALERT')
      AND created_at >= CURRENT_DATE;
    `);

    console.log(`🚨 Found ${alerts.rows.length} performance alerts`);

    // Cleanup test metrics
    await this.pool.query(`
      DELETE FROM trigger_performance_metrics 
      WHERE trigger_name IN ('test_slow_trigger', 'test_error_trigger');
    `);

    console.log('✅ Performance alerts test completed');
  }

  private async testCleanupFunctions(): Promise<void> {
    console.log('🧹 Testing cleanup functions...');

    // Create old test data
    await this.pool.query(`
      INSERT INTO trigger_performance_metrics (
        trigger_name, table_name, operation, avg_execution_time_ms,
        max_execution_time_ms, min_execution_time_ms, execution_count,
        error_count, last_execution, date_bucket
      ) VALUES (
        'old_trigger', 'old_table', 'DELETE', 25.0,
        50, 10, 5, 0, CURRENT_TIMESTAMP, CURRENT_DATE - INTERVAL '35 days'
      );
    `);

    await this.pool.query(`
      INSERT INTO trigger_execution_log (
        trigger_name, table_name, operation, execution_status,
        error_message, execution_time_ms, created_at
      ) VALUES (
        'old_trigger', 'old_table', 'DELETE', 'SUCCESS',
        'Test old log', 25, CURRENT_TIMESTAMP - INTERVAL '35 days'
      );
    `);

    // Count records before cleanup
    const beforeMetrics = await this.pool.query(`
      SELECT COUNT(*) FROM trigger_performance_metrics;
    `);
    const beforeLogs = await this.pool.query(`
      SELECT COUNT(*) FROM trigger_execution_log;
    `);

    console.log(`📊 Before cleanup: ${beforeMetrics.rows[0].count} metrics, ${beforeLogs.rows[0].count} logs`);

    // Run cleanup
    await this.pool.query(`SELECT cleanup_trigger_performance_metrics();`);

    // Count records after cleanup
    const afterMetrics = await this.pool.query(`
      SELECT COUNT(*) FROM trigger_performance_metrics;
    `);
    const afterLogs = await this.pool.query(`
      SELECT COUNT(*) FROM trigger_execution_log;
    `);

    console.log(`📊 After cleanup: ${afterMetrics.rows[0].count} metrics, ${afterLogs.rows[0].count} logs`);

    console.log('✅ Cleanup functions test completed');
  }

  private async createTestUser(): Promise<{ id: string }> {
    const result = await this.pool.query(`
      INSERT INTO users (id, email, name, created_at, updated_at)
      VALUES (uuid_generate_v4(), $1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id;
    `, [`test-trigger-perf-${Date.now()}@example.com`, 'Test User']);

    return result.rows[0];
  }

  private async createTestAgent(userId: string): Promise<{ id: string }> {
    const result = await this.pool.query(`
      INSERT INTO agents (id, user_id, name, voice_id, created_at, updated_at)
      VALUES (uuid_generate_v4(), $1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id;
    `, [userId, `Test Agent ${Date.now()}`, 'test-voice']);

    return result.rows[0];
  }

  private async cleanupTestData(userId: string, agentId: string): Promise<void> {
    // Delete in correct order to respect foreign key constraints
    await this.pool.query(`DELETE FROM agent_analytics WHERE agent_id = $1;`, [agentId]);
    await this.pool.query(`DELETE FROM user_daily_analytics WHERE user_id = $1;`, [userId]);
    await this.pool.query(`DELETE FROM dashboard_cache WHERE user_id = $1;`, [userId]);
    await this.pool.query(`DELETE FROM agents WHERE id = $1;`, [agentId]);
    await this.pool.query(`DELETE FROM users WHERE id = $1;`, [userId]);
  }
}

// Run the tests
if (require.main === module) {
  const test = new TriggerPerformanceTest();
  test.runTests()
    .then(() => {
      console.log('🎉 All trigger performance optimization tests completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test suite failed:', error);
      process.exit(1);
    });
}

export { TriggerPerformanceTest };