import React, { useState } from 'react';
import { Bell, X, AlertTriangle, Info, CheckCircle, XCircle, Filter, Check } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { ScrollArea } from '../../ui/scroll-area';
import { Separator } from '../../ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { AdminNotification } from '../../../services/websocketService';
import { useAdminWebSocket } from '../../../hooks/useAdminWebSocket';
import { formatDistanceToNow } from 'date-fns';

interface AdminNotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

const getNotificationIcon = (type: AdminNotification['type']) => {
  switch (type) {
    case 'error':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'info':
    default:
      return <Info className="h-4 w-4 text-blue-500" />;
  }
};

const getPriorityColor = (priority: AdminNotification['priority']) => {
  switch (priority) {
    case 'critical':
      return 'bg-red-100 border-red-200 text-red-800';
    case 'high':
      return 'bg-orange-100 border-orange-200 text-orange-800';
    case 'medium':
      return 'bg-yellow-100 border-yellow-200 text-yellow-800';
    case 'low':
    default:
      return 'bg-gray-100 border-gray-200 text-gray-800';
  }
};

const getCategoryColor = (category: AdminNotification['category']) => {
  switch (category) {
    case 'security':
      return 'bg-red-500';
    case 'system':
      return 'bg-blue-500';
    case 'user':
      return 'bg-green-500';
    case 'agent':
      return 'bg-purple-500';
    case 'billing':
      return 'bg-yellow-500';
    default:
      return 'bg-gray-500';
  }
};

export const AdminNotificationCenter: React.FC<AdminNotificationCenterProps> = ({
  isOpen,
  onClose
}) => {
  const {
    notifications,
    markNotificationRead,
    clearNotifications,
    unreadNotificationCount
  } = useAdminWebSocket();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');

  const filteredNotifications = notifications.filter(notification => {
    const categoryMatch = selectedCategory === 'all' || notification.category === selectedCategory;
    const priorityMatch = selectedPriority === 'all' || notification.priority === selectedPriority;
    return categoryMatch && priorityMatch;
  });

  const unreadNotifications = filteredNotifications.filter(n => !n.read);
  const readNotifications = filteredNotifications.filter(n => n.read);

  const handleMarkAllRead = () => {
    unreadNotifications.forEach(notification => {
      markNotificationRead(notification.id);
    });
  };

  const categories = ['all', 'system', 'user', 'agent', 'security', 'billing'];
  const priorities = ['all', 'critical', 'high', 'medium', 'low'];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-end">
      <Card className="w-96 h-full m-4 shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
            {unreadNotificationCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadNotificationCount}
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {/* Filters */}
          <div className="p-4 border-b">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Filters</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-sm border rounded px-2 py-1"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>

              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="text-sm border rounded px-2 py-1"
              >
                {priorities.map(priority => (
                  <option key={priority} value={priority}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {unreadNotificationCount > 0 && (
              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllRead}
                  className="flex-1"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Mark All Read
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearNotifications}
                  className="flex-1"
                >
                  Clear All
                </Button>
              </div>
            )}
          </div>

          {/* Notification Tabs */}
          <Tabs defaultValue="unread" className="h-full">
            <TabsList className="grid w-full grid-cols-2 m-4 mb-0">
              <TabsTrigger value="unread">
                Unread ({unreadNotifications.length})
              </TabsTrigger>
              <TabsTrigger value="all">
                All ({filteredNotifications.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="unread" className="mt-0">
              <ScrollArea className="h-[calc(100vh-200px)]">
                {unreadNotifications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No unread notifications</p>
                  </div>
                ) : (
                  <div className="space-y-2 p-4">
                    {unreadNotifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onMarkRead={markNotificationRead}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="all" className="mt-0">
              <ScrollArea className="h-[calc(100vh-200px)]">
                {filteredNotifications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No notifications</p>
                  </div>
                ) : (
                  <div className="space-y-2 p-4">
                    {filteredNotifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onMarkRead={markNotificationRead}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

interface NotificationItemProps {
  notification: AdminNotification;
  onMarkRead: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkRead
}) => {
  const handleClick = () => {
    if (!notification.read) {
      onMarkRead(notification.id);
    }
  };

  return (
    <div
      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
        notification.read
          ? 'bg-gray-50 border-gray-200'
          : 'bg-white border-blue-200 shadow-sm'
      } ${getPriorityColor(notification.priority)}`}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getNotificationIcon(notification.type)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-medium truncate">
              {notification.title}
            </h4>
            <div
              className={`w-2 h-2 rounded-full ${getCategoryColor(notification.category)}`}
              title={notification.category}
            />
          </div>

          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
            {notification.message}
          </p>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
            </span>

            <div className="flex items-center gap-1">
              <Badge
                variant="outline"
                className={`text-xs ${getPriorityColor(notification.priority)}`}
              >
                {notification.priority}
              </Badge>
              {!notification.read && (
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};