import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { adminApiService } from '@/services/adminApiService';
import type { AdminUser, AdminPermissions, AdminContextType } from '@/types/admin';

const AdminContext = createContext<AdminContextType | undefined>(undefined);

// Export context for testing
export { AdminContext };

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [permissions, setPermissions] = useState<AdminPermissions>({
    canViewUsers: false,
    canEditUsers: false,
    canManageCredits: false,
    canViewAgents: false,
    canManageAgents: false,
    canViewAuditLogs: false,
    canManageSystem: false,
    canManageAPIKeys: false,
    canManageFeatureFlags: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate permissions based on user role
  const calculatePermissions = (userRole: string): AdminPermissions => {
    const isAdmin = userRole === 'admin' || userRole === 'super_admin';
    const isSuperAdmin = userRole === 'super_admin';

    return {
      canViewUsers: isAdmin,
      canEditUsers: isAdmin,
      canManageCredits: isAdmin,
      canViewAgents: isAdmin,
      canManageAgents: isAdmin,
      canViewAuditLogs: isAdmin,
      canManageSystem: isSuperAdmin,
      canManageAPIKeys: isSuperAdmin,
      canManageFeatureFlags: isSuperAdmin,
    };
  };

  // Check if user has specific permission
  const hasPermission = (permission: keyof AdminPermissions): boolean => {
    return permissions[permission];
  };

  // Check if user has specific role
  const hasRole = (role: 'admin' | 'super_admin'): boolean => {
    if (!user) return false;
    if (role === 'admin') {
      return user.role === 'admin' || user.role === 'super_admin';
    }
    return user.role === 'super_admin';
  };

  // Refresh admin data
  const refreshAdminData = async (): Promise<void> => {
    if (!user || !isAuthenticated) {
      setAdminUser(null);
      setPermissions(calculatePermissions(''));
      return;
    }

    // Check if user has admin role
    const isAdmin = user.role === 'admin' || user.role === 'super_admin';
    if (!isAdmin) {
      setAdminUser(null);
      setPermissions(calculatePermissions(''));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Validate admin access and get admin profile
      const [accessResponse, profileResponse] = await Promise.all([
        adminApiService.validateAdminAccess(),
        adminApiService.getAdminProfile(),
      ]);

      if (accessResponse.data?.hasAccess && profileResponse.data) {
        setAdminUser(profileResponse.data);
        setPermissions(calculatePermissions(user.role));
      } else {
        setError('Admin access denied');
        setAdminUser(null);
        setPermissions(calculatePermissions(''));
      }
    } catch (err) {
      console.error('Failed to refresh admin data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load admin data');
      setAdminUser(null);
      setPermissions(calculatePermissions(''));
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize admin context when user changes
  useEffect(() => {
    if (isAuthenticated && user) {
      const isAdmin = user.role === 'admin' || user.role === 'super_admin';
      if (isAdmin) {
        refreshAdminData();
      } else {
        setAdminUser(null);
        setPermissions(calculatePermissions(''));
      }
    } else {
      setAdminUser(null);
      setPermissions(calculatePermissions(''));
    }
  }, [user, isAuthenticated]);

  const value: AdminContextType = {
    user: adminUser,
    permissions,
    isLoading,
    error,
    refreshAdminData,
    hasPermission,
    hasRole,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}

export default AdminProvider;