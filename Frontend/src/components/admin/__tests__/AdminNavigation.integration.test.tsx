import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Sidebar from '../../dashboard/Sidebar';
import { AuthProvider } from '../../../contexts/AuthContext';
import { ThemeProvider } from '../../../components/theme/ThemeProvider';

// Mock the auth context with admin user
vi.mock('../../../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth: () => ({
    user: {
      id: '1',
      email: 'admin@test.com',
      name: 'Admin User',
      role: 'admin',
    },
    isAuthenticated: true,
    isLoading: false,
  })
}));

// Mock the admin WebSocket hook
vi.mock('../../../hooks/useAdminWebSocket', () => ({
  useAdminWebSocket: vi.fn(() => ({
    notifications: [
      { id: '1', message: 'Test notification', read: false, type: 'info' },
      { id: '2', message: 'Another notification', read: true, type: 'warning' },
    ],
    isConnected: true,
    connectionStatus: 'connected'
  }))
}));

// Mock theme provider
vi.mock('../../../components/theme/ThemeProvider', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useTheme: () => ({ theme: 'light' })
}));

// Mock sidebar panel
vi.mock('../../dashboard/SidebarPanel', () => ({
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => 
    isOpen ? <div data-testid="sidebar-panel" onClick={onClose}>Sidebar Panel</div> : null
}));

