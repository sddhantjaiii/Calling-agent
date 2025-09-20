import React, { useEffect, useState, useCallback } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Shield, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  Monitor, 
  RefreshCw,
  LogOut,
  Eye,
  EyeOff
} from 'lucide-react';
import { adminSecurityService, AdminSessionInfo } from '@/services/adminSecurityService';
import { maskIpAddress } from '@/utils/dataMasking';

interface SessionValidationProps {
  onSessionInvalid?: () => void;
  showSessionDetails?: boolean;
}

export const EnhancedSessionValidation: React.FC<SessionValidationProps> = ({
  onSessionInvalid,
  showSessionDetails = false
}) => {
  const [sessionInfo, setSessionInfo] = useState<AdminSessionInfo | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastValidation, setLastValidation] = useState<Date | null>(null);
  const [showDetails, setShowDetails] = useState(showSessionDetails);
  const [validationHistory, setValidationHistory] = useState<Array<{
    timestamp: Date;
    success: boolean;
    error?: string;
  }>>([]);

  const validateSession = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setIsValidating(true);
    }
    setError(null);

    try {
      const session = await adminSecurityService.validateAdminSession();
      setSessionInfo(session);
      setLastValidation(new Date());
      
      // Add to validation history
      setValidationHistory(prev => [
        { timestamp: new Date(), success: true },
        ...prev.slice(0, 9) // Keep last 10 validations
      ]);

      if (!session.isValid && onSessionInvalid) {
        onSessionInvalid();
      }
    } catch (error: any) {
      console.error('Session validation failed:', error);
      const errorMessage = error.message || 'Session validation failed';
      setError(errorMessage);
      
      // Add to validation history
      setValidationHistory(prev => [
        { timestamp: new Date(), success: false, error: errorMessage },
        ...prev.slice(0, 9)
      ]);

      if (onSessionInvalid) {
        onSessionInvalid();
      }
    } finally {
      if (showLoading) {
        setIsValidating(false);
      }
    }
  }, [onSessionInvalid]);

  useEffect(() => {
    // Initial validation only
    validateSession();

    // Start session monitoring (handled by adminSecurityService)
    adminSecurityService.startSessionMonitoring();

    return () => {
      // Only stop monitoring when component unmounts
      adminSecurityService.stopSessionMonitoring();
    };
  }, [validateSession]);

  const handleSecureLogout = async () => {
    try {
      await adminSecurityService.secureLogout();
    } catch (error) {
      console.error('Secure logout failed:', error);
      // Force logout even if it fails
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
    }
  };

  const getSessionStatusColor = () => {
    if (!sessionInfo) return 'secondary';
    if (!sessionInfo.isValid) return 'destructive';
    
    const timeUntilExpiry = new Date(sessionInfo.expiresAt).getTime() - Date.now();
    const hoursUntilExpiry = timeUntilExpiry / (1000 * 60 * 60);
    
    if (hoursUntilExpiry < 1) return 'destructive';
    if (hoursUntilExpiry < 2) return 'default';
    return 'default';
  };

  const getTimeUntilExpiry = () => {
    if (!sessionInfo) return 'Unknown';
    
    const timeUntilExpiry = new Date(sessionInfo.expiresAt).getTime() - Date.now();
    if (timeUntilExpiry <= 0) return 'Expired';
    
    const hours = Math.floor(timeUntilExpiry / (1000 * 60 * 60));
    const minutes = Math.floor((timeUntilExpiry % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (error && !sessionInfo) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <span>Session validation failed: {error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => validateSession()}
              disabled={isValidating}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isValidating ? 'animate-spin' : ''}`} />
              Retry
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Session Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <span className="font-medium">Admin Session</span>
          <Badge variant={getSessionStatusColor()}>
            {sessionInfo?.isValid ? 'Active' : 'Invalid'}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showDetails ? 'Hide' : 'Show'} Details
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => validateSession()}
            disabled={isValidating}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isValidating ? 'animate-spin' : ''}`} />
            Validate
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleSecureLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Secure Logout
          </Button>
        </div>
      </div>

      {/* Session Warning */}
      {sessionInfo && !sessionInfo.isValid && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Your admin session is invalid. Please log in again to continue.
          </AlertDescription>
        </Alert>
      )}

      {/* Session Expiry Warning */}
      {sessionInfo && sessionInfo.isValid && (
        (() => {
          const timeUntilExpiry = new Date(sessionInfo.expiresAt).getTime() - Date.now();
          const hoursUntilExpiry = timeUntilExpiry / (1000 * 60 * 60);
          
          if (hoursUntilExpiry < 1) {
            return (
              <Alert variant="destructive">
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  Your admin session expires in {getTimeUntilExpiry()}. Please save your work.
                </AlertDescription>
              </Alert>
            );
          } else if (hoursUntilExpiry < 2) {
            return (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  Your admin session expires in {getTimeUntilExpiry()}.
                </AlertDescription>
              </Alert>
            );
          }
          return null;
        })()
      )}

      {/* Detailed Session Information */}
      {showDetails && sessionInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Session Details</CardTitle>
            <CardDescription>
              Current admin session information and security details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Session ID</label>
                  <div className="text-sm font-mono bg-gray-50 p-2 rounded">
                    {sessionInfo.sessionId.substring(0, 8)}...
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">User ID</label>
                  <div className="text-sm">{sessionInfo.userId}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Role</label>
                  <div className="text-sm">
                    <Badge variant="outline">{sessionInfo.role}</Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <div className="text-sm">
                    <Badge variant={sessionInfo.isValid ? 'default' : 'destructive'}>
                      {sessionInfo.isValid ? 'Valid' : 'Invalid'}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">IP Address</label>
                  <div className="text-sm font-mono bg-gray-50 p-2 rounded flex items-center gap-2">
                    <MapPin className="h-3 w-3" />
                    {maskIpAddress(sessionInfo.ipAddress)}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Last Activity</label>
                  <div className="text-sm flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    {new Date(sessionInfo.lastActivity).toLocaleString()}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Expires At</label>
                  <div className="text-sm flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    {new Date(sessionInfo.expiresAt).toLocaleString()}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Time Remaining</label>
                  <div className="text-sm font-medium">
                    {getTimeUntilExpiry()}
                  </div>
                </div>
              </div>
            </div>

            {/* User Agent */}
            <div className="mt-4">
              <label className="text-sm font-medium text-gray-700">Browser</label>
              <div className="text-sm font-mono bg-gray-50 p-2 rounded flex items-center gap-2">
                <Monitor className="h-3 w-3" />
                {sessionInfo.userAgent.substring(0, 100)}
                {sessionInfo.userAgent.length > 100 && '...'}
              </div>
            </div>

            {/* Last Validation */}
            {lastValidation && (
              <div className="mt-4">
                <label className="text-sm font-medium text-gray-700">Last Validation</label>
                <div className="text-sm text-gray-600">
                  {lastValidation.toLocaleString()}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Validation History */}
      {showDetails && validationHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Validation History</CardTitle>
            <CardDescription>
              Recent session validation attempts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {validationHistory.map((validation, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <div className="flex items-center gap-2">
                    <Badge variant={validation.success ? 'default' : 'destructive'}>
                      {validation.success ? 'Success' : 'Failed'}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      {validation.timestamp.toLocaleString()}
                    </span>
                  </div>
                  {validation.error && (
                    <span className="text-sm text-red-600">{validation.error}</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};