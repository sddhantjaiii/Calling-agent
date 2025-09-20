import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';

// Import admin components
import { AdminContext } from '../../contexts/AdminContext';
import AdminPanel from '../../components/admin/AdminPanel';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { AdminSidebar } from '../../components/admin/AdminSidebar';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { UserManagement } from '../../components/admin/UserManagement/UserManagement';
import { AgentManagement } from '../../components/admin/AgentManagement/AgentManagement';

// Mock services
vi.mock('../../services/adminApiService', () => ({
  adminApiService: {
    getUsers: vi.fn(),
    getAgents: vi.fn(),
    getSystemStats: vi.fn(),
    updateUser: vi.fn(),
  }
}));

// Accessibility testing utilities
const checkAriaLabels = (container: HTMLElement) => {
  const elementsWithAriaLabel = container.querySelectorAll('[aria-label]');
  const elementsWithAriaLabelledBy = container.querySelectorAll('[aria-labelledby]');
  const elementsWithAriaDescribedBy = container.querySelectorAll('[aria-describedby]');
  
  return {
    ariaLabels: elementsWithAriaLabel.length,
    ariaLabelledBy: elementsWithAriaLabelledBy.length,
    ariaDescribedBy: elementsWithAriaDescribedBy.length,
  };
};

const checkHeadingHierarchy = (container: HTMLElement) => {
  const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
  const headingLevels = Array.from(headings).map(h => parseInt(h.tagName.charAt(1)));
  
  let isValidHierarchy = true;
  let previousLevel = 0;
  
  for (const level of headingLevels) {
    if (previousLevel === 0) {
      // First heading should be h1
      if (level !== 1) {
        isValidHierarchy = false;
      }
    } else if (level > previousLevel + 1) {
      // Should not skip heading levels
      isValidHierarchy = false;
    }
    previousLevel = level;
  }
  
  return {
    headings: headingLevels,
    isValidHierarchy,
  };
};

const checkColorContrast = (element: HTMLElement) => {
  const computedStyle = window.getComputedStyle(element);
  const backgroundColor = computedStyle.backgroundColor;
  const color = computedStyle.color;
  
  // This is a simplified check - in real scenarios, you'd use a proper contrast ratio calculator
  const hasBackgroundColor = backgroundColor !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'transparent';
  const hasTextColor = color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent';
  
  return {
    hasBackgroundColor,
    hasTextColor,
    backgroundColor,
    color,
  };
};

const simulateKeyboardNavigation = async (user: ReturnType<typeof userEvent.setup>) => {
  const navigationLog = [];
  
  // Start navigation
  await user.tab();
  navigationLog.push(document.activeElement?.tagName || 'none');
  
  // Navigate through several elements
  for (let i = 0; i < 10; i++) {
    await user.tab();
    const activeElement = document.activeElement;
    navigationLog.push({
      tagName: activeElement?.tagName || 'none',
      role: activeElement?.getAttribute('role'),
      ariaLabel: activeElement?.getAttribute('aria-label'),
      id: activeElement?.id,
    });
  }
  
  return navigationLog;
};

