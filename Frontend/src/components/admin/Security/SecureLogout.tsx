import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  LogOut, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Trash2,
  Database,
  Globe,
  Monitor
} from 'lucide-react';
import { adminSecurityService } from '@/services/adminSecurityService';
import { AdminConfirmationDialog } from './AdminConfirmationDialog';

interface LogoutStep {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  error?: string;
}

interface SecureLogoutProps {
  onLogoutComplete?: () => void;
  showProgress?: boolean;
  requireConfirmation?: boolean;
}

export const SecureLogout: React.FC<SecureLogoutProps> = ({
  onLogoutComplete,
  showProgress = false,
  requireConfirmation = true
}) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [logoutSteps, setLogoutSteps] = useState<LogoutStep[]>([
    {
      id: 'audit-log',
      name: 'Log Logout Action',
      description: 'Recording logout in audit trail',
      icon: Shield,
      status: 'pending'
    },
    {
      id: 'session-invalidate',
      name: 'Invalidate Session',
      description: 'Invalidating server-side session',
      icon: Database,
      status: 'pending'
    },
    {
      id: 'local-storage',
      name: 'Clear Local Storage',
      description: 'Removing local authentication data',
      icon: Monitor,
      status: 'pending'
    },
    {
      id: 'session-storage',
      name: 'Clear Session Storage',
      description: 'Removing session-specific data',
      icon: Monitor,
      status: 'pending'
    },
    {
      id: 'cache-clear',
      name: 'Clear Browser Cache',
      description: 'Removing cached admin data',
      icon: Trash2,
      status: 'pending'
    },
    {
      id: 'redirect',
      name: 'Redirect to Login',
      description: 'Redirecting to login page',
      icon: Globe,
      status: 'pending'
    }
  ]);

  const updateStepStatus = (stepId: string, status: LogoutStep['status'], error?: string) => {
    setLogoutSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status, error }
        : step
    ));
  };

  const performSecureLogout = async () => {
    setIsLoggingOut(true);

    try {
      // Step 1: Log logout action
      updateStepStatus('audit-log', 'in-progress');
      try {
        await adminSecurityService.logAdminAction('secure_logout', 'session');
        updateStepStatus('audit-log', 'completed');
      } catch (error: any) {
        console.warn('Failed to log logout action:', error);
        updateStepStatus('audit-log', 'failed', error.message);
        // Continue with logout even if logging fails
      }

      // Step 2: Invalidate server session
      updateStepStatus('session-invalidate', 'in-progress');
      try {
        await adminSecurityService.secureAdminRequest('POST', '/admin/security/logout');
        updateStepStatus('session-invalidate', 'completed');
      } catch (error: any) {
        console.warn('Failed to invalidate server session:', error);
        updateStepStatus('session-invalidate', 'failed', error.message);
        // Continue with logout even if server invalidation fails
      }

      // Step 3: Clear local storage
      updateStepStatus('local-storage', 'in-progress');
      try {
        localStorage.clear();
        updateStepStatus('local-storage', 'completed');
      } catch (error: any) {
        console.error('Failed to clear local storage:', error);
        updateStepStatus('local-storage', 'failed', error.message);
      }

      // Step 4: Clear session storage
      updateStepStatus('session-storage', 'in-progress');
      try {
        sessionStorage.clear();
        updateStepStatus('session-storage', 'completed');
      } catch (error: any) {
        console.error('Failed to clear session storage:', error);
        updateStepStatus('session-storage', 'failed', error.message);
      }

      // Step 5: Clear browser cache
      updateStepStatus('cache-clear', 'in-progress');
      try {
        if (window.caches) {
          const cacheNames = await window.caches.keys();
          await Promise.all(
            cacheNames.map(cacheName => window.caches.delete(cacheName))
          );
        }
        updateStepStatus('cache-clear', 'completed');
      } catch (error: any) {
        console.warn('Failed to clear browser cache:', error);
        updateStepStatus('cache-clear', 'failed', error.message);
        // Continue even if cache clearing fails
      }

      // Step 6: Redirect to login
      updateStepStatus('redirect', 'in-progress');
      
      // Stop session monitoring
      adminSecurityService.stopSessionMonitoring();

      // Small delay to show completion
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      updateStepStatus('redirect', 'completed');

      // Call completion callback if provided
      if (onLogoutComplete) {
        onLogoutComplete();
      } else {
        // Default redirect
        window.location.href = '/login';
      }

    } catch (error: any) {
      console.error('Secure logout failed:', error);
      
      // Force logout even if secure logout fails
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleLogoutClick = () => {
    if (requireConfirmation) {
      setShowConfirmation(true);
    } else {
      performSecureLogout();
    }
  };

  const getCompletedSteps = () => {
    return logoutSteps.filter(step => step.status === 'completed').length;
  };

  const getProgressPercentage = () => {
    return (getCompletedSteps() / logoutSteps.length) * 100;
  };

  const getStepIcon = (step: LogoutStep) => {
    const IconComponent = step.icon;
    
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'in-progress':
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      default:
        return <IconComponent className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStepStatusBadge = (status: LogoutStep['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'in-progress':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">In Progress</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <>
      <div className="space-y-4">
        {/* Logout Button */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Secure Admin Logout</h3>
            <p className="text-sm text-muted-foreground">
              Safely terminate your admin session with complete cleanup
            </p>
          </div>
          <Button
            variant="destructive"
            onClick={handleLogoutClick}
            disabled={isLoggingOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {isLoggingOut ? 'Logging Out...' : 'Secure Logout'}
          </Button>
        </div>

        {/* Progress Display */}
        {showProgress && isLoggingOut && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Logout Progress</CardTitle>
              <CardDescription>
                Securely terminating your admin session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{getCompletedSteps()} of {logoutSteps.length} steps completed</span>
                  </div>
                  <Progress value={getProgressPercentage()} className="w-full" />
                </div>

                {/* Step Details */}
                <div className="space-y-3">
                  {logoutSteps.map(step => (
                    <div key={step.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStepIcon(step)}
                        <div>
                          <div className="font-medium text-sm">{step.name}</div>
                          <div className="text-xs text-muted-foreground">{step.description}</div>
                          {step.error && (
                            <div className="text-xs text-red-600 mt-1">{step.error}</div>
                          )}
                        </div>
                      </div>
                      {getStepStatusBadge(step.status)}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Security Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Audit trail logging of logout action</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Server-side session invalidation</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Complete local data cleanup</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Browser cache clearing</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Session monitoring termination</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <AdminConfirmationDialog
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={performSecureLogout}
        title="Confirm Secure Logout"
        description="Are you sure you want to securely log out of your admin session? This will terminate your session and clear all local data."
        actionType="sensitive"
        additionalWarnings={[
          'Your current session will be immediately terminated',
          'All unsaved changes will be lost',
          'You will need to log in again to access admin features',
          'This action will be logged in the audit trail'
        ]}
        resourceDetails={{
          type: 'admin_session',
          name: 'Current Admin Session',
          id: 'current'
        }}
      />
    </>
  );
};

// Quick logout button component
interface QuickSecureLogoutProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showText?: boolean;
  onLogoutComplete?: () => void;
}

export const QuickSecureLogout: React.FC<QuickSecureLogoutProps> = ({
  variant = 'destructive',
  size = 'default',
  showText = true,
  onLogoutComplete
}) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleQuickLogout = async () => {
    setIsLoggingOut(true);
    try {
      await adminSecurityService.secureLogout();
      if (onLogoutComplete) {
        onLogoutComplete();
      }
    } catch (error) {
      console.error('Quick logout failed:', error);
      // Force logout even if it fails
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleQuickLogout}
      disabled={isLoggingOut}
    >
      <LogOut className="h-4 w-4" />
      {showText && (
        <span className="ml-2">
          {isLoggingOut ? 'Logging Out...' : 'Logout'}
        </span>
      )}
    </Button>
  );
};