import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/apiService';
import { queryKeys, cacheUtils } from '../lib/queryClient';
import { useAuth } from '../contexts/AuthContext';
import { useDataAccessSecurity } from './useDataAccessSecurity';
import type { Agent, CreateAgentRequest, UpdateAgentRequest, Voice, ApiError } from '../types';

interface UseAgentsActions {
  createAgent: (data: CreateAgentRequest) => Promise<Agent | null>;
  updateAgent: (id: string, data: UpdateAgentRequest) => Promise<Agent | null>;
  deleteAgent: (id: string) => Promise<boolean>;
  refreshAgents: () => Promise<void>;
  testConnection: () => Promise<{ success: boolean; message: string } | null>;
}

export interface UseAgentsReturn {
  // Data from queries
  agents: Agent[];
  voices: Voice[];

  // Loading states
  loading: boolean;
  voicesLoading: boolean;

  // Error states
  error: string | null;
  voicesError: string | null;

  // Mutation states
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  testingConnection: boolean;

  // Actions
  createAgent: (data: CreateAgentRequest) => Promise<Agent | null>;
  updateAgent: (id: string, data: UpdateAgentRequest) => Promise<Agent | null>;
  deleteAgent: (id: string) => Promise<boolean>;
  refreshAgents: () => Promise<void>;
  testConnection: () => Promise<{ success: boolean; message: string } | null>;
  loadVoices: () => Promise<void>;
  clearError: () => void;
}

