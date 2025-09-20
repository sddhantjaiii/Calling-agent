import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EnhancedLeadCard, type EnhancedLead } from '../EnhancedLeadCard';
import { ThemeProvider } from '@/components/theme/ThemeProvider';

// Mock the theme provider
const MockThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider defaultTheme="light" storageKey="test-theme">
    {children}
  </ThemeProvider>
);

const mockLead: EnhancedLead = {
  id: '1',
  name: 'John Smith',
  email: 'john.smith@techcorp.com',
  phone: '+1-555-0123',
  companyName: 'TechCorp Solutions',
  extractedName: 'John Smith',
  extractedEmail: 'john.smith@techcorp.com',
  totalScore: 85,
  leadStatusTag: 'Hot',
  intentScore: 90,
  urgencyScore: 80,
  budgetScore: 85,
  fitScore: 88,
  engagementScore: 82,
  ctaInteractions: {
    ctaPricingClicked: true,
    ctaDemoClicked: true,
    ctaFollowupClicked: false,
    ctaSampleClicked: true,
    ctaEscalatedToHuman: false
  },
  createdAt: '2024-01-15T10:30:00Z',
  source: 'Website',
  status: 'qualified'
};

const mockLeadWithoutCompany: EnhancedLead = {
  ...mockLead,
  id: '2',
  companyName: undefined,
  name: 'Jane Doe',
  extractedName: 'Jane Doe'
};

describe('EnhancedLeadCard', () => {
  it('renders lead information correctly', () => {
    render(
      <MockThemeProvider>
        <EnhancedLeadCard lead={mockLead} />
      </MockThemeProvider>
    );

    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.getByText('TechCorp Solutions')).toBeInTheDocument();
    expect(screen.getByText('john.smith@techcorp.com')).toBeInTheDocument();
    expect(screen.getByText('+1-555-0123')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.getByText('Hot')).toBeInTheDocument();
  });

  it('displays CTA badges correctly', () => {
    render(
      <MockThemeProvider>
        <EnhancedLeadCard lead={mockLead} />
      </MockThemeProvider>
    );

    // Should show badges for active CTAs
    expect(screen.getByText('Pricing')).toBeInTheDocument();
    expect(screen.getByText('Demo')).toBeInTheDocument();
    expect(screen.getByText('Sample')).toBeInTheDocument();
    
    // Should not show badges for inactive CTAs
    expect(screen.queryByText('Follow-up')).not.toBeInTheDocument();
    expect(screen.queryByText('Human')).not.toBeInTheDocument();
  });

  it('handles missing company name gracefully', () => {
    render(
      <MockThemeProvider>
        <EnhancedLeadCard lead={mockLeadWithoutCompany} />
      </MockThemeProvider>
    );

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.queryByText('TechCorp Solutions')).not.toBeInTheDocument();
    // Should still render other information
    expect(screen.getByText('john.smith@techcorp.com')).toBeInTheDocument();
  });

  it('calls action handlers when buttons are clicked', () => {
    const mockViewDetails = vi.fn();
    const mockContact = vi.fn();
    const mockScheduleDemo = vi.fn();

    render(
      <MockThemeProvider>
        <EnhancedLeadCard
          lead={mockLead}
          onViewDetails={mockViewDetails}
          onContact={mockContact}
          onScheduleDemo={mockScheduleDemo}
        />
      </MockThemeProvider>
    );

    // Find and click action buttons
    const contactButton = screen.getByLabelText('Contact John Smith');
    const demoButton = screen.getByLabelText('Schedule demo with John Smith');
    const detailsButton = screen.getByLabelText('View details for John Smith');

    fireEvent.click(contactButton);
    fireEvent.click(demoButton);
    fireEvent.click(detailsButton);

    expect(mockContact).toHaveBeenCalledWith('1');
    expect(mockScheduleDemo).toHaveBeenCalledWith('1');
    expect(mockViewDetails).toHaveBeenCalledWith('1');
  });

  it('renders in compact mode correctly', () => {
    render(
      <MockThemeProvider>
        <EnhancedLeadCard lead={mockLead} compact={true} />
      </MockThemeProvider>
    );

    // Should still show main information
    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.getByText('TechCorp Solutions')).toBeInTheDocument();
    
    // Compact mode should show compact CTA badges
    expect(screen.getByText('$')).toBeInTheDocument(); // Compact pricing badge
    expect(screen.getByText('▶')).toBeInTheDocument(); // Compact demo badge
  });

  it('displays lead score with appropriate color', () => {
    const highScoreLead = { ...mockLead, totalScore: 90 };
    const lowScoreLead = { ...mockLead, totalScore: 30 };

    const { rerender } = render(
      <MockThemeProvider>
        <EnhancedLeadCard lead={highScoreLead} />
      </MockThemeProvider>
    );

    let scoreElement = screen.getByText('90');
    expect(scoreElement).toHaveClass('text-green-600');

    rerender(
      <MockThemeProvider>
        <EnhancedLeadCard lead={lowScoreLead} />
      </MockThemeProvider>
    );

    scoreElement = screen.getByText('30');
    expect(scoreElement).toHaveClass('text-red-600');
  });

  it('shows engagement metrics in non-compact mode', () => {
    render(
      <MockThemeProvider>
        <EnhancedLeadCard lead={mockLead} compact={false} />
      </MockThemeProvider>
    );

    expect(screen.getByText('Intent: 90/100')).toBeInTheDocument();
    expect(screen.getByText('Urgency: 80/100')).toBeInTheDocument();
  });

  it('hides engagement metrics in compact mode', () => {
    render(
      <MockThemeProvider>
        <EnhancedLeadCard lead={mockLead} compact={true} />
      </MockThemeProvider>
    );

    expect(screen.queryByText('Intent: 90/100')).not.toBeInTheDocument();
    expect(screen.queryByText('Urgency: 80/100')).not.toBeInTheDocument();
  });

  it('formats date correctly', () => {
    render(
      <MockThemeProvider>
        <EnhancedLeadCard lead={mockLead} />
      </MockThemeProvider>
    );

    // Should format the date as "Jan 15, 2024"
    expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
  });

  it('displays source information', () => {
    render(
      <MockThemeProvider>
        <EnhancedLeadCard lead={mockLead} />
      </MockThemeProvider>
    );

    expect(screen.getByText('Website')).toBeInTheDocument();
  });
});