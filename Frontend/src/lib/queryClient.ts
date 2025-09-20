import { QueryClient } from '@tanstack/react-query';

// Create a client with optimized caching settings
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes by default
      staleTime: 5 * 60 * 1000,
      // Keep data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests 3 times
      retry: 3,
      // Retry with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus for critical data
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect by default
      refetchOnReconnect: true,
      // Enable background refetching only when data is stale
      refetchOnMount: true,
      // Network mode for better offline handling
      networkMode: 'online',
    },
    mutations: {
      // Retry mutations once
      retry: 1,
      // Network mode for mutations
      networkMode: 'online',
    },
  },
});

// Query keys for consistent cache management
export const queryKeys = {
  // Agent-related queries
  agents: (userId?: string) => userId ? ['agents', userId] as const : ['agents'] as const,
  agent: (id: string, userId?: string) => userId ? ['agents', userId, id] as const : ['agents', id] as const,
  agentVoices: ['agents', 'voices'] as const,
  
  // Contact-related queries
  contacts: (userId?: string) => userId ? ['contacts', userId] as const : ['contacts'] as const,
  contact: (id: string, userId?: string) => userId ? ['contacts', userId, id] as const : ['contacts', id] as const,
  contactStats: (userId?: string) => userId ? ['contacts', userId, 'stats'] as const : ['contacts', 'stats'] as const,
  
  // Call-related queries
  calls: (userId?: string) => userId ? ['calls', userId] as const : ['calls'] as const,
  call: (id: string, userId?: string) => userId ? ['calls', userId, id] as const : ['calls', id] as const,
  callTranscript: (id: string, userId?: string) => userId ? ['calls', userId, id, 'transcript'] as const : ['calls', id, 'transcript'] as const,
  
  // Lead-related queries
  leads: (userId?: string) => userId ? ['leads', userId] as const : ['leads'] as const,
  lead: (id: string, userId?: string) => userId ? ['leads', userId, id] as const : ['leads', id] as const,
  leadProfile: (id: string, userId?: string) => userId ? ['leads', userId, id, 'profile'] as const : ['leads', id, 'profile'] as const,
  leadTimeline: (id: string, userId?: string) => userId ? ['leads', userId, id, 'timeline'] as const : ['leads', id, 'timeline'] as const,
  
  // Dashboard queries
  dashboardOverview: (userId?: string) => userId ? ['dashboard', userId, 'overview'] as const : ['dashboard', 'overview'] as const,
  dashboardAnalytics: (userId?: string) => userId ? ['dashboard', userId, 'analytics'] as const : ['dashboard', 'analytics'] as const,
  
  // Billing queries
  billing: ['billing'] as const,
  credits: ['billing', 'credits'] as const,
  creditStats: ['billing', 'stats'] as const,
  billingHistory: ['billing', 'history'] as const,
  
  // Dashboard queries (additional)
  dashboard: ['dashboard'] as const,
} as const;

// Cache invalidation utilities
export const cacheUtils = {
  // Invalidate all agent-related data
  invalidateAgents: (userId?: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.agents(userId) });
  },
  
  // Invalidate specific agent
  invalidateAgent: (id: string, userId?: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.agent(id, userId) });
  },
  
  // Invalidate all contact-related data
  invalidateContacts: (userId?: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.contacts(userId) });
  },
  
  // Invalidate specific contact
  invalidateContact: (id: string, userId?: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.contact(id, userId) });
  },
  
  // Invalidate all call-related data
  invalidateCalls: (userId?: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.calls(userId) });
  },
  
  // Invalidate dashboard data
  invalidateDashboard: (userId?: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboardOverview(userId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboardAnalytics(userId) });
  },
  
  // Invalidate billing data
  invalidateBilling: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.credits });
    queryClient.invalidateQueries({ queryKey: queryKeys.creditStats });
    queryClient.invalidateQueries({ queryKey: queryKeys.billingHistory });
  },
  
  // Clear all cache
  clearAll: () => {
    queryClient.clear();
  },
};