import { useState, useEffect } from 'react';
import { Bell, X, ExternalLink, Calendar, Phone, Mail, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTheme } from '@/components/theme/ThemeProvider';
import { apiService } from '@/services/apiService';
import type { Notification } from '@/types/api';
import { formatDistanceToNow } from 'date-fns';

interface NotificationDropdownProps {
  onNavigateToLeadIntelligence: () => void;
}

const NotificationDropdown = ({ onNavigateToLeadIntelligence }: NotificationDropdownProps) => {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await apiService.getNotifications();
      if (response.success && response.data) {
        setNotifications(response.data.notifications);
        setUnreadCount(response.data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await apiService.markNotificationAsRead(notificationId);
      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, isRead: true }
            : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    
    // Navigate to lead intelligence tab
    onNavigateToLeadIntelligence();
    setIsOpen(false);
  };

  useEffect(() => {
    // Load notifications when component mounts
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const getNotificationIcon = (notification: Notification) => {
    if (notification.demoBookDateTime) {
      return <Calendar className="w-4 h-4 text-blue-500" />;
    }
    if (notification.phoneNumber) {
      return <Phone className="w-4 h-4 text-green-500" />;
    }
    if (notification.email) {
      return <Mail className="w-4 h-4 text-purple-500" />;
    }
    return <User className="w-4 h-4 text-gray-500" />;
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return 'bg-red-100 text-red-800 border-red-200';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 relative ${
          theme === "dark"
            ? "text-slate-300 hover:text-white hover:bg-slate-700"
            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        }`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div
            className={`absolute right-0 mt-2 w-96 rounded-lg shadow-lg border z-50 ${
              theme === "dark"
                ? "bg-black border-slate-700"
                : "bg-white border-gray-200"
            }`}
          >
            <div className="p-4 border-b border-gray-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Smart Notifications</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="p-1 h-8 w-8"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <ScrollArea className="max-h-96">
              {loading ? (
                <div className="p-4 text-center text-gray-500">
                  Loading notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No notifications yet
                </div>
              ) : (
                <div className="p-2">
                  {notifications.map((notification) => (
                    <Card
                      key={notification.id}
                      className={`mb-2 cursor-pointer transition-all duration-200 ${
                        notification.isRead
                          ? theme === "dark"
                            ? "bg-slate-800/50 hover:bg-slate-700/70 border-slate-600 opacity-75"
                            : "bg-gray-50/50 hover:bg-gray-100/70 border-gray-200 opacity-75"
                          : theme === "dark"
                          ? "bg-blue-900/30 hover:bg-blue-900/40 border-blue-600 shadow-lg shadow-blue-900/20"
                          : "bg-blue-50 hover:bg-blue-100 border-blue-300 shadow-lg shadow-blue-100"
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-1">
                            {getNotificationIcon(notification)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className={`text-sm font-medium truncate ${
                                notification.isRead
                                  ? "text-gray-600 dark:text-gray-400"
                                  : "text-gray-900 dark:text-white font-semibold"
                              }`}>
                                {notification.smartNotification}
                              </p>
                              {!notification.isRead && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 animate-pulse" />
                              )}
                            </div>
                            
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${getScoreBadgeColor(notification.totalScore)}`}
                              >
                                Score: {notification.totalScore}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {notification.leadType}
                              </Badge>
                            </div>
                            
                            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                              {notification.phoneNumber && (
                                <div className="flex items-center space-x-1">
                                  <Phone className="w-3 h-3" />
                                  <span>{notification.phoneNumber}</span>
                                </div>
                              )}
                              {notification.email && (
                                <div className="flex items-center space-x-1">
                                  <Mail className="w-3 h-3" />
                                  <span className="truncate">{notification.email}</span>
                                </div>
                              )}
                              {notification.demoBookDateTime && (
                                <div className="flex items-center space-x-1">
                                  <Calendar className="w-3 h-3" />
                                  <span>
                                    Demo: {formatDistanceToNow(new Date(notification.demoBookDateTime), { addSuffix: true })}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            <div className="text-xs text-gray-400 mt-1">
                              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                            </div>
                          </div>
                          
                          <div className="flex-shrink-0">
                            <ExternalLink className="w-4 h-4 text-gray-400" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>

            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-200 dark:border-slate-700">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onNavigateToLeadIntelligence}
                  className="w-full"
                >
                  View All in Lead Intelligence
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationDropdown;
