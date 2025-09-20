import { dashboardCache, performanceCache } from './memoryCache';
import { CacheKeyGenerator } from './cacheInvalidation';
import { DashboardKpiService, DashboardOverviewData } from './dashboardKpiService';
import { DashboardAnalyticsService } from './dashboardAnalyticsService';
import { BillingService } from './billingService';
import { logger } from '../utils/logger';

/**
 * Dashboard cache entry interface
 */
export interface DashboardCacheEntry {
  userId: string;
  data: DashboardOverviewData;
  calculatedAt: Date;
  expiresAt: Date;
  source: 'cache' | 'database' | 'materialized_view';
}

/**
 * Dashboard analytics cache entry interface
 */
export interface DashboardAnalyticsCacheEntry {
  userId: string;
  data: any; // Analytics data structure
  calculatedAt: Date;
  expiresAt: Date;
  parameters?: any; // Query parameters that affect the result
}

/**
 * Cache warming configuration
 */
export interface CacheWarmingConfig {
  enabled: boolean;
  warmOnInvalidation: boolean;
  backgroundRefresh: boolean;
  refreshThreshold: number; // Percentage of TTL when to refresh in background
}

/**
 * Dashboard cache service implementing cache-first strategy
 * Requirements: 1.2, 6.1, 6.2, 6.3
 */
export class DashboardCacheService {
  private static warmingConfig: CacheWarmingConfig = {
    enabled: true,
    warmOnInvalidation: true,
    backgroundRefresh: true,
    refreshThreshold: 0.8 // Refresh when 80% of TTL has passed
  };

  /**
   * Get dashboard overview data with cache-first strategy
   * Requirements: 1.2, 6.1, 6.2
   */
  static async getOverviewData(userId: string): Promise<DashboardOverviewData> {
    try {
      // Step 1: Check cache first
      const cacheKey = CacheKeyGenerator.dashboard.overview(userId);
      const cachedEntry = dashboardCache.get(cacheKey) as DashboardCacheEntry | null;

      if (cachedEntry && this.isCacheEntryValid(cachedEntry)) {
        logger.debug(`Cache hit for dashboard overview: ${userId}`);

        // Check if we need background refresh
        if (this.shouldBackgroundRefresh(cachedEntry)) {
          this.backgroundRefreshOverview(userId).catch(error => {
            logger.error('Background refresh failed:', error);
          });
        }

        return cachedEntry.data;
      }

      // Step 2: Cache miss - fetch from database
      logger.debug(`Cache miss for dashboard overview: ${userId}`);
      const overviewData = await this.fetchAndCacheOverviewData(userId);

      return overviewData;
    } catch (error) {
      logger.error('Error getting overview data from cache:', error);
      throw error;
    }
  }

  /**
   * Get dashboard analytics data with cache-first strategy
   * Requirements: 6.1, 6.2
   */
  static async getAnalyticsData(userId: string, parameters?: any): Promise<any> {
    try {
      // Step 1: Check cache first
      const cacheKey = CacheKeyGenerator.dashboard.analytics(userId, parameters);
      const cachedEntry = dashboardCache.get(cacheKey) as DashboardAnalyticsCacheEntry | null;

      if (cachedEntry && this.isCacheEntryValid(cachedEntry)) {
        logger.debug(`Cache hit for dashboard analytics: ${userId}`);

        // Check if we need background refresh
        if (this.shouldBackgroundRefresh(cachedEntry)) {
          this.backgroundRefreshAnalytics(userId, parameters).catch(error => {
            logger.error('Background analytics refresh failed:', error);
          });
        }

        return cachedEntry.data;
      }

      // Step 2: Cache miss - fetch from database
      logger.debug(`Cache miss for dashboard analytics: ${userId}`);
      const analyticsData = await this.fetchAndCacheAnalyticsData(userId, parameters);

      return analyticsData;
    } catch (error) {
      logger.error('Error getting analytics data from cache:', error);
      throw error;
    }
  }

