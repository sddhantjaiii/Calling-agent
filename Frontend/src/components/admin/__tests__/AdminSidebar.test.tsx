import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { AdminSidebar } from '../AdminSidebar';
import { AdminContext } from '@/contexts/AdminContext';
import type { User } from '@/types/api';
import type { AdminContextType } from '@/types/admin';

const mockUser: User = {
  id: '1',
  email: 'admin@test.com',
  name: 'Admin User',
  role: 'admin',
  credits: 100,
  createdAt: new Date(),
  updatedAt: new Date(),
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
  permissions: {
    ...mockAdminContext.permissions,
    canManageSystem: true,
    canManageAPIKeys: true,
    canManageFeatureFlags: true,
  },
};

const renderWithProviders = (
  component: React.ReactElement,
  adminContext = mockAdminContext
) => {
  return render(
    <BrowserRouter>
      <AdminContext.Provider value={adminContext}>
        {component}
      </AdminContext.Provider>
    </BrowserRouter>
  );
};

// Mock window.matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('AdminSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the desktop sidebar with admin panel title', () => {
    renderWithProviders(<AdminSidebar />);
    
    expect(screen.getAllByText('Admin Panel')).toHaveLength(2); // Mobile and desktop
    expect(screen.getByText('Admin Mode')).toBeInTheDocument();
    expect(screen.getByText('Elevated privileges')).toBeInTheDocument();
  });

  it('renders basic menu items for regular admin', () => {
    renderWithProviders(<AdminSidebar />);
    
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /user management/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /agent management/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /system analytics/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /audit logs/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /communication/i })).toBeInTheDocument();
  });

  it('hides configuration menu for regular admin', () => {
    renderWithProviders(<AdminSidebar />);
    
    expect(screen.queryByRole('link', { name: /configuration/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /api keys/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /feature flags/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /system settings/i })).not.toBeInTheDocument();
  });

  it('shows configuration menu for super admin', () => {
    renderWithProviders(<AdminSidebar />, mockSuperAdminContext);
    
    expect(screen.getByRole('link', { name: /configuration/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /api keys/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /feature flags/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /system settings/i })).toBeInTheDocument();
  });

  it('has correct href attributes for menu items', () => {
    renderWithProviders(<AdminSidebar />, mockSuperAdminContext);
    
    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('link', { name: /user management/i })).toHaveAttribute('href', '/admin/users');
    expect(screen.getByRole('link', { name: /agent management/i })).toHaveAttribute('href', '/admin/agents');
    expect(screen.getByRole('link', { name: /system analytics/i })).toHaveAttribute('href', '/admin/analytics');
    expect(screen.getByRole('link', { name: /audit logs/i })).toHaveAttribute('href', '/admin/audit');
    expect(screen.getByRole('link', { name: /communication/i })).toHaveAttribute('href', '/admin/communication');
    expect(screen.getByRole('link', { name: /configuration/i })).toHaveAttribute('href', '/admin/config');
    expect(screen.getByRole('link', { name: /api keys/i })).toHaveAttribute('href', '/admin/config/api-keys');
    expect(screen.getByRole('link', { name: /feature flags/i })).toHaveAttribute('href', '/admin/config/feature-flags');
    expect(screen.getByRole('link', { name: /system settings/i })).toHaveAttribute('href', '/admin/config/system');
  });

  it('renders mobile menu button', () => {
    renderWithProviders(<AdminSidebar />);
    
    const mobileMenuButton = screen.getByRole('button');
    expect(mobileMenuButton).toBeInTheDocument();
  });

  it('opens mobile menu when button is clicked', () => {
    renderWithProviders(<AdminSidebar />);
    
    const mobileMenuButton = screen.getByRole('button');
    fireEvent.click(mobileMenuButton);
    
    // Check if mobile menu overlay is visible
    const overlay = document.querySelector('.fixed.inset-0.bg-gray-600');
    expect(overlay).toBeInTheDocument();
  });

  it('closes mobile menu when overlay is clicked', () => {
    renderWithProviders(<AdminSidebar />);
    
    // Open mobile menu
    const mobileMenuButton = screen.getByRole('button');
    fireEvent.click(mobileMenuButton);
    
    // Click overlay to close
    const overlay = document.querySelector('.fixed.inset-0.bg-gray-600');
    fireEvent.click(overlay!);
    
    // Menu should be closed (overlay should not be visible)
    expect(document.querySelector('.fixed.inset-0.bg-gray-600')).not.toBeInTheDocument();
  });

  it('closes mobile menu when close button is clicked', () => {
    renderWithProviders(<AdminSidebar />);
    
    // Open mobile menu
    const mobileMenuButton = screen.getByRole('button');
    fireEvent.click(mobileMenuButton);
    
    // Find and click close button
    const closeButtons = screen.getAllByRole('button');
    const closeButton = closeButtons.find(button => 
      button.querySelector('svg') && button !== mobileMenuButton
    );
    fireEvent.click(closeButton!);
    
    // Menu should be closed
    expect(document.querySelector('.fixed.inset-0.bg-gray-600')).not.toBeInTheDocument();
  });

  it('closes mobile menu when a menu item is clicked', () => {
    renderWithProviders(<AdminSidebar />);
    
    // Open mobile menu
    const mobileMenuButton = screen.getByRole('button');
    fireEvent.click(mobileMenuButton);
    
    // Click a menu item (get all and click the first one)
    const dashboardLinks = screen.getAllByRole('link', { name: /dashboard/i });
    fireEvent.click(dashboardLinks[0]);
    
    // Menu should be closed
    expect(document.querySelector('.fixed.inset-0.bg-gray-600')).not.toBeInTheDocument();
  });

  it('has proper responsive classes', () => {
    const { container } = renderWithProviders(<AdminSidebar />);
    
    // Mobile menu button container
    const mobileContainer = container.querySelector('.lg\\:hidden');
    expect(mobileContainer).toBeInTheDocument();
    
    // Desktop sidebar
    const desktopSidebar = container.querySelector('.hidden.lg\\:flex');
    expect(desktopSidebar).toBeInTheDocument();
  });

  it('renders menu items with proper icons', () => {
    renderWithProviders(<AdminSidebar />, mockSuperAdminContext);
    
    // Check that menu items have icons (SVG elements)
    const menuLinks = screen.getAllByRole('link');
    menuLinks.forEach(link => {
      const icon = link.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  it('applies active state styling correctly', () => {
    // Mock location to simulate being on dashboard page
    delete (window as any).location;
    (window as any).location = { pathname: '/admin' };
    
    renderWithProviders(<AdminSidebar />);
    
    const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
    expect(dashboardLink).toHaveClass('bg-teal-100', 'text-teal-900');
  });

  it('renders child menu items for configuration', () => {
    renderWithProviders(<AdminSidebar />, mockSuperAdminContext);
    
    // Configuration submenu items should be indented
    const apiKeysLink = screen.getByRole('link', { name: /api keys/i });
    expect(apiKeysLink).toHaveClass('pl-11');
    
    const featureFlagsLink = screen.getByRole('link', { name: /feature flags/i });
    expect(featureFlagsLink).toHaveClass('pl-11');
    
    const systemSettingsLink = screen.getByRole('link', { name: /system settings/i });
    expect(systemSettingsLink).toHaveClass('pl-11');
  });
});