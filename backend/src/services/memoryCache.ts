import { logger } from '../utils/logger';

/**
 * Cache entry interface with metadata
 */
interface CacheEntry<T> {
  key: string;
  value: T;
  createdAt: number;
  lastAccessed: number;
  accessCount: number;
  ttl: number;
  size: number; // Estimated memory size in bytes
}

/**
 * Cache statistics interface
 */
interface CacheStatistics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  entries: number;
  totalSize: number; // Total memory usage in bytes
  hitRate: number;
  averageAccessTime: number;
  oldestEntry?: number;
  newestEntry?: number;
}

/**
 * Cache configuration interface
 */
interface CacheConfig {
  maxSize: number; // Maximum number of entries
  maxMemory: number; // Maximum memory usage in bytes
  defaultTTL: number; // Default TTL in milliseconds
  cleanupInterval: number; // Cleanup interval in milliseconds
  enableStatistics: boolean; // Enable detailed statistics tracking
}

/**
 * LRU Cache node for doubly linked list implementation
 */
class CacheNode<T> {
  key: string;
  entry: CacheEntry<T>;
  prev: CacheNode<T> | null = null;
  next: CacheNode<T> | null = null;

  constructor(key: string, entry: CacheEntry<T>) {
    this.key = key;
    this.entry = entry;
  }
}

/**
 * Advanced in-memory cache service with LRU eviction policy, TTL support,
 * memory management, and comprehensive monitoring capabilities
 */
export class MemoryCache<T = any> {
  private cache = new Map<string, CacheNode<T>>();
  private head: CacheNode<T> | null = null; // Most recently used
  private tail: CacheNode<T> | null = null; // Least recently used
  
