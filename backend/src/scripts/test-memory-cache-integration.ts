#!/usr/bin/env ts-node

/**
 * Integration test script for the new MemoryCache service
 * Tests cache functionality with realistic data patterns
 */

import { 
  MemoryCache, 
  CacheManager, 
  dashboardCache, 
  agentCache, 
  performanceCache 
} from '../services/memoryCache';
import { 
  CacheInvalidationService, 
  CacheKeyGenerator 
} from '../services/cacheInvalidation';
import { CacheMonitoringService } from '../services/cacheMonitoring';
import { logger } from '../utils/logger';

interface TestUser {
  id: string;
  email: string;
  credits: number;
}

interface TestAgent {
  id: string;
  userId: string;
  name: string;
  type: string;
  performance: {
    calls: number;
    successRate: number;
    avgDuration: number;
  };
}

interface TestDashboardData {
  kpis: {
    totalCalls: number;
    successRate: number;
    totalLeads: number;
    conversionRate: number;
  };
  recentActivity: Array<{
    id: string;
    type: string;
    timestamp: Date;
    description: string;
  }>;
}

async function runCacheIntegrationTests(): Promise<void> {
  logger.info('Starting MemoryCache integration tests...');

  try {
    // Test 1: Basic cache operations with realistic data
    await testBasicCacheOperations();

    // Test 2: Cache invalidation patterns
    await testCacheInvalidation();

    // Test 3: Performance under load
    await testCachePerformance();

    // Test 4: Memory management
    await testMemoryManagement();

    // Test 5: Cache monitoring
    await testCacheMonitoring();

    // Test 6: Pre-configured cache instances
    await testPreConfiguredCaches();

    logger.info('✅ All MemoryCache integration tests passed!');

  } catch (error) {
    logger.error('❌ MemoryCache integration tests failed:', error);
    process.exit(1);
  } finally {
    // Cleanup
    CacheManager.destroyAll();
    CacheMonitoringService.stopMonitoring();
  }
}

async function testBasicCacheOperations(): Promise<void> {
  logger.info('Testing basic cache operations...');

  const cache = new MemoryCache<TestDashboardData>({
    maxSize: 100,
    defaultTTL: 5000 // 5 seconds
  });

  // Create test data
  const userId = 'user-123';
  const dashboardData: TestDashboardData = {
    kpis: {
      totalCalls: 150,
      successRate: 85.5,
      totalLeads: 45,
      conversionRate: 12.3
    },
    recentActivity: [
      {
        id: 'activity-1',
        type: 'call_completed',
        timestamp: new Date(),
        description: 'Call completed successfully'
      },
      {
        id: 'activity-2',
        type: 'lead_generated',
        timestamp: new Date(),
        description: 'New lead generated'
      }
    ]
  };

  // Test set and get
  const key = CacheKeyGenerator.dashboard.overview(userId);
  cache.set(key, dashboardData);
  
  const retrieved = cache.get(key);
  if (!retrieved || retrieved.kpis.totalCalls !== 150) {
    throw new Error('Basic cache set/get failed');
  }

  // Test TTL expiration
  cache.set('temp-key', dashboardData, 100); // 100ms TTL
  await new Promise(resolve => setTimeout(resolve, 150));
  
  const expired = cache.get('temp-key');
  if (expired !== null) {
    throw new Error('TTL expiration test failed');
  }

  // Test cache statistics
  const stats = cache.getStatistics();
  if (stats.hits === 0 && stats.misses === 0) {
    throw new Error('Cache statistics not working');
  }

  cache.destroy();
  logger.info('✅ Basic cache operations test passed');
}

async function testCacheInvalidation(): Promise<void> {
  logger.info('Testing cache invalidation...');

  const userId = 'user-456';
  const agentId = 'agent-789';

  // Set up test data in different caches
  dashboardCache.set(CacheKeyGenerator.dashboard.overview(userId), { test: 'dashboard' });
  dashboardCache.set(CacheKeyGenerator.dashboard.kpis(userId), { test: 'kpis' });
  
  agentCache.set(CacheKeyGenerator.agent.list(userId), { test: 'agent-list' });
  agentCache.set(CacheKeyGenerator.agent.details(userId, agentId), { test: 'agent-details' });

  // Test user dashboard invalidation
  CacheInvalidationService.invalidateUserDashboard(userId);
  
  if (dashboardCache.get(CacheKeyGenerator.dashboard.overview(userId)) !== null) {
    throw new Error('Dashboard cache invalidation failed');
  }

  // Test agent invalidation
  CacheInvalidationService.invalidateAgent(userId, agentId);
  
  if (agentCache.get(CacheKeyGenerator.agent.details(userId, agentId)) !== null) {
    throw new Error('Agent cache invalidation failed');
  }

  // Test pattern invalidation
  agentCache.set('agent:user-456:test1', { test: 'data1' });
  agentCache.set('agent:user-456:test2', { test: 'data2' });
  agentCache.set('other:data', { test: 'other' });

  const invalidated = agentCache.invalidatePattern('agent:user-456');
  if (invalidated !== 2) {
    throw new Error(`Expected 2 invalidated entries, got ${invalidated}`);
  }

  logger.info('✅ Cache invalidation test passed');
}

