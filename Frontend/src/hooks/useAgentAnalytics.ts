import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/apiService';
import { queryKeys } from '../lib/queryClient';
import { useAuth } from '../contexts/AuthContext';
import type { ApiError } from '../types';

export interface UseAgentAnalyticsReturn {
  // Data
  overview: any;
  metrics: any;
  callOutcomes: any;
  trends: any;
  targets: any;
  comparison: any;
  ranking: any;
  realtimeStats: any;
  
  // Loading states
  loadingOverview: boolean;
  loadingMetrics: boolean;
  loadingCallOutcomes: boolean;
  loadingTrends: boolean;
  loadingTargets: boolean;
  loadingComparison: boolean;
  loadingRanking: boolean;
  loadingRealtimeStats: boolean;
  
  // Error states
  error: string | null;
  
  // Actions
  refreshOverview: (agentId: string, params?: { dateFrom?: string; dateTo?: string }) => Promise<void>;
  refreshMetrics: (agentId: string, params?: { dateFrom?: string; dateTo?: string; period?: string }) => Promise<void>;
  refreshCallOutcomes: (agentId: string, params?: { dateFrom?: string; dateTo?: string }) => Promise<void>;
  refreshTrends: (agentId: string, params?: { dateFrom?: string; dateTo?: string; granularity?: string }) => Promise<void>;
  refreshTargets: (agentId: string) => Promise<void>;
  setTargets: (agentId: string, targets: any) => Promise<boolean>;
  updateTargets: (agentId: string, targetId: string, targets: any) => Promise<boolean>;
  refreshComparison: (agentId: string, params?: { compareWith?: string[]; dateFrom?: string; dateTo?: string }) => Promise<void>;
  refreshRanking: (agentId: string, params?: { metric?: string; dateFrom?: string; dateTo?: string }) => Promise<void>;
  refreshRealtimeStats: (agentId: string) => Promise<void>;
  clearError: () => void;
}

