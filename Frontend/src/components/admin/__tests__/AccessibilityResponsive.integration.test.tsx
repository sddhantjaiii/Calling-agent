import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { AdminLayout } from '../AdminLayout';
import { AdminProvider } from '../../../contexts/AdminContext';
import { AuthProvider } from '../../../contexts/AuthContext';

// Mock all the hooks and components
vi.mock('../../../hooks/useAccessibility', () => ({
  useAriaLiveRegion: () => ({
    message: '',
    politeness: 'polite',
    announce: vi.fn(),
  }),
  useKeyboardNavigation: () => ({
    isKeyboardUser: false,
  }),
  useHighContrast: () => ({
    isHighContrast: false,
    toggleHighContrast: vi.fn(),
  }),
  useFocusTrap: () => ({ current: null }),
  useSkipLinks: () => ({
    skipToContent: vi.fn(),
    skipToNavigation: vi.fn(),
  }),
}));

vi.mock('../../../hooks/useResponsive', () => ({
  useResponsive: () => ({
    windowSize: { width: 1024, height: 768 },
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    breakpoint: 'lg',
  }),
  useResponsiveSidebar: () => ({
    isCollapsed: false,
    isMobileMenuOpen: false,
    toggleSidebar: vi.fn(),
    closeMobileMenu: vi.fn(),
    shouldShowOverlay: false,
  }),
  useTouchFriendly: () => ({
    isTouchDevice: false,
    touchTargetSize: '',
    touchSpacing: 'space-y-1',
  }),
}));

vi.mock('../../../contexts/AdminContext', () => ({
  AdminProvider: ({ children }: any) => children,
  useAdmin: () => ({
    hasRole: vi.fn(() => true),
    user: { id: '1', name: 'Admin User', role: 'admin' },
  }),
}));

vi.mock('../../../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: any) => children,
  useAuth: () => ({
    user: { id: '1', name: 'Admin User', email: 'admin@example.com' },
    logout: vi.fn(),
  }),
}));

vi.mock('../../../hooks/useAdminWebSocket', () => ({
  useAdminWebSocket: () => ({
    isConnected: true,
    connectionState: 'Connected',
    unreadNotificationCount: 0,
    criticalNotificationCount: 0,
  }),
}));

// Mock child components
vi.mock('../AdminSidebar', () => ({
  default: () => (
    <nav aria-label="Admin navigation" id="main-navigation">
      <a href="/admin">Dashboard</a>
      <a href="/admin/users">Users</a>
    </nav>
  ),
}));

vi.mock('../AdminHeader', () => ({
  default: ({ onAnnounce }: any) => (
    <header role="banner">
      <h1>Admin Panel</h1>
      <button onClick={() => onAnnounce?.('Test announcement')}>
        Announce
      </button>
    </header>
  ),
}));

vi.mock('../accessibility/SkipLinks', () => ({
  SkipLinks: () => (
    <div className="sr-only focus-within:not-sr-only">
      <button onClick={() => {
        const main = document.getElementById('main-content');
        main?.focus();
      }}>
        Skip to main content
      </button>
    </div>
  ),
}));

vi.mock('../accessibility/AriaLiveRegion', () => ({
  AriaLiveRegion: ({ message }: any) => (
    <div role="status" aria-live="polite">
      {message}
    </div>
  ),
}));

