import React, { useState, useEffect } from 'react';
import { CalendarIcon, X, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { Calendar } from '../../ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Separator } from '../../ui/separator';
import { cn } from '../../../lib/utils';
import type { AuditLogFilters, DateRange } from '../../../types/admin';

interface AuditLogFilterProps {
  filters: AuditLogFilters;
  onFiltersChange: (filters: AuditLogFilters) => void;
  className?: string;
}

export const AuditLogFilter: React.FC<AuditLogFilterProps> = ({
  filters,
  onFiltersChange,
  className,
}) => {
  const [localFilters, setLocalFilters] = useState<AuditLogFilters>(filters);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(filters.dateRange);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Common action types for filtering
  const actionTypes = [
    'user.create',
    'user.update',
    'user.delete',
    'user.credits.adjust',
    'agent.create',
    'agent.update',
    'agent.delete',
    'agent.bulk.action',
    'system.config.update',
    'api.key.create',
    'api.key.update',
    'api.key.delete',
    'feature.flag.update',
    'auth.login',
    'auth.logout',
    'auth.failed',
  ];

  // Common resource types
  const resourceTypes = [
    'user',
    'agent',
    'system',
    'api_key',
    'feature_flag',
    'audit_log',
    'report',
    'message',
    'ticket',
  ];

  // Update local filters when props change
  useEffect(() => {
    setLocalFilters(filters);
    setDateRange(filters.dateRange);
  }, [filters]);

  // Handle filter changes
  const handleFilterChange = (key: keyof AuditLogFilters, value: unknown) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
  };

  // Handle date range changes
  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    const newFilters = { ...localFilters, dateRange: range };
    setLocalFilters(newFilters);
  };

  // Apply filters
  const applyFilters = () => {
    onFiltersChange(localFilters);
  };

  // Clear filters
  const clearFilters = () => {
    const clearedFilters: AuditLogFilters = {};
    setLocalFilters(clearedFilters);
    setDateRange(undefined);
    onFiltersChange(clearedFilters);
  };

  // Get active filter count
  const getActiveFilterCount = () => {
    let count = 0;
    if (localFilters.adminUserId) count++;
    if (localFilters.action) count++;
    if (localFilters.resourceType) count++;
    if (localFilters.targetUserId) count++;
    if (localFilters.dateRange) count++;
    if (localFilters.success !== undefined) count++;
    if (localFilters.search) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFilterCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear All
            </Button>
            <Button size="sm" onClick={applyFilters}>
              Apply Filters
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Admin User Filter */}
          <div className="space-y-2">
            <Label htmlFor="adminUserId">Admin User ID</Label>
            <Input
              id="adminUserId"
              placeholder="Enter admin user ID..."
              value={localFilters.adminUserId || ''}
              onChange={(e) => handleFilterChange('adminUserId', e.target.value || undefined)}
            />
          </div>

          {/* Action Filter */}
          <div className="space-y-2">
            <Label htmlFor="action">Action Type</Label>
            <Select
              value={localFilters.action || 'all'}
              onValueChange={(value) => handleFilterChange('action', value === 'all' ? undefined : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select action type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {actionTypes.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Resource Type Filter */}
          <div className="space-y-2">
            <Label htmlFor="resourceType">Resource Type</Label>
            <Select
              value={localFilters.resourceType || 'all'}
              onValueChange={(value) => handleFilterChange('resourceType', value === 'all' ? undefined : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select resource type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resources</SelectItem>
                {resourceTypes.map((resource) => (
                  <SelectItem key={resource} value={resource}>
                    {resource.replace('_', ' ').toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Target User Filter */}
          <div className="space-y-2">
            <Label htmlFor="targetUserId">Target User ID</Label>
            <Input
              id="targetUserId"
              placeholder="Enter target user ID..."
              value={localFilters.targetUserId || ''}
              onChange={(e) => handleFilterChange('targetUserId', e.target.value || undefined)}
            />
          </div>

          {/* Success Status Filter */}
          <div className="space-y-2">
            <Label htmlFor="success">Status</Label>
            <Select
              value={localFilters.success === undefined ? 'all' : localFilters.success.toString()}
              onValueChange={(value) => {
                if (value === 'all') {
                  handleFilterChange('success', undefined);
                } else {
                  handleFilterChange('success', value === 'true');
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="true">Success</SelectItem>
                <SelectItem value="false">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Filter */}
          <div className="space-y-2">
            <Label>Date Range</Label>
            <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !dateRange && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.start ? (
                    dateRange.end ? (
                      <>
                        {format(dateRange.start, 'LLL dd, y')} -{' '}
                        {format(dateRange.end, 'LLL dd, y')}
                      </>
                    ) : (
                      format(dateRange.start, 'LLL dd, y')
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.start}
                  selected={dateRange}
                  onSelect={handleDateRangeChange}
                  numberOfMonths={2}
                />
                <div className="p-3 border-t">
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleDateRangeChange(undefined);
                        setShowDatePicker(false);
                      }}
                    >
                      Clear
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setShowDatePicker(false)}
                    >
                      Done
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <Separator />

        {/* Search Filter */}
        <div className="space-y-2">
          <Label htmlFor="search">Search in Details</Label>
          <Input
            id="search"
            placeholder="Search in log details, IP addresses, user agents..."
            value={localFilters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value || undefined)}
          />
        </div>

        {/* Active Filters Display */}
        {activeFilterCount > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label>Active Filters</Label>
              <div className="flex flex-wrap gap-2">
                {localFilters.adminUserId && (
                  <Badge variant="secondary" className="flex items-center space-x-1">
                    <span>Admin: {localFilters.adminUserId}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => handleFilterChange('adminUserId', undefined)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
                {localFilters.action && (
                  <Badge variant="secondary" className="flex items-center space-x-1">
                    <span>Action: {localFilters.action}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => handleFilterChange('action', undefined)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
                {localFilters.resourceType && (
                  <Badge variant="secondary" className="flex items-center space-x-1">
                    <span>Resource: {localFilters.resourceType}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => handleFilterChange('resourceType', undefined)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
                {localFilters.targetUserId && (
                  <Badge variant="secondary" className="flex items-center space-x-1">
                    <span>Target: {localFilters.targetUserId}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => handleFilterChange('targetUserId', undefined)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
                {localFilters.success !== undefined && (
                  <Badge variant="secondary" className="flex items-center space-x-1">
                    <span>Status: {localFilters.success ? 'Success' : 'Failed'}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => handleFilterChange('success', undefined)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
                {dateRange && (
                  <Badge variant="secondary" className="flex items-center space-x-1">
                    <span>
                      Date: {format(dateRange.start, 'MMM dd')}
                      {dateRange.end && ` - ${format(dateRange.end, 'MMM dd')}`}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => handleDateRangeChange(undefined)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
                {localFilters.search && (
                  <Badge variant="secondary" className="flex items-center space-x-1">
                    <span>Search: {localFilters.search}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => handleFilterChange('search', undefined)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AuditLogFilter;