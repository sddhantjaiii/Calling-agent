import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/apiService';
import { queryKeys } from '../lib/queryClient';
import { useAuth } from '../contexts/AuthContext';
import { useDataAccessSecurity } from './useDataAccessSecurity';
import { toCamelCase } from '../utils/caseConverter'; // Import the converter
import type {
  Call,
  Transcript,
  CallStatistics,
  CallSearchResult,
  TranscriptSearchResult,
  CallFilters,
  CallListOptions,
  CallSearchOptions,
  CallListResponse,
  ApiError
} from '../types';

export interface UseCallsReturn {
  // Data
  calls: Call[];
  currentCall: Call | null;
  transcript: Transcript | null;
  statistics: CallStatistics | null;
  searchResults: CallSearchResult | null;
  transcriptSearchResults: TranscriptSearchResult | null;
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
  loadingCall: boolean;
  loadingTranscript: boolean;
  loadingStats: boolean;
  searching: boolean;

  // Error states
  error: string | null;

  // Actions
  refreshCalls: (options?: CallListOptions) => Promise<void>;
  loadCall: (id: string) => Promise<Call | null>;
  loadTranscript: (callId: string) => Promise<Transcript | null>;
  loadStatistics: (period?: 'day' | 'week' | 'month') => Promise<void>;
  searchCalls: (query: string, options?: CallSearchOptions) => Promise<CallSearchResult | null>;
  searchTranscripts: (query: string, options?: CallSearchOptions) => Promise<TranscriptSearchResult | null>;
  filterCalls: (filters: CallFilters, options?: CallListOptions) => Promise<void>;
  getRecentCalls: (limit?: number) => Promise<void>;
  loadCallsWithPagination: (page?: number, limit?: number, sortBy?: string, sortOrder?: 'ASC' | 'DESC') => Promise<void>;
  loadNextPage: (currentPage: number, limit?: number) => Promise<void>;
  loadPreviousPage: (currentPage: number, limit?: number) => Promise<void>;
  clearCurrentCall: () => void;
  clearSearchResults: () => void;
  clearError: () => void;
}

