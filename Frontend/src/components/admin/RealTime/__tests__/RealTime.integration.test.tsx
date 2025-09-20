import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { RealTimeDashboard } from '../RealTimeDashboard';
import { useAdminWebSocket } from '../../../../hooks/useAdminWebSocket';

// Mock the hook
vi.mock('../../../../hooks/useAdminWebSocket');

const mockUseAdminWebSocket = vi.mocked(useAdminWebSocket);

describe('RealTime Integration', () => {
  const mockMetrics = {
    activeUsers: 25,
    totalCalls: 150,
    systemLoad: 65.5,
    errorRate: 2.1,
    responseTime: 245,
    timestamp: new Date()
  };

  const mockNotifications = [
    {
      id: '1',
      type: 'error' as const,
      title: 'System Error',
      message: 'Database connection failed',
      timestamp: new Date(),
      priority: 'critical' as const,
      category: 'system' as const,
      read: false
    },
    {
      id: '2',
      type: 'warning' as const,
      title: 'High Load',
      message: 'System load is above 80%',
      timestamp: new Date(),
      priority: 'high' as const,
      category: 'system' as const,
      read: false
    }
  ];

  const mockUserActivities = [
    {
      userId: 'user1',
      userEmail: 'user1@example.com',
      action: 'Created new agent',
      timestamp: new Date(),
      details: { agentType: 'sales' }
    }
  ];

  beforeEach(() => {
    mockUseAdminWebSocket.mockReturnValue({
      metrics: mockMetrics,
      systemStatus: {
        database: 'healthy',
        api: 'healthy',
        elevenLabs: 'warning',
        payments: 'healthy'
      },
      agentStatus: {
        active: 12,
        idle: 8,
        error: 2
      },
      userActivities: mockUserActivities,
      notifications: mockNotifications,
      isConnected: true,
      connectionState: 'connected',
      unreadNotificationCount: 2,
      criticalNotificationCount: 1,
      connect: vi.fn(),
      disconnect: vi.fn(),
      requestMetrics: vi.fn(),
      markNotificationRead: vi.fn(),
      clearNotifications: vi.fn(),
      subscribeToCategories: vi.fn()
    });
  });

  it('renders complete real-time dashboard', () => {
    render(<RealTimeDashboard />);
    
    expect(screen.getByText('Real-Time Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument(); // Active users
    expect(screen.getByText('150')).toBeInTheDocument(); // Total calls
  });

  it('shows critical notification alert', () => {
    render(<RealTimeDashboard />);
    
    expect(screen.getByText('1 critical notification requires attention')).toBeInTheDocument();
  });

  it('opens notification center when bell icon clicked', async () => {
    render(<RealTimeDashboard />);
    
    const bellButton = screen.getByRole('button', { name: /2/ }); // Button with notification count
    fireEvent.click(bellButton);
    
    await waitFor(() => {
      expect(screen.getByText('System Error')).toBeInTheDocument();
      expect(screen.getByText('Database connection failed')).toBeInTheDocument();
    });
  });

  it('toggles auto refresh functionality', async () => {
    const mockRequestMetrics = vi.fn();
    mockUseAdminWebSocket.mockReturnValue({
      ...mockUseAdminWebSocket(),
      requestMetrics: mockRequestMetrics
    });

    render(<RealTimeDashboard />);
    
    const autoRefreshSwitch = screen.getByRole('switch');
    expect(autoRefreshSwitch).toBeChecked();
    
    fireEvent.click(autoRefreshSwitch);
    expect(autoRefreshSwitch).not.toBeChecked();
  });

  it('manually refreshes metrics', async () => {
    const mockRequestMetrics = vi.fn();
    mockUseAdminWebSocket.mockReturnValue({
      ...mockUseAdminWebSocket(),
      requestMetrics: mockRequestMetrics
    });

    render(<RealTimeDashboard />);
    
    const refreshButton = screen.getByText('Refresh Now');
    fireEvent.click(refreshButton);
    
    expect(mockRequestMetrics).toHaveBeenCalled();
  });

  it('handles disconnected state', () => {
    mockUseAdminWebSocket.mockReturnValue({
      ...mockUseAdminWebSocket(),
      isConnected: false,
      connectionState: 'disconnected',
      metrics: null,
      systemStatus: null
    });

    render(<RealTimeDashboard />);
    
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
    expect(screen.getByText('Reconnect')).toBeInTheDocument();
  });

  it('subscribes to notification categories', async () => {
    const mockSubscribe = vi.fn();
    mockUseAdminWebSocket.mockReturnValue({
      ...mockUseAdminWebSocket(),
      subscribeToCategories: mockSubscribe
    });

    render(<RealTimeDashboard />);
    
    const systemBadge = screen.getByText('System');
    fireEvent.click(systemBadge);
    
    expect(mockSubscribe).toHaveBeenCalled();
  });

  it('shows real-time metrics updates', () => {
    render(<RealTimeDashboard />);
    
    // Check that all metric components are rendered
    expect(screen.getByText('Active Users')).toBeInTheDocument();
    expect(screen.getByText('Total Calls')).toBeInTheDocument();
    expect(screen.getByText('System Load')).toBeInTheDocument();
    expect(screen.getByText('Response Time')).toBeInTheDocument();
    
    // Check system status
    expect(screen.getByText('Database')).toBeInTheDocument();
    expect(screen.getByText('ElevenLabs')).toBeInTheDocument();
    
    // Check agent status
    expect(screen.getByText('12')).toBeInTheDocument(); // Active agents
    expect(screen.getByText('8')).toBeInTheDocument(); // Idle agents
    expect(screen.getByText('2')).toBeInTheDocument(); // Error agents
  });

  it('displays user activities in real-time', () => {
    render(<RealTimeDashboard />);
    
    expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    expect(screen.getByText('Created new agent')).toBeInTheDocument();
  });

  it('handles error state gracefully', () => {
    mockUseAdminWebSocket.mockReturnValue({
      ...mockUseAdminWebSocket(),
      connectionState: 'error',
      isConnected: false,
      error: 'Connection failed'
    });

    render(<RealTimeDashboard />);
    
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Real-time updates unavailable')).toBeInTheDocument();
  });

  it('updates refresh interval', async () => {
    render(<RealTimeDashboard />);
    
    const intervalSelect = screen.getByDisplayValue('30s');
    fireEvent.change(intervalSelect, { target: { value: '60' } });
    
    expect(intervalSelect).toHaveValue('60');
  });

  it('shows notification count badge', () => {
    render(<RealTimeDashboard />);
    
    const notificationButton = screen.getByRole('button', { name: /2/ });
    expect(notificationButton).toBeInTheDocument();
  });

  it('integrates all real-time components seamlessly', () => {
    render(<RealTimeDashboard />);
    
    // Verify all major components are present
    expect(screen.getByText('Real-Time Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Real-Time Connection')).toBeInTheDocument();
    expect(screen.getByText('System Status')).toBeInTheDocument();
    expect(screen.getByText('Agent Status')).toBeInTheDocument();
    expect(screen.getByText('Recent User Activity')).toBeInTheDocument();
    
    // Verify interactive elements work
    expect(screen.getByRole('switch')).toBeInTheDocument(); // Auto refresh
    expect(screen.getByText('Refresh Now')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /2/ })).toBeInTheDocument(); // Notifications
  });
});