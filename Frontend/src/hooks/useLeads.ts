import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/apiService';
import { queryKeys } from '../lib/queryClient';
import { useAuth } from '../contexts/AuthContext';
import { dataFlowDebugger } from '../utils/dataFlowDebugger';
import { validateLead, validateLeadProfile, detectMockData } from '../utils/typeValidation';
import type {
  Lead,
  LeadProfile,
  LeadAnalyticsData,
  ApiError
} from '../types';

export interface LeadFilters {
  search?: string;
  leadType?: string;
  businessType?: string;
  leadTag?: 'Hot' | 'Warm' | 'Cold';
  platform?: string;
  agent?: string;
  startDate?: Date;
  endDate?: Date;
  engagementLevel?: string;
  intentLevel?: string;
}

export interface LeadListOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'interactionDate' | 'leadTag' | 'engagementLevel' | 'intentLevel';
  sortOrder?: 'asc' | 'desc';
}

export interface UseLeadsReturn {
  // Data
  leads: Lead[];
  currentLead: Lead | null;
  leadProfile: LeadProfile | null;
  analytics: LeadAnalyticsData | null;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
    currentPage: number;
    totalPages: number;
  } | null;

  // Loading states
  loading: boolean;
  loadingLead: boolean;
  loadingProfile: boolean;
  loadingAnalytics: boolean;

  // Error states
  error: string | null;

  // Actions
  refreshLeads: (options?: LeadListOptions) => Promise<void>;
  loadLead: (id: string) => Promise<Lead | null>;
  loadLeadProfile: (id: string) => Promise<LeadProfile | null>;
  loadLeadTimeline: (id: string) => Promise<any>;
  loadAnalytics: () => Promise<void>;
  filterLeads: (filters: LeadFilters, options?: LeadListOptions) => Promise<void>;
  loadLeadsWithPagination: (page?: number, limit?: number, sortBy?: string, sortOrder?: 'asc' | 'desc') => Promise<void>;
  loadNextPage: (currentPage: number, limit?: number) => Promise<void>;
  loadPreviousPage: (currentPage: number, limit?: number) => Promise<void>;
  clearCurrentLead: () => void;
  clearError: () => void;
}

