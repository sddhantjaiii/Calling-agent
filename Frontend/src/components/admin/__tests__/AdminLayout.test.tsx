import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { AdminLayout, type BreadcrumbItem } from '../AdminLayout';
import { AuthContext } from '@/contexts/AuthContext';
import { AdminContext } from '@/contexts/AdminContext';
import type { User } from '@/types/api';
import type { AdminContextType } from '@/types/admin';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';

// Mock the child components
vi.mock('../AdminSidebar', () => ({
  default: function MockAdminSidebar() {
    return <div data-testid="admin-sidebar">Admin Sidebar</div>;
  },
}));

vi.mock('../AdminHeader', () => ({
  default: function MockAdminHeader({ title, breadcrumbs, actions }: any) {
    return (
      <div data-testid="admin-header">
        Admin Header
        {title && <span data-testid="header-title">{title}</span>}
        {breadcrumbs && <span data-testid="header-breadcrumbs">{breadcrumbs.length}</span>}
        {actions && <span data-testid="header-actions">{actions}</span>}
      </div>
    );
  },
}));

const mockUser: User = {
  id: '1',
  email: 'admin@test.com',
  name: 'Admin User',
  role: 'admin',
  credits: 100,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockAuthContext = {
  user: mockUser,
  login: vi.fn(),
  logout: vi.fn(),
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
  hasRole: vi.fn(() => true),
};

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthContext.Provider value={mockAuthContext}>
        <AdminContext.Provider value={mockAdminContext}>
          {component}
        </AdminContext.Provider>
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('AdminLayout', () => {
  it('renders the basic layout structure', () => {
    renderWithProviders(<AdminLayout />);
    
    expect(screen.getByTestId('admin-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('admin-header')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('renders children when provided', () => {
    renderWithProviders(
      <AdminLayout>
        <div data-testid="test-content">Test Content</div>
      </AdminLayout>
    );
    
    expect(screen.getByTestId('test-content')).toBeInTheDocument();
  });

  it('passes title to AdminHeader', () => {
    const title = 'Test Page Title';
    renderWithProviders(<AdminLayout title={title} />);
    
    expect(screen.getByTestId('header-title')).toHaveTextContent(title);
  });

  it('passes breadcrumbs to AdminHeader', () => {
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Home', href: '/admin' },
      { label: 'Users', href: '/admin/users' },
      { label: 'User Details' },
    ];
    
    renderWithProviders(<AdminLayout breadcrumbs={breadcrumbs} />);
    
    expect(screen.getByTestId('header-breadcrumbs')).toHaveTextContent('3');
  });

  it('passes actions to AdminHeader', () => {
    const actions = <button>Test Action</button>;
    renderWithProviders(<AdminLayout actions={actions} />);
    
    expect(screen.getByTestId('header-actions')).toBeInTheDocument();
  });

  it('has proper responsive layout classes', () => {
    const { container } = renderWithProviders(<AdminLayout />);
    
    const layoutContainer = container.firstChild as HTMLElement;
    expect(layoutContainer).toHaveClass('min-h-screen', 'bg-gray-50');
    
    const contentArea = container.querySelector('.lg\\:pl-64');
    expect(contentArea).toBeInTheDocument();
  });

  it('has proper main content container styling', () => {
    renderWithProviders(<AdminLayout />);
    
    const main = screen.getByRole('main');
    expect(main).toHaveClass('py-6');
    
    const contentContainer = main.firstChild as HTMLElement;
    expect(contentContainer).toHaveClass(
      'mx-auto',
      'max-w-7xl',
      'px-4',
      'sm:px-6',
      'lg:px-8'
    );
  });
});