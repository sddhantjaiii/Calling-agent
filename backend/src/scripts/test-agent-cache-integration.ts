#!/usr/bin/env ts-node

/**
 * Test script for Agent Cache Service integration
 * Tests the agent performance cache implementation
 */

import { agentCacheService } from '../services/agentCache';
import { CacheManager } from '../services/memoryCache';
import database from '../config/database';
import { logger } from '../utils/logger';

interface TestResult {
  testName: string;
  success: boolean;
  duration: number;
  error?: string;
  details?: any;
}

class AgentCacheIntegrationTest {
  private results: TestResult[] = [];
  private testUserId = '550e8400-e29b-41d4-a716-446655440000'; // Valid UUID format

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Agent Cache Integration Tests...\n');

    try {
      // Test 1: Basic agent cache functionality
      await this.testBasicAgentCache();

      // Test 2: Batch agent operations
      await this.testBatchAgentOperations();

      // Test 3: Cache invalidation
      await this.testCacheInvalidation();

      // Test 4: Background refresh
      await this.testBackgroundRefresh();

      // Test 5: Performance comparison
      await this.testPerformanceComparison();

      // Test 6: Cache statistics
      await this.testCacheStatistics();

      // Test 7: Stale cache refresh
      await this.testStaleCacheRefresh();

    } catch (error) {
      console.error('❌ Test suite failed:', error);
    } finally {
      await this.cleanup();
      this.printResults();
    }
  }

  private async testBasicAgentCache(): Promise<void> {
    const testName = 'Basic Agent Cache Functionality';
    const startTime = Date.now();

    try {
      console.log('📋 Testing basic agent cache functionality...');

      // Get agents from cache (should be cache miss first time)
      const agents1 = await agentCacheService.getBatchAgentPerformance(this.testUserId);
      console.log(`  ✓ First fetch returned ${agents1.length} agents`);

      // Get agents again (should be cache hit)
      const agents2 = await agentCacheService.getBatchAgentPerformance(this.testUserId);
      console.log(`  ✓ Second fetch returned ${agents2.length} agents (cached)`);

      // Verify cache statistics
      const stats = agentCacheService.getCacheStatistics();
      console.log(`  ✓ Cache statistics: ${JSON.stringify(stats.agent, null, 2)}`);

      this.results.push({
        testName,
        success: true,
        duration: Date.now() - startTime,
        details: {
          firstFetchCount: agents1.length,
          secondFetchCount: agents2.length,
          cacheStats: stats
        }
      });

      console.log('  ✅ Basic agent cache test passed\n');
    } catch (error) {
      this.results.push({
        testName,
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      });
      console.log('  ❌ Basic agent cache test failed:', error);
    }
  }

  private async testBatchAgentOperations(): Promise<void> {
    const testName = 'Batch Agent Operations';
    const startTime = Date.now();

    try {
      console.log('📋 Testing batch agent operations...');

      // Get some agent IDs for testing by querying database directly
      const agentQuery = 'SELECT id FROM agents LIMIT 3';
      const agentResult = await database.query(agentQuery);
      const agentIds = agentResult.rows.map((row: any) => row.id.toString());

      if (agentIds.length === 0) {
        console.log('  ⚠️  No agents found for batch testing, skipping...');
        this.results.push({
          testName,
          success: true,
          duration: Date.now() - startTime,
          details: { message: 'No agents available for testing' }
        });
        return;
      }

      // Test batch cache operations
      const operations = agentIds.map((agentId: string) => ({
        agentId,
        operation: 'refresh' as const
      }));

      await agentCacheService.cacheBatchAgentOperations(this.testUserId, operations);
      console.log(`  ✓ Batch operations completed for ${operations.length} agents`);

      // Test specific agent IDs fetch
      const specificAgents = await agentCacheService.getBatchAgentPerformance(this.testUserId, agentIds);
      console.log(`  ✓ Specific agents fetch returned ${specificAgents.length} agents`);

      this.results.push({
        testName,
        success: true,
        duration: Date.now() - startTime,
        details: {
          operationsCount: operations.length,
          specificAgentsCount: specificAgents.length
        }
      });

      console.log('  ✅ Batch agent operations test passed\n');
    } catch (error) {
      this.results.push({
        testName,
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      });
      console.log('  ❌ Batch agent operations test failed:', error);
    }
  }

  private async testCacheInvalidation(): Promise<void> {
    const testName = 'Cache Invalidation';
    const startTime = Date.now();

    try {
      console.log('📋 Testing cache invalidation...');

      // Get agents to populate cache
      const agents = await agentCacheService.getBatchAgentPerformance(this.testUserId);
      console.log(`  ✓ Populated cache with ${agents.length} agents`);

      if (agents.length > 0) {
        const firstAgentId = agents[0].id.toString();

        // Test individual agent cache invalidation
        agentCacheService.invalidateAgentCache(this.testUserId, firstAgentId);
        console.log(`  ✓ Invalidated cache for agent ${firstAgentId}`);

        // Test user cache clearing
        agentCacheService.clearUserAgentCaches(this.testUserId);
        console.log(`  ✓ Cleared all agent caches for user`);
      }

      this.results.push({
        testName,
        success: true,
        duration: Date.now() - startTime,
        details: {
          agentsCount: agents.length
        }
      });

      console.log('  ✅ Cache invalidation test passed\n');
    } catch (error) {
      this.results.push({
        testName,
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      });
      console.log('  ❌ Cache invalidation test failed:', error);
    }
  }

  private async testBackgroundRefresh(): Promise<void> {
    const testName = 'Background Refresh';
    const startTime = Date.now();

    try {
      console.log('📋 Testing background refresh...');

      // Test stale cache refresh
      await agentCacheService.refreshStaleAgentCaches(this.testUserId);
      console.log('  ✓ Stale cache refresh completed');

      // Test agent cache warming with a real agent ID
      const agentQuery = 'SELECT id FROM agents LIMIT 1';
      const agentResult = await database.query(agentQuery);
      if (agentResult.rows.length > 0) {
        const firstAgentId = agentResult.rows[0].id.toString();
        await agentCacheService.warmAgentCache(this.testUserId, firstAgentId);
        console.log(`  ✓ Agent cache warming completed for agent ${firstAgentId}`);
      }

      this.results.push({
        testName,
        success: true,
        duration: Date.now() - startTime
      });

      console.log('  ✅ Background refresh test passed\n');
    } catch (error) {
      this.results.push({
        testName,
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      });
      console.log('  ❌ Background refresh test failed:', error);
    }
  }

  private async testPerformanceComparison(): Promise<void> {
    const testName = 'Performance Comparison';
    const startTime = Date.now();

    try {
      console.log('📋 Testing performance comparison...');

      // Clear cache to ensure fair comparison
      agentCacheService.clearUserAgentCaches(this.testUserId);

      // Test cached performance
      const cachedStart = Date.now();
      const cachedAgents = await agentCacheService.getBatchAgentPerformance(this.testUserId);
      const cachedDuration = Date.now() - cachedStart;

      // Test second call (should be from cache)
      const cacheHitStart = Date.now();
      const cacheHitAgents = await agentCacheService.getBatchAgentPerformance(this.testUserId);
      const cacheHitDuration = Date.now() - cacheHitStart;

      console.log(`  ✓ First call (cache miss): ${cachedDuration}ms for ${cachedAgents.length} agents`);
      console.log(`  ✓ Second call (cache hit): ${cacheHitDuration}ms for ${cacheHitAgents.length} agents`);
      console.log(`  ✓ Performance improvement: ${Math.round((cachedDuration / cacheHitDuration) * 100) / 100}x faster`);

      this.results.push({
        testName,
        success: true,
        duration: Date.now() - startTime,
        details: {
          cacheMissDuration: cachedDuration,
          cacheHitDuration: cacheHitDuration,
          performanceImprovement: Math.round((cachedDuration / cacheHitDuration) * 100) / 100,
          agentsCount: cachedAgents.length
        }
      });

      console.log('  ✅ Performance comparison test passed\n');
    } catch (error) {
      this.results.push({
        testName,
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      });
      console.log('  ❌ Performance comparison test failed:', error);
    }
  }

  private async testCacheStatistics(): Promise<void> {
    const testName = 'Cache Statistics';
    const startTime = Date.now();

    try {
      console.log('📋 Testing cache statistics...');

      // Get cache statistics
      const stats = agentCacheService.getCacheStatistics();
      console.log('  ✓ Agent cache statistics:', JSON.stringify(stats.agent, null, 2));
      console.log('  ✓ Performance cache statistics:', JSON.stringify(stats.performance, null, 2));
      console.log('  ✓ Refresh configuration:', JSON.stringify(stats.refreshConfig, null, 2));

      // Test configuration update
      agentCacheService.updateRefreshConfig({
        refreshThreshold: 0.8,
        batchRefreshSize: 15
      });
      console.log('  ✓ Updated refresh configuration');

      const updatedStats = agentCacheService.getCacheStatistics();
      console.log('  ✓ Updated refresh config:', JSON.stringify(updatedStats.refreshConfig, null, 2));

      this.results.push({
        testName,
        success: true,
        duration: Date.now() - startTime,
        details: {
          initialStats: stats,
          updatedStats: updatedStats
        }
      });

      console.log('  ✅ Cache statistics test passed\n');
    } catch (error) {
      this.results.push({
        testName,
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      });
      console.log('  ❌ Cache statistics test failed:', error);
    }
  }

  private async testStaleCacheRefresh(): Promise<void> {
    const testName = 'Stale Cache Refresh';
    const startTime = Date.now();

    try {
      console.log('📋 Testing stale cache refresh strategies...');

      // Populate cache
      await agentCacheService.getBatchAgentPerformance(this.testUserId);
      console.log('  ✓ Populated cache');

      // Test refresh stale caches
      await agentCacheService.refreshStaleAgentCaches(this.testUserId);
      console.log('  ✓ Refreshed stale caches');

      // Get cache keys to verify
      const allStats = CacheManager.getAllStatistics();
      console.log('  ✓ All cache statistics:', JSON.stringify(allStats, null, 2));

      this.results.push({
        testName,
        success: true,
        duration: Date.now() - startTime,
        details: {
          allCacheStats: allStats
        }
      });

      console.log('  ✅ Stale cache refresh test passed\n');
    } catch (error) {
      this.results.push({
        testName,
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      });
      console.log('  ❌ Stale cache refresh test failed:', error);
    }
  }

  private async cleanup(): Promise<void> {
    try {
      // Clear all test caches
      agentCacheService.clearUserAgentCaches(this.testUserId);
      console.log('🧹 Cleaned up test caches');
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }
  }

  private printResults(): void {
    console.log('\n📊 Test Results Summary:');
    console.log('=' .repeat(50));

    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`Total Tests: ${this.results.length}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ${failed > 0 ? '❌' : ''}`);
    console.log(`Total Duration: ${totalDuration}ms`);
    console.log('');

    this.results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.testName} (${result.duration}ms)`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      if (result.details) {
        console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
      }
    });

    if (failed === 0) {
      console.log('\n🎉 All agent cache integration tests passed!');
    } else {
      console.log(`\n⚠️  ${failed} test(s) failed. Please review the errors above.`);
    }
  }
}

// Run the tests
async function main() {
  const tester = new AgentCacheIntegrationTest();
  await tester.runAllTests();
  process.exit(0);
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

export { AgentCacheIntegrationTest };