export const useAgentAnalytics = (agentId?: string): UseAgentAnalyticsReturn => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Helper function to validate user context and agent ID
  const validateContext = (currentAgentId: string): void => {
    if (!user) {
      throw new Error('User must be authenticated to access agent analytics');
    }

    if (!currentAgentId) {
      throw new Error('Agent ID is required for analytics');
    }

    // Basic UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(currentAgentId)) {
      throw new Error('Invalid agent ID format');
    }
  };

  // Helper function to handle API errors
  const handleError = (error: unknown, operation: string): string => {
    console.error(`Error in agent analytics ${operation}:`, error);
    
    let errorMessage = `Failed to ${operation}`;
    
    if (error instanceof Error) {
      const apiError = error as ApiError;
      if (apiError.code === 'UNAUTHORIZED') {
        errorMessage = 'Your session has expired. Please log in again to continue.';
      } else if (apiError.code === 'AGENT_ACCESS_DENIED' || apiError.code === 'FORBIDDEN') {
        errorMessage = 'Access denied. You can only view analytics for your own agents.';
      } else if (apiError.code === 'AGENT_NOT_FOUND' || apiError.code === 'NOT_FOUND') {
        errorMessage = 'The requested agent was not found or you do not have permission to access its analytics.';
      } else if (apiError.code === 'VALIDATION_ERROR') {
        errorMessage = apiError.message || 'The provided data is invalid. Please check your input and try again.';
      } else if (apiError.code === 'NETWORK_ERROR') {
        errorMessage = 'Network connection error. Please check your internet connection and try again.';
      } else if (apiError.code === 'RATE_LIMITED') {
        errorMessage = 'Too many requests. Please wait a moment before trying again.';
      } else {
        errorMessage = apiError.message || errorMessage;
      }
    }
    
    return errorMessage;
  };

  // Query for agent overview
  const {
    data: overview = null,
    isLoading: loadingOverview,
    error: overviewError,
    refetch: refetchOverview,
  } = useQuery({
    queryKey: [...queryKeys.agents(user?.id), agentId, 'overview'],
    queryFn: async () => {
      if (!agentId) return null;
      validateContext(agentId);
      const response = await apiService.getAgentOverview(agentId);
      return response.data || response;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!user && !!agentId,
  });

  // Query for agent metrics
  const {
    data: metrics = null,
    isLoading: loadingMetrics,
    error: metricsError,
    refetch: refetchMetrics,
  } = useQuery({
    queryKey: [...queryKeys.agents(user?.id), agentId, 'metrics'],
    queryFn: async () => {
      if (!agentId) return null;
      validateContext(agentId);
      const response = await apiService.getAgentMetrics(agentId);
      return response.data || response;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!user && !!agentId,
  });

  // Query for call outcomes
  const {
    data: callOutcomes = null,
    isLoading: loadingCallOutcomes,
    error: callOutcomesError,
    refetch: refetchCallOutcomes,
  } = useQuery({
    queryKey: [...queryKeys.agents(user?.id), agentId, 'call-outcomes'],
    queryFn: async () => {
      if (!agentId) return null;
      validateContext(agentId);
      const response = await apiService.getAgentCallOutcomes(agentId);
      return response.data || response;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!user && !!agentId,
  });

  // Query for performance trends
  const {
    data: trends = null,
    isLoading: loadingTrends,
    error: trendsError,
    refetch: refetchTrends,
  } = useQuery({
    queryKey: [...queryKeys.agents(user?.id), agentId, 'trends'],
    queryFn: async () => {
      if (!agentId) return null;
      validateContext(agentId);
      const response = await apiService.getAgentPerformanceTrends(agentId);
      return response.data || response;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - trends change less frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!user && !!agentId,
  });

  // Query for agent targets
  const {
    data: targets = null,
    isLoading: loadingTargets,
    error: targetsError,
    refetch: refetchTargets,
  } = useQuery({
    queryKey: [...queryKeys.agents(user?.id), agentId, 'targets'],
    queryFn: async () => {
      if (!agentId) return null;
      validateContext(agentId);
      const response = await apiService.getAgentTargets(agentId);
      return response.data || response;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - targets change infrequently
    gcTime: 30 * 60 * 1000, // 30 minutes
    enabled: !!user && !!agentId,
  });

  // Query for agent comparison
  const {
    data: comparison = null,
    isLoading: loadingComparison,
    error: comparisonError,
    refetch: refetchComparison,
  } = useQuery({
    queryKey: [...queryKeys.agents(user?.id), agentId, 'comparison'],
    queryFn: async () => {
      if (!agentId) return null;
      validateContext(agentId);
      const response = await apiService.getAgentComparison(agentId);
      return response.data || response;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!user && !!agentId,
  });

  // Query for agent ranking
  const {
    data: ranking = null,
    isLoading: loadingRanking,
    error: rankingError,
    refetch: refetchRanking,
  } = useQuery({
    queryKey: [...queryKeys.agents(user?.id), agentId, 'ranking'],
    queryFn: async () => {
      if (!agentId) return null;
      validateContext(agentId);
      const response = await apiService.getAgentRanking(agentId);
      return response.data || response;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!user && !!agentId,
  });

  // Query for realtime stats
  const {
    data: realtimeStats = null,
    isLoading: loadingRealtimeStats,
    error: realtimeStatsError,
    refetch: refetchRealtimeStats,
  } = useQuery({
    queryKey: [...queryKeys.agents(user?.id), agentId, 'realtime'],
    queryFn: async () => {
      if (!agentId) return null;
      validateContext(agentId);
      const response = await apiService.getAgentRealtimeStats(agentId);
      return response.data || response;
    },
    staleTime: 30 * 1000, // 30 seconds - realtime data
    gcTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!user && !!agentId,
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
  });

  // Mutations for setting and updating targets
  const setTargetsMutation = useMutation({
    mutationFn: async ({ agentId: mutationAgentId, targets }: { agentId: string; targets: any }) => {
      validateContext(mutationAgentId);
      const response = await apiService.setAgentTargets(mutationAgentId, targets);
      return response.data || response;
    },
    onSuccess: () => {
      // Invalidate targets query to refresh data
      queryClient.invalidateQueries({ queryKey: [...queryKeys.agents(user?.id), agentId, 'targets'] });
    },
  });

  const updateTargetsMutation = useMutation({
    mutationFn: async ({ agentId: mutationAgentId, targetId, targets }: { agentId: string; targetId: string; targets: any }) => {
      validateContext(mutationAgentId);
      const response = await apiService.updateAgentTargets(mutationAgentId, targetId, targets);
      return response.data || response;
    },
    onSuccess: () => {
      // Invalidate targets query to refresh data
      queryClient.invalidateQueries({ queryKey: [...queryKeys.agents(user?.id), agentId, 'targets'] });
    },
  });

  // Action functions
  const refreshOverview = async (currentAgentId: string, params?: { dateFrom?: string; dateTo?: string }): Promise<void> => {
    queryClient.invalidateQueries({ queryKey: [...queryKeys.agents(user?.id), currentAgentId, 'overview'] });
  };

  const refreshMetrics = async (currentAgentId: string, params?: { dateFrom?: string; dateTo?: string; period?: string }): Promise<void> => {
    queryClient.invalidateQueries({ queryKey: [...queryKeys.agents(user?.id), currentAgentId, 'metrics'] });
  };

  const refreshCallOutcomes = async (currentAgentId: string, params?: { dateFrom?: string; dateTo?: string }): Promise<void> => {
    queryClient.invalidateQueries({ queryKey: [...queryKeys.agents(user?.id), currentAgentId, 'call-outcomes'] });
  };

  const refreshTrends = async (currentAgentId: string, params?: { dateFrom?: string; dateTo?: string; granularity?: string }): Promise<void> => {
    queryClient.invalidateQueries({ queryKey: [...queryKeys.agents(user?.id), currentAgentId, 'trends'] });
  };

  const refreshTargets = async (currentAgentId: string): Promise<void> => {
    queryClient.invalidateQueries({ queryKey: [...queryKeys.agents(user?.id), currentAgentId, 'targets'] });
  };

  const setTargets = async (currentAgentId: string, targets: any): Promise<boolean> => {
    try {
      await setTargetsMutation.mutateAsync({ agentId: currentAgentId, targets });
      return true;
    } catch (error) {
      handleError(error, 'set agent targets');
      return false;
    }
  };

  const updateTargets = async (currentAgentId: string, targetId: string, targets: any): Promise<boolean> => {
    try {
      await updateTargetsMutation.mutateAsync({ agentId: currentAgentId, targetId, targets });
      return true;
    } catch (error) {
      handleError(error, 'update agent targets');
      return false;
    }
  };

  const refreshComparison = async (currentAgentId: string, params?: { compareWith?: string[]; dateFrom?: string; dateTo?: string }): Promise<void> => {
    queryClient.invalidateQueries({ queryKey: [...queryKeys.agents(user?.id), currentAgentId, 'comparison'] });
  };

  const refreshRanking = async (currentAgentId: string, params?: { metric?: string; dateFrom?: string; dateTo?: string }): Promise<void> => {
    queryClient.invalidateQueries({ queryKey: [...queryKeys.agents(user?.id), currentAgentId, 'ranking'] });
  };

  const refreshRealtimeStats = async (currentAgentId: string): Promise<void> => {
    queryClient.invalidateQueries({ queryKey: [...queryKeys.agents(user?.id), currentAgentId, 'realtime'] });
  };

  const clearError = (): void => {
    // Clear query errors without triggering refetch
    const queryKeys = [
      [...queryKeys.agents(user?.id), agentId, 'overview'],
      [...queryKeys.agents(user?.id), agentId, 'metrics'],
      [...queryKeys.agents(user?.id), agentId, 'call-outcomes'],
      [...queryKeys.agents(user?.id), agentId, 'trends'],
      [...queryKeys.agents(user?.id), agentId, 'targets'],
      [...queryKeys.agents(user?.id), agentId, 'comparison'],
      [...queryKeys.agents(user?.id), agentId, 'ranking'],
      [...queryKeys.agents(user?.id), agentId, 'realtime'],
    ];

    queryKeys.forEach(key => {
      queryClient.setQueryData(key, (oldData: any) => oldData);
    });
  };

  // Determine the primary error to display
  const primaryError = overviewError || metricsError || callOutcomesError || trendsError || 
                      targetsError || comparisonError || rankingError || realtimeStatsError;

  return {
    // Data
    overview,
    metrics,
    callOutcomes,
    trends,
    targets,
    comparison,
    ranking,
    realtimeStats,
    
    // Loading states
    loadingOverview,
    loadingMetrics,
    loadingCallOutcomes,
    loadingTrends,
    loadingTargets,
    loadingComparison,
    loadingRanking,
    loadingRealtimeStats,
    
    // Error states
    error: primaryError ? handleError(primaryError, 'load agent analytics') : null,
    
    // Actions
    refreshOverview,
    refreshMetrics,
    refreshCallOutcomes,
    refreshTrends,
    refreshTargets,
    setTargets,
    updateTargets,
    refreshComparison,
    refreshRanking,
    refreshRealtimeStats,
    clearError,
  };
};

export default useAgentAnalytics;