import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

interface DataAccessSecurityOptions {
  onUnauthorizedAccess?: () => void;
  onDataIntegrityViolation?: (details: string) => void;
  logSecurityEvents?: boolean;
}

/**
 * Hook that provides centralized security validation and error handling
 * for data access operations across the application
 */
export const useDataAccessSecurity = (options: DataAccessSecurityOptions = {}) => {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();

  const {
    onUnauthorizedAccess,
    onDataIntegrityViolation,
    logSecurityEvents = true,
  } = options;

  // Log security events for monitoring
  const logSecurityEvent = useCallback((
    eventType: 'unauthorized_access' | 'data_integrity_violation' | 'agent_ownership_violation',
    details: string,
    additionalData?: Record<string, any>
  ) => {
    if (!logSecurityEvents) return;

    const securityEvent = {
      type: eventType,
      details,
      userId: user?.id,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      ...additionalData,
    };

    console.error('🚨 SECURITY EVENT:', securityEvent);

    // In a production environment, you would send this to your security monitoring service
    // Example: securityMonitoringService.logEvent(securityEvent);
  }, [user?.id, logSecurityEvents]);

  // Validate user authentication
  const validateUserAuthentication = useCallback((): void => {
    if (!user) {
      logSecurityEvent('unauthorized_access', 'User not authenticated');
      
      if (onUnauthorizedAccess) {
        onUnauthorizedAccess();
      } else {
        logout();
      }
      
      throw new Error('User must be authenticated to access this data');
    }
  }, [user, logout, onUnauthorizedAccess, logSecurityEvent]);

  // Validate data belongs to current user
  const validateDataOwnership = useCallback((
    data: any,
    dataType: string,
    expectedUserId?: string
  ): void => {
    validateUserAuthentication();

    const userIdToCheck = expectedUserId || user!.id;

    // Check single object
    if (data && typeof data === 'object' && data.user_id) {
      if (data.user_id !== userIdToCheck) {
        const details = `${dataType} data belongs to user ${data.user_id}, not ${userIdToCheck}`;
        logSecurityEvent('data_integrity_violation', details, { dataType, data });
        
        if (onDataIntegrityViolation) {
          onDataIntegrityViolation(details);
        }
        
        throw new Error(`Data integrity violation: ${dataType} belongs to another user`);
      }
    }

    // Check array of objects
    if (Array.isArray(data)) {
      const invalidItems = data.filter(item => 
        item && typeof item === 'object' && item.user_id && item.user_id !== userIdToCheck
      );
      
      if (invalidItems.length > 0) {
        const details = `${dataType} contains ${invalidItems.length} items belonging to other users`;
        logSecurityEvent('data_integrity_violation', details, { 
          dataType, 
          invalidItemCount: invalidItems.length,
          invalidUserIds: [...new Set(invalidItems.map(item => item.user_id))]
        });
        
        if (onDataIntegrityViolation) {
          onDataIntegrityViolation(details);
        }
        
        throw new Error(`Data integrity violation: ${dataType} contains data from other users`);
      }
    }

    // Check nested objects
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      Object.keys(data).forEach(key => {
        const value = data[key];
        if (Array.isArray(value)) {
          const invalidItems = value.filter(item => 
            item && typeof item === 'object' && item.user_id && item.user_id !== userIdToCheck
          );
          
          if (invalidItems.length > 0) {
            const details = `${dataType}.${key} contains ${invalidItems.length} items belonging to other users`;
            logSecurityEvent('data_integrity_violation', details, { 
              dataType: `${dataType}.${key}`, 
              invalidItemCount: invalidItems.length 
            });
            
            if (onDataIntegrityViolation) {
              onDataIntegrityViolation(details);
            }
            
            throw new Error(`Data integrity violation: ${dataType}.${key} contains data from other users`);
          }
        }
      });
    }
  }, [user, validateUserAuthentication, onDataIntegrityViolation, logSecurityEvent]);

  // Validate agent ownership
  const validateAgentOwnership = useCallback(async (
    agentId: string,
    userAgents?: any[]
  ): Promise<void> => {
    validateUserAuthentication();

    if (!agentId) return;

    // If agents list is provided, use it for validation
    if (userAgents) {
      const agentExists = userAgents.some(agent => agent.id === agentId);
      if (!agentExists) {
        const details = `Agent ${agentId} not found in user's agent list`;
        logSecurityEvent('agent_ownership_violation', details, { agentId });
        throw new Error('Agent not found or access denied');
      }
      return;
    }

    // Otherwise, we'll let the API service handle the validation
    // This is a fallback for cases where we don't have the agents list readily available
  }, [validateUserAuthentication, logSecurityEvent]);

  // Clear user-specific cache data on security violations
  const clearUserCache = useCallback(() => {
    if (user?.id) {
      // Clear all user-specific queries
      queryClient.removeQueries({ 
        predicate: (query) => {
          const queryKey = query.queryKey;
          return Array.isArray(queryKey) && queryKey.some(key => 
            typeof key === 'string' && key.includes(user.id)
          );
        }
      });
    }
  }, [user?.id, queryClient]);

  // Handle security violations
  const handleSecurityViolation = useCallback((
    violationType: 'unauthorized' | 'data_integrity' | 'agent_ownership',
    details: string
  ) => {
    // Clear potentially compromised cache data
    clearUserCache();

    // Log the violation
    logSecurityEvent(
      violationType === 'unauthorized' ? 'unauthorized_access' :
      violationType === 'data_integrity' ? 'data_integrity_violation' :
      'agent_ownership_violation',
      details
    );

    // For severe violations, force logout
    if (violationType === 'unauthorized' || violationType === 'data_integrity') {
      logout();
    }
  }, [clearUserCache, logSecurityEvent, logout]);

  return {
    validateUserAuthentication,
    validateDataOwnership,
    validateAgentOwnership,
    handleSecurityViolation,
    clearUserCache,
    logSecurityEvent,
    isAuthenticated: !!user,
    currentUserId: user?.id,
  };
};

export default useDataAccessSecurity;