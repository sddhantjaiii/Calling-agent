// Browser-compatible EventEmitter implementation
class EventEmitter {
  private events: { [key: string]: Function[] } = {};
  private maxListeners: number = 10;

  on(event: string, listener: Function) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  emit(event: string, ...args: any[]) {
    if (this.events[event]) {
      this.events[event].forEach(listener => listener(...args));
    }
  }

  off(event: string, listener: Function) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(l => l !== listener);
    }
  }

  setMaxListeners(max: number) {
    this.maxListeners = max;
  }
}

export interface AdminNotification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'system' | 'user' | 'agent' | 'security' | 'billing';
  data?: any;
  read?: boolean;
}

export interface SystemMetrics {
  activeUsers: number;
  totalCalls: number;
  systemLoad: number;
  errorRate: number;
  responseTime: number;
  timestamp: Date;
}

export interface UserActivity {
  userId: string;
  userEmail: string;
  action: string;
  timestamp: Date;
  details?: any;
}

export interface WebSocketMessage {
  type: 'notification' | 'metrics' | 'user_activity' | 'system_status' | 'agent_status';
  data: AdminNotification | SystemMetrics | UserActivity | any;
  timestamp: Date;
}

import { getWsBaseUrl } from '@/config/api';

class WebSocketService extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private isAuthenticated = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.setMaxListeners(50); // Increase max listeners for admin panel
  }

  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.CONNECTING)) {
        return;
      }

      this.isConnecting = true;
      
      try {
  const base = import.meta.env.VITE_WS_URL || getWsBaseUrl();
  const wsUrl = `${base}/admin/ws?token=${token}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('Admin WebSocket connected');
          this.isConnecting = false;
          this.isAuthenticated = true;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.emit('connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('Admin WebSocket disconnected:', event.code, event.reason);
          this.isConnecting = false;
          this.isAuthenticated = false;
          this.stopHeartbeat();
          this.emit('disconnected', event);
          
          if (event.code !== 1000) { // Not a normal closure
            this.scheduleReconnect(token);
          }
        };

        this.ws.onerror = (error) => {
          console.error('Admin WebSocket error:', error);
          this.isConnecting = false;
          this.emit('error', error);
          reject(error);
        };

        // Timeout for connection
        setTimeout(() => {
          if (this.isConnecting) {
            this.isConnecting = false;
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000);

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  private handleMessage(message: WebSocketMessage) {
    switch (message.type) {
      case 'notification':
        this.emit('notification', message.data as AdminNotification);
        break;
      case 'metrics':
        this.emit('metrics', message.data as SystemMetrics);
        break;
      case 'user_activity':
        this.emit('user_activity', message.data as UserActivity);
        break;
      case 'system_status':
        this.emit('system_status', message.data);
        break;
      case 'agent_status':
        this.emit('agent_status', message.data);
        break;
      default:
        console.warn('Unknown WebSocket message type:', message.type);
    }
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Send ping every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private scheduleReconnect(token: string) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('max_reconnect_attempts');
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    console.log(`Scheduling reconnection in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect(token).catch(() => {
        // Reconnection failed, will be handled by onclose
      });
    }, delay);
  }

  disconnect() {
    this.stopHeartbeat();
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }

    this.isAuthenticated = false;
    this.reconnectAttempts = 0;
  }

  send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isAuthenticated) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected or not authenticated');
    }
  }

  getConnectionState(): 'connecting' | 'connected' | 'disconnected' | 'error' {
    if (this.isConnecting) return 'connecting';
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isAuthenticated) return 'connected';
    if (this.ws && this.ws.readyState === WebSocket.CONNECTING) return 'connecting';
    return 'disconnected';
  }

  // Subscribe to specific notification types
  subscribeToNotifications(categories: string[]) {
    this.send({
      type: 'subscribe',
      categories
    });
  }

  // Request current system metrics
  requestMetrics() {
    this.send({
      type: 'request_metrics'
    });
  }

  // Mark notification as read
  markNotificationRead(notificationId: string) {
    this.send({
      type: 'mark_read',
      notificationId
    });
  }
}

export const websocketService = new WebSocketService();
export default websocketService;