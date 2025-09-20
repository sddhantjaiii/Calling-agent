import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/apiService';
import { queryKeys, cacheUtils } from '../lib/queryClient';
import { useAuth } from '../contexts/AuthContext';
import { useDataAccessSecurity } from './useDataAccessSecurity';
import { dataFlowDebugger } from '../utils/dataFlowDebugger';
import { validateDashboardOverview, validateDashboardAnalytics, detectMockData } from '../utils/typeValidation';
import { logApiResponseError, logMockDataDetected } from '../utils/errorLogger';
import type {
  DashboardOverview,
  DashboardAnalytics,
  AnalyticsMetrics,
  CallVolumeData,
  LeadTrendsData,
  CTATrendsData,
  TopPerformingAgents,
  ApiError
} from '../types';

export interface UseDashboardReturn {
  // Data
  overview: DashboardOverview | null;
  analytics: DashboardAnalytics | null;
  metrics: AnalyticsMetrics | null;
  callVolumeData: CallVolumeData | null;
  leadTrendsData: LeadTrendsData | null;
  ctaTrendsData: CTATrendsData | null;
  topAgents: TopPerformingAgents | null;

  // Loading states
  loading: boolean;
  loadingOverview: boolean;
  loadingAnalytics: boolean;
  loadingMetrics: boolean;
  refreshing: boolean;

  // Error states
  error: string | null;

  // Metadata
  lastRefresh: Date | null;

  // Actions
  refreshOverview: () => Promise<void>;
  refreshAnalytics: () => Promise<void>;
  refreshMetrics: (params?: { dateFrom?: string; dateTo?: string }) => Promise<void>;
  loadCallVolumeData: (params?: { dateFrom?: string; dateTo?: string; groupBy?: 'day' | 'week' | 'month' }) => Promise<void>;
  loadLeadTrends: (params?: { dateFrom?: string; dateTo?: string; groupBy?: 'day' | 'week' | 'month' }) => Promise<void>;
  loadCTATrends: (params?: { dateFrom?: string; dateTo?: string; groupBy?: 'day' | 'week' | 'month' }) => Promise<void>;
  loadTopAgents: (params?: { dateFrom?: string; dateTo?: string; limit?: number }) => Promise<void>;
  refreshAll: () => Promise<void>;
  clearError: () => void;
  setAutoRefresh: (enabled: boolean) => void;
}

