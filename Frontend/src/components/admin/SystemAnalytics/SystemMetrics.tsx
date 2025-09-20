import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Bot, 
  Phone, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Activity,
  Server,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { AdminCard } from '../shared/AdminCard';
import { AnalyticsFilters } from './AnalyticsDashboard';

interface SystemMetricsProps {
  data: any;
  filters: AnalyticsFilters;
  onRefresh: () => void;
}

interface MetricCardData {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ComponentType<any>;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  description?: string;
}

interface SystemHealthMetric {
  name: string;
  value: number;
  status: 'healthy' | 'warning' | 'critical';
  description: string;
}

export const SystemMetrics: React.FC<SystemMetricsProps> = ({ 
  data, 
  filters, 
  onRefresh 
}) => {
  const [realTimeMetrics, setRealTimeMetrics] = useState<any>(null);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      // In a real implementation, this would fetch real-time data
      setRealTimeMetrics({
        activeUsers: Math.floor(Math.random() * 100) + 50,
        activeCalls: Math.floor(Math.random() * 20) + 5,
        systemLoad: Math.random() * 100,
        responseTime: Math.floor(Math.random() * 100) + 50
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const platformMetrics: MetricCardData[] = [
    {
      title: 'Total Users',
      value: data?.users?.total || 0,
      change: data?.users?.growthRate || 0,
      changeLabel: 'vs last month',
      icon: Users,
      color: 'blue',
      description: `${data?.users?.active || 0} active users`
    },
    {
      title: 'Total Agents',
      value: data?.agents?.total || 0,
      change: Math.round(Math.random() * 10),
      changeLabel: 'vs last month',
      icon: Bot,
      color: 'green',
      description: `${data?.agents?.active || 0} active agents`
    },
    {
      title: 'Total Calls',
      value: data?.calls?.totalThisMonth || 0,
      change: Math.round(Math.random() * 15),
      changeLabel: 'vs last month',
      icon: Phone,
      color: 'purple',
      description: `${data?.calls?.successRate || 0}% success rate`
    },
    {
      title: 'Revenue',
      value: `$${(data?.credits?.estimatedMonthlyRevenue || 0).toLocaleString()}`,
      change: Math.round(Math.random() * 20),
      changeLabel: 'vs last month',
      icon: DollarSign,
      color: 'yellow',
      description: `$${(data?.credits?.estimatedMonthlyRevenue || 0).toLocaleString()} this month`
    }
  ];

  const systemHealthMetrics: SystemHealthMetric[] = [
    {
      name: 'API Response Time',
      value: realTimeMetrics?.responseTime || data?.system?.responseTime || 0,
      status: (realTimeMetrics?.responseTime || data?.system?.responseTime || 0) < 100 ? 'healthy' : 'warning',
      description: 'Average API response time in milliseconds'
    },
    {
      name: 'System Uptime',
      value: data?.system?.uptime || 99.9,
      status: (data?.system?.uptime || 99.9) > 99 ? 'healthy' : 'warning',
      description: 'System availability percentage'
    },
    {
      name: 'Error Rate',
      value: data?.system?.errorRate || 0.1,
      status: (data?.system?.errorRate || 0.1) < 1 ? 'healthy' : 'critical',
      description: 'Percentage of failed requests'
    },
    {
      name: 'Active Connections',
      value: realTimeMetrics?.activeUsers || data?.system?.activeConnections || 0,
      status: 'healthy',
      description: 'Current active user connections'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'healthy': return 'default';
      case 'warning': return 'secondary';
      case 'critical': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Platform Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {platformMetrics.map((metric, index) => (
          <AdminCard
            key={index}
            title={metric.title}
            value={metric.value}
            change={metric.change}
            changeLabel={metric.changeLabel}
            icon={metric.icon}
            color={metric.color}
            description={metric.description}
          />
        ))}
      </div>

      {/* Real-time System Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Real-time System Health
          </CardTitle>
          <CardDescription>
            Live system performance metrics and health indicators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {systemHealthMetrics.map((metric, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{metric.name}</span>
                  <Badge variant={getStatusBadgeVariant(metric.status)}>
                    {metric.status}
                  </Badge>
                </div>
                <div className={`text-2xl font-bold ${getStatusColor(metric.status)}`}>
                  {typeof metric.value === 'number' && metric.name.includes('Rate') 
                    ? `${metric.value.toFixed(1)}%`
                    : typeof metric.value === 'number' && metric.name.includes('Time')
                    ? `${metric.value}ms`
                    : metric.value
                  }
                </div>
                <p className="text-xs text-muted-foreground">{metric.description}</p>
                {metric.name === 'System Uptime' && (
                  <Progress value={metric.value} className="h-2" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed System Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>User Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Active Users</span>
              <span className="font-semibold">{data?.users?.active || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">New Registrations (30d)</span>
              <span className="font-semibold">{data?.users?.newThisMonth || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Free Tier Users</span>
              <span className="font-semibold">{data?.users?.byTier?.free || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Pro Tier Users</span>
              <span className="font-semibold">{data?.users?.byTier?.pro || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Enterprise Users</span>
              <span className="font-semibold">{data?.users?.byTier?.enterprise || 0}</span>
            </div>
          </CardContent>
        </Card>

        {/* Agent Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Agent Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Active Agents</span>
              <span className="font-semibold">{data?.agents?.active || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Sales Agents</span>
              <span className="font-semibold">{data?.agents?.byType?.sales || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Support Agents</span>
              <span className="font-semibold">{data?.agents?.byType?.support || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Survey Agents</span>
              <span className="font-semibold">{data?.agents?.byType?.survey || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Healthy Agents</span>
              <span className="font-semibold text-green-600">
                {data?.agents?.healthyPercentage || 0}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Alerts */}
      {data?.alerts && data.alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              System Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.alerts.map((alert: any, index: number) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{alert.title}</p>
                    <p className="text-xs text-muted-foreground">{alert.description}</p>
                  </div>
                  <Badge variant="secondary">{alert.severity}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};