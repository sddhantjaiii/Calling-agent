import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, User, LogOut, Home, ChevronRight, Wifi, WifiOff, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import { useAdminWebSocket } from '@/hooks/useAdminWebSocket';
import { AdminNotificationCenter } from './RealTime/AdminNotificationCenter';
import { QuickSecureLogout, CSRFStatus } from './Security';
import { Badge } from '../ui/badge';
import type { BreadcrumbItem } from './AdminLayout';

interface AdminHeaderProps {
  title?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  onAnnounce?: (message: string, level?: 'polite' | 'assertive') => void;
}

export function AdminHeader({ title, breadcrumbs, actions, onAnnounce }: AdminHeaderProps) {
  const { user, logout } = useAuth();
  const { hasRole } = useAdmin();
  const {
    isConnected,
    connectionState,
    unreadNotificationCount,
    criticalNotificationCount
  } = useAdminWebSocket();
  
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header 
      className="bg-white shadow-sm border-b border-gray-200"
      role="banner"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Left side - Breadcrumb, title, or back button */}
          <div className="flex items-center space-x-4">
            {breadcrumbs && breadcrumbs.length > 0 ? (
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="flex items-center space-x-2">
                  {breadcrumbs.map((item, index) => (
                    <li key={index} className="flex items-center">
                      {index > 0 && (
                        <ChevronRight className="h-4 w-4 text-gray-400 mx-2" />
                      )}
                      {item.href ? (
                        <Link
                          to={item.href}
                          className="text-sm font-medium text-gray-500 hover:text-gray-700"
                        >
                          {item.label}
                        </Link>
                      ) : (
                        <span className="text-sm font-medium text-gray-900">
                          {item.label}
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>
            ) : title ? (
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            ) : (
              <Link
                to="/dashboard"
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
              >
                <Home className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            )}
            
            {/* Actions area */}
            {actions && (
              <div className="ml-4">
                {actions}
              </div>
            )}
          </div>

          {/* Right side - User menu */}
          <div className="flex items-center space-x-4">
            {/* Security Status */}
            <div className="hidden lg:block">
              <CSRFStatus />
            </div>

            {/* Real-time connection status */}
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <span className={`text-xs font-medium ${
                isConnected ? 'text-green-600' : 'text-red-600'
              }`}>
                {connectionState}
              </span>
            </div>

            {/* Notifications */}
            <button
              type="button"
              onClick={() => {
                setShowNotifications(true);
                onAnnounce?.(`Opening notifications. ${unreadNotificationCount} unread notifications.`);
              }}
              className="relative bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label={`View notifications. ${unreadNotificationCount} unread notifications.`}
              aria-describedby={unreadNotificationCount > 0 ? 'notification-count' : undefined}
            >
              <Bell className="h-6 w-6" />
              {unreadNotificationCount > 0 && (
                <Badge
                  id="notification-count"
                  variant={criticalNotificationCount > 0 ? 'destructive' : 'default'}
                  className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                  aria-label={`${unreadNotificationCount} unread notifications`}
                >
                  {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                </Badge>
              )}
            </button>

            {/* User info */}
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-teal-600" />
                </div>
              </div>
              <div className="min-w-0 flex-1 hidden sm:block">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.name || user?.email}
                </p>
                <p className="text-xs text-gray-500">
                  {hasRole('super_admin') ? 'Super Admin' : 'Admin'}
                </p>
              </div>
            </div>

            {/* Secure Logout button */}
            <QuickSecureLogout
              variant="destructive"
              size="default"
              showText={false}
              onLogoutComplete={() => {
                onAnnounce?.('Secure logout completed', 'assertive');
              }}
            />
          </div>
        </div>
      </div>

      {/* Notification Center */}
      <AdminNotificationCenter
        isOpen={showNotifications}
        onClose={() => {
          setShowNotifications(false);
          onAnnounce?.('Notifications closed');
        }}
      />
    </header>
  );
}

export default AdminHeader;