async function testCachePerformance(): Promise<void> {
  logger.info('Testing cache performance under load...');

  const cache = new MemoryCache<string>({
    maxSize: 1000,
    defaultTTL: 60000
  });

  const startTime = Date.now();
  const operations = 10000;

  // Perform many cache operations
  for (let i = 0; i < operations; i++) {
    const key = `key-${i % 100}`; // Create some key overlap for realistic hit rates
    
    if (i % 3 === 0) {
      cache.set(key, `value-${i}`);
    } else {
      cache.get(key);
    }
  }

  const endTime = Date.now();
  const duration = endTime - startTime;
  const opsPerSecond = operations / (duration / 1000);

  logger.info(`Performance test: ${operations} operations in ${duration}ms (${opsPerSecond.toFixed(0)} ops/sec)`);

  const stats = cache.getStatistics();
  logger.info(`Cache stats: ${stats.hits} hits, ${stats.misses} misses, ${stats.hitRate.toFixed(1)}% hit rate`);

  if (opsPerSecond < 1000) {
    throw new Error(`Cache performance too slow: ${opsPerSecond} ops/sec`);
  }

  cache.destroy();
  logger.info('✅ Cache performance test passed');
}

async function testMemoryManagement(): Promise<void> {
  logger.info('Testing memory management...');

  const cache = new MemoryCache<string>({
    maxSize: 10,
    maxMemory: 1024, // 1KB limit
    defaultTTL: 60000
  });

  const initialMemory = cache.memoryUsage();
  
  // Add data until we hit limits
  let added = 0;
  for (let i = 0; i < 20; i++) {
    const success = cache.set(`key-${i}`, 'x'.repeat(100)); // ~200 bytes each
    if (success) added++;
  }

  const finalMemory = cache.memoryUsage();
  const finalSize = cache.size();

  logger.info(`Memory test: added ${added} entries, final size: ${finalSize}, memory: ${finalMemory} bytes`);

  // Should respect both size and memory limits
  if (finalSize > 10) {
    throw new Error(`Cache size exceeded limit: ${finalSize} > 10`);
  }

  if (finalMemory > 1024) {
    throw new Error(`Cache memory exceeded limit: ${finalMemory} > 1024`);
  }

  cache.destroy();
  logger.info('✅ Memory management test passed');
}

async function testCacheMonitoring(): Promise<void> {
  logger.info('Testing cache monitoring...');

  // Set up some cache data
  dashboardCache.set('test-key-1', { test: 'data1' });
  dashboardCache.set('test-key-2', { test: 'data2' });
  
  // Generate some cache activity
  for (let i = 0; i < 10; i++) {
    dashboardCache.get('test-key-1'); // hits
    dashboardCache.get('nonexistent'); // misses
  }

  // Test performance metrics
  const metrics = CacheMonitoringService.getPerformanceMetrics();
  if (metrics.totalCaches === 0) {
    throw new Error('Cache monitoring not detecting caches');
  }

  // Test health check
  const healthReport = CacheMonitoringService.performHealthCheck();
  if (healthReport.overall === 'critical') {
    throw new Error('Unexpected critical health status');
  }

  // Test Prometheus metrics export
  const prometheusMetrics = CacheMonitoringService.exportMetricsForPrometheus();
  if (!prometheusMetrics.includes('cache_hit_rate')) {
    throw new Error('Prometheus metrics export failed');
  }

  logger.info('✅ Cache monitoring test passed');
}

async function testPreConfiguredCaches(): Promise<void> {
  logger.info('Testing pre-configured cache instances...');

  // Test dashboard cache
  const dashboardKey = CacheKeyGenerator.dashboard.overview('test-user');
  dashboardCache.set(dashboardKey, { test: 'dashboard-data' });
  
  const dashboardData = dashboardCache.get(dashboardKey);
  if (!dashboardData || dashboardData.test !== 'dashboard-data') {
    throw new Error('Dashboard cache test failed');
  }

  // Test agent cache
  const agentKey = CacheKeyGenerator.agent.list('test-user');
  agentCache.set(agentKey, { test: 'agent-data' });
  
  const agentData = agentCache.get(agentKey);
  if (!agentData || agentData.test !== 'agent-data') {
    throw new Error('Agent cache test failed');
  }

  // Test performance cache
  const perfKey = CacheKeyGenerator.performance.userKpis('test-user');
  performanceCache.set(perfKey, { test: 'performance-data' });
  
  const perfData = performanceCache.get(perfKey);
  if (!perfData || perfData.test !== 'performance-data') {
    throw new Error('Performance cache test failed');
  }

  // Test cache manager
  const allStats = CacheManager.getAllStatistics();
  if (!allStats.dashboard || !allStats.agent || !allStats.performance) {
    throw new Error('Cache manager not tracking all caches');
  }

  logger.info('✅ Pre-configured caches test passed');
}

// Run the tests
if (require.main === module) {
  runCacheIntegrationTests().catch(error => {
    logger.error('Integration test failed:', error);
    process.exit(1);
  });
}

export { runCacheIntegrationTests };