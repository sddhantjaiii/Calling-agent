import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useAdminAnalytics, useAdminRealtimeMetrics, useAdminExportReport } from '../useAdminAnalytics';
import { adminApiService } from '@/services/adminApiService';

// Mock the admin API service
vi.mock('@/services/adminApiService');

const mockAnalyticsData = {
  users: {
    total: 1000,
    active: 800,
    newThisMonth: 50,
    growth: 10,
    byTier: { free: 600, pro: 300, enterprise: 100 }
  },
  agents: {
    total: 500,
    active: 400,
    growth: 15,
    healthyPercentage: 95,
    byType: { sales: 200, support: 200, survey: 100 }
  },
  calls: {
    total: 10000,
    growth: 20,
    successRate: 92,
    averageDuration: 180
  },
  revenue: {
    total: 50000,
    monthly: 8000,
    growth: 25
  },
  system: {
    uptime: 99.9,
    responseTime: 45,
    errorRate: 0.2,
    activeConnections: 150
  }
};

const mockRealtimeData = {
  activeUsers: 75,
  activeCalls: 12,
  systemLoad: 45.2,
  responseTime: 52
};

describe('useAdminAnalytics', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.mocked(adminApiService.getSystemAnalytics).mockResolvedValue(mockAnalyticsData);
    vi.mocked(adminApiService.getRealtimeMetrics).mockResolvedValue(mockRealtimeData);
    vi.mocked(adminApiService.exportReport).mockResolvedValue(new Blob());
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('fetches analytics data successfully', async () => {
    const filters = {
      dateRange: {
        from: new Date('2024-01-01'),
        to: new Date('2024-01-31')
      }
    };

    const { result } = renderHook(() => useAdminAnalytics(filters), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockAnalyticsData);
    expect(result.current.error).toBeNull();
    expect(adminApiService.getSystemAnalytics).toHaveBeenCalledWith(filters);
  });

  it('handles analytics data fetch error', async () => {
    const error = new Error('Failed to fetch analytics');
    vi.mocked(adminApiService.getSystemAnalytics).mockRejectedValue(error);

    const filters = {
      dateRange: {
        from: new Date('2024-01-01'),
        to: new Date('2024-01-31')
      }
    };

    const { result } = renderHook(() => useAdminAnalytics(filters), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toEqual(error);
  });

  it('refetches data when filters change', async () => {
    const initialFilters = {
      dateRange: {
        from: new Date('2024-01-01'),
        to: new Date('2024-01-31')
      }
    };

    const { result, rerender } = renderHook(
      ({ filters }) => useAdminAnalytics(filters),
      { 
        wrapper,
        initialProps: { filters: initialFilters }
      }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(adminApiService.getSystemAnalytics).toHaveBeenCalledTimes(1);

    // Change filters
    const newFilters = {
      dateRange: {
        from: new Date('2024-02-01'),
        to: new Date('2024-02-28')
      },
      userTier: 'pro'
    };

    rerender({ filters: newFilters });

    await waitFor(() => {
      expect(adminApiService.getSystemAnalytics).toHaveBeenCalledTimes(2);
    });

    expect(adminApiService.getSystemAnalytics).toHaveBeenLastCalledWith(newFilters);
  });

  it('uses correct query key for caching', () => {
    const filters = {
      dateRange: {
        from: new Date('2024-01-01'),
        to: new Date('2024-01-31')
      }
    };

    renderHook(() => useAdminAnalytics(filters), { wrapper });

    // Check that the query was registered with the correct key
    const queries = queryClient.getQueryCache().getAll();
    const analyticsQuery = queries.find(query => 
      query.queryKey[0] === 'admin' && 
      query.queryKey[1] === 'analytics'
    );

    expect(analyticsQuery).toBeDefined();
    expect(analyticsQuery?.queryKey).toEqual(['admin', 'analytics', filters]);
  });

  it('has correct stale time and refetch interval', () => {
    const filters = {
      dateRange: {
        from: new Date('2024-01-01'),
        to: new Date('2024-01-31')
      }
    };

    renderHook(() => useAdminAnalytics(filters), { wrapper });

    const queries = queryClient.getQueryCache().getAll();
    const analyticsQuery = queries.find(query => 
      query.queryKey[0] === 'admin' && 
      query.queryKey[1] === 'analytics'
    );

    expect(analyticsQuery?.options.staleTime).toBe(5 * 60 * 1000); // 5 minutes
    expect(analyticsQuery?.options.refetchInterval).toBe(30 * 1000); // 30 seconds
  });
});

describe('useAdminRealtimeMetrics', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.mocked(adminApiService.getRealtimeMetrics).mockResolvedValue(mockRealtimeData);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('fetches realtime metrics successfully', async () => {
    const { result } = renderHook(() => useAdminRealtimeMetrics(), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockRealtimeData);
    expect(result.current.error).toBeNull();
    expect(adminApiService.getRealtimeMetrics).toHaveBeenCalled();
  });

  it('handles realtime metrics fetch error', async () => {
    const error = new Error('Failed to fetch realtime metrics');
    vi.mocked(adminApiService.getRealtimeMetrics).mockRejectedValue(error);

    const { result } = renderHook(() => useAdminRealtimeMetrics(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toEqual(error);
  });

  it('has correct refetch interval for real-time updates', () => {
    renderHook(() => useAdminRealtimeMetrics(), { wrapper });

    const queries = queryClient.getQueryCache().getAll();
    const realtimeQuery = queries.find(query => 
      query.queryKey[0] === 'admin' && 
      query.queryKey[1] === 'realtime-metrics'
    );

    expect(realtimeQuery?.options.refetchInterval).toBe(5 * 1000); // 5 seconds
  });
});

describe('useAdminExportReport', () => {
  beforeEach(() => {
    vi.mocked(adminApiService.exportReport).mockResolvedValue(new Blob());
  });

  it('exports report successfully', async () => {
    const { result } = renderHook(() => useAdminExportReport());

    const reportConfig = {
      name: 'Test Report',
      format: 'pdf',
      metrics: ['users_total', 'agents_total']
    };

    const exportResult = await result.current.exportReport(reportConfig);

    expect(exportResult).toBeInstanceOf(Blob);
    expect(adminApiService.exportReport).toHaveBeenCalledWith(reportConfig);
  });

  it('handles export error', async () => {
    const error = new Error('Export failed');
    vi.mocked(adminApiService.exportReport).mockRejectedValue(error);

    const { result } = renderHook(() => useAdminExportReport());

    const reportConfig = {
      name: 'Test Report',
      format: 'pdf',
      metrics: ['users_total']
    };

    await expect(result.current.exportReport(reportConfig)).rejects.toThrow('Export failed');
  });
});

describe('Error handling and retry logic', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('retries failed requests with exponential backoff', async () => {
    // Enable retry for this test
    queryClient.setDefaultOptions({
      queries: { retry: 3, retryDelay: 100 }
    });

    const error = new Error('Network error');
    vi.mocked(adminApiService.getSystemAnalytics)
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(mockAnalyticsData);

    const filters = {
      dateRange: {
        from: new Date('2024-01-01'),
        to: new Date('2024-01-31')
      }
    };

    const { result } = renderHook(() => useAdminAnalytics(filters), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 5000 });

    expect(result.current.data).toEqual(mockAnalyticsData);
    expect(adminApiService.getSystemAnalytics).toHaveBeenCalledTimes(3);
  });

  it('logs errors appropriately', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('API error');
    vi.mocked(adminApiService.getSystemAnalytics).mockRejectedValue(error);

    const filters = {
      dateRange: {
        from: new Date('2024-01-01'),
        to: new Date('2024-01-31')
      }
    };

    const { result } = renderHook(() => useAdminAnalytics(filters), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch admin analytics:', error);
    
    consoleSpy.mockRestore();
  });
});