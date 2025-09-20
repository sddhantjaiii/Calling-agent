import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AgentMonitor } from '../AgentMonitor';
import { adminApiService } from '../../../../services/adminApiService';
import type { AdminAgentMonitoring } from '../../../../types/admin';

// Mock the admin API service
vi.mock('../../../../services/adminApiService', () => ({
  adminApiService: {
    getAgentMonitoring: vi.fn(),
  },
}));

// Mock UI components
vi.mock('../../../ui/LoadingSpinner', () => ({
  LoadingSpinner: ({ size }: { size?: string }) => <div data-testid="loading-spinner">{size}</div>,
}));

vi.mock('../../charts/AdminCharts', () => ({
  AdminCharts: ({ type, data, height }: any) => (
    <div data-testid="admin-chart">
      <div>Type: {type}</div>
      <div>Height: {height}</div>
      <div>Data points: {data.length}</div>
    </div>
  ),
}));

const mockMonitoringData: AdminAgentMonitoring = {
  timeframe: '24h',
  totalCalls: 150,
  successfulCalls: 135,
  failedCalls: 15,
  averageCallDuration: 180, // 3 minutes in seconds
  topPerformingAgents: [
    {
      agentId: '1',
      agentName: 'Top Agent 1',
      userId: 'user1',
      userEmail: 'user1@example.com',
      callCount: 50,
      successRate: 95,
      averageDuration: 200,
    },
    {
      agentId: '2',
      agentName: 'Top Agent 2',
      userId: 'user2',
      userEmail: 'user2@example.com',
      callCount: 40,
      successRate: 90,
      averageDuration: 160,
    },
  ],
  errorRates: {
    'Connection Error': 8,
    'Timeout Error': 5,
    'API Error': 2,
  },
  usageByHour: [
    { hour: '00:00', callCount: 5 },
    { hour: '01:00', callCount: 3 },
    { hour: '02:00', callCount: 2 },
    { hour: '03:00', callCount: 1 },
    { hour: '04:00', callCount: 4 },
  ],
};

