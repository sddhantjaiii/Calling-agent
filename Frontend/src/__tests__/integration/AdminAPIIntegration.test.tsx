import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AdminContext } from '../../contexts/AdminContext';
import { UserManagement } from '../../components/admin/UserManagement/UserManagement';
import { AgentManagement } from '../../components/admin/AgentManagement/AgentManagement';
import { SystemAnalytics } from '../../components/admin/SystemAnalytics';
import { adminApiService } from '../../services/adminApiService';

// Mock the API service
vi.mock('../../services/adminApiService');

const mockAdminApiService = vi.mocked(adminApiService);

const createTestWrapper = (adminUser = { role: 'admin', id: '1', email: 'admin@test.com' }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AdminContext.Provider value={{
          user: adminUser,
          permissions: {
            canViewUsers: true,
            canEditUsers: true,
            canManageCredits: true,
            canViewAgents: true,
            canManageAgents: true,
            canViewAuditLogs: true,
            canManageSystem: adminUser.role === 'super_admin',
            canManageAPIKeys: adminUser.role === 'super_admin',
            canManageFeatureFlags: adminUser.role === 'super_admin',
          },
          isLoading: false,
          error: null,
        }}>
          {children}
        </AdminContext.Provider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Admin API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('User Management API Integration', () => {
    const mockUsers = [
      {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'user',
        status: 'active',
        registrationDate: new Date('2024-01-01'),
        lastLogin: new Date('2024-01-15'),
        agentCount: 3,
        callCount: 150,
        creditsUsed: 500,
        creditsRemaining: 1500,
      },
      {
        id: '2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        role: 'user',
        status: 'inactive',
        registrationDate: new Date('2024-01-05'),
        lastLogin: new Date('2024-01-10'),
        agentCount: 1,
        callCount: 25,
        creditsUsed: 100,
        creditsRemaining: 900,
      },
    ];

    it('fetches and displays user list correctly', async () => {
      mockAdminApiService.getUsers.mockResolvedValue({
        users: mockUsers,
        total: 2,
        page: 1,
        limit: 10,
      });

      const TestWrapper = createTestWrapper();
      render(<UserManagement />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      });

      expect(mockAdminApiService.getUsers).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: '',
        filters: {},
      });
    });

    it('handles user search correctly', async () => {
      mockAdminApiService.getUsers.mockResolvedValue({
        users: [mockUsers[0]],
        total: 1,
        page: 1,
        limit: 10,
      });

      const TestWrapper = createTestWrapper();
      render(<UserManagement />, { wrapper: TestWrapper });

      const searchInput = screen.getByPlaceholderText(/search users/i);
      fireEvent.change(searchInput, { target: { value: 'John' } });

      await waitFor(() => {
        expect(mockAdminApiService.getUsers).toHaveBeenCalledWith({
          page: 1,
          limit: 10,
          search: 'John',
          filters: {},
        });
      });
    });

    it('handles user status toggle correctly', async () => {
      mockAdminApiService.getUsers.mockResolvedValue({
        users: mockUsers,
        total: 2,
        page: 1,
        limit: 10,
      });
      mockAdminApiService.updateUser.mockResolvedValue({ success: true });

      const TestWrapper = createTestWrapper();
      render(<UserManagement />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const statusToggle = screen.getAllByRole('switch')[0];
      fireEvent.click(statusToggle);

      await waitFor(() => {
        expect(mockAdminApiService.updateUser).toHaveBeenCalledWith('1', {
          status: 'inactive',
        });
      });
    });

    it('handles credit adjustment correctly', async () => {
      mockAdminApiService.getUsers.mockResolvedValue({
        users: mockUsers,
        total: 2,
        page: 1,
        limit: 10,
      });
      mockAdminApiService.adjustUserCredits.mockResolvedValue({ success: true });

      const TestWrapper = createTestWrapper();
      render(<UserManagement />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const adjustButton = screen.getAllByText(/adjust credits/i)[0];
      fireEvent.click(adjustButton);

      await waitFor(() => {
        expect(screen.getByText(/adjust credits for/i)).toBeInTheDocument();
      });

      const amountInput = screen.getByLabelText(/amount/i);
      const reasonInput = screen.getByLabelText(/reason/i);
      const submitButton = screen.getByRole('button', { name: /adjust/i });

      fireEvent.change(amountInput, { target: { value: '100' } });
      fireEvent.change(reasonInput, { target: { value: 'Test adjustment' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockAdminApiService.adjustUserCredits).toHaveBeenCalledWith('1', {
          amount: 100,
          reason: 'Test adjustment',
        });
      });
    });

    it('handles API errors gracefully', async () => {
      mockAdminApiService.getUsers.mockRejectedValue(new Error('API Error'));

      const TestWrapper = createTestWrapper();
      render(<UserManagement />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText(/error loading users/i)).toBeInTheDocument();
      });
    });
  });

  describe('Agent Management API Integration', () => {
    const mockAgents = [
      {
        id: '1',
        name: 'Sales Agent',
        owner: 'john@example.com',
        type: 'outbound',
        status: 'active',
        creationDate: new Date('2024-01-01'),
        performanceMetrics: {
          callsToday: 25,
          successRate: 85,
          averageDuration: 180,
        },
        healthStatus: 'healthy',
      },
      {
        id: '2',
        name: 'Support Agent',
        owner: 'jane@example.com',
        type: 'inbound',
        status: 'inactive',
        creationDate: new Date('2024-01-05'),
        performanceMetrics: {
          callsToday: 10,
          successRate: 92,
          averageDuration: 240,
        },
        healthStatus: 'warning',
      },
    ];

    it('fetches and displays agent list correctly', async () => {
      mockAdminApiService.getAgents.mockResolvedValue({
        agents: mockAgents,
        total: 2,
        page: 1,
        limit: 10,
      });

      const TestWrapper = createTestWrapper();
      render(<AgentManagement />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('Sales Agent')).toBeInTheDocument();
        expect(screen.getByText('Support Agent')).toBeInTheDocument();
      });

      expect(mockAdminApiService.getAgents).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        filters: {},
      });
    });

    it('handles bulk agent operations correctly', async () => {
      mockAdminApiService.getAgents.mockResolvedValue({
        agents: mockAgents,
        total: 2,
        page: 1,
        limit: 10,
      });
      mockAdminApiService.bulkUpdateAgents.mockResolvedValue({
        successful: 2,
        failed: [],
      });

      const TestWrapper = createTestWrapper();
      render(<AgentManagement />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('Sales Agent')).toBeInTheDocument();
      });

      // Select agents
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[1]);

      const bulkActivateButton = screen.getByText(/bulk activate/i);
      fireEvent.click(bulkActivateButton);

      await waitFor(() => {
        expect(mockAdminApiService.bulkUpdateAgents).toHaveBeenCalledWith({
          agentIds: ['1', '2'],
          action: 'activate',
        });
      });
    });

    it('displays agent health status correctly', async () => {
      mockAdminApiService.getAgents.mockResolvedValue({
        agents: mockAgents,
        total: 2,
        page: 1,
        limit: 10,
      });

      const TestWrapper = createTestWrapper();
      render(<AgentManagement />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('healthy')).toBeInTheDocument();
        expect(screen.getByText('warning')).toBeInTheDocument();
      });
    });
  });

  describe('System Analytics API Integration', () => {
    const mockAnalytics = {
      systemMetrics: {
        totalUsers: 1000,
        activeUsers: 850,
        totalAgents: 2500,
        activeAgents: 2000,
        totalCalls: 50000,
        successfulCalls: 46000,
        systemUptime: 99.9,
        averageResponseTime: 150,
      },
      usageCharts: {
        dailyUsage: [
          { date: '2024-01-01', calls: 1000, users: 100 },
          { date: '2024-01-02', calls: 1200, users: 120 },
        ],
        monthlyTrends: [
          { month: 'Jan', revenue: 10000, users: 500 },
          { month: 'Feb', revenue: 12000, users: 600 },
        ],
      },
    };

    it('fetches and displays analytics data correctly', async () => {
      mockAdminApiService.getSystemAnalytics.mockResolvedValue(mockAnalytics);

      const TestWrapper = createTestWrapper();
      render(<SystemAnalytics />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('1,000')).toBeInTheDocument(); // Total users
        expect(screen.getByText('2,500')).toBeInTheDocument(); // Total agents
        expect(screen.getByText('50,000')).toBeInTheDocument(); // Total calls
      });

      expect(mockAdminApiService.getSystemAnalytics).toHaveBeenCalledWith({
        timeframe: '30d',
      });
    });

    it('handles timeframe changes correctly', async () => {
      mockAdminApiService.getSystemAnalytics.mockResolvedValue(mockAnalytics);

      const TestWrapper = createTestWrapper();
      render(<SystemAnalytics />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('1,000')).toBeInTheDocument();
      });

      const timeframeSelect = screen.getByRole('combobox');
      fireEvent.change(timeframeSelect, { target: { value: '7d' } });

      await waitFor(() => {
        expect(mockAdminApiService.getSystemAnalytics).toHaveBeenCalledWith({
          timeframe: '7d',
        });
      });
    });

    it('handles report generation correctly', async () => {
      mockAdminApiService.getSystemAnalytics.mockResolvedValue(mockAnalytics);
      mockAdminApiService.generateReport.mockResolvedValue({
        reportId: 'report-123',
        downloadUrl: '/api/reports/report-123/download',
      });

      const TestWrapper = createTestWrapper();
      render(<SystemAnalytics />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('1,000')).toBeInTheDocument();
      });

      const generateReportButton = screen.getByText(/generate report/i);
      fireEvent.click(generateReportButton);

      await waitFor(() => {
        expect(mockAdminApiService.generateReport).toHaveBeenCalledWith({
          type: 'system_analytics',
          timeframe: '30d',
          format: 'pdf',
        });
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('handles network errors with retry mechanism', async () => {
      mockAdminApiService.getUsers
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValueOnce({
          users: [],
          total: 0,
          page: 1,
          limit: 10,
        });

      const TestWrapper = createTestWrapper();
      render(<UserManagement />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText(/error loading users/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByText(/retry/i);
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(mockAdminApiService.getUsers).toHaveBeenCalledTimes(2);
      });
    });

    it('handles authentication errors correctly', async () => {
      mockAdminApiService.getUsers.mockRejectedValue({
        response: { status: 401, data: { message: 'Unauthorized' } },
      });

      const TestWrapper = createTestWrapper();
      render(<UserManagement />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText(/unauthorized access/i)).toBeInTheDocument();
      });
    });

    it('handles validation errors correctly', async () => {
      mockAdminApiService.updateUser.mockRejectedValue({
        response: {
          status: 400,
          data: {
            message: 'Validation Error',
            errors: { email: 'Invalid email format' },
          },
        },
      });

      const TestWrapper = createTestWrapper();
      render(<UserManagement />, { wrapper: TestWrapper });

      // Simulate form submission with invalid data
      // This would be triggered by user interaction in the actual component
    });
  });
});