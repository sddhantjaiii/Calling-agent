import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  AlertTriangle, 
  Eye, 
  MapPin, 
  Clock, 
  User, 
  Activity,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { adminSecurityService, AdminActionLog } from '@/services/adminSecurityService';
import { maskIpAddress } from '@/utils/dataMasking';

interface AccessLogEntry extends AdminActionLog {
  locationInfo?: {
    country: string;
    city: string;
    region: string;
  };
  riskLevel: 'low' | 'medium' | 'high';
  isNewLocation: boolean;
}

interface SuspiciousActivityAlert {
  id: string;
  type: 'multiple_failed_logins' | 'unusual_location' | 'rapid_actions' | 'privilege_escalation';
  message: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: Date;
  adminUserId: string;
  adminUserEmail: string;
  ipAddress: string;
  details: Record<string, any>;
}

export const AccessMonitoring: React.FC = () => {
  const [accessLogs, setAccessLogs] = useState<AccessLogEntry[]>([]);
  const [suspiciousAlerts, setSuspiciousAlerts] = useState<SuspiciousActivityAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    adminUserId: '',
    ipAddress: '',
    startDate: '',
    endDate: '',
    riskLevel: '',
    action: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadAccessLogs();
    loadSuspiciousActivity();
    
    // Set up real-time monitoring
    const interval = setInterval(() => {
      loadSuspiciousActivity();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const assessRiskLevel = (log: AdminActionLog): 'low' | 'medium' | 'high' => {
    // Risk assessment logic
    const sensitiveActions = ['delete_user', 'modify_permissions', 'system_config'];
    const suspiciousPatterns = ['rapid_actions', 'unusual_location', 'failed_login'];
    
    if (sensitiveActions.some(action => log.action.includes(action))) {
      return 'high';
    }
    
    if (suspiciousPatterns.some(pattern => log.details?.pattern === pattern)) {
      return 'medium';
    }
    
    return 'low';
  };

  const loadAccessLogs = async () => {
    try {
      setIsLoading(true);
      const filterParams = {
        limit: 100,
        adminUserId: filters.adminUserId || undefined,
        ipAddress: filters.ipAddress || undefined,
        startDate: filters.startDate ? new Date(filters.startDate) : undefined,
        endDate: filters.endDate ? new Date(filters.endDate) : undefined,
      };
      
      const logs = await adminSecurityService.getAccessLogs(filterParams);
      
      // Enhance logs with risk assessment
      const enhancedLogs = logs.map(log => ({
        ...log,
        riskLevel: assessRiskLevel(log),
        isNewLocation: log.details?.isNewLocation || false,
        locationInfo: log.details?.locationInfo
      }));
      
      setAccessLogs(enhancedLogs);
    } catch (error: any) {
      console.error('Failed to load access logs:', error);
      setError(error.message || 'Failed to load access logs');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSuspiciousActivity = async () => {
    try {
      const result = await adminSecurityService.checkSuspiciousActivity();
      setSuspiciousAlerts(result.alerts.map(alert => ({
        id: Math.random().toString(36).substr(2, 9),
        type: alert.type as any,
        message: alert.message,
        severity: alert.severity,
        timestamp: alert.timestamp,
        adminUserId: '',
        adminUserEmail: '',
        ipAddress: '',
        details: {}
      })));
    } catch (error) {
      console.error('Failed to load suspicious activity:', error);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    loadAccessLogs();
  };

  const exportLogs = async () => {
    try {
      const logs = await adminSecurityService.getAccessLogs({
        limit: 1000,
        ...filters
      });
      
      const csvContent = [
        'Timestamp,Admin User,Action,Resource,IP Address,Risk Level,Success',
        ...logs.map(log => 
          `${log.timestamp},${log.adminUserId},${log.action},${log.resource},${maskIpAddress(log.ipAddress)},${assessRiskLevel(log)},${log.success}`
        )
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `admin-access-logs-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export logs:', error);
    }
  };

  const getRiskBadgeColor = (risk: 'low' | 'medium' | 'high') => {
    switch (risk) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getSeverityBadgeColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Access Monitoring</h2>
          <p className="text-muted-foreground">
            Monitor admin access patterns and detect suspicious activity
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportLogs}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadAccessLogs}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Suspicious Activity Alerts */}
      {suspiciousAlerts.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-2">Suspicious Activity Detected</div>
            <div className="space-y-1">
              {suspiciousAlerts.slice(0, 3).map(alert => (
                <div key={alert.id} className="flex items-center gap-2">
                  <Badge variant={getSeverityBadgeColor(alert.severity)}>
                    {alert.severity}
                  </Badge>
                  <span className="text-sm">{alert.message}</span>
                </div>
              ))}
              {suspiciousAlerts.length > 3 && (
                <div className="text-sm text-muted-foreground">
                  +{suspiciousAlerts.length - 3} more alerts
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Filter Access Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="admin-user">Admin User ID</Label>
                <Input
                  id="admin-user"
                  value={filters.adminUserId}
                  onChange={(e) => handleFilterChange('adminUserId', e.target.value)}
                  placeholder="Filter by admin user"
                />
              </div>
              <div>
                <Label htmlFor="ip-address">IP Address</Label>
                <Input
                  id="ip-address"
                  value={filters.ipAddress}
                  onChange={(e) => handleFilterChange('ipAddress', e.target.value)}
                  placeholder="Filter by IP address"
                />
              </div>
              <div>
                <Label htmlFor="action">Action</Label>
                <Input
                  id="action"
                  value={filters.action}
                  onChange={(e) => handleFilterChange('action', e.target.value)}
                  placeholder="Filter by action"
                />
              </div>
              <div>
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={applyFilters} className="w-full">
                  Apply Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Access Logs */}
      <Tabs defaultValue="logs" className="w-full">
        <TabsList>
          <TabsTrigger value="logs">Access Logs</TabsTrigger>
          <TabsTrigger value="alerts">Security Alerts</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Recent Admin Access</CardTitle>
              <CardDescription>
                Detailed log of all admin actions and access patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                  Loading access logs...
                </div>
              ) : error ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {accessLogs.map(log => (
                    <div key={log.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span className="font-medium">{log.adminUserId}</span>
                          <Badge variant={getRiskBadgeColor(log.riskLevel)}>
                            {log.riskLevel} risk
                          </Badge>
                          {log.isNewLocation && (
                            <Badge variant="outline">New Location</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Action:</span> {log.action}
                        </div>
                        <div>
                          <span className="font-medium">Resource:</span> {log.resource}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span className="font-medium">IP:</span> {maskIpAddress(log.ipAddress)}
                        </div>
                      </div>
                      {log.locationInfo && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          Location: {log.locationInfo.city}, {log.locationInfo.region}, {log.locationInfo.country}
                        </div>
                      )}
                    </div>
                  ))}
                  {accessLogs.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No access logs found
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>Security Alerts</CardTitle>
              <CardDescription>
                Suspicious activity and security incidents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {suspiciousAlerts.map(alert => (
                  <div key={alert.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        <Badge variant={getSeverityBadgeColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                        <span className="font-medium">{alert.type.replace('_', ' ')}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(alert.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <p className="text-sm">{alert.message}</p>
                  </div>
                ))}
                {suspiciousAlerts.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No security alerts
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Access Patterns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Admin Actions (24h)</span>
                    <span className="font-medium">{accessLogs.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>High Risk Actions</span>
                    <span className="font-medium text-red-600">
                      {accessLogs.filter(log => log.riskLevel === 'high').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Unique IP Addresses</span>
                    <span className="font-medium">
                      {new Set(accessLogs.map(log => log.ipAddress)).size}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Failed Actions</span>
                    <span className="font-medium text-red-600">
                      {accessLogs.filter(log => !log.success).length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Security Level</span>
                    <Badge variant={suspiciousAlerts.length > 0 ? 'destructive' : 'default'}>
                      {suspiciousAlerts.length > 0 ? 'Alert' : 'Normal'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Alerts</span>
                    <span className="font-medium">{suspiciousAlerts.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>New Locations (24h)</span>
                    <span className="font-medium">
                      {accessLogs.filter(log => log.isNewLocation).length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};