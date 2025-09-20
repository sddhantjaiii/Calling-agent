import React, { useState, useEffect } from 'react';
import { Bell, RefreshCw, Settings, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Switch } from '../../ui/switch';
import { RealTimeMetrics } from './RealTimeMetrics';
import { AdminNotificationCenter } from './AdminNotificationCenter';
import { useAdminWebSocket } from '../../../hooks/useAdminWebSocket';

interface RealTimeDashboardProps {
  className?: string;
}

export const RealTimeDashboard: React.FC<RealTimeDashboardProps> = ({ className }) => {
  const {
    isConnected,
    connectionState,
    unreadNotificationCount,
    criticalNotificationCount,
    connect,
    disconnect,
    requestMetrics,
    subscribeToCategories
  } = useAdminWebSocket();

  const [showNotifications, setShowNotifications] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const [subscribedCategories, setSubscribedCategories] = useState<string[]>([
    'system', 'user', 'agent', 'security', 'billing'
  ]);

  // Auto-refresh metrics
  useEffect(() => {
    if (autoRefresh && isConnected) {
      const interval = setInterval(() => {
        requestMetrics();
      }, refreshInterval * 1000);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, isConnected, requestMetrics]);

  const handleCategoryToggle = (category: string) => {
    const newCategories = subscribedCategories.includes(category)
      ? subscribedCategories.filter(c => c !== category)
      : [...subscribedCategories, category];
    
    setSubscribedCategories(newCategories);
    subscribeToCategories(newCategories);
  };

  const handleManualRefresh = () => {
    requestMetrics();
  };

  const handleReconnect = () => {
    if (!isConnected) {
      connect();
    }
  };

  const getConnectionStatusBadge = () => {
    switch (connectionState) {
      case 'connected':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        );
      case 'connecting':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            Connecting
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            Disconnected
          </Badge>
        );
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Real-Time Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Real-Time Dashboard</span>
            <div className="flex items-center gap-2">
              {getConnectionStatusBadge()}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNotifications(true)}
                className="relative"
              >
                <Bell className="h-4 w-4" />
                {unreadNotificationCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                  >
                    {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                  </Badge>
                )}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Auto Refresh Control */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Auto Refresh</label>
              <Switch
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
            </div>

            {/* Refresh Interval */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Interval (s)</label>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="text-sm border rounded px-2 py-1"
                disabled={!autoRefresh}
              >
                <option value={10}>10s</option>
                <option value={30}>30s</option>
                <option value={60}>1m</option>
                <option value={300}>5m</option>
              </select>
            </div>

            {/* Manual Refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={!isConnected}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Now
            </Button>

            {/* Reconnect */}
            {!isConnected && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReconnect}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Reconnect
              </Button>
            )}
          </div>

          {/* Critical Notifications Alert */}
          {criticalNotificationCount > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <span className="text-sm font-medium text-red-800">
                  {criticalNotificationCount} critical notification{criticalNotificationCount > 1 ? 's' : ''} require attention
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNotifications(true)}
                  className="ml-auto"
                >
                  View
                </Button>
              </div>
            </div>
          )}

          {/* Subscription Categories */}
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Notification Categories</h4>
            <div className="flex flex-wrap gap-2">
              {['system', 'user', 'agent', 'security', 'billing'].map(category => (
                <Badge
                  key={category}
                  variant={subscribedCategories.includes(category) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => handleCategoryToggle(category)}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Real-Time Metrics */}
      <RealTimeMetrics />

      {/* Notification Center */}
      <AdminNotificationCenter
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </div>
  );
};

export default RealTimeDashboard;