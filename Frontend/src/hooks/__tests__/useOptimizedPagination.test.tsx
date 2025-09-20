import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  useOptimizedPagination, 
  useAdminUserPagination, 
  useAdminAgentPagination, 
  useAuditLogPagination 
} from '../useOptimizedPagination';
import { adminCache } from '@/services/adminCacheService';

// Mock the admin cache and performance monitor
vi.mock('@/services/adminCacheService', () => ({
  adminCache: {
    get: vi.fn(),
    set: vi.fn(),
    has: vi.fn(),
    invalidatePattern: vi.fn(),
    clear: vi.fn()
  },
  AdminCacheKeys: {
    users: vi.fn(),
    agents: vi.fn(),
    auditLogs: vi.fn()
  }
}));

vi.mock('@/services/adminPerformanceMonitor', () => ({
  adminPerformanceMonitor: {
    measureOperation: vi.fn((name, operation) => operation())
  }
}));

interface TestData {
  id: number;
  name: string;
  email: string;
}

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useOptimizedPagination', () => {
  let mockFetcher: ReturnType<typeof vi.fn>;
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    mockFetcher = vi.fn().mockResolvedValue({
      data: Array.from({ length: 10 }, (_, i) => ({
        id: i,
        name: `User ${i}`,
        email: `user${i}@example.com`
      })),
      totalItems: 100
    });

    vi.clearAllMocks();
    (adminCache.get as any).mockReturnValue(null);
    (adminCache.has as any).mockReturnValue(false);
    vi.useFakeTimers();
  });

  afterEach(() => {
    queryClient.clear();
    vi.useRealTimers();
  });

  describe('Basic Pagination', () => {
    it('should initialize with default values', async () => {
      const { result } = renderHook(
        () => useOptimizedPagination(mockFetcher, { pageSize: 10 }),
        { wrapper: createWrapper() }
      );

      expect(result.current.currentPage).toBe(0);
      expect(result.current.pageSize).toBe(10);
      expect(result.current.search).toBe('');
      expect(result.current.filters).toEqual({});
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toHaveLength(10);
      expect(result.current.totalItems).toBe(100);
      expect(result.current.totalPages).toBe(10);
    });

    it('should handle page navigation', async () => {
      const { result } = renderHook(
        () => useOptimizedPagination(mockFetcher, { pageSize: 10 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.nextPage();
      });

      expect(result.current.currentPage).toBe(1);
      expect(result.current.hasNextPage).toBe(true);
      expect(result.current.hasPreviousPage).toBe(true);

      act(() => {
        result.current.previousPage();
      });

      expect(result.current.currentPage).toBe(0);
      expect(result.current.hasPreviousPage).toBe(false);
    });

    it('should handle direct page navigation', async () => {
      const { result } = renderHook(
        () => useOptimizedPagination(mockFetcher, { pageSize: 10 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.goToPage(5);
      });

      expect(result.current.currentPage).toBe(5);
    });

    it('should prevent navigation to invalid pages', async () => {
      const { result } = renderHook(
        () => useOptimizedPagination(mockFetcher, { pageSize: 10 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialPage = result.current.currentPage;

      act(() => {
        result.current.goToPage(-1); // Invalid page
      });

      expect(result.current.currentPage).toBe(initialPage);

      act(() => {
        result.current.goToPage(100); // Page beyond total
      });

      expect(result.current.currentPage).toBe(initialPage);
    });
  });

  describe('Search Functionality', () => {
    it('should debounce search input', async () => {
      const { result } = renderHook(
        () => useOptimizedPagination(mockFetcher, { 
          pageSize: 10, 
          searchDebounceMs: 300 
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Clear initial call
      mockFetcher.mockClear();

      act(() => {
        result.current.setSearch('test');
      });

      // Should not call fetcher immediately
      expect(mockFetcher).not.toHaveBeenCalled();

      // Fast forward debounce time
      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockFetcher).toHaveBeenCalledWith({
          page: 0,
          pageSize: 10,
          search: 'test',
          filters: {}
        });
      });
    });

    it('should reset to first page on search', async () => {
      const { result } = renderHook(
        () => useOptimizedPagination(mockFetcher, { pageSize: 10 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Navigate to page 2
      act(() => {
        result.current.goToPage(2);
      });

      expect(result.current.currentPage).toBe(2);

      // Search should reset to page 0
      act(() => {
        result.current.setSearch('test');
        vi.advanceTimersByTime(300);
      });

      expect(result.current.currentPage).toBe(0);
    });
  });

  describe('Filtering', () => {
    it('should handle filter changes', async () => {
      const { result } = renderHook(
        () => useOptimizedPagination(mockFetcher, { pageSize: 10 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockFetcher.mockClear();

      act(() => {
        result.current.setFilters({ status: 'active' });
      });

      await waitFor(() => {
        expect(mockFetcher).toHaveBeenCalledWith({
          page: 0,
          pageSize: 10,
          search: '',
          filters: { status: 'active' }
        });
      });
    });

    it('should clear filters and search', async () => {
      const { result } = renderHook(
        () => useOptimizedPagination(mockFetcher, { pageSize: 10 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Set filters and search
      act(() => {
        result.current.setFilters({ status: 'active' });
        result.current.setSearch('test');
      });

      expect(result.current.filters).toEqual({ status: 'active' });
      expect(result.current.search).toBe('test');

      // Clear all
      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.filters).toEqual({});
      expect(result.current.search).toBe('');
      expect(result.current.currentPage).toBe(0);
    });
  });

  describe('Page Size Changes', () => {
    it('should handle page size changes', async () => {
      const { result } = renderHook(
        () => useOptimizedPagination(mockFetcher, { pageSize: 10 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockFetcher.mockClear();

      act(() => {
        result.current.setPageSize(25);
      });

      expect(result.current.pageSize).toBe(25);
      expect(result.current.currentPage).toBe(0); // Should reset to first page

      await waitFor(() => {
        expect(mockFetcher).toHaveBeenCalledWith({
          page: 0,
          pageSize: 25,
          search: '',
          filters: {}
        });
      });
    });
  });

  describe('Caching', () => {
    it('should use cached data when available', async () => {
      const cachedData = {
        data: [{ id: 999, name: 'Cached User', email: 'cached@example.com' }],
        totalItems: 1
      };

      (adminCache.get as any).mockReturnValue(cachedData);

      const { result } = renderHook(
        () => useOptimizedPagination(mockFetcher, { 
          pageSize: 10,
          cacheKey: 'test-cache'
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(cachedData.data);
      expect(result.current.totalItems).toBe(cachedData.totalItems);
      expect(mockFetcher).not.toHaveBeenCalled();
    });

    it('should cache fetched data', async () => {
      const { result } = renderHook(
        () => useOptimizedPagination(mockFetcher, { 
          pageSize: 10,
          cacheKey: 'test-cache'
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(adminCache.set).toHaveBeenCalled();
    });

    it('should invalidate cache on filter changes', async () => {
      const { result } = renderHook(
        () => useOptimizedPagination(mockFetcher, { 
          pageSize: 10,
          cacheKey: 'test-cache'
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setFilters({ status: 'active' });
      });

      expect(adminCache.invalidatePattern).toHaveBeenCalledWith('test-cache:.*');
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch errors', async () => {
      const errorFetcher = vi.fn().mockRejectedValue(new Error('Fetch failed'));

      const { result } = renderHook(
        () => useOptimizedPagination(errorFetcher, { pageSize: 10 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.data).toEqual([]);
    });
  });

  describe('Refresh Functionality', () => {
    it('should refresh data and clear cache', async () => {
      const { result } = renderHook(
        () => useOptimizedPagination(mockFetcher, { 
          pageSize: 10,
          cacheKey: 'test-cache'
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockFetcher.mockClear();

      act(() => {
        result.current.refresh();
      });

      expect(adminCache.invalidatePattern).toHaveBeenCalledWith('test-cache:.*');
      
      await waitFor(() => {
        expect(mockFetcher).toHaveBeenCalled();
      });
    });
  });

  describe('Prefetching', () => {
    it('should prefetch adjacent pages', async () => {
      const { result } = renderHook(
        () => useOptimizedPagination(mockFetcher, { 
          pageSize: 10,
          prefetchPages: 1
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Clear initial calls
      mockFetcher.mockClear();
      (adminCache.has as any).mockReturnValue(false);

      // Trigger prefetch
      act(() => {
        result.current.prefetchNextPage();
      });

      // Fast forward prefetch delay
      act(() => {
        vi.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(mockFetcher).toHaveBeenCalled();
      });
    });

    it('should not prefetch if data is already cached', async () => {
      (adminCache.has as any).mockReturnValue(true);

      const { result } = renderHook(
        () => useOptimizedPagination(mockFetcher, { 
          pageSize: 10,
          prefetchPages: 1
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockFetcher.mockClear();

      act(() => {
        result.current.prefetchNextPage();
        vi.advanceTimersByTime(200);
      });

      // Should not call fetcher since data is cached
      expect(mockFetcher).not.toHaveBeenCalled();
    });
  });
});

describe('Specialized Pagination Hooks', () => {
  let mockFetcher: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetcher = vi.fn().mockResolvedValue({
      data: [],
      totalItems: 0
    });
    vi.clearAllMocks();
  });

  it('should use correct config for admin user pagination', () => {
    const { result } = renderHook(
      () => useAdminUserPagination(mockFetcher),
      { wrapper: createWrapper() }
    );

    expect(result.current.pageSize).toBe(25);
  });

  it('should use correct config for admin agent pagination', () => {
    const { result } = renderHook(
      () => useAdminAgentPagination(mockFetcher),
      { wrapper: createWrapper() }
    );

    expect(result.current.pageSize).toBe(20);
  });

  it('should use correct config for audit log pagination', () => {
    const { result } = renderHook(
      () => useAuditLogPagination(mockFetcher),
      { wrapper: createWrapper() }
    );

    expect(result.current.pageSize).toBe(50);
  });
});