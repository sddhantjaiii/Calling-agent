import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import LeadProfileTab from './LeadProfileTab';
import { useLeadProfile } from '@/hooks/useLeadProfile';

// Mock the useLeadProfile hook
vi.mock('@/hooks/useLeadProfile');

// Mock the TimelineCard component
vi.mock('./TimelineCard', () => ({
  TimelineCard: ({ entry }: { entry: any }) => (
    <div data-testid="timeline-card">
      <span>{entry.type} - {entry.status}</span>
    </div>
  )
}));

const mockUseLeadProfile = vi.mocked(useLeadProfile);

describe('LeadProfileTab', () => {
  const mockLead = {
    id: '1',
    name: 'Test Lead',
    email: 'test@example.com',
    phone: '+1234567890',
    company: 'Test Company',
    businessType: 'SaaS',
    leadType: 'Customer',
    leadTag: 'Hot',
    agentType: 'CallAgent',
    interactions: 1,
    engagementLevel: 'High',
    intentLevel: 'High',
    budgetConstraint: 'No',
    timelineUrgency: 'High',
    useCase: 'Interested in our services',
    followUpScheduled: '',
    demoScheduled: '',
  };

  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state when data is being fetched', () => {
    mockUseLeadProfile.mockReturnValue({
      leadProfile: null,
      timeline: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<LeadProfileTab lead={mockLead} onBack={mockOnBack} />);

    expect(screen.getByText('Loading Lead Profile...')).toBeInTheDocument();
    expect(screen.getByText('Fetching lead data...')).toBeInTheDocument();
  });

  it('shows error state when API call fails', () => {
    mockUseLeadProfile.mockReturnValue({
      leadProfile: null,
      timeline: null,
      loading: false,
      error: 'Failed to fetch lead profile',
      refetch: vi.fn(),
    });

    render(<LeadProfileTab lead={mockLead} onBack={mockOnBack} />);

    expect(screen.getByText('Error Loading Lead Profile')).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch lead profile')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('displays "No data available" states when API returns empty data', async () => {
    mockUseLeadProfile.mockReturnValue({
      leadProfile: null,
      timeline: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<LeadProfileTab lead={mockLead} onBack={mockOnBack} />);

    await waitFor(() => {
      expect(screen.getByText('No analytics data available')).toBeInTheDocument();
      expect(screen.getByText('No analysis available')).toBeInTheDocument();
      expect(screen.getByText('No CTA interaction data available')).toBeInTheDocument();
      expect(screen.getByText('No interactions available')).toBeInTheDocument();
    });
  });

  it('displays real API data when available', async () => {
    const mockLeadProfile = {
      id: '1',
      name: 'Test Lead',
      email: 'test@example.com',
      phone: '+1234567890',
      totalScore: 85,
      scores: {
        intent: 90,
        urgency: 80,
        budget: 85,
        fit: 88,
        engagement: 82,
      },
      reasoning: {
        intent: 'Customer showed strong interest in the product',
        urgency: 'Mentioned need to implement solution within 30 days',
        budget: 'Confirmed budget availability for enterprise plan',
        fit: 'Perfect match for our target customer profile',
        engagement: 'Highly engaged throughout the conversation',
      },
      ctaInteractions: {
        pricing_clicked: true,
        demo_clicked: true,
        followup_clicked: false,
        sample_clicked: true,
        escalated_to_human: false,
      },
    };

    const mockTimeline = [
      {
        id: '1',
        type: 'call',
        status: 'completed',
        interactionAgent: 'CallAgent-01',
        interactionDate: '2024-01-15',
        platform: 'Phone',
        duration: '5:30',
        recording: true,
        transcript: 'This is a test transcript content',
        actions: 'Call completed successfully',
      }
    ];

    mockUseLeadProfile.mockReturnValue({
      leadProfile: mockLeadProfile,
      timeline: mockTimeline,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<LeadProfileTab lead={mockLead} onBack={mockOnBack} />);

    await waitFor(() => {
      // Check that real analytics data is displayed
      const totalScoreElements = screen.getAllByText('85/100');
      expect(totalScoreElements.length).toBeGreaterThan(0); // Total score appears
      expect(screen.getByText('90/100')).toBeInTheDocument(); // Intent score
      
      // Check that real reasoning is displayed
      expect(screen.getByText('Customer showed strong interest in the product')).toBeInTheDocument();
      
      // Check that CTA interactions are displayed
      const yesElements = screen.getAllByText('Yes');
      expect(yesElements.length).toBeGreaterThan(0); // For pricing_clicked and other CTAs
      
      // Check that timeline is displayed
      expect(screen.getByTestId('timeline-card')).toBeInTheDocument();
    });
  });

  it('shows "No analysis available" when reasoning data is empty', async () => {
    const mockLeadProfile = {
      id: '1',
      name: 'Test Lead',
      reasoning: {
        intent: 'No analysis available',
        urgency: 'No analysis available',
      },
    };

    mockUseLeadProfile.mockReturnValue({
      leadProfile: mockLeadProfile,
      timeline: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<LeadProfileTab lead={mockLead} onBack={mockOnBack} />);

    await waitFor(() => {
      // Should show "No analysis available" for empty reasoning
      const noAnalysisElements = screen.getAllByText('No analysis available');
      expect(noAnalysisElements.length).toBeGreaterThan(0);
    });
  });
});