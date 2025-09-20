import { CacheManager, dashboardCache, agentCache, performanceCache } from './memoryCache';
import { logger } from '../utils/logger';

/**
 * Cache performance monitoring and alerting service
 */
export class CacheMonitoringService {
  private static alertThresholds = {
    lowHitRate: 70, // Alert if hit rate falls below 70%
    highMemoryUsage: 80, // Alert if memory usage exceeds 80% of limit
    highEvictionRate: 10, // Alert if eviction rate exceeds 10% of total operations
    slowAverageAccessTime: 10 // Alert if average access time exceeds 10ms
  };

  private static monitoringInterval: any | null = null;
  private static isMonitoring = false;

  /**
   * Start continuous cache monitoring
   */
  static startMonitoring(intervalMs: number = 60000): void {
    if (this.isMonitoring) {
      logger.warn('Cache monitoring is already running');
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
    }, intervalMs);

    logger.info(`Cache monitoring started with ${intervalMs}ms interval`);
  }

  /**
   * Stop cache monitoring
   */
  static stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    logger.info('Cache monitoring stopped');
  }

  /**
   * Perform comprehensive cache health check
   */
  static performHealthCheck(): CacheHealthReport {
    const report: CacheHealthReport = {
      timestamp: new Date(),
      overall: 'healthy',
      caches: {},
      alerts: [],
      recommendations: []
    };

    // Check all cache instances
    const allStats = CacheManager.getAllStatistics();
    
    for (const [cacheName, stats] of Object.entries(allStats)) {
      const cacheHealth = this.analyzeCacheHealth(cacheName, stats);
      report.caches[cacheName] = cacheHealth;

      // Collect alerts
      report.alerts.push(...cacheHealth.alerts);

      // Update overall health
      if (cacheHealth.status === 'critical') {
        report.overall = 'critical';
      } else if (cacheHealth.status === 'warning' && report.overall === 'healthy') {
        report.overall = 'warning';
      }
    }

    // Generate recommendations
    report.recommendations = this.generateRecommendations(report);

    // Log alerts if any
    if (report.alerts.length > 0) {
      logger.warn(`Cache health check found ${report.alerts.length} alerts`, {
        alerts: report.alerts.map(a => a.message)
      });
    }

    return report;
  }

  /**
   * Analyze individual cache health
   */
  private static analyzeCacheHealth(cacheName: string, stats: any): CacheHealth {
    const health: CacheHealth = {
      cacheName,
      status: 'healthy',
      metrics: {
        hitRate: stats.hitRate,
        memoryUsage: stats.totalSize,
        entries: stats.entries,
        averageAccessTime: stats.averageAccessTime || 0,
        evictionRate: this.calculateEvictionRate(stats)
      },
      alerts: []
    };

    // Check hit rate
    if (stats.hitRate < this.alertThresholds.lowHitRate) {
      health.status = 'warning';
      health.alerts.push({
        type: 'low_hit_rate',
        severity: 'warning',
        message: `${cacheName} cache hit rate is ${stats.hitRate.toFixed(1)}% (threshold: ${this.alertThresholds.lowHitRate}%)`,
        metric: 'hitRate',
        value: stats.hitRate,
        threshold: this.alertThresholds.lowHitRate
      });
    }

    // Check memory usage (if we can determine the limit)
    const memoryLimit = this.getCacheMemoryLimit(cacheName);
    if (memoryLimit && stats.totalSize > (memoryLimit * this.alertThresholds.highMemoryUsage / 100)) {
      health.status = 'critical';
      health.alerts.push({
        type: 'high_memory_usage',
        severity: 'critical',
        message: `${cacheName} cache memory usage is ${(stats.totalSize / memoryLimit * 100).toFixed(1)}% (threshold: ${this.alertThresholds.highMemoryUsage}%)`,
        metric: 'memoryUsage',
        value: stats.totalSize,
        threshold: memoryLimit * this.alertThresholds.highMemoryUsage / 100
      });
    }

    // Check eviction rate
    const evictionRate = this.calculateEvictionRate(stats);
    if (evictionRate > this.alertThresholds.highEvictionRate) {
      health.status = 'warning';
      health.alerts.push({
        type: 'high_eviction_rate',
        severity: 'warning',
        message: `${cacheName} cache eviction rate is ${evictionRate.toFixed(1)}% (threshold: ${this.alertThresholds.highEvictionRate}%)`,
        metric: 'evictionRate',
        value: evictionRate,
        threshold: this.alertThresholds.highEvictionRate
      });
    }

    // Check average access time
    if (stats.averageAccessTime > this.alertThresholds.slowAverageAccessTime) {
      health.status = 'warning';
      health.alerts.push({
        type: 'slow_access_time',
        severity: 'warning',
        message: `${cacheName} cache average access time is ${stats.averageAccessTime.toFixed(2)}ms (threshold: ${this.alertThresholds.slowAverageAccessTime}ms)`,
        metric: 'averageAccessTime',
        value: stats.averageAccessTime,
        threshold: this.alertThresholds.slowAverageAccessTime
      });
    }

    return health;
  }

  /**
   * Calculate eviction rate as percentage of total operations
   */
  private static calculateEvictionRate(stats: any): number {
    const totalOperations = stats.hits + stats.misses + stats.sets + stats.deletes;
    return totalOperations > 0 ? (stats.evictions / totalOperations) * 100 : 0;
  }

  /**
   * Get cache memory limit for specific cache
   */
  private static getCacheMemoryLimit(cacheName: string): number | null {
    // These would typically be configured values
    const limits: Record<string, number> = {
      dashboard: 50 * 1024 * 1024, // 50MB
      agent: 30 * 1024 * 1024, // 30MB
      performance: 20 * 1024 * 1024 // 20MB
    };
    return limits[cacheName] || null;
  }

  /**
   * Generate optimization recommendations
   */
  private static generateRecommendations(report: CacheHealthReport): string[] {
    const recommendations: string[] = [];

    // Analyze patterns across all caches
    const allCaches = Object.values(report.caches);
    const avgHitRate = allCaches.reduce((sum, cache) => sum + cache.metrics.hitRate, 0) / allCaches.length;
    const totalEvictions = allCaches.reduce((sum, cache) => sum + (cache.alerts.filter(a => a.type === 'high_eviction_rate').length), 0);

    if (avgHitRate < 60) {
      recommendations.push('Consider reviewing cache TTL settings - low hit rates may indicate data is expiring too quickly');
    }

    if (totalEvictions > 0) {
      recommendations.push('High eviction rates detected - consider increasing cache size limits or optimizing data size');
    }

    // Cache-specific recommendations
    for (const cache of allCaches) {
      if (cache.alerts.some(a => a.type === 'low_hit_rate')) {
        recommendations.push(`${cache.cacheName}: Consider implementing cache warming strategies for frequently accessed data`);
      }

      if (cache.alerts.some(a => a.type === 'high_memory_usage')) {
        recommendations.push(`${cache.cacheName}: Consider implementing data compression or reducing cached object size`);
      }

      if (cache.alerts.some(a => a.type === 'slow_access_time')) {
        recommendations.push(`${cache.cacheName}: Consider optimizing cache key structure or reducing serialization overhead`);
      }
    }

    return recommendations;
  }

  /**
   * Get cache performance metrics for monitoring dashboard
   */
  static getPerformanceMetrics(): CachePerformanceMetrics {
    const allStats = CacheManager.getAllStatistics();
    
    const metrics: CachePerformanceMetrics = {
      timestamp: new Date(),
      totalCaches: Object.keys(allStats).length,
      totalEntries: 0,
      totalMemoryUsage: 0,
      averageHitRate: 0,
      totalHits: 0,
      totalMisses: 0,
      totalEvictions: 0,
      cacheBreakdown: {}
    };

    let totalHitRate = 0;
    let cacheCount = 0;

    for (const [cacheName, stats] of Object.entries(allStats)) {
      metrics.totalEntries += stats.entries;
      metrics.totalMemoryUsage += stats.totalSize;
      metrics.totalHits += stats.hits;
      metrics.totalMisses += stats.misses;
      metrics.totalEvictions += stats.evictions;
      
      totalHitRate += stats.hitRate;
      cacheCount++;

      metrics.cacheBreakdown[cacheName] = {
        entries: stats.entries,
        memoryUsage: stats.totalSize,
        hitRate: stats.hitRate,
        hits: stats.hits,
        misses: stats.misses,
        evictions: stats.evictions
      };
    }

    metrics.averageHitRate = cacheCount > 0 ? totalHitRate / cacheCount : 0;

    return metrics;
  }

  /**
   * Export cache statistics for external monitoring systems
   */
  static exportMetricsForPrometheus(): string {
    const allStats = CacheManager.getAllStatistics();
    let metrics = '';

    for (const [cacheName, stats] of Object.entries(allStats)) {
      metrics += `cache_hit_rate{cache="${cacheName}"} ${stats.hitRate}\n`;
      metrics += `cache_entries{cache="${cacheName}"} ${stats.entries}\n`;
      metrics += `cache_memory_usage{cache="${cacheName}"} ${stats.totalSize}\n`;
      metrics += `cache_hits_total{cache="${cacheName}"} ${stats.hits}\n`;
      metrics += `cache_misses_total{cache="${cacheName}"} ${stats.misses}\n`;
      metrics += `cache_evictions_total{cache="${cacheName}"} ${stats.evictions}\n`;
      
      if (stats.averageAccessTime) {
        metrics += `cache_average_access_time{cache="${cacheName}"} ${stats.averageAccessTime}\n`;
      }
    }

    return metrics;
  }

  /**
   * Reset cache statistics (for testing or maintenance)
   */
  static resetStatistics(): void {
    // This would require adding a reset method to the MemoryCache class
    logger.info('Cache statistics reset requested');
  }
}