  private config: CacheConfig;
  private stats: CacheStatistics;
  private cleanupTimer: any | null = null;
  private totalMemoryUsage = 0;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: config.maxSize || 1000,
      maxMemory: config.maxMemory || 100 * 1024 * 1024, // 100MB default
      defaultTTL: config.defaultTTL || 15 * 60 * 1000, // 15 minutes
      cleanupInterval: config.cleanupInterval || 5 * 60 * 1000, // 5 minutes
      enableStatistics: config.enableStatistics !== false
    };

    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      entries: 0,
      totalSize: 0,
      hitRate: 0,
      averageAccessTime: 0
    };

    this.startCleanupTimer();
    logger.info('MemoryCache initialized', {
      maxSize: this.config.maxSize,
      maxMemory: this.config.maxMemory,
      defaultTTL: this.config.defaultTTL
    });
  }

  /**
   * Get value from cache
   */
  get(key: string): T | null {
    const startTime = Date.now();
    const node = this.cache.get(key);

    if (!node) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    const now = Date.now();
    
    // Check if entry has expired
    if (now > node.entry.createdAt + node.entry.ttl) {
      this.removeNode(node);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Update access metadata
    node.entry.lastAccessed = now;
    node.entry.accessCount++;
    
    // Move to head (most recently used)
    this.moveToHead(node);
    
    this.stats.hits++;
    this.updateHitRate();
    this.updateAverageAccessTime(Date.now() - startTime);

    return node.entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T, ttl?: number): boolean {
    const now = Date.now();
    const actualTTL = ttl || this.config.defaultTTL;
    const estimatedSize = this.estimateSize(value);

    // Check if we need to evict entries due to memory constraints
    if (this.totalMemoryUsage + estimatedSize > this.config.maxMemory) {
      if (!this.evictForMemory(estimatedSize)) {
        logger.warn('Failed to evict enough memory for new cache entry', {
          key,
          requiredSize: estimatedSize,
          currentMemory: this.totalMemoryUsage,
          maxMemory: this.config.maxMemory
        });
        return false;
      }
    }

    const existingNode = this.cache.get(key);
    
    if (existingNode) {
      // Update existing entry
      this.totalMemoryUsage -= existingNode.entry.size;
      existingNode.entry.value = value;
      existingNode.entry.createdAt = now;
      existingNode.entry.lastAccessed = now;
      existingNode.entry.accessCount = 1;
      existingNode.entry.ttl = actualTTL;
      existingNode.entry.size = estimatedSize;
      this.totalMemoryUsage += estimatedSize;
      
      this.moveToHead(existingNode);
    } else {
      // Create new entry
      const entry: CacheEntry<T> = {
        key,
        value,
        createdAt: now,
        lastAccessed: now,
        accessCount: 1,
        ttl: actualTTL,
        size: estimatedSize
      };

      const newNode = new CacheNode(key, entry);
      
      // Check size limit and evict if necessary
      if (this.cache.size >= this.config.maxSize) {
        this.evictLRU();
      }

      this.cache.set(key, newNode);
      this.addToHead(newNode);
      this.totalMemoryUsage += estimatedSize;
      this.stats.entries++;
    }

    this.stats.sets++;
    this.updateStatistics();
    return true;
  }

  /**
   * Delete specific key from cache
   */
  delete(key: string): boolean {
    const node = this.cache.get(key);
    if (!node) {
      return false;
    }

    this.removeNode(node);
    this.stats.deletes++;
    this.updateStatistics();
    return true;
  }

  /**
   * Check if key exists in cache (without updating access time)
   */
  has(key: string): boolean {
    const node = this.cache.get(key);
    if (!node) {
      return false;
    }

    const now = Date.now();
    return now <= node.entry.createdAt + node.entry.ttl;
  }

  /**
   * Get cache size (number of entries)
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get memory usage in bytes
   */
  memoryUsage(): number {
    return this.totalMemoryUsage;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.head = null;
    this.tail = null;
    this.totalMemoryUsage = 0;
    this.stats.entries = 0;
    this.updateStatistics();
    logger.info('MemoryCache cleared');
  }

  /**
   * Get comprehensive cache statistics
   */
  getStatistics(): CacheStatistics {
    this.updateStatistics();
    return { ...this.stats };
  }

  /**
   * Get cache keys (for debugging)
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Invalidate entries by pattern
   */
  invalidatePattern(pattern: string | RegExp): number {
    let invalidated = 0;
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.delete(key);
        invalidated++;
      }
    }

    logger.info(`Invalidated ${invalidated} cache entries matching pattern`, { pattern: pattern.toString() });
    return invalidated;
  }

  /**
   * Get cache entry metadata (for monitoring)
   */
  getEntryMetadata(key: string): Omit<CacheEntry<T>, 'value'> | null {
    const node = this.cache.get(key);
    if (!node) {
      return null;
    }

    const { value, ...metadata } = node.entry;
    return metadata;
  }

  /**
   * Cleanup expired entries manually
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, node] of this.cache.entries()) {
      if (now > node.entry.createdAt + node.entry.ttl) {
        this.removeNode(node);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`Cleaned up ${cleaned} expired cache entries`);
      this.updateStatistics();
    }

    return cleaned;
  }

  /**
   * Destroy cache and cleanup resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
    logger.info('MemoryCache destroyed');
  }

  // Private methods

  private addToHead(node: CacheNode<T>): void {
    node.prev = null;
    node.next = this.head;

    if (this.head) {
      this.head.prev = node;
    }

    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  private removeNode(node: CacheNode<T>): void {
    this.cache.delete(node.key);
    this.totalMemoryUsage -= node.entry.size;
    this.stats.entries--;

    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  private moveToHead(node: CacheNode<T>): void {
    if (node === this.head) {
      return;
    }

    // Remove from current position
    if (node.prev) {
      node.prev.next = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }

    // Add to head
    this.addToHead(node);
  }

  private evictLRU(): void {
    if (!this.tail) {
      return;
    }

    this.removeNode(this.tail);
    this.stats.evictions++;
  }

  private evictForMemory(requiredSize: number): boolean {
    let freedMemory = 0;
    const targetMemory = this.config.maxMemory - requiredSize;

    while (this.tail && this.totalMemoryUsage > targetMemory) {
      const evictedSize = this.tail.entry.size;
      this.removeNode(this.tail);
      freedMemory += evictedSize;
      this.stats.evictions++;

      if (freedMemory >= requiredSize) {
        break;
      }
    }

    return this.totalMemoryUsage + requiredSize <= this.config.maxMemory;
  }

  private estimateSize(value: T): number {
    try {
      // Simple size estimation based on JSON serialization
      const jsonString = JSON.stringify(value);
      return jsonString.length * 2; // Rough estimate for UTF-16 encoding
    } catch {
      // Fallback for non-serializable objects
      return 1024; // 1KB default estimate
    }
  }

  private updateHitRate(): void {
    const totalRequests = this.stats.hits + this.stats.misses;
    this.stats.hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;
  }

  private updateAverageAccessTime(accessTime: number): void {
    const totalRequests = this.stats.hits + this.stats.misses;
    this.stats.averageAccessTime = 
      ((this.stats.averageAccessTime * (totalRequests - 1)) + accessTime) / totalRequests;
  }

  private updateStatistics(): void {
    this.stats.totalSize = this.totalMemoryUsage;
    
    if (this.cache.size > 0) {
      let oldest = Infinity;
      let newest = 0;

      for (const node of this.cache.values()) {
        oldest = Math.min(oldest, node.entry.createdAt);
        newest = Math.max(newest, node.entry.createdAt);
      }

      this.stats.oldestEntry = oldest;
      this.stats.newestEntry = newest;
    } else {
      this.stats.oldestEntry = undefined;
      this.stats.newestEntry = undefined;
    }
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }
}

/**
 * Cache manager for different cache instances
 */
