import React, { useState, useEffect } from 'react';
import { format, subDays, subHours } from 'date-fns';
import { 
  Shield, 
  AlertTriangle, 
  Eye, 
  Globe, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Users,
  Activity,
  Lock,
  Unlock,
  RefreshCw
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Progress } from '../../ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { AdminTable } from '../shared/AdminTable';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useToast } from '../../../hooks/use-toast';
import { adminApiService } from '../../../services/adminApiService';
import type { AuditLogEntry } from '../../../types/admin';

interface SecurityEvent {
  id: string;
  type: 'failed_login' | 'suspicious_activity' | 'multiple_locations' | 'unusual_hours' | 'brute_force';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  userEmail?: string;
  ipAddress: string;
  location?: string;
  timestamp: Date;
  details: Record<string, unknown>;
  resolved: boolean;
}

interface SecurityStats {
  totalEvents: number;
  eventsToday: number;
  failedLogins: number;
  suspiciousActivities: number;
  uniqueIPs: number;
  affectedUsers: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  hourlyDistribution: Array<{ hour: string; count: number }>;
  topIPs: Array<{ ip: string; count: number; location?: string }>;
  topUsers: Array<{ userId: string; userEmail: string; eventCount: number }>;
}

interface SecurityMonitoringProps {
  className?: string;
}

