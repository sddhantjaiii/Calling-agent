import { dashboardCache, agentCache, performanceCache, CacheManager } from './memoryCache';
import { dashboardCacheService } from './dashboardCache';
import { agentCacheService } from './agentCache';
import { logger } from '../utils/logger';

/**
 * Background cache refresh configuration
 */
interface BackgroundRefreshConfig {
  enabled: boolean;
  refreshInterval: number; // Interval in milliseconds
  batchSize: number; // Number of entries to refresh per batch
  maxConcurrentRefresh: number; // Maximum concurrent refresh operations
  refreshThreshold: number; // Percentage of TTL when to refresh (0.8 = 80%)
}

/**
 * Cache warming strategy configuration
 */
interface CacheWarmingStrategy {
  enabled: boolean;
  warmOnStartup: boolean;
  warmOnInvalidation: boolean;
  criticalDataPatterns: string[]; // Patterns for critical data that should always be warm
  warmingSchedule?: {
    enabled: boolean;
    cronPattern: string; // Cron pattern for scheduled warming
    targetUsers?: string[]; // Specific users to warm, or empty for all active users
  };
}

/**
 * Cache invalidation service for managing cache consistency
 * across different data operations
 * Requirements: 6.2, 6.3, 6.5
 */
export class CacheInvalidationService {
  private static backgroundRefreshConfig: BackgroundRefreshConfig = {
    enabled: true,
    refreshInterval: 5 * 60 * 1000, // 5 minutes
    batchSize: 10,
    maxConcurrentRefresh: 3,
    refreshThreshold: 0.8 // Refresh when 80% of TTL has passed
  };

  private static warmingStrategy: CacheWarmingStrategy = {
    enabled: true,
    warmOnStartup: true,
    warmOnInvalidation: true,
    criticalDataPatterns: [
      'dashboard:*:overview',
      'dashboard:*:kpis',
      'agents:*:list',
      'performance:*:kpis'
    ],
    warmingSchedule: {
      enabled: true,
      cronPattern: '0 */30 * * * *', // Every 30 minutes
      targetUsers: [] // Empty means all active users
    }
  };

  private static backgroundRefreshTimer: any | null = null;
  private static isBackgroundRefreshRunning = false;
  private static activeRefreshOperations = new Set<string>();
  /**
   * Initialize the cache invalidation service
   * Requirements: 6.2, 6.3, 6.5
   */
  static async initialize(): Promise<void> {
    try {
      logger.info('Initializing Cache Invalidation Service');

      // Start background refresh if enabled
      if (this.backgroundRefreshConfig.enabled) {
        this.startBackgroundRefresh();
      }

      // Schedule automatic warming if enabled
      if (this.warmingStrategy.warmingSchedule?.enabled) {
        this.scheduleAutomaticWarming();
      }

      // Warm critical data on startup if enabled
      if (this.warmingStrategy.warmOnStartup) {
        // Don't await this to avoid blocking startup
        this.warmCriticalData().catch(error => {
          logger.error('Startup cache warming failed:', error);
        });
      }

      logger.info('Cache Invalidation Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Cache Invalidation Service:', error);
      throw error;
    }
  }

