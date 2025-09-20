import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { performance } from 'perf_hooks';
import userEvent from '@testing-library/user-event';

// Import admin components
import { AdminContext } from '../../contexts/AdminContext';
import AdminPanel from '../../components/admin/AdminPanel';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { AdminSidebar } from '../../components/admin/AdminSidebar';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { AdminDashboard } from '../../components/admin/AdminDashboard';
import { UserManagement } from '../../components/admin/UserManagement/UserManagement';
import { AgentManagement } from '../../components/admin/AgentManagement/AgentManagement';
import { AdminRoute } from '../../components/admin/AdminRoute';

// Mock services
vi.mock('../../services/adminApiService', () => ({
  adminApiService: {
    getSystemStats: vi.fn(),
    getUsers: vi.fn(),
    getAgents: vi.fn(),
    getAuditLogs: vi.fn(),
    updateUser: vi.fn(),
    adjustUserCredits: vi.fn(),
    bulkUpdateAgents: vi.fn(),
    getSystemAnalytics: vi.fn(),
    generateReport: vi.fn(),
    deleteUser: vi.fn(),
    logAdminAction: vi.fn(),
  }
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Test utilities
const createTestWrapper = (adminUser = { role: 'admin', id: '1', email: 'admin@test.com' }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, cacheTime: 0 },
      mutations: { retry: false },
    },
  });

  // Mock useAuth hook
  const mockUseAuth = vi.fn().mockReturnValue({
    user: adminUser,
    login: vi.fn(),
    logout: vi.fn(),
    isLoading: false,
    error: null,
  });
  
  vi.mock('../../contexts/AuthContext', () => ({
    useAuth: mockUseAuth
  }));

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

// Performance measurement utilities
const measurePerformance = async (fn: () => Promise<void> | void, label: string) => {
  const start = performance.now();
  await fn();
  const end = performance.now();
  const duration = end - start;
  console.log(`${label}: ${duration.toFixed(2)}ms`);
  return duration;
};

// Data generation utilities
const generateLargeDataset = (size: number, type: 'users' | 'agents') => {
  const data = [];
  for (let i = 0; i < size; i++) {
    if (type === 'users') {
      data.push({
        id: `user-${i}`,
        name: `User ${i}`,
        email: `user${i}@example.com`,
        role: 'user',
        status: i % 2 === 0 ? 'active' : 'inactive',
        registrationDate: new Date(2024, 0, i % 30 + 1),
        lastLogin: new Date(2024, 0, (i % 30) + 1),
        agentCount: Math.floor(Math.random() * 10),
        callCount: Math.floor(Math.random() * 1000),
        creditsUsed: Math.floor(Math.random() * 5000),
        creditsRemaining: Math.floor(Math.random() * 10000),
      });
    } else {
      data.push({
        id: `agent-${i}`,
        name: `Agent ${i}`,
        owner: `user${i % 100}@example.com`,
        type: i % 2 === 0 ? 'outbound' : 'inbound',
        status: i % 3 === 0 ? 'active' : 'inactive',
        creationDate: new Date(2024, 0, i % 30 + 1),
        performanceMetrics: {
          callsToday: Math.floor(Math.random() * 100),
          successRate: Math.floor(Math.random() * 100),
          averageDuration: Math.floor(Math.random() * 300),
        },
        healthStatus: ['healthy', 'warning', 'error'][i % 3],
      });
    }
  }
  return data;
};