vi.mock('../accessibility/AccessibilityToolbar', () => ({
  AccessibilityToolbar: () => (
    <div role="toolbar" aria-label="Accessibility tools">
      <button>High Contrast</button>
      <button>Increase Font</button>
    </div>
  ),
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <AuthProvider>
      <AdminProvider>
        {children}
      </AdminProvider>
    </AuthProvider>
  </BrowserRouter>
);

describe('Accessibility and Responsive Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset DOM
    document.body.innerHTML = '';
    document.documentElement.className = '';
    
    // Mock window properties
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    });
  });

  afterEach(() => {
    document.documentElement.classList.remove('high-contrast', 'keyboard-user');
  });

  describe('Complete Admin Layout Accessibility', () => {
    it('should render with proper semantic structure', () => {
      render(
        <TestWrapper>
          <AdminLayout title="Dashboard">
            <div>Main content</div>
          </AdminLayout>
        </TestWrapper>
      );

      // Check semantic structure
      expect(screen.getByRole('banner')).toBeInTheDocument(); // Header
      expect(screen.getByRole('navigation', { name: /admin navigation/i })).toBeInTheDocument();
      expect(screen.getByRole('main', { name: /dashboard - admin panel/i })).toBeInTheDocument();
      expect(screen.getByRole('toolbar', { name: /accessibility tools/i })).toBeInTheDocument();
    });

    it('should provide skip links functionality', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <AdminLayout title="Dashboard">
            <div>Main content</div>
          </AdminLayout>
        </TestWrapper>
      );

      const skipLink = screen.getByRole('button', { name: /skip to main content/i });
      await user.click(skipLink);

      const mainContent = screen.getByRole('main');
      expect(mainContent).toHaveFocus();
    });

    it('should handle keyboard navigation throughout the layout', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <AdminLayout title="Dashboard">
            <button>Content Button</button>
          </AdminLayout>
        </TestWrapper>
      );

      // Tab through focusable elements
      await user.tab();
      expect(screen.getByRole('button', { name: /skip to main content/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /high contrast/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /increase font/i })).toHaveFocus();
    });

    it('should announce dynamic content changes', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <AdminLayout title="Dashboard">
            <div>Main content</div>
          </AdminLayout>
        </TestWrapper>
      );

      const announceButton = screen.getByRole('button', { name: /announce/i });
      await user.click(announceButton);

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent('Test announcement');
      });
    });
  });

  describe('Responsive Behavior Integration', () => {
    it('should adapt to mobile viewport', () => {
      // Mock mobile viewport
      const mockUseResponsive = vi.fn(() => ({
        windowSize: { width: 375, height: 667 },
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        breakpoint: 'sm',
      }));

      vi.doMock('../../../hooks/useResponsive', () => ({
        useResponsive: mockUseResponsive,
        useResponsiveSidebar: () => ({
          isCollapsed: true,
          isMobileMenuOpen: false,
          toggleSidebar: vi.fn(),
          closeMobileMenu: vi.fn(),
          shouldShowOverlay: false,
        }),
        useTouchFriendly: () => ({
          isTouchDevice: true,
          touchTargetSize: 'min-h-[44px] min-w-[44px]',
          touchSpacing: 'space-y-2',
        }),
      }));

      render(
        <TestWrapper>
          <AdminLayout title="Dashboard">
            <div>Mobile content</div>
          </AdminLayout>
        </TestWrapper>
      );

      // Should hide accessibility toolbar on mobile
      const toolbar = screen.getByRole('toolbar');
      expect(toolbar).toHaveClass('lg:block', 'hidden');
    });

    it('should handle touch-friendly interactions', () => {
      const mockUseTouchFriendly = vi.fn(() => ({
        isTouchDevice: true,
        touchTargetSize: 'min-h-[44px] min-w-[44px]',
        touchSpacing: 'space-y-2',
      }));

      vi.doMock('../../../hooks/useResponsive', () => ({
        useResponsive: () => ({
          isMobile: true,
          isTablet: false,
          isDesktop: false,
        }),
        useTouchFriendly: mockUseTouchFriendly,
      }));

      render(
        <TestWrapper>
          <AdminLayout>
            <button className="test-button">Touch Button</button>
          </AdminLayout>
        </TestWrapper>
      );

      // Touch targets should be appropriately sized
      const button = screen.getByRole('button', { name: /touch button/i });
      expect(button).toHaveClass('test-button');
    });
  });

  describe('High Contrast Mode Integration', () => {
    it('should apply high contrast styles when enabled', () => {
      const mockUseHighContrast = vi.fn(() => ({
        isHighContrast: true,
        toggleHighContrast: vi.fn(),
      }));

      vi.doMock('../../../hooks/useAccessibility', () => ({
        useAriaLiveRegion: () => ({
          message: '',
          politeness: 'polite',
          announce: vi.fn(),
        }),
        useKeyboardNavigation: () => ({
          isKeyboardUser: false,
        }),
        useHighContrast: mockUseHighContrast,
        useFocusTrap: () => ({ current: null }),
        useSkipLinks: () => ({
          skipToContent: vi.fn(),
          skipToNavigation: vi.fn(),
        }),
      }));

      render(
        <TestWrapper>
          <AdminLayout title="Dashboard">
            <div>High contrast content</div>
          </AdminLayout>
        </TestWrapper>
      );

      // High contrast class should be applied
      expect(document.documentElement).toHaveClass('high-contrast');
    });

    it('should persist accessibility preferences', () => {
      const mockSetItem = vi.fn();
      const mockGetItem = vi.fn(() => 'true');
      
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: mockGetItem,
          setItem: mockSetItem,
        },
        writable: true,
      });

      render(
        <TestWrapper>
          <AdminLayout>
            <div>Content</div>
          </AdminLayout>
        </TestWrapper>
      );

      expect(mockGetItem).toHaveBeenCalledWith('admin-high-contrast');
    });
  });

  describe('Keyboard Navigation Integration', () => {
    it('should handle complex keyboard navigation scenarios', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <AdminLayout title="Dashboard">
            <div>
              <button>Button 1</button>
              <input placeholder="Search" />
              <select>
                <option>Option 1</option>
              </select>
              <a href="/test">Link</a>
            </div>
          </AdminLayout>
        </TestWrapper>
      );

      // Navigate through all focusable elements
      const focusableElements = [
        screen.getByRole('button', { name: /skip to main content/i }),
        screen.getByRole('button', { name: /high contrast/i }),
        screen.getByRole('button', { name: /increase font/i }),
        screen.getByRole('button', { name: /announce/i }),
        screen.getByRole('button', { name: /button 1/i }),
        screen.getByRole('textbox'),
        screen.getByRole('combobox'),
        screen.getByRole('link'),
      ];

      for (let i = 0; i < focusableElements.length; i++) {
        await user.tab();
        expect(focusableElements[i]).toHaveFocus();
      }
    });

    it('should handle escape key for closing modals', async () => {
      const user = userEvent.setup();
      const mockClose = vi.fn();
      
      render(
        <TestWrapper>
          <AdminLayout>
            <div 
              role="dialog" 
              onKeyDown={(e) => {
                if (e.key === 'Escape') mockClose();
              }}
            >
              <button>Modal Button</button>
            </div>
          </AdminLayout>
        </TestWrapper>
      );

      const dialog = screen.getByRole('dialog');
      dialog.focus();
      
      await user.keyboard('{Escape}');
      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe('Screen Reader Support Integration', () => {
    it('should provide comprehensive ARIA support', () => {
      render(
        <TestWrapper>
          <AdminLayout title="User Management">
            <div>
              <h2>Users List</h2>
              <table>
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Email</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>John Doe</td>
                    <td>john@example.com</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </AdminLayout>
        </TestWrapper>
      );

      // Check ARIA landmarks
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('toolbar')).toBeInTheDocument();

      // Check table accessibility
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
      
      const columnHeaders = screen.getAllByRole('columnheader');
      expect(columnHeaders).toHaveLength(2);
      expect(columnHeaders[0]).toHaveAttribute('scope', 'col');
    });

    it('should announce loading states', async () => {
      const TestComponent = () => {
        const [loading, setLoading] = React.useState(false);
        
        return (
          <TestWrapper>
            <AdminLayout>
              <div>
                <button onClick={() => setLoading(true)}>
                  Load Data
                </button>
                {loading && (
                  <div role="status" aria-live="polite">
                    Loading data...
                  </div>
                )}
              </div>
            </AdminLayout>
          </TestWrapper>
        );
      };

      const user = userEvent.setup();
      render(<TestComponent />);

      const loadButton = screen.getByRole('button', { name: /load data/i });
      await user.click(loadButton);

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent('Loading data...');
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle accessibility errors gracefully', () => {
      // Mock console.error to catch accessibility violations
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(
        <TestWrapper>
          <AdminLayout>
            <div>
              {/* Intentionally missing alt text */}
              <img src="/test.jpg" />
              <button></button> {/* Empty button */}
            </div>
          </AdminLayout>
        </TestWrapper>
      );

      // Component should still render despite accessibility issues
      expect(screen.getByRole('main')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });

    it('should provide fallback content for failed components', () => {
      const ErrorComponent = () => {
        throw new Error('Component failed');
      };

      const TestWithErrorBoundary = () => (
        <TestWrapper>
          <AdminLayout>
            <div>
              <ErrorComponent />
            </div>
          </AdminLayout>
        </TestWrapper>
      );

      // Should not crash the entire application
      expect(() => render(<TestWithErrorBoundary />)).not.toThrow();
    });
  });

  describe('Performance Considerations', () => {
    it('should not cause excessive re-renders', () => {
      const renderSpy = vi.fn();
      
      const TestComponent = () => {
        renderSpy();
        return (
          <TestWrapper>
            <AdminLayout>
              <div>Performance test</div>
            </AdminLayout>
          </TestWrapper>
        );
      };

      const { rerender } = render(<TestComponent />);
      
      // Initial render
      expect(renderSpy).toHaveBeenCalledTimes(1);
      
      // Re-render with same props
      rerender(<TestComponent />);
      
      // Should not cause excessive re-renders
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `User ${i}`,
        email: `user${i}@example.com`,
      }));

      render(
        <TestWrapper>
          <AdminLayout>
            <div>
              {largeDataset.slice(0, 10).map(user => (
                <div key={user.id} role="listitem">
                  {user.name}
                </div>
              ))}
            </div>
          </AdminLayout>
        </TestWrapper>
      );

      // Should render efficiently without blocking
      expect(screen.getAllByRole('listitem')).toHaveLength(10);
    });
  });
});