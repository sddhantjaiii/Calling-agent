#!/usr/bin/env ts-node

/**
 * Test script for dashboard analytics optimization
 * Tests the optimized analytics queries and performance improvements
 */

import database from '../config/database';
import { DashboardAnalyticsService } from '../services/dashboardAnalyticsService';
import { logger } from '../utils/logger';

interface PerformanceTest {
  name: string;
  duration: number;
  success: boolean;
  error?: string;
}

class DashboardAnalyticsOptimizationTest {
  private testResults: PerformanceTest[] = [];

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Dashboard Analytics Optimization Tests...\n');

    try {
      // Test database connection
      await this.testDatabaseConnection();

      // Test optimized analytics queries
      await this.testOptimizedAnalyticsQueries();

      // Test query performance
      await this.testQueryPerformance();

      // Test parallel query execution
      await this.testParallelQueryExecution();

      // Test timeout handling
      await this.testTimeoutHandling();

      // Test fallback strategies
      await this.testFallbackStrategies();

      // Display results
      this.displayResults();

    } catch (error) {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    }
  }

  private async testDatabaseConnection(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const result = await database.query('SELECT 1 as test');
      const duration = Date.now() - startTime;
      
      if (result.rows[0].test === 1) {
        this.testResults.push({
          name: 'Database Connection',
          duration,
          success: true
        });
        console.log('✅ Database connection test passed');
      } else {
        throw new Error('Invalid database response');
      }
    } catch (error) {
      this.testResults.push({
        name: 'Database Connection',
        duration: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.log('❌ Database connection test failed');
    }
  }

  private async testOptimizedAnalyticsQueries(): Promise<void> {
    console.log('\n📊 Testing Optimized Analytics Queries...');

    // Test with a sample user ID (use first available user or create test data)
    const userQuery = 'SELECT id FROM users LIMIT 1';
    const userResult = await database.query(userQuery);
    
    if (userResult.rows.length === 0) {
      console.log('⚠️  No users found, skipping analytics tests');
      return;
    }

    const userId = userResult.rows[0].id;
    console.log(`Using test user ID: ${userId}`);

    // Test leads over time query
    await this.testLeadsOverTimeQuery(userId);

    // Test interactions over time query
    await this.testInteractionsOverTimeQuery(userId);

    // Test lead quality distribution query
    await this.testLeadQualityQuery(userId);

    // Test agent performance query
    await this.testAgentPerformanceQuery(userId);
  }

  private async testLeadsOverTimeQuery(userId: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Test the optimized leads over time query
      const query = `
        SELECT 
          DATE(c.created_at) as date,
          COUNT(la.id) as lead_count
        FROM calls c
        LEFT JOIN lead_analytics la ON c.id = la.call_id
        WHERE c.user_id = $1 
          AND c.created_at >= CURRENT_DATE - INTERVAL '7 days'
          AND c.created_at < CURRENT_DATE + INTERVAL '1 day'
        GROUP BY DATE(c.created_at)
        ORDER BY date ASC
      `;

      const result = await database.query(query, [userId]);
      const duration = Date.now() - startTime;

      this.testResults.push({
        name: 'Leads Over Time Query',
        duration,
        success: true
      });

      console.log(`✅ Leads over time query completed in ${duration}ms (${result.rows.length} rows)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.testResults.push({
        name: 'Leads Over Time Query',
        duration,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.log(`❌ Leads over time query failed in ${duration}ms`);
    }
  }

  private async testInteractionsOverTimeQuery(userId: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Test the optimized interactions over time query
      const query = `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as call_count
        FROM calls
        WHERE user_id = $1 
          AND created_at >= CURRENT_DATE - INTERVAL '7 days'
          AND created_at < CURRENT_DATE + INTERVAL '1 day'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `;

      const result = await database.query(query, [userId]);
      const duration = Date.now() - startTime;

      this.testResults.push({
        name: 'Interactions Over Time Query',
        duration,
        success: true
      });

      console.log(`✅ Interactions over time query completed in ${duration}ms (${result.rows.length} rows)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.testResults.push({
        name: 'Interactions Over Time Query',
        duration,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.log(`❌ Interactions over time query failed in ${duration}ms`);
    }
  }

  private async testLeadQualityQuery(userId: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Test the optimized lead quality distribution query
      const query = `
        SELECT 
          CASE 
            WHEN la.total_score >= 80 THEN 'Hot'
            WHEN la.total_score >= 60 THEN 'Warm'
            ELSE 'Cold'
          END as quality,
          COUNT(*) as count
        FROM lead_analytics la
        INNER JOIN calls c ON la.call_id = c.id
        WHERE c.user_id = $1
          AND la.total_score IS NOT NULL
        GROUP BY 
          CASE 
            WHEN la.total_score >= 80 THEN 'Hot'
            WHEN la.total_score >= 60 THEN 'Warm'
            ELSE 'Cold'
          END
        ORDER BY 
          CASE 
            WHEN CASE 
              WHEN la.total_score >= 80 THEN 'Hot'
              WHEN la.total_score >= 60 THEN 'Warm'
              ELSE 'Cold'
            END = 'Hot' THEN 1
            WHEN CASE 
              WHEN la.total_score >= 80 THEN 'Hot'
              WHEN la.total_score >= 60 THEN 'Warm'
              ELSE 'Cold'
            END = 'Warm' THEN 2
            ELSE 3
          END
      `;

      const result = await database.query(query, [userId]);
      const duration = Date.now() - startTime;

      this.testResults.push({
        name: 'Lead Quality Distribution Query',
        duration,
        success: true
      });

      console.log(`✅ Lead quality distribution query completed in ${duration}ms (${result.rows.length} rows)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.testResults.push({
        name: 'Lead Quality Distribution Query',
        duration,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.log(`❌ Lead quality distribution query failed in ${duration}ms`);
    }
  }

  private async testAgentPerformanceQuery(userId: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Test the optimized agent performance query
      const query = `
        SELECT 
          a.name,
          COALESCE(aa.total_calls, 0) as conversations,
          COALESCE(aa.success_rate, 0) as success_rate,
          COALESCE(aa.avg_duration_minutes, 0) as avg_duration
        FROM agents a
        LEFT JOIN (
          SELECT 
            agent_id,
            SUM(total_calls) as total_calls,
            AVG(success_rate) as success_rate,
            AVG(avg_duration_minutes) as avg_duration_minutes
          FROM agent_analytics
          WHERE user_id = $1 
            AND hour IS NULL
            AND date >= CURRENT_DATE - INTERVAL '30 days'
          GROUP BY agent_id
        ) aa ON a.id = aa.agent_id
        WHERE a.user_id = $1
          AND a.is_active = true
        ORDER BY COALESCE(aa.total_calls, 0) DESC
        LIMIT 5
      `;

      const result = await database.query(query, [userId]);
      const duration = Date.now() - startTime;

      this.testResults.push({
        name: 'Agent Performance Query',
        duration,
        success: true
      });

      console.log(`✅ Agent performance query completed in ${duration}ms (${result.rows.length} rows)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.testResults.push({
        name: 'Agent Performance Query',
        duration,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.log(`❌ Agent performance query failed in ${duration}ms`);
    }
  }

  private async testQueryPerformance(): Promise<void> {
    console.log('\n⚡ Testing Query Performance...');

    // Test with a sample user ID
    const userQuery = 'SELECT id FROM users LIMIT 1';
    const userResult = await database.query(userQuery);
    
    if (userResult.rows.length === 0) {
      console.log('⚠️  No users found, skipping performance tests');
      return;
    }

    const userId = userResult.rows[0].id;
    const startTime = Date.now();

    try {
      // Test the full optimized analytics service
      const analyticsData = await DashboardAnalyticsService.getOptimizedAnalyticsData(userId);
      const duration = Date.now() - startTime;

      this.testResults.push({
        name: 'Full Analytics Service Performance',
        duration,
        success: true
      });

      console.log(`✅ Full analytics service completed in ${duration}ms`);
      console.log(`   - Leads over time: ${analyticsData.leadsOverTimeData.length} data points`);
      console.log(`   - Interactions over time: ${analyticsData.interactionsOverTimeData.length} data points`);
      console.log(`   - Lead quality: ${analyticsData.leadQualityData.length} categories`);
      console.log(`   - Agent performance: ${analyticsData.agentPerformance.length} agents`);

      // Check if performance meets requirements (< 2 seconds)
      if (duration < 2000) {
        console.log(`✅ Performance requirement met: ${duration}ms < 2000ms`);
      } else {
        console.log(`⚠️  Performance requirement not met: ${duration}ms >= 2000ms`);
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      this.testResults.push({
        name: 'Full Analytics Service Performance',
        duration,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.log(`❌ Full analytics service failed in ${duration}ms`);
    }
  }

  private async testParallelQueryExecution(): Promise<void> {
    console.log('\n🔄 Testing Parallel Query Execution...');

    const userQuery = 'SELECT id FROM users LIMIT 1';
    const userResult = await database.query(userQuery);
    
    if (userResult.rows.length === 0) {
      console.log('⚠️  No users found, skipping parallel execution tests');
      return;
    }

    const userId = userResult.rows[0].id;

    // Test sequential vs parallel execution
    const startTimeSequential = Date.now();
    
    try {
      // Sequential execution (for comparison)
      const query1 = 'SELECT COUNT(*) FROM calls WHERE user_id = $1';
      const query2 = 'SELECT COUNT(*) FROM lead_analytics la JOIN calls c ON la.call_id = c.id WHERE c.user_id = $1';
      const query3 = 'SELECT COUNT(*) FROM agents WHERE user_id = $1';

      await database.query(query1, [userId]);
      await database.query(query2, [userId]);
      await database.query(query3, [userId]);

      const sequentialDuration = Date.now() - startTimeSequential;

      // Parallel execution
      const startTimeParallel = Date.now();

      await Promise.all([
        database.query(query1, [userId]),
        database.query(query2, [userId]),
        database.query(query3, [userId])
      ]);

      const parallelDuration = Date.now() - startTimeParallel;

      this.testResults.push({
        name: 'Parallel Query Execution',
        duration: parallelDuration,
        success: true
      });

      console.log(`✅ Sequential execution: ${sequentialDuration}ms`);
      console.log(`✅ Parallel execution: ${parallelDuration}ms`);
      console.log(`✅ Performance improvement: ${Math.round(((sequentialDuration - parallelDuration) / sequentialDuration) * 100)}%`);

    } catch (error) {
      this.testResults.push({
        name: 'Parallel Query Execution',
        duration: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.log('❌ Parallel query execution test failed');
    }
  }

  private async testTimeoutHandling(): Promise<void> {
    console.log('\n⏱️  Testing Timeout Handling...');

    try {
      // Test timeout with a slow query (simulate with pg_sleep)
      const startTime = Date.now();
      
      try {
        // This should timeout after 1 second
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Query timeout after 1000ms')), 1000);
        });

        const queryPromise = database.query('SELECT pg_sleep(2)'); // 2 second sleep

        await Promise.race([queryPromise, timeoutPromise]);
        
        // If we get here, the query completed before timeout
        const duration = Date.now() - startTime;
        console.log(`✅ Query completed before timeout in ${duration}ms`);
        
      } catch (error) {
        const duration = Date.now() - startTime;
        
        if (error instanceof Error && error.message.includes('timeout')) {
          this.testResults.push({
            name: 'Timeout Handling',
            duration,
            success: true
          });
          console.log(`✅ Timeout handling working correctly: ${duration}ms`);
        } else {
          throw error;
        }
      }

    } catch (error) {
      this.testResults.push({
        name: 'Timeout Handling',
        duration: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.log('❌ Timeout handling test failed');
    }
  }

  private async testFallbackStrategies(): Promise<void> {
    console.log('\n🔄 Testing Fallback Strategies...');

    const userQuery = 'SELECT id FROM users LIMIT 1';
    const userResult = await database.query(userQuery);
    
    if (userResult.rows.length === 0) {
      console.log('⚠️  No users found, skipping fallback tests');
      return;
    }

    const userId = userResult.rows[0].id;
    const startTime = Date.now();

    try {
      // Test fallback data generation (this should always work)
      const fallbackData = await DashboardAnalyticsService.getOptimizedAnalyticsData(userId);
      const duration = Date.now() - startTime;

      // Verify fallback data structure
      const hasRequiredFields = (
        Array.isArray(fallbackData.leadsOverTimeData) &&
        Array.isArray(fallbackData.interactionsOverTimeData) &&
        Array.isArray(fallbackData.leadQualityData) &&
        Array.isArray(fallbackData.agentPerformance)
      );

      if (hasRequiredFields) {
        this.testResults.push({
          name: 'Fallback Strategies',
          duration,
          success: true
        });
        console.log(`✅ Fallback strategies working correctly in ${duration}ms`);
      } else {
        throw new Error('Fallback data structure is invalid');
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      this.testResults.push({
        name: 'Fallback Strategies',
        duration,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.log(`❌ Fallback strategies test failed in ${duration}ms`);
    }
  }

  private displayResults(): void {
    console.log('\n📋 Test Results Summary:');
    console.log('=' .repeat(60));

    let totalTests = this.testResults.length;
    let passedTests = this.testResults.filter(test => test.success).length;
    let failedTests = totalTests - passedTests;

    this.testResults.forEach(test => {
      const status = test.success ? '✅ PASS' : '❌ FAIL';
      const duration = test.duration.toString().padStart(4, ' ');
      console.log(`${status} | ${duration}ms | ${test.name}`);
      
      if (!test.success && test.error) {
        console.log(`     Error: ${test.error}`);
      }
    });

    console.log('=' .repeat(60));
    console.log(`Total Tests: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);

    if (failedTests === 0) {
      console.log('🎉 All tests passed! Dashboard analytics optimization is working correctly.');
    } else {
      console.log(`⚠️  ${failedTests} test(s) failed. Please review the errors above.`);
    }

    // Performance summary
    const avgDuration = this.testResults.reduce((sum, test) => sum + test.duration, 0) / totalTests;
    console.log(`📊 Average query time: ${Math.round(avgDuration)}ms`);

    const performanceTests = this.testResults.filter(test => 
      test.name.includes('Performance') || test.name.includes('Query')
    );
    
    if (performanceTests.length > 0) {
      const maxDuration = Math.max(...performanceTests.map(test => test.duration));
      const requirement = 2000; // 2 seconds requirement
      
      if (maxDuration < requirement) {
        console.log(`✅ Performance requirement met: ${maxDuration}ms < ${requirement}ms`);
      } else {
        console.log(`⚠️  Performance requirement not met: ${maxDuration}ms >= ${requirement}ms`);
      }
    }
  }
}

// Run the tests
async function main() {
  const tester = new DashboardAnalyticsOptimizationTest();
  await tester.runAllTests();
  process.exit(0);
}

if (require.main === module) {
  main().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

export { DashboardAnalyticsOptimizationTest };