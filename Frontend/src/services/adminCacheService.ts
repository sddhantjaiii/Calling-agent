interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

interface CacheConfig {
  defaultTTL: number;
  maxSize: number;
  cleanupInterval: number;
}

class AdminCacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private config: CacheConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private accessCount = new Map<string, number>();
  private lastAccess = new Map<string, number>();

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      maxSize: 100,
      cleanupInterval: 60 * 1000, // 1 minute
      ...config
    };

    this.startCleanupTimer();
  }

  private startCleanupTimer() {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  private cleanup() {
    const now = Date.now();
    const keysToDelete: string[] = [];

    // Remove expired entries
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    // If still over max size, remove least recently used entries
    if (this.cache.size - keysToDelete.length > this.config.maxSize) {
      const sortedByAccess = Array.from(this.lastAccess.entries())
        .sort(([, a], [, b]) => a - b)
        .slice(0, this.cache.size - keysToDelete.length - this.config.maxSize);

      keysToDelete.push(...sortedByAccess.map(([key]) => key));
    }

    // Clean up
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.accessCount.delete(key);
      this.lastAccess.delete(key);
    });
  }

  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
      key
    };

    this.cache.set(key, entry);
    this.accessCount.set(key, 0);
    this.lastAccess.set(key, Date.now());

    // Trigger cleanup if over max size
    if (this.cache.size > this.config.maxSize) {
      this.cleanup();
    }
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    
    // Check if expired
    if (now - entry.timestamp > entry.ttl) {
      this.delete(key);
      return null;
    }

    // Update access tracking
    this.accessCount.set(key, (this.accessCount.get(key) || 0) + 1);
    this.lastAccess.set(key, now);

    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    const now = Date.now();
    
    // Check if expired
    if (now - entry.timestamp > entry.ttl) {
      this.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    this.accessCount.delete(key);
    this.lastAccess.delete(key);
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.accessCount.clear();
    this.lastAccess.clear();
  }

  // Invalidate cache entries by pattern
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.delete(key));
  }

  // Get cache statistics
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const entry of this.cache.values()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      maxSize: this.config.maxSize,
      hitRate: this.calculateHitRate(),
      mostAccessed: this.getMostAccessedKeys(5)
    };
  }

  private calculateHitRate(): number {
    const totalAccess = Array.from(this.accessCount.values()).reduce((sum, count) => sum + count, 0);
    return totalAccess > 0 ? (totalAccess / (totalAccess + this.cache.size)) * 100 : 0;
  }

  private getMostAccessedKeys(limit: number): Array<{ key: string; count: number }> {
    return Array.from(this.accessCount.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([key, count]) => ({ key, count }));
  }

  // Preload frequently accessed data
  async preload(keys: string[], dataFetcher: (key: string) => Promise<any>): Promise<void> {
    const promises = keys.map(async (key) => {
      if (!this.has(key)) {
        try {
          const data = await dataFetcher(key);
          this.set(key, data);
        } catch (error) {
          console.warn(`Failed to preload cache key: ${key}`, error);
        }
      }
    });

    await Promise.all(promises);
  }

  // Batch operations
  setMany<T>(entries: Array<{ key: string; data: T; ttl?: number }>): void {
    entries.forEach(({ key, data, ttl }) => {
      this.set(key, data, ttl);
    });
  }

  getMany<T>(keys: string[]): Array<{ key: string; data: T | null }> {
    return keys.map(key => ({
      key,
      data: this.get<T>(key)
    }));
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
  }
}

// Cache key generators for admin data
export const AdminCacheKeys = {
  users: (page: number, filters?: any) => `admin:users:${page}:${JSON.stringify(filters || {})}`,
  user: (id: string) => `admin:user:${id}`,
  userStats: (id: string) => `admin:user:stats:${id}`,
  agents: (page: number, filters?: any) => `admin:agents:${page}:${JSON.stringify(filters || {})}`,
  agent: (id: string) => `admin:agent:${id}`,
  systemStats: () => 'admin:system:stats',
  auditLogs: (page: number, filters?: any) => `admin:audit:${page}:${JSON.stringify(filters || {})}`,
  apiKeys: () => 'admin:apikeys',
  featureFlags: () => 'admin:featureflags',
  systemConfig: () => 'admin:config'
};

// Create singleton instance
export const adminCache = new AdminCacheService({
  defaultTTL: 5 * 60 * 1000, // 5 minutes for most admin data
  maxSize: 200, // Larger cache for admin operations
  cleanupInterval: 2 * 60 * 1000 // 2 minutes cleanup interval
});

// Cache invalidation helpers
export const AdminCacheInvalidation = {
  user: (userId: string) => {
    adminCache.delete(AdminCacheKeys.user(userId));
    adminCache.delete(AdminCacheKeys.userStats(userId));
    adminCache.invalidatePattern(`admin:users:.*`);
  },
  
  agent: (agentId: string) => {
    adminCache.delete(AdminCacheKeys.agent(agentId));
    adminCache.invalidatePattern(`admin:agents:.*`);
  },
  
  systemStats: () => {
    adminCache.delete(AdminCacheKeys.systemStats());
  },
  
  auditLogs: () => {
    adminCache.invalidatePattern(`admin:audit:.*`);
  },
  
  config: () => {
    adminCache.delete(AdminCacheKeys.apiKeys());
    adminCache.delete(AdminCacheKeys.featureFlags());
    adminCache.delete(AdminCacheKeys.systemConfig());
  },
  
  all: () => {
    adminCache.clear();
  }
};

export default AdminCacheService;