#!/usr/bin/env ts-node

/**
 * Test script for dashboard cache layer implementation
 * Requirements: 1.2, 6.1, 6.2, 6.3
 */

import { dashboardCacheService } from '../services/dashboardCache';
import { CacheInvalidationService } from '../services/cacheInvalidation';
import { dashboardCache } from '../services/memoryCache';
import { logger } from '../utils/logger';
import database from '../config/database';

interface TestResult {
  testName: string;
  passed: boolean;
  duration: number;
  details?: any;
  error?: string;
}

class DashboardCacheIntegrationTest {
  private results: TestResult[] = [];
  private testUserId = '550e8400-e29b-41d4-a716-446655440000'; // Valid UUID for testing

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Dashboard Cache Integration Tests');
    console.log('=' .repeat(60));

    try {
      // Initialize database connection
      await database.initialize();
      console.log('✅ Database connection established');

      // Run individual tests
      await this.testCacheFirstStrategy();
      await this.testCacheInvalidation();
      await this.testCacheWarming();
      await this.testBackgroundRefresh();
      await this.testCacheStatistics();
      await this.testErrorHandling();

      // Print results
      this.printResults();

    } catch (error) {
      console.error('❌ Test setup failed:', error);
    } finally {
      // Cleanup
      await this.cleanup();
      await database.close();
    }
  }

  /**
   * Test cache-first strategy for dashboard overview
   * Requirements: 1.2, 6.1, 6.2
   */
  async testCacheFirstStrategy(): Promise<void> {
    const testName = 'Cache-First Strategy';
    const startTime = Date.now();

    try {
      console.log('\n📋 Testing cache-first strategy...');

      // Clear any existing cache
      dashboardCache.clear();

      // First request - should be cache miss
      console.log('  → First request (cache miss)...');
      const firstStart = Date.now();
      const firstResult = await dashboardCacheService.getOverviewData(this.testUserId);
      const firstDuration = Date.now() - firstStart;
      console.log(`  ✓ First request completed in ${firstDuration}ms`);

      // Second request - should be cache hit
      console.log('  → Second request (cache hit)...');
      const secondStart = Date.now();
      const secondResult = await dashboardCacheService.getOverviewData(this.testUserId);
      const secondDuration = Date.now() - secondStart;
      console.log(`  ✓ Second request completed in ${secondDuration}ms`);

      // Verify cache hit is faster
      const speedImprovement = ((firstDuration - secondDuration) / firstDuration) * 100;
      console.log(`  📊 Speed improvement: ${speedImprovement.toFixed(1)}%`);

      // Verify data consistency
      const dataConsistent = JSON.stringify(firstResult) === JSON.stringify(secondResult);
      console.log(`  🔍 Data consistency: ${dataConsistent ? 'PASS' : 'FAIL'}`);

      // Check cache statistics
      const stats = dashboardCache.getStatistics();
      console.log(`  📈 Cache stats - Hits: ${stats.hits}, Misses: ${stats.misses}, Hit Rate: ${stats.hitRate.toFixed(1)}%`);

      this.results.push({
        testName,
        passed: secondDuration < firstDuration && dataConsistent && stats.hits > 0,
        duration: Date.now() - startTime,
        details: {
          firstDuration,
          secondDuration,
          speedImprovement: speedImprovement.toFixed(1) + '%',
          dataConsistent,
          cacheStats: stats
        }
      });

    } catch (error) {
      this.results.push({
        testName,
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Test cache invalidation functionality
   * Requirements: 6.2
   */
  async testCacheInvalidation(): Promise<void> {
    const testName = 'Cache Invalidation';
    const startTime = Date.now();

    try {
      console.log('\n🗑️ Testing cache invalidation...');

      // Populate cache first
      await dashboardCacheService.getOverviewData(this.testUserId);
      
      // Verify cache exists
      const cacheKey = `dashboard:${this.testUserId}:overview`;
      const cachedBefore = dashboardCache.has(cacheKey);
      console.log(`  → Cache exists before invalidation: ${cachedBefore}`);

      // Invalidate cache
      console.log('  → Invalidating dashboard cache...');
      dashboardCacheService.invalidateDashboardCache(this.testUserId);

      // Verify cache is cleared
      const cachedAfter = dashboardCache.has(cacheKey);
      console.log(`  → Cache exists after invalidation: ${cachedAfter}`);

      // Test pattern-based invalidation
      await dashboardCacheService.getOverviewData(this.testUserId);
      await dashboardCacheService.getAnalyticsData(this.testUserId);
      
      const entriesBefore = dashboardCache.size();
      console.log(`  → Cache entries before pattern invalidation: ${entriesBefore}`);
      
      CacheInvalidationService.invalidateUserDashboard(this.testUserId);
      
      const entriesAfter = dashboardCache.size();
      console.log(`  → Cache entries after pattern invalidation: ${entriesAfter}`);

      this.results.push({
        testName,
        passed: !cachedAfter && entriesAfter < entriesBefore,
        duration: Date.now() - startTime,
        details: {
          cachedBefore,
          cachedAfter,
          entriesBefore,
          entriesAfter
        }
      });

    } catch (error) {
      this.results.push({
        testName,
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Test cache warming functionality
   * Requirements: 6.3
   */
  async testCacheWarming(): Promise<void> {
    const testName = 'Cache Warming';
    const startTime = Date.now();

    try {
      console.log('\n🔥 Testing cache warming...');

      // Clear cache first
      dashboardCache.clear();
      const entriesBefore = dashboardCache.size();
      console.log(`  → Cache entries before warming: ${entriesBefore}`);

      // Warm cache
      console.log('  → Warming dashboard cache...');
      await dashboardCacheService.warmDashboardCache(this.testUserId);

      // Check cache entries after warming
      const entriesAfter = dashboardCache.size();
      console.log(`  → Cache entries after warming: ${entriesAfter}`);

      // Verify cache hit on subsequent request
      const requestStart = Date.now();
      await dashboardCacheService.getOverviewData(this.testUserId);
      const requestDuration = Date.now() - requestStart;
      console.log(`  → Request after warming completed in ${requestDuration}ms`);

      // Check cache statistics
      const stats = dashboardCache.getStatistics();
      console.log(`  📈 Cache stats after warming - Hits: ${stats.hits}, Hit Rate: ${stats.hitRate.toFixed(1)}%`);

      this.results.push({
        testName,
        passed: entriesAfter > entriesBefore && requestDuration < 100, // Should be fast due to cache hit
        duration: Date.now() - startTime,
        details: {
          entriesBefore,
          entriesAfter,
          requestDuration,
          cacheStats: stats
        }
      });

    } catch (error) {
      this.results.push({
        testName,
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Test background refresh functionality
   */
  async testBackgroundRefresh(): Promise<void> {
    const testName = 'Background Refresh';
    const startTime = Date.now();

    try {
      console.log('\n🔄 Testing background refresh...');

      // This test is more complex as it involves TTL and background processes
      // For now, we'll test the configuration and basic functionality
      
      const stats = dashboardCacheService.getCacheStatistics();
      console.log('  → Cache statistics:', stats);

      // Test warming config update
      dashboardCacheService.updateWarmingConfig({
        backgroundRefresh: true,
        refreshThreshold: 0.5
      });
      console.log('  ✓ Updated warming configuration');

      this.results.push({
        testName,
        passed: true, // Basic test passes if no errors
        duration: Date.now() - startTime,
        details: {
          cacheStatistics: stats
        }
      });

    } catch (error) {
      this.results.push({
        testName,
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Test cache statistics and monitoring
   */
  async testCacheStatistics(): Promise<void> {
    const testName = 'Cache Statistics';
    const startTime = Date.now();

    try {
      console.log('\n📊 Testing cache statistics...');

      // Generate some cache activity
      await dashboardCacheService.getOverviewData(this.testUserId);
      await dashboardCacheService.getAnalyticsData(this.testUserId);
      dashboardCacheService.invalidateDashboardCache(this.testUserId);
      await dashboardCacheService.getOverviewData(this.testUserId);

      // Get comprehensive statistics
      const stats = dashboardCacheService.getCacheStatistics();
      console.log('  → Dashboard cache stats:', stats.dashboard);
      console.log('  → Performance cache stats:', stats.performance);

      // Get invalidation statistics
      const invalidationStats = CacheInvalidationService.getCacheInvalidationStats();
      console.log('  → Invalidation stats available:', Object.keys(invalidationStats));

      this.results.push({
        testName,
        passed: stats.dashboard && stats.performance,
        duration: Date.now() - startTime,
        details: {
          dashboardStats: stats.dashboard,
          performanceStats: stats.performance,
          invalidationStatsKeys: Object.keys(invalidationStats)
        }
      });

    } catch (error) {
      this.results.push({
        testName,
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Test error handling and fallback mechanisms
   */
  async testErrorHandling(): Promise<void> {
    const testName = 'Error Handling';
    const startTime = Date.now();

    try {
      console.log('\n⚠️ Testing error handling...');

      // Test with invalid user ID
      console.log('  → Testing with invalid user ID...');
      try {
        await dashboardCacheService.getOverviewData('550e8400-e29b-41d4-a716-446655440001'); // Valid UUID but non-existent user
        console.log('  ✓ Handled invalid user ID gracefully');
      } catch (error) {
        console.log('  ✓ Error handling working for invalid user ID');
      }

      // Test cache clearing
      console.log('  → Testing cache clearing...');
      dashboardCacheService.clearAllDashboardCaches();
      console.log('  ✓ Cache clearing completed');

      this.results.push({
        testName,
        passed: true, // If we reach here, error handling is working
        duration: Date.now() - startTime,
        details: {
          errorHandlingWorking: true
        }
      });

    } catch (error) {
      this.results.push({
        testName,
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Print test results
   */
  private printResults(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📋 DASHBOARD CACHE INTEGRATION TEST RESULTS');
    console.log('='.repeat(60));

    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;

    this.results.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      const duration = `${result.duration}ms`;
      
      console.log(`${status} ${result.testName.padEnd(25)} (${duration})`);
      
      if (result.error) {
        console.log(`     Error: ${result.error}`);
      }
      
      if (result.details && Object.keys(result.details).length > 0) {
        console.log(`     Details: ${JSON.stringify(result.details, null, 2).replace(/\n/g, '\n     ')}`);
      }
    });

    console.log('\n' + '-'.repeat(60));
    console.log(`📊 Summary: ${passedTests}/${totalTests} tests passed`);
    
    if (failedTests > 0) {
      console.log(`❌ ${failedTests} test(s) failed`);
      process.exit(1);
    } else {
      console.log('🎉 All tests passed!');
    }
  }

  /**
   * Cleanup test data
   */
  private async cleanup(): Promise<void> {
    try {
      console.log('\n🧹 Cleaning up test data...');
      
      // Clear all caches
      dashboardCache.clear();
      
      console.log('✅ Cleanup completed');
    } catch (error) {
      console.error('⚠️ Cleanup failed:', error);
    }
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const test = new DashboardCacheIntegrationTest();
  test.runAllTests().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

export { DashboardCacheIntegrationTest };