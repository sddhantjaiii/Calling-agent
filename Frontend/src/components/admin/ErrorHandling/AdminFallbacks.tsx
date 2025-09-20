import React from 'react';
import { AlertTriangle, Users, Settings, BarChart3, Shield, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface FallbackProps {
  onRetry?: () => void;
  onNavigateHome?: () => void;
  error?: Error;
  className?: string;
}

// Generic fallback component
export function AdminGenericFallback({ onRetry, onNavigateHome, error, className = '' }: FallbackProps) {
  return (
    <div className={`flex items-center justify-center min-h-[400px] ${className}`}>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>
            This section is temporarily unavailable. Please try again or navigate to another area.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert>
              <AlertDescription className="text-sm">
                {error.message}
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex flex-col gap-2">
            {onRetry && (
              <Button onClick={onRetry} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            )}
            {onNavigateHome && (
              <Button onClick={onNavigateHome} variant="outline" className="w-full">
                <Home className="w-4 h-4 mr-2" />
                Go to Admin Home
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// User Management fallback with limited functionality
export function UserManagementFallback({ onRetry, onNavigateHome, className = '' }: FallbackProps) {
  return (
    <div className={`p-6 ${className}`}>
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Users className="w-6 h-6 text-orange-600" />
            <div>
              <CardTitle className="text-orange-800">User Management Unavailable</CardTitle>
              <CardDescription className="text-orange-700">
                The user management system is currently experiencing issues.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              <strong>Limited Functionality:</strong> You can still access read-only user data through the system reports.
            </AlertDescription>
          </Alert>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button 
              onClick={() => window.location.href = '/admin/reports'} 
              variant="outline"
              className="w-full"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              View User Reports
            </Button>
            
            <Button 
              onClick={() => window.location.href = '/admin/audit-logs'} 
              variant="outline"
              className="w-full"
            >
              <Shield className="w-4 h-4 mr-2" />
              Check Audit Logs
            </Button>
          </div>
          
          <div className="flex gap-2 pt-2">
            {onRetry && (
              <Button onClick={onRetry} size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            )}
            {onNavigateHome && (
              <Button onClick={onNavigateHome} variant="ghost" size="sm">
                <Home className="w-4 h-4 mr-2" />
                Admin Home
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// System Analytics fallback with cached data
export function SystemAnalyticsFallback({ onRetry, onNavigateHome, className = '' }: FallbackProps) {
  // Mock cached data - in real implementation, this would come from local storage or cache
  const cachedData = {
    lastUpdated: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    totalUsers: 1247,
    activeAgents: 89,
    systemUptime: '99.8%'
  };

  return (
    <div className={`p-6 ${className}`}>
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <BarChart3 className="w-6 h-6 text-yellow-600" />
            <div>
              <CardTitle className="text-yellow-800">Analytics Temporarily Unavailable</CardTitle>
              <CardDescription className="text-yellow-700">
                Showing cached data from {cachedData.lastUpdated.toLocaleTimeString()}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              <strong>Note:</strong> This data may be outdated. Real-time analytics will resume once the connection is restored.
            </AlertDescription>
          </Alert>
          
          {/* Cached metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-2xl font-bold text-gray-900">{cachedData.totalUsers}</div>
              <div className="text-sm text-gray-600">Total Users</div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-2xl font-bold text-gray-900">{cachedData.activeAgents}</div>
              <div className="text-sm text-gray-600">Active Agents</div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-2xl font-bold text-gray-900">{cachedData.systemUptime}</div>
              <div className="text-sm text-gray-600">System Uptime</div>
            </div>
          </div>
          
          <div className="flex gap-2 pt-2">
            {onRetry && (
              <Button onClick={onRetry} size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Data
              </Button>
            )}
            <Button 
              onClick={() => window.location.href = '/admin/reports'} 
              variant="outline" 
              size="sm"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              View Detailed Reports
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Configuration fallback with read-only mode
export function ConfigurationFallback({ onRetry, onNavigateHome, className = '' }: FallbackProps) {
  return (
    <div className={`p-6 ${className}`}>
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Settings className="w-6 h-6 text-red-600" />
            <div>
              <CardTitle className="text-red-800">Configuration System Unavailable</CardTitle>
              <CardDescription className="text-red-700">
                System configuration is temporarily in read-only mode for safety.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Safety Mode:</strong> Configuration changes are disabled to prevent system instability. 
              You can still view current settings.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <Button 
              onClick={() => window.location.href = '/admin/system-status'} 
              variant="outline"
              className="w-full"
            >
              <Shield className="w-4 h-4 mr-2" />
              View System Status
            </Button>
            
            <Button 
              onClick={() => window.location.href = '/admin/audit-logs'} 
              variant="outline"
              className="w-full"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Check Recent Changes
            </Button>
          </div>
          
          <div className="flex gap-2 pt-2">
            {onRetry && (
              <Button onClick={onRetry} size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            )}
            {onNavigateHome && (
              <Button onClick={onNavigateHome} variant="ghost" size="sm">
                <Home className="w-4 h-4 mr-2" />
                Admin Home
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Security/Audit fallback
export function SecurityFallback({ onRetry, onNavigateHome, className = '' }: FallbackProps) {
  return (
    <div className={`p-6 ${className}`}>
      <Card className="border-red-300 bg-red-100">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Shield className="w-6 h-6 text-red-700" />
            <div>
              <CardTitle className="text-red-900">Security System Unavailable</CardTitle>
              <CardDescription className="text-red-800">
                Security monitoring is temporarily offline. System is in safe mode.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Security Notice:</strong> All admin actions are being logged locally. 
              Contact system administrator immediately if this is unexpected.
            </AlertDescription>
          </Alert>
          
          <div className="bg-white p-4 rounded border">
            <h4 className="font-medium text-sm mb-2">Emergency Contacts:</h4>
            <div className="text-sm space-y-1">
              <div>Security Team: security@example.com</div>
              <div>System Admin: admin@example.com</div>
              <div>Emergency: +1-555-0123</div>
            </div>
          </div>
          
          <div className="flex gap-2 pt-2">
            {onRetry && (
              <Button onClick={onRetry} size="sm" variant="destructive">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Connection
              </Button>
            )}
            <Button 
              onClick={() => window.open('mailto:security@example.com', '_blank')} 
              variant="outline" 
              size="sm"
            >
              Contact Security
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default {
  AdminGenericFallback,
  UserManagementFallback,
  SystemAnalyticsFallback,
  ConfigurationFallback,
  SecurityFallback
};