import { renderHook } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useDataAccessSecurity } from '../useDataAccessSecurity';
import { useAuth } from '../../contexts/AuthContext';

// Mock the auth context
vi.mock('../../contexts/AuthContext');
const mockUseAuth = vi.mocked(useAuth);

// Mock query client
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    removeQueries: vi.fn(),
  }),
}));

describe('useDataAccessSecurity', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: mockUser,
      logout: mockLogout,
      isLoading: false,
      isAuthenticated: true,
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      refreshUser: vi.fn(),
      updateUserProfile: vi.fn(),
      clearError: vi.fn(),
      isTokenExpiring: false,
      sessionValidated: true,
      isAdminUser: vi.fn(),
      isSuperAdminUser: vi.fn(),
    });
  });

  describe('validateUserAuthentication', () => {
    it('should pass when user is authenticated', () => {
      const { result } = renderHook(() => useDataAccessSecurity());
      
      expect(() => {
        result.current.validateUserAuthentication();
      }).not.toThrow();
    });

    it('should throw error when user is not authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        logout: mockLogout,
        isLoading: false,
        isAuthenticated: false,
        error: null,
        login: vi.fn(),
        register: vi.fn(),
        refreshUser: vi.fn(),
        updateUserProfile: vi.fn(),
        clearError: vi.fn(),
        isTokenExpiring: false,
        sessionValidated: false,
        isAdminUser: vi.fn(),
        isSuperAdminUser: vi.fn(),
      });

      const { result } = renderHook(() => useDataAccessSecurity());
      
      expect(() => {
        result.current.validateUserAuthentication();
      }).toThrow('User must be authenticated to access this data');
    });
  });

  describe('validateDataOwnership', () => {
    it('should pass when data belongs to current user', () => {
      const { result } = renderHook(() => useDataAccessSecurity());
      
      const testData = {
        id: 'data-123',
        user_id: 'user-123',
        content: 'test content'
      };

      expect(() => {
        result.current.validateDataOwnership(testData, 'Test Data');
      }).not.toThrow();
    });

    it('should throw error when data belongs to another user', () => {
      const { result } = renderHook(() => useDataAccessSecurity());
      
      const testData = {
        id: 'data-123',
        user_id: 'other-user-456',
        content: 'test content'
      };

      expect(() => {
        result.current.validateDataOwnership(testData, 'Test Data');
      }).toThrow('Data integrity violation: Test Data belongs to another user');
    });

    it('should validate array data correctly', () => {
      const { result } = renderHook(() => useDataAccessSecurity());
      
      const testData = [
        { id: 'data-1', user_id: 'user-123', content: 'content 1' },
        { id: 'data-2', user_id: 'user-123', content: 'content 2' },
      ];

      expect(() => {
        result.current.validateDataOwnership(testData, 'Test Data Array');
      }).not.toThrow();
    });

    it('should throw error when array contains data from other users', () => {
      const { result } = renderHook(() => useDataAccessSecurity());
      
      const testData = [
        { id: 'data-1', user_id: 'user-123', content: 'content 1' },
        { id: 'data-2', user_id: 'other-user-456', content: 'content 2' },
      ];

      expect(() => {
        result.current.validateDataOwnership(testData, 'Test Data Array');
      }).toThrow('Data integrity violation: Test Data Array contains data from other users');
    });
  });

  describe('validateAgentOwnership', () => {
    it('should pass when agent exists in user agents list', async () => {
      const { result } = renderHook(() => useDataAccessSecurity());
      
      const userAgents = [
        { id: 'agent-123', user_id: 'user-123', name: 'Test Agent' },
        { id: 'agent-456', user_id: 'user-123', name: 'Another Agent' },
      ];

      await expect(
        result.current.validateAgentOwnership('agent-123', userAgents)
      ).resolves.not.toThrow();
    });

    it('should throw error when agent does not exist in user agents list', async () => {
      const { result } = renderHook(() => useDataAccessSecurity());
      
      const userAgents = [
        { id: 'agent-123', user_id: 'user-123', name: 'Test Agent' },
      ];

      await expect(
        result.current.validateAgentOwnership('agent-999', userAgents)
      ).rejects.toThrow('Agent not found or access denied');
    });
  });

  describe('security properties', () => {
    it('should return correct authentication status', () => {
      const { result } = renderHook(() => useDataAccessSecurity());
      
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.currentUserId).toBe('user-123');
    });

    it('should return false for authentication when user is null', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        logout: mockLogout,
        isLoading: false,
        isAuthenticated: false,
        error: null,
        login: vi.fn(),
        register: vi.fn(),
        refreshUser: vi.fn(),
        updateUserProfile: vi.fn(),
        clearError: vi.fn(),
        isTokenExpiring: false,
        sessionValidated: false,
        isAdminUser: vi.fn(),
        isSuperAdminUser: vi.fn(),
      });

      const { result } = renderHook(() => useDataAccessSecurity());
      
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.currentUserId).toBeUndefined();
    });
  });
});