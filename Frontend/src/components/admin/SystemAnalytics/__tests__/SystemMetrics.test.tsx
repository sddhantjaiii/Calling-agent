import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SystemMetrics } from '../SystemMetrics';

// Mock AdminCard component
vi.mock('../../shared/AdminCard', () => ({
  AdminCard: ({ title, value, change, icon: Icon, color, description }: any) => (
    <div data-testid="admin-card">
      <div data-testid="card-title">{title}</div>
      <div data-testid="card-value">{value}</div>
      <div data-testid="card-change">{change}</div>
      <div data-testid="card-description">{description}</div>
      <div data-testid="card-color">{color}</div>
      {Icon && <Icon data-testid="card-icon" />}
    </div>
  )
}));

const mockData = {
  users: {
    total: 1000,
    active: 800,
    newThisMonth: 50,
    growth: 10,
    byTier: {
      free: 600,
      pro: 300,
      enterprise: 100
    }
  },
  agents: {
    total: 500,
    active: 400,
    growth: 15,
    healthyPercentage: 95,
    byType: {
      sales: 200,
      support: 200,
      survey: 100
    }
  },
  calls: {
    total: 10000,
    growth: 20,
    successRate: 92,
    averageDuration: 180
  },
  revenue: {
    total: 50000,
    monthly: 8000,
    growth: 25
  },
  system: {
    uptime: 99.9,
    responseTime: 45,
    errorRate: 0.2,
    activeConnections: 150
  },
  alerts: [
    {
      title: 'High API Usage',
      description: 'API usage is above normal levels',
      severity: 'medium'
    }
  ]
};

const mockFilters = {
  dateRange: {
    from: new Date('2024-01-01'),
    to: new Date('2024-01-31')
  }
};

