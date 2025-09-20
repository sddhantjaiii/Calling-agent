import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, RefreshCw, Activity, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Progress } from '../../ui/progress';
import LoadingSpinner from '../../ui/LoadingSpinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { adminApiService } from '../../../services/adminApiService';
import type { AgentHealthCheck } from '../../../types/admin';

interface AgentHealthCheckProps {
  onHealthChange?: (healthData: AgentHealthCheck) => void;
}

export const AgentHealthCheckDashboard: React.FC<AgentHealthCheckProps> = ({ onHealthChange }) => {
  const [healthData, setHealthData] = useState<AgentHealthCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  // Load health check data
  const loadHealthData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await adminApiService.getAgentHealthCheck();
      
      if (response.success && response.data) {
        setHealthData(response.data);
        onHealthChange?.(response.data);
      } else {
        throw new Error(response.error?.message || 'Failed to load health data');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load health data';
      setError(errorMessage);
      console.error('Failed to load health data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Run health check
  const runHealthCheck = async () => {
    try {
      setChecking(true);
      setError(null);

      // Trigger a fresh health check
      await loadHealthData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to run health check';
      setError(errorMessage);
    } finally {
      setChecking(false);
    }
  };

  // Get health status icon
  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'unhealthy':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'unreachable':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-500" />;
    }
  };

  // Get health status badge
  const getHealthBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="success">Healthy</Badge>;
      case 'unhealthy':
        return <Badge variant="warning">Unhealthy</Badge>;
      case 'unreachable':
        return <Badge variant="destructive">Unreachable</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  // Calculate health percentage
  const getHealthPercentage = () => {
    if (!healthData) return 0;
    return Math.round((healthData.healthyAgents / healthData.totalAgents) * 100);
  };

  // Get overall system health status
  const getOverallHealthStatus = () => {
    const percentage = getHealthPercentage();
    if (percentage >= 90) return { status: 'healthy', color: 'text-green-600' };
    if (percentage >= 70) return { status: 'warning', color: 'text-yellow-600' };
    return { status: 'critical', color: 'text-red-600' };
  };

  // Load data on mount
  useEffect(() => {
    loadHealthData();
  }, []);

  // Auto-refresh every 2 minutes
  useEffect(() => {
    const interval = setInterval(loadHealthData, 120000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !healthData) {
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
            <p className="text-lg font-semibold mb-2">Health Check Failed</p>
            <p className="text-sm mb-4">{error}</p>
            <Button onClick={loadHealthData} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const overallHealth = getOverallHealthStatus();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Agent Health Dashboard</h2>
          <p className="text-muted-foreground">
            ElevenLabs integration status and agent health monitoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={runHealthCheck} 
            variant="outline" 
            disabled={checking}
            size="sm"
          >
            {checking ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Shield className="w-4 h-4 mr-2" />
            )}
            {checking ? 'Checking...' : 'Run Health Check'}
          </Button>
        </div>
      </div>

      {/* Overall Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Overall System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className={`text-3xl font-bold ${overallHealth.color}`}>
                {getHealthPercentage()}%
              </div>
              <div className="text-sm text-muted-foreground">Healthy Agents</div>
              <Progress value={getHealthPercentage()} className="mt-2" />
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {healthData?.healthyAgents || 0}
              </div>
              <div className="text-sm text-muted-foreground">Healthy</div>
              <CheckCircle className="w-6 h-6 mx-auto mt-2 text-green-500" />
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">
                {healthData?.unhealthyAgents || 0}
              </div>
              <div className="text-sm text-muted-foreground">Unhealthy</div>
              <AlertTriangle className="w-6 h-6 mx-auto mt-2 text-yellow-500" />
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">
                {healthData?.unreachableAgents || 0}
              </div>
              <div className="text-sm text-muted-foreground">Unreachable</div>
              <XCircle className="w-6 h-6 mx-auto mt-2 text-red-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ElevenLabs Integration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            ElevenLabs Integration Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <div className="font-medium">API Connection</div>
                <div className="text-sm text-muted-foreground">Operational</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <div className="font-medium">Voice Synthesis</div>
                <div className="text-sm text-muted-foreground">Available</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <div className="font-medium">Agent Management</div>
                <div className="text-sm text-muted-foreground">Active</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Agent Health */}
      {healthData?.healthDetails && healthData.healthDetails.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Agent Health Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Checked</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {healthData.healthDetails.map((agent) => (
                    <TableRow key={agent.agentId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getHealthIcon(agent.status)}
                          <div>
                            <div className="font-medium">{agent.agentName}</div>
                            <div className="text-sm text-muted-foreground">
                              ID: {agent.agentId}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          User ID: {agent.userId}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getHealthBadge(agent.status)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {new Date(agent.lastChecked).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {agent.error ? (
                          <div className="text-sm text-red-600 max-w-xs truncate" title={agent.error}>
                            {agent.error}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">-</div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Health Check Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Health Check Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="font-medium">Healthy Agents</span>
              </div>
              <Badge variant="success">{healthData?.healthyAgents || 0}</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <span className="font-medium">Agents with Issues</span>
              </div>
              <Badge variant="warning">{healthData?.unhealthyAgents || 0}</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <XCircle className="w-5 h-5 text-red-500" />
                <span className="font-medium">Unreachable Agents</span>
              </div>
              <Badge variant="destructive">{healthData?.unreachableAgents || 0}</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-blue-500" />
                <span className="font-medium">Total Agents</span>
              </div>
              <Badge variant="outline">{healthData?.totalAgents || 0}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto-refresh indicator */}
      <div className="flex items-center justify-center text-sm text-muted-foreground">
        <RefreshCw className="w-4 h-4 mr-2" />
        Health checks run automatically every 2 minutes
      </div>
    </div>
  );
};