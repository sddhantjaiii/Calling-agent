import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import websocketService, { AdminNotification, SystemMetrics, UserActivity } from '../services/websocketService';

export interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'error';
}

export interface AdminWebSocketData {
  notifications: AdminNotification[];
  metrics: SystemMetrics | null;
  userActivities: UserActivity[];
  systemStatus: any;
  agentStatus: any;
}

export const useAdminWebSocket = () => {
  const { user, token } = useAuth();
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    connectionState: 'disconnected'
  });

  const [data, setData] = useState<AdminWebSocketData>({
    notifications: [],
    metrics: null,
    userActivities: [],
    systemStatus: null,
    agentStatus: null
  });

  const notificationsRef = useRef<AdminNotification[]>([]);
  const userActivitiesRef = useRef<UserActivity[]>([]);

  // Check if user is admin
  const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');

  const connect = useCallback(async () => {
    if (!isAdmin || !token || state.isConnecting) return;

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      await websocketService.connect(token);
    } catch (error) {
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      }));
    }
  }, [isAdmin, token, state.isConnecting]);

  const disconnect = useCallback(() => {
    websocketService.disconnect();
  }, []);

  const addNotification = useCallback((notification: AdminNotification) => {
    notificationsRef.current = [notification, ...notificationsRef.current].slice(0, 100); // Keep last 100
    setData(prev => ({
      ...prev,
      notifications: [...notificationsRef.current]
    }));
  }, []);

  const addUserActivity = useCallback((activity: UserActivity) => {
    userActivitiesRef.current = [activity, ...userActivitiesRef.current].slice(0, 50); // Keep last 50
    setData(prev => ({
      ...prev,
      userActivities: [...userActivitiesRef.current]
    }));
  }, []);

  const markNotificationRead = useCallback((notificationId: string) => {
    notificationsRef.current = notificationsRef.current.map(notification =>
      notification.id === notificationId
        ? { ...notification, read: true }
        : notification
    );
    setData(prev => ({
      ...prev,
      notifications: [...notificationsRef.current]
    }));
    websocketService.markNotificationRead(notificationId);
  }, []);

  const clearNotifications = useCallback(() => {
    notificationsRef.current = [];
    setData(prev => ({
      ...prev,
      notifications: []
    }));
  }, []);

  const requestMetrics = useCallback(() => {
    websocketService.requestMetrics();
  }, []);

  const subscribeToCategories = useCallback((categories: string[]) => {
    websocketService.subscribeToNotifications(categories);
  }, []);

  // Setup event listeners
  useEffect(() => {
    const handleConnected = () => {
      setState(prev => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        error: null,
        connectionState: 'connected'
      }));
    };

    const handleDisconnected = () => {
      setState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        connectionState: 'disconnected'
      }));
    };

    const handleError = (error: any) => {
      setState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        error: error?.message || 'WebSocket error',
        connectionState: 'error'
      }));
    };

    const handleNotification = (notification: AdminNotification) => {
      addNotification(notification);
    };

    const handleMetrics = (metrics: SystemMetrics) => {
      setData(prev => ({
        ...prev,
        metrics
      }));
    };

    const handleUserActivity = (activity: UserActivity) => {
      addUserActivity(activity);
    };

    const handleSystemStatus = (status: any) => {
      setData(prev => ({
        ...prev,
        systemStatus: status
      }));
    };

    const handleAgentStatus = (status: any) => {
      setData(prev => ({
        ...prev,
        agentStatus: status
      }));
    };

    const handleMaxReconnectAttempts = () => {
      setState(prev => ({
        ...prev,
        error: 'Failed to reconnect after multiple attempts',
        connectionState: 'error'
      }));
    };

    // Add event listeners
    websocketService.on('connected', handleConnected);
    websocketService.on('disconnected', handleDisconnected);
    websocketService.on('error', handleError);
    websocketService.on('notification', handleNotification);
    websocketService.on('metrics', handleMetrics);
    websocketService.on('user_activity', handleUserActivity);
    websocketService.on('system_status', handleSystemStatus);
    websocketService.on('agent_status', handleAgentStatus);
    websocketService.on('max_reconnect_attempts', handleMaxReconnectAttempts);

    return () => {
      websocketService.off('connected', handleConnected);
      websocketService.off('disconnected', handleDisconnected);
      websocketService.off('error', handleError);
      websocketService.off('notification', handleNotification);
      websocketService.off('metrics', handleMetrics);
      websocketService.off('user_activity', handleUserActivity);
      websocketService.off('system_status', handleSystemStatus);
      websocketService.off('agent_status', handleAgentStatus);
      websocketService.off('max_reconnect_attempts', handleMaxReconnectAttempts);
    };
  }, [addNotification, addUserActivity]);

  // Auto-connect when user is admin
  useEffect(() => {
    if (isAdmin && token && !state.isConnected && !state.isConnecting) {
      connect();
    }
  }, [isAdmin, token, state.isConnected, state.isConnecting, connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Subscribe to all categories by default
  useEffect(() => {
    if (state.isConnected) {
      subscribeToCategories(['system', 'user', 'agent', 'security', 'billing']);
      requestMetrics();
    }
  }, [state.isConnected, subscribeToCategories, requestMetrics]);

  return {
    ...state,
    ...data,
    connect,
    disconnect,
    markNotificationRead,
    clearNotifications,
    requestMetrics,
    subscribeToCategories,
    unreadNotificationCount: data.notifications.filter(n => !n.read).length,
    criticalNotificationCount: data.notifications.filter(n => n.priority === 'critical' && !n.read).length
  };
};