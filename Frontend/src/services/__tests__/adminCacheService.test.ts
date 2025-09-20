import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import AdminCacheService, { adminCache, AdminCacheKeys, AdminCacheInvalidation } from '../adminCacheService';

describe('AdminCacheService', () => {
  let cacheService: AdminCacheService;

  beforeEach(() => {
    cacheService = new AdminCacheService({
      defaultTTL: 1000,
      maxSize: 10,
      cleanupInterval: 100
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    cacheService.destroy();
    vi.useRealTimers();
  });

  describe('Basic Operations', () => {
    it('should set and get cache entries', () => {
      const testData = { id: 1, name: 'Test' };
      
      cacheService.set('test-key', testData);
      const retrieved = cacheService.get('test-key');
      
      expect(retrieved).toEqual(testData);
    });

    it('should return null for non-existent keys', () => {
      const result = cacheService.get('non-existent');
      expect(result).toBeNull();
    });

    it('should check if key exists', () => {
      cacheService.set('test-key', 'value');
      
      expect(cacheService.has('test-key')).toBe(true);
      expect(cacheService.has('non-existent')).toBe(false);
    });

    it('should delete entries', () => {
      cacheService.set('test-key', 'value');
      expect(cacheService.has('test-key')).toBe(true);
      
      const deleted = cacheService.delete('test-key');
      expect(deleted).toBe(true);
      expect(cacheService.has('test-key')).toBe(false);
    });

    it('should clear all entries', () => {
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');
      
      cacheService.clear();
      
      expect(cacheService.has('key1')).toBe(false);
      expect(cacheService.has('key2')).toBe(false);
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should expire entries after TTL', () => {
      cacheService.set('test-key', 'value', 500);
      
      expect(cacheService.get('test-key')).toBe('value');
      
      // Fast forward time
      vi.advanceTimersByTime(600);
      
      expect(cacheService.get('test-key')).toBeNull();
      expect(cacheService.has('test-key')).toBe(false);
    });

    it('should use default TTL when not specified', () => {
      cacheService.set('test-key', 'value');
      
      expect(cacheService.get('test-key')).toBe('value');
      
      // Fast forward past default TTL
      vi.advanceTimersByTime(1100);
      
      expect(cacheService.get('test-key')).toBeNull();
    });

    it('should handle custom TTL', () => {
      cacheService.set('short-key', 'value', 200);
      cacheService.set('long-key', 'value', 2000);
      
      vi.advanceTimersByTime(300);
      
      expect(cacheService.get('short-key')).toBeNull();
      expect(cacheService.get('long-key')).toBe('value');
    });
  });

  describe('Size Management', () => {
    it('should enforce max size limit', () => {
      // Fill cache to max size
      for (let i = 0; i < 10; i++) {
        cacheService.set(`key-${i}`, `value-${i}`);
      }
      
      // Add one more to trigger cleanup
      cacheService.set('key-10', 'value-10');
      
      const stats = cacheService.getStats();
      expect(stats.totalEntries).toBeLessThanOrEqual(10);
    });

    it('should remove least recently used items when over capacity', () => {
      // Fill cache
      for (let i = 0; i < 10; i++) {
        cacheService.set(`key-${i}`, `value-${i}`);
      }
      
      // Access some items to make them recently used
      cacheService.get('key-5');
      cacheService.get('key-7');
      
      // Add new item to trigger LRU cleanup
      cacheService.set('new-key', 'new-value');
      
      // Recently accessed items should still exist
      expect(cacheService.has('key-5')).toBe(true);
      expect(cacheService.has('key-7')).toBe(true);
      expect(cacheService.has('new-key')).toBe(true);
    });
  });

  describe('Pattern Invalidation', () => {
    it('should invalidate entries matching pattern', () => {
      cacheService.set('users:page:1', 'data1');
      cacheService.set('users:page:2', 'data2');
      cacheService.set('agents:page:1', 'data3');
      cacheService.set('other:data', 'data4');
      
      cacheService.invalidatePattern('users:.*');
      
      expect(cacheService.has('users:page:1')).toBe(false);
      expect(cacheService.has('users:page:2')).toBe(false);
      expect(cacheService.has('agents:page:1')).toBe(true);
      expect(cacheService.has('other:data')).toBe(true);
    });

    it('should handle complex regex patterns', () => {
      cacheService.set('admin:users:123', 'user-data');
      cacheService.set('admin:agents:456', 'agent-data');
      cacheService.set('public:data', 'public-data');
      
      cacheService.invalidatePattern('^admin:.*');
      
      expect(cacheService.has('admin:users:123')).toBe(false);
      expect(cacheService.has('admin:agents:456')).toBe(false);
      expect(cacheService.has('public:data')).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should provide accurate statistics', () => {
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');
      
      // Access key1 multiple times
      cacheService.get('key1');
      cacheService.get('key1');
      cacheService.get('key2');
      
      const stats = cacheService.getStats();
      
      expect(stats.totalEntries).toBe(2);
      expect(stats.validEntries).toBe(2);
      expect(stats.expiredEntries).toBe(0);
      expect(stats.mostAccessed).toHaveLength(2);
      expect(stats.mostAccessed[0].key).toBe('key1');
      expect(stats.mostAccessed[0].count).toBe(2);
    });

    it('should track expired entries in stats', () => {
      cacheService.set('key1', 'value1', 100);
      cacheService.set('key2', 'value2', 1000);
      
      vi.advanceTimersByTime(200);
      
      const stats = cacheService.getStats();
      
      expect(stats.validEntries).toBe(1);
      expect(stats.expiredEntries).toBe(1);
    });
  });

  describe('Batch Operations', () => {
    it('should set multiple entries at once', () => {
      const entries = [
        { key: 'key1', data: 'value1' },
        { key: 'key2', data: 'value2', ttl: 500 },
        { key: 'key3', data: 'value3' }
      ];
      
      cacheService.setMany(entries);
      
      expect(cacheService.get('key1')).toBe('value1');
      expect(cacheService.get('key2')).toBe('value2');
      expect(cacheService.get('key3')).toBe('value3');
    });

    it('should get multiple entries at once', () => {
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');
      cacheService.set('key3', 'value3');
      
      const results = cacheService.getMany(['key1', 'key2', 'non-existent']);
      
      expect(results).toEqual([
        { key: 'key1', data: 'value1' },
        { key: 'key2', data: 'value2' },
        { key: 'non-existent', data: null }
      ]);
    });
  });

  describe('Preloading', () => {
    it('should preload data for multiple keys', async () => {
      const dataFetcher = vi.fn()
        .mockResolvedValueOnce('data1')
        .mockResolvedValueOnce('data2');
      
      await cacheService.preload(['key1', 'key2'], dataFetcher);
      
      expect(dataFetcher).toHaveBeenCalledTimes(2);
      expect(cacheService.get('key1')).toBe('data1');
      expect(cacheService.get('key2')).toBe('data2');
    });

    it('should skip preloading for existing keys', async () => {
      cacheService.set('key1', 'existing-data');
      
      const dataFetcher = vi.fn().mockResolvedValue('new-data');
      
      await cacheService.preload(['key1', 'key2'], dataFetcher);
      
      expect(dataFetcher).toHaveBeenCalledTimes(1);
      expect(dataFetcher).toHaveBeenCalledWith('key2');
      expect(cacheService.get('key1')).toBe('existing-data');
    });

    it('should handle preload errors gracefully', async () => {
      const dataFetcher = vi.fn()
        .mockResolvedValueOnce('data1')
        .mockRejectedValueOnce(new Error('Fetch failed'));
      
      await expect(
        cacheService.preload(['key1', 'key2'], dataFetcher)
      ).resolves.toBeUndefined();
      
      expect(cacheService.get('key1')).toBe('data1');
      expect(cacheService.get('key2')).toBeNull();
    });
  });

  describe('Cleanup Timer', () => {
    it('should automatically clean up expired entries', () => {
      cacheService.set('key1', 'value1', 50);
      cacheService.set('key2', 'value2', 200);
      
      expect(cacheService.has('key1')).toBe(true);
      expect(cacheService.has('key2')).toBe(true);
      
      // Fast forward past first TTL but not second
      vi.advanceTimersByTime(100);
      
      // Trigger cleanup
      vi.advanceTimersByTime(100);
      
      expect(cacheService.has('key1')).toBe(false);
      expect(cacheService.has('key2')).toBe(true);
    });
  });
});

describe('Admin Cache Keys', () => {
  it('should generate consistent cache keys', () => {
    const userKey1 = AdminCacheKeys.user('123');
    const userKey2 = AdminCacheKeys.user('123');
    
    expect(userKey1).toBe(userKey2);
    expect(userKey1).toBe('admin:user:123');
  });

  it('should generate unique keys for different parameters', () => {
    const usersKey1 = AdminCacheKeys.users(1, { status: 'active' });
    const usersKey2 = AdminCacheKeys.users(1, { status: 'inactive' });
    const usersKey3 = AdminCacheKeys.users(2, { status: 'active' });
    
    expect(usersKey1).not.toBe(usersKey2);
    expect(usersKey1).not.toBe(usersKey3);
    expect(usersKey2).not.toBe(usersKey3);
  });

  it('should handle undefined filters', () => {
    const key1 = AdminCacheKeys.users(1);
    const key2 = AdminCacheKeys.users(1, undefined);
    
    expect(key1).toBe(key2);
  });
});

describe('Admin Cache Invalidation', () => {
  beforeEach(() => {
    adminCache.clear();
  });

  it('should invalidate user-related cache', () => {
    adminCache.set(AdminCacheKeys.user('123'), { name: 'User 123' });
    adminCache.set(AdminCacheKeys.userStats('123'), { calls: 10 });
    adminCache.set(AdminCacheKeys.users(1), { data: [] });
    adminCache.set(AdminCacheKeys.agent('456'), { name: 'Agent 456' });
    
    AdminCacheInvalidation.user('123');
    
    expect(adminCache.has(AdminCacheKeys.user('123'))).toBe(false);
    expect(adminCache.has(AdminCacheKeys.userStats('123'))).toBe(false);
    expect(adminCache.has(AdminCacheKeys.users(1))).toBe(false);
    expect(adminCache.has(AdminCacheKeys.agent('456'))).toBe(true);
  });

  it('should invalidate agent-related cache', () => {
    adminCache.set(AdminCacheKeys.agent('456'), { name: 'Agent 456' });
    adminCache.set(AdminCacheKeys.agents(1), { data: [] });
    adminCache.set(AdminCacheKeys.user('123'), { name: 'User 123' });
    
    AdminCacheInvalidation.agent('456');
    
    expect(adminCache.has(AdminCacheKeys.agent('456'))).toBe(false);
    expect(adminCache.has(AdminCacheKeys.agents(1))).toBe(false);
    expect(adminCache.has(AdminCacheKeys.user('123'))).toBe(true);
  });

  it('should invalidate all cache', () => {
    adminCache.set('key1', 'value1');
    adminCache.set('key2', 'value2');
    adminCache.set('key3', 'value3');
    
    AdminCacheInvalidation.all();
    
    expect(adminCache.has('key1')).toBe(false);
    expect(adminCache.has('key2')).toBe(false);
    expect(adminCache.has('key3')).toBe(false);
  });
});