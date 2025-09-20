import { describe, it, expect, beforeEach, vi } from 'vitest';
import { adminApiService } from '../adminApiService';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('AdminApiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('mock-token');
  });

  describe('Authentication', () => {
    it('includes auth headers in requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: { totalUsers: 100 } }),
      });

      await adminApiService.getDashboardMetrics();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
          }),
        })
      );
    });

    it('handles missing auth token', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: {} }),
      });

      await adminApiService.getDashboardMetrics();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'Authorization': expect.any(String),
          }),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('handles 403 Forbidden errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ error: { message: 'Forbidden' } }),
      });

      await expect(adminApiService.getDashboardMetrics()).rejects.toThrow(
        'Admin access required. Please check your permissions.'
      );
    });

    it('handles 401 Unauthorized errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ error: { message: 'Unauthorized' } }),
      });

      await expect(adminApiService.getDashboardMetrics()).rejects.toThrow(
        'Authentication required. Please log in again.'
      );
    });

    it('handles network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(adminApiService.getDashboardMetrics()).rejects.toThrow(
        'Network error'
      );
    });

    it('handles non-JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: async () => 'Internal Server Error',
      });

      await expect(adminApiService.getDashboardMetrics()).rejects.toThrow(
        'HTTP error! status: 500'
      );
    });
  });

  describe('Dashboard Methods', () => {
    it('gets dashboard metrics', async () => {
      const mockData = {
        totalUsers: 100,
        activeUsers: 80,
        totalAgents: 50,
        systemHealth: 'healthy',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: mockData }),
      });

      const result = await adminApiService.getDashboardMetrics();

      expect(result.data).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/dashboard'),
        expect.any(Object)
      );
    });

    it('gets system stats', async () => {
      const mockStats = {
        users: { total: 100, active: 80 },
        agents: { total: 50, active: 40 },
        calls: { totalThisMonth: 1000 },
        system: { uptime: 99.9 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: mockStats }),
      });

      const result = await adminApiService.getSystemStats();

      expect(result.data).toEqual(mockStats);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/system/stats'),
        expect.any(Object)
      );
    });
  });

  describe('User Management Methods', () => {
    it('gets users with filters', async () => {
      const mockUsers = [
        { id: '1', email: 'user1@test.com', role: 'user' },
        { id: '2', email: 'user2@test.com', role: 'admin' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: mockUsers }),
      });

      const options = {
        page: 1,
        limit: 10,
        search: 'test',
        role: 'user' as const,
      };

      await adminApiService.getUsers(options);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('page=1&limit=10&search=test&role=user'),
        expect.any(Object)
      );
    });

    it('adjusts user credits', async () => {
      const mockResponse = {
        success: true,
        newBalance: 150,
        transactionId: 'txn_123',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: mockResponse }),
      });

      const request = {
        userId: 'user_123',
        amount: 50,
        reason: 'Admin adjustment',
        type: 'add' as const,
      };

      const result = await adminApiService.adjustUserCredits(request);

      expect(result.data).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/users/user_123/credits'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(request),
        })
      );
    });
  });

  describe('Agent Management Methods', () => {
    it('gets agents with filters', async () => {
      const mockAgents = [
        { id: '1', name: 'Agent 1', userEmail: 'user1@test.com' },
        { id: '2', name: 'Agent 2', userEmail: 'user2@test.com' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: mockAgents }),
      });

      const options = {
        userId: 'user_123',
        isActive: true,
        agentType: 'call',
      };

      await adminApiService.getAgents(options);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('userId=user_123&isActive=true&agentType=call'),
        expect.any(Object)
      );
    });

    it('performs bulk agent actions', async () => {
      const mockResponse = {
        successful: 2,
        failed: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: mockResponse }),
      });

      const request = {
        agentIds: ['agent_1', 'agent_2'],
        action: 'activate' as const,
      };

      const result = await adminApiService.bulkAgentAction(request);

      expect(result.data).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/agents/bulk'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(request),
        })
      );
    });
  });

  describe('Query String Building', () => {
    it('builds query string correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: [] }),
      });

      await adminApiService.getUsers({
        page: 1,
        limit: 20,
        search: 'test user',
        role: 'admin',
        isActive: true,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('page=1&limit=20&search=test+user&role=admin&isActive=true'),
        expect.any(Object)
      );
    });

    it('handles undefined and null values in query params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: [] }),
      });

      await adminApiService.getUsers({
        page: 1,
        search: undefined,
        role: null as any,
        isActive: false,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('page=1&isActive=false'),
        expect.any(Object)
      );
      
      // Should not contain undefined or null values
      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).not.toContain('search=');
      expect(calledUrl).not.toContain('role=');
    });

    it('handles array values in query params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: [] }),
      });

      // Mock method that accepts array parameters
      const mockParams = {
        ids: ['1', '2', '3'],
        statuses: ['active', 'inactive'],
      };

      // Simulate a method call that would use array parameters
      await adminApiService.getUsers(mockParams as any);

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('ids=1&ids=2&ids=3');
      expect(calledUrl).toContain('statuses=active&statuses=inactive');
    });
  });

  describe('Utility Methods', () => {
    it('validates admin access', async () => {
      const mockResponse = {
        hasAccess: true,
        role: 'admin',
        permissions: ['canViewUsers', 'canManageAgents'],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: mockResponse }),
      });

      const result = await adminApiService.validateAdminAccess();

      expect(result.data).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/validate'),
        expect.any(Object)
      );
    });

    it('gets admin profile', async () => {
      const mockProfile = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        adminRole: 'admin',
        permissions: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: mockProfile }),
      });

      const result = await adminApiService.getAdminProfile();

      expect(result.data).toEqual(mockProfile);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/profile'),
        expect.any(Object)
      );
    });
  });
});