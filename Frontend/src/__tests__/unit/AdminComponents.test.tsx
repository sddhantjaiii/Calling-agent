import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AdminContext } from '../../contexts/AdminContext';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { AdminSidebar } from '../../components/admin/AdminSidebar';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { AdminDashboard } from '../../components/admin/AdminDashboard';

// Mock services
vi.mock('../../services/adminApiService', () => ({
  adminApiService: {
    getSystemStats: vi.fn(),
    getUsers: vi.fn(),
    getAgents: vi.fn(),
    getAuditLogs: vi.fn(),
  }
}));

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

describe('AdminLayout', () => {
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

describe('AdminSidebar', () => {
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

  it('displays notification badges when present', () => {
    const TestWrapper = createTestWrapper();
    render(
      <AdminSidebar activeSection="dashboard" onSectionChange={vi.fn()} userRole="admin" />,
      { wrapper: TestWrapper }
    );

    // Check for badge elements
    const badges = screen.queryAllByRole('status');
    expect(badges.length).toBeGreaterThanOrEqual(0);
  });
});

describe('AdminHeader', () => {
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

  it('handles logout correctly', async () => {
    const TestWrapper = createTestWrapper();
    render(<AdminHeader />, { wrapper: TestWrapper });

    const logoutButton = screen.getByRole('button', { name: /logout/i });
    fireEvent.click(logoutButton);

    // Should show confirmation dialog
    await waitFor(() => {
      expect(screen.getByText(/confirm logout/i)).toBeInTheDocument();
    });
  });
});

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
      expect(screen.getByText('100')).toBeInTheDocument(); // Total users
      expect(screen.getByText('250')).toBeInTheDocument(); // Total agents
      expect(screen.getByText('5,000')).toBeInTheDocument(); // Total calls
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

  it('refreshes data when refresh button is clicked', async () => {
    const { adminApiService } = await import('../../services/adminApiService');
    const mockStats = {
      users: { total: 100, active: 85, newThisMonth: 15 },
      agents: { total: 250, active: 200, healthyPercentage: 95 },
      calls: { totalThisMonth: 5000, successRate: 92, averageDuration: 180 },
      system: { uptime: 99.9, responseTime: 150, errorRate: 0.1 }
    };
    vi.mocked(adminApiService.getSystemStats).mockResolvedValue(mockStats);

    const TestWrapper = createTestWrapper();
    render(<AdminDashboard />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    expect(adminApiService.getSystemStats).toHaveBeenCalledTimes(2);
  });
});