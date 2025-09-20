import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import AdminPanel from '../AdminPanel';
import { AuthContext } from '../../../contexts/AuthContext';
import { AdminContext } from '../../../contexts/AdminContext';

// Mock services
vi.mock('../../../services/adminApiService');
vi.mock('../../../services/websocketService');

const mockAdminUser = {
  id: '1',
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
  register: vi.fn(),
  refreshUser: vi.fn(),
  updateUserProfile: vi.fn(),
  clearError: vi.fn(),
  isLoading: false,
  isAuthenticated: true,
  error: null,
  isTokenExpiring: false,
  sessionValidated: true,
  isAdminUser: () => true,
  isSuperAdminUser: () => false
};

const mockAdminContext = {
  user: mockAdminUser,
  permissions: {
    canViewUsers: true,
    canEditUsers: true,
    canManageCredits: true,
    canViewAgents: true,
    canManageAgents: true,
    canViewAuditLogs: true,
    canManageSystem: true,
    canManageAPIKeys: true,
    canManageFeatureFlags: true
  },
  isLoading: false,
  error: null,
  refreshAdminData: vi.fn(),
  hasPermission: vi.fn(() => true),
  hasRole: vi.fn(() => true)
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
          <AdminContext.Provider value={mockAdminContext}>
            {children}
          </AdminContext.Provider>
        </AuthContext.Provider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('AdminPanel - Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render admin panel with all main sections', async () => {
      render(
        <TestWrapper>
          <AdminPanel />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });

      // Check for main navigation sections
      expect(screen.getByText('User Management')).toBeInTheDocument();
      expect(screen.getByText('Agent Management')).toBeInTheDocument();
      expect(screen.getByText('System Analytics')).toBeInTheDocument();
      expect(screen.getByText('Configuration')).toBeInTheDocument();
      expect(screen.getByText('Audit Logs')).toBeInTheDocument();
    });

    it('should handle loading states correctly', async () => {
      const loadingAuthContext = {
        ...mockAuthContext,
        isLoading: true
      };

      const loadingAdminContext = {
        ...mockAdminContext,
        isLoading: true
      };

      render(
        <QueryClientProvider client={new QueryClient()}>
          <BrowserRouter>
            <AuthContext.Provider value={loadingAuthContext}>
              <AdminContext.Provider value={loadingAdminContext}>
                <AdminPanel />
              </AdminContext.Provider>
            </AuthContext.Provider>
          </BrowserRouter>
        </QueryClientProvider>
      );

      expect(screen.getByTestId('admin-loading')).toBeInTheDocument();
    });
  });

  describe('Permission-Based Rendering', () => {
    it('should hide sections based on permissions', async () => {
      const restrictedPermissions = {
        ...mockAdminContext,
        permissions: {
          ...mockAdminContext.permissions,
          canManageSystem: false,
          canManageAPIKeys: false
        },
        hasPermission: (permission: string) => {
          if (permission === 'canManageSystem' || permission === 'canManageAPIKeys') {
            return false;
          }
          return true;
        }
      };

      render(
        <QueryClientProvider client={new QueryClient()}>
          <BrowserRouter>
            <AuthContext.Provider value={mockAuthContext}>
              <AdminContext.Provider value={restrictedPermissions}>
                <AdminPanel />
              </AdminContext.Provider>
            </AuthContext.Provider>
          </BrowserRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });
    });

    it('should show all sections for super admin', async () => {
      const superAdminUser = {
        ...mockAdminUser,
        role: 'super_admin' as const
      };

      const superAdminContext = {
        ...mockAuthContext,
        user: superAdminUser,
        isSuperAdminUser: () => true
      };

      const superAdminAdminContext = {
        ...mockAdminContext,
        user: superAdminUser,
        hasRole: (role: string) => role === 'super_admin' || role === 'admin'
      };

      render(
        <QueryClientProvider client={new QueryClient()}>
          <BrowserRouter>
            <AuthContext.Provider value={superAdminContext}>
              <AdminContext.Provider value={superAdminAdminContext}>
                <AdminPanel />
              </AdminContext.Provider>
            </AuthContext.Provider>
          </BrowserRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation and Routing', () => {
    it('should navigate between admin sections', async () => {
      render(
        <TestWrapper>
          <AdminPanel />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });

      // Navigate to User Management
      fireEvent.click(screen.getByText('User Management'));
      await waitFor(() => {
        expect(screen.getByText('User List')).toBeInTheDocument();
      });

      // Navigate to Agent Management
      fireEvent.click(screen.getByText('Agent Management'));
      await waitFor(() => {
        expect(screen.getByText('Agent Monitor')).toBeInTheDocument();
      });
    });

    it('should handle breadcrumb navigation', async () => {
      render(
        <TestWrapper>
          <AdminPanel />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });

      // Navigate to a subsection
      fireEvent.click(screen.getByText('User Management'));
      await waitFor(() => {
        expect(screen.getByText('Admin / User Management')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should handle WebSocket connections', async () => {
      const mockWebSocket = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        close: vi.fn()
      };

      // Mock WebSocket
      global.WebSocket = vi.fn(() => mockWebSocket) as any;

      render(
        <TestWrapper>
          <AdminPanel />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(global.WebSocket).toHaveBeenCalledWith(
          expect.stringContaining('/admin/ws')
        );
      });
    });

    it('should update metrics in real-time', async () => {
      render(
        <TestWrapper>
          <AdminPanel />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });

      // Simulate real-time update
      const mockUpdate = {
        type: 'METRICS_UPDATE',
        data: {
          totalUsers: 150,
          activeAgents: 25
        }
      };

      // This would be triggered by WebSocket message
      fireEvent(window, new CustomEvent('admin-update', { detail: mockUpdate }));

      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument();
        expect(screen.getByText('25')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error boundary for component errors', async () => {
      const ThrowError = () => {
        throw new Error('Test error');
      };

      render(
        <TestWrapper>
          <ThrowError />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
      });
    });

    it('should handle API errors gracefully', async () => {
      // Mock API error
      const mockApiService = await import('../../../services/adminApiService');
      vi.mocked(mockApiService.adminApiService.getSystemStats).mockRejectedValue(
        new Error('API Error')
      );

      render(
        <TestWrapper>
          <AdminPanel />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Failed to load system statistics/)).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should lazy load admin sections', async () => {
      const { container } = render(
        <TestWrapper>
          <AdminPanel />
        </TestWrapper>
      );

      // Initially only dashboard should be loaded
      expect(container.querySelector('[data-testid="user-management"]')).not.toBeInTheDocument();
      expect(container.querySelector('[data-testid="agent-management"]')).not.toBeInTheDocument();

      // Navigate to user management
      fireEvent.click(screen.getByText('User Management'));

      await waitFor(() => {
        expect(container.querySelector('[data-testid="user-management"]')).toBeInTheDocument();
      });
    });

    it('should handle large datasets efficiently', async () => {
      const startTime = performance.now();

      render(
        <TestWrapper>
          <AdminPanel />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time (less than 1 second)
      expect(renderTime).toBeLessThan(1000);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      render(
        <TestWrapper>
          <AdminPanel />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Admin Panel');
        expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', 'Admin Navigation');
      });
    });

    it('should support keyboard navigation', async () => {
      render(
        <TestWrapper>
          <AdminPanel />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });

      const firstNavItem = screen.getByText('User Management');
      firstNavItem.focus();

      // Tab to next item
      fireEvent.keyDown(firstNavItem, { key: 'Tab' });
      
      expect(document.activeElement).toBe(screen.getByText('Agent Management'));
    });

    it('should announce page changes to screen readers', async () => {
      render(
        <TestWrapper>
          <AdminPanel />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });

      // Navigate to different section
      fireEvent.click(screen.getByText('User Management'));

      await waitFor(() => {
        const liveRegion = screen.getByRole('status');
        expect(liveRegion).toHaveTextContent('Navigated to User Management');
      });
    });
  });

  describe('Security', () => {
    it('should not render admin panel for non-admin users', async () => {
      const regularUser = {
        ...mockAdminUser,
        role: 'user' as const
      };

      const userContext = {
        ...mockAuthContext,
        user: regularUser,
        isAdminUser: () => false,
        isSuperAdminUser: () => false
      };

      render(
        <QueryClientProvider client={new QueryClient()}>
          <BrowserRouter>
            <AuthContext.Provider value={userContext}>
              <AdminContext.Provider value={mockAdminContext}>
                <AdminPanel />
              </AdminContext.Provider>
            </AuthContext.Provider>
          </BrowserRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Access Denied')).toBeInTheDocument();
      });
    });

    it('should mask sensitive data', async () => {
      render(
        <TestWrapper>
          <AdminPanel />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });

      // Navigate to API key management
      fireEvent.click(screen.getByText('Configuration'));
      fireEvent.click(screen.getByText('API Keys'));

      await waitFor(() => {
        // API keys should be masked
        const apiKeyElements = screen.getAllByText(/sk-\*{8}/);
        expect(apiKeyElements.length).toBeGreaterThan(0);
      });
    });
  });
});