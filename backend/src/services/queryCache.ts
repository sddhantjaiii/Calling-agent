import { logger } from '../utils/logger';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface CacheStats {
  hits: number;
  misses: number;
  entries: number;
  hitRate: number;
}

/**
 * Simple in-memory query result cache for dashboard optimization
 * Implements LRU eviction policy and TTL expiration
 */
export class QueryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private accessOrder = new Map<string, number>(); // Track access order for LRU
  private maxSize: number;
  private defaultTTL: number;
  private stats = { hits: 0, misses: 0 };
  private accessCounter = 0;

  constructor(maxSize: number = 1000, defaultTTL: number = 15 * 60 * 1000) { // 15 minutes default TTL
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    
    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanupExpired(), 5 * 60 * 1000);
  }

  /**
   * Get cached result for a query
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access order for LRU
    this.accessOrder.set(key, ++this.accessCounter);
    this.stats.hits++;
    
    return entry.data as T;
  }

  /**
   * Set cached result for a query
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const actualTTL = ttl || this.defaultTTL;
    
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictOldest();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: actualTTL
    };

    this.cache.set(key, entry);
    this.accessOrder.set(key, ++this.accessCounter);
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidate(pattern: string): number {
    let invalidated = 0;
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
        invalidated++;
      }
    }
    
    logger.info(`Invalidated ${invalidated} cache entries matching pattern: ${pattern}`);
    return invalidated;
  }

  /**
   * Invalidate specific cache entry
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    this.accessOrder.delete(key);
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.stats = { hits: 0, misses: 0 };
    logger.info('Query cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      entries: this.cache.size,
      hitRate: totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0
    };
  }

  /**
   * Evict oldest entry based on LRU policy
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;

    for (const [key, accessTime] of this.accessOrder.entries()) {
      if (accessTime < oldestAccess) {
        oldestAccess = accessTime;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.accessOrder.delete(oldestKey);
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`Cleaned up ${cleaned} expired cache entries`);
    }
  }

  /**
   * Generate cache key for dashboard queries
   */
  static generateDashboardKey(userId: string, queryType: string, params?: any): string {
    const baseKey = `dashboard:${userId}:${queryType}`;
    if (params) {
      const paramString = JSON.stringify(params);
      return `${baseKey}:${Buffer.from(paramString).toString('base64')}`;
    }
    return baseKey;
  }

  /**
   * Generate cache key for agent queries
   */
  static generateAgentKey(userId: string, queryType: string, agentId?: string): string {
    const baseKey = `agent:${userId}:${queryType}`;
    return agentId ? `${baseKey}:${agentId}` : baseKey;
  }
}

// Global cache instance
export const queryCache = new QueryCache();

// Cache invalidation helpers
export class CacheInvalidator {
  /**
   * Invalidate all dashboard caches for a user
   */
  static invalidateUserDashboard(userId: string): void {
    queryCache.invalidate(`dashboard:${userId}`);
  }

  /**
   * Invalidate all agent caches for a user
   */
  static invalidateUserAgents(userId: string): void {
    queryCache.invalidate(`agent:${userId}`);
  }

  /**
   * Invalidate specific agent cache
   */
  static invalidateAgent(userId: string, agentId: string): void {
    queryCache.invalidate(`agent:${userId}:${agentId}`);
  }

  /**
   * Invalidate all caches for a user (dashboard + agents)
   */
  static invalidateUser(userId: string): void {
    this.invalidateUserDashboard(userId);
    this.invalidateUserAgents(userId);
  }
}