describe('AgentMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders loading state initially', () => {
    vi.mocked(adminApiService.getAgentMonitoring).mockImplementation(() => new Promise(() => {}));
    
    render(<AgentMonitor />);
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('renders monitoring data successfully', async () => {
    vi.mocked(adminApiService.getAgentMonitoring).mockResolvedValue({
      success: true,
      data: mockMonitoringData,
    });

    render(<AgentMonitor />);

    await waitFor(() => {
      expect(screen.getByText('Agent Performance Monitor')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument(); // Total calls
      expect(screen.getByText('90%')).toBeInTheDocument(); // Success rate
      expect(screen.getByText('10%')).toBeInTheDocument(); // Failure rate
      expect(screen.getByText('3m 0s')).toBeInTheDocument(); // Average duration
    });
  });

  it('handles API error gracefully', async () => {
    vi.mocked(adminApiService.getAgentMonitoring).mockRejectedValue(new Error('Monitoring API Error'));

    render(<AgentMonitor />);

    await waitFor(() => {
      expect(screen.getByText('Error Loading Monitoring Data')).toBeInTheDocument();
      expect(screen.getByText('Monitoring API Error')).toBeInTheDocument();
    });
  });

  it('handles timeframe changes', async () => {
    vi.mocked(adminApiService.getAgentMonitoring).mockResolvedValue({
      success: true,
      data: mockMonitoringData,
    });

    const onTimeframeChange = vi.fn();
    render(<AgentMonitor onTimeframeChange={onTimeframeChange} />);

    await waitFor(() => {
      expect(screen.getByText('Agent Performance Monitor')).toBeInTheDocument();
    });

    // Change timeframe
    const timeframeSelect = screen.getByDisplayValue('Last 24h');
    fireEvent.click(timeframeSelect);
    
    const weekOption = screen.getByText('Last 7 Days');
    fireEvent.click(weekOption);

    expect(onTimeframeChange).toHaveBeenCalledWith('7d');
    expect(adminApiService.getAgentMonitoring).toHaveBeenCalledWith('7d');
  });

  it('displays usage chart when data is available', async () => {
    vi.mocked(adminApiService.getAgentMonitoring).mockResolvedValue({
      success: true,
      data: mockMonitoringData,
    });

    render(<AgentMonitor />);

    await waitFor(() => {
      expect(screen.getByText('Call Volume by Hour')).toBeInTheDocument();
      expect(screen.getByTestId('admin-chart')).toBeInTheDocument();
      expect(screen.getByText('Data points: 5')).toBeInTheDocument();
    });
  });

  it('displays top performing agents', async () => {
    vi.mocked(adminApiService.getAgentMonitoring).mockResolvedValue({
      success: true,
      data: mockMonitoringData,
    });

    render(<AgentMonitor />);

    await waitFor(() => {
      expect(screen.getByText('Top Performing Agents')).toBeInTheDocument();
      expect(screen.getByText('Top Agent 1')).toBeInTheDocument();
      expect(screen.getByText('Top Agent 2')).toBeInTheDocument();
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
      expect(screen.getByText('95%')).toBeInTheDocument(); // Success rate
    });
  });

  it('displays error analysis when errors exist', async () => {
    vi.mocked(adminApiService.getAgentMonitoring).mockResolvedValue({
      success: true,
      data: mockMonitoringData,
    });

    render(<AgentMonitor />);

    await waitFor(() => {
      expect(screen.getByText('Error Analysis')).toBeInTheDocument();
      expect(screen.getByText('Connection Error')).toBeInTheDocument();
      expect(screen.getByText('8 errors')).toBeInTheDocument();
      expect(screen.getByText('Timeout Error')).toBeInTheDocument();
      expect(screen.getByText('5 errors')).toBeInTheDocument();
    });
  });

  it('shows system status indicators', async () => {
    vi.mocked(adminApiService.getAgentMonitoring).mockResolvedValue({
      success: true,
      data: mockMonitoringData,
    });

    render(<AgentMonitor />);

    await waitFor(() => {
      expect(screen.getByText('System Status')).toBeInTheDocument();
      expect(screen.getByText('ElevenLabs API')).toBeInTheDocument();
      expect(screen.getByText('Database')).toBeInTheDocument();
      expect(screen.getByText('Call Processing')).toBeInTheDocument();
      expect(screen.getAllByText('Operational')).toHaveLength(1);
      expect(screen.getAllByText('Healthy')).toHaveLength(1);
      expect(screen.getAllByText('Normal')).toHaveLength(1);
    });
  });

  it('handles refresh button click', async () => {
    vi.mocked(adminApiService.getAgentMonitoring).mockResolvedValue({
      success: true,
      data: mockMonitoringData,
    });

    render(<AgentMonitor />);

    await waitFor(() => {
      expect(screen.getByText('Agent Performance Monitor')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    expect(adminApiService.getAgentMonitoring).toHaveBeenCalledTimes(2);
  });

  it('auto-refreshes every 30 seconds', async () => {
    vi.mocked(adminApiService.getAgentMonitoring).mockResolvedValue({
      success: true,
      data: mockMonitoringData,
    });

    render(<AgentMonitor />);

    await waitFor(() => {
      expect(adminApiService.getAgentMonitoring).toHaveBeenCalledTimes(1);
    });

    // Fast-forward 30 seconds
    vi.advanceTimersByTime(30000);

    await waitFor(() => {
      expect(adminApiService.getAgentMonitoring).toHaveBeenCalledTimes(2);
    });
  });

  it('calculates success and failure rates correctly', async () => {
    const customData = {
      ...mockMonitoringData,
      totalCalls: 100,
      successfulCalls: 85,
      failedCalls: 15,
    };

    vi.mocked(adminApiService.getAgentMonitoring).mockResolvedValue({
      success: true,
      data: customData,
    });

    render(<AgentMonitor />);

    await waitFor(() => {
      expect(screen.getByText('85%')).toBeInTheDocument(); // Success rate
      expect(screen.getByText('15%')).toBeInTheDocument(); // Failure rate
    });
  });

  it('formats duration correctly', async () => {
    const customData = {
      ...mockMonitoringData,
      averageCallDuration: 125, // 2 minutes 5 seconds
    };

    vi.mocked(adminApiService.getAgentMonitoring).mockResolvedValue({
      success: true,
      data: customData,
    });

    render(<AgentMonitor />);

    await waitFor(() => {
      expect(screen.getByText('2m 5s')).toBeInTheDocument();
    });
  });

  it('shows live monitoring indicator', async () => {
    vi.mocked(adminApiService.getAgentMonitoring).mockResolvedValue({
      success: true,
      data: mockMonitoringData,
    });

    render(<AgentMonitor />);

    await waitFor(() => {
      expect(screen.getByText('Live monitoring - Updates every 30 seconds')).toBeInTheDocument();
    });
  });

  it('handles empty top performing agents', async () => {
    const customData = {
      ...mockMonitoringData,
      topPerformingAgents: [],
    };

    vi.mocked(adminApiService.getAgentMonitoring).mockResolvedValue({
      success: true,
      data: customData,
    });

    render(<AgentMonitor />);

    await waitFor(() => {
      expect(screen.getByText('Agent Performance Monitor')).toBeInTheDocument();
    });

    // Should not show top performing agents section
    expect(screen.queryByText('Top Performing Agents')).not.toBeInTheDocument();
  });

  it('handles empty error rates', async () => {
    const customData = {
      ...mockMonitoringData,
      errorRates: {},
    };

    vi.mocked(adminApiService.getAgentMonitoring).mockResolvedValue({
      success: true,
      data: customData,
    });

    render(<AgentMonitor />);

    await waitFor(() => {
      expect(screen.getByText('Agent Performance Monitor')).toBeInTheDocument();
    });

    // Should not show error analysis section
    expect(screen.queryByText('Error Analysis')).not.toBeInTheDocument();
  });
});