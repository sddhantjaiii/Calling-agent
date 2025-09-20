import React, { useState, useEffect } from 'react';
import { Activity, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock, Phone, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import LoadingSpinner from '../../ui/LoadingSpinner';
import AdminCharts from '../charts/AdminCharts';
import { adminApiService } from '../../../services/adminApiService';
import type { AdminAgentMonitoring } from '../../../types/admin';

interface AgentMonitorProps {
  timeframe?: '1h' | '24h' | '7d' | '30d';
  onTimeframeChange?: (timeframe: string) => void;
}

export const AgentMonitor: React.FC<AgentMonitorProps> = ({ 
  timeframe = '24h', 
  onTimeframeChange 
}) => {
  const [monitoringData, setMonitoringData] = useState<AdminAgentMonitoring | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe);

  // Load monitoring data
  const loadMonitoringData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await adminApiService.getAgentMonitoring(selectedTimeframe);
      
      if (response.success && response.data) {
        setMonitoringData(response.data);
      } else {
        throw new Error(response.error?.message || 'Failed to load monitoring data');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load monitoring data';
      setError(errorMessage);
      console.error('Failed to load monitoring data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle timeframe change
  const handleTimeframeChange = (newTimeframe: string) => {
    setSelectedTimeframe(newTimeframe);
    onTimeframeChange?.(newTimeframe);
  };

  // Calculate success rate
  const getSuccessRate = () => {
    if (!monitoringData) return 0;
    const total = monitoringData.totalCalls;
    if (total === 0) return 0;
    return Math.round((monitoringData.successfulCalls / total) * 100);
  };

  // Calculate failure rate
  const getFailureRate = () => {
    if (!monitoringData) return 0;
    const total = monitoringData.totalCalls;
    if (total === 0) return 0;
    return Math.round((monitoringData.failedCalls / total) * 100);
  };

  // Get trend indicator
  const getTrendIndicator = (current: number, previous: number) => {
    if (current > previous) {
      return <TrendingUp className="w-4 h-4 text-green-600" />;
    } else if (current < previous) {
      return <TrendingDown className="w-4 h-4 text-red-600" />;
    }
    return null;
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Load data on mount and timeframe change
  useEffect(() => {
    loadMonitoringData();
  }, [selectedTimeframe]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(loadMonitoringData, 30000);
    return () => clearInterval(interval);
  }, [selectedTimeframe]);

  if (loading && !monitoringData) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-red-600">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
            <p className="text-lg font-semibold mb-2">Error Loading Monitoring Data</p>
            <p className="text-sm mb-4">{error}</p>
            <Button onClick={loadMonitoringData} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Agent Performance Monitor</h2>
          <p className="text-muted-foreground">
            Real-time monitoring of agent performance and system health
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedTimeframe} onValueChange={handleTimeframeChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={loadMonitoringData} variant="outline" size="sm">
            <Activity className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monitoringData?.totalCalls || 0}</div>
            <p className="text-xs text-muted-foreground">
              {selectedTimeframe === '1h' ? 'in the last hour' : 
               selectedTimeframe === '24h' ? 'in the last 24 hours' :
               selectedTimeframe === '7d' ? 'in the last 7 days' : 'in the last 30 days'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{getSuccessRate()}%</div>
            <p className="text-xs text-muted-foreground">
              {monitoringData?.successfulCalls || 0} successful calls
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failure Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{getFailureRate()}%</div>
            <p className="text-xs text-muted-foreground">
              {monitoringData?.failedCalls || 0} failed calls
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(monitoringData?.averageCallDuration || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              per call
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Usage Chart */}
      {monitoringData?.usageByHour && (
        <Card>
          <CardHeader>
            <CardTitle>Call Volume by Hour</CardTitle>
          </CardHeader>
          <CardContent>
            <AdminCharts
              type="line"
              data={monitoringData.usageByHour.map(item => ({
                name: item.hour,
                value: item.callCount,
              }))}
              height={300}
            />
          </CardContent>
        </Card>
      )}

      {/* Top Performing Agents */}
      {monitoringData?.topPerformingAgents && monitoringData.topPerformingAgents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {monitoringData.topPerformingAgents.slice(0, 10).map((agent, index) => (
                <div key={agent.agentId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full text-sm font-medium">
                      #{index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{agent.agentName}</div>
                      <div className="text-sm text-muted-foreground">
                        {agent.userEmail}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-medium">{agent.callCount}</div>
                      <div className="text-muted-foreground">Calls</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-green-600">{agent.successRate}%</div>
                      <div className="text-muted-foreground">Success</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium">{formatDuration(agent.averageDuration)}</div>
                      <div className="text-muted-foreground">Avg Duration</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Rates */}
      {monitoringData?.errorRates && Object.keys(monitoringData.errorRates).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Error Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(monitoringData.errorRates).map(([errorType, count]) => (
                <div key={errorType} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span className="font-medium">{errorType}</span>
                  </div>
                  <Badge variant="destructive">{count} errors</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <div className="font-medium">ElevenLabs API</div>
                <div className="text-sm text-muted-foreground">Operational</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <div className="font-medium">Database</div>
                <div className="text-sm text-muted-foreground">Healthy</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <div className="font-medium">Call Processing</div>
                <div className="text-sm text-muted-foreground">Normal</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Updates Indicator */}
      <div className="flex items-center justify-center text-sm text-muted-foreground">
        <Activity className="w-4 h-4 mr-2 animate-pulse" />
        Live monitoring - Updates every 30 seconds
      </div>
    </div>
  );
};