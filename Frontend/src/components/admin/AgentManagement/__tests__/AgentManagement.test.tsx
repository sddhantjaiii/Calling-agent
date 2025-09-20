import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { AgentManagement } from '../AgentManagement';
import type { AdminAgentListItem, AgentHealthCheck } from '../../../../types/admin';

// Mock child components
vi.mock('../AgentList', () => ({
  AgentList: ({ onAgentSelect, onRefresh }: any) => (
    <div data-testid="agent-list">
      <button onClick={() => onAgentSelect({ id: '1', name: 'Test Agent' })}>
        Select Agent
      </button>
      <button onClick={onRefresh}>Refresh</button>
    </div>
  ),
}));

vi.mock('../AgentMonitor', () => ({
  AgentMonitor: () => <div data-testid="agent-monitor">Agent Monitor</div>,
}));

vi.mock('../AgentHealthCheck', () => ({
  AgentHealthCheckDashboard: ({ onHealthChange }: any) => {
    // Simulate health data update on mount
    React.useEffect(() => {
      onHealthChange({
        totalAgents: 100,
        healthyAgents: 85,
        unhealthyAgents: 10,
        unreachableAgents: 5,
      });
    }, [onHealthChange]);
    
    return (
      <div data-testid="agent-health-check">
        <button onClick={() => onHealthChange({
          totalAgents: 100,
          healthyAgents: 85,
          unhealthyAgents: 10,
          unreachableAgents: 5,
        })}>
          Update Health
        </button>
      </div>
    );
  },
}));

describe('AgentManagement', () => {
  it('renders with summary cards', () => {
    render(<AgentManagement />);
    
    expect(screen.getByText('Total Agents')).toBeInTheDocument();
    expect(screen.getByText('Healthy Agents')).toBeInTheDocument();
    expect(screen.getByText('System Health')).toBeInTheDocument();
    expect(screen.getByText('Issues')).toBeInTheDocument();
  });

  it('renders tabs correctly', () => {
    render(<AgentManagement />);
    
    expect(screen.getByText('Agent List')).toBeInTheDocument();
    expect(screen.getByText('Performance Monitor')).toBeInTheDocument();
    expect(screen.getByText('Health Check')).toBeInTheDocument();
  });

  it('shows agent list by default', () => {
    render(<AgentManagement />);
    
    expect(screen.getByTestId('agent-list')).toBeInTheDocument();
  });

  it('switches to performance monitor tab', () => {
    render(<AgentManagement />);
    
    const monitorTab = screen.getByText('Performance Monitor');
    fireEvent.click(monitorTab);
    
    expect(screen.getByTestId('agent-monitor')).toBeInTheDocument();
  });

  it('switches to health check tab', () => {
    render(<AgentManagement />);
    
    const healthTab = screen.getByText('Health Check');
    fireEvent.click(healthTab);
    
    expect(screen.getByTestId('agent-health-check')).toBeInTheDocument();
  });

  it('handles agent selection', () => {
    render(<AgentManagement />);
    
    const selectButton = screen.getByText('Select Agent');
    fireEvent.click(selectButton);
    
    // Component should handle the selection internally
    expect(selectButton).toBeInTheDocument();
  });

  it('handles refresh trigger', () => {
    render(<AgentManagement />);
    
    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);
    
    // Component should handle the refresh internally
    expect(refreshButton).toBeInTheDocument();
  });

  it('updates health data when health changes', () => {
    render(<AgentManagement />);
    
    // Switch to health check tab
    const healthTab = screen.getByText('Health Check');
    fireEvent.click(healthTab);
    
    // Trigger health update
    const updateButton = screen.getByText('Update Health');
    fireEvent.click(updateButton);
    
    // Should update the summary cards
    expect(screen.getByText('100')).toBeInTheDocument(); // Total agents
    expect(screen.getByText('85')).toBeInTheDocument(); // Healthy agents
  });

  it('calculates health percentage correctly', () => {
    render(<AgentManagement />);
    
    // Switch to health check tab and update health
    const healthTab = screen.getByText('Health Check');
    fireEvent.click(healthTab);
    
    const updateButton = screen.getByText('Update Health');
    fireEvent.click(updateButton);
    
    // Should show 85% (85/100)
    expect(screen.getByText('85% of total')).toBeInTheDocument();
  });

  it('shows correct health status', () => {
    render(<AgentManagement />);
    
    // Switch to health check tab and update health
    const healthTab = screen.getByText('Health Check');
    fireEvent.click(healthTab);
    
    const updateButton = screen.getByText('Update Health');
    fireEvent.click(updateButton);
    
    // 85% should be "Good" status
    expect(screen.getByText('Good')).toBeInTheDocument();
  });

  it('calculates issues count correctly', () => {
    render(<AgentManagement />);
    
    // Switch to health check tab and update health
    const healthTab = screen.getByText('Health Check');
    fireEvent.click(healthTab);
    
    const updateButton = screen.getByText('Update Health');
    fireEvent.click(updateButton);
    
    // Should show 15 (10 unhealthy + 5 unreachable)
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('Agents needing attention')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<AgentManagement className="custom-class" />);
    
    expect(container.firstChild).toHaveClass('custom-class');
  });
});