export const useDashboard = (autoRefresh: boolean = false, refreshInterval: number = 300000): UseDashboardReturn => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const {
    validateUserAuthentication,
    validateDataOwnership,
    handleSecurityViolation,
  } = useDataAccessSecurity({
    onUnauthorizedAccess: () => {
      console.error('Unauthorized access attempt in useDashboard hook');
    },
    onDataIntegrityViolation: (details) => {
      console.error('Data integrity violation in useDashboard hook:', details);
    },
  });

  // Clear any existing analytics queries to prevent infinite calls
  React.useEffect(() => {
    if (user?.id) {
      queryClient.removeQueries({ queryKey: queryKeys.dashboardAnalytics(user.id) });
      queryClient.cancelQueries({ queryKey: queryKeys.dashboardAnalytics(user.id) });
      console.log('Cleared analytics queries to prevent infinite calls');
    }
  }, [queryClient, user?.id]);

  // Helper function to handle API errors
  const handleError = (error: unknown, operation: string): string => {
    console.error(`Error in ${operation}:`, error);

    let errorMessage = `Failed to ${operation}`;

    if (error instanceof Error) {
      const apiError = error as ApiError;
      if (apiError.code === 'UNAUTHORIZED') {
        errorMessage = 'Session expired. Please log in again.';
      } else if (apiError.code === 'NETWORK_ERROR') {
        errorMessage = 'Network error. Please check your connection.';
      } else {
        errorMessage = apiError.message || errorMessage;
      }
    }

    return errorMessage;
  };

  // Query for dashboard overview with caching
  const {
    data: overview = null,
    isLoading: loadingOverview,
    error: overviewError,
    refetch: refetchOverview,
  } = useQuery({
    queryKey: queryKeys.dashboardOverview(user?.id),
    queryFn: async () => {
      // Validate user context before making API call
      validateUserAuthentication();
      
      const response = await apiService.getDashboardOverview();

      // Log the raw API response with validation
      dataFlowDebugger.logHookData('useDashboard.overview', response);

      // Validate response structure - validate the data property, not the entire response
      const dataToValidate = response.success && response.data ? response.data : response;
      const validation = validateDashboardOverview(dataToValidate);
      if (!validation.isValid) {
        logApiResponseError(
          'useDashboard.overview',
          '/api/dashboard/overview',
          'DashboardOverview',
          dataToValidate,
          validation.errors
        );
      }

      // Backend returns { success: true, data: overviewData }
      if (response.success && response.data) {
        const data = response.data as DashboardOverview;

        // Validate that dashboard data belongs to current user
        validateDataOwnership(data, 'Dashboard Overview');

        // Check for mock data
        const mockDetection = detectMockData(data);
        if (mockDetection.isMock) {
          logMockDataDetected('useDashboard.overview', 'Dashboard Overview Data', mockDetection.reasons);
        }

        dataFlowDebugger.logHookData('useDashboard.overview.processed', data, false, 'Extract data from success wrapper');
        return data;
      }
      // Fallback for direct response
      const fallbackData = response.data || response as unknown as DashboardOverview;
      
      // Validate fallback data as well
      validateDataOwnership(fallbackData, 'Dashboard Overview');
      
      dataFlowDebugger.logHookData('useDashboard.overview.fallback', fallbackData, true, 'Direct response fallback');
      return fallbackData;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - dashboard data changes frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: false, // Completely disable auto-refresh
    refetchOnMount: true, // Allow initial load
    refetchOnWindowFocus: false, // Disable refetch on window focus
    refetchOnReconnect: false, // Disable refetch on reconnect
    retry: 0, // Disable retries to prevent rate limiting
    retryDelay: 5000, // Fixed delay if retries are enabled
    enabled: !!user, // Only run query when user is authenticated
  });

  // Re-enabled analytics query with strict safeguards
  const {
    data: analytics = null,
    isLoading: loadingAnalytics,
    error: analyticsError,
    refetch: refetchAnalytics,
  } = useQuery({
    queryKey: queryKeys.dashboardAnalytics(user?.id),
    queryFn: async () => {
      // Validate user context before making API call
      validateUserAuthentication();
      
      console.log('Analytics query executing...');
      const response = await apiService.getDashboardAnalytics();

      // Log the raw API response with validation
      dataFlowDebugger.logHookData('useDashboard.analytics', response);

      // Validate response structure - validate the data property, not the entire response
      const dataToValidate = response.success && response.data ? response.data : response;
      const validation = validateDashboardAnalytics(dataToValidate);
      if (!validation.isValid) {
        logApiResponseError(
          'useDashboard.analytics',
          '/api/dashboard/analytics',
          'DashboardAnalytics',
          dataToValidate,
          validation.errors
        );
      }

      // Backend returns { success: true, data: analyticsData }
      if (response.success && response.data) {
        const data = response.data as DashboardAnalytics;

        // Validate that analytics data belongs to current user
        validateDataOwnership(data, 'Dashboard Analytics');

        // Check for mock data in analytics
        const mockDetection = detectMockData(data);
        if (mockDetection.isMock) {
          logMockDataDetected('useDashboard.analytics', 'Dashboard Analytics Data', mockDetection.reasons);
        }

        dataFlowDebugger.logHookData('useDashboard.analytics.processed', data, false, 'Extract data from success wrapper');
        return data;
      }
      // Fallback for direct response
      const fallbackData = response.data || response as unknown as DashboardAnalytics;
      
      // Validate fallback data as well
      validateDataOwnership(fallbackData, 'Dashboard Analytics');
      
      dataFlowDebugger.logHookData('useDashboard.analytics.fallback', fallbackData, true, 'Direct response fallback');
      return fallbackData;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - longer stale time to prevent frequent refetches
    gcTime: 30 * 60 * 1000, // 30 minutes - longer cache time
    refetchInterval: false, // Never auto-refresh
    refetchOnMount: true, // Changed from 'always' to true to prevent excessive refetches
    refetchOnWindowFocus: false, // Never refetch on focus
    refetchOnReconnect: false, // Never refetch on reconnect
    retry: 0, // Disable retries to prevent rate limiting
    retryDelay: 5000, // Fixed delay if retries are enabled
    enabled: !!user, // Only run query when user is authenticated
  });

  // Query for dashboard metrics (optional, with parameters)
  const {
    data: metrics = null,
    isLoading: loadingMetrics,
    error: metricsError,
  } = useQuery({
    queryKey: [...queryKeys.dashboardAnalytics(user?.id), 'metrics'],
    queryFn: async () => {
      // Validate user context before making API call
      validateUserAuthentication();
      
      const response = await apiService.getDashboardMetrics();
      const metricsData = response.data || response as unknown as AnalyticsMetrics;
      
      // Validate that metrics data belongs to current user
      validateDataOwnership(metricsData, 'Dashboard Metrics');
      
      return metricsData;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    enabled: false, // Only fetch when explicitly requested
  });

  // Calculate loading and error states
  const loading = loadingOverview && loadingAnalytics;
  const refreshing = isRefreshing; // Track manual refresh state
  const error = overviewError ? handleError(overviewError, 'load dashboard overview') :
    analyticsError ? handleError(analyticsError, 'load dashboard analytics') :
      metricsError ? handleError(metricsError, 'load dashboard metrics') : null;

  // Action functions
  const refreshOverview = React.useCallback(async (): Promise<void> => {
    // Validate user context before refreshing
    validateUserAuthentication();
    
    await refetchOverview();
  }, [refetchOverview, validateUserAuthentication]);

  const refreshAnalytics = React.useCallback(async (): Promise<void> => {
    // Validate user context before refreshing
    validateUserAuthentication();
    
    if (isRefreshing) {
      console.log('Analytics refresh already in progress, skipping...');
      return;
    }

    setIsRefreshing(true);
    try {
      await refetchAnalytics();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchAnalytics, isRefreshing, validateUserAuthentication]);

  const refreshMetrics = async (params?: { dateFrom?: string; dateTo?: string }): Promise<void> => {
    // Validate user context before refreshing metrics
    validateUserAuthentication();
    
    // Invalidate metrics query with new parameters
    queryClient.invalidateQueries({ queryKey: [...queryKeys.dashboardAnalytics(user?.id), 'metrics', params] });
  };

  const loadCallVolumeData = async (params?: { dateFrom?: string; dateTo?: string; groupBy?: 'day' | 'week' | 'month' }): Promise<void> => {
    // This would typically be handled by a separate query
    console.log('Loading call volume data with params:', params);
  };

  const loadLeadTrends = async (params?: { dateFrom?: string; dateTo?: string; groupBy?: 'day' | 'week' | 'month' }): Promise<void> => {
    // This would typically be handled by a separate query
    console.log('Loading lead trends with params:', params);
  };

  const loadCTATrends = async (params?: { dateFrom?: string; dateTo?: string; groupBy?: 'day' | 'week' | 'month' }): Promise<void> => {
    // This would typically be handled by a separate query
    console.log('Loading CTA trends with params:', params);
  };

  const loadTopAgents = async (params?: { dateFrom?: string; dateTo?: string; limit?: number }): Promise<void> => {
    // This would typically be handled by a separate query
    console.log('Loading top agents with params:', params);
  };

  const refreshAll = async (): Promise<void> => {
    // Validate user context before refreshing all data
    validateUserAuthentication();
    
    cacheUtils.invalidateDashboard(user?.id);
  };

  const clearError = (): void => {
    // Clear query errors without triggering refetch to prevent infinite loops
    queryClient.setQueryData(queryKeys.dashboardOverview(user?.id), (oldData: DashboardOverview | null | undefined) => oldData);
    queryClient.setQueryData(queryKeys.dashboardAnalytics(user?.id), (oldData: DashboardAnalytics | null | undefined) => oldData);
  };

  const setAutoRefresh = (enabled: boolean): void => {
    // This would typically control the refetch interval
    // No-op for now since auto-refresh is disabled
  };

  return {
    // Data
    overview,
    analytics,
    metrics,
    callVolumeData: null, // These would be separate queries in a full implementation
    leadTrendsData: null,
    ctaTrendsData: null,
    topAgents: null,

    // Loading states
    loading,
    loadingOverview,
    loadingAnalytics,
    loadingMetrics,
    refreshing,

    // Error states
    error,

    // Metadata
    lastRefresh: new Date(), // React Query handles this internally

    // Actions
    refreshOverview,
    refreshAnalytics,
    refreshMetrics,
    loadCallVolumeData,
    loadLeadTrends,
    loadCTATrends,
    loadTopAgents,
    refreshAll,
    clearError,
    setAutoRefresh,
  };
};

export default useDashboard;