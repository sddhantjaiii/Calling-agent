import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AgentHealthCheckDashboard } from '../AgentHealthCheck';
import { adminApiService } from '../../../../services/adminApiService';
import type { AgentHealthCheck } from '../../../../types/admin';

// Mock the admin API service
vi.mock('../../../../services/adminApiService', () => ({
  adminApiService: {
    getAgentHealthCheck: vi.fn(),
  },
}));

// Mock UI components
vi.mock('../../../ui/LoadingSpinner', () => ({
  LoadingSpinner: ({ size }: { size?: string }) => <div data-testid="loading-spinner">{size}</div>,
}));

const mockHealthData: AgentHealthCheck = {
  totalAgents: 100,
  healthyAgents: 85,
  unhealthyAgents: 10,
  unreachableAgents: 5,
  healthDetails: [
    {
      agentId: '1',
      agentName: 'Healthy Agent',
      userId: 'user1',
      status: 'healthy',
      lastChecked: new Date('2024-01-15T10:00:00Z'),
    },
    {
      agentId: '2',
      agentName: 'Unhealthy Agent',
      userId: 'user2',
      status: 'unhealthy',
      lastChecked: new Date('2024-01-15T10:00:00Z'),
      error: 'Connection timeout',
    },
    {
      agentId: '3',
      agentName: 'Unreachable Agent',
      userId: 'user3',
      status: 'unreachable',
      lastChecked: new Date('2024-01-15T10:00:00Z'),
      error: 'Agent not responding',
    },
  ],
};

describe('AgentHealthCheckDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders loading state initially', () => {
    vi.mocked(adminApiService.getAgentHealthCheck).mockImplementation(() => new Promise(() => {}));
    
    render(<AgentHealthCheckDashboard />);
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('renders health data successfully', async () => {
    vi.mocked(adminApiService.getAgentHealthCheck).mockResolvedValue({
      success: true,
      data: mockHealthData,
    });

    render(<AgentHealthCheckDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Agent Health Dashboard')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument(); // Health percentage
      expect(screen.getByText('85')).toBeInTheDocument(); // Healthy agents
      expect(screen.getByText('10')).toBeInTheDocument(); // Unhealthy agents
      expect(screen.getByText('5')).toBeInTheDocument(); // Unreachable agents
    });
  });

  it('handles API error gracefully', async () => {
    vi.mocked(adminApiService.getAgentHealthCheck).mockRejectedValue(new Error('Health Check API Error'));

    render(<AgentHealthCheckDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Health Check Failed')).toBeInTheDocument();
      expect(screen.getByText('Health Check API Error')).toBeInTheDocument();
    });
  });

  it('calls onHealthChange when data is loaded', async () => {
    vi.mocked(adminApiService.getAgentHealthCheck).mockResolvedValue({
      success: true,
      data: mockHealthData,
    });

    const onHealthChange = vi.fn();
    render(<AgentHealthCheckDashboard onHealthChange={onHealthChange} />);

    await waitFor(() => {
      expect(onHealthChange).toHaveBeenCalledWith(mockHealthData);
    });
  });

  it('runs health check when button is clicked', async () => {
    vi.mocked(adminApiService.getAgentHealthCheck).mockResolvedValue({
      success: true,
      data: mockHealthData,
    });

    render(<AgentHealthCheckDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Agent Health Dashboard')).toBeInTheDocument();
    });

    const runHealthCheckButton = screen.getByRole('button', { name: /run health check/i });
    fireEvent.click(runHealthCheckButton);

    expect(screen.getByText('Checking...')).toBeInTheDocument();
    expect(adminApiService.getAgentHealthCheck).toHaveBeenCalledTimes(2);
  });

  it('displays ElevenLabs integration status', async () => {
    vi.mocked(adminApiService.getAgentHealthCheck).mockResolvedValue({
      success: true,
      data: mockHealthData,
    });

    render(<AgentHealthCheckDashboard />);

    await waitFor(() => {
      expect(screen.getByText('ElevenLabs Integration Status')).toBeInTheDocument();
      expect(screen.getByText('API Connection')).toBeInTheDocument();
      expect(screen.getByText('Voice Synthesis')).toBeInTheDocument();
      expect(screen.getByText('Agent Management')).toBeInTheDocument();
    });
  });

  it('displays detailed agent health information', async () => {
    vi.mocked(adminApiService.getAgentHealthCheck).mockResolvedValue({
      success: true,
      data: mockHealthData,
    });

    render(<AgentHealthCheckDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Agent Health Details')).toBeInTheDocument();
      expect(screen.getByText('Healthy Agent')).toBeInTheDocument();
      expect(screen.getByText('Unhealthy Agent')).toBeInTheDocument();
      expect(screen.getByText('Unreachable Agent')).toBeInTheDocument();
      expect(screen.getByText('Connection timeout')).toBeInTheDocument();
      expect(screen.getByText('Agent not responding')).toBeInTheDocument();
    });
  });

  it('auto-refreshes every 2 minutes', async () => {
    vi.mocked(adminApiService.getAgentHealthCheck).mockResolvedValue({
      success: true,
      data: mockHealthData,
    });

    render(<AgentHealthCheckDashboard />);

    await waitFor(() => {
      expect(adminApiService.getAgentHealthCheck).toHaveBeenCalledTimes(1);
    });

    // Fast-forward 2 minutes
    vi.advanceTimersByTime(120000);

    await waitFor(() => {
      expect(adminApiService.getAgentHealthCheck).toHaveBeenCalledTimes(2);
    });
  });

  it('calculates health percentage correctly', async () => {
    const customHealthData = {
      ...mockHealthData,
      totalAgents: 50,
      healthyAgents: 40,
    };

    vi.mocked(adminApiService.getAgentHealthCheck).mockResolvedValue({
      success: true,
      data: customHealthData,
    });

    render(<AgentHealthCheckDashboard />);

    await waitFor(() => {
      expect(screen.getByText('80%')).toBeInTheDocument(); // 40/50 = 80%
    });
  });

  it('shows correct health status based on percentage', async () => {
    // Test excellent health (>= 90%)
    const excellentHealthData = {
      ...mockHealthData,
      totalAgents: 100,
      healthyAgents: 95,
    };

    vi.mocked(adminApiService.getAgentHealthCheck).mockResolvedValue({
      success: true,
      data: excellentHealthData,
    });

    render(<AgentHealthCheckDashboard />);

    await waitFor(() => {
      expect(screen.getByText('95%')).toBeInTheDocument();
    });
  });
});