// Type definitions for monitoring
interface CacheHealthReport {
  timestamp: Date;
  overall: 'healthy' | 'warning' | 'critical';
  caches: Record<string, CacheHealth>;
  alerts: CacheAlert[];
  recommendations: string[];
}

interface CacheHealth {
  cacheName: string;
  status: 'healthy' | 'warning' | 'critical';
  metrics: {
    hitRate: number;
    memoryUsage: number;
    entries: number;
    averageAccessTime: number;
    evictionRate: number;
  };
  alerts: CacheAlert[];
}

interface CacheAlert {
  type: 'low_hit_rate' | 'high_memory_usage' | 'high_eviction_rate' | 'slow_access_time';
  severity: 'warning' | 'critical';
  message: string;
  metric: string;
  value: number;
  threshold: number;
}

interface CachePerformanceMetrics {
  timestamp: Date;
  totalCaches: number;
  totalEntries: number;
  totalMemoryUsage: number;
  averageHitRate: number;
  totalHits: number;
  totalMisses: number;
  totalEvictions: number;
  cacheBreakdown: Record<string, {
    entries: number;
    memoryUsage: number;
    hitRate: number;
    hits: number;
    misses: number;
    evictions: number;
  }>;
}

// Export types for use in other modules
export type { CacheHealthReport, CacheHealth, CacheAlert, CachePerformanceMetrics };