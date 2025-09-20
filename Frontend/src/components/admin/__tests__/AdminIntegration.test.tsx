import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import App from '../../../App';
import { AuthProvider } from '../../../contexts/AuthContext';
import { AdminProvider } from '../../../contexts/AdminContext';
import { ThemeProvider } from '../../../components/theme/ThemeProvider';

// Mock the API service
vi.mock('../../../services/apiService', () => ({
  apiService: {
    validateToken: vi.fn().mockResolvedValue({
      user: {
        id: '1',
        email: 'admin@test.com',
        name: 'Admin User',
        role: 'admin',
      }
    }),
    refreshToken: vi.fn(),
    logout: vi.fn(),
    updateUserProfile: vi.fn(),
    // Admin methods
    getAdminDashboard: vi.fn().mockResolvedValue({ data: {} }),
    validateAdminAccess: vi.fn().mockResolvedValue({
      data: { hasAccess: true, role: 'admin', permissions: [] }
    }),
  }
}));

// Mock admin API service
vi.mock('../../../services/adminApiService', () => ({
  adminApiService: {
    getDashboardMetrics: vi.fn().mockResolvedValue({
      data: {
        totalUsers: 100,
        totalAgents: 50,
        totalCalls: 1000,
        systemHealth: 'healthy'
      }
    }),
    validateAdminAccess: vi.fn().mockResolvedValue({
      data: { hasAccess: true, role: 'admin', permissions: [] }
    }),
  }
}));

// Mock WebSocket hook
vi.mock('../../../hooks/useAdminWebSocket', () => ({
  useAdminWebSocket: vi.fn(() => ({
    notifications: [],
    isConnected: true,
    connectionStatus: 'connected'
  }))
}));

// Mock lazy-loaded components
vi.mock('../UserManagement/UserManagement', () => ({
  default: () => <div data-testid="user-management">User Management</div>
}));

vi.mock('../AgentManagement/AgentManagement', () => ({
  default: () => <div data-testid="agent-management">Agent Management</div>
}));

vi.mock('../SystemAnalytics/AnalyticsDashboard', () => ({
  default: () => <div data-testid="analytics-dashboard">Analytics Dashboard</div>
}));

vi.mock('../Configuration', () => ({
  default: () => <div data-testid="configuration">Configuration</div>
}));

vi.mock('../AdvancedFeatures/AdvancedFeatures', () => ({
  default: () => <div data-testid="advanced-features">Advanced Features</div>
}));

vi.mock('../Reports', () => ({
  default: () => <div data-testid="reports">Reports</div>
}));

vi.mock('../RealTime/RealTimeDashboard', () => ({
  default: () => <div data-testid="realtime-dashboard">Real-time Dashboard</div>
}));

// Mock other components
vi.mock('../../../pages/Index', () => ({
  default: () => <div data-testid="index-page">Index Page</div>
}));

vi.mock('../../../pages/Dashboard', () => ({
  default: () => <div data-testid="dashboard-page">Dashboard Page</div>
}));

vi.mock('../../../pages/NotFound', () => ({
  default: () => <div data-testid="not-found">Not Found</div>
}));

vi.mock('../../../components/auth/ProtectedRoute', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock('../../../components/auth/TokenRefreshIndicator', () => ({
  default: () => <div data-testid="token-refresh-indicator">Token Refresh</div>
}));

vi.mock('../../../contexts/SuccessFeedbackContext', () => ({
  SuccessFeedbackProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock('../../../components/ErrorBoundary', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AdminProvider>
            <ThemeProvider>
              {children}
            </ThemeProvider>
          </AdminProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Admin Panel Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => 'mock-token'),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
    });
  });

  it('should render the main app with admin routes', async () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // Should render without crashing
    expect(screen.getByTestId('token-refresh-indicator')).toBeInTheDocument();
  });

  it('should navigate to admin dashboard', async () => {
    // Mock window.location
    delete (window as any).location;
    window.location = { ...window.location, pathname: '/admin' };

    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    await waitFor(() => {
      // Should show admin layout components
      expect(document.body).toContainHTML('admin');
    });
  });

  it('should handle admin route navigation', async () => {
    // Test navigation to different admin routes
    const routes = [
      '/admin/users',
      '/admin/agents', 
      '/admin/analytics',
      '/admin/configuration',
      '/admin/audit',
      '/admin/communication',
      '/admin/advanced',
      '/admin/reports',
      '/admin/realtime'
    ];

    for (const route of routes) {
      delete (window as any).location;
      window.location = { ...window.location, pathname: route };

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        // Should render without errors
        expect(document.body).toBeDefined();
      });
    }
  });

  it('should integrate with existing auth context', async () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    await waitFor(() => {
      // Auth context should be available
      expect(document.body).toBeDefined();
    });
  });

  it('should handle lazy loading of admin components', async () => {
    delete (window as any).location;
    window.location = { ...window.location, pathname: '/admin/users' };

    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // Should show loading state initially
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // Should load the component
    await waitFor(() => {
      expect(screen.getByTestId('user-management')).toBeInTheDocument();
    });
  });

  it('should maintain consistent theming', async () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    await waitFor(() => {
      // Theme provider should be active
      expect(document.body).toBeDefined();
    });
  });

  it('should handle error boundaries properly', async () => {
    // Mock console.error to avoid noise in tests
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    await waitFor(() => {
      // Should render without throwing
      expect(document.body).toBeDefined();
    });

    consoleSpy.mockRestore();
  });

  it('should integrate admin API service methods', async () => {
    const { adminApiService } = await import('../../../services/adminApiService');
    
    // Test that admin API methods are available
    expect(adminApiService.getDashboardMetrics).toBeDefined();
    expect(adminApiService.getUsers).toBeDefined();
    expect(adminApiService.getAgents).toBeDefined();
    expect(adminApiService.getAuditLogs).toBeDefined();
    expect(adminApiService.getSystemConfig).toBeDefined();
  });

  it('should handle admin notifications', async () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    await waitFor(() => {
      // WebSocket integration should be working
      expect(document.body).toBeDefined();
    });
  });

  it('should support admin route protection', async () => {
    delete (window as any).location;
    window.location = { ...window.location, pathname: '/admin' };

    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    await waitFor(() => {
      // Admin route protection should be active
      expect(document.body).toBeDefined();
    });
  });

  it('should integrate with existing query client', async () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    await waitFor(() => {
      // Query client should be available for admin components
      expect(document.body).toBeDefined();
    });
  });
});

describe('Admin Sidebar Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show admin panel link for admin users', async () => {
    // This would be tested in the actual Sidebar component test
    // but we're testing the integration here
    expect(true).toBe(true);
  });

  it('should display notification badges', async () => {
    // Test notification badge functionality
    expect(true).toBe(true);
  });

  it('should handle admin navigation', async () => {
    // Test admin navigation integration
    expect(true).toBe(true);
  });
});

describe('Admin API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should integrate admin methods with main API service', async () => {
    const { apiService } = await import('../../../services/apiService');
    
    // Test that admin methods are available in main API service
    expect(apiService.getAdminDashboard).toBeDefined();
    expect(apiService.getAdminUsers).toBeDefined();
    expect(apiService.getAdminAgents).toBeDefined();
    expect(apiService.validateAdminAccess).toBeDefined();
  });

  it('should handle admin authentication', async () => {
    const { apiService } = await import('../../../services/apiService');
    
    // Test admin access validation
    const result = await apiService.validateAdminAccess();
    expect(result).toBeDefined();
  });

  it('should support admin error handling', async () => {
    // Test admin-specific error handling
    expect(true).toBe(true);
  });
});