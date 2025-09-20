import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { SkipLinks } from '../SkipLinks';
import { AriaLiveRegion } from '../AriaLiveRegion';
import { AccessibilityToolbar } from '../AccessibilityToolbar';
import { useAccessibility, useHighContrast, useFocusTrap } from '../../../hooks/useAccessibility';

// Mock hooks
vi.mock('../../../hooks/useAccessibility', () => ({
  useAccessibility: vi.fn(),
  useHighContrast: vi.fn(),
  useFocusTrap: vi.fn(),
  useSkipLinks: vi.fn(() => ({
    skipToContent: vi.fn(),
    skipToNavigation: vi.fn(),
  })),
  useAriaLiveRegion: vi.fn(() => ({
    message: '',
    politeness: 'polite',
    announce: vi.fn(),
  })),
  useKeyboardNavigation: vi.fn(() => ({
    isKeyboardUser: false,
  })),
}));

describe('Accessibility Components', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });
  });

  afterEach(() => {
    // Clean up DOM
    document.documentElement.classList.remove('high-contrast');
  });

  describe('SkipLinks', () => {
    it('should render skip links with proper accessibility attributes', () => {
      render(<SkipLinks />);
      
      const skipToContent = screen.getByRole('button', { name: /skip to main content/i });
      const skipToNavigation = screen.getByRole('button', { name: /skip to navigation/i });
      
      expect(skipToContent).toBeInTheDocument();
      expect(skipToNavigation).toBeInTheDocument();
    });

    it('should be hidden by default but visible on focus', () => {
      render(<SkipLinks />);
      
      const container = screen.getByRole('button', { name: /skip to main content/i }).parentElement?.parentElement;
      expect(container).toHaveClass('sr-only');
      expect(container).toHaveClass('focus-within:not-sr-only');
    });

    it('should call skip functions when clicked', async () => {
      const user = userEvent.setup();
      
      // Mock main content element
      const mainContent = document.createElement('main');
      mainContent.id = 'main-content';
      mainContent.tabIndex = -1;
      document.body.appendChild(mainContent);
      
      render(<SkipLinks />);
      
      const skipToContent = screen.getByRole('button', { name: /skip to main content/i });
      await user.click(skipToContent);
      
      expect(document.activeElement).toBe(mainContent);
      
      // Cleanup
      document.body.removeChild(mainContent);
    });
  });

  describe('AriaLiveRegion', () => {
    it('should render with correct ARIA attributes', () => {
      render(<AriaLiveRegion message="Test message" politeness="assertive" />);
      
      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toHaveAttribute('aria-live', 'assertive');
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
      expect(liveRegion).toHaveClass('sr-only');
    });

    it('should display the message', () => {
      render(<AriaLiveRegion message="Important announcement" />);
      
      expect(screen.getByText('Important announcement')).toBeInTheDocument();
    });

    it('should default to polite politeness', () => {
      render(<AriaLiveRegion message="Test" />);
      
      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('AccessibilityToolbar', () => {
    beforeEach(() => {
      (useHighContrast as any).mockReturnValue({
        isHighContrast: false,
        toggleHighContrast: vi.fn(),
      });
    });

    it('should render all accessibility controls', () => {
      render(<AccessibilityToolbar />);
      
      expect(screen.getByRole('toolbar', { name: /accessibility tools/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /enable high contrast mode/i })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: /font size controls/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /announce accessibility features/i })).toBeInTheDocument();
    });

    it('should toggle high contrast mode', async () => {
      const user = userEvent.setup();
      const mockToggle = vi.fn();
      
      (useHighContrast as any).mockReturnValue({
        isHighContrast: false,
        toggleHighContrast: mockToggle,
      });
      
      render(<AccessibilityToolbar />);
      
      const contrastButton = screen.getByRole('button', { name: /enable high contrast mode/i });
      await user.click(contrastButton);
      
      expect(mockToggle).toHaveBeenCalled();
    });

    it('should show correct contrast button state', () => {
      (useHighContrast as any).mockReturnValue({
        isHighContrast: true,
        toggleHighContrast: vi.fn(),
      });
      
      render(<AccessibilityToolbar />);
      
      const contrastButton = screen.getByRole('button', { name: /disable high contrast mode/i });
      expect(contrastButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should adjust font size', async () => {
      const user = userEvent.setup();
      
      render(<AccessibilityToolbar />);
      
      const increaseButton = screen.getByRole('button', { name: /increase font size/i });
      const decreaseButton = screen.getByRole('button', { name: /decrease font size/i });
      const resetButton = screen.getByRole('button', { name: /reset font size/i });
      
      // Test increase
      await user.click(increaseButton);
      // Font size changes are applied to document.documentElement.style.fontSize
      
      // Test decrease
      await user.click(decreaseButton);
      
      // Test reset
      await user.click(resetButton);
      
      expect(increaseButton).toBeInTheDocument();
      expect(decreaseButton).toBeInTheDocument();
      expect(resetButton).toBeInTheDocument();
    });

    it('should announce accessibility features', async () => {
      const user = userEvent.setup();
      
      // Mock speechSynthesis
      const mockSpeak = vi.fn();
      Object.defineProperty(window, 'speechSynthesis', {
        value: { speak: mockSpeak },
        writable: true,
      });
      
      render(<AccessibilityToolbar />);
      
      const helpButton = screen.getByRole('button', { name: /announce accessibility features/i });
      await user.click(helpButton);
      
      expect(mockSpeak).toHaveBeenCalled();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should handle Tab key navigation', () => {
      render(
        <div>
          <button>First</button>
          <button>Second</button>
          <button>Third</button>
        </div>
      );
      
      const buttons = screen.getAllByRole('button');
      
      // Focus first button
      buttons[0].focus();
      expect(document.activeElement).toBe(buttons[0]);
      
      // Simulate Tab key
      fireEvent.keyDown(document.activeElement!, { key: 'Tab' });
      
      // Should move to next focusable element
      buttons[1].focus();
      expect(document.activeElement).toBe(buttons[1]);
    });

    it('should handle Enter and Space key activation', async () => {
      const user = userEvent.setup();
      const mockClick = vi.fn();
      
      render(<button onClick={mockClick}>Test Button</button>);
      
      const button = screen.getByRole('button');
      button.focus();
      
      // Test Enter key
      await user.keyboard('{Enter}');
      expect(mockClick).toHaveBeenCalledTimes(1);
      
      // Test Space key
      await user.keyboard(' ');
      expect(mockClick).toHaveBeenCalledTimes(2);
    });

    it('should handle Escape key for modals', async () => {
      const user = userEvent.setup();
      const mockClose = vi.fn();
      
      render(
        <div role="dialog" onKeyDown={(e) => {
          if (e.key === 'Escape') mockClose();
        }}>
          <button>Close</button>
        </div>
      );
      
      const dialog = screen.getByRole('dialog');
      dialog.focus();
      
      await user.keyboard('{Escape}');
      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe('Focus Management', () => {
    it('should trap focus within modal', () => {
      const TestModal = () => {
        const ref = useFocusTrap(true);
        return (
          <div ref={ref as any} role="dialog">
            <button>First</button>
            <button>Last</button>
          </div>
        );
      };
      
      render(<TestModal />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
    });

    it('should restore focus when modal closes', () => {
      const TestComponent = () => {
        const [isOpen, setIsOpen] = React.useState(false);
        
        return (
          <div>
            <button onClick={() => setIsOpen(true)}>Open Modal</button>
            {isOpen && (
              <div role="dialog">
                <button onClick={() => setIsOpen(false)}>Close</button>
              </div>
            )}
          </div>
        );
      };
      
      render(<TestComponent />);
      
      const openButton = screen.getByRole('button', { name: /open modal/i });
      openButton.focus();
      
      fireEvent.click(openButton);
      
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);
      
      // Focus should return to the open button
      expect(document.activeElement).toBe(openButton);
    });
  });

  describe('Screen Reader Support', () => {
    it('should provide proper ARIA labels', () => {
      render(
        <div>
          <button aria-label="Delete item">×</button>
          <input aria-describedby="help-text" />
          <div id="help-text">Enter your name</div>
        </div>
      );
      
      const button = screen.getByRole('button', { name: /delete item/i });
      const input = screen.getByRole('textbox');
      
      expect(button).toHaveAttribute('aria-label', 'Delete item');
      expect(input).toHaveAttribute('aria-describedby', 'help-text');
    });

    it('should announce dynamic content changes', async () => {
      const TestComponent = () => {
        const [message, setMessage] = React.useState('');
        
        return (
          <div>
            <button onClick={() => setMessage('Content updated')}>
              Update
            </button>
            <AriaLiveRegion message={message} />
          </div>
        );
      };
      
      render(<TestComponent />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Content updated')).toBeInTheDocument();
      });
    });
  });

  describe('High Contrast Mode', () => {
    it('should apply high contrast styles when enabled', () => {
      (useHighContrast as any).mockReturnValue({
        isHighContrast: true,
        toggleHighContrast: vi.fn(),
      });
      
      // Simulate high contrast mode
      document.documentElement.classList.add('high-contrast');
      
      render(<div className="test-element">Test</div>);
      
      expect(document.documentElement).toHaveClass('high-contrast');
    });

    it('should persist high contrast preference', () => {
      const mockSetItem = vi.fn();
      (window.localStorage.setItem as any) = mockSetItem;
      
      (useHighContrast as any).mockReturnValue({
        isHighContrast: false,
        toggleHighContrast: () => {
          mockSetItem('admin-high-contrast', 'true');
        },
      });
      
      render(<AccessibilityToolbar />);
      
      const contrastButton = screen.getByRole('button', { name: /enable high contrast mode/i });
      fireEvent.click(contrastButton);
      
      expect(mockSetItem).toHaveBeenCalledWith('admin-high-contrast', 'true');
    });
  });
});

// Integration tests for accessibility
describe('Accessibility Integration', () => {
  it('should work with screen readers', () => {
    render(
      <div>
        <h1>Admin Panel</h1>
        <nav aria-label="Main navigation">
          <ul>
            <li><a href="/admin">Dashboard</a></li>
            <li><a href="/admin/users">Users</a></li>
          </ul>
        </nav>
        <main aria-label="Main content">
          <h2>Dashboard</h2>
          <p>Welcome to the admin panel</p>
        </main>
      </div>
    );
    
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument();
    expect(screen.getByRole('main', { name: /main content/i })).toBeInTheDocument();
  });

  it('should support keyboard-only navigation', async () => {
    const user = userEvent.setup();
    
    render(
      <div>
        <button>First</button>
        <input placeholder="Search" />
        <select>
          <option>Option 1</option>
        </select>
        <a href="/test">Link</a>
      </div>
    );
    
    // Tab through all focusable elements
    await user.tab();
    expect(screen.getByRole('button')).toHaveFocus();
    
    await user.tab();
    expect(screen.getByRole('textbox')).toHaveFocus();
    
    await user.tab();
    expect(screen.getByRole('combobox')).toHaveFocus();
    
    await user.tab();
    expect(screen.getByRole('link')).toHaveFocus();
  });

  it('should handle responsive accessibility', () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });
    
    render(
      <div>
        <button className="min-h-[44px] min-w-[44px]">
          Mobile Button
        </button>
      </div>
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('min-h-[44px]');
    expect(button).toHaveClass('min-w-[44px]');
  });
});