export const SecurityMonitoring: React.FC<SecurityMonitoringProps> = ({ className }) => {
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [securityStats, setSecurityStats] = useState<SecurityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [refreshing, setRefreshing] = useState(false);
  
  const { toast } = useToast();

  // Load security data
  const loadSecurityData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get security-related audit logs
      const auditResponse = await adminApiService.getAuditLogs({
        action: 'auth.failed',
        limit: 100,
        sortBy: 'timestamp',
        sortOrder: 'DESC',
      });
      
      if (auditResponse.success && auditResponse.data) {
        // Transform audit logs to security events
        const events: SecurityEvent[] = auditResponse.data.map(log => ({
          id: log.id,
          type: getEventType(log),
          severity: getEventSeverity(log),
          userId: log.targetUserId,
          userEmail: log.targetUserEmail,
          ipAddress: log.ipAddress,
          timestamp: new Date(log.timestamp),
          details: log.details,
          resolved: false,
        }));
        
        setSecurityEvents(events);
        
        // Generate security stats
        const stats = generateSecurityStats(events);
        setSecurityStats(stats);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load security data';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Get event type from audit log
  const getEventType = (log: AuditLogEntry): SecurityEvent['type'] => {
    if (log.action === 'auth.failed') return 'failed_login';
    if (log.action.includes('suspicious')) return 'suspicious_activity';
    return 'failed_login';
  };

  // Get event severity
  const getEventSeverity = (log: AuditLogEntry): SecurityEvent['severity'] => {
    if (log.action === 'auth.failed') {
      const attempts = (log.details.attempts as number) || 1;
      if (attempts >= 10) return 'critical';
      if (attempts >= 5) return 'high';
      if (attempts >= 3) return 'medium';
      return 'low';
    }
    return 'medium';
  };

  // Generate security statistics
  const generateSecurityStats = (events: SecurityEvent[]): SecurityStats => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const eventsToday = events.filter(event => 
      new Date(event.timestamp) >= todayStart
    );
    
    const eventsByType = events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const eventsBySeverity = events.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const uniqueIPs = new Set(events.map(event => event.ipAddress)).size;
    const affectedUsers = new Set(events.map(event => event.userId).filter(Boolean)).size;
    
    // Generate hourly distribution
    const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => {
      const count = events.filter(event => 
        new Date(event.timestamp).getHours() === hour
      ).length;
      return { hour: hour.toString().padStart(2, '0'), count };
    });
    
    // Top IPs
    const ipCounts = events.reduce((acc, event) => {
      acc[event.ipAddress] = (acc[event.ipAddress] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topIPs = Object.entries(ipCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, count }));
    
    // Top users
    const userCounts = events.reduce((acc, event) => {
      if (event.userId && event.userEmail) {
        const key = `${event.userId}:${event.userEmail}`;
        acc[key] = (acc[key] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    const topUsers = Object.entries(userCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([key, eventCount]) => {
        const [userId, userEmail] = key.split(':');
        return { userId, userEmail, eventCount };
      });
    
    return {
      totalEvents: events.length,
      eventsToday: eventsToday.length,
      failedLogins: eventsByType.failed_login || 0,
      suspiciousActivities: eventsByType.suspicious_activity || 0,
      uniqueIPs,
      affectedUsers,
      eventsByType,
      eventsBySeverity,
      hourlyDistribution,
      topIPs,
      topUsers,
    };
  };

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSecurityData();
    setRefreshing(false);
    toast({
      title: 'Refreshed',
      description: 'Security monitoring data has been updated.',
    });
  };

  // Load data on component mount
  useEffect(() => {
    loadSecurityData();
  }, [timeframe]);

  // Get severity badge
  const getSeverityBadge = (severity: SecurityEvent['severity']) => {
    const severityConfig = {
      low: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Eye },
      medium: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: AlertTriangle },
      high: { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: AlertTriangle },
      critical: { color: 'bg-red-100 text-red-800 border-red-200', icon: Shield },
    };
    
    const config = severityConfig[severity];
    const Icon = config.icon;
    
    return (
      <Badge variant="outline" className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {severity.toUpperCase()}
      </Badge>
    );
  };

  // Get event type badge
  const getEventTypeBadge = (type: SecurityEvent['type']) => {
    const typeConfig = {
      failed_login: { color: 'bg-red-100 text-red-800 border-red-200', label: 'Failed Login' },
      suspicious_activity: { color: 'bg-orange-100 text-orange-800 border-orange-200', label: 'Suspicious Activity' },
      multiple_locations: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Multiple Locations' },
      unusual_hours: { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Unusual Hours' },
      brute_force: { color: 'bg-red-100 text-red-800 border-red-200', label: 'Brute Force' },
    };
    
    const config = typeConfig[type];
    
    return (
      <Badge variant="outline" className={config.color}>
        {config.label}
      </Badge>
    );
  };

  // Security events table columns
  const eventColumns = [
    {
      key: 'timestamp',
      label: 'Time',
      sortable: true,
      render: (event: SecurityEvent) => (
        <div className="text-sm">
          <div className="font-medium">
            {format(new Date(event.timestamp), 'MMM dd, HH:mm')}
          </div>
          <div className="text-gray-500 text-xs">
            {format(new Date(event.timestamp), 'yyyy')}
          </div>
        </div>
      ),
      width: '120px',
    },
    {
      key: 'type',
      label: 'Event Type',
      render: (event: SecurityEvent) => getEventTypeBadge(event.type),
      width: '150px',
    },
    {
      key: 'severity',
      label: 'Severity',
      sortable: true,
      render: (event: SecurityEvent) => getSeverityBadge(event.severity),
      width: '120px',
    },
    {
      key: 'userEmail',
      label: 'User',
      render: (event: SecurityEvent) => (
        event.userEmail ? (
          <div className="text-sm">
            <div className="font-medium">{event.userEmail}</div>
            <div className="text-gray-500 text-xs">{event.userId}</div>
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        )
      ),
      width: '180px',
    },
    {
      key: 'ipAddress',
      label: 'IP Address',
      render: (event: SecurityEvent) => (
        <div className="text-sm">
          <div className="font-mono">{event.ipAddress}</div>
          {event.location && (
            <div className="text-gray-500 text-xs">{event.location}</div>
          )}
        </div>
      ),
      width: '140px',
    },
    {
      key: 'resolved',
      label: 'Status',
      render: (event: SecurityEvent) => (
        event.resolved ? (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
            <Lock className="w-3 h-3 mr-1" />
            Resolved
          </Badge>
        ) : (
          <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
            <Unlock className="w-3 h-3 mr-1" />
            Open
          </Badge>
        )
      ),
      width: '100px',
    },
  ];

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">Loading security monitoring data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Security Monitoring</h2>
          <p className="text-muted-foreground">
            Monitor security events and detect suspicious activities
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={timeframe} onValueChange={(value: any) => setTimeframe(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Security Stats Cards */}
      {securityStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{securityStats.totalEvents}</div>
              <p className="text-xs text-muted-foreground">
                {securityStats.eventsToday} today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed Logins</CardTitle>
              <Lock className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {securityStats.failedLogins}
              </div>
              <p className="text-xs text-muted-foreground">
                Authentication failures
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique IPs</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{securityStats.uniqueIPs}</div>
              <p className="text-xs text-muted-foreground">
                Different IP addresses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Affected Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{securityStats.affectedUsers}</div>
              <p className="text-xs text-muted-foreground">
                Users with security events
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      {securityStats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hourly Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Security Events by Hour</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={securityStats.hourlyDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Events by Severity */}
          <Card>
            <CardHeader>
              <CardTitle>Events by Severity</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={Object.entries(securityStats.eventsBySeverity).map(([severity, count]) => ({
                      name: severity,
                      value: count,
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {Object.entries(securityStats.eventsBySeverity).map(([, ], index) => (
                      <Cell key={`cell-${index}`} fill={['#3b82f6', '#f59e0b', '#ef4444', '#10b981'][index % 4]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top IPs and Users */}
      {securityStats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top IPs */}
          <Card>
            <CardHeader>
              <CardTitle>Top IP Addresses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {securityStats.topIPs.map((ip, index) => (
                  <div key={ip.ip} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-mono text-sm">{ip.ip}</div>
                        {ip.location && (
                          <div className="text-xs text-gray-500">{ip.location}</div>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline">{ip.count} events</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Users */}
          <Card>
            <CardHeader>
              <CardTitle>Most Affected Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {securityStats.topUsers.map((user, index) => (
                  <div key={user.userId} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{user.userEmail}</div>
                        <div className="text-xs text-gray-500">{user.userId}</div>
                      </div>
                    </div>
                    <Badge variant="outline">{user.eventCount} events</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Security Events */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Security Events</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <AdminTable
            data={securityEvents.slice(0, 20)}
            columns={eventColumns}
            loading={loading}
            error={error}
            emptyMessage="No security events found"
            className="border-0"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityMonitoring;