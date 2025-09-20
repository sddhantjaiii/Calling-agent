
import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import { SkipLinks } from './accessibility/SkipLinks';
import { AriaLiveRegion } from './accessibility/AriaLiveRegion';
import { AccessibilityToolbar } from './accessibility/AccessibilityToolbar';
import { useAriaLiveRegion, useKeyboardNavigation } from '../../hooks/useAccessibility';
import { useResponsive } from '../../hooks/useResponsive';
import { CSRFProvider } from './Security';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AdminLayoutProps {
  children?: React.ReactNode;
  title?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
}

export function AdminLayout({ children, title, breadcrumbs, actions }: AdminLayoutProps) {
  const { message, politeness, announce } = useAriaLiveRegion();
  const { isKeyboardUser } = useKeyboardNavigation();
  const { isMobile } = useResponsive();

  return (
    <CSRFProvider>
      <div className={`min-h-screen bg-gray-50 ${isKeyboardUser ? 'keyboard-user' : ''}`}>
        <SkipLinks />
        <AriaLiveRegion message={message} politeness={politeness} />
        

        
        <AdminSidebar />
        
        <div className="lg:pl-64">
          <AccessibilityToolbar className={isMobile ? 'lg:block hidden' : ''} />
          <AdminHeader 
            title={title} 
            breadcrumbs={breadcrumbs} 
            actions={actions}
            onAnnounce={announce}
          />
          
          <main 
            id="main-content"
            className="py-6 focus:outline-none"
            tabIndex={-1}
            role="main"
            aria-label={title ? `${title} - Admin Panel` : 'Admin Panel Main Content'}
          >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              {children || <Outlet />}
            </div>
          </main>
        </div>
      </div>
    </CSRFProvider>
  );
}

export default AdminLayout;