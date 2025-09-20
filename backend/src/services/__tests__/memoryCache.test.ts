import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { afterEach } from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import { afterEach } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { MemoryCache, CacheManager, dashboardCache, agentCache, performanceCache } from '../memoryCache';

// Mock logger to avoid console output during tests
jest.mock('../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }
}));

describe('MemoryCache', () => {
    let cache: MemoryCache<string>;

    beforeEach(() => {
        cache = new MemoryCache<string>({
            maxSize: 5,
            maxMemory: 1024 * 1024, // 1MB
            defaultTTL: 1000, // 1 second for testing
            cleanupInterval: 60000, // 1 minute to avoid interference during tests
            enableStatistics: true
        });
    });

    afterEach(() => {
        cache.destroy();
    });

    describe('Basic Operations', () => {
        test('should set and get values', () => {
            cache.set('key1', 'value1');
            expect(cache.get('key1')).toBe('value1');
        });

        test('should return null for non-existent keys', () => {
            expect(cache.get('nonexistent')).toBeNull();
        });

        test('should update existing keys', () => {
            cache.set('key1', 'value1');
            cache.set('key1', 'value2');
            expect(cache.get('key1')).toBe('value2');
            expect(cache.size()).toBe(1);
        });

        test('should delete keys', () => {
            cache.set('key1', 'value1');
            expect(cache.delete('key1')).toBe(true);
            expect(cache.get('key1')).toBeNull();
            expect(cache.delete('key1')).toBe(false);
        });

        test('should check key existence', () => {
            cache.set('key1', 'value1');
            expect(cache.has('key1')).toBe(true);
            expect(cache.has('nonexistent')).toBe(false);
        });

        test('should clear all entries', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.clear();
            expect(cache.size()).toBe(0);
            expect(cache.get('key1')).toBeNull();
        });
    });

    describe('TTL (Time To Live)', () => {
        test('should expire entries after TTL', async () => {
            cache.set('key1', 'value1', 50); // 50ms TTL
            expect(cache.get('key1')).toBe('value1');

            await new Promise(resolve => setTimeout(resolve, 60));
            expect(cache.get('key1')).toBeNull();
        });

        test('should use default TTL when not specified', async () => {
            cache.set('key1', 'value1'); // Uses default 1000ms TTL
            expect(cache.get('key1')).toBe('value1');

            await new Promise(resolve => setTimeout(resolve, 50));
            expect(cache.get('key1')).toBe('value1'); // Should still exist
        });

        test('should not return expired entries in has() check', async () => {
            cache.set('key1', 'value1', 50);
            expect(cache.has('key1')).toBe(true);

            await new Promise(resolve => setTimeout(resolve, 60));
            expect(cache.has('key1')).toBe(false);
        });
    });

    describe('LRU Eviction', () => {
        test('should evict least recently used entries when size limit reached', () => {
            // Fill cache to capacity
            for (let i = 1; i <= 5; i++) {
                cache.set(`key${i}`, `value${i}`);
            }
            expect(cache.size()).toBe(5);

            // Access key2 to make it recently used
            cache.get('key2');

            // Add new entry, should evict key1 (least recently used)
            cache.set('key6', 'value6');
            expect(cache.size()).toBe(5);
            expect(cache.get('key1')).toBeNull(); // Should be evicted
            expect(cache.get('key2')).toBe('value2'); // Should still exist
            expect(cache.get('key6')).toBe('value6'); // New entry should exist
        });

        test('should maintain LRU order correctly', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.set('key3', 'value3');

            // Access in specific order
            cache.get('key1'); // key1 becomes most recent
            cache.get('key2'); // key2 becomes most recent

            cache.set('key4', 'value4');
            cache.set('key5', 'value5');
            cache.set('key6', 'value6'); // Should evict key3 (least recent)

            expect(cache.get('key3')).toBeNull();
            expect(cache.get('key1')).toBe('value1');
            expect(cache.get('key2')).toBe('value2');
        });
    });

    describe('Memory Management', () => {
        test('should track memory usage', () => {
            const initialMemory = cache.memoryUsage();
            cache.set('key1', 'a'.repeat(100));
            expect(cache.memoryUsage()).toBeGreaterThan(initialMemory);
        });

        test('should evict entries when memory limit is reached', () => {
            const smallCache = new MemoryCache<string>({
                maxSize: 10,
                maxMemory: 500, // Very small memory limit
                defaultTTL: 60000
            });

            // Add entries until memory limit is reached
            let added = 0;
            for (let i = 1; i <= 10; i++) {
                const success = smallCache.set(`key${i}`, 'x'.repeat(100));
                if (success) added++;
            }

            // Should either reject entries or evict old ones to stay within memory limit
            expect(smallCache.memoryUsage()).toBeLessThanOrEqual(500);
            smallCache.destroy();
        });
    });

    describe('Statistics', () => {
        test('should track hit and miss statistics', () => {
            cache.set('key1', 'value1');

            cache.get('key1'); // hit
            cache.get('key2'); // miss
            cache.get('key1'); // hit
            cache.get('key3'); // miss

            const stats = cache.getStatistics();
            expect(stats.hits).toBe(2);
            expect(stats.misses).toBe(2);
            expect(stats.hitRate).toBe(50);
        });

        test('should track set and delete operations', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.delete('key1');

            const stats = cache.getStatistics();
            expect(stats.sets).toBe(2);
            expect(stats.deletes).toBe(1);
            expect(stats.entries).toBe(1);
        });

        test('should track evictions', () => {
            // Fill cache beyond capacity to trigger evictions
            for (let i = 1; i <= 7; i++) {
                cache.set(`key${i}`, `value${i}`);
            }

            const stats = cache.getStatistics();
            expect(stats.evictions).toBeGreaterThan(0);
        });
    });

    describe('Pattern Invalidation', () => {
        test('should invalidate entries by string pattern', () => {
            cache.set('user:1:dashboard', 'data1');
            cache.set('user:1:agents', 'data2');
            cache.set('user:2:dashboard', 'data3');
            cache.set('other:data', 'data4');

            const invalidated = cache.invalidatePattern('user:1');
            expect(invalidated).toBe(2);
            expect(cache.get('user:1:dashboard')).toBeNull();
            expect(cache.get('user:1:agents')).toBeNull();
            expect(cache.get('user:2:dashboard')).toBe('data3');
            expect(cache.get('other:data')).toBe('data4');
        });

        test('should invalidate entries by regex pattern', () => {
            cache.set('dashboard:user1', 'data1');
            cache.set('dashboard:user2', 'data2');
            cache.set('agent:user1', 'data3');
            cache.set('other:data', 'data4');

            const invalidated = cache.invalidatePattern(/^dashboard:/);
            expect(invalidated).toBe(2);
            expect(cache.get('dashboard:user1')).toBeNull();
            expect(cache.get('dashboard:user2')).toBeNull();
            expect(cache.get('agent:user1')).toBe('data3');
            expect(cache.get('other:data')).toBe('data4');
        });
    });

    describe('Entry Metadata', () => {
        test('should provide entry metadata', () => {
            cache.set('key1', 'value1');
            cache.get('key1'); // Access to update metadata

            const metadata = cache.getEntryMetadata('key1');
            expect(metadata).toBeDefined();
            expect(metadata?.key).toBe('key1');
            expect(metadata?.accessCount).toBeGreaterThanOrEqual(1); // Could be 1 or 2 depending on implementation
            expect(metadata?.createdAt).toBeDefined();
            expect(metadata?.lastAccessed).toBeDefined();
        });

        test('should return null for non-existent entry metadata', () => {
            const metadata = cache.getEntryMetadata('nonexistent');
            expect(metadata).toBeNull();
        });
    });

    describe('Cleanup', () => {
        test('should manually cleanup expired entries', async () => {
            cache.set('key1', 'value1', 50);
            cache.set('key2', 'value2', 1000);

            await new Promise(resolve => setTimeout(resolve, 60));

            const cleaned = cache.cleanup();
            expect(cleaned).toBe(1);
            expect(cache.get('key1')).toBeNull();
            expect(cache.get('key2')).toBe('value2');
        });
    });

    describe('Utility Methods', () => {
        test('should return cache keys', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');

            const keys = cache.keys();
            expect(keys).toContain('key1');
            expect(keys).toContain('key2');
            expect(keys.length).toBe(2);
        });
    });
});

