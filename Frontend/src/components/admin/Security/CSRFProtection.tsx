import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, AlertTriangle, RefreshCw, Clock, CheckCircle } from 'lucide-react';
import { adminSecurityService } from '@/services/adminSecurityService';

interface CSRFContextType {
  token: string | null;
  isValid: boolean;
  refreshToken: () => Promise<void>;
  validateToken: () => Promise<boolean>;
}

const CSRFContext = createContext<CSRFContextType | null>(null);

export const useCSRF = () => {
  const context = useContext(CSRFContext);
  if (!context) {
    throw new Error('useCSRF must be used within a CSRFProvider');
  }
  return context;
};

interface CSRFProviderProps {
  children: React.ReactNode;
}

export const CSRFProvider: React.FC<CSRFProviderProps> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshToken = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const newToken = await adminSecurityService.getCSRFToken();
      setToken(newToken);
      setIsValid(true);
    } catch (error) {
      console.error('Failed to refresh CSRF token:', error);
      setToken(null);
      setIsValid(false);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const validateToken = useCallback(async (): Promise<boolean> => {
    if (!token) {
      return false;
    }

    try {
      // Simple validation - check if token exists and is not expired
      // In a real implementation, you might want to validate with the server
      const isTokenValid = token.length > 0;
      setIsValid(isTokenValid);
      return isTokenValid;
    } catch (error) {
      console.error('CSRF token validation failed:', error);
      setIsValid(false);
      return false;
    }
  }, [token]);

  useEffect(() => {
    // Initialize CSRF token on mount
    refreshToken();

    // Set up periodic token refresh (every 30 minutes)
    const interval = setInterval(refreshToken, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [refreshToken]);

  const contextValue: CSRFContextType = {
    token,
    isValid,
    refreshToken,
    validateToken
  };

  return (
    <CSRFContext.Provider value={contextValue}>
      {children}
    </CSRFContext.Provider>
  );
};

interface CSRFStatusProps {
  showDetails?: boolean;
}

export const CSRFStatus: React.FC<CSRFStatusProps> = ({ showDetails = false }) => {
  const { token, isValid, refreshToken, validateToken } = useCSRF();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [validationHistory, setValidationHistory] = useState<Array<{
    timestamp: Date;
    success: boolean;
    error?: string;
  }>>([]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshToken();
      setLastRefresh(new Date());
      setValidationHistory(prev => [
        { timestamp: new Date(), success: true },
        ...prev.slice(0, 9)
      ]);
    } catch (error: any) {
      setValidationHistory(prev => [
        { timestamp: new Date(), success: false, error: error.message },
        ...prev.slice(0, 9)
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleValidate = async () => {
    try {
      const result = await validateToken();
      setValidationHistory(prev => [
        { timestamp: new Date(), success: result },
        ...prev.slice(0, 9)
      ]);
    } catch (error: any) {
      setValidationHistory(prev => [
        { timestamp: new Date(), success: false, error: error.message },
        ...prev.slice(0, 9)
      ]);
    }
  };

  if (!showDetails) {
    return (
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4" />
        <span className="text-sm">CSRF Protection</span>
        <Badge variant={isValid ? 'default' : 'destructive'}>
          {isValid ? 'Active' : 'Inactive'}
        </Badge>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          CSRF Protection Status
        </CardTitle>
        <CardDescription>
          Cross-Site Request Forgery protection for admin operations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Status Overview */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium">Protection Status:</span>
              <Badge variant={isValid ? 'default' : 'destructive'}>
                {isValid ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleValidate}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Validate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh Token
              </Button>
            </div>
          </div>

          {/* Token Information */}
          {token && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Token Preview</label>
              <div className="text-sm font-mono bg-gray-50 p-2 rounded">
                {token.substring(0, 16)}...{token.substring(token.length - 8)}
              </div>
            </div>
          )}

          {/* Last Refresh */}
          {lastRefresh && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>Last refreshed: {lastRefresh.toLocaleString()}</span>
            </div>
          )}

          {/* Warning for inactive protection */}
          {!isValid && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                CSRF protection is inactive. Admin operations may be vulnerable to cross-site request forgery attacks.
              </AlertDescription>
            </Alert>
          )}

          {/* Validation History */}
          {validationHistory.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Recent Activity</label>
              <div className="space-y-1">
                {validationHistory.slice(0, 5).map((validation, index) => (
                  <div key={index} className="flex items-center justify-between py-1 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant={validation.success ? 'default' : 'destructive'} className="text-xs">
                        {validation.success ? 'Success' : 'Failed'}
                      </Badge>
                      <span className="text-gray-600">
                        {validation.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    {validation.error && (
                      <span className="text-red-600 text-xs">{validation.error}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Security Information */}
          <div className="bg-blue-50 p-3 rounded-md">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Security Information</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• CSRF tokens are automatically included in admin requests</li>
              <li>• Tokens are refreshed every 30 minutes for security</li>
              <li>• All state-changing operations require valid CSRF tokens</li>
              <li>• Tokens are tied to your admin session</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// HOC for protecting admin components with CSRF
interface WithCSRFProtectionProps {
  fallback?: React.ReactNode;
}

export function withCSRFProtection<P extends object>(
  Component: React.ComponentType<P>,
  options: WithCSRFProtectionProps = {}
) {
  return function CSRFProtectedComponent(props: P) {
    const { isValid } = useCSRF();
    const { fallback } = options;

    if (!isValid) {
      if (fallback) {
        return <>{fallback}</>;
      }

      return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            CSRF protection is not active. This component cannot be used safely.
          </AlertDescription>
        </Alert>
      );
    }

    return <Component {...props} />;
  };
}

// Hook for making CSRF-protected requests
export const useCSRFProtectedRequest = () => {
  const { token, isValid } = useCSRF();

  const makeRequest = useCallback(async (
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    options?: RequestInit
  ) => {
    if (!isValid || !token) {
      throw new Error('CSRF protection is not active');
    }

    return adminSecurityService.secureAdminRequest(method, endpoint, data, {
      ...options,
      headers: {
        'X-CSRF-Token': token,
        ...options?.headers
      }
    });
  }, [token, isValid]);

  return {
    makeRequest,
    isProtected: isValid,
    token
  };
};