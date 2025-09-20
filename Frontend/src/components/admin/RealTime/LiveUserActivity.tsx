import React, { useState, useEffect } from 'react';
import { Users, Activity, Eye, EyeOff, Filter, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { ScrollArea } from '../../ui/scroll-area';
import { Switch } from '../../ui/switch';
import { useAdminWebSocket } from '../../../hooks/useAdminWebSocket';
import { formatDistanceToNow } from 'date-fns';

interface LiveUserActivityProps {
  className?: string;
  maxItems?: number;
}

export const LiveUserActivity: React.FC<LiveUserActivityProps> = ({
  className,
  maxItems = 50
}) => {
  const { userActivities, isConnected } = useAdminWebSocket();
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [filteredActivities, setFilteredActivities] = useState(userActivities);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [autoScroll, setAutoScroll] = useState(true);

  // Filter activities based on selected filter
  useEffect(() => {
    let filtered = userActivities;

    switch (selectedFilter) {
      case 'login':
        filtered = userActivities.filter(activity => 
          activity.action.toLowerCase().includes('login') ||
          activity.action.toLowerCase().includes('logout')
        );
        break;
      case 'agent':
        filtered = userActivities.filter(activity => 
          activity.action.toLowerCase().includes('agent') ||
          activity.action.toLowerCase().includes('call')
        );
        break;
      case 'billing':
        filtered = userActivities.filter(activity => 
          activity.action.toLowerCase().includes('credit') ||
          activity.action.toLowerCase().includes('payment') ||
          activity.action.toLowerCase().includes('billing')
        );
        break;
      case 'contact':
        filtered = userActivities.filter(activity => 
          activity.action.toLowerCase().includes('contact') ||
          activity.action.toLowerCase().includes('upload')
        );
        break;
      default:
        filtered = userActivities;
    }

    setFilteredActivities(filtered.slice(0, maxItems));
  }, [userActivities, selectedFilter, maxItems]);

  const getActivityIcon = (action: string) => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('login') || actionLower.includes('logout')) {
      return '🔐';
    }
    if (actionLower.includes('agent') || actionLower.includes('call')) {
      return '🤖';
    }
    if (actionLower.includes('credit') || actionLower.includes('payment')) {
      return '💳';
    }
    if (actionLower.includes('contact') || actionLower.includes('upload')) {
      return '📋';
    }
    return '📝';
  };

  const getActivityColor = (action: string) => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('error') || actionLower.includes('failed')) {
      return 'text-red-600';
    }
    if (actionLower.includes('success') || actionLower.includes('completed')) {
      return 'text-green-600';
    }
    if (actionLower.includes('warning') || actionLower.includes('pending')) {
      return 'text-yellow-600';
    }
    return 'text-gray-600';
  };

  const filterOptions = [
    { value: 'all', label: 'All Activities' },
    { value: 'login', label: 'Authentication' },
    { value: 'agent', label: 'Agent Actions' },
    { value: 'billing', label: 'Billing' },
    { value: 'contact', label: 'Contacts' }
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Live User Activity
            {isConnected && (
              <Badge variant="default" className="bg-green-100 text-green-800">
                <Activity className="h-3 w-3 mr-1" />
                Live
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMonitoring(!isMonitoring)}
            >
              {isMonitoring ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="text-sm border rounded px-2 py-1"
              >
                {filterOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm">Auto-scroll</label>
              <Switch
                checked={autoScroll}
                onCheckedChange={setAutoScroll}
                size="sm"
              />
            </div>
          </div>

          <Badge variant="outline">
            {filteredActivities.length} activities
          </Badge>
        </div>

        {/* Activity Feed */}
        {isMonitoring ? (
          <ScrollArea className="h-96">
            {filteredActivities.length > 0 ? (
              <div className="space-y-2">
                {filteredActivities.map((activity, index) => (
                  <div
                    key={`${activity.userId}-${activity.timestamp}-${index}`}
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="text-lg flex-shrink-0 mt-0.5">
                      {getActivityIcon(activity.action)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">
                          {activity.userEmail}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {activity.userId}
                        </Badge>
                      </div>
                      
                      <p className={`text-sm ${getActivityColor(activity.action)}`}>
                        {activity.action}
                      </p>
                      
                      {activity.details && (
                        <div className="mt-1 text-xs text-gray-500">
                          {typeof activity.details === 'string' 
                            ? activity.details 
                            : JSON.stringify(activity.details, null, 2)
                          }
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-shrink-0 text-right">
                      <div className="text-xs text-gray-500">
                        {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  {isConnected 
                    ? 'No recent user activity'
                    : 'Connect to view live activity'
                  }
                </p>
              </div>
            )}
          </ScrollArea>
        ) : (
          <div className="text-center py-8">
            <EyeOff className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              Activity monitoring paused
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMonitoring(true)}
              className="mt-2"
            >
              Resume Monitoring
            </Button>
          </div>
        )}

        {/* Connection Status */}
        {!isConnected && (
          <div className="text-center py-4 border-t">
            <Clock className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
            <p className="text-sm text-yellow-600">
              Waiting for real-time connection...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};