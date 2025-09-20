import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminCache, AdminCacheKeys } from '@/services/adminCacheService';
import { adminPerformanceMonitor } from '@/services/adminPerformanceMonitor';

interface PaginationConfig {
  pageSize: number;
  initialPage?: number;
  prefetchPages?: number;
  cacheKey?: string;
  searchDebounceMs?: number;
}

interface SearchFilters {
  [key: string]: any;
}

interface PaginationResult<T> {
  data: T[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setPageSize: (size: number) => void;
  search: string;
  setSearch: (query: string) => void;
  filters: SearchFilters;
  setFilters: (filters: SearchFilters) => void;
  clearFilters: () => void;
  refresh: () => void;
  prefetchNextPage: () => void;
}

interface DataFetcher<T> {
  (params: {
    page: number;
    pageSize: number;
    search: string;
    filters: SearchFilters;
  }): Promise<{
    data: T[];
    totalItems: number;
  }>;
}

export function useOptimizedPagination<T>(
  fetcher: DataFetcher<T>,
  config: PaginationConfig
): PaginationResult<T> {
  const {
    pageSize: initialPageSize,
    initialPage = 0,
    prefetchPages = 1,
    cacheKey,
    searchDebounceMs = 300
  } = config;

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [search, setSearchState] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFiltersState] = useState<SearchFilters>({});

  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const prefetchTimeoutRef = useRef<NodeJS.Timeout>();

  // Debounce search input
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(0); // Reset to first page on search
    }, searchDebounceMs);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [search, searchDebounceMs]);

  // Generate cache key for current query
  const queryKey = useMemo(() => {
    const baseKey = cacheKey || 'pagination';
    return `${baseKey}:${currentPage}:${pageSize}:${debouncedSearch}:${JSON.stringify(filters)}`;
  }, [cacheKey, currentPage, pageSize, debouncedSearch, filters]);

  // Main data query
  const {
    data: queryResult,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      // Check cache first
      const cached = adminCache.get<{ data: T[]; totalItems: number }>(queryKey);
      if (cached) {
        return cached;
      }

      // Measure fetch performance
      const result = await adminPerformanceMonitor.measureOperation(
        'pagination-fetch',
        () => fetcher({
          page: currentPage,
          pageSize,
          search: debouncedSearch,
          filters
        }),
        {
          page: currentPage,
          pageSize,
          search: debouncedSearch,
          hasFilters: Object.keys(filters).length > 0
        }
      );

      // Cache the result
      adminCache.set(queryKey, result, 5 * 60 * 1000); // 5 minutes

      return result;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  const data = queryResult?.data || [];
  const totalItems = queryResult?.totalItems || 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  // Prefetch adjacent pages
  const prefetchNextPage = useCallback(() => {
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current);
    }

    prefetchTimeoutRef.current = setTimeout(async () => {
      const pagesToPrefetch = [];
      
      // Prefetch next pages
      for (let i = 1; i <= prefetchPages; i++) {
        const nextPage = currentPage + i;
        if (nextPage < totalPages) {
          pagesToPrefetch.push(nextPage);
        }
      }

      // Prefetch previous pages
      for (let i = 1; i <= prefetchPages; i++) {
        const prevPage = currentPage - i;
        if (prevPage >= 0) {
          pagesToPrefetch.push(prevPage);
        }
      }

      // Prefetch in parallel
      const prefetchPromises = pagesToPrefetch.map(async (page) => {
        const prefetchKey = cacheKey 
          ? `${cacheKey}:${page}:${pageSize}:${debouncedSearch}:${JSON.stringify(filters)}`
          : `pagination:${page}:${pageSize}:${debouncedSearch}:${JSON.stringify(filters)}`;

        if (!adminCache.has(prefetchKey)) {
          try {
            const result = await fetcher({
              page,
              pageSize,
              search: debouncedSearch,
              filters
            });
            adminCache.set(prefetchKey, result, 5 * 60 * 1000);
          } catch (error) {
            // Ignore prefetch errors
            console.debug(`Prefetch failed for page ${page}:`, error);
          }
        }
      });

      await Promise.allSettled(prefetchPromises);
    }, 100); // Small delay to avoid prefetching during rapid navigation
  }, [currentPage, totalPages, pageSize, debouncedSearch, filters, fetcher, cacheKey, prefetchPages]);

  // Auto-prefetch when page changes
  useEffect(() => {
    if (!isLoading && !isError) {
      prefetchNextPage();
    }
  }, [currentPage, prefetchNextPage, isLoading, isError]);

  // Navigation functions
  const goToPage = useCallback((page: number) => {
    if (page >= 0 && page < totalPages && page !== currentPage) {
      setCurrentPage(page);
    }
  }, [currentPage, totalPages]);

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const previousPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setCurrentPage(0); // Reset to first page when page size changes
    
    // Clear cache for old page size
    if (cacheKey) {
      adminCache.invalidatePattern(`${cacheKey}:.*`);
    }
  }, [cacheKey]);

  const setSearch = useCallback((query: string) => {
    setSearchState(query);
  }, []);

  const setFilters = useCallback((newFilters: SearchFilters) => {
    setFiltersState(newFilters);
    setCurrentPage(0); // Reset to first page when filters change
    
    // Clear cache when filters change
    if (cacheKey) {
      adminCache.invalidatePattern(`${cacheKey}:.*`);
    }
  }, [cacheKey]);

  const clearFilters = useCallback(() => {
    setFiltersState({});
    setSearchState('');
    setCurrentPage(0);
    
    // Clear cache when clearing filters
    if (cacheKey) {
      adminCache.invalidatePattern(`${cacheKey}:.*`);
    }
  }, [cacheKey]);

  const refresh = useCallback(() => {
    // Clear cache and refetch
    if (cacheKey) {
      adminCache.invalidatePattern(`${cacheKey}:.*`);
    }
    refetch();
  }, [cacheKey, refetch]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
      }
    };
  }, []);

  return {
    data,
    totalItems,
    totalPages,
    currentPage,
    pageSize,
    isLoading,
    isError,
    error: error as Error | null,
    hasNextPage: currentPage < totalPages - 1,
    hasPreviousPage: currentPage > 0,
    goToPage,
    nextPage,
    previousPage,
    setPageSize,
    search,
    setSearch,
    filters,
    setFilters,
    clearFilters,
    refresh,
    prefetchNextPage
  };
}

// Specialized hook for admin user pagination
export function useAdminUserPagination(fetcher: DataFetcher<any>) {
  return useOptimizedPagination(fetcher, {
    pageSize: 25,
    prefetchPages: 2,
    cacheKey: 'admin-users',
    searchDebounceMs: 400
  });
}

// Specialized hook for admin agent pagination
export function useAdminAgentPagination(fetcher: DataFetcher<any>) {
  return useOptimizedPagination(fetcher, {
    pageSize: 20,
    prefetchPages: 1,
    cacheKey: 'admin-agents',
    searchDebounceMs: 300
  });
}

// Specialized hook for audit log pagination
export function useAuditLogPagination(fetcher: DataFetcher<any>) {
  return useOptimizedPagination(fetcher, {
    pageSize: 50,
    prefetchPages: 1,
    cacheKey: 'admin-audit-logs',
    searchDebounceMs: 500
  });
}