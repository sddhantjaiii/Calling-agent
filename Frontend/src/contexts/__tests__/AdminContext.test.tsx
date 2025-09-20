import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AdminProvider, useAdmin } from '../AdminContext';
import { useAuth } from '../AuthContext';
import { adminApiService } from '@/services/adminApiService';

// Mock dependencies
vi.mock('../AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/services/adminApiService', () => ({
  adminApiService: {
    validateAdminAccess: vi.fn(),
    getAdminProfile: vi.fn(),
  },
}));

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockAdminApiService = adminApiService as any;

// Test component to access admin context
const TestComponent = () => {
  const { user, permissions, isLoading, error, hasPermission, hasRole } = useAdmin();
  
  return (
    <div>
      <div data-testid="loading">{isLoading.toString()}</div>
      <div data-testid="error">{error || 'no-error'}</div>
      <div data-testid="user">{user ? user.email : 'no-user'}</div>
      <div data-testid="can-view-users">{hasPermission('canViewUsers').toString()}</div>
      <div data-testid="can-manage-system">{hasPermission('canManageSystem').toString()}</div>
      <div data-testid="has-admin-role">{hasRole('admin').toString()}</div>
      <div data-testid="has-super-admin-role">{hasRole('super_admin').toString()}</div>
    </div>
  );
};

describe('AdminContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides default values when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
    });

    render(
      <AdminProvider>
        <TestComponent />
      </AdminProvider>
    );

    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(screen.getByTestId('error')).toHaveTextContent('no-error');
    expect(screen.getByTestId('user')).toHaveTextContent('no-user');
    expect(screen.getByTestId('can-view-users')).toHaveTextContent('false');
    expect(screen.getByTestId('can-manage-system')).toHaveTextContent('false');
    expect(screen.getByTestId('has-admin-role')).toHaveTextContent('false');
    expect(screen.getByTestId('has-super-admin-role')).toHaveTextContent('false');
  });

  it('provides default values when user is not admin', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', role: 'user', email: 'user@test.com', name: 'Test User' },
      isAuthenticated: true,
    });

    render(
      <AdminProvider>
        <TestComponent />
      </AdminProvider>
    );

    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(screen.getByTestId('user')).toHaveTextContent('no-user');
    expect(screen.getByTestId('can-view-users')).toHaveTextContent('false');
    expect(screen.getByTestId('has-admin-role')).toHaveTextContent('false');
  });

  it('loads admin data when user is admin', async () => {
    const mockUser = { 
      id: '1', 
      role: 'admin', 
      email: 'admin@test.com', 
      name: 'Admin User' 
    };
    
    const mockAdminUser = {
      ...mockUser,
      adminRole: 'admin',
      permissions: [],
      adminActionCount: 5,
    };

    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
    });

    mockAdminApiService.validateAdminAccess.mockResolvedValue({
      data: { hasAccess: true, role: 'admin', permissions: [] }
    });

    mockAdminApiService.getAdminProfile.mockResolvedValue({
      data: mockAdminUser
    });

    render(
      <AdminProvider>
        <TestComponent />
      </AdminProvider>
    );

    // Initially loading
    expect(screen.getByTestId('loading')).toHaveTextContent('true');

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('user')).toHaveTextContent('admin@test.com');
    expect(screen.getByTestId('can-view-users')).toHaveTextContent('true');
    expect(screen.getByTestId('can-manage-system')).toHaveTextContent('false'); // admin can't manage system
    expect(screen.getByTestId('has-admin-role')).toHaveTextContent('true');
    expect(screen.getByTestId('has-super-admin-role')).toHaveTextContent('false');
  });

  it('loads admin data when user is super_admin', async () => {
    const mockUser = { 
      id: '1', 
      role: 'super_admin', 
      email: 'superadmin@test.com', 
      name: 'Super Admin User' 
    };
    
    const mockAdminUser = {
      ...mockUser,
      adminRole: 'super_admin',
      permissions: [],
      adminActionCount: 10,
    };

    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
    });

    mockAdminApiService.validateAdminAccess.mockResolvedValue({
      data: { hasAccess: true, role: 'super_admin', permissions: [] }
    });

    mockAdminApiService.getAdminProfile.mockResolvedValue({
      data: mockAdminUser
    });

    render(
      <AdminProvider>
        <TestComponent />
      </AdminProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('user')).toHaveTextContent('superadmin@test.com');
    expect(screen.getByTestId('can-view-users')).toHaveTextContent('true');
    expect(screen.getByTestId('can-manage-system')).toHaveTextContent('true'); // super_admin can manage system
    expect(screen.getByTestId('has-admin-role')).toHaveTextContent('true');
    expect(screen.getByTestId('has-super-admin-role')).toHaveTextContent('true');
  });

  it('handles API errors gracefully', async () => {
    const mockUser = { 
      id: '1', 
      role: 'admin', 
      email: 'admin@test.com', 
      name: 'Admin User' 
    };

    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
    });

    mockAdminApiService.validateAdminAccess.mockRejectedValue(
      new Error('API Error')
    );

    mockAdminApiService.getAdminProfile.mockRejectedValue(
      new Error('API Error')
    );

    render(
      <AdminProvider>
        <TestComponent />
      </AdminProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('error')).toHaveTextContent('API Error');
    expect(screen.getByTestId('user')).toHaveTextContent('no-user');
    expect(screen.getByTestId('can-view-users')).toHaveTextContent('false');
  });

  it('handles access denied from API', async () => {
    const mockUser = { 
      id: '1', 
      role: 'admin', 
      email: 'admin@test.com', 
      name: 'Admin User' 
    };

    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
    });

    mockAdminApiService.validateAdminAccess.mockResolvedValue({
      data: { hasAccess: false, role: 'admin', permissions: [] }
    });

    mockAdminApiService.getAdminProfile.mockResolvedValue({
      data: null
    });

    render(
      <AdminProvider>
        <TestComponent />
      </AdminProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('error')).toHaveTextContent('Admin access denied');
    expect(screen.getByTestId('user')).toHaveTextContent('no-user');
  });

  it('throws error when useAdmin is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAdmin must be used within an AdminProvider');
    
    consoleSpy.mockRestore();
  });
});