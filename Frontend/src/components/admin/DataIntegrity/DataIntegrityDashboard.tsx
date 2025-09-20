import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Progress } from '../../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '../../ui/alert';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Database, 
  Shield, 
  TrendingUp,
  RefreshCw,
  Eye,
  AlertCircle
} from 'lucide-react';
import { adminApiService } from '../../../services/adminApiService';

interface DataIntegrityMetrics {
  crossAgentContamination: number;
  orphanedRecords: number;
  triggerFailures: number;
  performanceIssues: number;
  lastChecked: string;
}

interface Alert {
  id: string;
  rule_id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: any;
  created_at: string;
  status: 'active' | 'resolved' | 'acknowledged';
}

interface DashboardData {
  metrics: DataIntegrityMetrics;
  details: {
    contamination: any[];
    analyticsContamination: any[];
    orphanedRecords: any[];
    triggerFailures: any[];
    performanceIssues: any[];
  };
  alerts: {
    active: Alert[];
    stats: {
      total: number;
      active: number;
      resolved: number;
      acknowledged: number;
      bySeverity: Record<string, number>;
    };
  };
  healthScore: number;
  recommendations: string[];
}

export const DataIntegrityDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      const response = await adminApiService.get('/data-integrity/dashboard');
      setDashboardData(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data integrity dashboard');
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const runFullCheck = async () => {
    try {
      setRefreshing(true);
      await adminApiService.get('/data-integrity/full-check');
      await fetchDashboardData(); // Refresh data after check
    } catch (err: any) {
      setError(err.message || 'Failed to run integrity check');
    } finally {
      setRefreshing(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await adminApiService.put(`/data-integrity/alerts/${alertId}/acknowledge`);
      await fetchDashboardData(); // Refresh data
    } catch (err: any) {
      setError(err.message || 'Failed to acknowledge alert');
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      await adminApiService.put(`/data-integrity/alerts/${alertId}/resolve`);
      await fetchDashboardData(); // Refresh data
    } catch (err: any) {
      setError(err.message || 'Failed to resolve alert');
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    // Set up auto-refresh every 5 minutes
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-4 w-4" />;
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <AlertCircle className="h-4 w-4" />;
      case 'low': return <Eye className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading data integrity dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!dashboardData) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Data</AlertTitle>
        <AlertDescription>No data integrity information available.</AlertDescription>
      </Alert>
    );
  }

  const { metrics, details, alerts, healthScore, recommendations } = dashboardData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data Integrity Monitoring</h1>
          <p className="text-muted-foreground">
            Monitor data isolation, trigger health, and system integrity
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={fetchDashboardData} 
            disabled={refreshing}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            onClick={runFullCheck} 
            disabled={refreshing}
          >
            <Database className="h-4 w-4 mr-2" />
            Run Full Check
          </Button>
        </div>
      </div>

      {/* Health Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            System Health Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Progress value={healthScore} className="h-3" />
            </div>
            <div className={`text-2xl font-bold ${getHealthScoreColor(healthScore)}`}>
              {healthScore}/100
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Last checked: {new Date(metrics.lastChecked).toLocaleString()}
          </p>
        </CardContent>
      </Card>

      {/* Critical Alerts */}
      {alerts.active.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Active Alerts ({alerts.active.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.active.map((alert) => (
                <Alert key={alert.id} variant={alert.severity === 'critical' ? 'destructive' : 'default'}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      {getSeverityIcon(alert.severity)}
                      <div>
                        <AlertTitle className="flex items-center gap-2">
                          {alert.message}
                          <Badge variant={getSeverityColor(alert.severity)}>
                            {alert.severity.toUpperCase()}
                          </Badge>
                        </AlertTitle>
                        <AlertDescription className="mt-1">
                          Created: {new Date(alert.created_at).toLocaleString()}
                        </AlertDescription>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => acknowledgeAlert(alert.id)}
                      >
                        Acknowledge
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => resolveAlert(alert.id)}
                      >
                        Resolve
                      </Button>
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cross-Agent Contamination</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.crossAgentContamination}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.crossAgentContamination === 0 ? (
                <span className="text-green-600">✓ No contamination detected</span>
              ) : (
                <span className="text-red-600">⚠ Critical issue detected</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orphaned Records</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.orphanedRecords}
            </div>
            <p className="text-xs text-muted-foreground">
              Records without valid references
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trigger Failures</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.triggerFailures}
            </div>
            <p className="text-xs text-muted-foreground">
              Failed database triggers (24h)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance Issues</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.performanceIssues}
            </div>
            <p className="text-xs text-muted-foreground">
              Slow queries (>2s)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information */}
      <Tabs defaultValue="contamination" className="space-y-4">
        <TabsList>
          <TabsTrigger value="contamination">Data Contamination</TabsTrigger>
          <TabsTrigger value="orphaned">Orphaned Records</TabsTrigger>
          <TabsTrigger value="triggers">Trigger Health</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="contamination">
          <Card>
            <CardHeader>
              <CardTitle>Data Contamination Analysis</CardTitle>
              <CardDescription>
                Cross-agent and analytics data contamination detection
              </CardDescription>
            </CardHeader>
            <CardContent>
              {details.contamination.length === 0 && details.analyticsContamination.length === 0 ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span>No data contamination detected</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {details.contamination.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-red-600 mb-2">Cross-Agent Contamination</h4>
                      <div className="space-y-2">
                        {details.contamination.map((item: any, index: number) => (
                          <Alert key={index} variant="destructive">
                            <AlertDescription>
                              User {item.call_user_id} has {item.mismatched_calls} calls 
                              assigned to agents owned by user {item.agent_user_id}
                              (Severity: {item.severity})
                            </AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {details.analyticsContamination.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-orange-600 mb-2">Analytics Contamination</h4>
                      <div className="space-y-2">
                        {details.analyticsContamination.map((item: any, index: number) => (
                          <Alert key={index}>
                            <AlertDescription>
                              {item.table_name}: {item.contaminated_records} records with mismatched user IDs
                            </AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orphaned">
          <Card>
            <CardHeader>
              <CardTitle>Orphaned Records</CardTitle>
              <CardDescription>
                Records that reference non-existent parent records
              </CardDescription>
            </CardHeader>
            <CardContent>
              {details.orphanedRecords.length === 0 ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span>No orphaned records found</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {details.orphanedRecords.slice(0, 10).map((record: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <span className="font-medium">{record.table_name}</span>
                        <span className="text-muted-foreground ml-2">
                          ID: {record.record_id} ({record.orphan_type})
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(record.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                  {details.orphanedRecords.length > 10 && (
                    <p className="text-sm text-muted-foreground">
                      ... and {details.orphanedRecords.length - 10} more records
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="triggers">
          <Card>
            <CardHeader>
              <CardTitle>Database Trigger Health</CardTitle>
              <CardDescription>
                Monitor trigger execution and failure rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              {details.triggerFailures.length === 0 ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span>All triggers executing successfully</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {details.triggerFailures.map((failure: any, index: number) => (
                    <Alert key={index} variant="destructive">
                      <AlertTitle>
                        {failure.trigger_name} on {failure.table_name}
                      </AlertTitle>
                      <AlertDescription>
                        <div>{failure.error_message}</div>
                        <div className="text-sm mt-1">
                          Failures: {failure.failure_count} | 
                          Last: {new Date(failure.last_failure).toLocaleString()}
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Query Performance Issues</CardTitle>
              <CardDescription>
                Queries taking longer than expected to execute
              </CardDescription>
            </CardHeader>
            <CardContent>
              {details.performanceIssues.length === 0 ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span>All queries performing within acceptable limits</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {details.performanceIssues.slice(0, 5).map((issue: any, index: number) => (
                    <div key={index} className="p-3 border rounded">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant={issue.severity === 'high' ? 'destructive' : 'default'}>
                          {issue.severity.toUpperCase()}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Avg: {Math.round(issue.mean_time)}ms | Max: {Math.round(issue.max_time)}ms
                        </span>
                      </div>
                      <code className="text-sm bg-muted p-1 rounded block">
                        {issue.query.substring(0, 100)}...
                      </code>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations">
          <Card>
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
              <CardDescription>
                Suggested actions to improve data integrity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    <p className={recommendation.includes('CRITICAL') ? 'text-red-600 font-semibold' : ''}>
                      {recommendation}
                    </p>
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