describe('CacheManager', () => {
    afterEach(() => {
        CacheManager.destroyAll();
    });

    afterAll(() => {
        // Ensure all timers are cleared
        jest.clearAllTimers();
    });

    test('should create and retrieve named cache instances', () => {
        const cache1 = CacheManager.getCache('test1');
        const cache2 = CacheManager.getCache('test2');
        const cache1Again = CacheManager.getCache('test1');

        expect(cache1).toBeDefined();
        expect(cache2).toBeDefined();
        expect(cache1).toBe(cache1Again); // Should return same instance
        expect(cache1).not.toBe(cache2); // Should be different instances
    });

    test('should get all cache statistics', () => {
        const cache1 = CacheManager.getCache('test1');
        const cache2 = CacheManager.getCache('test2');

        cache1.set('key1', 'value1');
        cache2.set('key2', 'value2');

        const allStats = CacheManager.getAllStatistics();
        expect(allStats.test1).toBeDefined();
        expect(allStats.test2).toBeDefined();
        expect(allStats.test1.entries).toBe(1);
        expect(allStats.test2.entries).toBe(1);
    });

    test('should clear all caches', () => {
        const cache1 = CacheManager.getCache('test1');
        const cache2 = CacheManager.getCache('test2');

        cache1.set('key1', 'value1');
        cache2.set('key2', 'value2');

        CacheManager.clearAll();

        expect(cache1.size()).toBe(0);
        expect(cache2.size()).toBe(0);
    });

    test('should get cache names', () => {
        CacheManager.getCache('test1');
        CacheManager.getCache('test2');

        const names = CacheManager.getCacheNames();
        expect(names).toContain('test1');
        expect(names).toContain('test2');
    });
});

describe('Pre-configured Cache Instances', () => {
    test('should have dashboard cache configured', () => {
        expect(dashboardCache).toBeDefined();
        dashboardCache.set('test', 'value');
        expect(dashboardCache.get('test')).toBe('value');
    });

    test('should have agent cache configured', () => {
        expect(agentCache).toBeDefined();
        agentCache.set('test', 'value');
        expect(agentCache.get('test')).toBe('value');
    });

    test('should have performance cache configured', () => {
        expect(performanceCache).toBeDefined();
        performanceCache.set('test', 'value');
        expect(performanceCache.get('test')).toBe('value');
    });
});