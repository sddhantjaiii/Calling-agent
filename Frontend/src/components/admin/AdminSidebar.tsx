import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Users, 
  Bot, 
  BarChart3, 
  Settings, 
  FileText, 
  Shield, 
  Key, 
  Flag,
  MessageSquare,
  AlertTriangle,
  X,
  Menu,
  Phone
} from 'lucide-react';
import { useAdmin } from '@/contexts/AdminContext';
import { useFocusTrap } from '../../hooks/useAccessibility';
import { useResponsive, useTouchFriendly } from '../../hooks/useResponsive';
import type { AdminMenuItem } from '@/types/admin';

const adminMenuItems: AdminMenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: BarChart3,
    href: '/admin',
  },
  {
    id: 'users',
    label: 'User Management',
    icon: Users,
    href: '/admin/users',
  },
  {
    id: 'agents',
    label: 'Agent Management',
    icon: Bot,
    href: '/admin/agents',
    children: [
      {
        id: 'create-agent',
        label: 'Create Agent',
        icon: Bot,
        href: '/admin/agents/create',
      },
      {
        id: 'assign-agent',
        label: 'Assign Agent',
        icon: Users,
        href: '/admin/agents/assign',
      },
      {
        id: 'manage-agents',
        label: 'Manage Agents',
        icon: Settings,
        href: '/admin/agents/manage',
      },
    ],
  },
  {
    id: 'phone-numbers',
    label: 'Phone Numbers',
    icon: Phone,
    href: '/admin/phone-numbers',
  },
  {
    id: 'analytics',
    label: 'System Analytics',
    icon: BarChart3,
    href: '/admin/analytics',
  },
  {
    id: 'audit',
    label: 'Audit Logs',
    icon: FileText,
    href: '/admin/audit',
  },
  {
    id: 'communication',
    label: 'Communication',
    icon: MessageSquare,
    href: '/admin/communication',
  },
  {
    id: 'configuration',
    label: 'Configuration',
    icon: Settings,
    href: '/admin/config',
    requiredRole: 'super_admin',
    children: [
      {
        id: 'api-keys',
        label: 'API Keys',
        icon: Key,
        href: '/admin/config/api-keys',
        requiredRole: 'super_admin',
      },
      {
        id: 'feature-flags',
        label: 'Feature Flags',
        icon: Flag,
        href: '/admin/config/feature-flags',
        requiredRole: 'super_admin',
      },
      {
        id: 'system',
        label: 'System Settings',
        icon: Settings,
        href: '/admin/config/system',
        requiredRole: 'super_admin',
      },
    ],
  },
];

export function AdminSidebar() {
  const location = useLocation();
  const { hasRole } = useAdmin();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isMobile } = useResponsive();
  const { touchTargetSize } = useTouchFriendly();
  const focusTrapRef = useFocusTrap(isMobileMenuOpen);

  // Filter menu items based on user role
  const filterMenuItems = (items: AdminMenuItem[]): AdminMenuItem[] => {
    return items.filter(item => {
      if (item.requiredRole && !hasRole(item.requiredRole)) {
        return false;
      }
      if (item.children) {
        item.children = filterMenuItems(item.children);
      }
      return true;
    });
  };

  const filteredMenuItems = filterMenuItems(adminMenuItems);

  const isActiveRoute = (href: string): boolean => {
    if (href === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(href);
  };

  const renderMenuItem = (item: AdminMenuItem, isChild = false) => {
    const isActive = isActiveRoute(item.href);
    const Icon = item.icon;

    return (
      <div key={item.id}>
        <Link
          to={item.href}
          className={`
            group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors
            ${isChild ? 'pl-11' : ''}
            ${touchTargetSize}
            ${
              isActive
                ? 'bg-teal-100 text-teal-900'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }
            focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2
          `}
          onClick={() => setIsMobileMenuOpen(false)}
          aria-current={isActive ? 'page' : undefined}
          aria-label={`${item.label}${item.badge ? ` (${item.badge} notifications)` : ''}`}
        >
          <Icon
            className={`
              mr-3 flex-shrink-0 h-5 w-5
              ${isActive ? 'text-teal-500' : 'text-gray-400 group-hover:text-gray-500'}
            `}
            aria-hidden="true"
          />
          {item.label}
          {item.badge && (
            <span 
              className="ml-auto inline-block py-0.5 px-2 text-xs font-medium rounded-full bg-red-100 text-red-800"
              aria-label={`${item.badge} notifications`}
            >
              {item.badge}
            </span>
          )}
        </Link>
        {item.children && (
          <div className="mt-1 space-y-1" role="group" aria-label={`${item.label} submenu`}>
            {item.children.map(child => renderMenuItem(child, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between bg-white px-4 py-2 border-b border-gray-200">
          <h1 className="text-lg font-semibold text-gray-900">Admin Panel</h1>
          <button
            type="button"
            className={`inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500 ${touchTargetSize}`}
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={isMobileMenuOpen}
          >
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div 
            className="fixed inset-0 bg-gray-600 bg-opacity-75" 
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div 
            className="relative flex-1 flex flex-col max-w-xs w-full bg-white"
            ref={focusTrapRef as React.RefObject<HTMLDivElement>}
          >
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className={`ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white ${touchTargetSize}`}
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                data-close-modal
              >
                <X className="h-6 w-6 text-white" aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center px-4">
                <Shield className="h-8 w-8 text-teal-600" aria-hidden="true" />
                <span className="ml-2 text-xl font-bold text-gray-900">Admin Panel</span>
              </div>
              <nav 
                className="mt-5 px-2 space-y-1" 
                role="navigation" 
                aria-label="Admin navigation"
                id="main-navigation"
              >
                {filteredMenuItems.map(item => renderMenuItem(item))}
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside 
        className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0"
        aria-label="Admin navigation"
      >
        <div className="flex-1 flex flex-col min-h-0 bg-white border-r border-gray-200">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <Shield className="h-8 w-8 text-teal-600" aria-hidden="true" />
              <span className="ml-2 text-xl font-bold text-gray-900">Admin Panel</span>
            </div>
            <nav 
              className="mt-5 flex-1 px-2 space-y-1" 
              role="navigation" 
              aria-label="Admin navigation"
              id="main-navigation"
            >
              {filteredMenuItems.map(item => renderMenuItem(item))}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-teal-600" aria-hidden="true" />
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">Admin Mode</p>
                <p className="text-xs text-gray-500">Elevated privileges</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default AdminSidebar;