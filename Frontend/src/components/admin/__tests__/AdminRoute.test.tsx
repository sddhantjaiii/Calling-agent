import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import AdminRoute from '../AdminRoute';
import { useAuth } from '@/contexts/AuthContext';

// Mock the auth context
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock the LoadingSpinner component
vi.mock('@/components/ui/LoadingSpinner', () => ({
  LoadingSpinner: ({ size }: { size?: string }) => (
    <div data-testid="loading-spinner" data-size={size}>Loading...</div>
  ),
}));

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

const TestComponent = () => <div data-testid="admin-content">Admin Content</div>;

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('AdminRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner when authentication is loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: true,
    });

    renderWithRouter(
      <AdminRoute>
        <TestComponent />
      </AdminRoute>
    );

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.getByTestId('loading-spinner')).toHaveAttribute('data-size', 'lg');
  });

  it('redirects to login when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });

    renderWithRouter(
      <AdminRoute>
        <TestComponent />
      </AdminRoute>
    );

    // Should not render the admin content
    expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
  });

  it('redirects to dashboard when user is not admin', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', role: 'user', email: 'user@test.com', name: 'Test User' },
      isAuthenticated: true,
      isLoading: false,
    });

    renderWithRouter(
      <AdminRoute>
        <TestComponent />
      </AdminRoute>
    );

    // Should not render the admin content
    expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
  });

  it('renders admin content when user is admin', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', role: 'admin', email: 'admin@test.com', name: 'Admin User' },
      isAuthenticated: true,
      isLoading: false,
    });

    renderWithRouter(
      <AdminRoute>
        <TestComponent />
      </AdminRoute>
    );

    expect(screen.getByTestId('admin-content')).toBeInTheDocument();
  });

  it('renders admin content when user is super_admin', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', role: 'super_admin', email: 'superadmin@test.com', name: 'Super Admin' },
      isAuthenticated: true,
      isLoading: false,
    });

    renderWithRouter(
      <AdminRoute>
        <TestComponent />
      </AdminRoute>
    );

    expect(screen.getByTestId('admin-content')).toBeInTheDocument();
  });

  it('shows access denied when admin user tries to access super_admin route', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', role: 'admin', email: 'admin@test.com', name: 'Admin User' },
      isAuthenticated: true,
      isLoading: false,
    });

    renderWithRouter(
      <AdminRoute requiredRole="super_admin">
        <TestComponent />
      </AdminRoute>
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.getByText('Super admin privileges are required to access this resource.')).toBeInTheDocument();
    expect(screen.getByText('Go Back')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
  });

  it('renders content when super_admin user accesses super_admin route', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', role: 'super_admin', email: 'superadmin@test.com', name: 'Super Admin' },
      isAuthenticated: true,
      isLoading: false,
    });

    renderWithRouter(
      <AdminRoute requiredRole="super_admin">
        <TestComponent />
      </AdminRoute>
    );

    expect(screen.getByTestId('admin-content')).toBeInTheDocument();
  });

  it('defaults to admin role requirement when no role specified', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', role: 'admin', email: 'admin@test.com', name: 'Admin User' },
      isAuthenticated: true,
      isLoading: false,
    });

    renderWithRouter(
      <AdminRoute>
        <TestComponent />
      </AdminRoute>
    );

    expect(screen.getByTestId('admin-content')).toBeInTheDocument();
  });
});