export const useCalls = (initialOptions?: CallListOptions): UseCallsReturn => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const {
    validateUserAuthentication,
    validateDataOwnership,
    validateAgentOwnership,
  } = useDataAccessSecurity({
    onUnauthorizedAccess: () => {
      console.error('Unauthorized access attempt in useCalls hook');
    },
    onDataIntegrityViolation: (details) => {
      console.error('Data integrity violation in useCalls hook:', details);
    },
  });

  // Helper function to handle API errors with enhanced user context validation
  const handleError = (error: unknown, operation: string): string => {
    console.error(`Error in ${operation}:`, error);

    let errorMessage = `Failed to ${operation}`;

    if (error instanceof Error) {
      const apiError = error as ApiError;
      if (apiError.code === 'UNAUTHORIZED') {
        errorMessage = 'Your session has expired. Please log in again to continue.';
      } else if (apiError.code === 'AGENT_ACCESS_DENIED' || apiError.code === 'FORBIDDEN') {
        errorMessage = 'Access denied. You can only access your own call data and agents.';
      } else if (apiError.code === 'NOT_FOUND') {
        errorMessage = 'The requested call data was not found or you do not have permission to access it.';
      } else if (apiError.code === 'NETWORK_ERROR') {
        errorMessage = 'Network connection error. Please check your internet connection and try again.';
      } else if (apiError.code === 'VALIDATION_ERROR') {
        errorMessage = apiError.message || 'The provided data is invalid. Please check your input and try again.';
      } else if (apiError.code === 'RATE_LIMITED') {
        errorMessage = 'Too many requests. Please wait a moment before trying again.';
      } else {
        errorMessage = apiError.message || errorMessage;
      }
    }

    return errorMessage;
  };

  // Query for calls with caching and user context validation
  const {
    data: callsData,
    isLoading: loading,
    error: callsError,
    refetch: refetchCalls,
  } = useQuery({
    queryKey: [...queryKeys.calls(user?.id), initialOptions],
    queryFn: async () => {
      // Validate user context before making API call
      validateUserAuthentication();

      const response = await apiService.getCalls(initialOptions);

      // Normalize backend responses into a consistent shape
      // Backend typically returns: { success: true, data: Call[], pagination: {...} }
      // Some endpoints may return: { calls: Call[], pagination: {...} } or just Call[]
      let callsData: { calls: Call[]; pagination: CallListResponse['pagination'] | null };
      const raw: any = response as any;

      let parsedCalls: Call[] = [];
      let parsedPagination: CallListResponse['pagination'] | null = null;

      if (raw && typeof raw === 'object') {
        // Case 1: { data: Call[], pagination: {...} }
        if (Array.isArray(raw.data)) {
          parsedCalls = raw.data as Call[];
          parsedPagination = (raw.pagination && typeof raw.pagination === 'object') ? raw.pagination : null;
        }
        // Case 2: { data: { calls: Call[], pagination? }, pagination? }
        else if (raw.data && typeof raw.data === 'object') {
          if (Array.isArray(raw.data.calls)) {
            parsedCalls = raw.data.calls as Call[];
            parsedPagination = (raw.data.pagination || raw.pagination) ?? null;
          }
        }
        // Case 3: { calls: Call[], pagination: {...} }
        if (parsedCalls.length === 0 && Array.isArray(raw.calls)) {
          parsedCalls = raw.calls as Call[];
          parsedPagination = (raw.pagination && typeof raw.pagination === 'object') ? raw.pagination : null;
        }
      }

      // Case 4: Response is an array directly
      if (parsedCalls.length === 0 && Array.isArray(raw)) {
        parsedCalls = raw as Call[];
        parsedPagination = null;
      }

      callsData = {
        calls: parsedCalls || [],
        pagination: parsedPagination || null,
      };

      // Convert snake_case keys to camelCase
      if (callsData.calls) {
        callsData.calls = callsData.calls.map(call => toCamelCase(call));
      }

      // Validate that all returned calls belong to current user
      if (callsData.calls && callsData.calls.length > 0) {
        validateDataOwnership(callsData.calls, 'Calls');
      }

      return callsData;
    },
    staleTime: 30 * 1000, // 30 seconds - calls change frequently
    gcTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!user, // Only run query when user is authenticated
  });

  // Extract calls and pagination from query data
  const calls = callsData?.calls || [];
  const pagination = callsData?.pagination ? {
    total: callsData.pagination.total || 0,
    limit: callsData.pagination.limit || 20,
    offset: callsData.pagination.offset || 0,
    hasMore: callsData.pagination.hasMore || false,
    currentPage: Math.floor((callsData.pagination.offset || 0) / (callsData.pagination.limit || 20)) + 1,
    totalPages: Math.ceil((callsData.pagination.total || 0) / (callsData.pagination.limit || 20)),
  } : null;

  // Query for call statistics with longer caching and user context validation
  const {
    data: statistics = null,
    isLoading: loadingStats,
  } = useQuery({
    queryKey: [...queryKeys.calls(user?.id), 'stats'],
    queryFn: async () => {
      // Validate user context before making API call
      validateUserAuthentication();

      const response = await apiService.getCallStats();
      const statsData = response.data || response as unknown as CallStatistics;

      // Validate that statistics belong to current user
      validateDataOwnership(statsData, 'Call Statistics');

      return statsData;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - stats change less frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
    enabled: !!user, // Only run query when user is authenticated
  });

  // Mutations for loading individual call data
  const loadCallMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiService.getCall(id);
      return response.data || response as unknown as Call;
    },
  });

  const loadTranscriptMutation = useMutation({
    mutationFn: async (callId: string) => {
      const response = await apiService.getCallTranscript(callId);
      return response.data || response as unknown as Transcript;
    },
  });

  const searchCallsMutation = useMutation({
    mutationFn: async ({ query, options }: { query: string; options?: CallSearchOptions }) => {
      const response = await apiService.searchCalls(query, options);
      return response.data || response as unknown as CallSearchResult;
    },
  });

  const searchTranscriptsMutation = useMutation({
    mutationFn: async ({ query, options }: { query: string; options?: CallSearchOptions }) => {
      const response = await apiService.searchTranscripts(query, options);
      return response.data || response as unknown as TranscriptSearchResult;
    },
  });

  // Action functions
  const loadCall = async (id: string): Promise<Call | null> => {
    try {
      // Validate user context before loading call
      validateUserAuthentication();

      const call = await loadCallMutation.mutateAsync(id);

      // Validate that the loaded call belongs to current user
      if (call) {
        validateDataOwnership(call, 'Call');
      }

      return call;
    } catch (error) {
      handleError(error, 'load call details');
      return null;
    }
  };

  const loadTranscript = async (callId: string): Promise<Transcript | null> => {
    try {
      // Validate user context before loading transcript
      validateUserAuthentication();

      const transcript = await loadTranscriptMutation.mutateAsync(callId);

      // Validate that the transcript belongs to current user
      if (transcript) {
        validateDataOwnership(transcript, 'Transcript');
      }

      return transcript;
    } catch (error) {
      handleError(error, 'load transcript');
      return null;
    }
  };

  const loadStatistics = async (period?: 'day' | 'week' | 'month'): Promise<void> => {
    // Statistics are handled by the query above
    // Period parameter is available for future use
    if (period) {
      console.log(`Loading statistics for period: ${period}`);
    }
    queryClient.invalidateQueries({ queryKey: [...queryKeys.calls(user?.id), 'stats'] });
  };

  const searchCalls = async (query: string, options?: CallSearchOptions): Promise<CallSearchResult | null> => {
    try {
      // Validate user context before searching calls
      validateUserAuthentication();

      const searchResults = await searchCallsMutation.mutateAsync({ query, options });

      // Validate that search results belong to current user
      if (searchResults && (searchResults.calls || searchResults.results)) {
        const calls = searchResults.calls || searchResults.results || [];
        validateDataOwnership(calls, 'Call Search Results');
      }

      return searchResults;
    } catch (error) {
      handleError(error, 'search calls');
      return null;
    }
  };

  const searchTranscripts = async (query: string, options?: CallSearchOptions): Promise<TranscriptSearchResult | null> => {
    try {
      // Validate user context before searching transcripts
      validateUserAuthentication();

      const searchResults = await searchTranscriptsMutation.mutateAsync({ query, options });

      // Validate that search results belong to current user
      if (searchResults && searchResults.results) {
        const transcripts = searchResults.results.map(result => result.transcript);
        validateDataOwnership(transcripts, 'Transcript Search Results');
      }

      return searchResults;
    } catch (error) {
      handleError(error, 'search transcripts');
      return null;
    }
  };

  const filterCalls = async (filters: CallFilters, options?: CallListOptions): Promise<void> => {
    // Validate user context before filtering calls
    validateUserAuthentication();

    // Validate agent ownership if agentId is specified in filters
    if (filters.agentId) {
      await validateAgentOwnership(filters.agentId);
    }

    // Invalidate current query and refetch with filters
    queryClient.invalidateQueries({ queryKey: [...queryKeys.calls(user?.id), { ...initialOptions, ...options, filters }] });
  };

  const getRecentCalls = async (limit: number = 10): Promise<void> => {
    queryClient.invalidateQueries({ queryKey: [...queryKeys.calls(user?.id), { limit, recent: true }] });
  };

  const refreshCalls = async (options?: CallListOptions): Promise<void> => {
    await refetchCalls();
  };

  const loadCallsWithPagination = async (
    page: number = 1,
    limit: number = 20,
    sortBy?: string,
    sortOrder?: 'ASC' | 'DESC'
  ): Promise<void> => {
    const offset = (page - 1) * limit;
    queryClient.invalidateQueries({
      queryKey: [...queryKeys.calls(user?.id), {
        ...initialOptions,
        limit,
        offset,
        sortBy: sortBy as CallListOptions['sortBy'],
        sortOrder
      }]
    });
  };

  const loadNextPage = async (currentPage: number, limit: number = 20): Promise<void> => {
    return loadCallsWithPagination(currentPage + 1, limit);
  };

  const loadPreviousPage = async (currentPage: number, limit: number = 20): Promise<void> => {
    if (currentPage > 1) {
      return loadCallsWithPagination(currentPage - 1, limit);
    }
  };

  const clearCurrentCall = (): void => {
    // Clear current call from local state if needed
    queryClient.setQueryData(['currentCall'], null);
  };

  const clearSearchResults = (): void => {
    // Clear search results from local state if needed
    queryClient.setQueryData(['searchResults'], null);
  };

  const clearError = (): void => {
    // Clear query errors without triggering refetch to prevent infinite loops
    queryClient.setQueryData(queryKeys.calls(user?.id), (oldData: Call[] | undefined) => oldData);
    queryClient.setQueryData([...queryKeys.calls(user?.id), 'stats'], (oldData: CallStatistics | undefined) => oldData);
  };

  return {
    // Data
    calls,
    currentCall: loadCallMutation.data || null,
    transcript: loadTranscriptMutation.data || null,
    statistics,
    searchResults: searchCallsMutation.data || null,
    transcriptSearchResults: searchTranscriptsMutation.data || null,
    pagination,

    // Loading states
    loading,
    loadingCall: loadCallMutation.isPending,
    loadingTranscript: loadTranscriptMutation.isPending,
    loadingStats,
    searching: searchCallsMutation.isPending || searchTranscriptsMutation.isPending,

    // Error states
    error: callsError ? handleError(callsError, 'load calls') : null,

    // Actions
    refreshCalls,
    loadCall,
    loadTranscript,
    loadStatistics,
    searchCalls,
    searchTranscripts,
    filterCalls,
    getRecentCalls,
    loadCallsWithPagination,
    loadNextPage,
    loadPreviousPage,
    clearCurrentCall,
    clearSearchResults,
    clearError,
  };
};

export default useCalls;