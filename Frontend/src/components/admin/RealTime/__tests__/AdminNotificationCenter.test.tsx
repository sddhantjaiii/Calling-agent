import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AdminNotificationCenter } from '../AdminNotificationCenter';
import { useAdminWebSocket } from '../../../../hooks/useAdminWebSocket';

// Mock the hook
vi.mock('../../../../hooks/useAdminWebSocket');

const mockUseAdminWebSocket = vi.mocked(useAdminWebSocket);

describe('AdminNotificationCenter', () => {
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
    },
    {
      id: '3',
      type: 'info' as const,
      title: 'User Registered',
      message: 'New user signed up',
      timestamp: new Date(),
      priority: 'low' as const,
      category: 'user' as const,
      read: true
    }
  ];

  const mockProps = {
    isOpen: true,
    onClose: vi.fn()
  };

  beforeEach(() => {
    mockUseAdminWebSocket.mockReturnValue({
      notifications: mockNotifications,
      markNotificationRead: vi.fn(),
      clearNotifications: vi.fn(),
      unreadNotificationCount: 2,
      isConnected: true,
      connectionState: 'connected',
      requestMetrics: vi.fn(),
      metrics: null,
      systemStatus: null,
      agentStatus: null,
      userActivities: [],
      connect: vi.fn(),
      disconnect: vi.fn(),
      subscribeToCategories: vi.fn(),
      criticalNotificationCount: 1
    });
  });

  it('renders notification center when open', () => {
    render(<AdminNotificationCenter {...mockProps} />);
    
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Unread count badge
  });

  it('does not render when closed', () => {
    render(<AdminNotificationCenter {...mockProps} isOpen={false} />);
    
    expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
  });

  it('displays notifications correctly', () => {
    render(<AdminNotificationCenter {...mockProps} />);
    
    expect(screen.getByText('System Error')).toBeInTheDocument();
    expect(screen.getByText('Database connection failed')).toBeInTheDocument();
    expect(screen.getByText('High Load')).toBeInTheDocument();
    expect(screen.getByText('User Registered')).toBeInTheDocument();
  });

  it('filters notifications by category', async () => {
    render(<AdminNotificationCenter {...mockProps} />);
    
    const categoryFilter = screen.getByDisplayValue('All');
    fireEvent.change(categoryFilter, { target: { value: 'system' } });
    
    await waitFor(() => {
      expect(screen.getByText('System Error')).toBeInTheDocument();
      expect(screen.getByText('High Load')).toBeInTheDocument();
      // User notification should not be visible
      expect(screen.queryByText('User Registered')).not.toBeInTheDocument();
    });
  });

  it('filters notifications by priority', async () => {
    render(<AdminNotificationCenter {...mockProps} />);
    
    const priorityFilter = screen.getAllByDisplayValue('All')[1];
    fireEvent.change(priorityFilter, { target: { value: 'critical' } });
    
    await waitFor(() => {
      expect(screen.getByText('System Error')).toBeInTheDocument();
      // Other notifications should not be visible
      expect(screen.queryByText('High Load')).not.toBeInTheDocument();
    });
  });

  it('marks notification as read when clicked', async () => {
    const mockMarkRead = vi.fn();
    mockUseAdminWebSocket.mockReturnValue({
      ...mockUseAdminWebSocket(),
      markNotificationRead: mockMarkRead
    });

    render(<AdminNotificationCenter {...mockProps} />);
    
    const notification = screen.getByText('System Error');
    fireEvent.click(notification.closest('div')!);
    
    await waitFor(() => {
      expect(mockMarkRead).toHaveBeenCalledWith('1');
    });
  });

  it('marks all notifications as read', async () => {
    const mockMarkRead = vi.fn();
    mockUseAdminWebSocket.mockReturnValue({
      ...mockUseAdminWebSocket(),
      markNotificationRead: mockMarkRead
    });

    render(<AdminNotificationCenter {...mockProps} />);
    
    const markAllButton = screen.getByText('Mark All Read');
    fireEvent.click(markAllButton);
    
    await waitFor(() => {
      expect(mockMarkRead).toHaveBeenCalledWith('1');
      expect(mockMarkRead).toHaveBeenCalledWith('2');
    });
  });

  it('clears all notifications', async () => {
    const mockClearAll = vi.fn();
    mockUseAdminWebSocket.mockReturnValue({
      ...mockUseAdminWebSocket(),
      clearNotifications: mockClearAll
    });

    render(<AdminNotificationCenter {...mockProps} />);
    
    const clearAllButton = screen.getByText('Clear All');
    fireEvent.click(clearAllButton);
    
    await waitFor(() => {
      expect(mockClearAll).toHaveBeenCalled();
    });
  });

  it('closes notification center when close button clicked', async () => {
    const mockOnClose = vi.fn();
    
    render(<AdminNotificationCenter {...mockProps} onClose={mockOnClose} />);
    
    const closeButton = screen.getByRole('button', { name: '' }); // X button
    fireEvent.click(closeButton);
    
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('shows unread and all tabs with correct counts', () => {
    render(<AdminNotificationCenter {...mockProps} />);
    
    expect(screen.getByText('Unread (2)')).toBeInTheDocument();
    expect(screen.getByText('All (3)')).toBeInTheDocument();
  });

  it('shows empty state when no notifications', () => {
    mockUseAdminWebSocket.mockReturnValue({
      ...mockUseAdminWebSocket(),
      notifications: [],
      unreadNotificationCount: 0
    });

    render(<AdminNotificationCenter {...mockProps} />);
    
    expect(screen.getByText('No unread notifications')).toBeInTheDocument();
  });

  it('displays notification icons correctly', () => {
    render(<AdminNotificationCenter {...mockProps} />);
    
    // Check that different notification types have different styling
    const errorNotification = screen.getByText('System Error').closest('div');
    const warningNotification = screen.getByText('High Load').closest('div');
    const infoNotification = screen.getByText('User Registered').closest('div');
    
    expect(errorNotification).toBeInTheDocument();
    expect(warningNotification).toBeInTheDocument();
    expect(infoNotification).toBeInTheDocument();
  });
});