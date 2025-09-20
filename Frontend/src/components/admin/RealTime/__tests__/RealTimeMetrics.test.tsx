import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { RealTimeMetrics } from '../RealTimeMetrics';
import { useAdminWebSocket } from '../../../../hooks/useAdminWebSocket';

// Mock the hook
vi.mock('../../../../hooks/useAdminWebSocket');

const mockUseAdminWebSocket = vi.mocked(useAdminWebSocket);

describe('RealTimeMetrics', () => {
  const mockMetrics = {
    activeUsers: 25,
    totalCalls: 150,
    systemLoad: 65.5,
    errorRate: 2.1,
    responseTime: 245,
    timestamp: new Date()
  };

  const mockSystemStatus = {
    database: 'healthy',
    api: 'healthy',
    elevenLabs: 'healthy',
    payments: 'healthy'
  };

  const mockAgentStatus = {
    active: 12,
    idle: 8,
    error: 2
  };

  const mockUserActivities = [
    {
      userId: 'user1',
      userEmail: 'user1@example.com',
      action: 'Created new agent',
      timestamp: new Date(),
      details: { agentType: 'sales' }
    },
    {
      userId: 'user2',
      userEmail: 'user2@example.com',
      action: 'Made phone call',
      timestamp: new Date(),
      details: { duration: 120 }
    }
  ];

  beforeEach(() => {
    mockUseAdminWebSocket.mockReturnValue({
      metrics: mockMetrics,
      systemStatus: mockSystemStatus,
      agentStatus: mockAgentStatus,
      userActivities: mockUserActivities,
      isConnected: true,
      connectionState: 'connected',
      requestMetrics: vi.fn(),
      notifications: [],
      markNotificationRead: vi.fn(),
      clearNotifications: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      subscribeToCategories: vi.fn(),
      unreadNotificationCount: 0,
      criticalNotificationCount: 0
    });
  });

  it('renders connection status correctly when connected', () => {
    render(<RealTimeMetrics />);
    
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText(/updated/i)).toBeInTheDocument();
  });

  it('renders system metrics correctly', () => {
    render(<RealTimeMetrics />);
    
    expect(screen.getByText('25')).toBeInTheDocument(); // Active users
    expect(screen.getByText('150')).toBeInTheDocument(); // Total calls
    expect(screen.getByText('65.5%')).toBeInTheDocument(); // System load
    expect(screen.getByText('245ms')).toBeInTheDocument(); // Response time
  });

  it('shows error rate alert when error rate is high', () => {
    mockUseAdminWebSocket.mockReturnValue({
      ...mockUseAdminWebSocket(),
      metrics: { ...mockMetrics, errorRate: 8.5 }
    });

    render(<RealTimeMetrics />);
    
    expect(screen.getByText('High Error Rate')).toBeInTheDocument();
    expect(screen.getByText('8.5%')).toBeInTheDocument();
  });

  it('renders system status indicators', () => {
    render(<RealTimeMetrics />);
    
    expect(screen.getByText('Database')).toBeInTheDocument();
    expect(screen.getByText('API')).toBeInTheDocument();
    expect(screen.getByText('ElevenLabs')).toBeInTheDocument();
    expect(screen.getByText('Payments')).toBeInTheDocument();
  });

  it('renders agent status summary', () => {
    render(<RealTimeMetrics />);
    
    expect(screen.getByText('12')).toBeInTheDocument(); // Active agents
    expect(screen.getByText('8')).toBeInTheDocument(); // Idle agents
    expect(screen.getByText('2')).toBeInTheDocument(); // Error agents
  });

  it('renders recent user activities', () => {
    render(<RealTimeMetrics />);
    
    expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    expect(screen.getByText('Created new agent')).toBeInTheDocument();
    expect(screen.getByText('user2@example.com')).toBeInTheDocument();
    expect(screen.getByText('Made phone call')).toBeInTheDocument();
  });

  it('shows disconnected state when not connected', () => {
    mockUseAdminWebSocket.mockReturnValue({
      ...mockUseAdminWebSocket(),
      isConnected: false,
      connectionState: 'disconnected',
      metrics: null,
      systemStatus: null,
      agentStatus: null
    });

    render(<RealTimeMetrics />);
    
    expect(screen.getByText('Real-time updates unavailable')).toBeInTheDocument();
  });

  it('requests metrics on mount when connected', async () => {
    const mockRequestMetrics = vi.fn();
    mockUseAdminWebSocket.mockReturnValue({
      ...mockUseAdminWebSocket(),
      requestMetrics: mockRequestMetrics
    });

    render(<RealTimeMetrics />);
    
    await waitFor(() => {
      expect(mockRequestMetrics).toHaveBeenCalled();
    });
  });

  it('handles missing metrics gracefully', () => {
    mockUseAdminWebSocket.mockReturnValue({
      ...mockUseAdminWebSocket(),
      metrics: null,
      systemStatus: null,
      agentStatus: null,
      userActivities: []
    });

    render(<RealTimeMetrics />);
    
    expect(screen.getByText('Connected')).toBeInTheDocument();
    // Should not crash and should show connection status
  });
});