  /**
   * Shutdown the cache invalidation service gracefully
   */
  static async shutdown(): Promise<void> {
    try {
      logger.info('Shutting down Cache Invalidation Service');

      // Stop background refresh
      this.stopBackgroundRefresh();

      // Wait for active refresh operations to complete
      const maxWaitTime = 30000; // 30 seconds
      const startTime = Date.now();

      while (this.activeRefreshOperations.size > 0 && (Date.now() - startTime) < maxWaitTime) {
        logger.info(`Waiting for ${this.activeRefreshOperations.size} active refresh operations to complete...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (this.activeRefreshOperations.size > 0) {
        logger.warn(`Shutdown completed with ${this.activeRefreshOperations.size} operations still active`);
      }

      logger.info('Cache Invalidation Service shutdown completed');
    } catch (error) {
      logger.error('Error during Cache Invalidation Service shutdown:', error);
    }
  }

  /**
   * Health check for the cache invalidation service
   */
  static getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, any>;
  } {
    const details: Record<string, any> = {
      backgroundRefresh: {
        enabled: this.backgroundRefreshConfig.enabled,
        running: this.isBackgroundRefreshRunning,
        activeOperations: this.activeRefreshOperations.size,
        maxConcurrent: this.backgroundRefreshConfig.maxConcurrentRefresh
      },
      warming: {
        enabled: this.warmingStrategy.enabled,
        onStartup: this.warmingStrategy.warmOnStartup,
        onInvalidation: this.warmingStrategy.warmOnInvalidation,
        scheduled: this.warmingStrategy.warmingSchedule?.enabled || false
      },
      cacheStats: {
        dashboard: dashboardCache.size(),
        agent: agentCache.size(),
        performance: performanceCache.size()
      }
    };

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Check if background refresh should be running but isn't
    if (this.backgroundRefreshConfig.enabled && !this.isBackgroundRefreshRunning) {
      status = 'degraded';
      details.issues = details.issues || [];
      details.issues.push('Background refresh is enabled but not running');
    }

    // Check if too many operations are active
    if (this.activeRefreshOperations.size >= this.backgroundRefreshConfig.maxConcurrentRefresh) {
      status = 'degraded';
      details.issues = details.issues || [];
      details.issues.push('Maximum concurrent refresh operations reached');
    }

    return { status, details };
  }

  /**
   * Invalidate all dashboard-related caches for a user
   * Requirements: 6.2
   */
  static invalidateUserDashboard(userId: string): void {
    // Use the new dashboard cache service for structured invalidation
    dashboardCacheService.invalidateDashboardCache(userId);

    // Also invalidate legacy patterns for backward compatibility
    const patterns = [
      `dashboard:${userId}:`,
      `kpi:${userId}:`,
      `overview:${userId}:`,
      `analytics:${userId}:`
    ];

    let totalInvalidated = 0;
    patterns.forEach(pattern => {
      totalInvalidated += dashboardCache.invalidatePattern(pattern);
      totalInvalidated += performanceCache.invalidatePattern(pattern);
    });

    logger.info(`Invalidated ${totalInvalidated} legacy dashboard cache entries for user ${userId}`);
  }

  /**
   * Invalidate all agent-related caches for a user
   */
  static invalidateUserAgents(userId: string): void {
    // Use the new agent cache service for structured invalidation
    agentCacheService.clearUserAgentCaches(userId);

    // Also invalidate legacy patterns for backward compatibility
    const patterns = [
      `agent:${userId}:`,
      `agents:${userId}:`,
      `agent-performance:${userId}:`,
      `agent-config:${userId}:`
    ];

    let totalInvalidated = 0;
    patterns.forEach(pattern => {
      totalInvalidated += agentCache.invalidatePattern(pattern);
      totalInvalidated += performanceCache.invalidatePattern(pattern);
    });

    logger.info(`Invalidated ${totalInvalidated} legacy agent cache entries for user ${userId}`);
  }

  /**
   * Invalidate specific agent cache
   */
  static invalidateAgent(userId: string, agentId: string): void {
    // Use the new agent cache service for structured invalidation
    agentCacheService.invalidateAgentCache(userId, agentId);

    // Also invalidate legacy patterns for backward compatibility
    const patterns = [
      `agent:${userId}:${agentId}`,
      `agent-performance:${userId}:${agentId}`,
      `agent-config:${userId}:${agentId}`
    ];

    let totalInvalidated = 0;
    patterns.forEach(pattern => {
      totalInvalidated += agentCache.invalidatePattern(pattern);
      totalInvalidated += performanceCache.invalidatePattern(pattern);
    });

    // Also invalidate user's agent list cache
    agentCache.invalidatePattern(`agents:${userId}`);
    totalInvalidated++;

    logger.info(`Invalidated ${totalInvalidated} legacy cache entries for agent ${agentId} (user ${userId})`);
  }

  /**
   * Invalidate all caches for a user (dashboard + agents + performance)
   */
  static invalidateUser(userId: string): void {
    this.invalidateUserDashboard(userId);
    this.invalidateUserAgents(userId);
    
    // Also invalidate any user-specific performance caches
    performanceCache.invalidatePattern(`user:${userId}`);
    
    logger.info(`Invalidated all caches for user ${userId}`);
  }

  /**
   * Invalidate caches when call data changes
   */
  static invalidateCallData(userId: string, agentId?: string): void {
    // Invalidate dashboard caches (calls affect KPIs and analytics)
    this.invalidateUserDashboard(userId);
    
    // Invalidate agent performance if specific agent is provided
    if (agentId) {
      this.invalidateAgent(userId, agentId);
    } else {
      // Invalidate all agent performance for the user
      this.invalidateUserAgents(userId);
    }
    
    logger.info(`Invalidated call-related caches for user ${userId}${agentId ? `, agent ${agentId}` : ''}`);
  }

  /**
   * Invalidate caches when lead data changes
   * Requirements: US-2.1 - Enhanced for CTA metrics and company data
   */
  static invalidateLeadData(userId: string): void {
    // Lead data affects dashboard analytics and KPIs, including new CTA metrics
    this.invalidateUserDashboard(userId);
    
    // Also invalidate lead-specific performance caches
    performanceCache.invalidatePattern(`lead:${userId}`);
    
    // Invalidate CTA-specific caches
    performanceCache.invalidatePattern(`cta:${userId}`);
    
    // Invalidate company-specific caches
    performanceCache.invalidatePattern(`company:${userId}`);
    
    logger.info(`Invalidated lead-related caches for user ${userId} (including CTA and company data)`);
  }

  /**
   * Invalidate caches when agent configuration changes
   */
  static invalidateAgentConfig(userId: string, agentId: string): void {
    // Agent config changes affect agent list and specific agent data
    this.invalidateAgent(userId, agentId);
    
    // Also invalidate ElevenLabs config cache
    agentCache.invalidatePattern(`elevenlabs:${agentId}`);
    
    logger.info(`Invalidated agent config caches for agent ${agentId} (user ${userId})`);
  }

  /**
   * Invalidate caches when user credits change
   */
  static invalidateUserCredits(userId: string): void {
    // Credits affect dashboard overview
    dashboardCache.invalidatePattern(`overview:${userId}`);
    dashboardCache.invalidatePattern(`credits:${userId}`);
    
    logger.info(`Invalidated credit-related caches for user ${userId}`);
  }

  /**
   * Warm up critical caches for a user
   * Requirements: 6.3
   */
  static async warmUserCaches(userId: string): Promise<void> {
    try {
      logger.info(`Cache warming initiated for user ${userId}`);
      
      // Warm dashboard caches using the new dashboard cache service
      await dashboardCacheService.warmDashboardCache(userId);
      
      // Warm agent caches by triggering a batch fetch
      try {
        await agentCacheService.getBatchAgentPerformance(userId);
        logger.debug(`Agent caches warmed for user ${userId}`);
      } catch (error) {
        logger.error(`Failed to warm agent caches for user ${userId}:`, error);
      }
      
      logger.info(`Cache warming completed for user ${userId}`);
    } catch (error) {
      logger.error(`Failed to warm caches for user ${userId}:`, error);
    }
  }

  /**
   * Start background cache refresh for expired entries
   * Requirements: 6.3, 6.5
   */
  static startBackgroundRefresh(): void {
    if (this.isBackgroundRefreshRunning) {
      logger.warn('Background cache refresh is already running');
      return;
    }

    if (!this.backgroundRefreshConfig.enabled) {
      logger.info('Background cache refresh is disabled');
      return;
    }

    this.isBackgroundRefreshRunning = true;
    this.backgroundRefreshTimer = setInterval(
      () => this.performBackgroundRefresh(),
      this.backgroundRefreshConfig.refreshInterval
    );

    logger.info(`Background cache refresh started with ${this.backgroundRefreshConfig.refreshInterval}ms interval`);
  }

  /**
   * Stop background cache refresh
   */
  static stopBackgroundRefresh(): void {
    if (this.backgroundRefreshTimer) {
      clearInterval(this.backgroundRefreshTimer);
      this.backgroundRefreshTimer = null;
    }
    this.isBackgroundRefreshRunning = false;
    logger.info('Background cache refresh stopped');
  }

  /**
   * Perform background refresh of expired entries
   * Requirements: 6.3, 6.5
   */
  private static async performBackgroundRefresh(): Promise<void> {
    if (this.activeRefreshOperations.size >= this.backgroundRefreshConfig.maxConcurrentRefresh) {
      logger.debug('Skipping background refresh - max concurrent operations reached');
      return;
    }

    try {
      logger.debug('Starting background cache refresh cycle');

      // Get entries that need refresh from all caches
      const refreshCandidates = this.identifyRefreshCandidates();

      if (refreshCandidates.length === 0) {
        logger.debug('No cache entries need background refresh');
        return;
      }

      // Process in batches to avoid overwhelming the system
      const batches = this.chunkArray(refreshCandidates, this.backgroundRefreshConfig.batchSize);

      for (const batch of batches) {
        if (this.activeRefreshOperations.size >= this.backgroundRefreshConfig.maxConcurrentRefresh) {
          break;
        }

        // Process batch concurrently but with limits
        const batchPromises = batch.map(candidate => this.refreshCacheEntry(candidate));
        await Promise.allSettled(batchPromises);
      }

      logger.debug(`Background cache refresh completed - processed ${refreshCandidates.length} candidates`);
    } catch (error) {
      logger.error('Error during background cache refresh:', error);
    }
  }

  /**
   * Identify cache entries that need background refresh
   */
  private static identifyRefreshCandidates(): Array<{
    cacheType: 'dashboard' | 'agent' | 'performance';
    key: string;
    userId: string;
    priority: number;
  }> {
    const candidates: Array<{
      cacheType: 'dashboard' | 'agent' | 'performance';
      key: string;
      userId: string;
      priority: number;
    }> = [];

    // Check dashboard cache entries
    const dashboardKeys = dashboardCache.keys();
    for (const key of dashboardKeys) {
      const metadata = dashboardCache.getEntryMetadata(key);
      if (metadata && this.shouldRefreshEntry(metadata)) {
        const userId = this.extractUserIdFromKey(key);
        const priority = this.calculateRefreshPriority(key, metadata);
        if (userId) {
          candidates.push({
            cacheType: 'dashboard',
            key,
            userId,
            priority
          });
        }
      }
    }

    // Check agent cache entries
    const agentKeys = agentCache.keys();
    for (const key of agentKeys) {
      const metadata = agentCache.getEntryMetadata(key);
      if (metadata && this.shouldRefreshEntry(metadata)) {
        const userId = this.extractUserIdFromKey(key);
        const priority = this.calculateRefreshPriority(key, metadata);
        if (userId) {
          candidates.push({
            cacheType: 'agent',
            key,
            userId,
            priority
          });
        }
      }
    }

    // Check performance cache entries
    const performanceKeys = performanceCache.keys();
    for (const key of performanceKeys) {
      const metadata = performanceCache.getEntryMetadata(key);
      if (metadata && this.shouldRefreshEntry(metadata)) {
        const userId = this.extractUserIdFromKey(key);
        const priority = this.calculateRefreshPriority(key, metadata);
        if (userId) {
          candidates.push({
            cacheType: 'performance',
            key,
            userId,
            priority
          });
        }
      }
    }

    // Sort by priority (higher priority first)
    return candidates.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Check if cache entry should be refreshed in background
   */
  private static shouldRefreshEntry(metadata: any): boolean {
    const now = Date.now();
    const created = metadata.createdAt;
    const ttl = metadata.ttl;
    const age = now - created;

    // Refresh if entry has reached the refresh threshold
    return (age / ttl) >= this.backgroundRefreshConfig.refreshThreshold;
  }

  /**
   * Calculate refresh priority for cache entry
   */
  private static calculateRefreshPriority(key: string, metadata: any): number {
    let priority = 1;

    // Higher priority for critical data patterns
    for (const pattern of this.warmingStrategy.criticalDataPatterns) {
      const regex = new RegExp(pattern.replace('*', '.*'));
      if (regex.test(key)) {
        priority += 10;
        break;
      }
    }

    // Higher priority for frequently accessed entries
    if (metadata.accessCount > 10) {
      priority += 5;
    }

    // Higher priority for recently accessed entries
    const timeSinceLastAccess = Date.now() - metadata.lastAccessed;
    if (timeSinceLastAccess < 10 * 60 * 1000) { // Last 10 minutes
      priority += 3;
    }

    return priority;
  }

  /**
   * Refresh individual cache entry
   */
  private static async refreshCacheEntry(candidate: {
    cacheType: 'dashboard' | 'agent' | 'performance';
    key: string;
    userId: string;
    priority: number;
  }): Promise<void> {
    const operationId = `${candidate.cacheType}:${candidate.key}`;

    if (this.activeRefreshOperations.has(operationId)) {
      return; // Already being refreshed
    }

    this.activeRefreshOperations.add(operationId);

    try {
      logger.debug(`Background refreshing cache entry: ${candidate.key}`);

      switch (candidate.cacheType) {
        case 'dashboard':
          await this.refreshDashboardEntry(candidate.key, candidate.userId);
          break;
        case 'agent':
          await this.refreshAgentEntry(candidate.key, candidate.userId);
          break;
        case 'performance':
          await this.refreshPerformanceEntry(candidate.key, candidate.userId);
          break;
      }

      logger.debug(`Successfully refreshed cache entry: ${candidate.key}`);
    } catch (error) {
      logger.error(`Failed to refresh cache entry ${candidate.key}:`, error);
    } finally {
      this.activeRefreshOperations.delete(operationId);
    }
  }

  /**
   * Refresh dashboard cache entry
   */
  private static async refreshDashboardEntry(key: string, userId: string): Promise<void> {
    if (key.includes(':overview')) {
      await dashboardCacheService.getOverviewData(userId);
    } else if (key.includes(':analytics')) {
      await dashboardCacheService.getAnalyticsData(userId);
    } else if (key.includes(':kpis')) {
      // Refresh KPI data through overview
      await dashboardCacheService.getOverviewData(userId);
    }
  }

  /**
   * Refresh agent cache entry
   */
  private static async refreshAgentEntry(key: string, userId: string): Promise<void> {
    if (key.includes(':batch-performance')) {
      await agentCacheService.getBatchAgentPerformance(userId);
    } else if (key.includes(':performance')) {
      const agentId = this.extractAgentIdFromKey(key);
      if (agentId) {
        await agentCacheService.getAgentPerformance(userId, agentId);
      }
    }
  }

  /**
   * Refresh performance cache entry
   */
  private static async refreshPerformanceEntry(key: string, userId: string): Promise<void> {
    // Performance entries are typically refreshed through their parent services
    if (key.includes(':kpis')) {
      await dashboardCacheService.getOverviewData(userId);
    } else if (key.includes(':stats')) {
      const agentId = this.extractAgentIdFromKey(key);
      if (agentId) {
        await agentCacheService.cacheAgentStatistics(userId, agentId);
      }
    }
  }

  /**
   * Implement cache warming strategies for critical data
   * Requirements: 6.3, 6.5
   */
  static async warmCriticalData(userIds?: string[]): Promise<void> {
    if (!this.warmingStrategy.enabled) {
      logger.info('Cache warming is disabled');
      return;
    }

    try {
      const targetUsers = userIds || await this.getActiveUsers();
      
      if (targetUsers.length === 0) {
        logger.info('No users found for cache warming');
        return;
      }

      logger.info(`Starting cache warming for ${targetUsers.length} users`);

      // Warm critical data in parallel with concurrency limits
      const warmingPromises = targetUsers.map(userId => this.warmUserCriticalData(userId));
      
      // Process in batches to avoid overwhelming the system
      const batches = this.chunkArray(warmingPromises, 5); // 5 users at a time
      
      for (const batch of batches) {
        await Promise.allSettled(batch);
      }

      logger.info(`Cache warming completed for ${targetUsers.length} users`);
    } catch (error) {
      logger.error('Error during cache warming:', error);
    }
  }

  /**
   * Warm critical data for a specific user
   */
  private static async warmUserCriticalData(userId: string): Promise<void> {
    try {
      logger.debug(`Warming critical data for user ${userId}`);

      // Warm dashboard data (highest priority)
      await dashboardCacheService.warmDashboardCache(userId);

      // Warm agent data
      await agentCacheService.getBatchAgentPerformance(userId);

      logger.debug(`Critical data warming completed for user ${userId}`);
    } catch (error) {
      logger.error(`Failed to warm critical data for user ${userId}:`, error);
    }
  }

  /**
   * Schedule automatic cache warming
   * Requirements: 6.3
   */
  static scheduleAutomaticWarming(): void {
    if (!this.warmingStrategy.warmingSchedule?.enabled) {
      logger.info('Scheduled cache warming is disabled');
      return;
    }

    // For now, implement a simple interval-based warming
    // In production, you might want to use a proper cron library
    const warmingInterval = 30 * 60 * 1000; // 30 minutes

    setInterval(async () => {
      try {
        logger.info('Starting scheduled cache warming');
        await this.warmCriticalData(this.warmingStrategy.warmingSchedule?.targetUsers);
      } catch (error) {
        logger.error('Scheduled cache warming failed:', error);
      }
    }, warmingInterval);

    logger.info(`Scheduled cache warming enabled with ${warmingInterval}ms interval`);
  }

  /**
   * Get active users for cache warming
   */
  private static async getActiveUsers(): Promise<string[]> {
    try {
      // This would typically query the database for active users
      // For now, we'll extract user IDs from existing cache keys
      const userIds = new Set<string>();

      // Extract from dashboard cache keys
      const dashboardKeys = dashboardCache.keys();
      for (const key of dashboardKeys) {
        const userId = this.extractUserIdFromKey(key);
        if (userId) {
          userIds.add(userId);
        }
      }

      // Extract from agent cache keys
      const agentKeys = agentCache.keys();
      for (const key of agentKeys) {
        const userId = this.extractUserIdFromKey(key);
        if (userId) {
          userIds.add(userId);
        }
      }

      return Array.from(userIds);
    } catch (error) {
      logger.error('Error getting active users:', error);
      return [];
    }
  }

  /**
   * Extract user ID from cache key
   */
  private static extractUserIdFromKey(key: string): string | null {
    // Handle different key patterns
    const patterns = [
      /dashboard:([^:]+):/,
      /agent:([^:]+):/,
      /agents:([^:]+):/,
      /performance:([^:]+):/,
      /kpi:([^:]+):/,
      /overview:([^:]+):/,
      /analytics:([^:]+):/
    ];

    for (const pattern of patterns) {
      const match = key.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Extract agent ID from cache key
   */
  private static extractAgentIdFromKey(key: string): string | null {
    const match = key.match(/agent:([^:]+):([^:]+):/);
    return match ? match[2] : null;
  }

  /**
   * Utility function to chunk array into smaller arrays
   */
  private static chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Get cache invalidation statistics
   */
  static getCacheInvalidationStats(): Record<string, any> {
    return {
      dashboardCache: dashboardCache.getStatistics(),
      agentCache: agentCache.getStatistics(),
      performanceCache: performanceCache.getStatistics(),
      allCaches: CacheManager.getAllStatistics(),
      agentCacheService: agentCacheService.getCacheStatistics(),
      dashboardCacheService: dashboardCacheService.getCacheStatistics(),
      backgroundRefresh: {
        enabled: this.backgroundRefreshConfig.enabled,
        isRunning: this.isBackgroundRefreshRunning,
        activeOperations: this.activeRefreshOperations.size,
        config: this.backgroundRefreshConfig
      },
      warming: {
        enabled: this.warmingStrategy.enabled,
        config: this.warmingStrategy
      }
    };
  }

  /**
   * Update background refresh configuration
   * Requirements: 6.5
   */
  static updateBackgroundRefreshConfig(config: Partial<BackgroundRefreshConfig>): void {
    const oldConfig = { ...this.backgroundRefreshConfig };
    this.backgroundRefreshConfig = { ...this.backgroundRefreshConfig, ...config };

    logger.info('Background refresh configuration updated:', {
      old: oldConfig,
      new: this.backgroundRefreshConfig
    });

    // Restart background refresh if it was running and interval changed
    if (this.isBackgroundRefreshRunning && config.refreshInterval) {
      this.stopBackgroundRefresh();
      this.startBackgroundRefresh();
    }
  }

  /**
   * Update cache warming strategy configuration
   * Requirements: 6.3, 6.5
   */
  static updateWarmingStrategy(strategy: Partial<CacheWarmingStrategy>): void {
    const oldStrategy = { ...this.warmingStrategy };
    this.warmingStrategy = { ...this.warmingStrategy, ...strategy };

    logger.info('Cache warming strategy updated:', {
      old: oldStrategy,
      new: this.warmingStrategy
    });
  }

  /**
   * Handle cache invalidation with proper error handling and retry logic
   * Requirements: 6.2
   */
  static async invalidateWithRetry(
    operation: () => void,
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        operation();
        return; // Success
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Cache invalidation attempt ${attempt} failed:`, error);

        if (attempt < maxRetries) {
          // Wait before retry with exponential backoff
          const delay = retryDelay * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    logger.error(`Cache invalidation failed after ${maxRetries} attempts:`, lastError);
    throw lastError;
  }

  /**
   * Bulk invalidate multiple cache patterns with error handling
   * Requirements: 6.2
   */
  static async bulkInvalidate(patterns: string[], continueOnError: boolean = true): Promise<{
    successful: string[];
    failed: Array<{ pattern: string; error: string }>;
  }> {
    const results = {
      successful: [] as string[],
      failed: [] as Array<{ pattern: string; error: string }>
    };

    for (const pattern of patterns) {
      try {
        await this.invalidateWithRetry(() => {
          dashboardCache.invalidatePattern(pattern);
          agentCache.invalidatePattern(pattern);
          performanceCache.invalidatePattern(pattern);
        });

        results.successful.push(pattern);
        logger.debug(`Successfully invalidated pattern: ${pattern}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.failed.push({ pattern, error: errorMessage });
        logger.error(`Failed to invalidate pattern ${pattern}:`, error);

        if (!continueOnError) {
          break;
        }
      }
    }

    logger.info(`Bulk invalidation completed: ${results.successful.length} successful, ${results.failed.length} failed`);
    return results;
  }

  /**
   * Emergency cache clear with safety checks
   * Requirements: 6.2
   */
  static emergencyCacheClear(reason: string, confirmationToken?: string): boolean {
    // Safety check - require confirmation token for emergency clear
    const expectedToken = process.env.CACHE_EMERGENCY_TOKEN || 'emergency-clear-confirm';
    
    if (confirmationToken !== expectedToken) {
      logger.error('Emergency cache clear attempted without valid confirmation token');
      return false;
    }

    try {
      // Stop background operations first
      this.stopBackgroundRefresh();

      // Clear all caches
      CacheManager.clearAll();

      // Log the emergency clear
      logger.warn('EMERGENCY CACHE CLEAR EXECUTED', {
        reason,
        timestamp: new Date().toISOString(),
        clearedBy: 'CacheInvalidationService'
      });

      // Restart background refresh
      this.startBackgroundRefresh();

      return true;
    } catch (error) {
      logger.error('Emergency cache clear failed:', error);
      return false;
    }
  }

  /**
   * Clear all caches (use with caution)
   */
  static clearAllCaches(): void {
    CacheManager.clearAll();
    logger.warn('All caches have been cleared');
  }

  /**
   * Invalidate caches based on database trigger events
   */
  static handleDatabaseTrigger(table: string, operation: string, userId: string, recordId?: string): void {
    switch (table) {
      case 'calls':
        this.invalidateCallData(userId, recordId);
        break;
        
      case 'lead_analytics':
        this.invalidateLeadData(userId);
        break;
        
      case 'agents':
        if (recordId) {
          this.invalidateAgentConfig(userId, recordId);
        } else {
          this.invalidateUserAgents(userId);
        }
        break;
        
      case 'users':
        if (operation === 'UPDATE') {
          this.invalidateUserCredits(userId);
        }
        break;
        
      case 'agent_analytics':
        this.invalidateUserDashboard(userId);
        if (recordId) {
          this.invalidateAgent(userId, recordId);
        }
        break;
        
      default:
        logger.debug(`No cache invalidation rule for table: ${table}`);
    }
  }
}

/**
 * Cache key generators for consistent key naming
 */
export class CacheKeyGenerator {
  /**
   * Generate dashboard cache keys
   */
  static dashboard = {
    overview: (userId: string) => `dashboard:${userId}:overview`,
    kpis: (userId: string) => `dashboard:${userId}:kpis`,
    analytics: (userId: string, params?: any) => {
      const baseKey = `dashboard:${userId}:analytics`;
      return params ? `${baseKey}:${Buffer.from(JSON.stringify(params)).toString('base64')}` : baseKey;
    },
    recentActivity: (userId: string, limit: number = 5) => `dashboard:${userId}:activity:${limit}`,
    credits: (userId: string) => `dashboard:${userId}:credits`,
    // Enhanced CTA and company cache keys (US-2.1)
    ctaMetrics: (userId: string) => `cta:${userId}:metrics`,
    companyBreakdown: (userId: string) => `company:${userId}:breakdown`
  };

  /**
   * Generate agent cache keys
   */
  static agent = {
    list: (userId: string) => `agents:${userId}:list`,
    details: (userId: string, agentId: string) => `agent:${userId}:${agentId}:details`,
    performance: (userId: string, agentId: string) => `agent:${userId}:${agentId}:performance`,
    config: (userId: string, agentId: string) => `agent:${userId}:${agentId}:config`,
    elevenLabsConfig: (userId: string, agentId: string) => `elevenlabs:${userId}:${agentId}:config`,
    batchPerformance: (userId: string) => `agents:${userId}:batch-performance`
  };

  /**
   * Generate performance cache keys
   */
  static performance = {
    userKpis: (userId: string) => `performance:${userId}:kpis`,
    agentStats: (userId: string, agentId: string) => `performance:${userId}:${agentId}:stats`,
    leadMetrics: (userId: string) => `performance:${userId}:leads`,
    callMetrics: (userId: string) => `performance:${userId}:calls`,
    // Enhanced CTA and company performance keys (US-2.1)
    ctaPerformance: (userId: string) => `performance:${userId}:cta`,
    companyPerformance: (userId: string) => `performance:${userId}:company`
  };
}

// Export singleton instance
export const cacheInvalidation = CacheInvalidationService;