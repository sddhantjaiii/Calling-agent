import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { adminApiService } from '@/services/adminApiService';
import { AnalyticsFilters } from '@/components/admin/SystemAnalytics/AnalyticsDashboard';

export interface AdminAnalyticsData {
  users: {
    total: number;
    active: number;
    newThisMonth: number;
    growth: number;
    byTier: {
      free: number;
      pro: number;
      enterprise: number;
    };
  };
  agents: {
    total: number;
    active: number;
    growth: number;
    healthyPercentage: number;
    byType: {
      sales: number;
      support: number;
      survey: number;
    };
  };
  calls: {
    total: number;
    growth: number;
    successRate: number;
    averageDuration: number;
  };
  revenue: {
    total: number;
    monthly: number;
    growth: number;
  };
  system: {
    uptime: number;
    responseTime: number;
    errorRate: number;
    activeConnections: number;
  };
  usage?: Array<{
    date: string;
    users: number;
    calls: number;
    agents: number;
    revenue: number;
  }>;
  userTiers?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  agentTypes?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  hourlyUsage?: Array<{
    hour: string;
    calls: number;
    users: number;
  }>;
  alerts?: Array<{
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

export const useAdminAnalytics = (
  filters: AnalyticsFilters
): UseQueryResult<AdminAnalyticsData, Error> => {
  return useQuery({
    queryKey: ['admin', 'analytics', filters],
    queryFn: async () => {
      try {
        const response = await adminApiService.getSystemAnalytics(filters);
        // Extract data from the API response structure
        return response.data || response;
      } catch (error) {
        console.error('Failed to fetch admin analytics:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 30 * 1000, // 30 seconds for real-time updates
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useAdminRealtimeMetrics = () => {
  return useQuery({
    queryKey: ['admin', 'realtime-metrics'],
    queryFn: async () => {
      try {
        const response = await adminApiService.getRealtimeMetrics();
        return response;
      } catch (error) {
        console.error('Failed to fetch realtime metrics:', error);
        throw error;
      }
    },
    refetchInterval: 5 * 1000, // 5 seconds for real-time updates
    retry: 2,
    retryDelay: 1000,
  });
};

export const useAdminExportReport = () => {
  return {
    exportReport: async (reportConfig: any) => {
      try {
        const response = await adminApiService.exportReport(reportConfig);
        return response;
      } catch (error) {
        console.error('Failed to export report:', error);
        throw error;
      }
    }
  };
};