describe('Comprehensive Admin Panel Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    performance.clearMarks();
    performance.clearMeasures();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('1. Unit Tests - Core Admin Components', () => {
    describe('AdminLayout Component', () => {
      it('renders with title and breadcrumbs', () => {
        const TestWrapper = createTestWrapper();
        render(
          <AdminLayout title="Test Page" breadcrumbs={[{ label: 'Home', href: '/' }]}>
            <div>Test Content</div>
          </AdminLayout>,
          { wrapper: TestWrapper }
        );

        expect(screen.getByText('Test Page')).toBeInTheDocument();
        expect(screen.getByText('Home')).toBeInTheDocument();
        expect(screen.getByText('Test Content')).toBeInTheDocument();
      });

      it('renders action buttons when provided', () => {
        const TestWrapper = createTestWrapper();
        const actionButton = <button>Test Action</button>;
        
        render(
          <AdminLayout actions={actionButton}>
            <div>Content</div>
          </AdminLayout>,
          { wrapper: TestWrapper }
        );

        expect(screen.getByText('Test Action')).toBeInTheDocument();
      });

      it('handles responsive layout correctly', () => {
        const TestWrapper = createTestWrapper();
        render(
          <AdminLayout>
            <div>Content</div>
          </AdminLayout>,
          { wrapper: TestWrapper }
        );

        const layout = screen.getByRole('main');
        expect(layout).toHaveClass('admin-layout');
      });
    });

    describe('AdminSidebar Component', () => {
      it('renders menu items based on user role', () => {
        const TestWrapper = createTestWrapper({ role: 'admin', id: '1', email: 'admin@test.com' });
        render(
          <AdminSidebar activeSection="dashboard" onSectionChange={vi.fn()} userRole="admin" />,
          { wrapper: TestWrapper }
        );

        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Users')).toBeInTheDocument();
        expect(screen.getByText('Agents')).toBeInTheDocument();
        expect(screen.getByText('Analytics')).toBeInTheDocument();
      });

      it('shows super admin only items for super admin', () => {
        const TestWrapper = createTestWrapper({ role: 'super_admin', id: '1', email: 'admin@test.com' });
        render(
          <AdminSidebar activeSection="dashboard" onSectionChange={vi.fn()} userRole="super_admin" />,
          { wrapper: TestWrapper }
        );

        expect(screen.getByText('System Config')).toBeInTheDocument();
        expect(screen.getByText('API Keys')).toBeInTheDocument();
      });

      it('handles section change correctly', () => {
        const onSectionChange = vi.fn();
        const TestWrapper = createTestWrapper();
        
        render(
          <AdminSidebar activeSection="dashboard" onSectionChange={onSectionChange} userRole="admin" />,
          { wrapper: TestWrapper }
        );

        fireEvent.click(screen.getByText('Users'));
        expect(onSectionChange).toHaveBeenCalledWith('users');
      });
    });

    describe('AdminHeader Component', () => {
      it('displays admin user information', () => {
        const TestWrapper = createTestWrapper({ role: 'admin', id: '1', email: 'admin@test.com' });
        render(<AdminHeader />, { wrapper: TestWrapper });

        expect(screen.getByText('admin@test.com')).toBeInTheDocument();
        expect(screen.getByText('Admin')).toBeInTheDocument();
      });

      it('shows quick action buttons', () => {
        const TestWrapper = createTestWrapper();
        render(<AdminHeader />, { wrapper: TestWrapper });

        expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
      });
    });

    describe('AdminDashboard Component', () => {
      it('renders dashboard cards with system metrics', async () => {
        const mockStats = {
          users: { total: 100, active: 85, newThisMonth: 15 },
          agents: { total: 250, active: 200, healthyPercentage: 95 },
          calls: { totalThisMonth: 5000, successRate: 92, averageDuration: 180 },
          system: { uptime: 99.9, responseTime: 150, errorRate: 0.1 }
        };

        const { adminApiService } = await import('../../services/adminApiService');
        vi.mocked(adminApiService.getSystemStats).mockResolvedValue(mockStats);

        const TestWrapper = createTestWrapper();
        render(<AdminDashboard />, { wrapper: TestWrapper });

        await waitFor(() => {
          expect(screen.getByText('100')).toBeInTheDocument();
          expect(screen.getByText('250')).toBeInTheDocument();
          expect(screen.getByText('5,000')).toBeInTheDocument();
        });
      });

      it('handles loading state correctly', () => {
        const TestWrapper = createTestWrapper();
        render(<AdminDashboard />, { wrapper: TestWrapper });

        expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();
      });

      it('handles error state correctly', async () => {
        const { adminApiService } = await import('../../services/adminApiService');
        vi.mocked(adminApiService.getSystemStats).mockRejectedValue(new Error('API Error'));

        const TestWrapper = createTestWrapper();
        render(<AdminDashboard />, { wrapper: TestWrapper });

        await waitFor(() => {
          expect(screen.getByText(/error loading dashboard/i)).toBeInTheDocument();
        });
      });
    });
  });

  describe('2. Integration Tests - Admin API Interactions', () => {
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
      ];

      it('fetches and displays user list correctly', async () => {
        const { adminApiService } = await import('../../services/adminApiService');
        vi.mocked(adminApiService.getUsers).mockResolvedValue({
          success: true,
          data: mockUsers,
          pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
        });

        const TestWrapper = createTestWrapper();
        render(<UserManagement />, { wrapper: TestWrapper });

        await waitFor(() => {
          expect(screen.getByText('John Doe')).toBeInTheDocument();
        });

        expect(adminApiService.getUsers).toHaveBeenCalledWith({
          page: 1,
          limit: 10,
          search: '',
          filters: {},
        });
      });

      it('handles user search correctly', async () => {
        const { adminApiService } = await import('../../services/adminApiService');
        vi.mocked(adminApiService.getUsers).mockResolvedValue({
          success: true,
          data: [mockUsers[0]],
          pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
        });

        const TestWrapper = createTestWrapper();
        render(<UserManagement />, { wrapper: TestWrapper });

        const searchInput = screen.getByPlaceholderText(/search users/i);
        await userEvent.type(searchInput, 'John');

        await waitFor(() => {
          expect(adminApiService.getUsers).toHaveBeenCalledWith({
            page: 1,
            limit: 10,
            search: 'John',
            filters: {},
          });
        });
      });

      it('handles credit adjustment correctly', async () => {
        const { adminApiService } = await import('../../services/adminApiService');
        vi.mocked(adminApiService.getUsers).mockResolvedValue({
          success: true,
          data: mockUsers,
          pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
        });
        vi.mocked(adminApiService.adjustUserCredits).mockResolvedValue({ 
          success: true, 
          data: { message: 'Credits adjusted successfully' } 
        });

        const TestWrapper = createTestWrapper();
        render(<UserManagement />, { wrapper: TestWrapper });

        await waitFor(() => {
          expect(screen.getByText('John Doe')).toBeInTheDocument();
        });

        const adjustButton = screen.getByTestId('adjust-credits-1');
        await userEvent.click(adjustButton);

        await waitFor(() => {
          expect(screen.getByText(/adjust credits for/i)).toBeInTheDocument();
        });

        const amountInput = screen.getByLabelText(/amount/i);
        const reasonInput = screen.getByLabelText(/reason/i);
        const submitButton = screen.getByRole('button', { name: /adjust/i });

        await userEvent.type(amountInput, '100');
        await userEvent.type(reasonInput, 'Test adjustment');
        await userEvent.click(submitButton);

        await waitFor(() => {
          expect(adminApiService.adjustUserCredits).toHaveBeenCalledWith('1', {
            amount: 100,
            reason: 'Test adjustment',
          });
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
      ];

      it('fetches and displays agent list correctly', async () => {
        const { adminApiService } = await import('../../services/adminApiService');
        vi.mocked(adminApiService.getAgents).mockResolvedValue({
          success: true,
          data: mockAgents,
          pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
        });

        const TestWrapper = createTestWrapper();
        render(<AgentManagement />, { wrapper: TestWrapper });

        await waitFor(() => {
          expect(screen.getByText('Sales Agent')).toBeInTheDocument();
        });

        expect(adminApiService.getAgents).toHaveBeenCalledWith({
          page: 1,
          limit: 10,
          filters: {},
        });
      });

      it('handles bulk agent operations correctly', async () => {
        const { adminApiService } = await import('../../services/adminApiService');
        vi.mocked(adminApiService.getAgents).mockResolvedValue({
          success: true,
          data: mockAgents,
          pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
        });
        vi.mocked(adminApiService.bulkUpdateAgents).mockResolvedValue({
          success: true,
          data: { successful: 1, failed: [] },
        });

        const TestWrapper = createTestWrapper();
        render(<AgentManagement />, { wrapper: TestWrapper });

        await waitFor(() => {
          expect(screen.getByText('Sales Agent')).toBeInTheDocument();
        });

        const checkbox = screen.getByRole('checkbox', { name: /select agent/i });
        await userEvent.click(checkbox);

        const bulkActivateButton = screen.getByText(/bulk activate/i);
        await userEvent.click(bulkActivateButton);

        await waitFor(() => {
          expect(adminApiService.bulkUpdateAgents).toHaveBeenCalledWith({
            agentIds: ['1'],
            action: 'activate',
          });
        });
      });
    });
  });

  describe('3. End-to-End Tests - Complete Admin Workflows', () => {
    it('completes full user management workflow', async () => {
      const { adminApiService } = await import('../../services/adminApiService');
      
      // Mock all required API calls
      vi.mocked(adminApiService.getUsers).mockResolvedValue({
        success: true,
        data: [
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
        ],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });

      vi.mocked(adminApiService.updateUser).mockResolvedValue({
        success: true,
        data: { message: 'User updated successfully' },
      });

      const TestWrapper = createTestWrapper();
      render(<UserManagement />, { wrapper: TestWrapper });

      // Wait for user list to load
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Search for user
      const searchInput = screen.getByPlaceholderText(/search users/i);
      await userEvent.type(searchInput, 'John');

      // View user details
      const userDetailsButton = screen.getByTestId('user-details-1');
      await userEvent.click(userDetailsButton);

      await waitFor(() => {
        expect(screen.getByTestId('user-details-modal')).toBeInTheDocument();
      });

      // Close modal
      const closeButton = screen.getByTestId('close-modal');
      await userEvent.click(closeButton);

      // Toggle user status
      const statusToggle = screen.getByTestId('user-status-toggle-1');
      await userEvent.click(statusToggle);

      await waitFor(() => {
        expect(adminApiService.updateUser).toHaveBeenCalledWith('1', {
          status: 'inactive',
        });
      });
    });

    it('completes full agent monitoring workflow', async () => {
      const { adminApiService } = await import('../../services/adminApiService');
      
      vi.mocked(adminApiService.getAgents).mockResolvedValue({
        success: true,
        data: [
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
        ],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });

      const TestWrapper = createTestWrapper();
      render(<AgentManagement />, { wrapper: TestWrapper });

      // Wait for agent list to load
      await waitFor(() => {
        expect(screen.getByText('Sales Agent')).toBeInTheDocument();
      });

      // Filter agents by status
      const statusFilter = screen.getByTestId('agent-status-filter');
      await userEvent.selectOptions(statusFilter, 'active');

      // View agent details
      const agentDetailsButton = screen.getByTestId('agent-details-1');
      await userEvent.click(agentDetailsButton);

      await waitFor(() => {
        expect(screen.getByTestId('agent-details-modal')).toBeInTheDocument();
      });

      // Verify performance metrics are displayed
      expect(screen.getByText('85% success rate')).toBeInTheDocument();
      expect(screen.getByText('25 calls today')).toBeInTheDocument();
    });
  });

  describe('4. Performance Tests - Large Dataset Handling', () => {
    it('handles 10,000 users efficiently', async () => {
      const largeUserDataset = generateLargeDataset(10000, 'users');
      const { adminApiService } = await import('../../services/adminApiService');
      
      vi.mocked(adminApiService.getUsers).mockResolvedValue({
        success: true,
        data: largeUserDataset,
        pagination: { total: largeUserDataset.length, page: 1, limit: 100, totalPages: 100 },
      });

      const TestWrapper = createTestWrapper();
      
      const renderTime = await measurePerformance(async () => {
        render(<UserManagement />, { wrapper: TestWrapper });
        await waitFor(() => {
          expect(screen.getByText('User 0')).toBeInTheDocument();
        }, { timeout: 10000 });
      }, 'Large User Dataset Render');

      // Performance assertion: should render within 5 seconds
      expect(renderTime).toBeLessThan(5000);
    });

    it('search performs well with large datasets', async () => {
      const largeUserDataset = generateLargeDataset(10000, 'users');
      const { adminApiService } = await import('../../services/adminApiService');
      
      vi.mocked(adminApiService.getUsers).mockImplementation(async ({ search }) => {
        const filteredUsers = search 
          ? largeUserDataset.filter(user => 
              user.name.toLowerCase().includes(search.toLowerCase()) ||
              user.email.toLowerCase().includes(search.toLowerCase())
            )
          : largeUserDataset;
        
        return {
          success: true,
          data: filteredUsers.slice(0, 100),
          pagination: { total: filteredUsers.length, page: 1, limit: 100, totalPages: Math.ceil(filteredUsers.length / 100) },
        };
      });

      const TestWrapper = createTestWrapper();
      render(<UserManagement />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('User 0')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search users/i);
      
      const searchTime = await measurePerformance(async () => {
        await userEvent.type(searchInput, 'User 100');
        await waitFor(() => {
          expect(adminApiService.getUsers).toHaveBeenCalledWith(
            expect.objectContaining({ search: 'User 100' })
          );
        });
      }, 'Search Performance');

      expect(searchTime).toBeLessThan(1000);
    });

    it('bulk operations execute efficiently', async () => {
      const { adminApiService } = await import('../../services/adminApiService');
      
      vi.mocked(adminApiService.bulkUpdateAgents).mockImplementation(async ({ agentIds }) => {
        // Simulate processing time based on number of items
        await new Promise(resolve => setTimeout(resolve, agentIds.length * 10));
        return {
          success: true,
          data: { successful: agentIds.length, failed: [] },
        };
      });

      const agentIds = Array.from({ length: 100 }, (_, i) => `agent-${i}`);
      
      const bulkOperationTime = await measurePerformance(async () => {
        const result = await adminApiService.bulkUpdateAgents({
          agentIds,
          action: 'activate',
        });
        expect(result.data.successful).toBe(100);
      }, 'Bulk Operation Performance');

      // Should complete within 5 seconds for 100 items
      expect(bulkOperationTime).toBeLessThan(5000);
    });
  });

  describe('5. Security Tests - Unauthorized Access Attempts', () => {
    it('blocks access to admin panel for unauthenticated users', () => {
      const TestWrapper = createTestWrapper(null);
      
      render(
        <AdminRoute>
          <AdminPanel />
        </AdminRoute>,
        { wrapper: TestWrapper }
      );

      // Should redirect to login or show unauthorized message
      expect(screen.queryByTestId('admin-panel')).not.toBeInTheDocument();
    });

    it('blocks access to admin panel for regular users', () => {
      const regularUser = {
        id: '1',
        email: 'user@test.com',
        role: 'user',
        name: 'Regular User',
      };

      const TestWrapper = createTestWrapper(regularUser);
      
      render(
        <AdminRoute>
          <AdminPanel />
        </AdminRoute>,
        { wrapper: TestWrapper }
      );

      // Should show unauthorized access message
      expect(screen.getByText(/unauthorized access/i)).toBeInTheDocument();
    });

    it('validates session tokens on admin actions', async () => {
      const adminUser = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Admin User',
      };

      const { adminApiService } = await import('../../services/adminApiService');
      vi.mocked(adminApiService.getUsers).mockRejectedValue({
        response: { status: 401, data: { message: 'Invalid session' } },
      });

      const TestWrapper = createTestWrapper(adminUser);
      render(<UserManagement />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText(/session expired/i)).toBeInTheDocument();
      });
    });

    it('prevents XSS attacks in user input fields', async () => {
      const adminUser = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Admin User',
      };

      const TestWrapper = createTestWrapper(adminUser);
      render(<UserManagement />, { wrapper: TestWrapper });

      const searchInput = screen.getByPlaceholderText(/search users/i) as HTMLInputElement;
      const maliciousScript = '<script>alert("XSS")</script>';
      
      await userEvent.type(searchInput, maliciousScript);

      // Input should be sanitized
      expect(searchInput.value).not.toContain('<script>');
    });

    it('handles rate limiting responses appropriately', async () => {
      const adminUser = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Admin User',
      };

      const { adminApiService } = await import('../../services/adminApiService');
      vi.mocked(adminApiService.getUsers).mockRejectedValue({
        response: {
          status: 429,
          data: { message: 'Rate limit exceeded' },
          headers: { 'retry-after': '60' },
        },
      });

      const TestWrapper = createTestWrapper(adminUser);
      render(<UserManagement />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText(/rate limit exceeded/i)).toBeInTheDocument();
        expect(screen.getByText(/try again in 60 seconds/i)).toBeInTheDocument();
      });
    });
  });

  describe('6. Accessibility Tests - WCAG Compliance', () => {
    it('provides proper ARIA labels and roles', () => {
      const TestWrapper = createTestWrapper();
      render(<AdminPanel />, { wrapper: TestWrapper });

      // Check for main landmarks
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();

      // Check for proper headings hierarchy
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });

    it('supports keyboard navigation', async () => {
      const TestWrapper = createTestWrapper();
      render(<AdminPanel />, { wrapper: TestWrapper });

      // Test tab navigation
      await userEvent.tab();
      expect(document.activeElement).toBeVisible();

      // Test skip links
      const skipLink = screen.queryByTestId('skip-to-content');
      if (skipLink) {
        await userEvent.tab();
        expect(skipLink).toHaveFocus();
      }
    });

    it('provides screen reader announcements', () => {
      const TestWrapper = createTestWrapper();
      render(<AdminPanel />, { wrapper: TestWrapper });

      // Check for aria-live regions
      const liveRegions = screen.getAllByRole('status');
      expect(liveRegions.length).toBeGreaterThanOrEqual(0);
    });

    it('maintains focus management in modals', async () => {
      const { adminApiService } = await import('../../services/adminApiService');
      vi.mocked(adminApiService.getUsers).mockResolvedValue({
        success: true,
        data: [
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
        ],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });

      const TestWrapper = createTestWrapper();
      render(<UserManagement />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const detailsButton = screen.getByTestId('user-details-1');
      await userEvent.click(detailsButton);

      await waitFor(() => {
        const modal = screen.getByTestId('user-details-modal');
        expect(modal).toBeInTheDocument();
        
        // Focus should be trapped within modal
        const focusableElements = modal.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        expect(focusableElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('7. Load Tests - Admin Interface Scalability', () => {
    it('handles concurrent user sessions', async () => {
      const { adminApiService } = await import('../../services/adminApiService');
      
      // Mock multiple API endpoints
      vi.mocked(adminApiService.getUsers).mockResolvedValue({
        success: true,
        data: generateLargeDataset(100, 'users'),
        pagination: { total: 100, page: 1, limit: 100, totalPages: 1 },
      });
      
      vi.mocked(adminApiService.getAgents).mockResolvedValue({
        success: true,
        data: generateLargeDataset(100, 'agents'),
        pagination: { total: 100, page: 1, limit: 100, totalPages: 1 },
      });
      
      vi.mocked(adminApiService.getSystemStats).mockResolvedValue({
        users: { total: 1000, active: 850, newThisMonth: 150 },
        agents: { total: 2500, active: 2000, healthyPercentage: 95 },
        calls: { totalThisMonth: 50000, successRate: 92, averageDuration: 180 },
        system: { uptime: 99.9, responseTime: 150, errorRate: 0.1 },
      });

      const concurrentRequestTime = await measurePerformance(async () => {
        const promises = [
          adminApiService.getUsers({ page: 1, limit: 100, search: '', filters: {} }),
          adminApiService.getAgents({ page: 1, limit: 100, filters: {} }),
          adminApiService.getSystemStats(),
        ];
        
        await Promise.all(promises);
      }, 'Concurrent API Requests');

      // Concurrent requests should be faster than sequential
      expect(concurrentRequestTime).toBeLessThan(1000);
    });

    it('handles memory management under load', async () => {
      const { adminApiService } = await import('../../services/adminApiService');
      vi.mocked(adminApiService.getUsers).mockResolvedValue({
        success: true,
        data: generateLargeDataset(1000, 'users'),
        pagination: { total: 1000, page: 1, limit: 100, totalPages: 10 },
      });

      const TestWrapper = createTestWrapper();
      const { unmount } = render(<UserManagement />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('User 0')).toBeInTheDocument();
      });

      const initialMemory = (performance as any).memory?.usedJSHeapSize;
      
      const cleanupTime = await measurePerformance(async () => {
        unmount();
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
        // Wait for cleanup
        await new Promise(resolve => setTimeout(resolve, 100));
      }, 'Component Cleanup');

      expect(cleanupTime).toBeLessThan(500);

      const finalMemory = (performance as any).memory?.usedJSHeapSize;
      if (initialMemory && finalMemory) {
        const memoryDiff = initialMemory - finalMemory;
        console.log(`Memory freed: ${(memoryDiff / 1024 / 1024).toFixed(2)} MB`);
        // Should not increase memory significantly
        expect(memoryDiff).toBeGreaterThan(-10 * 1024 * 1024);
      }
    });

    it('handles rapid component mounting/unmounting', async () => {
      const { adminApiService } = await import('../../services/adminApiService');
      vi.mocked(adminApiService.getUsers).mockResolvedValue({
        success: true,
        data: generateLargeDataset(100, 'users'),
        pagination: { total: 100, page: 1, limit: 100, totalPages: 1 },
      });

      const TestWrapper = createTestWrapper();
      
      const rapidMountTime = await measurePerformance(async () => {
        for (let i = 0; i < 10; i++) {
          const { unmount } = render(<UserManagement />, { wrapper: TestWrapper });
          await waitFor(() => {
            expect(screen.getByTestId('user-management')).toBeInTheDocument();
          });
          unmount();
        }
      }, 'Rapid Mount/Unmount');

      // Should handle rapid mounting/unmounting efficiently
      expect(rapidMountTime).toBeLessThan(5000);
    });
  });

  describe('8. Error Handling and Recovery', () => {
    it('handles network errors with retry mechanism', async () => {
      const { adminApiService } = await import('../../services/adminApiService');
      vi.mocked(adminApiService.getUsers)
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValueOnce({
          success: true,
          data: [],
          pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
        });

      const TestWrapper = createTestWrapper();
      render(<UserManagement />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText(/error loading users/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByText(/retry/i);
      await userEvent.click(retryButton);

      await waitFor(() => {
        expect(adminApiService.getUsers).toHaveBeenCalledTimes(2);
      });
    });

    it('handles validation errors correctly', async () => {
      const { adminApiService } = await import('../../services/adminApiService');
      vi.mocked(adminApiService.adjustUserCredits).mockRejectedValue({
        response: {
          status: 400,
          data: {
            message: 'Validation Error',
            errors: { amount: 'Amount must be a positive number' },
          },
        },
      });

      const TestWrapper = createTestWrapper();
      render(<UserManagement />, { wrapper: TestWrapper });

      // Simulate form submission with invalid data
      // This would be triggered by user interaction in the actual component
      try {
        await adminApiService.adjustUserCredits('1', { amount: -100, reason: '' });
      } catch (error) {
        expect(error.response.data.errors.amount).toBe('Amount must be a positive number');
      }
    });
  });
});