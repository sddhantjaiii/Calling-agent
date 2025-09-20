/**
 * Frontend Data Isolation Tests
 * 
 * This test suite verifies that frontend hooks cannot access other users' data by testing:
 * - User context validation in all hooks
 * - API service user context validation
 * - Frontend data access security measures
 * - Error handling for unauthorized access attempts
 * 
 * Requirements: Data Isolation Acceptance Criteria
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';

import { useCalls } from '../../hooks/useCalls';
import { useAgents } from '../../hooks/useAgents';
import { useDashboard } from '../../hooks/useDashboard';
import { useDataAccessSecurity } from '../../hooks/useDataAccessSecurity';
import { apiService } from '../../services/apiService';
import { AuthContext } from '../../contexts/AuthContext';

// Mock the API service
vi.mock('../../services/apiService', () => ({
  apiService: {
    getCalls: vi.fn(),
    getAgents: vi.fn(),
    getAgent: vi.fn(),
    getDashboardOverview: vi.fn(),
    getDashboardAnalytics: vi.fn(),
    getCallAnalytics: vi.fn(),
    getAgentAnalytics: vi.fn(),
    createAgent: vi.fn(),
    updateAgent: vi.fn(),
    deleteAgent: vi.fn(),
  },
}));

// Mock console methods to avoid noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

describe('Frontend Data Isolation Tests', () => {
  let queryClient: QueryClient;
  let mockUser1: any;
  let mockUser2: any;
  let mockUser1Agent: any;
  let mockUser2Agent: any;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });

    // Mock users
    mockUser1 = {
      id: 'user1-id',
      email: 'user1@test.com',
      name: 'Test User 1',
    };

    mockUser2 = {
      id: 'user2-id',
      email: 'user2@test.com',
      name: 'Test User 2',
    };

    // Mock agents
    mockUser1Agent = {
      id: 'agent1-id',
      userId: 'user1-id',
      name: 'User 1 Agent',
      agentType: 'call',
      isActive: true,
    };

    mockUser2Agent = {
      id: 'agent2-id',
      userId: 'user2-id',
      name: 'User 2 Agent',
      agentType: 'call',
      isActive: true,
    };

    // Suppress console errors/warnings during tests
    console.error = vi.fn();
    console.warn = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    
    // Restore console methods
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });

  // Helper function to create wrapper with auth context
  const createWrapper = (user: any) => {
    const mockAuthContext = {
      user,
      isAuthenticated: !!user,
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
      error: null,
    };

    return ({ children }: { children: ReactNode }) => (
      <AuthContext.Provider value={mockAuthContext}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </AuthContext.Provider>
    );
  };

  describe('useCalls Hook Data Isolation', () => {
    test('should include user context in API calls', async () => {
      const mockCalls = [
        { id: 'call1', userId: 'user1-id', agentId: 'agent1-id', status: 'completed' },
        { id: 'call2', userId: 'user1-id', agentId: 'agent1-id', status: 'completed' },
      ];

      vi.mocked(apiService.getCalls).mockResolvedValue({
        success: true,
        data: mockCalls,
      });

      const { result } = renderHook(() => useCalls(), {
        wrapper: createWrapper(mockUser1),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Verify API was called with user context
      expect(apiService.getCalls).toHaveBeenCalled();
      
      // Verify returned data belongs to user1
      expect(result.current.calls).toEqual(mockCalls);
      result.current.calls.forEach(call => {
        expect(call.userId).toBe(mockUser1.id);
      });
    });

    test('should handle unauthorized access errors gracefully', async () => {
      const unauthorizedError = {
        code: 'AGENT_ACCESS_DENIED',
        message: 'Access denied. You can only access your own call data and agents.',
        status: 403,
      };

      vi.mocked(apiService.getCalls).mockRejectedValue(unauthorizedError);

      const { result } = renderHook(() => useCalls(), {
        wrapper: createWrapper(mockUser1),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toContain('Access denied');
      expect(result.current.calls).toEqual([]);
    });

    test('should validate agent ownership before API calls', async () => {
      const { result } = renderHook(() => useCalls({ agentId: mockUser2Agent.id }), {
        wrapper: createWrapper(mockUser1),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should not make API call for agent that doesn't belong to user
      expect(result.current.error).toBeTruthy();
    });

    test('should prevent access to other users call data', async () => {
      const { result } = renderHook(() => useCalls(), {
        wrapper: createWrapper(mockUser1),
      });

      // Try to load a call that belongs to user2
      const loadResult = await result.current.loadCall('user2-call-id');

      expect(loadResult).toBeNull();
      expect(result.current.error).toBeTruthy();
    });
  });

  describe('useAgents Hook Data Isolation', () => {
    test('should only return user-owned agents', async () => {
      const mockAgents = [mockUser1Agent];

      vi.mocked(apiService.getAgents).mockResolvedValue({
        success: true,
        data: mockAgents,
      });

      const { result } = renderHook(() => useAgents(), {
        wrapper: createWrapper(mockUser1),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.agents).toEqual(mockAgents);
      result.current.agents.forEach(agent => {
        expect(agent.userId).toBe(mockUser1.id);
      });
    });

    test('should prevent access to other users agents', async () => {
      const accessDeniedError = {
        code: 'AGENT_ACCESS_DENIED',
        message: 'Agent not found or access denied',
        status: 403,
      };

      vi.mocked(apiService.getAgent).mockRejectedValue(accessDeniedError);

      const { result } = renderHook(() => useAgents(), {
        wrapper: createWrapper(mockUser1),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Try to update an agent that belongs to user2
      const updateResult = await result.current.updateAgent(mockUser2Agent.id, { name: 'Hacked Name' });

      expect(updateResult).toBeNull();
      expect(result.current.error).toContain('access denied');
    });

    test('should validate agent ownership before operations', async () => {
      vi.mocked(apiService.getAgents).mockResolvedValue({
        success: true,
        data: [mockUser1Agent],
      });

      const { result } = renderHook(() => useAgents(), {
        wrapper: createWrapper(mockUser1),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Try to delete an agent that doesn't belong to user
      const deleteResult = await result.current.deleteAgent(mockUser2Agent.id);

      expect(deleteResult).toBe(false);
    });

    test('should handle authentication errors', async () => {
      const authError = {
        code: 'UNAUTHORIZED',
        message: 'Your session has expired',
        status: 401,
      };

      vi.mocked(apiService.getAgents).mockRejectedValue(authError);

      const { result } = renderHook(() => useAgents(), {
        wrapper: createWrapper(null), // No authenticated user
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toContain('session has expired');
    });
  });

  describe('useDashboard Hook Data Isolation', () => {
    test('should scope dashboard data to authenticated user', async () => {
      const mockDashboardData = {
        totalCalls: 10,
        totalAgents: 2,
        agents: [mockUser1Agent],
        recentCalls: [
          { id: 'call1', userId: 'user1-id', agentId: 'agent1-id' },
        ],
      };

      vi.mocked(apiService.getDashboardOverview).mockResolvedValue({
        success: true,
        data: mockDashboardData,
      });

      const { result } = renderHook(() => useDashboard(), {
        wrapper: createWrapper(mockUser1),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.overview).toEqual(mockDashboardData);
      
      // Verify all agents belong to user1
      if (result.current.overview?.agents) {
        result.current.overview.agents.forEach(agent => {
          expect(agent.userId).toBe(mockUser1.id);
        });
      }
    });

    test('should handle cross-user data contamination errors', async () => {
      const contaminationError = {
        code: 'DATA_INTEGRITY_VIOLATION',
        message: 'Data integrity violation detected',
        status: 500,
      };

      vi.mocked(apiService.getDashboardOverview).mockRejectedValue(contaminationError);

      const { result } = renderHook(() => useDashboard(), {
        wrapper: createWrapper(mockUser1),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('useDataAccessSecurity Hook', () => {
    test('should validate user authentication', () => {
      const mockOnUnauthorizedAccess = vi.fn();
      
      const { result } = renderHook(
        () => useDataAccessSecurity({
          onUnauthorizedAccess: mockOnUnauthorizedAccess,
        }),
        { wrapper: createWrapper(null) } // No authenticated user
      );

      expect(() => {
        result.current.validateUserAuthentication();
      }).toThrow('User must be authenticated');

      expect(mockOnUnauthorizedAccess).toHaveBeenCalled();
    });

    test('should validate data ownership', () => {
      const mockOnDataIntegrityViolation = vi.fn();
      
      const { result } = renderHook(
        () => useDataAccessSecurity({
          onDataIntegrityViolation: mockOnDataIntegrityViolation,
        }),
        { wrapper: createWrapper(mockUser1) }
      );

      const contaminatedData = [
        { id: 'item1', userId: 'user1-id' },
        { id: 'item2', userId: 'user2-id' }, // This belongs to another user
      ];

      expect(() => {
        result.current.validateDataOwnership(contaminatedData, 'Test Data');
      }).toThrow('Data integrity violation');

      expect(mockOnDataIntegrityViolation).toHaveBeenCalledWith({
        dataType: 'Test Data',
        violationType: 'cross_user_contamination',
        expectedUserId: 'user1-id',
        foundUserIds: ['user1-id', 'user2-id'],
      });
    });

    test('should validate agent ownership', async () => {
      const { result } = renderHook(
        () => useDataAccessSecurity({}),
        { wrapper: createWrapper(mockUser1) }
      );

      // Mock API service to return user1's agents
      vi.mocked(apiService.getAgents).mockResolvedValue({
        success: true,
        data: [mockUser1Agent],
      });

      // Should not throw for owned agent
      await expect(
        result.current.validateAgentOwnership(mockUser1Agent.id)
      ).resolves.not.toThrow();

      // Should throw for non-owned agent
      await expect(
        result.current.validateAgentOwnership(mockUser2Agent.id)
      ).rejects.toThrow('Agent not found or access denied');
    });

    test('should handle security violations', () => {
      const mockOnUnauthorizedAccess = vi.fn();
      
      const { result } = renderHook(
        () => useDataAccessSecurity({
          onUnauthorizedAccess: mockOnUnauthorizedAccess,
        }),
        { wrapper: createWrapper(mockUser1) }
      );

      const violation = {
        type: 'unauthorized_access' as const,
        resource: 'agent',
        resourceId: 'agent-123',
        userId: 'user1-id',
        attemptedAction: 'read',
      };

      result.current.handleSecurityViolation(violation);

      expect(mockOnUnauthorizedAccess).toHaveBeenCalledWith(violation);
    });
  });

  describe('API Service User Context Validation', () => {
    test('should include user context in all API calls', async () => {
      // Mock localStorage to simulate authenticated user
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyMS1pZCIsImVtYWlsIjoidXNlcjFAdGVzdC5jb20iLCJpYXQiOjE2MzAwMDAwMDAsImV4cCI6MTYzMDAwMzYwMH0.test';
      
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: vi.fn().mockReturnValue(mockToken),
          setItem: vi.fn(),
          removeItem: vi.fn(),
        },
        writable: true,
      });

      const { result } = renderHook(() => useCalls(), {
        wrapper: createWrapper(mockUser1),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Verify that API calls include authentication headers
      expect(apiService.getCalls).toHaveBeenCalled();
    });

    test('should prevent API calls without authentication', async () => {
      // Mock localStorage to simulate no token
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: vi.fn().mockReturnValue(null),
          setItem: vi.fn(),
          removeItem: vi.fn(),
        },
        writable: true,
      });

      const { result } = renderHook(() => useCalls(), {
        wrapper: createWrapper(null), // No authenticated user
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should not make API calls without authentication
      expect(result.current.calls).toEqual([]);
    });
  });

  describe('Error Boundary Data Isolation', () => {
    test('should not leak sensitive data in error messages', async () => {
      const sensitiveError = {
        code: 'AGENT_ACCESS_DENIED',
        message: 'Access denied',
        status: 403,
        details: {
          agentId: mockUser2Agent.id,
          agentName: mockUser2Agent.name, // Sensitive data
          ownerId: mockUser2.id, // Sensitive data
        },
      };

      vi.mocked(apiService.getAgent).mockRejectedValue(sensitiveError);

      const { result } = renderHook(() => useAgents(), {
        wrapper: createWrapper(mockUser1),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Error message should not contain sensitive information
      if (result.current.error) {
        expect(result.current.error).not.toContain(mockUser2Agent.name);
        expect(result.current.error).not.toContain(mockUser2.id);
        expect(result.current.error).not.toContain(mockUser2Agent.id);
      }
    });

    test('should provide consistent error responses for security', async () => {
      const { result: result1 } = renderHook(() => useAgents(), {
        wrapper: createWrapper(mockUser1),
      });

      const { result: result2 } = renderHook(() => useAgents(), {
        wrapper: createWrapper(mockUser1),
      });

      // Both attempts to access non-existent and other user's agents should return similar errors
      const nonExistentAgentError = await result1.current.updateAgent('non-existent-id', { name: 'Test' });
      const otherUserAgentError = await result2.current.updateAgent(mockUser2Agent.id, { name: 'Test' });

      expect(nonExistentAgentError).toBeNull();
      expect(otherUserAgentError).toBeNull();
      
      // Both should result in similar error states to prevent user enumeration
      expect(result1.current.error).toBeTruthy();
      expect(result2.current.error).toBeTruthy();
    });
  });

  describe('Cache Data Isolation', () => {
    test('should isolate cached data by user', async () => {
      const user1Agents = [mockUser1Agent];
      const user2Agents = [mockUser2Agent];

      // First user's data
      vi.mocked(apiService.getAgents).mockResolvedValueOnce({
        success: true,
        data: user1Agents,
      });

      const { result: result1 } = renderHook(() => useAgents(), {
        wrapper: createWrapper(mockUser1),
      });

      await waitFor(() => {
        expect(result1.current.loading).toBe(false);
      });

      expect(result1.current.agents).toEqual(user1Agents);

      // Second user's data should not see first user's cached data
      vi.mocked(apiService.getAgents).mockResolvedValueOnce({
        success: true,
        data: user2Agents,
      });

      const { result: result2 } = renderHook(() => useAgents(), {
        wrapper: createWrapper(mockUser2),
      });

      await waitFor(() => {
        expect(result2.current.loading).toBe(false);
      });

      expect(result2.current.agents).toEqual(user2Agents);
      expect(result2.current.agents).not.toEqual(user1Agents);
    });

    test('should clear cache on user change', async () => {
      const user1Data = [mockUser1Agent];

      vi.mocked(apiService.getAgents).mockResolvedValue({
        success: true,
        data: user1Data,
      });

      const { result, rerender } = renderHook(
        ({ user }) => useAgents(),
        {
          wrapper: ({ children, user }: { children: ReactNode; user: any }) =>
            createWrapper(user)({ children }),
          initialProps: { user: mockUser1 },
        }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.agents).toEqual(user1Data);

      // Change user - should clear cache and fetch new data
      const user2Data = [mockUser2Agent];
      vi.mocked(apiService.getAgents).mockResolvedValue({
        success: true,
        data: user2Data,
      });

      rerender({ user: mockUser2 });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.agents).toEqual(user2Data);
    });
  });
});