export const useLeads = (initialOptions?: LeadListOptions): UseLeadsReturn => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Helper function to handle API errors
  const handleError = (error: unknown, operation: string): string => {
    console.error(`Error in ${operation}:`, error);

    let errorMessage = `Failed to ${operation}`;

    if (error instanceof Error) {
      const apiError = error as ApiError;
      if (apiError.code === 'UNAUTHORIZED') {
        errorMessage = 'Session expired. Please log in again.';
      } else if (apiError.code === 'NOT_FOUND') {
        errorMessage = 'Requested data not found';
      } else if (apiError.code === 'NETWORK_ERROR') {
        errorMessage = 'Network error. Please check your connection.';
      } else {
        errorMessage = apiError.message || errorMessage;
      }
    }

    return errorMessage;
  };

  // Query for leads with caching
  const {
    data: leadsData,
    isLoading: loading,
    error: leadsError,
    refetch: refetchLeads,
  } = useQuery({
    queryKey: [...queryKeys.leads(user?.id), initialOptions],
    queryFn: async () => {
      const response = await apiService.getLeads();

      // Log the raw API response
      dataFlowDebugger.logHookData('useLeads.getLeads', response);

      // Backend returns { success: true, data: Lead[], pagination: {...} }
      if (response.success && response.data) {
        let leadsData: Lead[] = [];
        let paginationData = null;

        if (Array.isArray(response.data)) {
          leadsData = response.data as Lead[];
          paginationData = (response as any).pagination || null;
        } else if (typeof response.data === 'object' && 'data' in response.data) {
          const responseData = response.data as { data: Lead[]; pagination: any };
          leadsData = responseData.data;
          paginationData = responseData.pagination;
        }

        // Validate leads data structure
        if (leadsData.length > 0) {
          const validation = validateLead(leadsData[0]);
          if (!validation.isValid) {
            dataFlowDebugger.logDataIntegrationIssue(
              'useLeads.getLeads',
              `Lead data validation failed: ${validation.errors.join(', ')}`,
              leadsData[0]
            );
          }

          // Check for mock data
          const mockDetection = detectMockData(leadsData);
          if (mockDetection.isMock) {
            dataFlowDebugger.logMockDataUsage('useLeads.getLeads', 'Leads List', mockDetection.reasons.join(', '));
          }
        }

        const result = {
          data: leadsData,
          pagination: paginationData
        };

        dataFlowDebugger.logHookData('useLeads.getLeads.processed', result, false, 'Extract leads and pagination');
        return result;
      }

      const emptyResult = {
        data: [],
        pagination: null
      };

      dataFlowDebugger.logHookData('useLeads.getLeads.empty', emptyResult, true, 'No data available');
      return emptyResult;
    },
    staleTime: 30 * 1000, // 30 seconds - leads change frequently
    gcTime: 2 * 60 * 1000, // 2 minutes
  });

  // Extract leads and pagination from query data
  const leads = leadsData?.data || [];
  const pagination = leadsData?.pagination ? {
    total: leadsData.pagination.total || 0,
    limit: leadsData.pagination.limit || 20,
    offset: leadsData.pagination.offset || 0,
    hasMore: leadsData.pagination.hasMore || false,
    currentPage: Math.floor((leadsData.pagination.offset || 0) / (leadsData.pagination.limit || 20)) + 1,
    totalPages: Math.ceil((leadsData.pagination.total || 0) / (leadsData.pagination.limit || 20)),
  } : null;

  // Query for lead analytics with longer caching
  const {
    data: analytics = null,
    isLoading: loadingAnalytics,
  } = useQuery({
    queryKey: [...queryKeys.leads(user?.id), 'analytics'],
    queryFn: async (): Promise<LeadAnalyticsData | null> => {
      try {
        const response = await apiService.getLeadAnalytics();
        
        // Log the raw API response
        dataFlowDebugger.logHookData('useLeads.getLeadAnalytics', response);
        
        // Handle different response structures
        if (response && typeof response === 'object') {
          if ('data' in response && response.data) {
            return response.data as unknown as LeadAnalyticsData;
          } else if ('totalLeads' in response) {
            // Direct analytics data
            return response as unknown as LeadAnalyticsData;
          }
        }
        
        return null;
      } catch (error) {
        console.error('Error fetching lead analytics:', error);
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - analytics change less frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });

  // Mutations for loading individual lead data with debugging
  const loadLeadMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiService.getLead(id);

      // Log and validate lead data
      dataFlowDebugger.logHookData('useLeads.loadLead', response);

      const leadData = response.data || response as unknown as Lead;

      // Validate lead structure
      const validation = validateLead(leadData);
      if (!validation.isValid) {
        dataFlowDebugger.logDataIntegrationIssue(
          'useLeads.loadLead',
          `Individual lead validation failed: ${validation.errors.join(', ')}`,
          leadData
        );
      }

      return leadData;
    },
  });

  const loadLeadProfileMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiService.getLeadProfile(id);

      // Log and validate lead profile data
      dataFlowDebugger.logHookData('useLeads.loadLeadProfile', response);

      const profileData = response.data || response as unknown as LeadProfile;

      // Validate lead profile structure
      const validation = validateLeadProfile(profileData);
      if (!validation.isValid) {
        dataFlowDebugger.logDataIntegrationIssue(
          'useLeads.loadLeadProfile',
          `Lead profile validation failed: ${validation.errors.join(', ')}`,
          profileData
        );
      }

      // Check for mock data in profile
      const mockDetection = detectMockData(profileData);
      if (mockDetection.isMock) {
        dataFlowDebugger.logMockDataUsage('useLeads.loadLeadProfile', 'Lead Profile', mockDetection.reasons.join(', '));
      }

      return profileData;
    },
  });

  const loadLeadTimelineMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiService.getLeadTimeline(id);
      return response.data || response as unknown as any;
    },
  });

  // Action functions
  const loadLead = async (id: string): Promise<Lead | null> => {
    try {
      return await loadLeadMutation.mutateAsync(id);
    } catch (error) {
      handleError(error, 'load lead details');
      return null;
    }
  };

  const loadLeadProfile = async (id: string): Promise<LeadProfile | null> => {
    try {
      return await loadLeadProfileMutation.mutateAsync(id);
    } catch (error) {
      handleError(error, 'load lead profile');
      return null;
    }
  };

  const loadLeadTimeline = async (id: string): Promise<any> => {
    try {
      return await loadLeadTimelineMutation.mutateAsync(id);
    } catch (error) {
      handleError(error, 'load lead timeline');
      return null;
    }
  };

  const loadAnalytics = async (): Promise<void> => {
    // Analytics are handled by the query above
    queryClient.invalidateQueries({ queryKey: [...queryKeys.leads(user?.id), 'analytics'] });
  };

  const filterLeads = async (filters: LeadFilters, options?: LeadListOptions): Promise<void> => {
    // Build query parameters for API call
    const queryParams: Record<string, string> = {};

    if (filters.search) queryParams.search = filters.search;
    if (filters.leadType) queryParams.leadType = filters.leadType;
    if (filters.businessType) queryParams.businessType = filters.businessType;
    if (filters.leadTag) queryParams.leadTag = filters.leadTag;
    if (filters.platform) queryParams.platform = filters.platform;
    if (filters.agent) queryParams.agent = filters.agent;
    if (filters.engagementLevel) queryParams.engagementLevel = filters.engagementLevel;
    if (filters.intentLevel) queryParams.intentLevel = filters.intentLevel;
    if (filters.startDate) queryParams.startDate = filters.startDate.toISOString();
    if (filters.endDate) queryParams.endDate = filters.endDate.toISOString();

    if (options?.limit) queryParams.limit = options.limit.toString();
    if (options?.offset) queryParams.offset = options.offset.toString();
    if (options?.sortBy) queryParams.sortBy = options.sortBy;
    if (options?.sortOrder) queryParams.sortOrder = options.sortOrder;

    // Invalidate current query and refetch with filters
    queryClient.invalidateQueries({
      queryKey: [...queryKeys.leads(user?.id), { ...initialOptions, ...options, filters: queryParams }]
    });
  };

  const refreshLeads = async (options?: LeadListOptions): Promise<void> => {
    // If options are provided, invalidate with new options, otherwise just refetch
    if (options) {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.leads(user?.id), { ...initialOptions, ...options }]
      });
    } else {
      await refetchLeads();
    }
  };

  const loadLeadsWithPagination = async (
    page: number = 1,
    limit: number = 20,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc'
  ): Promise<void> => {
    const offset = (page - 1) * limit;
    queryClient.invalidateQueries({
      queryKey: [...queryKeys.leads(user?.id), {
        ...initialOptions,
        limit,
        offset,
        sortBy,
        sortOrder
      }]
    });
  };

  const loadNextPage = async (currentPage: number, limit: number = 20): Promise<void> => {
    return loadLeadsWithPagination(currentPage + 1, limit);
  };

  const loadPreviousPage = async (currentPage: number, limit: number = 20): Promise<void> => {
    if (currentPage > 1) {
      return loadLeadsWithPagination(currentPage - 1, limit);
    }
  };

  const clearCurrentLead = (): void => {
    // Clear current lead from local state if needed
    queryClient.setQueryData(['currentLead'], null);
  };

  const clearError = (): void => {
    // Clear query errors without triggering refetch to prevent infinite loops
    queryClient.setQueryData(queryKeys.leads(user?.id), (oldData: Lead[] | undefined) => oldData);
    queryClient.setQueryData([...queryKeys.leads(user?.id), 'analytics'], (oldData: LeadAnalyticsData | undefined) => oldData);
  };

  return {
    // Data
    leads,
    currentLead: loadLeadMutation.data || null,
    leadProfile: loadLeadProfileMutation.data || null,
    analytics,
    pagination,

    // Loading states
    loading,
    loadingLead: loadLeadMutation.isPending,
    loadingProfile: loadLeadProfileMutation.isPending,
    loadingAnalytics,

    // Error states
    error: leadsError ? handleError(leadsError, 'load leads') : null,

    // Actions
    refreshLeads,
    loadLead,
    loadLeadProfile,
    loadLeadTimeline,
    loadAnalytics,
    filterLeads,
    loadLeadsWithPagination,
    loadNextPage,
    loadPreviousPage,
    clearCurrentLead,
    clearError,
  };
};

export default useLeads;