export const useAgents = (): UseAgentsReturn => {
  const queryClient = useQueryClient();
  const { user, isAdminUser } = useAuth();
  const {
    validateUserAuthentication,
    validateDataOwnership,
    validateAgentOwnership,
    handleSecurityViolation,
  } = useDataAccessSecurity({
    onUnauthorizedAccess: () => {
      console.error('Unauthorized access attempt in useAgents hook');
    },
    onDataIntegrityViolation: (details) => {
      console.error('Data integrity violation in useAgents hook:', details);
    },
  });

  // Helper function to validate agent data before operations
  const validateAgentData = (data: CreateAgentRequest | UpdateAgentRequest): void => {
    if ('name' in data && data.name) {
      if (data.name.trim().length === 0) {
        throw new Error('Agent name cannot be empty');
      }
      if (data.name.length > 100) {
        throw new Error('Agent name cannot exceed 100 characters');
      }
    }

    // Validate other agent fields as needed
    if ('agentType' in data && data.agentType && !['call', 'chat', 'email'].includes(data.agentType)) {
      throw new Error('Invalid agent type specified');
    }
  };

  // Helper function to validate local agent ownership (using cached data)
  const validateLocalAgentOwnership = (agentId: string, agentsList: Agent[]): boolean => {
    validateUserAuthentication(); // Ensure user is authenticated first

    // Check if agent exists in current user's agents list
    const agent = agentsList.find(a => a.id === agentId);
    if (!agent) {
      throw new Error('Agent not found or access denied. You can only access your own agents.');
    }

    // Additional check: ensure agent belongs to current user
    if (agent.userId && agent.userId !== user!.id) {
      throw new Error('Access denied: This agent belongs to another user.');
    }

    return true;
  };

  // Helper function to handle API errors with enhanced agent ownership validation
  const handleError = (error: unknown, operation: string): string => {
    console.error(`Error in ${operation}:`, error);

    let errorMessage = `Failed to ${operation}`;

    if (error instanceof Error) {
      const apiError = error as ApiError;
      if (apiError.code === 'UNAUTHORIZED') {
        errorMessage = 'Your session has expired. Please log in again to continue.';
      } else if (apiError.code === 'AGENT_ACCESS_DENIED' || apiError.code === 'FORBIDDEN') {
        errorMessage = 'Access denied. You can only access and modify your own agents.';
      } else if (apiError.code === 'VALIDATION_ERROR') {
        errorMessage = apiError.message || 'The provided data is invalid. Please check your input and try again.';
      } else if (apiError.code === 'NETWORK_ERROR') {
        errorMessage = 'Network connection error. Please check your internet connection and try again.';
      } else if (apiError.code === 'AGENT_NOT_FOUND') {
        errorMessage = 'The requested agent was not found or you do not have permission to access it.';
      } else if (apiError.code === 'RATE_LIMITED') {
        errorMessage = 'Too many requests. Please wait a moment before trying again.';
      } else {
        errorMessage = apiError.message || errorMessage;
      }
    }

    return errorMessage;
  };

  // Query for agents with caching (user-specific)
  const {
    data: agents = [],
    isLoading: loading,
    error: agentsError,
    refetch: refetchAgents,
  } = useQuery({
    queryKey: queryKeys.agents(user?.id),
    queryFn: async () => {
      // Validate user context before making API call
      validateUserAuthentication();

      const response = await apiService.getAgents();
      const agentsList = response.data || (response as unknown as Agent[]);

      // Normalize elevenlabsAgentId across snake/camel cases
      const normalized = (agentsList as any[]).map((a) => ({
        ...a,
        elevenlabsAgentId: a.elevenlabsAgentId || a.elevenlabs_agent_id,
      }));

      // Validate that all returned agents belong to current user
      validateDataOwnership(normalized as Agent[], 'Agents');

      return normalized as Agent[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - agents change frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!user, // Only run query when user is authenticated
  });

  // Disable voice loading for calling functionality - not needed
  const voices: Voice[] = [];
  const voicesLoading = false;
  const voicesQueryError = null;
  const refetchVoices = () => Promise.resolve();

  // Create agent mutation with optimistic updates
  const createAgentMutation = useMutation({
    mutationFn: async (data: CreateAgentRequest) => {
      // Validate user context and agent data before creating
      validateUserAuthentication();
      validateAgentData(data);

      const response = await apiService.createAgent(data);
      const newAgent = response.data || response as unknown as Agent;

      // Validate that the created agent belongs to current user
      validateDataOwnership(newAgent, 'Created Agent');

      return newAgent;
    },
    onMutate: async (newAgent) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.agents(user?.id) });

      // Snapshot the previous value
      const previousAgents = queryClient.getQueryData<Agent[]>(queryKeys.agents(user?.id));

      // Optimistically update to the new value
      if (previousAgents) {
        const optimisticAgent: Agent = {
          id: `temp-${Date.now()}`,
          userId: '',
          elevenlabsAgentId: '',
          name: newAgent.name,
          agentType: newAgent.agentType || 'call',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...newAgent,
        };

        queryClient.setQueryData<Agent[]>(queryKeys.agents(user?.id), [...previousAgents, optimisticAgent]);
      }

      return { previousAgents };
    },
    onError: (err, newAgent, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousAgents) {
        queryClient.setQueryData(queryKeys.agents(user?.id), context.previousAgents);
      }
    },
    onSuccess: () => {
      // Invalidate and refetch agents to get the real data
      cacheUtils.invalidateAgents();
    },
  });

  // Update agent mutation with optimistic updates
  const updateAgentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateAgentRequest }) => {
      // Validate user context, agent ownership, and update data
      validateUserAuthentication();
      validateLocalAgentOwnership(id, agents);
      validateAgentData(data);

      const response = await apiService.updateAgent(id, data);
      const updatedAgent = response.data || response as unknown as Agent;

      // Validate that the updated agent still belongs to current user
      validateDataOwnership(updatedAgent, 'Updated Agent');

      return updatedAgent;
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.agents(user?.id) });

      const previousAgents = queryClient.getQueryData<Agent[]>(queryKeys.agents(user?.id));

      if (previousAgents) {
        const updatedAgents = previousAgents.map(agent =>
          agent.id === id ? { ...agent, ...data } : agent
        );
        queryClient.setQueryData<Agent[]>(queryKeys.agents(user?.id), updatedAgents);
      }

      return { previousAgents };
    },
    onError: (err, variables, context) => {
      if (context?.previousAgents) {
        queryClient.setQueryData(queryKeys.agents(user?.id), context.previousAgents);
      }
    },
    onSuccess: () => {
      cacheUtils.invalidateAgents();
    },
  });

  // Delete agent mutation with optimistic updates
  const deleteAgentMutation = useMutation({
    mutationFn: async (id: string) => {
      // Validate user context and agent ownership before deleting
      validateUserAuthentication();
      validateLocalAgentOwnership(id, agents);

      await apiService.deleteAgent(id);
      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.agents(user?.id) });

      const previousAgents = queryClient.getQueryData<Agent[]>(queryKeys.agents(user?.id));

      if (previousAgents) {
        const filteredAgents = previousAgents.filter(agent => agent.id !== id);
        queryClient.setQueryData<Agent[]>(queryKeys.agents(user?.id), filteredAgents);
      }

      return { previousAgents };
    },
    onError: (err, id, context) => {
      if (context?.previousAgents) {
        queryClient.setQueryData(queryKeys.agents(user?.id), context.previousAgents);
      }
    },
    onSuccess: () => {
      cacheUtils.invalidateAgents();
    },
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      // Validate user context before testing connection
      validateUserAuthentication();

      const response = await apiService.testAgentConnection();
      const data = response.data || response as unknown as { connected: boolean };

      return {
        success: data.connected,
        message: data.connected
          ? 'ElevenLabs connection test successful'
          : 'ElevenLabs connection test failed'
      };
    },
  });

  // Action functions
  const createAgent = async (data: CreateAgentRequest): Promise<Agent | null> => {
    try {
      // Additional validation before mutation
      validateUserAuthentication();
      validateAgentData(data);

      return await createAgentMutation.mutateAsync(data);
    } catch (error) {
      handleError(error, 'create agent');
      return null;
    }
  };

  const updateAgent = async (id: string, data: UpdateAgentRequest): Promise<Agent | null> => {
    try {
      // Additional validation before mutation
      validateUserAuthentication();
      validateLocalAgentOwnership(id, agents);
      validateAgentData(data);

      return await updateAgentMutation.mutateAsync({ id, data });
    } catch (error) {
      handleError(error, 'update agent');
      return null;
    }
  };

  const deleteAgent = async (id: string): Promise<boolean> => {
    try {
      // Additional validation before mutation
      validateUserAuthentication();
      validateLocalAgentOwnership(id, agents);

      await deleteAgentMutation.mutateAsync(id);
      return true;
    } catch (error) {
      handleError(error, 'delete agent');
      return false;
    }
  };

  const refreshAgents = async (): Promise<void> => {
    await refetchAgents();
  };

  const testConnection = async (): Promise<{ success: boolean; message: string } | null> => {
    try {
      // Additional validation before mutation
      validateUserAuthentication();

      return await testConnectionMutation.mutateAsync();
    } catch (error) {
      handleError(error, 'test connection');
      return null;
    }
  };

  const loadVoices = async (): Promise<void> => {
    // Validate user context before loading voices
    validateUserAuthentication();

    await refetchVoices();
  };

  const clearError = (): void => {
    // Clear query errors without triggering refetch to prevent infinite loops
    queryClient.setQueryData(queryKeys.agents(user?.id), (oldData: Agent[] | undefined) => oldData);
    queryClient.setQueryData(queryKeys.agentVoices, (oldData: Voice[] | undefined) => oldData);
  };

  return {
    // Data
    agents,
    voices,

    // Loading states
    loading,
    voicesLoading,

    // Error states
    error: agentsError ? handleError(agentsError, 'load agents') : null,
    voicesError: voicesQueryError ? handleError(voicesQueryError, 'load voices') : null,

    // Mutation states
    creating: createAgentMutation.isPending,
    updating: updateAgentMutation.isPending,
    deleting: deleteAgentMutation.isPending,
    testingConnection: testConnectionMutation.isPending,

    // Actions
    createAgent,
    updateAgent,
    deleteAgent,
    refreshAgents,
    testConnection,
    loadVoices,
    clearError,
  };
};

export default useAgents;