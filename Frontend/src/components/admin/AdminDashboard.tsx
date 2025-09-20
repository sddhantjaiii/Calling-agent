
import React from 'react';
import {
    Users,
    Bot,
    Phone,
    AlertTriangle,
    Activity,
    TrendingUp,
    TrendingDown,
    RefreshCw,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    Bell,
    Wifi,
    WifiOff
} from 'lucide-react';
import { AdminCard } from './shared/AdminCard';
import { useAdminDashboard } from '../../hooks/useAdminDashboard';
import { useAdminWebSocket } from '../../hooks/useAdminWebSocket';
import { ActivityChart, SystemHealthChart } from './charts/AdminCharts';
import { RealTimeMetrics, SystemStatusIndicator } from './RealTime';
import { formatDistanceToNow } from 'date-fns';
import type { AdminActivity, SystemStatistics } from '../../types/admin';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { AuthDebug } from './AuthDebug';



// Mock chart data for demonstration
const mockChartData = [
    { name: '00:00', users: 120, agents: 45, calls: 23 },
    { name: '04:00', users: 98, agents: 38, calls: 18 },
    { name: '08:00', users: 180, agents: 67, calls: 45 },
    { name: '12:00', users: 220, agents: 89, calls: 67 },
    { name: '16:00', users: 195, agents: 78, calls: 52 },
    { name: '20:00', users: 165, agents: 56, calls: 38 },
];

const mockSystemHealthData = [
    { name: 'CPU', value: 65, status: 'healthy' },
    { name: 'Memory', value: 78, status: 'warning' },
    { name: 'Disk', value: 45, status: 'healthy' },
    { name: 'Network', value: 92, status: 'healthy' },
];

