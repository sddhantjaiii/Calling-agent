import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { Calendar, TrendingUp, Users, Phone, Bot } from 'lucide-react';
import { AnalyticsFilters, DateRange } from './AnalyticsDashboard';

interface UsageChartsProps {
  data: any;
  filters: AnalyticsFilters;
  onDateRangeChange: (range: DateRange) => void;
}

type ChartType = 'line' | 'area' | 'bar' | 'pie';
type MetricType = 'users' | 'calls' | 'agents' | 'revenue';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const UsageCharts: React.FC<UsageChartsProps> = ({ 
  data, 
  filters, 
  onDateRangeChange 
}) => {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('users');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  // Get data from backend API response
  const usageData = data?.usage || [];
  const userTierData = data?.userTiers || [];
  const agentTypeData = data?.agentTypes || [];
  const hourlyUsageData = data?.hourlyUsage || [];

  const renderChart = () => {
    const metricKey = selectedMetric;
    
    switch (chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={usageData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey={metricKey} 
                stroke="#0088FE" 
                strokeWidth={2}
                dot={{ fill: '#0088FE' }}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={usageData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area 
                type="monotone" 
                dataKey={metricKey} 
                stroke="#0088FE" 
                fill="#0088FE" 
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        );
      
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={usageData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={metricKey} fill="#0088FE" />
            </BarChart>
          </ResponsiveContainer>
        );
      
      default:
        return null;
    }
  };

  const getMetricLabel = (metric: MetricType) => {
    switch (metric) {
      case 'users': return 'Users';
      case 'calls': return 'Calls';
      case 'agents': return 'Agents';
      case 'revenue': return 'Revenue ($)';
      default: return metric;
    }
  };

  const getMetricIcon = (metric: MetricType) => {
    switch (metric) {
      case 'users': return Users;
      case 'calls': return Phone;
      case 'agents': return Bot;
      case 'revenue': return TrendingUp;
      default: return TrendingUp;
    }
  };

  return (
    <div className="space-y-6">
      {/* Chart Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Pattern Analysis</CardTitle>
          <CardDescription>
            Visualize platform usage patterns and trends over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Metric:</span>
              <Select value={selectedMetric} onValueChange={(value: MetricType) => setSelectedMetric(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="users">Users</SelectItem>
                  <SelectItem value="calls">Calls</SelectItem>
                  <SelectItem value="agents">Agents</SelectItem>
                  <SelectItem value="revenue">Revenue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Chart Type:</span>
              <Select value={chartType} onValueChange={(value: ChartType) => setChartType(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="line">Line</SelectItem>
                  <SelectItem value="area">Area</SelectItem>
                  <SelectItem value="bar">Bar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Timeframe:</span>
              <Select value={timeframe} onValueChange={(value: any) => setTimeframe(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">7 Days</SelectItem>
                  <SelectItem value="30d">30 Days</SelectItem>
                  <SelectItem value="90d">90 Days</SelectItem>
                  <SelectItem value="1y">1 Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {renderChart()}
        </CardContent>
      </Card>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Tier Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>User Tier Distribution</CardTitle>
            <CardDescription>
              Breakdown of users by subscription tier
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={userTierData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {userTierData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Agent Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Agent Type Distribution</CardTitle>
            <CardDescription>
              Breakdown of agents by type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={agentTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {agentTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Hourly Usage Pattern */}
      <Card>
        <CardHeader>
          <CardTitle>Hourly Usage Pattern</CardTitle>
          <CardDescription>
            Platform activity throughout the day
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={hourlyUsageData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="calls" 
                stackId="1"
                stroke="#0088FE" 
                fill="#0088FE" 
                fillOpacity={0.6}
              />
              <Area 
                type="monotone" 
                dataKey="users" 
                stackId="1"
                stroke="#00C49F" 
                fill="#00C49F" 
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Usage Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Summary</CardTitle>
          <CardDescription>
            Key insights from usage pattern analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {Math.max(...hourlyUsageData.map(d => d.calls))}
              </div>
              <div className="text-sm text-muted-foreground">Peak Calls/Hour</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {hourlyUsageData.find(d => d.calls === Math.max(...hourlyUsageData.map(d => d.calls)))?.hour}
              </div>
              <div className="text-sm text-muted-foreground">Peak Hour</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {(hourlyUsageData.reduce((sum, d) => sum + d.calls, 0) / hourlyUsageData.length).toFixed(0)}
              </div>
              <div className="text-sm text-muted-foreground">Avg Calls/Hour</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {userTierData.find(d => d.name === 'Pro')?.value || 0}%
              </div>
              <div className="text-sm text-muted-foreground">Pro Users</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};