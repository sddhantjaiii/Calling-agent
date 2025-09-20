import React, { createContext, useContext, useState, useEffect } from 'react';
import { adminApiService } from '../../../services/adminApiService';

interface FeatureFlag {
  id: string;
  name: string;
  enabled: boolean;
  rolloutPercentage: number;
  userGroups: string[];
  description: string;
}

interface AdminFeatureFlagsContextType {
  flags: Record<string, boolean>;
  isFeatureEnabled: (flagId: string) => boolean;
  refreshFlags: () => Promise<void>;
  loading: boolean;
}

const AdminFeatureFlagsContext = createContext<AdminFeatureFlagsContextType | undefined>(undefined);

export const useAdminFeatureFlags = () => {
  const context = useContext(AdminFeatureFlagsContext);
  if (!context) {
    throw new Error('useAdminFeatureFlags must be used within AdminFeatureFlagsProvider');
  }
  return context;
};

interface AdminFeatureFlagsProviderProps {
  children: React.ReactNode;
  userId?: string;
  userRole?: string;
}

export const AdminFeatureFlagsProvider: React.FC<AdminFeatureFlagsProviderProps> = ({
  children,
  userId,
  userRole
}) => {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const refreshFlags = async () => {
    try {
      setLoading(true);
      const response = await adminApiService.getFeatureFlags();
      const evaluatedFlags: Record<string, boolean> = {};

      response.forEach((flag: FeatureFlag) => {
        evaluatedFlags[flag.id] = evaluateFlag(flag, userId, userRole);
      });

      setFlags(evaluatedFlags);
    } catch (error) {
      console.error('Failed to fetch feature flags:', error);
      // Set default flags for admin panel rollout
      setFlags({
        'admin-panel-enabled': true,
        'admin-user-management': true,
        'admin-agent-monitoring': true,
        'admin-system-analytics': true,
        'admin-configuration': userRole === 'super_admin',
        'admin-audit-logs': true,
        'admin-advanced-features': userRole === 'super_admin',
        'admin-real-time-updates': true,
        'admin-data-export': true,
        'admin-help-system': true
      });
    } finally {
      setLoading(false);
    }
  };

  const evaluateFlag = (flag: FeatureFlag, userId?: string, userRole?: string): boolean => {
    // If flag is disabled globally, return false
    if (!flag.enabled) {
      return false;
    }

    // Check user group restrictions
    if (flag.userGroups.length > 0 && userRole) {
      if (!flag.userGroups.includes(userRole)) {
        return false;
      }
    }

    // Check rollout percentage
    if (flag.rolloutPercentage < 100 && userId) {
      const hash = simpleHash(userId + flag.id);
      const userPercentile = hash % 100;
      return userPercentile < flag.rolloutPercentage;
    }

    return true;
  };

  const simpleHash = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  };

  const isFeatureEnabled = (flagId: string): boolean => {
    return flags[flagId] || false;
  };

  useEffect(() => {
    refreshFlags();
  }, [userId, userRole]);

  return (
    <AdminFeatureFlagsContext.Provider value={{
      flags,
      isFeatureEnabled,
      refreshFlags,
      loading
    }}>
      {children}
    </AdminFeatureFlagsContext.Provider>
  );
};

// Higher-order component for feature flag protection
export const withFeatureFlag = <P extends object>(
  Component: React.ComponentType<P>,
  flagId: string,
  fallback?: React.ComponentType<P>
) => {
  return (props: P) => {
    const { isFeatureEnabled } = useAdminFeatureFlags();
    
    if (!isFeatureEnabled(flagId)) {
      if (fallback) {
        const FallbackComponent = fallback;
        return <FallbackComponent {...props} />;
      }
      return null;
    }
    
    return <Component {...props} />;
  };
};

// Component for conditional rendering based on feature flags
interface FeatureGateProps {
  flagId: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({
  flagId,
  children,
  fallback = null
}) => {
  const { isFeatureEnabled } = useAdminFeatureFlags();
  
  return isFeatureEnabled(flagId) ? <>{children}</> : <>{fallback}</>;
};

export default AdminFeatureFlagsProvider;