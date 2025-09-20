#!/usr/bin/env ts-node

/**
 * Test script for dashboard overview query optimization
 * This script tests the optimized dashboard overview queries and measures performance
 */

import database from '../config/database';
import { DashboardKpiService } from '../services/dashboardKpiService';
import { agentService } from '../services/agentService';
import { queryCache } from '../services/queryCache';
import { logger } from '../utils/logger';

interface PerformanceTest {
  name: string;
  duration: number;
  success: boolean;
  error?: string;
  cacheHit?: boolean;
}

async function testDashboardOverviewOptimization() {
  console.log('🚀 Testing Dashboard Overview Query Optimization');
  console.log('================================================');

  const tests: PerformanceTest[] = [];

  try {
    // Get a test user ID from the database
    const userQuery = 'SELECT id FROM users WHERE is_active = true LIMIT 1';
    const userResult = await database.query(userQuery);
    
    if (userResult.rows.length === 0) {
      console.log('❌ No active users found in database');
      return;
    }

    const testUserId = userResult.rows[0].id;
    console.log(`📋 Using test user ID: ${testUserId}`);
    console.log('');

    // Clear cache to ensure clean test
    queryCache.clear();

    // Test 1: Materialized View KPI Summary (Cold Cache)
    console.log('🔍 Test 1: Materialized View KPI Summary (Cold Cache)');
    const test1Start = Date.now();
    try {
      const kpiSummary = await DashboardKpiService.getUserKPISummary(testUserId);
      const test1Duration = Date.now() - test1Start;
      
      tests.push({
        name: 'KPI Summary (Cold Cache)',
        duration: test1Duration,
        success: true,
        cacheHit: false
      });
      
      console.log(`✅ Success: ${test1Duration}ms`);
      console.log(`   Data found: ${kpiSummary ? 'Yes' : 'No'}`);
      if (kpiSummary) {
        console.log(`   Total calls (30d): ${kpiSummary.total_calls_30d}`);
        console.log(`   Total leads (30d): ${kpiSummary.total_leads_30d}`);
        console.log(`   Success rate: ${kpiSummary.success_rate_30d}%`);
      }
    } catch (error) {
      const test1Duration = Date.now() - test1Start;
      tests.push({
        name: 'KPI Summary (Cold Cache)',
        duration: test1Duration,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.log(`❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    console.log('');

    // Test 2: Materialized View KPI Summary (Warm Cache)
    console.log('🔍 Test 2: Materialized View KPI Summary (Warm Cache)');
    const test2Start = Date.now();
    try {
      const kpiSummary = await DashboardKpiService.getUserKPISummary(testUserId);
      const test2Duration = Date.now() - test2Start;
      
      tests.push({
        name: 'KPI Summary (Warm Cache)',
        duration: test2Duration,
        success: true,
        cacheHit: true
      });
      
      console.log(`✅ Success: ${test2Duration}ms (should be much faster)`);
    } catch (error) {
      const test2Duration = Date.now() - test2Start;
      tests.push({
        name: 'KPI Summary (Warm Cache)',
        duration: test2Duration,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.log(`❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    console.log('');

    // Test 3: Optimized Recent Activity (Cold Cache)
    console.log('🔍 Test 3: Optimized Recent Activity (Cold Cache)');
    const test3Start = Date.now();
    try {
      const overviewData = await DashboardKpiService.getOptimizedOverviewDataWithBatchQueries(testUserId);
      const test3Duration = Date.now() - test3Start;
      
      tests.push({
        name: 'Recent Activity (Cold Cache)',
        duration: test3Duration,
        success: true,
        cacheHit: false
      });
      
      console.log(`✅ Success: ${test3Duration}ms`);
      console.log(`   Recent activity items: ${overviewData.recentActivity.length}`);
      if (overviewData.recentActivity.length > 0) {
        console.log(`   Latest activity: ${overviewData.recentActivity[0].message}`);
      }
    } catch (error) {
      const test3Duration = Date.now() - test3Start;
      tests.push({
        name: 'Recent Activity (Cold Cache)',
        duration: test3Duration,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.log(`❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    console.log('');

    // Test 4: Batch Agent Queries (Cold Cache)
    console.log('🔍 Test 4: Batch Agent Queries (Cold Cache)');
    const test4Start = Date.now();
    try {
      const agents = await agentService.listAgentsForFrontend(testUserId);
      const test4Duration = Date.now() - test4Start;
      
      tests.push({
        name: 'Batch Agent Queries (Cold Cache)',
        duration: test4Duration,
        success: true,
        cacheHit: false
      });
      
      console.log(`✅ Success: ${test4Duration}ms`);
      console.log(`   Agents found: ${agents.length}`);
      if (agents.length > 0) {
        console.log(`   First agent: ${agents[0].name} (${agents[0].conversations} conversations)`);
      }
    } catch (error) {
      const test4Duration = Date.now() - test4Start;
      tests.push({
        name: 'Batch Agent Queries (Cold Cache)',
        duration: test4Duration,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.log(`❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    console.log('');

    // Test 5: Batch Agent Queries (Warm Cache)
    console.log('🔍 Test 5: Batch Agent Queries (Warm Cache)');
    const test5Start = Date.now();
    try {
      const agents = await agentService.listAgentsForFrontend(testUserId);
      const test5Duration = Date.now() - test5Start;
      
      tests.push({
        name: 'Batch Agent Queries (Warm Cache)',
        duration: test5Duration,
        success: true,
        cacheHit: true
      });
      
      console.log(`✅ Success: ${test5Duration}ms (should be much faster)`);
    } catch (error) {
      const test5Duration = Date.now() - test5Start;
      tests.push({
        name: 'Batch Agent Queries (Warm Cache)',
        duration: test5Duration,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.log(`❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    console.log('');

    // Test 6: Full Dashboard Overview (Optimized)
    console.log('🔍 Test 6: Full Dashboard Overview (Optimized)');
    const test6Start = Date.now();
    try {
      const overviewData = await DashboardKpiService.getOptimizedOverviewDataWithBatchQueries(testUserId);
      const test6Duration = Date.now() - test6Start;
      
      tests.push({
        name: 'Full Dashboard Overview (Optimized)',
        duration: test6Duration,
        success: true,
        cacheHit: true
      });
      
      console.log(`✅ Success: ${test6Duration}ms`);
      console.log(`   KPIs: ${overviewData.kpis.length}`);
      console.log(`   Total agents: ${overviewData.agents.total}`);
      console.log(`   Active agents: ${overviewData.agents.active}`);
      console.log(`   Total calls (30d): ${overviewData.conversations.total}`);
      console.log(`   Success rate: ${overviewData.conversations.successRate}%`);
    } catch (error) {
      const test6Duration = Date.now() - test6Start;
      tests.push({
        name: 'Full Dashboard Overview (Optimized)',
        duration: test6Duration,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.log(`❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    console.log('');

    // Display cache statistics
    console.log('📊 Cache Statistics');
    console.log('==================');
    const cacheStats = queryCache.getStats();
    console.log(`Cache hits: ${cacheStats.hits}`);
    console.log(`Cache misses: ${cacheStats.misses}`);
    console.log(`Hit rate: ${cacheStats.hitRate.toFixed(2)}%`);
    console.log(`Cache entries: ${cacheStats.entries}`);
    console.log('');

    // Performance Summary
    console.log('📈 Performance Summary');
    console.log('=====================');
    
    const successfulTests = tests.filter(t => t.success);
    const failedTests = tests.filter(t => !t.success);
    
    console.log(`✅ Successful tests: ${successfulTests.length}/${tests.length}`);
    console.log(`❌ Failed tests: ${failedTests.length}/${tests.length}`);
    console.log('');
    
    if (successfulTests.length > 0) {
      console.log('Performance Results:');
      successfulTests.forEach(test => {
        const cacheIndicator = test.cacheHit ? '(cached)' : '(fresh)';
        console.log(`  ${test.name}: ${test.duration}ms ${cacheIndicator}`);
      });
      console.log('');
      
      // Calculate cache performance improvement
      const coldCacheTests = successfulTests.filter(t => !t.cacheHit);
      const warmCacheTests = successfulTests.filter(t => t.cacheHit);
      
      if (coldCacheTests.length > 0 && warmCacheTests.length > 0) {
        const avgColdTime = coldCacheTests.reduce((sum, t) => sum + t.duration, 0) / coldCacheTests.length;
        const avgWarmTime = warmCacheTests.reduce((sum, t) => sum + t.duration, 0) / warmCacheTests.length;
        const improvement = ((avgColdTime - avgWarmTime) / avgColdTime * 100);
        
        console.log(`🚀 Cache Performance Improvement: ${improvement.toFixed(1)}%`);
        console.log(`   Average cold cache time: ${avgColdTime.toFixed(1)}ms`);
        console.log(`   Average warm cache time: ${avgWarmTime.toFixed(1)}ms`);
      }
    }
    
    if (failedTests.length > 0) {
      console.log('');
      console.log('❌ Failed Tests:');
      failedTests.forEach(test => {
        console.log(`  ${test.name}: ${test.error}`);
      });
    }

    // Performance targets check
    console.log('');
    console.log('🎯 Performance Target Analysis');
    console.log('==============================');
    
    const dashboardTests = successfulTests.filter(t => 
      t.name.includes('Dashboard Overview') || t.name.includes('KPI Summary')
    );
    
    if (dashboardTests.length > 0) {
      const maxDashboardTime = Math.max(...dashboardTests.map(t => t.duration));
      const target = 2000; // 2 seconds target
      
      if (maxDashboardTime <= target) {
        console.log(`✅ Dashboard performance target met: ${maxDashboardTime}ms <= ${target}ms`);
      } else {
        console.log(`❌ Dashboard performance target missed: ${maxDashboardTime}ms > ${target}ms`);
      }
    }

  } catch (error) {
    console.error('❌ Test execution failed:', error);
  } finally {
    // Clean up - close database connection
    try {
      await database.close();
    } catch (cleanupError) {
      console.warn('Warning: Could not close database connection:', cleanupError);
    }
  }
}

// Run the test
if (require.main === module) {
  testDashboardOverviewOptimization()
    .then(() => {
      console.log('');
      console.log('🏁 Dashboard overview optimization test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test failed:', error);
      process.exit(1);
    });
}

export { testDashboardOverviewOptimization };