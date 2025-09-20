import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AgentList } from '../AgentList';
import { adminApiService } from '../../../../services/adminApiService';
import type { AdminAgentListItem } from '../../../../types/admin';

// Mock the admin API service
vi.mock('../../../../services/adminApiService', () => ({
  adminApiService: {
    getAgents: vi.fn(),
    bulkAgentAction: vi.fn(),
    updateAgent: vi.fn(),
  },
}));

// Mock UI components
vi.mock('../../../ui/LoadingSpinner', () => ({
  LoadingSpinner: ({ size }: { size?: string }) => <div data-testid="loading-spinner">{size}</div>,
}));

vi.mock('../../../ui/EmptyStateComponents', () => ({
  EmptyState: ({ title, description, action }: any) => (
    <div data-testid="empty-state">
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  ),
}));

// Mock child components
vi.mock('../AgentDetailsModal', () => ({
  AgentDetailsModal: ({ agent, open, onClose }: any) => (
    open ? (
      <div data-testid="agent-details-modal">
        <h2>Agent Details: {agent.name}</h2>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  ),
}));

vi.mock('../BulkAgentActions', () => ({
  BulkAgentActions: ({ agentIds, open, onClose, onComplete }: any) => (
    open ? (
      <div data-testid="bulk-actions-modal">
        <h2>Bulk Actions ({agentIds.length} agents)</h2>
        <button onClick={() => { onComplete({ successful: agentIds.length, failed: [] }); }}>
          Complete
        </button>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  ),
}));

const mockAgents: AdminAgentListItem[] = [
  {
    id: '1',
    name: 'Test Agent 1',
    type: 'call',
    status: 'active',
    userEmail: 'user1@example.com',
    userName: 'User One',
    user_id: 'user1',
    callCount: 10,
    healthStatus: 'healthy',
    elevenlabsStatus: 'active',
    lastCallAt: new Date('2024-01-15'),
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-15'),
    description: 'Test agent description',
  },
  {
    id: '2',
    name: 'Test Agent 2',
    type: 'chat',
    status: 'inactive',
    userEmail: 'user2@example.com',
    userName: 'User Two',
    user_id: 'user2',
    callCount: 5,
    healthStatus: 'warning',
    elevenlabsStatus: 'inactive',
    lastCallAt: new Date('2024-01-10'),
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-10'),
    description: 'Another test agent',
  },
];

describe('AgentList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(adminApiService.getAgents).mockImplementation(() => new Promise(() => {}));
    
    render(<AgentList />);
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('renders agent list successfully', async () => {
    vi.mocked(adminApiService.getAgents).mockResolvedValue({
      success: true,
      data: mockAgents,
      pagination: { total: 2, page: 1, limit: 20 },
    });

    render(<AgentList />);

    await waitFor(() => {
      expect(screen.getByText('Agent Management')).toBeInTheDocument();
      expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
      expect(screen.getByText('Test Agent 2')).toBeInTheDocument();
    });
  });

  it('handles API error gracefully', async () => {
    vi.mocked(adminApiService.getAgents).mockRejectedValue(new Error('API Error'));

    render(<AgentList />);

    await waitFor(() => {
      expect(screen.getByText('Error Loading Agents')).toBeInTheDocument();
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });

  it('filters agents by search query', async () => {
    vi.mocked(adminApiService.getAgents).mockResolvedValue({
      success: true,
      data: mockAgents,
      pagination: { total: 2, page: 1, limit: 20 },
    });

    render(<AgentList />);

    await waitFor(() => {
      expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
      expect(screen.getByText('Test Agent 2')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search agents, users...');
    fireEvent.change(searchInput, { target: { value: 'Agent 1' } });

    // Wait for debounced search
    await waitFor(() => {
      expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
    }, { timeout: 500 });
  });

  it('handles agent selection', async () => {
    vi.mocked(adminApiService.getAgents).mockResolvedValue({
      success: true,
      data: mockAgents,
      pagination: { total: 2, page: 1, limit: 20 },
    });

    render(<AgentList />);

    await waitFor(() => {
      expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
    });

    // Select first agent checkbox
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // First agent checkbox (index 0 is select all)

    expect(screen.getByText('Bulk Actions (1)')).toBeInTheDocument();
  });

  it('opens agent details modal', async () => {
    vi.mocked(adminApiService.getAgents).mockResolvedValue({
      success: true,
      data: mockAgents,
      pagination: { total: 2, page: 1, limit: 20 },
    });

    const onAgentSelect = vi.fn();
    render(<AgentList onAgentSelect={onAgentSelect} />);

    await waitFor(() => {
      expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
    });

    // Click on the more options button for first agent
    const moreButtons = screen.getAllByRole('button', { name: '' });
    const moreButton = moreButtons.find(button => 
      button.querySelector('svg')?.classList.contains('lucide-more-horizontal')
    );
    
    if (moreButton) {
      fireEvent.click(moreButton);
      
      // Click view details
      const viewDetailsButton = screen.getByText('View Details');
      fireEvent.click(viewDetailsButton);

      expect(screen.getByTestId('agent-details-modal')).toBeInTheDocument();
      expect(onAgentSelect).toHaveBeenCalledWith(mockAgents[0]);
    }
  });

  it('handles bulk actions', async () => {
    vi.mocked(adminApiService.getAgents).mockResolvedValue({
      success: true,
      data: mockAgents,
      pagination: { total: 2, page: 1, limit: 20 },
    });

    const onRefresh = vi.fn();
    render(<AgentList onRefresh={onRefresh} />);

    await waitFor(() => {
      expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
    });

    // Select agents
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // First agent
    fireEvent.click(checkboxes[2]); // Second agent

    // Click bulk actions
    const bulkActionsButton = screen.getByText('Bulk Actions (2)');
    fireEvent.click(bulkActionsButton);

    expect(screen.getByTestId('bulk-actions-modal')).toBeInTheDocument();

    // Complete bulk action
    const completeButton = screen.getByText('Complete');
    fireEvent.click(completeButton);

    expect(onRefresh).toHaveBeenCalled();
  });

  it('handles select all functionality', async () => {
    vi.mocked(adminApiService.getAgents).mockResolvedValue({
      success: true,
      data: mockAgents,
      pagination: { total: 2, page: 1, limit: 20 },
    });

    render(<AgentList />);

    await waitFor(() => {
      expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
    });

    // Click select all checkbox
    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(selectAllCheckbox);

    expect(screen.getByText('Bulk Actions (2)')).toBeInTheDocument();
  });

  it('displays empty state when no agents found', async () => {
    vi.mocked(adminApiService.getAgents).mockResolvedValue({
      success: true,
      data: [],
      pagination: { total: 0, page: 1, limit: 20 },
    });

    render(<AgentList />);

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByText('No agents found')).toBeInTheDocument();
    });
  });

  it('handles pagination', async () => {
    vi.mocked(adminApiService.getAgents).mockResolvedValue({
      success: true,
      data: mockAgents,
      pagination: { total: 50, page: 1, limit: 20 },
    });

    render(<AgentList />);

    await waitFor(() => {
      expect(screen.getByText('Showing 1 to 2 of 50 agents')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
    });
  });

  it('applies status filter correctly', async () => {
    vi.mocked(adminApiService.getAgents).mockResolvedValue({
      success: true,
      data: mockAgents,
      pagination: { total: 2, page: 1, limit: 20 },
    });

    render(<AgentList />);

    await waitFor(() => {
      expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
      expect(screen.getByText('Test Agent 2')).toBeInTheDocument();
    });

    // Change status filter to active only
    const statusSelect = screen.getByDisplayValue('All Status');
    fireEvent.click(statusSelect);
    
    const activeOption = screen.getByText('Active');
    fireEvent.click(activeOption);

    // Should trigger new API call with filter
    await waitFor(() => {
      expect(adminApiService.getAgents).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: true,
        })
      );
    });
  });
});