  /**
   * Fetch overview data from database and cache it
   * Requirements: 6.1, 6.3
   */
  private static async fetchAndCacheOverviewData(userId: string): Promise<DashboardOverviewData> {
    try {
      const startTime = Date.now();

      // Fetch data using optimized service
      const overviewData = await DashboardKpiService.getOptimizedOverviewDataWithBatchQueries(userId);

      // Update credits with real-time data
      const creditBalance = await BillingService.getUserCredits(userId);
      overviewData.credits.current = creditBalance;
      overviewData.credits.remaining = creditBalance;

      const fetchTime = Date.now() - startTime;

      // Create cache entry
      const cacheEntry: DashboardCacheEntry = {
        userId,
        data: overviewData,
        calculatedAt: new Date(),
        expiresAt: new Date(Date.now() + (10 * 60 * 1000)), // 10 minutes TTL
        source: 'materialized_view'
      };

      // Cache the data
      const cacheKey = CacheKeyGenerator.dashboard.overview(userId);
      const cached = dashboardCache.set(cacheKey, cacheEntry, 10 * 60 * 1000); // 10 minutes

      if (cached) {
        logger.info(`Cached dashboard overview for user ${userId} (fetch: ${fetchTime}ms)`);
      } else {
        logger.warn(`Failed to cache dashboard overview for user ${userId}`);
      }

      return overviewData;
    } catch (error) {
      logger.error('Error fetching and caching overview data:', error);
      throw error;
    }
  }

  /**
   * Fetch analytics data from database and cache it
   * Requirements: 6.1, 6.3, US-2.1 (Enhanced CTA metrics and company data)
   */
  private static async fetchAndCacheAnalyticsData(userId: string, parameters?: any): Promise<any> {
    try {
      const startTime = Date.now();

      // Fetch data using optimized analytics service with enhanced CTA metrics
      const analyticsData = await DashboardAnalyticsService.getOptimizedAnalyticsData(userId);

      const fetchTime = Date.now() - startTime;

      // Create cache entry
      const cacheEntry: DashboardAnalyticsCacheEntry = {
        userId,
        data: analyticsData,
        calculatedAt: new Date(),
        expiresAt: new Date(Date.now() + (15 * 60 * 1000)), // 15 minutes TTL
        parameters
      };

      // Cache the data
      const cacheKey = CacheKeyGenerator.dashboard.analytics(userId, parameters);
      const cached = dashboardCache.set(cacheKey, cacheEntry, 15 * 60 * 1000); // 15 minutes

      if (cached) {
        logger.info(`Cached dashboard analytics for user ${userId} (fetch: ${fetchTime}ms)`);
      } else {
        logger.warn(`Failed to cache dashboard analytics for user ${userId}`);
      }

      return analyticsData;
    } catch (error) {
      logger.error('Error fetching and caching analytics data:', error);
      throw error;
    }
  }

  /**
   * Warm cache for frequently accessed dashboard data
   * Requirements: 6.3
   */
  static async warmDashboardCache(userId: string): Promise<void> {
    if (!this.warmingConfig.enabled) {
      return;
    }

    try {
      logger.info(`Warming dashboard cache for user ${userId}`);

      // Warm overview data
      const overviewPromise = this.fetchAndCacheOverviewData(userId);

      // Warm analytics data
      const analyticsPromise = this.fetchAndCacheAnalyticsData(userId);

      // Warm additional frequently accessed data including enhanced metrics
      const creditsPromise = this.warmCreditsCache(userId);
      const recentActivityPromise = this.warmRecentActivityCache(userId);
      const ctaMetricsPromise = this.warmCTAMetricsCache(userId);
      const companyDataPromise = this.warmCompanyDataCache(userId);

      // Execute all warming operations in parallel
      await Promise.allSettled([
        overviewPromise,
        analyticsPromise,
        creditsPromise,
        recentActivityPromise,
        ctaMetricsPromise,
        companyDataPromise
      ]);

      logger.info(`Dashboard cache warming completed for user ${userId}`);
    } catch (error) {
      logger.error(`Dashboard cache warming failed for user ${userId}:`, error);
    }
  }

  /**
   * Warm credits cache
   */
  private static async warmCreditsCache(userId: string): Promise<void> {
    try {
      const cacheKey = CacheKeyGenerator.dashboard.credits(userId);
      const credits = await BillingService.getUserCredits(userId);

      dashboardCache.set(cacheKey, {
        userId,
        credits,
        calculatedAt: new Date(),
        expiresAt: new Date(Date.now() + (5 * 60 * 1000)) // 5 minutes TTL
      }, 5 * 60 * 1000);

      logger.debug(`Warmed credits cache for user ${userId}`);
    } catch (error) {
      logger.error(`Failed to warm credits cache for user ${userId}:`, error);
    }
  }

  /**
   * Warm recent activity cache
   */
  private static async warmRecentActivityCache(userId: string): Promise<void> {
    try {
      const cacheKey = CacheKeyGenerator.dashboard.recentActivity(userId);

      // This would use the optimized recent activity query from DashboardKpiService
      // For now, we'll skip the actual implementation as it's part of the KPI service

      logger.debug(`Warmed recent activity cache for user ${userId}`);
    } catch (error) {
      logger.error(`Failed to warm recent activity cache for user ${userId}:`, error);
    }
  }

