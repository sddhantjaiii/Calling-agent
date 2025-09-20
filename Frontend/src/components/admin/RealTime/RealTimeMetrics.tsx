import React, { useEffect, useState } from 'react';
import { Activity, Users, Phone, AlertTriangle, Clock, TrendingUp, Wifi, WifiOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Progress } from '../../ui/progress';
import { useAdminWebSocket } from '../../../hooks/useAdminWebSocket';
import { formatDistanceToNow } from 'date-fns';

interface RealTimeMetricsProps {
  className?: string;
}

export const RealTimeMetrics: React.FC<RealTimeMetricsProps> = ({ className }) => {
  const {
    metrics,
    systemStatus,
    agentStatus,
    userActivities,
    isConnected,
    connectionState,
    requestMetrics
  } = useAdminWebSocket();

  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    if (metrics) {
      setLastUpdate(new Date());
    }
  }, [metrics]);

  // Request metrics every 30 seconds
  useEffect(() => {
    if (isConnected) {
      const interval = setInterval(() => {
        requestMetrics();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [isConnected, requestMetrics]);

  const getConnectionStatusColor = () => {
    switch (connectionState) {
      case 'connected':
        return 'text-green-500';
      case 'connecting':
        return 'text-yellow-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getConnectionStatusIcon = () => {
    if (isConnected) {
      return <Wifi className="h-4 w-4 text-green-500" />;
    }
    return <WifiOff className="h-4 w-4 text-red-500" />;
  };

  const formatMetricValue = (value: number, type: 'number' | 'percentage' | 'time' = 'number') => {
    if (typeof value !== 'number' || isNaN(value)) return 'N/A';
    
    switch (type) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'time':
        return `${value.toFixed(0)}ms`;
      default:
        return value.toLocaleString();
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Connection Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Real-Time Connection</CardTitle>
          {getConnectionStatusIcon()}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium ${getConnectionStatusColor()}`}>
              {connectionState.charAt(0).toUpperCase() + connectionState.slice(1)}
            </span>
            {lastUpdate && (
              <span className="text-xs text-gray-500">
                Updated {formatDistanceToNow(lastUpdate, { addSuffix: true })}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* System Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatMetricValue(metrics.activeUsers)}
              </div>
              <p className="text-xs text-muted-foreground">
                Currently online
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatMetricValue(metrics.totalCalls)}
              </div>
              <p className="text-xs text-muted-foreground">
                Today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Load</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatMetricValue(metrics.systemLoad, 'percentage')}
              </div>
              <Progress 
                value={metrics.systemLoad} 
                className="mt-2"
                max={100}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Response Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatMetricValue(metrics.responseTime, 'time')}
              </div>
              <p className="text-xs text-muted-foreground">
                Average
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error Rate Alert */}
      {metrics && metrics.errorRate > 5 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-800">High Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-800">
              {formatMetricValue(metrics.errorRate, 'percentage')}
            </div>
            <p className="text-xs text-red-600">
              Error rate is above normal threshold
            </p>
          </CardContent>
        </Card>
      )}

      {/* Recent User Activities */}
      {userActivities && userActivities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Recent User Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {userActivities.slice(0, 5).map((activity, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="font-medium">{activity.userEmail}</span>
                    <span className="text-gray-500">{activity.action}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Status Indicators */}
      {systemStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Database</span>
                <Badge variant={systemStatus.database === 'healthy' ? 'default' : 'destructive'}>
                  {systemStatus.database || 'Unknown'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">API</span>
                <Badge variant={systemStatus.api === 'healthy' ? 'default' : 'destructive'}>
                  {systemStatus.api || 'Unknown'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">ElevenLabs</span>
                <Badge variant={systemStatus.elevenLabs === 'healthy' ? 'default' : 'destructive'}>
                  {systemStatus.elevenLabs || 'Unknown'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Payments</span>
                <Badge variant={systemStatus.payments === 'healthy' ? 'default' : 'destructive'}>
                  {systemStatus.payments || 'Unknown'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agent Status Summary */}
      {agentStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Agent Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {agentStatus.active || 0}
                </div>
                <p className="text-xs text-gray-500">Active</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {agentStatus.idle || 0}
                </div>
                <p className="text-xs text-gray-500">Idle</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {agentStatus.error || 0}
                </div>
                <p className="text-xs text-gray-500">Error</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Connection State */}
      {!isConnected && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <WifiOff className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-sm text-yellow-800">
                Real-time updates unavailable. Attempting to reconnect...
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
