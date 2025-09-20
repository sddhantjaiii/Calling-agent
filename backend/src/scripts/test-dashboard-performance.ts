#!/usr/bin/env node

import dotenv from 'dotenv';
import database from '../config/database';
import { DashboardKpiService } from '../services/dashboardKpiService';
import { logger } from '../utils/logger';

// Load environment variables
dotenv.config();

interface PerformanceResult {
  method: string;
  duration: number;
  success: boolean;
  error?: string;
}

async function testDashboardPerformance() {
  try {
    console.log('🚀 Dashboard Performance Test\n');

    // Get a test user ID from the database
    const userQuery = `SELECT id, email FROM users WHERE is_active = true LIMIT 1`;
    const userResult = await database.query(userQuery);
    
    if (userResult.rows.length === 0) {
      console.log('❌ No active users found for testing');
      return;
    }

    const testUser = userResult.rows[0];
    console.log(`📋 Testing with user: ${testUser.email} (${testUser.id})\n`);

    const results: PerformanceResult[] = [];

    // Test 1: Materialized View Method
    console.log('🔍 Testing optimized method (materialized view)...');
    try {
      const startTime = Date.now();
      const kpiSummary = await DashboardKpiService.getUserKPISummary(testUser.id);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      results.push({
        method: 'Materialized View Lookup',
        duration,
        success: true
      });
      
      console.log(`   ✅ Completed in ${duration}ms`);
      console.log(`   📊 Data found: ${kpiSummary ? 'Yes' : 'No'}`);
      
      if (kpiSummary) {
        console.log(`   📈 Calls (30d): ${kpiSummary.total_calls_30d}`);
        console.log(`   📈 Leads (30d): ${kpiSummary.total_leads_30d}`);
        console.log(`   📈 Success Rate: ${kpiSummary.success_rate_30d}%`);
      }
    } catch (error) {
      results.push({
        method: 'Materialized View Lookup',
        duration: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.log(`   ❌ Failed: ${error}`);
    }

    console.log();

    // Test 2: Full Optimized Dashboard Data
    console.log('🔍 Testing full optimized dashboard data...');
    try {
      const startTime = Date.now();
      const overviewData = await DashboardKpiService.getOptimizedOverviewData(testUser.id);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      results.push({
        method: 'Full Optimized Dashboard',
        duration,
        success: true
      });
      
      console.log(`   ✅ Completed in ${duration}ms`);
      console.log(`   📊 KPIs count: ${overviewData.kpis.length}`);
      console.log(`   📊 Recent activity items: ${overviewData.recentActivity.length}`);
      console.log(`   📊 Total agents: ${overviewData.agents.total}`);
    } catch (error) {
      results.push({
        method: 'Full Optimized Dashboard',
        duration: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.log(`   ❌ Failed: ${error}`);
    }

    console.log();

    // Test 3: Legacy Method (for comparison)
    console.log('🔍 Testing legacy method (direct queries)...');
    try {
      const startTime = Date.now();
      
      // Simulate the old aggregated query
      const aggregatedStatsQuery = `
        SELECT 
          COALESCE(SUM(aa.total_calls), 0) as total_calls,
          COALESCE(SUM(aa.successful_calls), 0) as completed_calls,
          COALESCE(SUM(aa.total_duration_minutes), 0) as total_duration,
          COALESCE(SUM(aa.credits_used), 0) as total_credits_used,
          COALESCE(SUM(aa.leads_generated), 0) as total_leads,
          COALESCE(SUM(aa.qualified_leads), 0) as high_quality_leads,
          COALESCE(AVG(aa.avg_engagement_score), 0) as avg_lead_score
        FROM agent_analytics aa
        WHERE aa.user_id = $1 AND aa.hour IS NULL
      `;
      
      await database.query(aggregatedStatsQuery, [testUser.id]);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      results.push({
        method: 'Legacy Aggregated Query',
        duration,
        success: true
      });
      
      console.log(`   ✅ Completed in ${duration}ms`);
    } catch (error) {
      results.push({
        method: 'Legacy Aggregated Query',
        duration: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.log(`   ❌ Failed: ${error}`);
    }

    console.log();

    // Test 4: Multiple Concurrent Requests
    console.log('🔍 Testing concurrent requests (5 simultaneous)...');
    try {
      const startTime = Date.now();
      
      const promises = Array(5).fill(null).map(() => 
        DashboardKpiService.getUserKPISummary(testUser.id)
      );
      
      await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      results.push({
        method: '5 Concurrent Requests',
        duration,
        success: true
      });
      
      console.log(`   ✅ Completed in ${duration}ms`);
      console.log(`   📊 Average per request: ${(duration / 5).toFixed(1)}ms`);
    } catch (error) {
      results.push({
        method: '5 Concurrent Requests',
        duration: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.log(`   ❌ Failed: ${error}`);
    }

    console.log();

    // Performance Summary
    console.log('📊 Performance Summary:');
    console.log('=' .repeat(60));
    
    results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const duration = result.success ? `${result.duration}ms` : 'Failed';
      const performance = result.success && result.duration < 100 ? '🚀 Excellent' : 
                         result.success && result.duration < 500 ? '✅ Good' : 
                         result.success ? '⚠️  Slow' : '❌ Error';
      
      console.log(`${status} ${result.method.padEnd(30)} ${duration.padStart(10)} ${performance}`);
      
      if (!result.success && result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    console.log();

    // Performance Analysis
    const successfulResults = results.filter(r => r.success);
    if (successfulResults.length > 0) {
      const avgDuration = successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length;
      const fastestResult = successfulResults.reduce((min, r) => r.duration < min.duration ? r : min);
      
      console.log('📈 Performance Analysis:');
      console.log(`   Average Duration: ${avgDuration.toFixed(1)}ms`);
      console.log(`   Fastest Method: ${fastestResult.method} (${fastestResult.duration}ms)`);
      
      if (fastestResult.duration < 100) {
        console.log('   🎉 Performance Target Met: Sub-100ms response time achieved!');
      } else if (fastestResult.duration < 500) {
        console.log('   ✅ Good Performance: Response time under 500ms');
      } else {
        console.log('   ⚠️  Performance Warning: Response time over 500ms');
      }
    }

    console.log('\n🎉 Performance test completed successfully!');

  } catch (error) {
    console.error('❌ Performance test failed:', error);
    throw error;
  }
}

async function main() {
  try {
    await testDashboardPerformance();
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await database.close();
  }
}

// Run the performance test
main().catch(async (error) => {
  console.error('❌ Unexpected error:', error);
  await database.close();
  process.exit(1);
});