const TestWrapper = ({ children, initialRoute = '/' }: { children: React.ReactNode; initialRoute?: string }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <AuthProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Admin Navigation Integration', () => {
  const mockProps = {
    agents: [
      { id: '1', name: 'Test Chat Agent', type: 'ChatAgent' },
      { id: '2', name: 'Test Call Agent', type: 'CallAgent' },
    ],
    activeTab: 'overview',
    setActiveTab: vi.fn(),
    activeSubTab: '',
    setActiveSubTab: vi.fn(),
    onInviteTeam: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display admin panel link for admin users', async () => {
    render(
      <TestWrapper>
        <Sidebar {...mockProps} />
      </TestWrapper>
    );

    // Should show admin panel link
    const adminLink = screen.getByText('Admin Panel');
    expect(adminLink).toBeInTheDocument();
    
    // Should have proper styling
    const adminLinkContainer = adminLink.closest('a');
    expect(adminLinkContainer).toHaveAttribute('href', '/admin');
    expect(adminLinkContainer).toHaveClass('border-2', 'border-teal-200', 'bg-teal-50');
  });

  it('should display notification badge with correct count', async () => {
    render(
      <TestWrapper>
        <Sidebar {...mockProps} />
      </TestWrapper>
    );

    // Should show notification badge with count of unread notifications
    const badge = screen.getByText('1'); // 1 unread notification
    expect(badge).toBeInTheDocument();
    
    // Should show bell icon
    const bellIcon = screen.getByTestId('admin-notifications-bell') || 
                    document.querySelector('[data-lucide="bell"]');
    expect(bellIcon || screen.getByText('Admin Panel').parentElement?.querySelector('svg')).toBeInTheDocument();
  });

  it('should handle notification badge overflow (99+)', async () => {
    // Mock many notifications
    const { useAdminWebSocket } = await import('../../../hooks/useAdminWebSocket');
    vi.mocked(useAdminWebSocket).mockReturnValue({
      notifications: Array.from({ length: 150 }, (_, i) => ({
        id: i.toString(),
        message: `Notification ${i}`,
        read: false,
        type: 'info'
      })),
      isConnected: true,
      connectionStatus: 'connected'
    });

    render(
      <TestWrapper>
        <Sidebar {...mockProps} />
      </TestWrapper>
    );

    // Should show 99+ for overflow
    const badge = screen.getByText('99+');
    expect(badge).toBeInTheDocument();
  });

  it('should not show notification badge when no unread notifications', async () => {
    // Mock all notifications as read
    const { useAdminWebSocket } = await import('../../../hooks/useAdminWebSocket');
    vi.mocked(useAdminWebSocket).mockReturnValue({
      notifications: [
        { id: '1', message: 'Read notification', read: true, type: 'info' },
        { id: '2', message: 'Another read notification', read: true, type: 'warning' },
      ],
      isConnected: true,
      connectionStatus: 'connected'
    });

    render(
      <TestWrapper>
        <Sidebar {...mockProps} />
      </TestWrapper>
    );

    // Should not show badge when no unread notifications
    expect(screen.queryByText('2')).not.toBeInTheDocument();
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });

  it('should not show admin panel for non-admin users', async () => {
    // Mock non-admin user
    const { useAuth } = await import('../../../contexts/AuthContext');
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: '1',
        email: 'user@test.com',
        name: 'Regular User',
        role: 'user',
      },
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      updateUserProfile: vi.fn(),
      clearError: vi.fn(),
      isTokenExpiring: false,
      sessionValidated: true,
      isAdminUser: () => false,
      isSuperAdminUser: () => false,
    });

    render(
      <TestWrapper>
        <Sidebar {...mockProps} />
      </TestWrapper>
    );

    // Should not show admin panel link
    expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
  });

  it('should handle admin panel navigation click', async () => {
    render(
      <TestWrapper>
        <Sidebar {...mockProps} />
      </TestWrapper>
    );

    const adminLink = screen.getByText('Admin Panel').closest('a');
    expect(adminLink).toHaveAttribute('href', '/admin');
    
    // Click should navigate (tested by router)
    fireEvent.click(adminLink!);
    
    // Navigation is handled by React Router, so we just verify the link exists
    expect(adminLink).toBeInTheDocument();
  });

  it('should maintain existing sidebar functionality with admin integration', async () => {
    render(
      <TestWrapper>
        <Sidebar {...mockProps} />
      </TestWrapper>
    );

    // Should still show regular menu items
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Agents')).toBeInTheDocument();
    expect(screen.getByText('Imported Data')).toBeInTheDocument();
    expect(screen.getByText('Lead Intelligence')).toBeInTheDocument();
    expect(screen.getByText('Integrations')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    
    // Should show admin panel in addition to regular items
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
  });

  it('should handle tab switching with admin panel present', async () => {
    const setActiveTab = vi.fn();
    
    render(
      <TestWrapper>
        <Sidebar {...mockProps} setActiveTab={setActiveTab} />
      </TestWrapper>
    );

    // Click on a regular tab
    fireEvent.click(screen.getByText('Overview'));
    expect(setActiveTab).toHaveBeenCalledWith('overview');
    
    // Admin panel should not interfere with regular navigation
    fireEvent.click(screen.getByText('Agents'));
    expect(setActiveTab).toHaveBeenCalledWith('agents');
  });

  it('should show proper styling for admin panel link', async () => {
    render(
      <TestWrapper>
        <Sidebar {...mockProps} />
      </TestWrapper>
    );

    const adminLinkContainer = screen.getByText('Admin Panel').closest('a');
    
    // Should have distinctive admin styling
    expect(adminLinkContainer).toHaveClass(
      'border-2',
      'border-teal-200', 
      'bg-teal-50',
      'hover:bg-teal-100'
    );
    
    // Should have shield icon
    const shieldIcon = adminLinkContainer?.querySelector('svg');
    expect(shieldIcon).toBeInTheDocument();
  });

  it('should handle WebSocket connection status', async () => {
    // Mock disconnected WebSocket
    const { useAdminWebSocket } = await import('../../../hooks/useAdminWebSocket');
    vi.mocked(useAdminWebSocket).mockReturnValue({
      notifications: [],
      isConnected: false,
      connectionStatus: 'disconnected'
    });

    render(
      <TestWrapper>
        <Sidebar {...mockProps} />
      </TestWrapper>
    );

    // Should still show admin panel even when WebSocket is disconnected
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    
    // Should not show notification badge when disconnected
    expect(screen.queryByText(/\d+/)).not.toBeInTheDocument();
  });

  it('should handle super admin users', async () => {
    // Mock super admin user
    const { useAuth } = await import('../../../contexts/AuthContext');
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: '1',
        email: 'superadmin@test.com',
        name: 'Super Admin',
        role: 'super_admin',
      },
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      updateUserProfile: vi.fn(),
      clearError: vi.fn(),
      isTokenExpiring: false,
      sessionValidated: true,
      isAdminUser: () => true,
      isSuperAdminUser: () => true,
    });

    render(
      <TestWrapper>
        <Sidebar {...mockProps} />
      </TestWrapper>
    );

    // Should show admin panel for super admin
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
  });

  it('should integrate with existing theme system', async () => {
    // Mock dark theme
    const { useTheme } = await import('../../../components/theme/ThemeProvider');
    vi.mocked(useTheme).mockReturnValue({ theme: 'dark' });

    render(
      <TestWrapper>
        <Sidebar {...mockProps} />
      </TestWrapper>
    );

    // Should apply dark theme classes to admin panel link
    const adminLinkContainer = screen.getByText('Admin Panel').closest('a');
    expect(adminLinkContainer).toHaveClass('text-slate-300', 'hover:bg-slate-700');
  });
});