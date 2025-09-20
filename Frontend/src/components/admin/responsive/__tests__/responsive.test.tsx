import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { ResponsiveTable } from '../ResponsiveTable';
import { ResponsiveSidebar } from '../ResponsiveSidebar';
import { useResponsive, useResponsiveTable, useTouchFriendly } from '../../../hooks/useResponsive';

// Mock hooks
vi.mock('../../../hooks/useResponsive', () => ({
  useResponsive: vi.fn(),
  useResponsiveTable: vi.fn(),
  useResponsiveSidebar: vi.fn(),
  useTouchFriendly: vi.fn(),
}));

// Mock UI components
vi.mock('../../ui/table', () => ({
  Table: ({ children, className }: any) => <table className={className}>{children}</table>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableCell: ({ children, className }: any) => <td className={className}>{children}</td>,
  TableHead: ({ children, className, scope }: any) => <th className={className} scope={scope}>{children}</th>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableRow: ({ children, className, onClick, tabIndex, role, onKeyDown }: any) => (
    <tr className={className} onClick={onClick} tabIndex={tabIndex} role={role} onKeyDown={onKeyDown}>
      {children}
    </tr>
  ),
}));

vi.mock('../../ui/card', () => ({
  Card: ({ children, className, onClick, tabIndex, role, onKeyDown }: any) => (
    <div className={className} onClick={onClick} tabIndex={tabIndex} role={role} onKeyDown={onKeyDown}>
      {children}
    </div>
  ),
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: any) => <h3 className={className}>{children}</h3>,
}));

vi.mock('../../ui/button', () => ({
  Button: ({ children, onClick, className, 'aria-label': ariaLabel }: any) => (
    <button onClick={onClick} className={className} aria-label={ariaLabel}>
      {children}
    </button>
  ),
}));

vi.mock('../../ui/sheet', () => ({
  Sheet: ({ children, open, onOpenChange }: any) => (
    <div data-testid="sheet" data-open={open} onClick={() => onOpenChange?.(false)}>
      {children}
    </div>
  ),
  SheetContent: ({ children, side, className }: any) => (
    <div className={className} data-side={side}>
      {children}
    </div>
  ),
  SheetTrigger: ({ children }: any) => <div>{children}</div>,
}));

