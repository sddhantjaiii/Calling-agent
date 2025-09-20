import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VirtualizedTable } from '../VirtualizedTable';
import { LazyLoader, createLazyComponent } from '../LazyLoader';
import { useOptimizedPagination } from '@/hooks/useOptimizedPagination';
import { adminCache } from '@/services/adminCacheService';
import { adminPerformanceMonitor } from '@/services/adminPerformanceMonitor';
import { adminMemoryManager } from '@/utils/adminMemoryManager';

// Mock dependencies
vi.mock('@/services/adminCacheService');
vi.mock('@/services/adminPerformanceMonitor');
vi.mock('@/utils/adminMemoryManager');

// Mock performance APIs
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

global.IntersectionObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Test component that combines all performance features
const PerformanceTestComponent: React.FC = () => {
  const mockFetcher = React.useCallback(async ({ page, pageSize, search, filters }: any) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const allData = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      name: `User ${i}`,
      email: `user${i}@example.com`,
      status: i % 2 === 0 ? 'active' : 'inactive',
      createdAt: new Date(Date.now() - i * 86400000).toISOString()
    }));

    // Apply search filter
    let filteredData = allData;
    if (search) {
      filteredData = allData.filter(item => 
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.email.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply status filter
    if (filters.status) {
      filteredData = filteredData.filter(item => item.status === filters.status);
    }

    const startIndex = page * pageSize;
    const endIndex = startIndex + pageSize;
    const pageData = filteredData.slice(startIndex, endIndex);

    return {
      data: pageData,
      totalItems: filteredData.length
    };
  }, []);

  const pagination = useOptimizedPagination(mockFetcher, {
    pageSize: 50,
    cacheKey: 'performance-test',
    searchDebounceMs: 300,
    prefetchPages: 2
  });

  const columns = [
    { key: 'id' as const, header: 'ID', width: 80 },
    { key: 'name' as const, header: 'Name', width: 200 },
    { key: 'email' as const, header: 'Email', width: 250 },
    { 
      key: 'status' as const, 
      header: 'Status', 
      width: 100,
      render: (value: string) => (
        <span className={`badge ${value === 'active' ? 'badge-success' : 'badge-inactive'}`}>
          {value}
        </span>
      )
    }
  ];

  const handleRowClick = React.useCallback((item: any) => {
    console.log('Row clicked:', item);
  }, []);

  return (
    <div className="performance-test-container">
      <div className="controls mb-4 space-y-2">
        <div className="flex gap-2">
          <input
            data-testid="search-input"
            type="text"
            placeholder="Search users..."
            value={pagination.search}
            onChange={(e) => pagination.setSearch(e.target.value)}
            className="border rounded px-3 py-2"
          />
          <select
            data-testid="status-filter"
            value={pagination.filters.status || ''}
            onChange={(e) => pagination.setFilters({ 
              ...pagination.filters, 
              status: e.target.value || undefined 
            })}
            className="border rounded px-3 py-2"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button
            data-testid="refresh-button"
            onClick={pagination.refresh}
            className="border rounded px-3 py-2"
          >
            Refresh
          </button>
        </div>
        
        <div className="pagination-info text-sm text-gray-600">
          Page {pagination.currentPage + 1} of {pagination.totalPages} 
          ({pagination.totalItems} total items)
        </div>
      </div>

      <LazyLoader delay={100} minLoadTime={200}>
        <VirtualizedTable
          data={pagination.data}
          columns={columns}
          height={400}
          itemHeight={50}
          loading={pagination.isLoading}
          onRowClick={handleRowClick}
          searchable={false} // Using external search
        />
      </LazyLoader>

      <div className="pagination-controls mt-4 flex justify-between items-center">
        <div className="flex gap-2">
          <button
            data-testid="prev-page"
            onClick={pagination.previousPage}
            disabled={!pagination.hasPreviousPage}
            className="border rounded px-3 py-2 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            data-testid="next-page"
            onClick={pagination.nextPage}
            disabled={!pagination.hasNextPage}
            className="border rounded px-3 py-2 disabled:opacity-50"
          >
            Next
          </button>
        </div>
        
        <select
          data-testid="page-size-select"
          value={pagination.pageSize}
          onChange={(e) => pagination.setPageSize(Number(e.target.value))}
          className="border rounded px-3 py-2"
        >
          <option value={25}>25 per page</option>
          <option value={50}>50 per page</option>
          <option value={100}>100 per page</option>
        </select>
      </div>
    </div>
  );
};