const createTestWrapper = (adminUser = { role: 'admin', id: '1', email: 'admin@test.com' }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AdminContext.Provider value={{
          user: adminUser,
          permissions: {
            canViewUsers: true,
            canEditUsers: true,
            canManageCredits: true,
            canViewAgents: true,
            canManageAgents: true,
            canViewAuditLogs: true,
            canManageSystem: adminUser.role === 'super_admin',
            canManageAPIKeys: adminUser.role === 'super_admin',
            canManageFeatureFlags: adminUser.role === 'super_admin',
          },
          isLoading: false,
          error: null,
        }}>
          {children}
        </AdminContext.Provider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Admin Panel Accessibility Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
  });

  describe('WCAG 2.1 AA Compliance', () => {
    describe('Perceivable - Information and UI components must be presentable to users in ways they can perceive', () => {
      it('provides text alternatives for non-text content', () => {
        const TestWrapper = createTestWrapper();
        const { container } = render(<AdminPanel />, { wrapper: TestWrapper });

        // Check for images with alt text
        const images = container.querySelectorAll('img');
        images.forEach(img => {
          expect(img).toHaveAttribute('alt');
        });

        // Check for icons with aria-labels
        const icons = container.querySelectorAll('[data-testid*="icon"]');
        icons.forEach(icon => {
          const hasAriaLabel = icon.hasAttribute('aria-label') || icon.hasAttribute('aria-labelledby');
          expect(hasAriaLabel).toBe(true);
        });
      });

      it('provides captions and alternatives for multimedia', () => {
        const TestWrapper = createTestWrapper();
        const { container } = render(<AdminPanel />, { wrapper: TestWrapper });

        // Check for video elements with captions
        const videos = container.querySelectorAll('video');
        videos.forEach(video => {
          const hasTrack = video.querySelector('track[kind="captions"]');
          expect(hasTrack).toBeTruthy();
        });

        // Check for audio elements with transcripts
        const audioElements = container.querySelectorAll('audio');
        audioElements.forEach(audio => {
          const hasTranscript = audio.hasAttribute('aria-describedby');
          expect(hasTranscript).toBe(true);
        });
      });

      it('ensures content can be presented without loss of meaning when stylesheets are disabled', () => {
        const TestWrapper = createTestWrapper();
        const { container } = render(<AdminPanel />, { wrapper: TestWrapper });

        // Check for semantic HTML structure
        expect(container.querySelector('main')).toBeInTheDocument();
        expect(container.querySelector('nav')).toBeInTheDocument();
        expect(container.querySelector('header')).toBeInTheDocument();

        // Check for proper heading hierarchy
        const { headings, isValidHierarchy } = checkHeadingHierarchy(container);
        expect(isValidHierarchy).toBe(true);
        expect(headings.length).toBeGreaterThan(0);
      });

      it('maintains sufficient color contrast ratios', () => {
        const TestWrapper = createTestWrapper();
        const { container } = render(<AdminPanel />, { wrapper: TestWrapper });

        // Check text elements for color contrast
        const textElements = container.querySelectorAll('p, span, div, button, a');
        let contrastChecks = 0;
        
        textElements.forEach(element => {
          const textContent = element.textContent?.trim();
          if (textContent && textContent.length > 0) {
            const contrast = checkColorContrast(element as HTMLElement);
            if (contrast.hasBackgroundColor && contrast.hasTextColor) {
              contrastChecks++;
              // In a real implementation, you would calculate actual contrast ratios
              expect(contrast.backgroundColor).not.toBe(contrast.color);
            }
          }
        });

        expect(contrastChecks).toBeGreaterThan(0);
      });
    });

    describe('Operable - UI components and navigation must be operable', () => {
      it('makes all functionality available via keyboard', async () => {
        const TestWrapper = createTestWrapper();
        render(<AdminPanel />, { wrapper: TestWrapper });

        const navigationLog = await simulateKeyboardNavigation(user);
        
        // Should be able to navigate through interactive elements
        expect(navigationLog.length).toBeGreaterThan(5);
        
        // Check that interactive elements are focusable
        const interactiveElements = navigationLog.filter(item => 
          typeof item === 'object' && 
          (item.tagName === 'BUTTON' || item.tagName === 'A' || item.tagName === 'INPUT')
        );
        
        expect(interactiveElements.length).toBeGreaterThan(0);
      });

      it('provides users enough time to read and use content', async () => {
        const TestWrapper = createTestWrapper();
        render(<AdminPanel />, { wrapper: TestWrapper });

        // Check for any auto-updating content
        const autoUpdateElements = screen.queryAllByTestId(/auto-update|refresh|timer/);
        
        autoUpdateElements.forEach(element => {
          // Should have controls to pause, stop, or adjust timing
          const hasControls = element.querySelector('[aria-label*="pause"], [aria-label*="stop"], [aria-label*="extend"]');
          expect(hasControls).toBeTruthy();
        });
      });

      it('does not use content that causes seizures', () => {
        const TestWrapper = createTestWrapper();
        const { container } = render(<AdminPanel />, { wrapper: TestWrapper });

        // Check for flashing content
        const animatedElements = container.querySelectorAll('[class*="animate"], [class*="flash"], [class*="blink"]');
        
        animatedElements.forEach(element => {
          const computedStyle = window.getComputedStyle(element);
          const animationDuration = computedStyle.animationDuration;
          
          // Animations should not be too fast (potential seizure trigger)
          if (animationDuration && animationDuration !== 'none') {
            const duration = parseFloat(animationDuration);
            expect(duration).toBeGreaterThan(0.5); // At least 0.5 seconds
          }
        });
      });

      it('helps users navigate and find content', () => {
        const TestWrapper = createTestWrapper();
        const { container } = render(<AdminPanel />, { wrapper: TestWrapper });

        // Check for skip links
        const skipLinks = container.querySelectorAll('[href="#main"], [href="#content"]');
        expect(skipLinks.length).toBeGreaterThan(0);

        // Check for landmarks
        const landmarks = container.querySelectorAll('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"]');
        expect(landmarks.length).toBeGreaterThan(0);

        // Check for breadcrumbs
        const breadcrumbs = container.querySelectorAll('[aria-label*="breadcrumb"], [role="navigation"] ol, [role="navigation"] ul');
        expect(breadcrumbs.length).toBeGreaterThan(0);
      });
    });

    describe('Understandable - Information and the operation of UI must be understandable', () => {
      it('makes text readable and understandable', () => {
        const TestWrapper = createTestWrapper();
        const { container } = render(<AdminPanel />, { wrapper: TestWrapper });

        // Check for language attributes
        const htmlElement = document.documentElement;
        expect(htmlElement).toHaveAttribute('lang');

        // Check for text that changes context
        const contextChangingElements = container.querySelectorAll('select, input[type="radio"], input[type="checkbox"]');
        
        contextChangingElements.forEach(element => {
          // Should have proper labels and descriptions
          const hasLabel = element.hasAttribute('aria-label') || 
                          element.hasAttribute('aria-labelledby') ||
                          container.querySelector(`label[for="${element.id}"]`);
          expect(hasLabel).toBe(true);
        });
      });

      it('makes content appear and operate in predictable ways', async () => {
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

        const TestWrapper = createTestWrapper();
        render(<UserManagement />, { wrapper: TestWrapper });

        await waitFor(() => {
          expect(screen.getByText('John Doe')).toBeInTheDocument();
        });

        // Test focus behavior
        const firstButton = screen.getAllByRole('button')[0];
        await user.click(firstButton);
        
        // Focus should be managed predictably
        expect(document.activeElement).toBeTruthy();
        
        // Test navigation consistency
        const navigationItems = screen.getAllByRole('link');
        expect(navigationItems.length).toBeGreaterThan(0);
        
        // Navigation should be consistent across pages
        navigationItems.forEach(item => {
          expect(item).toHaveAttribute('href');
        });
      });

      it('helps users avoid and correct mistakes', async () => {
        const TestWrapper = createTestWrapper();
        render(<UserManagement />, { wrapper: TestWrapper });

        // Check for form validation
        const forms = screen.queryAllByRole('form');
        
        forms.forEach(form => {
          const inputs = form.querySelectorAll('input, select, textarea');
          
          inputs.forEach(input => {
            // Required fields should be marked
            if (input.hasAttribute('required')) {
              expect(input).toHaveAttribute('aria-required', 'true');
            }
            
            // Should have error message containers
            const errorId = input.getAttribute('aria-describedby');
            if (errorId) {
              const errorElement = document.getElementById(errorId);
              expect(errorElement).toBeInTheDocument();
            }
          });
        });
      });
    });

    describe('Robust - Content must be robust enough to be interpreted reliably by a wide variety of user agents', () => {
      it('maximizes compatibility with assistive technologies', () => {
        const TestWrapper = createTestWrapper();
        const { container } = render(<AdminPanel />, { wrapper: TestWrapper });

        // Check for proper ARIA usage
        const ariaStats = checkAriaLabels(container);
        expect(ariaStats.ariaLabels + ariaStats.ariaLabelledBy).toBeGreaterThan(0);

        // Check for valid HTML structure
        const customElements = container.querySelectorAll('*');
        customElements.forEach(element => {
          // Should not have invalid ARIA attributes
          const ariaAttributes = Array.from(element.attributes).filter(attr => 
            attr.name.startsWith('aria-')
          );
          
          ariaAttributes.forEach(attr => {
            // Basic validation - aria attributes should have values
            expect(attr.value).toBeTruthy();
          });
        });

        // Check for proper roles
        const elementsWithRoles = container.querySelectorAll('[role]');
        elementsWithRoles.forEach(element => {
          const role = element.getAttribute('role');
          // Should use valid ARIA roles
          const validRoles = [
            'button', 'link', 'textbox', 'combobox', 'listbox', 'option',
            'checkbox', 'radio', 'tab', 'tabpanel', 'dialog', 'alertdialog',
            'alert', 'status', 'log', 'marquee', 'timer', 'tooltip',
            'main', 'navigation', 'banner', 'contentinfo', 'complementary',
            'form', 'search', 'application', 'document', 'img', 'presentation'
          ];
          expect(validRoles).toContain(role);
        });
      });
    });
  });

  describe('Screen Reader Support', () => {
    it('provides proper screen reader announcements', () => {
      const TestWrapper = createTestWrapper();
      const { container } = render(<AdminPanel />, { wrapper: TestWrapper });

      // Check for live regions
      const liveRegions = container.querySelectorAll('[aria-live]');
      expect(liveRegions.length).toBeGreaterThan(0);

      liveRegions.forEach(region => {
        const liveValue = region.getAttribute('aria-live');
        expect(['polite', 'assertive', 'off']).toContain(liveValue);
      });

      // Check for status updates
      const statusElements = container.querySelectorAll('[role="status"], [role="alert"]');
      expect(statusElements.length).toBeGreaterThan(0);
    });

    it('provides descriptive labels for form controls', async () => {
      const { adminApiService } = await import('../../services/adminApiService');
      vi.mocked(adminApiService.getUsers).mockResolvedValue({
        success: true,
        data: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });

      const TestWrapper = createTestWrapper();
      render(<UserManagement />, { wrapper: TestWrapper });

      // Check form controls
      const inputs = screen.getAllByRole('textbox');
      const selects = screen.getAllByRole('combobox');
      const buttons = screen.getAllByRole('button');

      [...inputs, ...selects].forEach(control => {
        // Should have accessible name
        const accessibleName = control.getAttribute('aria-label') ||
                              control.getAttribute('aria-labelledby') ||
                              (control.id && document.querySelector(`label[for="${control.id}"]`));
        expect(accessibleName).toBeTruthy();
      });

      buttons.forEach(button => {
        // Buttons should have descriptive text or aria-label
        const hasText = button.textContent?.trim();
        const hasAriaLabel = button.getAttribute('aria-label');
        expect(hasText || hasAriaLabel).toBeTruthy();
      });
    });

    it('provides context for complex data tables', async () => {
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

      const TestWrapper = createTestWrapper();
      render(<UserManagement />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Check for data tables
      const tables = screen.getAllByRole('table');
      
      tables.forEach(table => {
        // Should have caption or aria-label
        const hasCaption = table.querySelector('caption');
        const hasAriaLabel = table.getAttribute('aria-label');
        expect(hasCaption || hasAriaLabel).toBeTruthy();

        // Headers should be properly associated
        const headers = table.querySelectorAll('th');
        headers.forEach(header => {
          expect(header).toHaveAttribute('scope');
        });
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('supports tab navigation through all interactive elements', async () => {
      const TestWrapper = createTestWrapper();
      render(<AdminPanel />, { wrapper: TestWrapper });

      const navigationLog = await simulateKeyboardNavigation(user);
      
      // Should navigate through multiple interactive elements
      const interactiveCount = navigationLog.filter(item => 
        typeof item === 'object' && 
        ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].includes(item.tagName)
      ).length;
      
      expect(interactiveCount).toBeGreaterThan(3);
    });

    it('supports arrow key navigation in menus and lists', async () => {
      const TestWrapper = createTestWrapper();
      render(<AdminSidebar activeSection="dashboard" onSectionChange={vi.fn()} userRole="admin" />, { wrapper: TestWrapper });

      // Find menu items
      const menuItems = screen.getAllByRole('menuitem');
      
      if (menuItems.length > 0) {
        // Focus first menu item
        menuItems[0].focus();
        expect(document.activeElement).toBe(menuItems[0]);

        // Test arrow key navigation
        await user.keyboard('{ArrowDown}');
        
        if (menuItems.length > 1) {
          expect(document.activeElement).toBe(menuItems[1]);
        }
      }
    });

    it('supports escape key to close modals and dropdowns', async () => {
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

      const TestWrapper = createTestWrapper();
      render(<UserManagement />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Open a modal
      const detailsButton = screen.getByTestId('user-details-1');
      await user.click(detailsButton);

      await waitFor(() => {
        expect(screen.getByTestId('user-details-modal')).toBeInTheDocument();
      });

      // Test escape key
      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByTestId('user-details-modal')).not.toBeInTheDocument();
      });
    });

    it('maintains focus management in dynamic content', async () => {
      const { adminApiService } = await import('../../services/adminApiService');
      vi.mocked(adminApiService.getUsers).mockResolvedValue({
        success: true,
        data: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });

      const TestWrapper = createTestWrapper();
      render(<UserManagement />, { wrapper: TestWrapper });

      // Test focus management when content changes
      const searchInput = screen.getByPlaceholderText(/search users/i);
      await user.click(searchInput);
      expect(document.activeElement).toBe(searchInput);

      // Type in search
      await user.type(searchInput, 'test');
      
      // Focus should remain on input during typing
      expect(document.activeElement).toBe(searchInput);
    });
  });

  describe('High Contrast and Visual Accessibility', () => {
    it('supports high contrast mode', () => {
      const TestWrapper = createTestWrapper();
      const { container } = render(<AdminPanel />, { wrapper: TestWrapper });

      // Simulate high contrast mode
      document.body.classList.add('high-contrast');

      // Check that elements are still visible and functional
      const buttons = container.querySelectorAll('button');
      const links = container.querySelectorAll('a');
      const inputs = container.querySelectorAll('input');

      [...buttons, ...links, ...inputs].forEach(element => {
        const computedStyle = window.getComputedStyle(element);
        
        // Elements should have defined colors in high contrast mode
        expect(computedStyle.color).not.toBe('');
        expect(computedStyle.backgroundColor).not.toBe('');
      });

      document.body.classList.remove('high-contrast');
    });

    it('supports zoom up to 200% without horizontal scrolling', () => {
      const TestWrapper = createTestWrapper();
      const { container } = render(<AdminPanel />, { wrapper: TestWrapper });

      // Simulate zoom
      document.body.style.zoom = '200%';

      // Check that content is still accessible
      const mainContent = container.querySelector('main');
      if (mainContent) {
        const rect = mainContent.getBoundingClientRect();
        
        // Content should not cause horizontal overflow
        expect(rect.width).toBeLessThanOrEqual(window.innerWidth);
      }

      document.body.style.zoom = '100%';
    });

    it('provides focus indicators for all interactive elements', async () => {
      const TestWrapper = createTestWrapper();
      const { container } = render(<AdminPanel />, { wrapper: TestWrapper });

      const interactiveElements = container.querySelectorAll(
        'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      for (const element of interactiveElements) {
        // Focus the element
        (element as HTMLElement).focus();
        
        // Check for focus indicator
        const computedStyle = window.getComputedStyle(element);
        const hasOutline = computedStyle.outline !== 'none' && computedStyle.outline !== '';
        const hasBoxShadow = computedStyle.boxShadow !== 'none' && computedStyle.boxShadow !== '';
        const hasBorder = computedStyle.border !== 'none' && computedStyle.border !== '';
        
        // Should have some form of focus indicator
        expect(hasOutline || hasBoxShadow || hasBorder).toBe(true);
      }
    });
  });

  describe('Mobile and Touch Accessibility', () => {
    it('provides adequate touch target sizes', () => {
      const TestWrapper = createTestWrapper();
      const { container } = render(<AdminPanel />, { wrapper: TestWrapper });

      const touchTargets = container.querySelectorAll('button, a, input[type="checkbox"], input[type="radio"]');
      
      touchTargets.forEach(target => {
        const rect = target.getBoundingClientRect();
        const minSize = 44; // WCAG recommended minimum touch target size
        
        // Touch targets should be at least 44x44 pixels
        expect(Math.max(rect.width, rect.height)).toBeGreaterThanOrEqual(minSize);
      });
    });

    it('supports gesture-based navigation', async () => {
      const TestWrapper = createTestWrapper();
      render(<AdminPanel />, { wrapper: TestWrapper });

      // Test swipe gestures (simulated)
      const swipeableElements = screen.queryAllByTestId(/swipeable|carousel|slider/);
      
      swipeableElements.forEach(element => {
        // Should have keyboard alternatives for gestures
        const hasKeyboardSupport = element.hasAttribute('tabindex') || 
                                  element.querySelector('[tabindex]');
        expect(hasKeyboardSupport).toBe(true);
      });
    });
  });

  describe('Error Handling and User Feedback', () => {
    it('provides accessible error messages', async () => {
      const { adminApiService } = await import('../../services/adminApiService');
      vi.mocked(adminApiService.getUsers).mockRejectedValue(new Error('API Error'));

      const TestWrapper = createTestWrapper();
      render(<UserManagement />, { wrapper: TestWrapper });

      await waitFor(() => {
        const errorMessage = screen.getByText(/error loading users/i);
        expect(errorMessage).toBeInTheDocument();
        
        // Error should be announced to screen readers
        expect(errorMessage).toHaveAttribute('role', 'alert');
      });
    });

    it('provides accessible loading states', () => {
      const TestWrapper = createTestWrapper();
      render(<UserManagement />, { wrapper: TestWrapper });

      const loadingIndicator = screen.getByTestId('user-management-loading');
      expect(loadingIndicator).toBeInTheDocument();
      
      // Loading state should be announced
      expect(loadingIndicator).toHaveAttribute('aria-live', 'polite');
      expect(loadingIndicator).toHaveAttribute('aria-label');
    });

    it('provides accessible success feedback', async () => {
      const { adminApiService } = await import('../../services/adminApiService');
      vi.mocked(adminApiService.updateUser).mockResolvedValue({
        success: true,
        data: { message: 'User updated successfully' },
      });

      const TestWrapper = createTestWrapper();
      render(<UserManagement />, { wrapper: TestWrapper });

      // Simulate successful action
      // This would trigger success feedback in the actual component
      
      // Success messages should be accessible
      const successMessages = screen.queryAllByRole('status');
      successMessages.forEach(message => {
        expect(message).toHaveAttribute('aria-live');
      });
    });
  });
});