describe('Responsive Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    (useResponsive as any).mockReturnValue({
      windowSize: { width: 1024, height: 768 },
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isLargeDesktop: false,
      breakpoint: 'lg',
    });
    
    (useTouchFriendly as any).mockReturnValue({
      isTouchDevice: false,
      touchTargetSize: '',
      touchSpacing: 'space-y-1',
    });
  });

  describe('ResponsiveTable', () => {
    const mockData = [
      { id: 1, name: 'John Doe', email: 'john@example.com', role: 'admin' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'user' },
    ];

    const mockColumns = [
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'role', label: 'Role' },
    ];

    beforeEach(() => {
      (useResponsiveTable as any).mockReturnValue({
        viewMode: 'table',
        toggleViewMode: vi.fn(),
        shouldUseCards: false,
        shouldUseTable: true,
      });
    });

    it('should render table view on desktop', () => {
      render(<ResponsiveTable data={mockData} columns={mockColumns} />);
      
      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should render card view on mobile', () => {
      (useResponsiveTable as any).mockReturnValue({
        viewMode: 'cards',
        toggleViewMode: vi.fn(),
        shouldUseCards: true,
        shouldUseTable: false,
      });

      render(<ResponsiveTable data={mockData} columns={mockColumns} />);
      
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Email:')).toBeInTheDocument();
    });

    it('should toggle between table and card views', async () => {
      const user = userEvent.setup();
      const mockToggle = vi.fn();
      
      (useResponsiveTable as any).mockReturnValue({
        viewMode: 'table',
        toggleViewMode: mockToggle,
        shouldUseCards: false,
        shouldUseTable: true,
      });

      render(<ResponsiveTable data={mockData} columns={mockColumns} />);
      
      const toggleButton = screen.getByRole('button', { name: /switch to card view/i });
      await user.click(toggleButton);
      
      expect(mockToggle).toHaveBeenCalled();
    });

    it('should handle empty data', () => {
      render(<ResponsiveTable data={[]} columns={mockColumns} />);
      
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('should handle row clicks', async () => {
      const user = userEvent.setup();
      const mockRowClick = vi.fn();
      
      render(
        <ResponsiveTable 
          data={mockData} 
          columns={mockColumns} 
          onRowClick={mockRowClick}
        />
      );
      
      const row = screen.getByText('John Doe').closest('tr');
      expect(row).toHaveAttribute('tabIndex', '0');
      expect(row).toHaveAttribute('role', 'button');
      
      await user.click(row!);
      expect(mockRowClick).toHaveBeenCalledWith(mockData[0]);
    });

    it('should handle keyboard navigation for rows', async () => {
      const user = userEvent.setup();
      const mockRowClick = vi.fn();
      
      render(
        <ResponsiveTable 
          data={mockData} 
          columns={mockColumns} 
          onRowClick={mockRowClick}
        />
      );
      
      const row = screen.getByText('John Doe').closest('tr');
      row?.focus();
      
      await user.keyboard('{Enter}');
      expect(mockRowClick).toHaveBeenCalledWith(mockData[0]);
      
      await user.keyboard(' ');
      expect(mockRowClick).toHaveBeenCalledTimes(2);
    });

    it('should apply touch-friendly styles on touch devices', () => {
      (useTouchFriendly as any).mockReturnValue({
        isTouchDevice: true,
        touchTargetSize: 'min-h-[44px] min-w-[44px]',
        touchSpacing: 'space-y-2',
      });

      render(<ResponsiveTable data={mockData} columns={mockColumns} />);
      
      const rows = screen.getAllByRole('row');
      // Skip header row
      expect(rows[1]).toHaveClass('min-h-[44px]');
    });

    it('should render custom cell content', () => {
      const columnsWithRender = [
        { key: 'name', label: 'Name' },
        { 
          key: 'role', 
          label: 'Role',
          render: (value: string) => <span className="badge">{value.toUpperCase()}</span>
        },
      ];

      render(<ResponsiveTable data={mockData} columns={columnsWithRender} />);
      
      expect(screen.getByText('ADMIN')).toBeInTheDocument();
      expect(screen.getByText('ADMIN')).toHaveClass('badge');
    });
  });

  describe('ResponsiveSidebar', () => {
    const mockChildren = <div>Sidebar Content</div>;

    beforeEach(() => {
      (useResponsive as any).mockReturnValue({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
      });
      
      (useTouchFriendly as any).mockReturnValue({
        touchTargetSize: '',
      });
    });

    it('should render desktop sidebar by default', () => {
      render(<ResponsiveSidebar>{mockChildren}</ResponsiveSidebar>);
      
      expect(screen.getByText('Sidebar Content')).toBeInTheDocument();
      expect(screen.getByRole('navigation', { name: /admin navigation/i })).toBeInTheDocument();
    });

    it('should render mobile menu button on mobile', () => {
      (useResponsive as any).mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
      });

      render(<ResponsiveSidebar>{mockChildren}</ResponsiveSidebar>);
      
      expect(screen.getByRole('button', { name: /open navigation menu/i })).toBeInTheDocument();
    });

    it('should handle mobile menu toggle', async () => {
      const user = userEvent.setup();
      
      (useResponsive as any).mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
      });

      render(<ResponsiveSidebar>{mockChildren}</ResponsiveSidebar>);
      
      const menuButton = screen.getByRole('button', { name: /open navigation menu/i });
      await user.click(menuButton);
      
      // Check if sheet is opened
      const sheet = screen.getByTestId('sheet');
      expect(sheet).toHaveAttribute('data-open', 'true');
    });

    it('should apply touch-friendly styles on touch devices', () => {
      (useTouchFriendly as any).mockReturnValue({
        touchTargetSize: 'min-h-[44px] min-w-[44px]',
      });

      render(<ResponsiveSidebar>{mockChildren}</ResponsiveSidebar>);
      
      const expandButton = screen.getByRole('button', { name: /expand sidebar/i });
      expect(expandButton).toHaveClass('min-h-[44px]');
    });

    it('should handle keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(<ResponsiveSidebar>{mockChildren}</ResponsiveSidebar>);
      
      const expandButton = screen.getByRole('button', { name: /expand sidebar/i });
      expandButton.focus();
      
      await user.keyboard('{Enter}');
      // Should toggle sidebar state
      expect(expandButton).toHaveAttribute('aria-expanded');
    });
  });

  describe('Responsive Breakpoints', () => {
    it('should detect mobile viewport', () => {
      (useResponsive as any).mockReturnValue({
        windowSize: { width: 375, height: 667 },
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        breakpoint: 'sm',
      });

      const TestComponent = () => {
        const { isMobile, breakpoint } = useResponsive();
        return (
          <div>
            <span data-testid="is-mobile">{isMobile.toString()}</span>
            <span data-testid="breakpoint">{breakpoint}</span>
          </div>
        );
      };

      render(<TestComponent />);
      
      expect(screen.getByTestId('is-mobile')).toHaveTextContent('true');
      expect(screen.getByTestId('breakpoint')).toHaveTextContent('sm');
    });

    it('should detect tablet viewport', () => {
      (useResponsive as any).mockReturnValue({
        windowSize: { width: 768, height: 1024 },
        isMobile: false,
        isTablet: true,
        isDesktop: false,
        breakpoint: 'md',
      });

      const TestComponent = () => {
        const { isTablet, breakpoint } = useResponsive();
        return (
          <div>
            <span data-testid="is-tablet">{isTablet.toString()}</span>
            <span data-testid="breakpoint">{breakpoint}</span>
          </div>
        );
      };

      render(<TestComponent />);
      
      expect(screen.getByTestId('is-tablet')).toHaveTextContent('true');
      expect(screen.getByTestId('breakpoint')).toHaveTextContent('md');
    });

    it('should detect desktop viewport', () => {
      (useResponsive as any).mockReturnValue({
        windowSize: { width: 1440, height: 900 },
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        breakpoint: 'xl',
      });

      const TestComponent = () => {
        const { isDesktop, breakpoint } = useResponsive();
        return (
          <div>
            <span data-testid="is-desktop">{isDesktop.toString()}</span>
            <span data-testid="breakpoint">{breakpoint}</span>
          </div>
        );
      };

      render(<TestComponent />);
      
      expect(screen.getByTestId('is-desktop')).toHaveTextContent('true');
      expect(screen.getByTestId('breakpoint')).toHaveTextContent('xl');
    });
  });

  describe('Touch Device Detection', () => {
    it('should detect touch devices', () => {
      (useTouchFriendly as any).mockReturnValue({
        isTouchDevice: true,
        touchTargetSize: 'min-h-[44px] min-w-[44px]',
        touchSpacing: 'space-y-2',
      });

      const TestComponent = () => {
        const { isTouchDevice, touchTargetSize } = useTouchFriendly();
        return (
          <div>
            <span data-testid="is-touch">{isTouchDevice.toString()}</span>
            <button className={touchTargetSize}>Touch Button</button>
          </div>
        );
      };

      render(<TestComponent />);
      
      expect(screen.getByTestId('is-touch')).toHaveTextContent('true');
      expect(screen.getByRole('button')).toHaveClass('min-h-[44px]');
    });

    it('should apply appropriate spacing for touch devices', () => {
      (useTouchFriendly as any).mockReturnValue({
        isTouchDevice: true,
        touchSpacing: 'space-y-2',
      });

      const TestComponent = () => {
        const { touchSpacing } = useTouchFriendly();
        return (
          <div className={touchSpacing}>
            <button>Button 1</button>
            <button>Button 2</button>
          </div>
        );
      };

      render(<TestComponent />);
      
      const container = screen.getByRole('button', { name: 'Button 1' }).parentElement;
      expect(container).toHaveClass('space-y-2');
    });
  });

  describe('Responsive Layout Integration', () => {
    it('should adapt layout based on screen size', () => {
      const TestLayout = () => {
        const { isMobile, isTablet, isDesktop } = useResponsive();
        
        return (
          <div>
            {isMobile && <div data-testid="mobile-layout">Mobile Layout</div>}
            {isTablet && <div data-testid="tablet-layout">Tablet Layout</div>}
            {isDesktop && <div data-testid="desktop-layout">Desktop Layout</div>}
          </div>
        );
      };

      // Test mobile
      (useResponsive as any).mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
      });

      const { rerender } = render(<TestLayout />);
      expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();

      // Test tablet
      (useResponsive as any).mockReturnValue({
        isMobile: false,
        isTablet: true,
        isDesktop: false,
      });

      rerender(<TestLayout />);
      expect(screen.getByTestId('tablet-layout')).toBeInTheDocument();

      // Test desktop
      (useResponsive as any).mockReturnValue({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
      });

      rerender(<TestLayout />);
      expect(screen.getByTestId('desktop-layout')).toBeInTheDocument();
    });

    it('should handle window resize events', () => {
      const mockAddEventListener = vi.fn();
      const mockRemoveEventListener = vi.fn();
      
      Object.defineProperty(window, 'addEventListener', {
        value: mockAddEventListener,
      });
      Object.defineProperty(window, 'removeEventListener', {
        value: mockRemoveEventListener,
      });

      const TestComponent = () => {
        useResponsive();
        return <div>Test</div>;
      };

      const { unmount } = render(<TestComponent />);
      
      // Should add resize listener
      expect(mockAddEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
      
      unmount();
      
      // Should remove resize listener
      expect(mockRemoveEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    });
  });
});