describe('SystemMetrics', () => {
  const mockOnRefresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders platform metrics cards', () => {
    render(
      <SystemMetrics 
        data={mockData} 
        filters={mockFilters} 
        onRefresh={mockOnRefresh} 
      />
    );

    const cards = screen.getAllByTestId('admin-card');
    expect(cards).toHaveLength(4); // Total Users, Total Agents, Total Calls, Revenue

    // Check specific metrics
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('Total Agents')).toBeInTheDocument();
    expect(screen.getByText('Total Calls')).toBeInTheDocument();
    expect(screen.getByText('Revenue')).toBeInTheDocument();
  });

  it('displays real-time system health metrics', () => {
    render(
      <SystemMetrics 
        data={mockData} 
        filters={mockFilters} 
        onRefresh={mockOnRefresh} 
      />
    );

    expect(screen.getByText('Real-time System Health')).toBeInTheDocument();
    expect(screen.getByText('API Response Time')).toBeInTheDocument();
    expect(screen.getByText('System Uptime')).toBeInTheDocument();
    expect(screen.getByText('Error Rate')).toBeInTheDocument();
    expect(screen.getByText('Active Connections')).toBeInTheDocument();
  });

  it('shows correct health status badges', () => {
    render(
      <SystemMetrics 
        data={mockData} 
        filters={mockFilters} 
        onRefresh={mockOnRefresh} 
      />
    );

    // Should show healthy status for good metrics
    const healthyBadges = screen.getAllByText('healthy');
    expect(healthyBadges.length).toBeGreaterThan(0);
  });

  it('displays user statistics breakdown', () => {
    render(
      <SystemMetrics 
        data={mockData} 
        filters={mockFilters} 
        onRefresh={mockOnRefresh} 
      />
    );

    expect(screen.getByText('User Statistics')).toBeInTheDocument();
    expect(screen.getByText('Active Users')).toBeInTheDocument();
    expect(screen.getByText('New Registrations (30d)')).toBeInTheDocument();
    expect(screen.getByText('Free Tier Users')).toBeInTheDocument();
    expect(screen.getByText('Pro Tier Users')).toBeInTheDocument();
    expect(screen.getByText('Enterprise Users')).toBeInTheDocument();
  });

  it('displays agent statistics breakdown', () => {
    render(
      <SystemMetrics 
        data={mockData} 
        filters={mockFilters} 
        onRefresh={mockOnRefresh} 
      />
    );

    expect(screen.getByText('Agent Statistics')).toBeInTheDocument();
    expect(screen.getByText('Active Agents')).toBeInTheDocument();
    expect(screen.getByText('Sales Agents')).toBeInTheDocument();
    expect(screen.getByText('Support Agents')).toBeInTheDocument();
    expect(screen.getByText('Survey Agents')).toBeInTheDocument();
    expect(screen.getByText('Healthy Agents')).toBeInTheDocument();
  });

  it('shows system alerts when present', () => {
    render(
      <SystemMetrics 
        data={mockData} 
        filters={mockFilters} 
        onRefresh={mockOnRefresh} 
      />
    );

    expect(screen.getByText('System Alerts')).toBeInTheDocument();
    expect(screen.getByText('High API Usage')).toBeInTheDocument();
    expect(screen.getByText('API usage is above normal levels')).toBeInTheDocument();
  });

  it('handles missing data gracefully', () => {
    const emptyData = {};
    
    render(
      <SystemMetrics 
        data={emptyData} 
        filters={mockFilters} 
        onRefresh={mockOnRefresh} 
      />
    );

    // Should still render without crashing
    expect(screen.getByText('Real-time System Health')).toBeInTheDocument();
  });

  it('formats metrics correctly', () => {
    render(
      <SystemMetrics 
        data={mockData} 
        filters={mockFilters} 
        onRefresh={mockOnRefresh} 
      />
    );

    // Check revenue formatting
    expect(screen.getByText('$50,000')).toBeInTheDocument();
    
    // Check percentage formatting
    expect(screen.getByText('95%')).toBeInTheDocument();
  });

  it('shows warning status for degraded metrics', () => {
    const degradedData = {
      ...mockData,
      system: {
        ...mockData.system,
        responseTime: 150, // High response time should show warning
        uptime: 98.5 // Lower uptime should show warning
      }
    };

    render(
      <SystemMetrics 
        data={degradedData} 
        filters={mockFilters} 
        onRefresh={mockOnRefresh} 
      />
    );

    // Should show warning badges for degraded metrics
    const warningBadges = screen.getAllByText('warning');
    expect(warningBadges.length).toBeGreaterThan(0);
  });

  it('shows critical status for severely degraded metrics', () => {
    const criticalData = {
      ...mockData,
      system: {
        ...mockData.system,
        errorRate: 5.0 // High error rate should show critical
      }
    };

    render(
      <SystemMetrics 
        data={criticalData} 
        filters={mockFilters} 
        onRefresh={mockOnRefresh} 
      />
    );

    // Should show critical badge for high error rate
    const criticalBadges = screen.getAllByText('critical');
    expect(criticalBadges.length).toBeGreaterThan(0);
  });

  it('handles real-time metric updates', () => {
    const { rerender } = render(
      <SystemMetrics 
        data={mockData} 
        filters={mockFilters} 
        onRefresh={mockOnRefresh} 
      />
    );

    // Simulate real-time update
    const updatedData = {
      ...mockData,
      system: {
        ...mockData.system,
        activeConnections: 200
      }
    };

    rerender(
      <SystemMetrics 
        data={updatedData} 
        filters={mockFilters} 
        onRefresh={mockOnRefresh} 
      />
    );

    // Component should handle the update
    expect(screen.getByText('Real-time System Health')).toBeInTheDocument();
  });

  it('does not show alerts section when no alerts', () => {
    const dataWithoutAlerts = {
      ...mockData,
      alerts: []
    };

    render(
      <SystemMetrics 
        data={dataWithoutAlerts} 
        filters={mockFilters} 
        onRefresh={mockOnRefresh} 
      />
    );

    expect(screen.queryByText('System Alerts')).not.toBeInTheDocument();
  });
});