import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApiService } from '../services/adminApiService';
import type { AdminDashboardMetrics, SystemStatistics } from '../types/admin';

export interface UseAdminDashboardReturn {
  // Data
  metrics: AdminDashboardMetrics | null;
  systemStats: SystemStatistics | null;
  
  // Loading states
  isLoading: boolean;
  isLoadingMetrics: boolean;
  isLoadingStats: boolean;
  
  // Error states
  error: string | null;
  metricsError: Error | null;
  statsError: Error | null;
  
  // Actions
  refetch: () => Promise<void>;
  refetchMetrics: () => Promise<void>;
  refetchStats: () => Promise<void>;
}

export const useAdminDashboard = (
  options: {
    refetchInterval?: number;
    enabled?: boolean;
  } = {}
): UseAdminDashboardReturn => {
  const { refetchInterval = 30000, enabled = true } = options;
  const queryClient = useQueryClient();

  // Query for dashboard metrics
  const {
    data: metricsResponse,
    isLoading: isLoadingMetrics,
    error: metricsError,
    refetch: refetchMetrics,
  } = useQuery({
    queryKey: ['admin', 'dashboard', 'metrics'],
    queryFn: async () => {
      const response = await adminApiService.getDashboardMetrics();
      return response;
    },
    refetchInterval,
    staleTime: 15000, // Consider data stale after 15 seconds
    enabled,
    retry: process.env.NODE_ENV === 'test' ? false : 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Query for system statistics
  const {
    data: statsResponse,
    isLoading: isLoadingStats,
    error: statsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['admin', 'system', 'stats'],
    queryFn: async () => {
      const response = await adminApiService.getSystemStats();
      return response;
    },
    refetchInterval: Math.max(refetchInterval, 60000), // At least 1 minute for system stats
    staleTime: 30000,
    enabled,
    retry: process.env.NODE_ENV === 'test' ? false : 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Extract data from API responses
  const metrics = metricsResponse?.data || null;
  const systemStats = statsResponse?.data || null;

  // Combined loading state
  const isLoading = isLoadingMetrics || isLoadingStats;

  // Combined error handling
  const error = (metricsError as Error)?.message || (statsError as Error)?.message || null;

  // Combined refetch function
  const refetch = async () => {
    await Promise.all([
      refetchMetrics(),
      refetchStats(),
    ]);
  };

  return {
    // Data
    metrics,
    systemStats,
    
    // Loading states
    isLoading,
    isLoadingMetrics,
    isLoadingStats,
    
    // Error states
    error,
    metricsError: metricsError as Error | null,
    statsError: statsError as Error | null,
    
    // Actions
    refetch,
    refetchMetrics,
    refetchStats,
  };
};

export default useAdminDashboard;