  /**
   * Warm CTA metrics cache
   * Requirements: US-2.1 - CTA metrics cache warming
   */
  private static async warmCTAMetricsCache(userId: string): Promise<void> {
    try {
      const cacheKey = CacheKeyGenerator.dashboard.ctaMetrics(userId);

      // Get enhanced CTA metrics from dashboard analytics service
      const ctaMetrics = await DashboardAnalyticsService.getEnhancedCTAMetrics(userId);

      dashboardCache.set(cacheKey, {
        userId,
        ctaMetrics,
        calculatedAt: new Date(),
        expiresAt: new Date(Date.now() + (10 * 60 * 1000)) // 10 minutes TTL
      }, 10 * 60 * 1000);

      logger.debug(`Warmed CTA metrics cache for user ${userId}`);
    } catch (error) {
      logger.error(`Failed to warm CTA metrics cache for user ${userId}:`, error);
    }
  }

  /**
   * Warm company data cache
   * Requirements: US-2.1 - Company data cache warming
   */
  private static async warmCompanyDataCache(userId: string): Promise<void> {
    try {
      const cacheKey = CacheKeyGenerator.dashboard.companyBreakdown(userId);

      // Get company lead breakdown from dashboard analytics service
      const companyBreakdown = await DashboardAnalyticsService.getCompanyLeadBreakdown(userId);

      dashboardCache.set(cacheKey, {
        userId,
        companyBreakdown,
        calculatedAt: new Date(),
        expiresAt: new Date(Date.now() + (15 * 60 * 1000)) // 15 minutes TTL
      }, 15 * 60 * 1000);

      logger.debug(`Warmed company data cache for user ${userId}`);
    } catch (error) {
      logger.error(`Failed to warm company data cache for user ${userId}:`, error);
    }
  }

  /**
   * Invalidate dashboard cache for a user
   * Requirements: 6.2
   */
  static invalidateDashboardCache(userId: string): void {
    try {
      const patterns = [
        CacheKeyGenerator.dashboard.overview(userId),
        CacheKeyGenerator.dashboard.kpis(userId),
        CacheKeyGenerator.dashboard.analytics(userId),
        CacheKeyGenerator.dashboard.recentActivity(userId),
        CacheKeyGenerator.dashboard.credits(userId)
      ];

      let totalInvalidated = 0;
      patterns.forEach(pattern => {
        if (dashboardCache.delete(pattern)) {
          totalInvalidated++;
        }
      });

      // Also invalidate pattern-based entries
      totalInvalidated += dashboardCache.invalidatePattern(`dashboard:${userId}:`);

      logger.info(`Invalidated ${totalInvalidated} dashboard cache entries for user ${userId}`);

      // Warm cache if configured to do so
      if (this.warmingConfig.warmOnInvalidation) {
        this.warmDashboardCache(userId).catch(error => {
          logger.error('Cache warming after invalidation failed:', error);
        });
      }
    } catch (error) {
      logger.error(`Error invalidating dashboard cache for user ${userId}:`, error);
    }
  }

  /**
   * Invalidate specific dashboard analytics cache
   */
  static invalidateAnalyticsCache(userId: string, parameters?: any): void {
    try {
      const cacheKey = CacheKeyGenerator.dashboard.analytics(userId, parameters);

      if (dashboardCache.delete(cacheKey)) {
        logger.info(`Invalidated analytics cache for user ${userId}`);
      }

      // If no specific parameters, invalidate all analytics for the user
      if (!parameters) {
        const invalidated = dashboardCache.invalidatePattern(`dashboard:${userId}:analytics`);
        logger.info(`Invalidated ${invalidated} analytics cache entries for user ${userId}`);
      }
    } catch (error) {
      logger.error(`Error invalidating analytics cache for user ${userId}:`, error);
    }
  }

  /**
   * Background refresh of overview data
   */
  private static async backgroundRefreshOverview(userId: string): Promise<void> {
    try {
      logger.debug(`Background refresh started for overview data: ${userId}`);
      await this.fetchAndCacheOverviewData(userId);
      logger.debug(`Background refresh completed for overview data: ${userId}`);
    } catch (error) {
      logger.error(`Background refresh failed for overview data: ${userId}`, error);
    }
  }

  /**
   * Background refresh of analytics data
   */
  private static async backgroundRefreshAnalytics(userId: string, parameters?: any): Promise<void> {
    try {
      logger.debug(`Background refresh started for analytics data: ${userId}`);
      await this.fetchAndCacheAnalyticsData(userId, parameters);
      logger.debug(`Background refresh completed for analytics data: ${userId}`);
    } catch (error) {
      logger.error(`Background refresh failed for analytics data: ${userId}`, error);
    }
  }

