import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { adminApiService } from '../adminApiService';
import { apiService } from '../apiService';

// Mock the base API service
vi.mock('../apiService');

const mockApiService = vi.mocked(apiService);

describe('Admin API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default mock responses
    mockApiService.request.mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('User Management API', () => {
    it('should fetch admin users with correct parameters', async () => {
      const mockUsers = [
        { id: '1', email: 'user1@test.com', role: 'user' },
        { id: '2', email: 'admin@test.com', role: 'admin' }
      ];

      mockApiService.request.mockResolvedValue({ data: mockUsers });

      const params = {
        page: 1,
        limit: 10,
        search: 'test',
        role: 'admin' as const
      };

      const result = await adminApiService.getAdminUsers(params);

      expect(mockApiService.request).toHaveBeenCalledWith('/admin/users', {
        params
      });
      expect(result.data).toEqual(mockUsers);
    });

    it('should update user with proper data structure', async () => {
      const userId = '123';
      const updateData = {
        name: 'Updated Name',
        email: 'updated@test.com',
        isActive: false
      };

      mockApiService.request.mockResolvedValue({ data: { success: true } });

      await adminApiService.updateAdminUser(userId, updateData);

      expect(mockApiService.request).toHaveBeenCalledWith(`/admin/users/${userId}`, {
        method: 'PUT',
        data: updateData
      });
    });

    it('should adjust user credits with audit trail', async () => {
      const userId = '123';
      const adjustment = {
        amount: 100,
        reason: 'Promotional credits',
        type: 'add' as const
      };

      mockApiService.request.mockResolvedValue({ 
        data: { 
          newBalance: 250,
          auditId: 'audit-123'
        } 
      });

      const result = await adminApiService.adjustUserCredits(userId, adjustment);

      expect(mockApiService.request).toHaveBeenCalledWith(`/admin/users/${userId}/credits`, {
        method: 'POST',
        data: adjustment
      });
      expect(result.data.newBalance).toBe(250);
      expect(result.data.auditId).toBe('audit-123');
    });

    it('should handle user status toggle', async () => {
      const userId = '123';
      const isActive = false;

      mockApiService.request.mockResolvedValue({ 
        data: { 
          success: true,
          newStatus: 'inactive'
        } 
      });

      await adminApiService.toggleUserStatus(userId, isActive);

      expect(mockApiService.request).toHaveBeenCalledWith(`/admin/users/${userId}/status`, {
        method: 'PATCH',
        data: { isActive }
      });
    });
  });

  describe('Agent Management API', () => {
    it('should fetch all agents across users', async () => {
      const mockAgents = [
        { id: '1', name: 'Agent 1', userId: 'user1', status: 'active' },
        { id: '2', name: 'Agent 2', userId: 'user2', status: 'inactive' }
      ];

      mockApiService.request.mockResolvedValue({ data: mockAgents });

      const params = {
        page: 1,
        limit: 20,
        status: 'active' as const,
        userId: 'user1'
      };

      const result = await adminApiService.getAdminAgents(params);

      expect(mockApiService.request).toHaveBeenCalledWith('/admin/agents', {
        params
      });
      expect(result.data).toEqual(mockAgents);
    });

    it('should perform bulk agent operations', async () => {
      const agentIds = ['1', '2', '3'];
      const action = 'activate';

      mockApiService.request.mockResolvedValue({ 
        data: { 
          successful: 2,
          failed: [{ agentId: '3', error: 'Agent not found' }]
        } 
      });

      const result = await adminApiService.bulkAgentAction(agentIds, action);

      expect(mockApiService.request).toHaveBeenCalledWith('/admin/agents/bulk', {
        method: 'POST',
        data: { agentIds, action }
      });
      expect(result.data.successful).toBe(2);
      expect(result.data.failed).toHaveLength(1);
    });

    it('should get agent health status', async () => {
      const mockHealthData = {
        totalAgents: 100,
        healthyAgents: 95,
        unhealthyAgents: 5,
        elevenLabsStatus: 'operational'
      };

      mockApiService.request.mockResolvedValue({ data: mockHealthData });

      const result = await adminApiService.getAgentHealth();

      expect(mockApiService.request).toHaveBeenCalledWith('/admin/agents/health');
      expect(result.data).toEqual(mockHealthData);
    });
  });

  describe('System Analytics API', () => {
    it('should fetch system statistics', async () => {
      const mockStats = {
        users: { total: 1000, active: 850 },
        agents: { total: 500, active: 400 },
        calls: { totalThisMonth: 10000, successRate: 0.95 },
        system: { uptime: 99.9, responseTime: 150 }
      };

      mockApiService.request.mockResolvedValue({ data: mockStats });

      const result = await adminApiService.getSystemStats();

      expect(mockApiService.request).toHaveBeenCalledWith('/admin/stats/system');
      expect(result.data).toEqual(mockStats);
    });

    it('should fetch analytics data with time range', async () => {
      const params = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        granularity: 'day' as const
      };

      const mockAnalytics = {
        userGrowth: [{ date: '2024-01-01', count: 10 }],
        callVolume: [{ date: '2024-01-01', count: 100 }],
        revenue: [{ date: '2024-01-01', amount: 1000 }]
      };

      mockApiService.request.mockResolvedValue({ data: mockAnalytics });

      const result = await adminApiService.getAnalyticsData(params);

      expect(mockApiService.request).toHaveBeenCalledWith('/admin/analytics', {
        params
      });
      expect(result.data).toEqual(mockAnalytics);
    });
  });

  describe('Configuration Management API', () => {
    it('should manage API keys', async () => {
      const mockApiKeys = [
        { id: '1', name: 'Primary Key', isDefault: true, status: 'active' },
        { id: '2', name: 'Secondary Key', isDefault: false, status: 'active' }
      ];

      mockApiService.request.mockResolvedValue({ data: mockApiKeys });

      const result = await adminApiService.getAPIKeys();

      expect(mockApiService.request).toHaveBeenCalledWith('/admin/config/api-keys');
      expect(result.data).toEqual(mockApiKeys);
    });

    it('should update API key configuration', async () => {
      const keyId = '123';
      const config = {
        name: 'Updated Key',
        isDefault: true,
        assignedUsers: ['user1', 'user2']
      };

      mockApiService.request.mockResolvedValue({ data: { success: true } });

      await adminApiService.updateAPIKey(keyId, config);

      expect(mockApiService.request).toHaveBeenCalledWith(`/admin/config/api-keys/${keyId}`, {
        method: 'PUT',
        data: config
      });
    });

    it('should manage feature flags', async () => {
      const mockFeatureFlags = [
        { id: 'dashboard_kpis', name: 'Dashboard KPIs', isEnabled: false },
        { id: 'agent_analytics', name: 'Agent Analytics', isEnabled: true }
      ];

      mockApiService.request.mockResolvedValue({ data: mockFeatureFlags });

      const result = await adminApiService.getFeatureFlags();

      expect(mockApiService.request).toHaveBeenCalledWith('/admin/config/feature-flags');
      expect(result.data).toEqual(mockFeatureFlags);
    });

    it('should update feature flag for users', async () => {
      const flagId = 'dashboard_kpis';
      const config = {
        isEnabled: true,
        targetUsers: ['user1', 'user2'],
        scope: 'user' as const
      };

      mockApiService.request.mockResolvedValue({ data: { success: true } });

      await adminApiService.updateFeatureFlag(flagId, config);

      expect(mockApiService.request).toHaveBeenCalledWith(`/admin/config/feature-flags/${flagId}`, {
        method: 'PUT',
        data: config
      });
    });
  });

  describe('Audit Logs API', () => {
    it('should fetch audit logs with filters', async () => {
      const params = {
        page: 1,
        limit: 50,
        adminUserId: 'admin1',
        action: 'user_update',
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      };

      const mockLogs = [
        {
          id: '1',
          adminUserId: 'admin1',
          action: 'user_update',
          targetUserId: 'user1',
          timestamp: '2024-01-15T10:00:00Z',
          details: { field: 'email', oldValue: 'old@test.com', newValue: 'new@test.com' }
        }
      ];

      mockApiService.request.mockResolvedValue({ data: mockLogs });

      const result = await adminApiService.getAuditLogs(params);

      expect(mockApiService.request).toHaveBeenCalledWith('/admin/audit-logs', {
        params
      });
      expect(result.data).toEqual(mockLogs);
    });

    it('should export audit logs', async () => {
      const params = {
        format: 'csv' as const,
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      };

      const mockExportData = {
        downloadUrl: 'https://example.com/export.csv',
        expiresAt: '2024-01-16T10:00:00Z'
      };

      mockApiService.request.mockResolvedValue({ data: mockExportData });

      const result = await adminApiService.exportAuditLogs(params);

      expect(mockApiService.request).toHaveBeenCalledWith('/admin/audit-logs/export', {
        method: 'POST',
        data: params
      });
      expect(result.data).toEqual(mockExportData);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockApiService.request.mockRejectedValue(new Error('Network Error'));

      await expect(adminApiService.getSystemStats()).rejects.toThrow('Network Error');
    });

    it('should handle API errors with proper error structure', async () => {
      const apiError = {
        response: {
          status: 403,
          data: {
            error: 'Insufficient permissions',
            code: 'FORBIDDEN'
          }
        }
      };

      mockApiService.request.mockRejectedValue(apiError);

      await expect(adminApiService.getAdminUsers({})).rejects.toEqual(apiError);
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';

      mockApiService.request.mockRejectedValue(timeoutError);

      await expect(adminApiService.getSystemStats()).rejects.toThrow('Request timeout');
    });
  });

  describe('Request Validation', () => {
    it('should validate required parameters', async () => {
      // Test missing required parameters
      await expect(
        adminApiService.updateAdminUser('', { name: 'Test' })
      ).rejects.toThrow('User ID is required');
    });

    it('should validate data types', async () => {
      // Test invalid data types
      await expect(
        adminApiService.adjustUserCredits('123', {
          amount: 'invalid' as any,
          reason: 'test',
          type: 'add'
        })
      ).rejects.toThrow('Amount must be a number');
    });

    it('should validate enum values', async () => {
      // Test invalid enum values
      await expect(
        adminApiService.getAdminUsers({ role: 'invalid' as any })
      ).rejects.toThrow('Invalid role value');
    });
  });

  describe('Caching and Performance', () => {
    it('should cache frequently accessed data', async () => {
      const mockStats = { users: { total: 100 } };
      mockApiService.request.mockResolvedValue({ data: mockStats });

      // First call
      await adminApiService.getSystemStats();
      // Second call should use cache
      await adminApiService.getSystemStats();

      // Should only make one API call due to caching
      expect(mockApiService.request).toHaveBeenCalledTimes(1);
    });

    it('should handle concurrent requests efficiently', async () => {
      const mockData = { data: 'test' };
      mockApiService.request.mockResolvedValue(mockData);

      // Make multiple concurrent requests
      const promises = Array(5).fill(null).map(() => 
        adminApiService.getSystemStats()
      );

      const results = await Promise.all(promises);

      // All should return the same data
      results.forEach(result => {
        expect(result).toEqual(mockData);
      });

      // Should deduplicate concurrent requests
      expect(mockApiService.request).toHaveBeenCalledTimes(1);
    });
  });

  describe('Real-time Updates', () => {
    it('should handle WebSocket message integration', async () => {
      const mockWebSocketMessage = {
        type: 'USER_UPDATED',
        data: {
          userId: '123',
          changes: { name: 'New Name' }
        }
      };

      // Simulate WebSocket message
      const messageHandler = vi.fn();
      adminApiService.onRealtimeUpdate(messageHandler);

      // Trigger WebSocket message
      adminApiService.handleWebSocketMessage(mockWebSocketMessage);

      expect(messageHandler).toHaveBeenCalledWith(mockWebSocketMessage);
    });

    it('should invalidate cache on real-time updates', async () => {
      const mockStats = { users: { total: 100 } };
      mockApiService.request.mockResolvedValue({ data: mockStats });

      // Cache initial data
      await adminApiService.getSystemStats();

      // Simulate real-time update
      adminApiService.handleWebSocketMessage({
        type: 'STATS_UPDATED',
        data: { users: { total: 101 } }
      });

      // Next call should fetch fresh data
      const updatedStats = { users: { total: 101 } };
      mockApiService.request.mockResolvedValue({ data: updatedStats });

      const result = await adminApiService.getSystemStats();

      expect(result.data).toEqual(updatedStats);
      expect(mockApiService.request).toHaveBeenCalledTimes(2);
    });
  });
});