import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useAdminWebSocket } from '../../../../hooks/useAdminWebSocket';
import { useAuth } from '../../../../contexts/AuthContext';
import websocketService from '../../../../services/websocketService';

// Mock dependencies
vi.mock('../../../../contexts/AuthContext');
vi.mock('../../../../services/websocketService');

const mockUseAuth = vi.mocked(useAuth);
const mockWebsocketService = vi.mocked(websocketService);

describe('useAdminWebSocket', () => {
  const mockUser = {
    id: 'admin1',
    email: 'admin@example.com',
    role: 'admin' as const,
    name: 'Admin User'
  };

  const mockToken = 'mock-jwt-token';

  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      token: mockToken,
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false
    });

    mockWebsocketService.connect = vi.fn().mockResolvedValue(undefined);
    mockWebsocketService.disconnect = vi.fn();
    mockWebsocketService.on = vi.fn();
    mockWebsocketService.off = vi.fn();
    mockWebsocketService.requestMetrics = vi.fn();
    mockWebsocketService.subscribeToNotifications = vi.fn();
    mockWebsocketService.markNotificationRead = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useAdminWebSocket());

    expect(result.current.isConnected).toBe(false);
    expect(result.current.isConnecting).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.connectionState).toBe('disconnected');
    expect(result.current.notifications).toEqual([]);
    expect(result.current.metrics).toBe(null);
    expect(result.current.userActivities).toEqual([]);
  });

  it('connects automatically when user is admin', async () => {
    renderHook(() => useAdminWebSocket());

    await waitFor(() => {
      expect(mockWebsocketService.connect).toHaveBeenCalledWith(mockToken);
    });
  });

  it('does not connect when user is not admin', () => {
    mockUseAuth.mockReturnValue({
      user: { ...mockUser, role: 'user' },
      token: mockToken,
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false
    });

    renderHook(() => useAdminWebSocket());

    expect(mockWebsocketService.connect).not.toHaveBeenCalled();
  });

  it('does not connect when no token available', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      token: null,
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false
    });

    renderHook(() => useAdminWebSocket());

    expect(mockWebsocketService.connect).not.toHaveBeenCalled();
  });

  it('sets up event listeners on mount', () => {
    renderHook(() => useAdminWebSocket());

    expect(mockWebsocketService.on).toHaveBeenCalledWith('connected', expect.any(Function));
    expect(mockWebsocketService.on).toHaveBeenCalledWith('disconnected', expect.any(Function));
    expect(mockWebsocketService.on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(mockWebsocketService.on).toHaveBeenCalledWith('notification', expect.any(Function));
    expect(mockWebsocketService.on).toHaveBeenCalledWith('metrics', expect.any(Function));
    expect(mockWebsocketService.on).toHaveBeenCalledWith('user_activity', expect.any(Function));
  });

  it('handles connection success', async () => {
    const { result } = renderHook(() => useAdminWebSocket());

    // Simulate connection event
    const connectHandler = mockWebsocketService.on.mock.calls.find(
      call => call[0] === 'connected'
    )?.[1];

    act(() => {
      connectHandler?.();
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.connectionState).toBe('connected');
    expect(result.current.error).toBe(null);
  });

  it('handles connection error', async () => {
    const { result } = renderHook(() => useAdminWebSocket());

    const errorHandler = mockWebsocketService.on.mock.calls.find(
      call => call[0] === 'error'
    )?.[1];

    const mockError = { message: 'Connection failed' };

    act(() => {
      errorHandler?.(mockError);
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.connectionState).toBe('error');
    expect(result.current.error).toBe('Connection failed');
  });

  it('handles incoming notifications', async () => {
    const { result } = renderHook(() => useAdminWebSocket());

    const notificationHandler = mockWebsocketService.on.mock.calls.find(
      call => call[0] === 'notification'
    )?.[1];

    const mockNotification = {
      id: '1',
      type: 'info' as const,
      title: 'Test Notification',
      message: 'Test message',
      timestamp: new Date(),
      priority: 'medium' as const,
      category: 'system' as const
    };

    act(() => {
      notificationHandler?.(mockNotification);
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0]).toEqual(mockNotification);
    expect(result.current.unreadNotificationCount).toBe(1);
  });

  it('handles incoming metrics', async () => {
    const { result } = renderHook(() => useAdminWebSocket());

    const metricsHandler = mockWebsocketService.on.mock.calls.find(
      call => call[0] === 'metrics'
    )?.[1];

    const mockMetrics = {
      activeUsers: 10,
      totalCalls: 50,
      systemLoad: 25.5,
      errorRate: 1.2,
      responseTime: 150,
      timestamp: new Date()
    };

    act(() => {
      metricsHandler?.(mockMetrics);
    });

    expect(result.current.metrics).toEqual(mockMetrics);
  });

  it('marks notification as read', async () => {
    const { result } = renderHook(() => useAdminWebSocket());

    // Add a notification first
    const notificationHandler = mockWebsocketService.on.mock.calls.find(
      call => call[0] === 'notification'
    )?.[1];

    const mockNotification = {
      id: '1',
      type: 'info' as const,
      title: 'Test',
      message: 'Test',
      timestamp: new Date(),
      priority: 'medium' as const,
      category: 'system' as const,
      read: false
    };

    act(() => {
      notificationHandler?.(mockNotification);
    });

    // Mark as read
    act(() => {
      result.current.markNotificationRead('1');
    });

    expect(result.current.notifications[0].read).toBe(true);
    expect(mockWebsocketService.markNotificationRead).toHaveBeenCalledWith('1');
  });

  it('clears all notifications', async () => {
    const { result } = renderHook(() => useAdminWebSocket());

    // Add notifications first
    const notificationHandler = mockWebsocketService.on.mock.calls.find(
      call => call[0] === 'notification'
    )?.[1];

    act(() => {
      notificationHandler?.({
        id: '1',
        type: 'info' as const,
        title: 'Test 1',
        message: 'Test',
        timestamp: new Date(),
        priority: 'medium' as const,
        category: 'system' as const
      });
      notificationHandler?.({
        id: '2',
        type: 'info' as const,
        title: 'Test 2',
        message: 'Test',
        timestamp: new Date(),
        priority: 'medium' as const,
        category: 'system' as const
      });
    });

    expect(result.current.notifications).toHaveLength(2);

    // Clear notifications
    act(() => {
      result.current.clearNotifications();
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  it('requests metrics when connected', async () => {
    const { result } = renderHook(() => useAdminWebSocket());

    act(() => {
      result.current.requestMetrics();
    });

    expect(mockWebsocketService.requestMetrics).toHaveBeenCalled();
  });

  it('subscribes to notification categories', async () => {
    const { result } = renderHook(() => useAdminWebSocket());

    const categories = ['system', 'user'];

    act(() => {
      result.current.subscribeToCategories(categories);
    });

    expect(mockWebsocketService.subscribeToNotifications).toHaveBeenCalledWith(categories);
  });

  it('disconnects on unmount', () => {
    const { unmount } = renderHook(() => useAdminWebSocket());

    unmount();

    expect(mockWebsocketService.disconnect).toHaveBeenCalled();
  });

  it('limits notifications to 100 items', async () => {
    const { result } = renderHook(() => useAdminWebSocket());

    const notificationHandler = mockWebsocketService.on.mock.calls.find(
      call => call[0] === 'notification'
    )?.[1];

    // Add 105 notifications
    act(() => {
      for (let i = 0; i < 105; i++) {
        notificationHandler?.({
          id: `${i}`,
          type: 'info' as const,
          title: `Test ${i}`,
          message: 'Test',
          timestamp: new Date(),
          priority: 'medium' as const,
          category: 'system' as const
        });
      }
    });

    expect(result.current.notifications).toHaveLength(100);
  });
});