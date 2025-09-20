import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AgentManager from '../AgentManager';
import {
  renderWithProviders,
  setupIntegrationTest,
  cleanupIntegrationTest,
  mockApiService,
  mockApiSuccess,
  mockApiError,
  mockAgents,
  mockUser,
  waitForAsync,
} from '@/test/integration-utils';

const mockVoices = [
  {
    id: 'voice-1',
    name: 'Sarah',
    category: 'conversational',
    description: 'Friendly female voice',
    previewUrl: 'https://example.com/voice1.mp3',
  },
  {
    id: 'voice-2',
    name: 'David',
    category: 'professional',
    description: 'Professional male voice',
    previewUrl: 'https://example.com/voice2.mp3',
  },
];

describe('AgentManager Integration Tests', () => {
  beforeEach(() => {
    setupIntegrationTest();
  });

  afterEach(() => {
    cleanupIntegrationTest();
  });

  describe('Agent List Display', () => {
    it('should fetch and display agents on mount', async () => {
      mockApiSuccess('getAgents', mockAgents);

      renderWithProviders(<AgentManager />);

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });

      // Verify agents are displayed
      expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
      expect(screen.getByText('Test Agent 2')).toBeInTheDocument();
      expect(screen.getByText('CallAgent')).toBeInTheDocument();
      expect(screen.getByText('ChatAgent')).toBeInTheDocument();
      expect(screen.getByText('100 conversations')).toBeInTheDocument();
      expect(screen.getByText('50 conversations')).toBeInTheDocument();

      // Verify API was called
      expect(mockApiService.getAgents).toHaveBeenCalledTimes(1);
    });

    it('should handle empty agent list', async () => {
      mockApiSuccess('getAgents', []);

      renderWithProviders(<AgentManager />);

      await waitFor(() => {
        expect(screen.getByText(/no agents found/i)).toBeInTheDocument();
      });

      expect(mockApiService.getAgents).toHaveBeenCalledTimes(1);
    });

    it('should handle API error when fetching agents', async () => {
      mockApiError('getAgents', new Error('Failed to fetch agents'));

      renderWithProviders(<AgentManager />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load agents/i)).toBeInTheDocument();
      });

      // Should show retry button
      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();
    });

    it('should display agent status with appropriate styling', async () => {
      const agentsWithDifferentStatuses = [
        { ...mockAgents[0], status: 'active' },
        { ...mockAgents[1], status: 'inactive' },
      ];

      mockApiSuccess('getAgents', agentsWithDifferentStatuses);

      renderWithProviders(<AgentManager />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });

      // Check for different status indicators
      expect(screen.getByText('active')).toBeInTheDocument();
      expect(screen.getByText('inactive')).toBeInTheDocument();

      // Verify appropriate styling classes
      const activeBadge = screen.getByText('active').closest('[class*="bg-green"]');
      const inactiveBadge = screen.getByText('inactive').closest('[class*="bg-gray"]');

      expect(activeBadge).toBeInTheDocument();
      expect(inactiveBadge).toBeInTheDocument();
    });
  });

  describe('Agent Creation', () => {
    it('should create a new agent successfully', async () => {
      const user = userEvent.setup();
      mockApiSuccess('getAgents', mockAgents);
      mockApiSuccess('getVoices', mockVoices);
      
      const newAgent = {
        id: '3',
        userId: '1',
        elevenlabsAgentId: 'el-3',
        name: 'New Test Agent',
        agentType: 'call',
        type: 'CallAgent',
        language: 'English',
        description: 'New agent description',
        created: 'Jan 3, 2024',
        status: 'active',
        model: 'gpt-4o-mini',
        conversations: 0,
        creditsRemaining: 1000,
        isActive: true,
        createdAt: '2024-01-03T00:00:00Z',
        updatedAt: '2024-01-03T00:00:00Z',
      };
      
      mockApiSuccess('createAgent', newAgent);

      renderWithProviders(<AgentManager />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });

      // Click create agent button
      const createButton = screen.getByRole('button', { name: /create agent/i });
      await user.click(createButton);

      // Wait for modal to open and voices to load
      await waitFor(() => {
        expect(screen.getByText('Create New Agent')).toBeInTheDocument();
      });

      // Fill out the form
      const nameInput = screen.getByLabelText(/agent name/i);
      const typeSelect = screen.getByRole('combobox', { name: /agent type/i });
      const descriptionInput = screen.getByLabelText(/description/i);

      await user.type(nameInput, 'New Test Agent');
      await user.click(typeSelect);
      await user.click(screen.getByRole('option', { name: /call agent/i }));
      await user.type(descriptionInput, 'New agent description');

      // Select a voice
      const voiceSelect = screen.getByRole('combobox', { name: /voice/i });
      await user.click(voiceSelect);
      await user.click(screen.getByRole('option', { name: /sarah/i }));

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /create agent/i });
      await user.click(submitButton);

      // Wait for API call and success
      await waitFor(() => {
        expect(mockApiService.createAgent).toHaveBeenCalledWith({
          name: 'New Test Agent',
          agentType: 'call',
          description: 'New agent description',
          voiceId: 'voice-1',
          language: 'English',
          model: 'gpt-4o-mini',
        });
      });

      // Verify success message
      await waitFor(() => {
        expect(screen.getByText(/agent created successfully/i)).toBeInTheDocument();
      });
    });

    it('should handle validation errors during agent creation', async () => {
      const user = userEvent.setup();
      mockApiSuccess('getAgents', mockAgents);
      mockApiSuccess('getVoices', mockVoices);

      renderWithProviders(<AgentManager />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });

      // Click create agent button
      const createButton = screen.getByRole('button', { name: /create agent/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Create New Agent')).toBeInTheDocument();
      });

      // Try to submit without required fields
      const submitButton = screen.getByRole('button', { name: /create agent/i });
      await user.click(submitButton);

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/agent name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/agent type is required/i)).toBeInTheDocument();
      });
    });

    it('should handle API error during agent creation', async () => {
      const user = userEvent.setup();
      mockApiSuccess('getAgents', mockAgents);
      mockApiSuccess('getVoices', mockVoices);
      mockApiError('createAgent', new Error('Failed to create agent'));

      renderWithProviders(<AgentManager />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });

      // Fill out and submit form
      const createButton = screen.getByRole('button', { name: /create agent/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Create New Agent')).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/agent name/i);
      await user.type(nameInput, 'Test Agent');

      const typeSelect = screen.getByRole('combobox', { name: /agent type/i });
      await user.click(typeSelect);
      await user.click(screen.getByRole('option', { name: /call agent/i }));

      const submitButton = screen.getByRole('button', { name: /create agent/i });
      await user.click(submitButton);

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText(/failed to create agent/i)).toBeInTheDocument();
      });
    });
  });

  describe('Agent Editing', () => {
    it('should edit an existing agent successfully', async () => {
      const user = userEvent.setup();
      mockApiSuccess('getAgents', mockAgents);
      mockApiSuccess('getVoices', mockVoices);
      
      const updatedAgent = {
        ...mockAgents[0],
        name: 'Updated Agent Name',
        description: 'Updated description',
      };
      
      mockApiSuccess('updateAgent', updatedAgent);

      renderWithProviders(<AgentManager />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });

      // Find and click edit button for first agent
      const agentCards = screen.getAllByTestId('agent-card');
      const editButton = within(agentCards[0]).getByRole('button', { name: /edit/i });
      await user.click(editButton);

      // Wait for edit modal to open
      await waitFor(() => {
        expect(screen.getByText('Edit Agent')).toBeInTheDocument();
      });

      // Update the form
      const nameInput = screen.getByDisplayValue('Test Agent 1');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Agent Name');

      const descriptionInput = screen.getByDisplayValue('Test agent description');
      await user.clear(descriptionInput);
      await user.type(descriptionInput, 'Updated description');

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(submitButton);

      // Wait for API call
      await waitFor(() => {
        expect(mockApiService.updateAgent).toHaveBeenCalledWith('1', {
          name: 'Updated Agent Name',
          description: 'Updated description',
          agentType: 'call',
          language: 'English',
          model: 'gpt-4o-mini',
        });
      });

      // Verify success message
      await waitFor(() => {
        expect(screen.getByText(/agent updated successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('Agent Deletion', () => {
    it('should delete an agent successfully', async () => {
      const user = userEvent.setup();
      mockApiSuccess('getAgents', mockAgents);
      mockApiSuccess('deleteAgent', undefined);

      renderWithProviders(<AgentManager />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });

      // Find and click delete button for first agent
      const agentCards = screen.getAllByTestId('agent-card');
      const deleteButton = within(agentCards[0]).getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      // Wait for API call
      await waitFor(() => {
        expect(mockApiService.deleteAgent).toHaveBeenCalledWith('1');
      });

      // Verify success message
      await waitFor(() => {
        expect(screen.getByText(/agent deleted successfully/i)).toBeInTheDocument();
      });
    });

    it('should handle API error during agent deletion', async () => {
      const user = userEvent.setup();
      mockApiSuccess('getAgents', mockAgents);
      mockApiError('deleteAgent', new Error('Failed to delete agent'));

      renderWithProviders(<AgentManager />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });

      // Find and click delete button
      const agentCards = screen.getAllByTestId('agent-card');
      const deleteButton = within(agentCards[0]).getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText(/failed to delete agent/i)).toBeInTheDocument();
      });
    });
  });

  describe('Agent Testing', () => {
    it('should test agent connection successfully', async () => {
      const user = userEvent.setup();
      mockApiSuccess('getAgents', mockAgents);
      mockApiSuccess('testAgentConnection', { 
        success: true, 
        message: 'Connection successful',
        latency: 150 
      });

      renderWithProviders(<AgentManager />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });

      // Find and click test button for first agent
      const agentCards = screen.getAllByTestId('agent-card');
      const testButton = within(agentCards[0]).getByRole('button', { name: /test/i });
      await user.click(testButton);

      // Wait for API call
      await waitFor(() => {
        expect(mockApiService.testAgentConnection).toHaveBeenCalledWith('1');
      });

      // Verify success message
      await waitFor(() => {
        expect(screen.getByText(/connection successful/i)).toBeInTheDocument();
        expect(screen.getByText(/latency: 150ms/i)).toBeInTheDocument();
      });
    });

    it('should handle agent connection test failure', async () => {
      const user = userEvent.setup();
      mockApiSuccess('getAgents', mockAgents);
      mockApiError('testAgentConnection', new Error('Connection failed'));

      renderWithProviders(<AgentManager />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });

      // Find and click test button
      const agentCards = screen.getAllByTestId('agent-card');
      const testButton = within(agentCards[0]).getByRole('button', { name: /test/i });
      await user.click(testButton);

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText(/connection failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Voice Selection', () => {
    it('should load and display available voices', async () => {
      const user = userEvent.setup();
      mockApiSuccess('getAgents', mockAgents);
      mockApiSuccess('getVoices', mockVoices);

      renderWithProviders(<AgentManager />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });

      // Open create agent modal
      const createButton = screen.getByRole('button', { name: /create agent/i });
      await user.click(createButton);

      // Wait for voices to load
      await waitFor(() => {
        expect(mockApiService.getVoices).toHaveBeenCalledTimes(1);
      });

      // Open voice selector
      const voiceSelect = screen.getByRole('combobox', { name: /voice/i });
      await user.click(voiceSelect);

      // Verify voices are displayed
      expect(screen.getByRole('option', { name: /sarah/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /david/i })).toBeInTheDocument();
    });

    it('should handle voice preview playback', async () => {
      const user = userEvent.setup();
      mockApiSuccess('getAgents', mockAgents);
      mockApiSuccess('getVoices', mockVoices);

      // Mock audio playback
      const mockPlay = vi.fn();
      global.Audio = vi.fn().mockImplementation(() => ({
        play: mockPlay,
        pause: vi.fn(),
        currentTime: 0,
        duration: 0,
      }));

      renderWithProviders(<AgentManager />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });

      // Open create agent modal
      const createButton = screen.getByRole('button', { name: /create agent/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Create New Agent')).toBeInTheDocument();
      });

      // Open voice selector and select a voice
      const voiceSelect = screen.getByRole('combobox', { name: /voice/i });
      await user.click(voiceSelect);
      await user.click(screen.getByRole('option', { name: /sarah/i }));

      // Click preview button
      const previewButton = screen.getByRole('button', { name: /preview voice/i });
      await user.click(previewButton);

      // Verify audio playback was initiated
      expect(global.Audio).toHaveBeenCalledWith('https://example.com/voice1.mp3');
      expect(mockPlay).toHaveBeenCalled();
    });
  });

  describe('Real-time Updates', () => {
    it('should refresh agent list after successful operations', async () => {
      const user = userEvent.setup();
      
      // Mock initial load
      mockApiSuccess('getAgents', mockAgents);
      
      // Mock updated list after creation
      const updatedAgents = [...mockAgents, {
        id: '3',
        userId: '1',
        elevenlabsAgentId: 'el-3',
        name: 'New Agent',
        agentType: 'call',
        type: 'CallAgent',
        language: 'English',
        description: 'New agent',
        created: 'Jan 3, 2024',
        status: 'active',
        model: 'gpt-4o-mini',
        conversations: 0,
        creditsRemaining: 1000,
        isActive: true,
        createdAt: '2024-01-03T00:00:00Z',
        updatedAt: '2024-01-03T00:00:00Z',
      }];

      renderWithProviders(<AgentManager />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });

      // Reset mock to return updated list
      mockApiService.getAgents.mockResolvedValue({ data: updatedAgents, success: true });
      mockApiSuccess('getVoices', mockVoices);
      mockApiSuccess('createAgent', updatedAgents[2]);

      // Create new agent
      const createButton = screen.getByRole('button', { name: /create agent/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Create New Agent')).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/agent name/i);
      await user.type(nameInput, 'New Agent');

      const typeSelect = screen.getByRole('combobox', { name: /agent type/i });
      await user.click(typeSelect);
      await user.click(screen.getByRole('option', { name: /call agent/i }));

      const submitButton = screen.getByRole('button', { name: /create agent/i });
      await user.click(submitButton);

      // Wait for refresh
      await waitFor(() => {
        expect(mockApiService.getAgents).toHaveBeenCalledTimes(2);
      });

      // Verify new agent appears in list
      await waitFor(() => {
        expect(screen.getByText('New Agent')).toBeInTheDocument();
      });
    });
  });

  describe('Error Recovery', () => {
    it('should recover from network errors', async () => {
      const user = userEvent.setup();
      
      // Simulate network error
      mockApiError('getAgents', new Error('Network error'));

      renderWithProviders(<AgentManager />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load agents/i)).toBeInTheDocument();
      });

      // Simulate network recovery
      mockApiSuccess('getAgents', mockAgents);

      // Retry should work
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
        expect(screen.queryByText(/failed to load/i)).not.toBeInTheDocument();
      });
    });

    it('should handle partial data loading gracefully', async () => {
      const partialAgents = [
        {
          ...mockAgents[0],
          conversations: null, // Missing conversation count
          creditsRemaining: null, // Missing credits
        },
      ];

      mockApiSuccess('getAgents', partialAgents);

      renderWithProviders(<AgentManager />);

      await waitFor(() => {
        expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
        // Should handle missing data gracefully
        expect(screen.getByText('-- conversations')).toBeInTheDocument();
        expect(screen.getByText('-- credits')).toBeInTheDocument();
      });
    });
  });
});