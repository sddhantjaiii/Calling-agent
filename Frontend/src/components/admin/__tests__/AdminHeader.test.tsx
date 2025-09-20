import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { AdminHeader } from '../AdminHeader';
import { AuthContext } from '@/contexts/AuthContext';
import { AdminContext } from '@/contexts/AdminContext';
import type { User } from '@/types/api';
import type { AdminContextType } from '@/types/admin';
import type { BreadcrumbItem } from '../AdminLayout';

const mockUser: User = {
  id: '1',
  email: 'admin@test.com',
  name: 'Admin User',
  role: 'admin',
  credits: 100,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockLogout = vi.fn();

const mockAuthContext = {
  user: mockUser,
  login: vi.fn(),
  logout: mockLogout,
  isLoading: false,
  error: null,
};

const mockAdminContext: AdminContextType = {
  user: {
    ...mockUser,
    adminRole: 'admin' as const,
    permissions: [],
    adminActionCount: 0,
  },
  permissions: {
    canViewUsers: true,
    canEditUsers: true,
    canManageCredits: true,
    canViewAgents: true,
    canManageAgents: true,
    canViewAuditLogs: true,
    canManageSystem: false,
    canManageAPIKeys: false,
    canManageFeatureFlags: false,
  },
  isLoading: false,
  error: null,
  refreshAdminData: vi.fn(),
  hasPermission: vi.fn(() => true),
  hasRole: vi.fn((role) => role === 'admin'),
};

const mockSuperAdminContext: AdminContextType = {
  ...mockAdminContext,
  hasRole: vi.fn((role) => role === 'super_admin'),
};

const renderWithProviders = (
  component: React.ReactElement,
  adminContext = mockAdminContext
) => {
  return render(
    <BrowserRouter>
      <AuthContext.Provider value={mockAuthContext}>
        <AdminContext.Provider value={adminContext}>
          {component}
        </AdminContext.Provider>
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('AdminHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the basic header structure', () => {
    renderWithProviders(<AdminHeader />);
    
    expect(screen.getByRole('button', { name: /view notifications/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
    expect(screen.getByText('Admin User')).toBeInTheDocument();
  });

  it('displays back to dashboard link when no title or breadcrumbs', () => {
    renderWithProviders(<AdminHeader />);
    
    const backLink = screen.getByRole('link', { name: /back to dashboard/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute('href', '/dashboard');
  });

  it('displays title when provided', () => {
    const title = 'User Management';
    renderWithProviders(<AdminHeader title={title} />);
    
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(title);
    expect(screen.queryByRole('link', { name: /back to dashboard/i })).not.toBeInTheDocument();
  });

  it('displays breadcrumbs when provided', () => {
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Admin', href: '/admin' },
      { label: 'Users', href: '/admin/users' },
      { label: 'User Details' },
    ];
    
    renderWithProviders(<AdminHeader breadcrumbs={breadcrumbs} />);
    
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('link', { name: 'Users' })).toHaveAttribute('href', '/admin/users');
    expect(screen.getByText('User Details')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /back to dashboard/i })).not.toBeInTheDocument();
  });

  it('displays actions when provided', () => {
    const actions = (
      <button data-testid="custom-action">Custom Action</button>
    );
    
    renderWithProviders(<AdminHeader actions={actions} />);
    
    expect(screen.getByTestId('custom-action')).toBeInTheDocument();
  });

  it('shows admin role for regular admin', () => {
    renderWithProviders(<AdminHeader />);
    
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('shows super admin role for super admin', () => {
    renderWithProviders(<AdminHeader />, mockSuperAdminContext);
    
    expect(screen.getByText('Super Admin')).toBeInTheDocument();
  });

  it('displays user email when name is not available', () => {
    const userWithoutName = { ...mockUser, name: undefined };
    const contextWithoutName = {
      ...mockAuthContext,
      user: userWithoutName,
    };
    
    render(
      <BrowserRouter>
        <AuthContext.Provider value={contextWithoutName}>
          <AdminContext.Provider value={mockAdminContext}>
            <AdminHeader />
          </AdminContext.Provider>
        </AuthContext.Provider>
      </BrowserRouter>
    );
    
    expect(screen.getByText('admin@test.com')).toBeInTheDocument();
  });

  it('calls logout when logout button is clicked', () => {
    renderWithProviders(<AdminHeader />);
    
    const logoutButton = screen.getByRole('button', { name: /logout/i });
    fireEvent.click(logoutButton);
    
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('has proper responsive classes for user info', () => {
    renderWithProviders(<AdminHeader />);
    
    const userInfoContainer = screen.getByText('Admin User').parentElement;
    expect(userInfoContainer).toHaveClass('hidden', 'sm:block');
  });

  it('has proper responsive classes for logout button text', () => {
    renderWithProviders(<AdminHeader />);
    
    const logoutButtonText = screen.getByText('Logout');
    expect(logoutButtonText).toHaveClass('hidden', 'sm:inline');
  });

  it('has proper accessibility attributes', () => {
    renderWithProviders(<AdminHeader />);
    
    const notificationButton = screen.getByRole('button', { name: /view notifications/i });
    expect(notificationButton).toHaveAttribute('aria-label', 'View notifications');
  });

  it('renders breadcrumb navigation with proper structure', () => {
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Home', href: '/admin' },
      { label: 'Settings', href: '/admin/settings' },
      { label: 'API Keys' },
    ];
    
    renderWithProviders(<AdminHeader breadcrumbs={breadcrumbs} />);
    
    const nav = screen.getByRole('navigation', { name: /breadcrumb/i });
    const list = nav.querySelector('ol');
    expect(list).toBeInTheDocument();
    
    const items = list?.querySelectorAll('li');
    expect(items).toHaveLength(3);
  });
});