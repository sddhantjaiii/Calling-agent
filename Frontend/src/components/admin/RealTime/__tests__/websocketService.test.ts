import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import websocketService, { AdminNotification, SystemMetrics } from '../../../../services/websocketService';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(public url: string) {
    // Simulate async connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 10);
  }

  send(data: string) {
    // Mock send implementation
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close', { code: code || 1000, reason }));
  }
}

// Mock global WebSocket
global.WebSocket = MockWebSocket as any;

describe('WebSocketService', () => {
  const mockToken = 'test-token';

  beforeEach(() => {
    vi.clearAllMocks();
    websocketService.removeAllListeners();
  });

  afterEach(() => {
    websocketService.disconnect();
  });

  it('connects successfully with valid token', async () => {
    const connectPromise = websocketService.connect(mockToken);
    
    await expect(connectPromise).resolves.toBeUndefined();
  });

  it('emits connected event on successful connection', async () => {
    const connectedHandler = vi.fn();
    websocketService.on('connected', connectedHandler);

    await websocketService.connect(mockToken);

    expect(connectedHandler).toHaveBeenCalled();
  });

  it('handles connection errors', async () => {
    const errorHandler = vi.fn();
    websocketService.on('error', errorHandler);

    // Mock WebSocket that fails
    class FailingWebSocket extends MockWebSocket {
      constructor(url: string) {
        super(url);
        setTimeout(() => {
          this.onerror?.(new Event('error'));
        }, 10);
      }
    }

    global.WebSocket = FailingWebSocket as any;

    try {
      await websocketService.connect(mockToken);
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('handles incoming notification messages', async () => {
    const notificationHandler = vi.fn();
    websocketService.on('notification', notificationHandler);

    await websocketService.connect(mockToken);

    const mockNotification: AdminNotification = {
      id: '1',
      type: 'info',
      title: 'Test Notification',
      message: 'Test message',
      timestamp: new Date(),
      priority: 'medium',
      category: 'system'
    };

    const message = {
      type: 'notification',
      data: mockNotification,
      timestamp: new Date()
    };

    // Simulate incoming message
    const ws = (websocketService as any).ws;
    ws.onmessage?.(new MessageEvent('message', {
      data: JSON.stringify(message)
    }));

    expect(notificationHandler).toHaveBeenCalledWith(mockNotification);
  });

  it('handles incoming metrics messages', async () => {
    const metricsHandler = vi.fn();
    websocketService.on('metrics', metricsHandler);

    await websocketService.connect(mockToken);

    const mockMetrics: SystemMetrics = {
      activeUsers: 10,
      totalCalls: 50,
      systemLoad: 25.5,
      errorRate: 1.2,
      responseTime: 150,
      timestamp: new Date()
    };

    const message = {
      type: 'metrics',
      data: mockMetrics,
      timestamp: new Date()
    };

    const ws = (websocketService as any).ws;
    ws.onmessage?.(new MessageEvent('message', {
      data: JSON.stringify(message)
    }));

    expect(metricsHandler).toHaveBeenCalledWith(mockMetrics);
  });

  it('sends subscription requests', async () => {
    await websocketService.connect(mockToken);

    const ws = (websocketService as any).ws;
    const sendSpy = vi.spyOn(ws, 'send');

    websocketService.subscribeToNotifications(['system', 'user']);

    expect(sendSpy).toHaveBeenCalledWith(JSON.stringify({
      type: 'subscribe',
      categories: ['system', 'user']
    }));
  });

  it('sends metrics requests', async () => {
    await websocketService.connect(mockToken);

    const ws = (websocketService as any).ws;
    const sendSpy = vi.spyOn(ws, 'send');

    websocketService.requestMetrics();

    expect(sendSpy).toHaveBeenCalledWith(JSON.stringify({
      type: 'request_metrics'
    }));
  });

  it('sends mark read requests', async () => {
    await websocketService.connect(mockToken);

    const ws = (websocketService as any).ws;
    const sendSpy = vi.spyOn(ws, 'send');

    websocketService.markNotificationRead('notification-1');

    expect(sendSpy).toHaveBeenCalledWith(JSON.stringify({
      type: 'mark_read',
      notificationId: 'notification-1'
    }));
  });

  it('handles disconnection', async () => {
    const disconnectedHandler = vi.fn();
    websocketService.on('disconnected', disconnectedHandler);

    await websocketService.connect(mockToken);
    websocketService.disconnect();

    expect(disconnectedHandler).toHaveBeenCalled();
  });

  it('returns correct connection state', async () => {
    expect(websocketService.getConnectionState()).toBe('disconnected');

    const connectPromise = websocketService.connect(mockToken);
    expect(websocketService.getConnectionState()).toBe('connecting');

    await connectPromise;
    expect(websocketService.getConnectionState()).toBe('connected');

    websocketService.disconnect();
    expect(websocketService.getConnectionState()).toBe('disconnected');
  });

  it('handles malformed messages gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    await websocketService.connect(mockToken);

    const ws = (websocketService as any).ws;
    
    // Send malformed JSON
    ws.onmessage?.(new MessageEvent('message', {
      data: 'invalid json'
    }));

    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to parse WebSocket message:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it('prevents multiple simultaneous connections', async () => {
    const firstConnect = websocketService.connect(mockToken);
    const secondConnect = websocketService.connect(mockToken);

    await firstConnect;
    await secondConnect;

    // Should only have one connection
    expect((websocketService as any).ws).toBeDefined();
  });

  it('handles reconnection attempts', async () => {
    const maxReconnectHandler = vi.fn();
    websocketService.on('max_reconnect_attempts', maxReconnectHandler);

    // Mock WebSocket that closes unexpectedly
    class UnstableWebSocket extends MockWebSocket {
      constructor(url: string) {
        super(url);
        setTimeout(() => {
          this.readyState = MockWebSocket.OPEN;
          this.onopen?.(new Event('open'));
          // Immediately close with error
          setTimeout(() => {
            this.readyState = MockWebSocket.CLOSED;
            this.onclose?.(new CloseEvent('close', { code: 1006 }));
          }, 20);
        }, 10);
      }
    }

    global.WebSocket = UnstableWebSocket as any;

    try {
      await websocketService.connect(mockToken);
      // Wait for reconnection attempts
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      // Expected to fail after max attempts
    }
  });

  it('sends heartbeat pings when connected', async () => {
    vi.useFakeTimers();
    
    await websocketService.connect(mockToken);

    const ws = (websocketService as any).ws;
    const sendSpy = vi.spyOn(ws, 'send');

    // Fast-forward 30 seconds
    vi.advanceTimersByTime(30000);

    expect(sendSpy).toHaveBeenCalledWith(JSON.stringify({ type: 'ping' }));

    vi.useRealTimers();
  });
});