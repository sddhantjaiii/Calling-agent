import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { apiService } from '@/services/apiService';
import type { Agent } from '@/types/api';

interface AgentContextType {
  selectedAgent: Agent | null;
  agents: Agent[];
  isLoading: boolean;
  error: string | null;
  setSelectedAgent: (agent: Agent | null) => void;
  refreshAgents: () => Promise<void>;
  clearError: () => void;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export const AgentProvider = ({ children }: { children: ReactNode }) => {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();

  const loadAgents = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setAgents([]);
      setSelectedAgent(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiService.getAgents();
      const agentsData = response.data || [];
      
      setAgents(Array.isArray(agentsData) ? agentsData : []);
      
      const savedAgentId = localStorage.getItem('selectedAgentId');
      const agentToSelect = savedAgentId
        ? agentsData.find(agent => agent.id === savedAgentId)
        : agentsData[0];

      if (agentToSelect) {
        setSelectedAgent(agentToSelect);
      } else {
        setSelectedAgent(null);
        localStorage.removeItem('selectedAgentId');
      }

    } catch (err) {
      console.error('Failed to load agents:', err);
      setError(err instanceof Error ? err.message : 'Failed to load agents');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const refreshAgents = async () => {
    await loadAgents();
  };

  const clearError = () => {
    setError(null);
  };

  const handleSetSelectedAgent = (agent: Agent | null) => {
    setSelectedAgent(agent);
    if (agent) {
      localStorage.setItem('selectedAgentId', agent.id);
    } else {
      localStorage.removeItem('selectedAgentId');
    }
  };

  const value: AgentContextType = {
    selectedAgent,
    agents,
    isLoading,
    error,
    setSelectedAgent: handleSetSelectedAgent,
    refreshAgents,
    clearError,
  };

  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>;
};

export const useAgents = () => {
  const context = useContext(AgentContext);
  if (context === undefined) {
    throw new Error('useAgents must be used within an AgentProvider');
  }
  return context;
};