import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VirtualizedTable } from '../VirtualizedTable';
import { LazyLoader, createLazyComponent } from '../LazyLoader';
import { useOptimizedPagination } from '@/hooks/useOptimizedPagination';
import { adminCache } from '@/services/adminCacheService';
import { adminPerformanceMonitor } from '@/services/adminPerformanceMonitor';
import { adminMemoryManager } from '@/utils/adminMemoryManager';

// Mock performance API
const mockPerformance = {
  now: vi.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 50000000,
    totalJSHeapSize: 100000000,
    jsHeapSizeLimit: 200000000
  }
};

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock PerformanceObserver
global.PerformanceObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn(),
  disconnect: vi.fn()
}));

describe('Performance Optimization Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    vi.clearAllMocks();
    adminCache.clear();
  });

  afterEach(() => {
    queryClient.clear();
    adminPerformanceMonitor.clear();
  });

  describe('VirtualizedTable Performance', () => {
    const generateLargeDataset = (size: number) => {
      return Array.from({ length: size }, (_, i) => ({
        id: i,
        name: `User ${i}`,
        email: `user${i}@example.com`,
        status: i % 2 === 0 ? 'active' : 'inactive',
        createdAt: new Date(Date.now() - i * 86400000).toISOString()
      }));
    };

    const columns = [
      { key: 'id' as const, header: 'ID', width: 80 },
      { key: 'name' as const, header: 'Name', width: 200 },
      { key: 'email' as const, header: 'Email', width: 250 },
      { key: 'status' as const, header: 'Status', width: 100 }
    ];

    it('should handle large datasets efficiently', async () => {
      const largeDataset = generateLargeDataset(10000);
      const startTime = performance.now();

      const { container } = render(
        <VirtualizedTable
          data={largeDataset}
          columns={columns}
          height={400}
          itemHeight={50}
        />
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render large dataset in reasonable time (< 100ms)
      expect(renderTime).toBeLessThan(100);
      
      // Should only render visible items
      const visibleRows = container.querySelectorAll('[style*="position"]');
      expect(visibleRows.length).toBeLessThan(20); // Only visible items rendered
    });

    it('should perform efficient search filtering', async () => {
      const dataset = generateLargeDataset(5000);
      
      const { rerender } = render(
        <VirtualizedTable
          data={dataset}
          columns={columns}
          searchable={true}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search...');
      
      const startTime = performance.now();
      
      await act(async () => {
        searchInput.focus();
        // Simulate typing
        for (const char of 'User 1') {
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });

      const endTime = performance.now();
      const searchTime = endTime - startTime;

      // Search should be fast even with large datasets
      expect(searchTime).toBeLessThan(50);
    });

    it('should handle rapid scrolling without performance degradation', async () => {
      const dataset = generateLargeDataset(1000);
      
      render(
        <VirtualizedTable
          data={dataset}
          columns={columns}
          height={400}
        />
      );

      const scrollContainer = container.querySelector('[style*="overflow: auto"]');
      
      // Simulate rapid scrolling
      const scrollEvents = Array.from({ length: 100 }, (_, i) => i * 50);
      
      const startTime = performance.now();
      
      for (const scrollTop of scrollEvents) {
        act(() => {
          scrollContainer.scrollTop = scrollTop;
          scrollContainer.dispatchEvent(new Event('scroll'));
        });
      }

      const endTime = performance.now();
      const scrollTime = endTime - startTime;

      // Rapid scrolling should not cause performance issues
      expect(scrollTime).toBeLessThan(200);
    });
  });

  describe('Caching Performance', () => {
    it('should cache data efficiently', () => {
      const testData = { users: Array.from({ length: 1000 }, (_, i) => ({ id: i })) };
      
      const startTime = performance.now();
      
      // Set cache
      adminCache.set('test-key', testData);
      
      const setTime = performance.now() - startTime;
      
      // Get from cache
      const getStartTime = performance.now();
      const cachedData = adminCache.get('test-key');
      const getTime = performance.now() - getStartTime;

      expect(setTime).toBeLessThan(10);
      expect(getTime).toBeLessThan(5);
      expect(cachedData).toEqual(testData);
    });

    it('should handle cache cleanup efficiently', () => {
      // Fill cache with test data
      for (let i = 0; i < 150; i++) {
        adminCache.set(`test-key-${i}`, { data: `test-${i}` });
      }

      const startTime = performance.now();
      
      // Trigger cleanup by adding more items
      for (let i = 150; i < 200; i++) {
        adminCache.set(`test-key-${i}`, { data: `test-${i}` });
      }

      const cleanupTime = performance.now() - startTime;

      // Cleanup should be fast
      expect(cleanupTime).toBeLessThan(50);
      
      // Cache should be within size limits
      const stats = adminCache.getStats();
      expect(stats.totalEntries).toBeLessThanOrEqual(200);
    });

    it('should invalidate patterns efficiently', () => {
      // Add multiple cache entries
      for (let i = 0; i < 100; i++) {
        adminCache.set(`users:page:${i}`, { data: `page-${i}` });
        adminCache.set(`agents:page:${i}`, { data: `agents-${i}` });
      }

      const startTime = performance.now();
      
      // Invalidate pattern
      adminCache.invalidatePattern('users:.*');
      
      const invalidateTime = performance.now() - startTime;

      expect(invalidateTime).toBeLessThan(20);
      
      // Only users entries should be removed
      expect(adminCache.has('users:page:0')).toBe(false);
      expect(adminCache.has('agents:page:0')).toBe(true);
    });
  });

  describe('Lazy Loading Performance', () => {
    it('should load components lazily without blocking', async () => {
      const mockComponent = vi.fn(() => <div>Lazy Component</div>);
      
      const LazyComponent = createLazyComponent({
        loader: () => Promise.resolve({ default: mockComponent }),
        delay: 100
      });

      const startTime = performance.now();
      
      render(<LazyComponent />);
      
      const initialRenderTime = performance.now() - startTime;

      // Initial render should be fast (just shows fallback)
      expect(initialRenderTime).toBeLessThan(10);
      
      // Component should not be loaded yet
      expect(mockComponent).not.toHaveBeenCalled();

      // Wait for lazy loading
      await waitFor(() => {
        expect(mockComponent).toHaveBeenCalled();
      });
    });

    it('should preload components efficiently', async () => {
      const mockComponent = vi.fn(() => <div>Preloaded Component</div>);
      
      const LazyComponent = createLazyComponent({
        loader: () => Promise.resolve({ default: mockComponent }),
        preload: true
      });

      // Wait a bit for preloading
      await new Promise(resolve => setTimeout(resolve, 50));

      const startTime = performance.now();
      
      render(<LazyComponent />);
      
      await waitFor(() => {
        expect(mockComponent).toHaveBeenCalled();
      });

      const renderTime = performance.now() - startTime;

      // Preloaded component should render faster
      expect(renderTime).toBeLessThan(50);
    });
  });

  describe('Memory Management Performance', () => {
    it('should track component memory efficiently', () => {
      const startTime = performance.now();
      
      // Register multiple components
      const componentIds = [];
      for (let i = 0; i < 100; i++) {
        const id = adminMemoryManager.registerComponent(`TestComponent${i}`);
        componentIds.push(id);
      }

      const registrationTime = performance.now() - startTime;

      expect(registrationTime).toBeLessThan(50);

      // Update components
      const updateStartTime = performance.now();
      
      componentIds.forEach(id => {
        adminMemoryManager.updateComponent(id, { prop: 'value' }, { state: 'data' });
      });

      const updateTime = performance.now() - updateStartTime;

      expect(updateTime).toBeLessThan(30);

      // Cleanup
      componentIds.forEach(id => {
        adminMemoryManager.unregisterComponent(id);
      });
    });

    it('should perform cleanup efficiently', () => {
      // Register cleanup tasks
      for (let i = 0; i < 50; i++) {
        adminMemoryManager.registerCleanupTask({
          id: `task-${i}`,
          priority: 'medium',
          cleanup: vi.fn(),
          description: `Test task ${i}`
        });
      }

      const startTime = performance.now();
      
      adminMemoryManager.cleanup('medium');
      
      const cleanupTime = performance.now() - startTime;

      expect(cleanupTime).toBeLessThan(100);
    });
  });

  describe('Pagination Performance', () => {
    const TestPaginationComponent = () => {
      const mockFetcher = vi.fn().mockResolvedValue({
        data: Array.from({ length: 25 }, (_, i) => ({ id: i, name: `Item ${i}` })),
        totalItems: 1000
      });

      const pagination = useOptimizedPagination(mockFetcher, {
        pageSize: 25,
        cacheKey: 'test-pagination'
      });

      return (
        <div>
          <div data-testid="loading">{pagination.isLoading ? 'Loading' : 'Loaded'}</div>
          <div data-testid="total">{pagination.totalItems}</div>
          <button onClick={() => pagination.nextPage()}>Next</button>
        </div>
      );
    };

    it('should handle pagination efficiently', async () => {
      const startTime = performance.now();

      render(
        <QueryClientProvider client={queryClient}>
          <TestPaginationComponent />
        </QueryClientProvider>
      );

      const renderTime = performance.now() - startTime;

      expect(renderTime).toBeLessThan(50);

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
      });
    });

    it('should cache pagination results', async () => {
      const mockFetcher = vi.fn().mockResolvedValue({
        data: [{ id: 1, name: 'Item 1' }],
        totalItems: 100
      });

      const TestComponent = () => {
        const pagination = useOptimizedPagination(mockFetcher, {
          pageSize: 25,
          cacheKey: 'cache-test'
        });

        return <div>{pagination.data.length}</div>;
      };

      // First render
      const { rerender } = render(
        <QueryClientProvider client={queryClient}>
          <TestComponent />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(mockFetcher).toHaveBeenCalledTimes(1);
      });

      // Second render should use cache
      rerender(
        <QueryClientProvider client={queryClient}>
          <TestComponent />
        </QueryClientProvider>
      );

      // Should not call fetcher again due to caching
      expect(mockFetcher).toHaveBeenCalledTimes(1);
    });
  });

  describe('Performance Monitoring', () => {
    it('should measure operations efficiently', async () => {
      const testOperation = vi.fn().mockResolvedValue('result');
      
      const startTime = performance.now();
      
      const result = await adminPerformanceMonitor.measureOperation(
        'test-operation',
        testOperation
      );

      const measureTime = performance.now() - startTime;

      expect(result).toBe('result');
      expect(measureTime).toBeLessThan(20); // Measurement overhead should be minimal
      expect(testOperation).toHaveBeenCalledTimes(1);

      const stats = adminPerformanceMonitor.getStats();
      expect(stats.operations.total).toBeGreaterThan(0);
    });

    it('should track render performance', () => {
      const renderFn = vi.fn();
      
      const startTime = performance.now();
      
      adminPerformanceMonitor.measureComponentRender('TestComponent', renderFn);
      
      const measureTime = performance.now() - startTime;

      expect(measureTime).toBeLessThan(10);
      expect(renderFn).toHaveBeenCalledTimes(1);

      const stats = adminPerformanceMonitor.getStats();
      expect(stats.rendering.totalRenders).toBeGreaterThan(0);
    });
  });

  describe('Integration Performance', () => {
    it('should handle multiple performance features together', async () => {
      const TestIntegrationComponent = () => {
        const mockFetcher = vi.fn().mockResolvedValue({
          data: Array.from({ length: 100 }, (_, i) => ({ 
            id: i, 
            name: `User ${i}`,
            email: `user${i}@example.com`
          })),
          totalItems: 1000
        });

        const pagination = useOptimizedPagination(mockFetcher, {
          pageSize: 100,
          cacheKey: 'integration-test'
        });

        const columns = [
          { key: 'id' as const, header: 'ID' },
          { key: 'name' as const, header: 'Name' },
          { key: 'email' as const, header: 'Email' }
        ];

        return (
          <div>
            {!pagination.isLoading && (
              <VirtualizedTable
                data={pagination.data}
                columns={columns}
                height={400}
              />
            )}
          </div>
        );
      };

      const startTime = performance.now();

      render(
        <QueryClientProvider client={queryClient}>
          <TestIntegrationComponent />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(container.querySelector('[style*="overflow: auto"]')).toBeInTheDocument();
      });

      const totalTime = performance.now() - startTime;

      // Complete integration should be performant
      expect(totalTime).toBeLessThan(200);
    });
  });
});