// Lazy component for testing
const LazyTestComponent = createLazyComponent({
  loader: () => Promise.resolve({ 
    default: () => <div data-testid="lazy-content">Lazy Loaded Content</div> 
  }),
  delay: 100
});

describe('Performance Integration Tests', () => {
  let queryClient: QueryClient;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    user = userEvent.setup();
    vi.useFakeTimers();
    vi.clearAllMocks();

    // Mock cache service
    (adminCache.get as any).mockReturnValue(null);
    (adminCache.has as any).mockReturnValue(false);
    (adminCache.set as any).mockImplementation(() => {});
    (adminCache.invalidatePattern as any).mockImplementation(() => {});

    // Mock performance monitor
    (adminPerformanceMonitor.measureOperation as any).mockImplementation(
      (name: string, operation: () => any) => operation()
    );
    (adminPerformanceMonitor.measureComponentRender as any).mockImplementation(() => {});

    // Mock memory manager
    (adminMemoryManager.registerComponent as any).mockReturnValue('test-component-id');
    (adminMemoryManager.updateComponent as any).mockImplementation(() => {});
    (adminMemoryManager.unregisterComponent as any).mockImplementation(() => {});
  });

  afterEach(() => {
    queryClient.clear();
    vi.useRealTimers();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  describe('Complete Performance Integration', () => {
    it('should render large dataset with virtualization and pagination', async () => {
      const startTime = performance.now();
      
      renderWithProviders(<PerformanceTestComponent />);

      const renderTime = performance.now() - startTime;
      
      // Initial render should be fast
      expect(renderTime).toBeLessThan(100);

      // Wait for data to load
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 5000 });

      // Should show pagination info
      expect(screen.getByText(/Page 1 of/)).toBeInTheDocument();
      
      // Should show virtualized table
      expect(screen.getByRole('grid', { hidden: true })).toBeInTheDocument();
    });

    it('should handle search with debouncing and performance monitoring', async () => {
      renderWithProviders(<PerformanceTestComponent />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      const searchInput = screen.getByTestId('search-input');
      
      const searchStartTime = performance.now();
      
      // Type search query
      await user.type(searchInput, 'User 1');
      
      // Should not trigger search immediately (debounced)
      expect(adminPerformanceMonitor.measureOperation).not.toHaveBeenCalledWith(
        expect.stringContaining('pagination-fetch'),
        expect.any(Function),
        expect.objectContaining({ search: 'User 1' })
      );

      // Fast forward debounce time
      act(() => {
        vi.advanceTimersByTime(300);
      });

      const searchTime = performance.now() - searchStartTime;
      
      // Search should complete quickly
      expect(searchTime).toBeLessThan(500);

      await waitFor(() => {
        expect(adminPerformanceMonitor.measureOperation).toHaveBeenCalled();
      });
    });

    it('should handle filtering with cache invalidation', async () => {
      renderWithProviders(<PerformanceTestComponent />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      const statusFilter = screen.getByTestId('status-filter');
      
      await user.selectOptions(statusFilter, 'active');

      // Should invalidate cache pattern
      expect(adminCache.invalidatePattern).toHaveBeenCalledWith('performance-test:.*');

      await waitFor(() => {
        expect(adminPerformanceMonitor.measureOperation).toHaveBeenCalled();
      });
    });

    it('should handle pagination navigation efficiently', async () => {
      renderWithProviders(<PerformanceTestComponent />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      const nextButton = screen.getByTestId('next-page');
      
      const navigationStartTime = performance.now();
      
      // Navigate through multiple pages quickly
      for (let i = 0; i < 5; i++) {
        await user.click(nextButton);
        
        // Small delay to simulate real user interaction
        act(() => {
          vi.advanceTimersByTime(50);
        });
      }

      const navigationTime = performance.now() - navigationStartTime;
      
      // Navigation should be fast even with multiple page changes
      expect(navigationTime).toBeLessThan(1000);
    });

    it('should handle page size changes with memory management', async () => {
      renderWithProviders(<PerformanceTestComponent />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      const pageSizeSelect = screen.getByTestId('page-size-select');
      
      await user.selectOptions(pageSizeSelect, '100');

      // Should invalidate cache when page size changes
      expect(adminCache.invalidatePattern).toHaveBeenCalledWith('performance-test:.*');

      // Should register component with memory manager
      expect(adminMemoryManager.registerComponent).toHaveBeenCalled();
    });

    it('should handle refresh with cache clearing', async () => {
      renderWithProviders(<PerformanceTestComponent />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      const refreshButton = screen.getByTestId('refresh-button');
      
      await user.click(refreshButton);

      // Should clear cache on refresh
      expect(adminCache.invalidatePattern).toHaveBeenCalledWith('performance-test:.*');
    });
  });

  describe('Lazy Loading Integration', () => {
    it('should load components lazily with performance monitoring', async () => {
      const { container } = renderWithProviders(<LazyTestComponent />);

      // Should show fallback initially
      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Fast forward delay
      act(() => {
        vi.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(screen.getByTestId('lazy-content')).toBeInTheDocument();
      });

      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });

  describe('Memory Management Integration', () => {
    it('should track component lifecycle with memory manager', () => {
      const { unmount } = renderWithProviders(<PerformanceTestComponent />);

      // Should register component
      expect(adminMemoryManager.registerComponent).toHaveBeenCalled();

      unmount();

      // Should unregister component on unmount
      expect(adminMemoryManager.unregisterComponent).toHaveBeenCalled();
    });
  });

  describe('Cache Integration', () => {
    it('should use cached data when available', async () => {
      const cachedData = {
        data: [{ id: 1, name: 'Cached User', email: 'cached@test.com', status: 'active' }],
        totalItems: 1
      };

      (adminCache.get as any).mockReturnValue(cachedData);

      renderWithProviders(<PerformanceTestComponent />);

      await waitFor(() => {
        expect(screen.getByText('Cached User')).toBeInTheDocument();
      });

      // Should not call performance monitor for cached data
      expect(adminPerformanceMonitor.measureOperation).not.toHaveBeenCalledWith(
        'pagination-fetch',
        expect.any(Function)
      );
    });

    it('should cache new data after fetching', async () => {
      renderWithProviders(<PerformanceTestComponent />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Should cache the fetched data
      expect(adminCache.set).toHaveBeenCalled();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle errors gracefully without breaking performance features', async () => {
      // Mock fetch error
      const errorFetcher = vi.fn().mockRejectedValue(new Error('Network error'));
      
      const ErrorTestComponent = () => {
        const pagination = useOptimizedPagination(errorFetcher, {
          pageSize: 10,
          cacheKey: 'error-test'
        });

        return (
          <div>
            {pagination.isError ? (
              <div data-testid="error-message">Error loading data</div>
            ) : (
              <VirtualizedTable
                data={pagination.data}
                columns={[{ key: 'id' as const, header: 'ID' }]}
                loading={pagination.isLoading}
              />
            )}
          </div>
        );
      };

      renderWithProviders(<ErrorTestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });

      // Performance monitoring should still work
      expect(adminPerformanceMonitor.measureOperation).toHaveBeenCalled();
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet performance benchmarks for large datasets', async () => {
      const startTime = performance.now();

      renderWithProviders(<PerformanceTestComponent />);

      const initialRenderTime = performance.now() - startTime;

      // Initial render should be under 50ms
      expect(initialRenderTime).toBeLessThan(50);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      const totalLoadTime = performance.now() - startTime;

      // Total load time should be under 1 second
      expect(totalLoadTime).toBeLessThan(1000);
    });

    it('should handle rapid user interactions without performance degradation', async () => {
      renderWithProviders(<PerformanceTestComponent />);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      const searchInput = screen.getByTestId('search-input');
      const nextButton = screen.getByTestId('next-page');
      const statusFilter = screen.getByTestId('status-filter');

      const rapidInteractionStartTime = performance.now();

      // Perform rapid interactions
      await user.type(searchInput, 'test');
      await user.click(nextButton);
      await user.selectOptions(statusFilter, 'active');
      await user.click(nextButton);
      await user.clear(searchInput);
      await user.type(searchInput, 'user');

      const rapidInteractionTime = performance.now() - rapidInteractionStartTime;

      // Rapid interactions should complete quickly
      expect(rapidInteractionTime).toBeLessThan(2000);
    });
  });
});