import React from 'react';
import { useResponsiveSidebar, useTouchFriendly } from '../../../hooks/useResponsive';
import { Button } from '../../ui/button';
import { Sheet, SheetContent, SheetTrigger } from '../../ui/sheet';
import { Menu, X } from 'lucide-react';
import { useFocusTrap } from '../../../hooks/useAccessibility';

interface ResponsiveSidebarProps {
  children: React.ReactNode;
  className?: string;
}

export const ResponsiveSidebar: React.FC<ResponsiveSidebarProps> = ({
  children,
  className = '',
}) => {
  const {
    isCollapsed,
    isMobileMenuOpen,
    toggleSidebar,
    closeMobileMenu,
    shouldShowOverlay,
  } = useResponsiveSidebar();
  const { isTouchDevice, touchTargetSize } = useTouchFriendly();
  const focusTrapRef = useFocusTrap(isMobileMenuOpen);

  // Mobile sidebar (Sheet)
  const MobileSidebar = () => (
    <Sheet open={isMobileMenuOpen} onOpenChange={closeMobileMenu}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className={`md:hidden ${touchTargetSize}`}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-64 p-0"
        ref={focusTrapRef}
        aria-label="Navigation menu"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Admin Panel</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={closeMobileMenu}
            className={touchTargetSize}
            aria-label="Close navigation menu"
            data-close-modal
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="p-4" role="navigation" aria-label="Admin navigation">
          {children}
        </nav>
      </SheetContent>
    </Sheet>
  );

  // Desktop sidebar
  const DesktopSidebar = () => (
    <aside
      className={`hidden md:flex flex-col bg-white border-r transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      } ${className}`}
      aria-label="Admin navigation"
    >
      <div className="flex items-center justify-between p-4 border-b">
        {!isCollapsed && <h2 className="text-lg font-semibold">Admin Panel</h2>}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className={touchTargetSize}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!isCollapsed}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>
      <nav className="flex-1 p-4 overflow-y-auto" role="navigation">
        {children}
      </nav>
    </aside>
  );

  return (
    <>
      <MobileSidebar />
      <DesktopSidebar />
      
      {/* Mobile overlay */}
      {shouldShowOverlay && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}
    </>
  );
};

export default ResponsiveSidebar;