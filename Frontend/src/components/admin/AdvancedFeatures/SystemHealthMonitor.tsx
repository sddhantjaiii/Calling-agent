import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Server, 
  Database, 
  Wifi,
  Bell,
  Settings
} from 'lucide-react';
import { useAdminAnalytics } from '@/hooks/useAdminAnalytics';

interface SystemHealthData {
  overall: 'healthy' | 'warning' | 'critical';
  uptime: number;
  services: {
    api: { status: 'up' | 'down' | 'degraded'; responseTime: number };
    database: { status: 'up' | 'down' | 'degraded'; connections: number };
    elevenLabs: { status: 'up' | 'down' | 'degraded'; quota: number };
    stripe: { status: 'up' | 'down' | 'degraded'; lastCheck: Date };
  };
  metrics: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    activeUsers: number;
    errorRate: number;
  };
  alerts: Array<{
    id: string;
    type: 'warning' | 'error' | 'info';
    message: string;
    timestamp: Date;
    acknowledged: boolean;
  }>;
}

interface AlertThreshold {
  metric: string;
  warning: number;
  critical: number;
  enabled: boolean;
}

const SystemHealthMonitor: React.FC = () => {
  const [healthData, setHealthData] = useState<SystemHealthData | null>(null);
  const [alertThresholds, setAlertThresholds] = useState<AlertThreshold[]>([
    { metric: 'CPU Usage', warning: 70, critical: 90, enabled: true },
    { metric: 'Memory Usage', warning: 80, critical: 95, enabled: true },
    { metric: 'Error Rate', warning: 5, critical: 10, enabled: true },
    { metric: 'Response Time', warning: 1000, critical: 3000, enabled: true }
  ]);
  const [loading, setLoading] = useState(true);
  const { data: analyticsData } = useAdminAnalytics('system-health');

  useEffect(() => {
    fetchSystemHealth();
    const interval = setInterval(fetchSystemHealth, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchSystemHealth = async () => {
    try {
      // Mock data - replace with actual API call
      const mockData: SystemHealthData = {
        overall: 'healthy',
        uptime: 99.9,
        services: {
          api: { status: 'up', responseTime: 120 },
          database: { status: 'up', connections: 45 },
          elevenLabs: { status: 'up', quota: 85 },
          stripe: { status: 'up', lastCheck: new Date() }
        },
        metrics: {
          cpuUsage: 45,
          memoryUsage: 62,
          diskUsage: 38,
          activeUsers: 234,
          errorRate: 0.2
        },
        alerts: [
          {
            id: '1',
            type: 'warning',
            message: 'High memory usage detected on server-2',
            timestamp: new Date(Date.now() - 300000),
            acknowledged: false
          },
          {
            id: '2',
            type: 'info',
            message: 'Scheduled maintenance completed successfully',
            timestamp: new Date(Date.now() - 3600000),
            acknowledged: true
          }
        ]
      };
      setHealthData(mockData);
    } catch (error) {
      console.error('Failed to fetch system health:', error);
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = (alertId: string) => {
    setHealthData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        alerts: prev.alerts.map(alert =>
          alert.id === alertId ? { ...alert, acknowledged: true } : alert
        )
      };
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'up':
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded':
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'down':
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'up':
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'degraded':
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'down':
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!healthData) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load system health data. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(healthData.overall)}
            System Health Overview
          </CardTitle>
          <CardDescription>
            Real-time monitoring of system components and performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {healthData.uptime}%
              </div>
              <div className="text-sm text-gray-500">Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {healthData.metrics.activeUsers}
              </div>
              <div className="text-sm text-gray-500">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {healthData.services.api.responseTime}ms
              </div>
              <div className="text-sm text-gray-500">Avg Response Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {healthData.metrics.errorRate}%
              </div>
              <div className="text-sm text-gray-500">Error Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="services" className="space-y-4">
        <TabsList>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="metrics">System Metrics</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="settings">Alert Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* API Service */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">API Service</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge className={getStatusColor(healthData.services.api.status)}>
                    {healthData.services.api.status.toUpperCase()}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    {healthData.services.api.responseTime}ms
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Database */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Database</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge className={getStatusColor(healthData.services.database.status)}>
                    {healthData.services.database.status.toUpperCase()}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    {healthData.services.database.connections} connections
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* ElevenLabs */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ElevenLabs API</CardTitle>
                <Wifi className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge className={getStatusColor(healthData.services.elevenLabs.status)}>
                    {healthData.services.elevenLabs.status.toUpperCase()}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    {healthData.services.elevenLabs.quota}% quota used
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Stripe */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Stripe Payment</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge className={getStatusColor(healthData.services.stripe.status)}>
                    {healthData.services.stripe.status.toUpperCase()}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    Last check: {new Date(healthData.services.stripe.lastCheck).toLocaleTimeString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">CPU Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Current</span>
                    <span>{healthData.metrics.cpuUsage}%</span>
                  </div>
                  <Progress value={healthData.metrics.cpuUsage} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Memory Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Current</span>
                    <span>{healthData.metrics.memoryUsage}%</span>
                  </div>
                  <Progress value={healthData.metrics.memoryUsage} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Disk Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Current</span>
                    <span>{healthData.metrics.diskUsage}%</span>
                  </div>
                  <Progress value={healthData.metrics.diskUsage} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Error Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Current</span>
                    <span>{healthData.metrics.errorRate}%</span>
                  </div>
                  <Progress value={healthData.metrics.errorRate} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <div className="space-y-4">
            {healthData.alerts.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>No active alerts</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              healthData.alerts.map((alert) => (
                <Alert key={alert.id} className={alert.acknowledged ? 'opacity-60' : ''}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      {alert.type === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />}
                      {alert.type === 'error' && <XCircle className="h-4 w-4 text-red-500 mt-0.5" />}
                      {alert.type === 'info' && <Bell className="h-4 w-4 text-blue-500 mt-0.5" />}
                      <div>
                        <AlertDescription className="font-medium">
                          {alert.message}
                        </AlertDescription>
                        <p className="text-sm text-gray-500 mt-1">
                          {alert.timestamp.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {!alert.acknowledged && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => acknowledgeAlert(alert.id)}
                      >
                        Acknowledge
                      </Button>
                    )}
                  </div>
                </Alert>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Alert Thresholds
              </CardTitle>
              <CardDescription>
                Configure when to trigger alerts based on system metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alertThresholds.map((threshold, index) => (
                  <div key={threshold.metric} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{threshold.metric}</h4>
                      <p className="text-sm text-gray-500">
                        Warning: {threshold.warning}% | Critical: {threshold.critical}%
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={threshold.enabled ? "default" : "secondary"}>
                        {threshold.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                      <Button variant="outline" size="sm">
                        Configure
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SystemHealthMonitor;