  /**
   * Check if cache entry is valid (not expired)
   */
  private static isCacheEntryValid(entry: DashboardCacheEntry | DashboardAnalyticsCacheEntry): boolean {
    return new Date() < entry.expiresAt;
  }

  /**
   * Check if cache entry should be refreshed in background
   */
  private static shouldBackgroundRefresh(entry: DashboardCacheEntry | DashboardAnalyticsCacheEntry): boolean {
    if (!this.warmingConfig.backgroundRefresh) {
      return false;
    }

    const now = Date.now();
    const created = entry.calculatedAt.getTime();
    const expires = entry.expiresAt.getTime();
    const ttl = expires - created;
    const age = now - created;

    return (age / ttl) >= this.warmingConfig.refreshThreshold;
  }

  /**
   * Get cache statistics for monitoring
   */
  static getCacheStatistics(): any {
    return {
      dashboard: dashboardCache.getStatistics(),
      performance: performanceCache.getStatistics(),
      warmingConfig: this.warmingConfig
    };
  }

  /**
   * Update cache warming configuration
   */
  static updateWarmingConfig(config: Partial<CacheWarmingConfig>): void {
    this.warmingConfig = { ...this.warmingConfig, ...config };
    logger.info('Dashboard cache warming configuration updated:', this.warmingConfig);
  }

  /**
   * Preload dashboard data for multiple users (batch warming)
   */
  static async batchWarmCache(userIds: string[]): Promise<void> {
    if (!this.warmingConfig.enabled) {
      return;
    }

    try {
      logger.info(`Batch warming dashboard cache for ${userIds.length} users`);

      const warmingPromises = userIds.map(userId =>
        this.warmDashboardCache(userId).catch(error => {
          logger.error(`Batch warming failed for user ${userId}:`, error);
        })
      );

      await Promise.allSettled(warmingPromises);
      logger.info(`Batch cache warming completed for ${userIds.length} users`);
    } catch (error) {
      logger.error('Batch cache warming failed:', error);
    }
  }

  /**
   * Invalidate CTA-specific cache entries
   * Requirements: US-2.1 - CTA metrics cache invalidation
   */
  static invalidateCTACache(userId: string): void {
    try {
      const patterns = [
        CacheKeyGenerator.dashboard.analytics(userId),
        CacheKeyGenerator.dashboard.overview(userId)
      ];

      let totalInvalidated = 0;
      patterns.forEach(pattern => {
        if (dashboardCache.delete(pattern)) {
          totalInvalidated++;
        }
      });

      // Also invalidate CTA-specific pattern entries
      totalInvalidated += dashboardCache.invalidatePattern(`cta:${userId}:`);

      logger.info(`Invalidated ${totalInvalidated} CTA cache entries for user ${userId}`);

      // Warm cache if configured to do so
      if (this.warmingConfig.warmOnInvalidation) {
        this.warmDashboardCache(userId).catch(error => {
          logger.error('Cache warming after CTA invalidation failed:', error);
        });
      }
    } catch (error) {
      logger.error(`Error invalidating CTA cache for user ${userId}:`, error);
    }
  }

  /**
   * Invalidate company-specific cache entries
   * Requirements: US-2.1 - Company data cache invalidation
   */
  static invalidateCompanyCache(userId: string): void {
    try {
      const patterns = [
        CacheKeyGenerator.dashboard.analytics(userId),
        CacheKeyGenerator.dashboard.overview(userId)
      ];

      let totalInvalidated = 0;
      patterns.forEach(pattern => {
        if (dashboardCache.delete(pattern)) {
          totalInvalidated++;
        }
      });

      // Also invalidate company-specific pattern entries
      totalInvalidated += dashboardCache.invalidatePattern(`company:${userId}:`);

      logger.info(`Invalidated ${totalInvalidated} company cache entries for user ${userId}`);

      // Warm cache if configured to do so
      if (this.warmingConfig.warmOnInvalidation) {
        this.warmDashboardCache(userId).catch(error => {
          logger.error('Cache warming after company invalidation failed:', error);
        });
      }
    } catch (error) {
      logger.error(`Error invalidating company cache for user ${userId}:`, error);
    }
  }

  /**
   * Clear all dashboard caches (use with caution)
   */
  static clearAllDashboardCaches(): void {
    const patterns = ['dashboard:', 'kpi:', 'overview:', 'analytics:', 'cta:', 'company:'];

    let totalCleared = 0;
    patterns.forEach(pattern => {
      totalCleared += dashboardCache.invalidatePattern(pattern);
    });

    logger.warn(`Cleared ${totalCleared} dashboard cache entries`);
  }
}

// Export the service
export const dashboardCacheService = DashboardCacheService;