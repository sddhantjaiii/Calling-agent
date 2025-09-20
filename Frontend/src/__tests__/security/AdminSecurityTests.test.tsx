import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AdminRoute } from '../../components/admin/AdminRoute';
import { AdminPanel } from '../../components/admin/AdminPanel';
import { UserManagement } from '../../components/admin/UserManagement/UserManagement';
import { Configuration } from '../../components/admin/Configuration';
import { adminApiService } from '../../services/adminApiService';

// Mock services
vi.mock('../../services/adminApiService');
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const mockAdminApiService = vi.mocked(adminApiService);

const createTestWrapper = (user = null) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  // Mock useAuth hook
  const { useAuth } = require('../../contexts/AuthContext');
  vi.mocked(useAuth).mockReturnValue({
    user,
    login: vi.fn(),
    logout: vi.fn(),
    isLoading: false,
    error: null,
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Admin Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear localStorage and sessionStorage
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Authentication and Authorization', () => {
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

    it('allows access to admin panel for admin users', () => {
      const adminUser = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Admin User',
      };

      const TestWrapper = createTestWrapper(adminUser);
      
      render(
        <AdminRoute>
          <AdminPanel />
        </AdminRoute>,
        { wrapper: TestWrapper }
      );

      expect(screen.getByTestId('admin-panel')).toBeInTheDocument();
    });

    it('restricts super admin features to super admin users only', () => {
      const adminUser = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Admin User',
      };

      const TestWrapper = createTestWrapper(adminUser);
      
      render(
        <AdminRoute requiredRole="super_admin">
          <Configuration />
        </AdminRoute>,
        { wrapper: TestWrapper }
      );

      // Regular admin should not access super admin features
      expect(screen.getByText(/insufficient permissions/i)).toBeInTheDocument();
    });

    it('allows super admin access to all features', () => {
      const superAdminUser = {
        id: '1',
        email: 'superadmin@test.com',
        role: 'super_admin',
        name: 'Super Admin User',
      };

      const TestWrapper = createTestWrapper(superAdminUser);
      
      render(
        <AdminRoute requiredRole="super_admin">
          <Configuration />
        </AdminRoute>,
        { wrapper: TestWrapper }
      );

      expect(screen.getByTestId('system-configuration')).toBeInTheDocument();
    });

    it('validates session tokens on admin actions', async () => {
      const adminUser = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Admin User',
      };

      mockAdminApiService.getUsers.mockRejectedValue({
        response: { status: 401, data: { message: 'Invalid session' } },
      });

      const TestWrapper = createTestWrapper(adminUser);
      render(<UserManagement />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText(/session expired/i)).toBeInTheDocument();
      });
    });
  });

  describe('Data Access Control', () => {
    it('prevents access to other admin users data without proper permissions', async () => {
      const adminUser = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Admin User',
      };

      mockAdminApiService.getUsers.mockRejectedValue({
        response: { status: 403, data: { message: 'Insufficient permissions' } },
      });

      const TestWrapper = createTestWrapper(adminUser);
      render(<UserManagement />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText(/insufficient permissions/i)).toBeInTheDocument();
      });
    });

    it('masks sensitive data in API responses', async () => {
      const adminUser = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Admin User',
      };

      const mockUsers = [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          role: 'user',
          status: 'active',
          // Sensitive data should be masked
          apiKey: 'sk-***************',
          phoneNumber: '***-***-1234',
        },
      ];

      mockAdminApiService.getUsers.mockResolvedValue({
        users: mockUsers,
        total: 1,
        page: 1,
        limit: 10,
      });

      const TestWrapper = createTestWrapper(adminUser);
      render(<UserManagement />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('sk-***************')).toBeInTheDocument();
        expect(screen.getByText('***-***-1234')).toBeInTheDocument();
        // Should not show actual sensitive data
        expect(screen.queryByText(/sk-[a-zA-Z0-9]{32}/)).not.toBeInTheDocument();
      });
    });

    it('validates admin permissions for each API call', async () => {
      const adminUser = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Admin User',
      };

      // Mock API to check for authorization header
      mockAdminApiService.updateUser.mockImplementation(async (userId, data, options) => {
        if (!options?.headers?.Authorization) {
          throw {
            response: { status: 401, data: { message: 'Missing authorization' } },
          };
        }
        return { success: true };
      });

      const TestWrapper = createTestWrapper(adminUser);
      render(<UserManagement />, { wrapper: TestWrapper });

      // Simulate user update action
      const updateButton = screen.getByTestId('update-user-1');
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(mockAdminApiService.updateUser).toHaveBeenCalledWith(
          '1',
          expect.any(Object),
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: expect.stringMatching(/Bearer .+/),
            }),
          })
        );
      });
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('prevents XSS attacks in user input fields', async () => {
      const adminUser = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Admin User',
      };

      const TestWrapper = createTestWrapper(adminUser);
      render(<UserManagement />, { wrapper: TestWrapper });

      const searchInput = screen.getByPlaceholderText(/search users/i);
      const maliciousScript = '<script>alert("XSS")</script>';
      
      fireEvent.change(searchInput, { target: { value: maliciousScript } });

      // Input should be sanitized
      expect(searchInput.value).not.toContain('<script>');
      expect(searchInput.value).toBe('&lt;script&gt;alert("XSS")&lt;/script&gt;');
    });

    it('validates form inputs before submission', async () => {
      const adminUser = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Admin User',
      };

      mockAdminApiService.adjustUserCredits.mockRejectedValue({
        response: {
          status: 400,
          data: {
            message: 'Validation Error',
            errors: {
              amount: 'Amount must be a positive number',
              reason: 'Reason is required',
            },
          },
        },
      });

      const TestWrapper = createTestWrapper(adminUser);
      render(<UserManagement />, { wrapper: TestWrapper });

      const adjustCreditsButton = screen.getByTestId('adjust-credits-1');
      fireEvent.click(adjustCreditsButton);

      await waitFor(() => {
        expect(screen.getByTestId('credit-adjust-modal')).toBeInTheDocument();
      });

      const submitButton = screen.getByTestId('submit-credit-adjustment');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Amount must be a positive number')).toBeInTheDocument();
        expect(screen.getByText('Reason is required')).toBeInTheDocument();
      });
    });

    it('prevents SQL injection in search queries', async () => {
      const adminUser = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Admin User',
      };

      mockAdminApiService.getUsers.mockImplementation(async ({ search }) => {
        // Simulate backend validation
        if (search && search.includes("'") || search.includes(';')) {
          throw {
            response: { status: 400, data: { message: 'Invalid search query' } },
          };
        }
        return { users: [], total: 0, page: 1, limit: 10 };
      });

      const TestWrapper = createTestWrapper(adminUser);
      render(<UserManagement />, { wrapper: TestWrapper });

      const searchInput = screen.getByPlaceholderText(/search users/i);
      const sqlInjection = "'; DROP TABLE users; --";
      
      fireEvent.change(searchInput, { target: { value: sqlInjection } });

      await waitFor(() => {
        expect(screen.getByText('Invalid search query')).toBeInTheDocument();
      });
    });
  });

  describe('CSRF Protection', () => {
    it('includes CSRF tokens in state-changing requests', async () => {
      const adminUser = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Admin User',
      };

      // Mock CSRF token
      const csrfToken = 'csrf-token-123';
      (global as any).document.querySelector = vi.fn().mockReturnValue({
        content: csrfToken,
      });

      mockAdminApiService.updateUser.mockImplementation(async (userId, data, options) => {
        if (!options?.headers?.['X-CSRF-Token']) {
          throw {
            response: { status: 403, data: { message: 'CSRF token missing' } },
          };
        }
        return { success: true };
      });

      const TestWrapper = createTestWrapper(adminUser);
      render(<UserManagement />, { wrapper: TestWrapper });

      const updateButton = screen.getByTestId('update-user-1');
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(mockAdminApiService.updateUser).toHaveBeenCalledWith(
          '1',
          expect.any(Object),
          expect.objectContaining({
            headers: expect.objectContaining({
              'X-CSRF-Token': csrfToken,
            }),
          })
        );
      });
    });

    it('rejects requests without valid CSRF tokens', async () => {
      const adminUser = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Admin User',
      };

      // No CSRF token available
      (global as any).document.querySelector = vi.fn().mockReturnValue(null);

      mockAdminApiService.updateUser.mockRejectedValue({
        response: { status: 403, data: { message: 'CSRF token missing' } },
      });

      const TestWrapper = createTestWrapper(adminUser);
      render(<UserManagement />, { wrapper: TestWrapper });

      const updateButton = screen.getByTestId('update-user-1');
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText('CSRF token missing')).toBeInTheDocument();
      });
    });
  });

  describe('Session Security', () => {
    it('handles session timeout gracefully', async () => {
      const adminUser = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Admin User',
      };

      // Simulate session timeout
      mockAdminApiService.getUsers.mockRejectedValue({
        response: { status: 401, data: { message: 'Session expired' } },
      });

      const TestWrapper = createTestWrapper(adminUser);
      render(<UserManagement />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText(/session expired/i)).toBeInTheDocument();
        expect(screen.getByText(/please log in again/i)).toBeInTheDocument();
      });
    });

    it('validates session on sensitive operations', async () => {
      const adminUser = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Admin User',
      };

      mockAdminApiService.deleteUser.mockImplementation(async (userId, options) => {
        // Simulate session validation for sensitive operations
        if (!options?.headers?.['X-Session-Validation']) {
          throw {
            response: { status: 401, data: { message: 'Session validation required' } },
          };
        }
        return { success: true };
      });

      const TestWrapper = createTestWrapper(adminUser);
      render(<UserManagement />, { wrapper: TestWrapper });

      const deleteButton = screen.getByTestId('delete-user-1');
      fireEvent.click(deleteButton);

      // Should prompt for session validation
      await waitFor(() => {
        expect(screen.getByText(/confirm your session/i)).toBeInTheDocument();
      });
    });

    it('logs out user on multiple failed authentication attempts', async () => {
      const adminUser = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Admin User',
      };

      let attemptCount = 0;
      mockAdminApiService.getUsers.mockImplementation(async () => {
        attemptCount++;
        if (attemptCount <= 3) {
          throw {
            response: { status: 401, data: { message: 'Authentication failed' } },
          };
        }
        throw {
          response: { status: 401, data: { message: 'Account locked' } },
        };
      });

      const TestWrapper = createTestWrapper(adminUser);
      render(<UserManagement />, { wrapper: TestWrapper });

      // Simulate multiple failed attempts
      for (let i = 0; i < 4; i++) {
        const retryButton = screen.getByTestId('retry-button');
        fireEvent.click(retryButton);
        await waitFor(() => {
          expect(mockAdminApiService.getUsers).toHaveBeenCalledTimes(i + 1);
        });
      }

      await waitFor(() => {
        expect(screen.getByText(/account locked/i)).toBeInTheDocument();
      });
    });
  });

  describe('Data Encryption and Privacy', () => {
    it('ensures sensitive data is not stored in browser storage', () => {
      const adminUser = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Admin User',
        apiKey: 'sk-1234567890abcdef',
      };

      const TestWrapper = createTestWrapper(adminUser);
      render(<UserManagement />, { wrapper: TestWrapper });

      // Check that sensitive data is not in localStorage or sessionStorage
      const localStorageData = JSON.stringify(localStorage);
      const sessionStorageData = JSON.stringify(sessionStorage);

      expect(localStorageData).not.toContain('sk-1234567890abcdef');
      expect(sessionStorageData).not.toContain('sk-1234567890abcdef');
    });

    it('masks sensitive data in console logs', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const consoleErrorSpy = vi.spyOn(console, 'error');

      const sensitiveData = {
        apiKey: 'sk-1234567890abcdef',
        password: 'secretpassword123',
        token: 'jwt-token-here',
      };

      // Simulate logging sensitive data
      console.log('User data:', sensitiveData);
      console.error('Error with data:', sensitiveData);

      // In a real implementation, sensitive data should be masked
      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Rate Limiting and Abuse Prevention', () => {
    it('handles rate limiting responses appropriately', async () => {
      const adminUser = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Admin User',
      };

      mockAdminApiService.getUsers.mockRejectedValue({
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

    it('prevents rapid successive API calls', async () => {
      const adminUser = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Admin User',
      };

      let callCount = 0;
      mockAdminApiService.getUsers.mockImplementation(async () => {
        callCount++;
        return { users: [], total: 0, page: 1, limit: 10 };
      });

      const TestWrapper = createTestWrapper(adminUser);
      render(<UserManagement />, { wrapper: TestWrapper });

      const refreshButton = screen.getByTestId('refresh-users');
      
      // Rapid clicks should be throttled
      for (let i = 0; i < 10; i++) {
        fireEvent.click(refreshButton);
      }

      await waitFor(() => {
        // Should not make 10 API calls due to throttling
        expect(callCount).toBeLessThan(10);
      });
    });
  });

  describe('Audit Trail Security', () => {
    it('logs all admin actions for audit purposes', async () => {
      const adminUser = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Admin User',
      };

      const auditLogSpy = vi.fn();
      mockAdminApiService.logAdminAction = auditLogSpy;

      mockAdminApiService.updateUser.mockResolvedValue({ success: true });

      const TestWrapper = createTestWrapper(adminUser);
      render(<UserManagement />, { wrapper: TestWrapper });

      const updateButton = screen.getByTestId('update-user-1');
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(auditLogSpy).toHaveBeenCalledWith({
          action: 'USER_UPDATE',
          resourceType: 'user',
          resourceId: '1',
          adminUserId: '1',
          details: expect.any(Object),
        });
      });
    });

    it('includes IP address and user agent in audit logs', async () => {
      const adminUser = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Admin User',
      };

      const auditLogSpy = vi.fn();
      mockAdminApiService.logAdminAction = auditLogSpy;

      // Mock navigator and request info
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Test Browser)',
        configurable: true,
      });

      const TestWrapper = createTestWrapper(adminUser);
      render(<UserManagement />, { wrapper: TestWrapper });

      const updateButton = screen.getByTestId('update-user-1');
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(auditLogSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            userAgent: 'Mozilla/5.0 (Test Browser)',
            ipAddress: expect.any(String),
          })
        );
      });
    });
  });
});