export function AdminDashboard() {
    // Use the custom admin dashboard hook (must be called before any conditional returns)
    const {
        metrics,
        systemStats: stats,
        isLoading,
        error,
        refetch,
    } = useAdminDashboard({
        refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
    });

    // Use real-time WebSocket data
    const {
        isConnected,
        connectionState,
        unreadNotificationCount,
        criticalNotificationCount,
        metrics: realTimeMetrics,
        systemStatus: realTimeSystemStatus
    } = useAdminWebSocket();

    // Check authentication status
    const authToken = localStorage.getItem('auth_token');
    
    // If no token, show login prompt
    if (!authToken) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Authentication required
                        </p>
                    </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <div className="flex">
                        <AlertTriangle className="h-5 w-5 text-yellow-400" />
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-yellow-800">
                                Authentication Required
                            </h3>
                            <div className="mt-2 text-sm text-yellow-700">
                                <p>
                                    You need to log in to access the admin dashboard.
                                </p>
                                <button
                                    onClick={() => window.location.href = '/'}
                                    className="mt-2 bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700"
                                >
                                    Go to Login
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const hasError = !!error;

    // Calculate system health status with comprehensive null safety
    const getSystemHealthStatus = (stats: SystemStatistics | null | undefined) => {
        if (!stats?.system) {
            return { status: 'unknown', color: 'gray' };
        }

        const system = stats.system;
        
        // Handle undefined values with safe defaults
        const safeUptime = typeof system.uptime === 'number' ? system.uptime : 0;
        const safeResponseTime = typeof system.responseTime === 'number' ? system.responseTime : 1000;
        const safeErrorRate = typeof system.errorRate === 'number' ? system.errorRate : 1;

        if (safeUptime > 99.5 && safeResponseTime < 200 && safeErrorRate < 0.01) {
            return { status: 'healthy', color: 'green' };
        } else if (safeUptime > 98 && safeResponseTime < 500 && safeErrorRate < 0.05) {
            return { status: 'warning', color: 'yellow' };
        } else {
            return { status: 'critical', color: 'red' };
        }
    };

    const systemHealth = getSystemHealthStatus(stats);

    // Format activity items
    const formatActivity = (activity: AdminActivity) => {
        const icons = {
            user_registered: Users,
            agent_created: Bot,
            call_completed: Phone,
            system_alert: AlertTriangle,
        };

        const Icon = icons[activity.type] || Activity;

        return {
            ...activity,
            Icon,
            timeAgo: formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true }),
        };
    };

    const handleRefresh = async () => {
        await refetch();
    };

    if (hasError) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Overview of system metrics and platform health
                        </p>
                    </div>
                    <button
                        onClick={handleRefresh}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Retry
                    </button>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <div className="flex">
                        <XCircle className="h-5 w-5 text-red-400" />
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">
                                Failed to load dashboard data
                            </h3>
                            <div className="mt-2 text-sm text-red-700">
                                <p>
                                    {error || 'An error occurred while loading the dashboard.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page header with real-time status and notifications */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Overview of system metrics and platform health
                    </p>
                </div>
                <div className="flex items-center space-x-3">
                    {/* Real-time connection status */}
                    <div className="flex items-center text-sm">
                        {isConnected ? (
                            <Wifi className="h-4 w-4 text-green-500 mr-1" />
                        ) : (
                            <WifiOff className="h-4 w-4 text-red-500 mr-1" />
                        )}
                        <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
                            {connectionState}
                        </span>
                    </div>

                    {/* Notification indicator */}
                    {unreadNotificationCount > 0 && (
                        <div className="flex items-center">
                            <Bell className="h-4 w-4 text-gray-500 mr-1" />
                            <Badge variant={criticalNotificationCount > 0 ? 'destructive' : 'default'}>
                                {unreadNotificationCount}
                            </Badge>
                        </div>
                    )}

                    <div className="flex items-center text-sm text-gray-500">
                        <Clock className="h-4 w-4 mr-1" />
                        Last updated: {formatDistanceToNow(new Date(), { addSuffix: true })}
                    </div>
                    <button
                        onClick={handleRefresh}
                        disabled={isLoading}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Dashboard Tabs */}
            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="realtime">
                        Real-Time
                        {isConnected && (
                            <Badge variant="default" className="ml-2 bg-green-100 text-green-800">
                                Live
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    {/* Key Metrics Cards */}
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        <AdminCard
                            title="Total Users"
                            value={isLoading ? '...' : (realTimeMetrics?.activeUsers?.toLocaleString() || stats?.users?.total?.toLocaleString() || '0')}
                            icon={Users}
                            trend={stats?.users?.newThisMonth && stats?.users?.total ? {
                                value: Math.round((stats.users.newThisMonth / stats.users.total) * 100),
                                isPositive: true
                            } : undefined}
                            description={`${stats?.users?.active || 0} active users`}
                        />

                        <AdminCard
                            title="Active Agents"
                            value={isLoading ? '...' : (stats?.agents?.active?.toLocaleString() || '0')}
                            icon={Bot}
                            trend={stats?.agents?.total && stats?.agents?.active ? {
                                value: Math.round((stats.agents.active / stats.agents.total) * 100),
                                isPositive: (stats?.agents?.healthyPercentage || 0) > 90
                            } : undefined}
                            description={`${stats?.agents?.total || 0} total agents`}
                        />

                        <AdminCard
                            title="Calls Today"
                            value={isLoading ? '...' : (realTimeMetrics?.totalCalls?.toLocaleString() || metrics?.callsToday?.toLocaleString() || '0')}
                            icon={Phone}
                            trend={stats?.calls?.successRate ? {
                                value: Math.round(stats.calls.successRate * 100),
                                isPositive: stats.calls.successRate > 0.8
                            } : undefined}
                            description={`${stats?.calls?.totalThisMonth?.toLocaleString() || 0} this month`}
                        />

                        <AdminCard
                            title="System Health"
                            value={isLoading ? '...' : `${stats?.system?.uptime?.toFixed(1) || '0'}%`}
                            icon={systemHealth.status === 'healthy' ? CheckCircle :
                                systemHealth.status === 'warning' ? AlertCircle : XCircle}
                            description={`${realTimeMetrics?.responseTime || stats?.system?.responseTime || 0}ms avg response`}
                            className={`border-l-4 ${systemHealth.status === 'healthy' ? 'border-l-green-500' :
                                systemHealth.status === 'warning' ? 'border-l-yellow-500' : 'border-l-red-500'
                                }`}
                        >
                            <div className="flex items-center space-x-2 text-sm">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${systemHealth.status === 'healthy' ? 'bg-green-100 text-green-800' :
                                    systemHealth.status === 'warning' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                    {systemHealth.status}
                                </span>
                                <span className="text-gray-500">
                                    {stats?.system?.activeConnections || 0} active connections
                                </span>
                            </div>
                        </AdminCard>
                    </div>
                </TabsContent>

                <TabsContent value="realtime" className="space-y-6">
                    {/* Real-Time Dashboard */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        <div className="lg:col-span-3">
                            <RealTimeMetrics />
                        </div>
                        <div className="lg:col-span-1">
                            <SystemStatusIndicator />
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="analytics" className="space-y-6">

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Activity Chart */}
                        <AdminCard title="Platform Activity (24h)" className="col-span-1">
                            <ActivityChart data={mockChartData} className="h-[300px]" />
                        </AdminCard>

                        {/* System Health Chart */}
                        <AdminCard title="System Resources" className="col-span-1">
                            <SystemHealthChart data={mockSystemHealthData} className="h-[300px]" />
                        </AdminCard>
                    </div>

                    {/* Recent Activity and Alerts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity */}
                <AdminCard title="Recent Activity" className="col-span-1">
                    <div className="flow-root">
                        <ul className="-mb-8">
                            {(metrics?.recentActivity || []).slice(0, 5).map((activity, activityIdx, activities) => {
                                const formattedActivity = formatActivity(activity);
                                const Icon = formattedActivity.Icon;

                                return (
                                    <li key={activity.id}>
                                        <div className="relative pb-8">
                                            {activityIdx !== activities.length - 1 ? (
                                                <span
                                                    className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                                                    aria-hidden="true"
                                                />
                                            ) : null}
                                            <div className="relative flex space-x-3">
                                                <div>
                                                    <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${activity.severity === 'error' ? 'bg-red-500' :
                                                        activity.severity === 'warning' ? 'bg-yellow-500' : 'bg-teal-500'
                                                        }`}>
                                                        <Icon className="h-4 w-4 text-white" />
                                                    </span>
                                                </div>
                                                <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                                    <div>
                                                        <p className="text-sm text-gray-900">
                                                            {activity.message}
                                                        </p>
                                                    </div>
                                                    <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                                        {formattedActivity.timeAgo}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>

                        {(!metrics?.recentActivity || metrics.recentActivity.length === 0) && (
                            <div className="text-center py-6 text-gray-500">
                                <Activity className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                <p>No recent activity</p>
                            </div>
                        )}
                    </div>
                </AdminCard>

                {/* System Alerts */}
                <AdminCard title="System Alerts" className="col-span-1">
                    <div className="space-y-3">
                        {stats?.system?.errorRate && stats.system.errorRate > 0.05 && (
                            <div className="flex items-center p-3 bg-red-50 rounded-lg">
                                <XCircle className="h-5 w-5 text-red-400 mr-3" />
                                <div>
                                    <p className="text-sm font-medium text-red-800">High Error Rate</p>
                                    <p className="text-sm text-red-600">
                                        Current error rate: {(stats.system.errorRate * 100).toFixed(2)}%
                                    </p>
                                </div>
                            </div>
                        )}

                        {stats?.system?.responseTime && stats.system.responseTime > 500 && (
                            <div className="flex items-center p-3 bg-yellow-50 rounded-lg">
                                <AlertCircle className="h-5 w-5 text-yellow-400 mr-3" />
                                <div>
                                    <p className="text-sm font-medium text-yellow-800">Slow Response Time</p>
                                    <p className="text-sm text-yellow-600">
                                        Average response: {stats.system.responseTime}ms
                                    </p>
                                </div>
                            </div>
                        )}

                        {stats?.agents?.healthyPercentage && stats.agents.healthyPercentage < 90 && (
                            <div className="flex items-center p-3 bg-yellow-50 rounded-lg">
                                <AlertCircle className="h-5 w-5 text-yellow-400 mr-3" />
                                <div>
                                    <p className="text-sm font-medium text-yellow-800">Agent Health Issues</p>
                                    <p className="text-sm text-yellow-600">
                                        Only {stats.agents.healthyPercentage.toFixed(1)}% of agents are healthy
                                    </p>
                                </div>
                            </div>
                        )}

                        {(!stats || (
                            (!stats.system?.errorRate || stats.system.errorRate <= 0.05) &&
                            (!stats.system?.responseTime || stats.system.responseTime <= 500) &&
                            (!stats.agents?.healthyPercentage || stats.agents.healthyPercentage >= 90)
                        )) && (
                                <div className="flex items-center p-3 bg-green-50 rounded-lg">
                                    <CheckCircle className="h-5 w-5 text-green-400 mr-3" />
                                    <div>
                                        <p className="text-sm font-medium text-green-800">All Systems Operational</p>
                                        <p className="text-sm text-green-600">
                                            No active alerts or issues detected
                                        </p>
                                    </div>
                                </div>
                            )}
                    </div>
                </AdminCard>
                    </div>
                </TabsContent>
            </Tabs>
            <AuthDebug />
        </div>
    );
}

export default AdminDashboard;