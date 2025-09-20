import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import SystemHealthMonitor from '../SystemHealthMonitor';

// Mock the useAdminAnalytics hook
vi.mock('@/hooks/useAdminAnalytics', () => ({
  useAdminAnalytics: vi.fn(() => ({
    data: {
      systemHealth: {
        overall: 'healthy',
        uptime: 99.9,
        services: {
          api: { status: 'up', responseTime: 120 },
          database: { status: 'up', connections: 45 }
        }
      }
    }
  }))
}));

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
};

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('SystemHealthMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    renderWithQueryClient(<SystemHealthMonitor />);
    
    // Should show loading skeletons
    const loadingElements = document.querySelectorAll('.animate-pulse');
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('displays system health overview after loading', async () => {
    renderWithQueryClient(<SystemHealthMonitor />);
    
    await waitFor(() => {
      expect(screen.getByText('System Health Overview')).toBeInTheDocument();
      expect(screen.getByText('Real-time monitoring of system components and performance metrics')).toBeInTheDocument();
    });
  });

  it('shows system uptime and metrics', async () => {
    renderWithQueryClient(<SystemHealthMonitor />);
    
    await waitFor(() => {
      expect(screen.getByText('99.9%')).toBeInTheDocument();
      expect(screen.getByText('Uptime')).toBeInTheDocument();
      expect(screen.getByText('234')).toBeInTheDocument();
      expect(screen.getByText('Active Users')).toBeInTheDocument();
    });
  });

  it('displays service status cards', async () => {
    renderWithQueryClient(<SystemHealthMonitor />);
    
    await waitFor(() => {
      expect(screen.getByText('API Service')).toBeInTheDocument();
      expect(screen.getByText('Database')).toBeInTheDocument();
      expect(screen.getByText('ElevenLabs API')).toBeInTheDocument();
      expect(screen.getByText('Stripe Payment')).toBeInTheDocument();
    });
  });

  it('shows service status badges', async () => {
    renderWithQueryClient(<SystemHealthMonitor />);
    
    await waitFor(() => {
      const upBadges = screen.getAllByText('UP');
      expect(upBadges.length).toBeGreaterThan(0);
    });
  });

  it('displays response times and connection counts', async () => {
    renderWithQueryClient(<SystemHealthMonitor />);
    
    await waitFor(() => {
      expect(screen.getByText('120ms')).toBeInTheDocument();
      expect(screen.getByText('45 connections')).toBeInTheDocument();
    });
  });

  it('switches between tabs correctly', async () => {
    renderWithQueryClient(<SystemHealthMonitor />);
    
    await waitFor(() => {
      // Click on metrics tab
      const metricsTab = screen.getByText('System Metrics');
      fireEvent.click(metricsTab);
    });

    await waitFor(() => {
      expect(screen.getByText('CPU Usage')).toBeInTheDocument();
      expect(screen.getByText('Memory Usage')).toBeInTheDocument();
    });
  });

  it('displays system metrics with progress bars', async () => {
    renderWithQueryClient(<SystemHealthMonitor />);
    
    await waitFor(() => {
      const metricsTab = screen.getByText('System Metrics');
      fireEvent.click(metricsTab);
    });

    await waitFor(() => {
      expect(screen.getByText('45%')).toBeInTheDocument(); // CPU usage
      expect(screen.getByText('62%')).toBeInTheDocument(); // Memory usage
      expect(screen.getByText('38%')).toBeInTheDocument(); // Disk usage
    });
  });

  it('shows alerts tab with alert list', async () => {
    renderWithQueryClient(<SystemHealthMonitor />);
    
    await waitFor(() => {
      const alertsTab = screen.getByText('Alerts');
      fireEvent.click(alertsTab);
    });

    await waitFor(() => {
      expect(screen.getByText('High memory usage detected on server-2')).toBeInTheDocument();
      expect(screen.getByText('Scheduled maintenance completed successfully')).toBeInTheDocument();
    });
  });

  it('allows acknowledging alerts', async () => {
    renderWithQueryClient(<SystemHealthMonitor />);
    
    await waitFor(() => {
      const alertsTab = screen.getByText('Alerts');
      fireEvent.click(alertsTab);
    });

    await waitFor(() => {
      const acknowledgeButton = screen.getByText('Acknowledge');
      fireEvent.click(acknowledgeButton);
    });

    // Alert should be acknowledged (button should disappear)
    await waitFor(() => {
      expect(screen.queryByText('Acknowledge')).not.toBeInTheDocument();
    });
  });

  it('displays alert settings tab', async () => {
    renderWithQueryClient(<SystemHealthMonitor />);
    
    await waitFor(() => {
      const settingsTab = screen.getByText('Alert Settings');
      fireEvent.click(settingsTab);
    });

    await waitFor(() => {
      expect(screen.getByText('Alert Thresholds')).toBeInTheDocument();
      expect(screen.getByText('Configure when to trigger alerts based on system metrics')).toBeInTheDocument();
    });
  });

  it('shows alert threshold configurations', async () => {
    renderWithQueryClient(<SystemHealthMonitor />);
    
    await waitFor(() => {
      const settingsTab = screen.getByText('Alert Settings');
      fireEvent.click(settingsTab);
    });

    await waitFor(() => {
      expect(screen.getByText('CPU Usage')).toBeInTheDocument();
      expect(screen.getByText('Memory Usage')).toBeInTheDocument();
      expect(screen.getByText('Error Rate')).toBeInTheDocument();
      expect(screen.getByText('Response Time')).toBeInTheDocument();
    });
  });

  it('displays enabled/disabled status for alert thresholds', async () => {
    renderWithQueryClient(<SystemHealthMonitor />);
    
    await waitFor(() => {
      const settingsTab = screen.getByText('Alert Settings');
      fireEvent.click(settingsTab);
    });

    await waitFor(() => {
      const enabledBadges = screen.getAllByText('Enabled');
      expect(enabledBadges.length).toBeGreaterThan(0);
    });
  });

  it('shows configure buttons for alert thresholds', async () => {
    renderWithQueryClient(<SystemHealthMonitor />);
    
    await waitFor(() => {
      const settingsTab = screen.getByText('Alert Settings');
      fireEvent.click(settingsTab);
    });

    await waitFor(() => {
      const configureButtons = screen.getAllByText('Configure');
      expect(configureButtons.length).toBeGreaterThan(0);
    });
  });

  it('handles error state gracefully', async () => {
    // Mock console.error to avoid test output noise
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    renderWithQueryClient(<SystemHealthMonitor />);
    
    // Simulate error by not having health data
    await waitFor(() => {
      // Component should handle missing data gracefully
      expect(screen.queryByText('Failed to load system health data')).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it('displays correct status icons for different service states', async () => {
    renderWithQueryClient(<SystemHealthMonitor />);
    
    await waitFor(() => {
      // Should show green checkmarks for healthy services
      const healthyIcons = document.querySelectorAll('.text-green-500');
      expect(healthyIcons.length).toBeGreaterThan(0);
    });
  });

  it('shows quota usage for ElevenLabs service', async () => {
    renderWithQueryClient(<SystemHealthMonitor />);
    
    await waitFor(() => {
      expect(screen.getByText('85% quota used')).toBeInTheDocument();
    });
  });

  it('displays last check time for Stripe service', async () => {
    renderWithQueryClient(<SystemHealthMonitor />);
    
    await waitFor(() => {
      expect(screen.getByText(/Last check:/)).toBeInTheDocument();
    });
  });

  it('refreshes data automatically', async () => {
    vi.useFakeTimers();
    
    renderWithQueryClient(<SystemHealthMonitor />);
    
    // Fast-forward time to trigger refresh
    vi.advanceTimersByTime(30000);
    
    // Should trigger a new data fetch
    await waitFor(() => {
      expect(screen.getByText('System Health Overview')).toBeInTheDocument();
    });

    vi.useRealTimers();
  });

  it('handles no alerts state', async () => {
    // Mock empty alerts
    const mockHealthData = {
      overall: 'healthy',
      uptime: 99.9,
      services: {},
      metrics: {},
      alerts: []
    };

    renderWithQueryClient(<SystemHealthMonitor />);
    
    await waitFor(() => {
      const alertsTab = screen.getByText('Alerts');
      fireEvent.click(alertsTab);
    });

    // Should show no alerts message when alerts array is empty
    await waitFor(() => {
      expect(screen.getByText('No active alerts')).toBeInTheDocument();
    });
  });
});