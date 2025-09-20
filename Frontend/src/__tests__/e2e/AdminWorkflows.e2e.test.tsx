import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from '../../App';
import { AuthContext } from '../../contexts/AuthContext';
import { adminApiService } from '../../services/adminApiService';

// Mock services
vi.mock('../../services/adminApiService');
vi.mock('../../services/websocketService');

const mockAdminUser = {
  id: 'admin-1',
  email: 'admin@test.com',
  name: 'Admin User',
  role: 'admin' as const,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
};

const mockAuthContext = {
  user: mockAdminUser,
  login: vi.fn(),
  logout: vi.fn(),
  isLoading: false,
  isAuthenticated: true
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthContext}>
          {children}
        </AuthContext.Provider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Admin Workflows - End-to-End Tests', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock responses
    vi.mocked(adminApiService.getSystemStats).mockResolvedValue({
      data: {
        users: { total: 1000, active: 850, newThisMonth: 50 },
        agents: { total: 500, active: 400, healthyPercentage: 95 },
        calls: { totalThisMonth: 10000, successRate: 0.95, averageDuration: 180 },
        system: { uptime: 99.9, responseTime: 150, errorRate: 0.01, activeConnections: 25 }
      }
    });

    vi.mocked(adminApiService.getAdminUsers).mockResolvedValue({
      data: [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@test.com',
          role: 'user',
          status: 'active',
          registrationDate: new Date('2024-01-01'),
          lastLogin: new Date('2024-01-15'),
          agentCount: 3,
          callCount: 150,
          creditsUsed: 500,
          creditsRemaining: 1000
        },
        {
          id: '2',
          name: 'Jane Smith',
          email: 'jane@test.com',
          role: 'user',
          status: 'inactive',
          registrationDate: new Date('2024-01-05'),
          lastLogin: new Date('2024-01-10'),
          agentCount: 1,
          callCount: 25,
          creditsUsed: 100,
          creditsRemaining: 200
        }
      ]
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete User Management Workflow', () => {
    it('should complete full user management workflow', async () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Navigate to admin panel
      await user.click(screen.getByText('Admin Panel'));
      
      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });

      // Navigate to User Management
      await user.click(screen.getByText('User Management'));
      
      await waitFor(() => {
        expect(screen.getByText('User List')).toBeInTheDocument();
      });

      // Search for a specific user
      const searchInput = screen.getByPlaceholderText('Search users...');
      await user.type(searchInput, 'john@test.com');

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Click on user to view details
      await user.click(screen.getByText('John Doe'));

      await waitFor(() => {
        expect(screen.getByText('User Details')).toBeInTheDocument();
        expect(screen.getByText('john@test.com')).toBeInTheDocument();
        expect(screen.getByText('3 agents')).toBeInTheDocument();
        expect(screen.getByText('150 calls')).toBeInTheDocument();
      });

      // Edit user information
      await user.click(screen.getByText('Edit User'));

      const nameInput = screen.getByDisplayValue('John Doe');
      await user.clear(nameInput);
      await user.type(nameInput, 'John Updated');

      // Mock the update API call
      vi.mocked(adminApiService.updateAdminUser).mockResolvedValue({
        data: { success: true }
      });

      await user.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(adminApiService.updateAdminUser).toHaveBeenCalledWith('1', {
          name: 'John Updated'
        });
        expect(screen.getByText('User updated successfully')).toBeInTheDocument();
      });

      // Adjust user credits
      await user.click(screen.getByText('Adjust Credits'));

      const creditInput = screen.getByPlaceholderText('Enter credit amount');
      await user.type(creditInput, '500');

      const reasonInput = screen.getByPlaceholderText('Reason for adjustment');
      await user.type(reasonInput, 'Promotional credits');

      // Mock the credit adjustment API call
      vi.mocked(adminApiService.adjustUserCredits).mockResolvedValue({
        data: { newBalance: 1500, auditId: 'audit-123' }
      });

      await user.click(screen.getByText('Add Credits'));

      await waitFor(() => {
        expect(adminApiService.adjustUserCredits).toHaveBeenCalledWith('1', {
          amount: 500,
          reason: 'Promotional credits',
          type: 'add'
        });
        expect(screen.getByText('Credits adjusted successfully')).toBeInTheDocument();
        expect(screen.getByText('New balance: 1500')).toBeInTheDocument();
      });

      // Toggle user status
      const statusToggle = screen.getByRole('switch', { name: /user status/i });
      await user.click(statusToggle);

      // Mock the status toggle API call
      vi.mocked(adminApiService.toggleUserStatus).mockResolvedValue({
        data: { success: true, newStatus: 'inactive' }
      });

      await waitFor(() => {
        expect(adminApiService.toggleUserStatus).toHaveBeenCalledWith('1', false);
        expect(screen.getByText('User status updated')).toBeInTheDocument();
      });
    });

    it('should handle bulk user operations', async () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Navigate to User Management
      await user.click(screen.getByText('Admin Panel'));
      await user.click(screen.getByText('User Management'));

      await waitFor(() => {
        expect(screen.getByText('User List')).toBeInTheDocument();
      });

      // Select multiple users
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]); // First user
      await user.click(checkboxes[2]); // Second user

      // Open bulk actions menu
      await user.click(screen.getByText('Bulk Actions'));

      // Select bulk deactivate
      await user.click(screen.getByText('Deactivate Selected'));

      // Confirm bulk action
      await user.click(screen.getByText('Confirm'));

      // Mock bulk operation API call
      vi.mocked(adminApiService.bulkUserAction).mockResolvedValue({
        data: {
          successful: 2,
          failed: []
        }
      });

      await waitFor(() => {
        expect(adminApiService.bulkUserAction).toHaveBeenCalledWith(
          ['1', '2'],
          'deactivate'
        );
        expect(screen.getByText('Bulk operation completed: 2 successful, 0 failed')).toBeInTheDocument();
      });
    });
  });

  describe('Complete Agent Management Workflow', () => {
    it('should complete full agent management workflow', async () => {
      // Mock agent data
      vi.mocked(adminApiService.getAdminAgents).mockResolvedValue({
        data: [
          {
            id: 'agent-1',
            name: 'Sales Agent',
            userId: 'user-1',
            userName: 'John Doe',
            type: 'sales',
            status: 'active',
            createdAt: new Date('2024-01-01'),
            lastUsed: new Date('2024-01-15'),
            callCount: 50,
            successRate: 0.92
          },
          {
            id: 'agent-2',
            name: 'Support Agent',
            userId: 'user-2',
            userName: 'Jane Smith',
            type: 'support',
            status: 'inactive',
            createdAt: new Date('2024-01-05'),
            lastUsed: new Date('2024-01-10'),
            callCount: 25,
            successRate: 0.88
          }
        ]
      });

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Navigate to Agent Management
      await user.click(screen.getByText('Admin Panel'));
      await user.click(screen.getByText('Agent Management'));

      await waitFor(() => {
        expect(screen.getByText('Agent Monitor')).toBeInTheDocument();
      });

      // View agent list
      await user.click(screen.getByText('All Agents'));

      await waitFor(() => {
        expect(screen.getByText('Sales Agent')).toBeInTheDocument();
        expect(screen.getByText('Support Agent')).toBeInTheDocument();
      });

      // Filter agents by status
      const statusFilter = screen.getByRole('combobox', { name: /status filter/i });
      await user.click(statusFilter);
      await user.click(screen.getByText('Active Only'));

      await waitFor(() => {
        expect(screen.getByText('Sales Agent')).toBeInTheDocument();
        expect(screen.queryByText('Support Agent')).not.toBeInTheDocument();
      });

      // View agent details
      await user.click(screen.getByText('Sales Agent'));

      await waitFor(() => {
        expect(screen.getByText('Agent Details')).toBeInTheDocument();
        expect(screen.getByText('Owner: John Doe')).toBeInTheDocument();
        expect(screen.getByText('Success Rate: 92%')).toBeInTheDocument();
      });

      // Check agent health
      await user.click(screen.getByText('Health Check'));

      // Mock agent health API call
      vi.mocked(adminApiService.getAgentHealth).mockResolvedValue({
        data: {
          totalAgents: 100,
          healthyAgents: 95,
          unhealthyAgents: 5,
          elevenLabsStatus: 'operational'
        }
      });

      await waitFor(() => {
        expect(screen.getByText('95 healthy agents')).toBeInTheDocument();
        expect(screen.getByText('5 unhealthy agents')).toBeInTheDocument();
        expect(screen.getByText('ElevenLabs: Operational')).toBeInTheDocument();
      });

      // Perform bulk agent activation
      await user.click(screen.getByText('All Agents'));
      
      // Select inactive agents
      const agentCheckboxes = screen.getAllByRole('checkbox');
      await user.click(agentCheckboxes[2]); // Support Agent (inactive)

      await user.click(screen.getByText('Bulk Actions'));
      await user.click(screen.getByText('Activate Selected'));

      // Mock bulk agent action
      vi.mocked(adminApiService.bulkAgentAction).mockResolvedValue({
        data: {
          successful: 1,
          failed: []
        }
      });

      await user.click(screen.getByText('Confirm'));

      await waitFor(() => {
        expect(adminApiService.bulkAgentAction).toHaveBeenCalledWith(
          ['agent-2'],
          'activate'
        );
        expect(screen.getByText('1 agent activated successfully')).toBeInTheDocument();
      });
    });
  });

  describe('System Analytics and Reporting Workflow', () => {
    it('should complete analytics and reporting workflow', async () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Navigate to System Analytics
      await user.click(screen.getByText('Admin Panel'));
      await user.click(screen.getByText('System Analytics'));

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      // View system metrics
      expect(screen.getByText('1,000 Total Users')).toBeInTheDocument();
      expect(screen.getByText('500 Total Agents')).toBeInTheDocument();
      expect(screen.getByText('10,000 Calls This Month')).toBeInTheDocument();

      // Change time range
      const timeRangeSelector = screen.getByRole('combobox', { name: /time range/i });
      await user.click(timeRangeSelector);
      await user.click(screen.getByText('Last 7 Days'));

      // Mock analytics data for new time range
      vi.mocked(adminApiService.getAnalyticsData).mockResolvedValue({
        data: {
          userGrowth: [
            { date: '2024-01-15', count: 10 },
            { date: '2024-01-16', count: 15 }
          ],
          callVolume: [
            { date: '2024-01-15', count: 500 },
            { date: '2024-01-16', count: 600 }
          ]
        }
      });

      await waitFor(() => {
        expect(adminApiService.getAnalyticsData).toHaveBeenCalledWith({
          startDate: expect.any(String),
          endDate: expect.any(String),
          granularity: 'day'
        });
      });

      // Generate custom report
      await user.click(screen.getByText('Generate Report'));

      // Configure report parameters
      const reportNameInput = screen.getByPlaceholderText('Report name');
      await user.type(reportNameInput, 'Weekly Performance Report');

      // Select report metrics
      await user.click(screen.getByText('User Growth'));
      await user.click(screen.getByText('Call Volume'));
      await user.click(screen.getByText('Revenue'));

      // Set date range
      const startDateInput = screen.getByLabelText('Start Date');
      await user.type(startDateInput, '2024-01-01');

      const endDateInput = screen.getByLabelText('End Date');
      await user.type(endDateInput, '2024-01-31');

      // Mock report generation
      vi.mocked(adminApiService.generateReport).mockResolvedValue({
        data: {
          reportId: 'report-123',
          downloadUrl: 'https://example.com/report.pdf',
          expiresAt: '2024-01-16T10:00:00Z'
        }
      });

      await user.click(screen.getByText('Generate'));

      await waitFor(() => {
        expect(adminApiService.generateReport).toHaveBeenCalledWith({
          name: 'Weekly Performance Report',
          metrics: ['userGrowth', 'callVolume', 'revenue'],
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          format: 'pdf'
        });
        expect(screen.getByText('Report generated successfully')).toBeInTheDocument();
        expect(screen.getByText('Download Report')).toBeInTheDocument();
      });

      // Export data
      await user.click(screen.getByText('Export Data'));
      await user.click(screen.getByText('CSV Format'));

      // Mock export
      vi.mocked(adminApiService.exportAnalyticsData).mockResolvedValue({
        data: {
          downloadUrl: 'https://example.com/export.csv',
          expiresAt: '2024-01-16T10:00:00Z'
        }
      });

      await user.click(screen.getByText('Export'));

      await waitFor(() => {
        expect(adminApiService.exportAnalyticsData).toHaveBeenCalledWith({
          format: 'csv',
          startDate: expect.any(String),
          endDate: expect.any(String)
        });
        expect(screen.getByText('Export ready for download')).toBeInTheDocument();
      });
    });
  });

  describe('Configuration Management Workflow', () => {
    it('should complete configuration management workflow', async () => {
      // Mock API keys data
      vi.mocked(adminApiService.getAPIKeys).mockResolvedValue({
        data: [
          {
            id: 'key-1',
            name: 'Primary Key',
            key: 'sk-********1234',
            isDefault: true,
            assignedUsers: ['user-1', 'user-2'],
            usageStats: {
              totalCalls: 1000,
              remainingQuota: 9000,
              costThisMonth: 150
            },
            status: 'active'
          }
        ]
      });

      // Mock feature flags data
      vi.mocked(adminApiService.getFeatureFlags).mockResolvedValue({
        data: [
          {
            id: 'dashboard_kpis',
            name: 'Dashboard KPIs',
            description: 'Advanced dashboard KPI features',
            isEnabled: false,
            scope: 'global',
            targetUsers: [],
            targetTiers: []
          }
        ]
      });

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Navigate to Configuration
      await user.click(screen.getByText('Admin Panel'));
      await user.click(screen.getByText('Configuration'));

      await waitFor(() => {
        expect(screen.getByText('System Configuration')).toBeInTheDocument();
      });

      // Manage API Keys
      await user.click(screen.getByText('API Keys'));

      await waitFor(() => {
        expect(screen.getByText('Primary Key')).toBeInTheDocument();
        expect(screen.getByText('sk-********1234')).toBeInTheDocument();
      });

      // Update API key configuration
      await user.click(screen.getByText('Edit'));

      const keyNameInput = screen.getByDisplayValue('Primary Key');
      await user.clear(keyNameInput);
      await user.type(keyNameInput, 'Updated Primary Key');

      // Mock API key update
      vi.mocked(adminApiService.updateAPIKey).mockResolvedValue({
        data: { success: true }
      });

      await user.click(screen.getByText('Save'));

      await waitFor(() => {
        expect(adminApiService.updateAPIKey).toHaveBeenCalledWith('key-1', {
          name: 'Updated Primary Key'
        });
        expect(screen.getByText('API key updated successfully')).toBeInTheDocument();
      });

      // Manage Feature Flags
      await user.click(screen.getByText('Feature Flags'));

      await waitFor(() => {
        expect(screen.getByText('Dashboard KPIs')).toBeInTheDocument();
      });

      // Enable feature flag for specific users
      const featureFlagToggle = screen.getByRole('switch', { name: /dashboard kpis/i });
      await user.click(featureFlagToggle);

      // Configure target users
      await user.click(screen.getByText('Configure Users'));

      const userSelector = screen.getByRole('combobox', { name: /select users/i });
      await user.click(userSelector);
      await user.click(screen.getByText('John Doe'));
      await user.click(screen.getByText('Jane Smith'));

      // Mock feature flag update
      vi.mocked(adminApiService.updateFeatureFlag).mockResolvedValue({
        data: { success: true }
      });

      await user.click(screen.getByText('Apply'));

      await waitFor(() => {
        expect(adminApiService.updateFeatureFlag).toHaveBeenCalledWith('dashboard_kpis', {
          isEnabled: true,
          scope: 'user',
          targetUsers: ['user-1', 'user-2']
        });
        expect(screen.getByText('Feature flag updated successfully')).toBeInTheDocument();
      });
    });
  });

  describe('Audit Log Investigation Workflow', () => {
    it('should complete audit log investigation workflow', async () => {
      // Mock audit logs data
      vi.mocked(adminApiService.getAuditLogs).mockResolvedValue({
        data: [
          {
            id: 'audit-1',
            adminUserId: 'admin-1',
            adminUserEmail: 'admin@test.com',
            action: 'user_update',
            resourceType: 'user',
            resourceId: 'user-1',
            targetUserId: 'user-1',
            targetUserEmail: 'john@test.com',
            details: {
              field: 'credits',
              oldValue: 1000,
              newValue: 1500,
              reason: 'Promotional credits'
            },
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0...',
            timestamp: new Date('2024-01-15T10:00:00Z'),
            success: true
          }
        ]
      });

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Navigate to Audit Logs
      await user.click(screen.getByText('Admin Panel'));
      await user.click(screen.getByText('Audit Logs'));

      await waitFor(() => {
        expect(screen.getByText('Audit Log Viewer')).toBeInTheDocument();
      });

      // Apply filters
      const adminFilter = screen.getByRole('combobox', { name: /admin user/i });
      await user.click(adminFilter);
      await user.click(screen.getByText('admin@test.com'));

      const actionFilter = screen.getByRole('combobox', { name: /action type/i });
      await user.click(actionFilter);
      await user.click(screen.getByText('User Updates'));

      const dateFromInput = screen.getByLabelText('From Date');
      await user.type(dateFromInput, '2024-01-01');

      const dateToInput = screen.getByLabelText('To Date');
      await user.type(dateToInput, '2024-01-31');

      await user.click(screen.getByText('Apply Filters'));

      await waitFor(() => {
        expect(adminApiService.getAuditLogs).toHaveBeenCalledWith({
          adminUserId: 'admin-1',
          action: 'user_update',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          page: 1,
          limit: 50
        });
      });

      // View audit log details
      await user.click(screen.getByText('View Details'));

      await waitFor(() => {
        expect(screen.getByText('Audit Log Details')).toBeInTheDocument();
        expect(screen.getByText('admin@test.com')).toBeInTheDocument();
        expect(screen.getByText('john@test.com')).toBeInTheDocument();
        expect(screen.getByText('Credits: 1000 → 1500')).toBeInTheDocument();
        expect(screen.getByText('Reason: Promotional credits')).toBeInTheDocument();
      });

      // Export audit logs
      await user.click(screen.getByText('Export Logs'));

      const exportFormatSelector = screen.getByRole('combobox', { name: /export format/i });
      await user.click(exportFormatSelector);
      await user.click(screen.getByText('CSV'));

      // Mock export
      vi.mocked(adminApiService.exportAuditLogs).mockResolvedValue({
        data: {
          downloadUrl: 'https://example.com/audit-logs.csv',
          expiresAt: '2024-01-16T10:00:00Z'
        }
      });

      await user.click(screen.getByText('Export'));

      await waitFor(() => {
        expect(adminApiService.exportAuditLogs).toHaveBeenCalledWith({
          format: 'csv',
          adminUserId: 'admin-1',
          action: 'user_update',
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        });
        expect(screen.getByText('Export ready for download')).toBeInTheDocument();
      });
    });
  });

  describe('Error Recovery Workflows', () => {
    it('should handle and recover from API errors', async () => {
      // Mock API error
      vi.mocked(adminApiService.getSystemStats).mockRejectedValue(
        new Error('Network Error')
      );

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await user.click(screen.getByText('Admin Panel'));

      await waitFor(() => {
        expect(screen.getByText('Failed to load system statistics')).toBeInTheDocument();
      });

      // Retry loading
      await user.click(screen.getByText('Retry'));

      // Mock successful retry
      vi.mocked(adminApiService.getSystemStats).mockResolvedValue({
        data: {
          users: { total: 1000, active: 850 },
          agents: { total: 500, active: 400 },
          calls: { totalThisMonth: 10000, successRate: 0.95 },
          system: { uptime: 99.9, responseTime: 150 }
        }
      });

      await waitFor(() => {
        expect(screen.getByText('1,000 Total Users')).toBeInTheDocument();
      });
    });

    it('should handle permission errors gracefully', async () => {
      // Mock permission error
      vi.mocked(adminApiService.getAdminUsers).mockRejectedValue({
        response: {
          status: 403,
          data: { error: 'Insufficient permissions' }
        }
      });

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await user.click(screen.getByText('Admin Panel'));
      await user.click(screen.getByText('User Management'));

      await waitFor(() => {
        expect(screen.getByText('Access Denied')).toBeInTheDocument();
        expect(screen.getByText('You do not have permission to view this section')).toBeInTheDocument();
      });
    });
  });
});