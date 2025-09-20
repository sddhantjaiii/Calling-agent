import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Download, Filter, RefreshCw } from 'lucide-react';
import { SystemMetrics } from './SystemMetrics';
import { UsageCharts } from './UsageCharts';
import { ReportGenerator } from './ReportGenerator';
import { useAdminAnalytics } from '@/hooks/useAdminAnalytics';
import { AdminCard } from '../shared/AdminCard';
import LoadingSpinner from '@/components/ui/LoadingStates';
import { ErrorHandler } from '@/components/ui/ErrorHandler';

interface AnalyticsDashboardProps {
  className?: string;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface AnalyticsFilters {
  dateRange: DateRange;
  userTier?: string;
  agentType?: string;
  region?: string;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ className }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'usage' | 'reports'>('overview');
  const [filters, setFilters] = useState<AnalyticsFilters>({
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      end: new Date()
    }
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    data: analyticsData,
    isLoading,
    error,
    refetch
  } = useAdminAnalytics(filters);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const handleDateRangeChange = (range: DateRange) => {
    setFilters(prev => ({ ...prev, dateRange: range }));
  };

  const handleFilterChange = (key: keyof AnalyticsFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorHandler
        error={error}
        onRetry={refetch}
        title="Failed to load analytics data"
      />
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive platform metrics and reporting
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="text-sm font-medium">Date Range:</span>
                <span className="text-sm text-muted-foreground">
                  {filters.dateRange.start.toLocaleDateString()} - {filters.dateRange.end.toLocaleDateString()}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDateRangeChange({
                    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                    end: new Date()
                  })}
                >
                  Last 7 days
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDateRangeChange({
                    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    end: new Date()
                  })}
                >
                  Last 30 days
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDateRangeChange({
                    start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
                    end: new Date()
                  })}
                >
                  Last 90 days
                </Button>
              </div>
            </div>
            
            <Select
              value={filters.userTier || 'all'}
              onValueChange={(value) => handleFilterChange('userTier', value === 'all' ? '' : value)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="User Tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.agentType || 'all'}
              onValueChange={(value) => handleFilterChange('agentType', value === 'all' ? '' : value)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Agent Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="support">Support</SelectItem>
                <SelectItem value="survey">Survey</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === 'overview' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </Button>
        <Button
          variant={activeTab === 'usage' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('usage')}
        >
          Usage Patterns
        </Button>
        <Button
          variant={activeTab === 'reports' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('reports')}
        >
          Reports
        </Button>
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <SystemMetrics
          data={analyticsData}
          filters={filters}
          onRefresh={handleRefresh}
        />
      )}

      {activeTab === 'usage' && (
        <UsageCharts
          data={analyticsData}
          filters={filters}
          onDateRangeChange={handleDateRangeChange}
        />
      )}

      {activeTab === 'reports' && (
        <ReportGenerator
          data={analyticsData}
          filters={filters}
        />
      )}
    </div>
  );
};

export default AnalyticsDashboard;