export class CacheManager {
  private static caches = new Map<string, MemoryCache>();

  /**
   * Get or create a named cache instance
   */
  static getCache<T = any>(name: string, config?: Partial<CacheConfig>): MemoryCache<T> {
    if (!this.caches.has(name)) {
      const cache = new MemoryCache<T>(config);
      this.caches.set(name, cache);
      logger.info(`Created new cache instance: ${name}`);
    }
    return this.caches.get(name) as MemoryCache<T>;
  }

  /**
   * Get all cache statistics
   */
  static getAllStatistics(): Record<string, CacheStatistics> {
    const stats: Record<string, CacheStatistics> = {};
    for (const [name, cache] of this.caches.entries()) {
      stats[name] = cache.getStatistics();
    }
    return stats;
  }

  /**
   * Clear all caches
   */
  static clearAll(): void {
    for (const cache of this.caches.values()) {
      cache.clear();
    }
    logger.info('All caches cleared');
  }

  /**
   * Destroy all caches
   */
  static destroyAll(): void {
    for (const cache of this.caches.values()) {
      cache.destroy();
    }
    this.caches.clear();
    logger.info('All caches destroyed');
  }

  /**
   * Get cache names
   */
  static getCacheNames(): string[] {
    return Array.from(this.caches.keys());
  }
}

// Pre-configured cache instances for different use cases - REDUCED LIMITS
export const dashboardCache = CacheManager.getCache('dashboard', {
  maxSize: 100, // Reduced from 500
  maxMemory: 10 * 1024 * 1024, // Reduced to 10MB from 50MB
  defaultTTL: 5 * 60 * 1000, // Reduced to 5 minutes from 10
  cleanupInterval: 1 * 60 * 1000 // More frequent cleanup - 1 minute
});

export const agentCache = CacheManager.getCache('agent', {
  maxSize: 200, // Reduced from 1000
  maxMemory: 10 * 1024 * 1024, // Reduced to 10MB from 30MB
  defaultTTL: 10 * 60 * 1000, // Reduced to 10 minutes from 15
  cleanupInterval: 2 * 60 * 1000 // More frequent cleanup - 2 minutes
});

export const performanceCache = CacheManager.getCache('performance', {
  maxSize: 50, // Reduced from 200
  maxMemory: 5 * 1024 * 1024, // Reduced to 5MB from 20MB
  defaultTTL: 3 * 60 * 1000, // Reduced to 3 minutes from 5
  cleanupInterval: 30 * 1000 // More frequent cleanup - 30 seconds
});