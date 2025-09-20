import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, Clock, Wifi, WifiOff } from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Progress } from '../../ui/progress';
import { useAdminWebSocket } from '../../../hooks/useAdminWebSocket';

interface SystemStatusIndicatorProps {
  className?: string;
  compact?: boolean;
}

export const SystemStatusIndicator: React.FC<SystemStatusIndicatorProps> = ({
  className,
  compact = false
}) => {
  const {
    isConnected,
    connectionState,
    systemStatus,
    metrics
  } = useAdminWebSocket();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'operational':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
      case 'down':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'operational':
        return 'text-green-600';
      case 'warning':
      case 'degraded':
        return 'text-yellow-600';
      case 'error':
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getOverallStatus = () => {
    if (!isConnected) return 'disconnected';
    if (!systemStatus) return 'unknown';

    const statuses = Object.values(systemStatus);
    if (statuses.some(status => status === 'error' || status === 'down')) {
      return 'error';
    }
    if (statuses.some(status => status === 'warning' || status === 'degraded')) {
      return 'warning';
    }
    if (statuses.every(status => status === 'healthy' || status === 'operational')) {
      return 'healthy';
    }
    return 'unknown';
  };

  const overallStatus = getOverallStatus();

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {isConnected ? (
          <Wifi className="h-4 w-4 text-green-500" />
        ) : (
          <WifiOff className="h-4 w-4 text-red-500" />
        )}
        <Badge
          variant={overallStatus === 'healthy' ? 'default' : 
                  overallStatus === 'warning' ? 'secondary' : 'destructive'}
          className="text-xs"
        >
          {overallStatus.charAt(0).toUpperCase() + overallStatus.slice(1)}
        </Badge>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          System Status
          {getStatusIcon(overallStatus)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm">WebSocket Connection</span>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <Badge variant={isConnected ? 'default' : 'destructive'}>
              {connectionState}
            </Badge>
          </div>
        </div>

        {/* System Components */}
        {systemStatus && (
          <div className="space-y-2">
            {Object.entries(systemStatus).map(([component, status]) => (
              <div key={component} className="flex items-center justify-between">
                <span className="text-sm capitalize">
                  {component.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <div className="flex items-center gap-2">
                  {getStatusIcon(status)}
                  <span className={`text-sm font-medium ${getStatusColor(status)}`}>
                    {status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Performance Metrics */}
        {metrics && (
          <div className="space-y-3 pt-2 border-t">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm">System Load</span>
                <span className="text-sm font-medium">{metrics.systemLoad.toFixed(1)}%</span>
              </div>
              <Progress 
                value={metrics.systemLoad} 
                className="h-2"
                max={100}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm">Error Rate</span>
                <span className={`text-sm font-medium ${
                  metrics.errorRate > 5 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {metrics.errorRate.toFixed(2)}%
                </span>
              </div>
              <Progress 
                value={Math.min(metrics.errorRate, 10)} 
                className="h-2"
                max={10}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-blue-600">
                  {metrics.activeUsers}
                </div>
                <p className="text-xs text-gray-500">Active Users</p>
              </div>
              <div>
                <div className="text-lg font-bold text-green-600">
                  {metrics.responseTime.toFixed(0)}ms
                </div>
                <p className="text-xs text-gray-500">Response Time</p>
              </div>
            </div>
          </div>
        )}

        {/* No Data State */}
        {!systemStatus && !metrics && isConnected && (
          <div className="text-center py-4">
            <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Loading system status...</p>
          </div>
        )}

        {/* Disconnected State */}
        {!isConnected && (
          <div className="text-center py-4">
            <WifiOff className="h-8 w-8 text-red-400 mx-auto mb-2" />
            <p className="text-sm text-red-600">
              Unable to retrieve real-time status
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};