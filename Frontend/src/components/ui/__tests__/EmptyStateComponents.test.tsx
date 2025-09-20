import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  BaseEmptyState,
  NoDataAvailable,
  NoKPIData,
  NoAnalyticsData,
  NoLeadsData,
  NoCallsData,
  NoChatsData,
  NoSearchResults,
  LoadingFailed,
  NetworkError,
  UnauthorizedAccess,
  EmptyChart,
  EmptyTable,
  EmptyLeadProfile,
  EmptyInteractionHistory,
  EmptyDashboardSection,
  EmptyDateRange
} from '../EmptyStateComponents';

describe('EmptyStateComponents', () => {
  describe('BaseEmptyState', () => {
    it('renders with basic props', () => {
      render(
        <BaseEmptyState
          title="Test Title"
          description="Test Description"
        />
      );

      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
    });

    it('renders with action button', () => {
      const mockAction = vi.fn();
      render(
        <BaseEmptyState
          title="Test Title"
          description="Test Description"
          action={{
            label: "Test Action",
            onClick: mockAction
          }}
        />
      );

      const button = screen.getByRole('button', { name: 'Test Action' });
      expect(button).toBeInTheDocument();
      
      fireEvent.click(button);
      expect(mockAction).toHaveBeenCalledTimes(1);
    });

    it('renders with secondary action', () => {
      const mockPrimary = vi.fn();
      const mockSecondary = vi.fn();
      
      render(
        <BaseEmptyState
          title="Test Title"
          description="Test Description"
          action={{
            label: "Primary Action",
            onClick: mockPrimary
          }}
          secondaryAction={{
            label: "Secondary Action",
            onClick: mockSecondary
          }}
        />
      );

      expect(screen.getByRole('button', { name: 'Primary Action' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Secondary Action' })).toBeInTheDocument();
    });

    it('applies different sizes correctly', () => {
      const { rerender } = render(
        <BaseEmptyState
          title="Test Title"
          description="Test Description"
          size="sm"
          testId="empty-state"
        />
      );

      expect(screen.getByTestId('empty-state')).toHaveClass('py-8');

      rerender(
        <BaseEmptyState
          title="Test Title"
          description="Test Description"
          size="lg"
          testId="empty-state"
        />
      );

      expect(screen.getByTestId('empty-state')).toHaveClass('py-16');
    });

    it('shows border when showBorder is true', () => {
      render(
        <BaseEmptyState
          title="Test Title"
          description="Test Description"
          showBorder={true}
          testId="empty-state"
        />
      );

      expect(screen.getByTestId('empty-state')).toHaveClass('border', 'rounded-lg', 'bg-card');
    });
  });

  describe('NoDataAvailable', () => {
    it('renders with default props', () => {
      render(<NoDataAvailable />);
      
      expect(screen.getByText('No data available')).toBeInTheDocument();
      expect(screen.getByText(/Data will appear here once you have interactions and leads/)).toBeInTheDocument();
    });

    it('renders with refresh action', () => {
      const mockRefresh = vi.fn();
      render(<NoDataAvailable onRefresh={mockRefresh} />);
      
      const refreshButton = screen.getByRole('button', { name: 'Refresh' });
      fireEvent.click(refreshButton);
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('NoKPIData', () => {
    it('renders KPI-specific content', () => {
      render(<NoKPIData />);
      
      expect(screen.getByText('No KPI data available')).toBeInTheDocument();
      expect(screen.getByText(/Key performance indicators will appear here/)).toBeInTheDocument();
    });
  });

  describe('NoAnalyticsData', () => {
    it('renders analytics-specific content', () => {
      render(<NoAnalyticsData />);
      
      expect(screen.getByText('No analytics data')).toBeInTheDocument();
      expect(screen.getByText(/Charts and analytics will appear here/)).toBeInTheDocument();
    });

    it('renders with chart type', () => {
      render(<NoAnalyticsData chartType="line chart" />);
      
      expect(screen.getByText('No line chart data')).toBeInTheDocument();
    });
  });

  describe('NoLeadsData', () => {
    it('renders leads-specific content', () => {
      render(<NoLeadsData />);
      
      expect(screen.getByText('No leads found')).toBeInTheDocument();
      expect(screen.getByText(/Leads will appear here once you start having conversations/)).toBeInTheDocument();
    });

    it('renders filtered state', () => {
      render(<NoLeadsData isFiltered={true} filterCount={3} />);
      
      expect(screen.getByText('No leads match your filters')).toBeInTheDocument();
      expect(screen.getByText(/No leads found with the current 3 filters applied/)).toBeInTheDocument();
    });

    it('renders add lead action', () => {
      const mockAddLead = vi.fn();
      render(<NoLeadsData onAddLead={mockAddLead} />);
      
      const addButton = screen.getByRole('button', { name: 'Add Lead' });
      fireEvent.click(addButton);
      expect(mockAddLead).toHaveBeenCalledTimes(1);
    });
  });

  describe('NoCallsData', () => {
    it('renders calls-specific content', () => {
      render(<NoCallsData />);
      
      expect(screen.getByText('No calls found')).toBeInTheDocument();
      expect(screen.getByText(/Call records will appear here once you start making/)).toBeInTheDocument();
    });

    it('renders filtered state', () => {
      render(<NoCallsData isFiltered={true} />);
      
      expect(screen.getByText('No calls match your filters')).toBeInTheDocument();
    });
  });

  describe('NoSearchResults', () => {
    it('renders search-specific content', () => {
      render(<NoSearchResults searchTerm="test query" entityType="leads" />);
      
      expect(screen.getByText('No search results')).toBeInTheDocument();
      expect(screen.getByText(/No leads found for "test query"/)).toBeInTheDocument();
    });

    it('renders clear search action', () => {
      const mockClearSearch = vi.fn();
      render(
        <NoSearchResults 
          searchTerm="test" 
          onClearSearch={mockClearSearch}
          entityType="leads"
        />
      );
      
      const clearButton = screen.getByRole('button', { name: 'Clear Search' });
      fireEvent.click(clearButton);
      expect(mockClearSearch).toHaveBeenCalledTimes(1);
    });
  });

  describe('EmptyChart', () => {
    it('renders chart-specific content', () => {
      render(<EmptyChart />);
      
      expect(screen.getByText('No line chart data')).toBeInTheDocument();
      expect(screen.getByTestId('empty-chart')).toBeInTheDocument();
    });

    it('renders different chart types', () => {
      const { rerender } = render(<EmptyChart chartType="bar" />);
      expect(screen.getByText('No bar chart data')).toBeInTheDocument();

      rerender(<EmptyChart chartType="pie" />);
      expect(screen.getByText('No pie chart data')).toBeInTheDocument();
    });

    it('renders filtered state', () => {
      render(<EmptyChart isFiltered={true} />);
      
      expect(screen.getByText('No line chart data for current filters')).toBeInTheDocument();
    });
  });

  describe('EmptyTable', () => {
    it('renders table-specific content', () => {
      render(<EmptyTable />);
      
      expect(screen.getByText('No data found')).toBeInTheDocument();
      expect(screen.getByTestId('empty-table')).toBeInTheDocument();
    });

    it('renders with entity type', () => {
      render(<EmptyTable entityType="leads" />);
      
      expect(screen.getByText('No leads found')).toBeInTheDocument();
    });

    it('renders filtered state', () => {
      render(<EmptyTable isFiltered={true} entityType="calls" />);
      
      expect(screen.getByText('No calls match your filters')).toBeInTheDocument();
    });
  });

  describe('EmptyLeadProfile', () => {
    it('renders lead profile content', () => {
      render(<EmptyLeadProfile />);
      
      expect(screen.getByText('No profile data available')).toBeInTheDocument();
      expect(screen.getByTestId('empty-lead-profile')).toBeInTheDocument();
    });

    it('renders with lead name', () => {
      render(<EmptyLeadProfile leadName="John Doe" />);
      
      expect(screen.getByText(/Profile information for John Doe is not available/)).toBeInTheDocument();
    });

    it('renders contact lead action', () => {
      const mockContactLead = vi.fn();
      render(<EmptyLeadProfile onContactLead={mockContactLead} />);
      
      const contactButton = screen.getByRole('button', { name: 'Contact Lead' });
      fireEvent.click(contactButton);
      expect(mockContactLead).toHaveBeenCalledTimes(1);
    });
  });

  describe('EmptyInteractionHistory', () => {
    it('renders interaction history content', () => {
      render(<EmptyInteractionHistory />);
      
      expect(screen.getByText('No interaction history')).toBeInTheDocument();
      expect(screen.getByTestId('empty-interaction-history')).toBeInTheDocument();
    });

    it('renders with lead name', () => {
      render(<EmptyInteractionHistory leadName="Jane Smith" />);
      
      expect(screen.getByText(/No conversations found with Jane Smith yet/)).toBeInTheDocument();
    });

    it('renders start conversation action', () => {
      const mockStartConversation = vi.fn();
      render(<EmptyInteractionHistory onStartConversation={mockStartConversation} />);
      
      const startButton = screen.getByRole('button', { name: 'Start Conversation' });
      fireEvent.click(startButton);
      expect(mockStartConversation).toHaveBeenCalledTimes(1);
    });
  });

  describe('EmptyDashboardSection', () => {
    it('renders overview section', () => {
      render(<EmptyDashboardSection sectionType="overview" />);
      
      expect(screen.getByText('No overview data available')).toBeInTheDocument();
      expect(screen.getByTestId('empty-overview-section')).toBeInTheDocument();
    });

    it('renders analytics section', () => {
      render(<EmptyDashboardSection sectionType="analytics" />);
      
      expect(screen.getByText('No analytics data available')).toBeInTheDocument();
    });

    it('renders filtered state', () => {
      render(<EmptyDashboardSection sectionType="leads" isFiltered={true} />);
      
      expect(screen.getByText('No leads match your filters')).toBeInTheDocument();
    });
  });

  describe('EmptyDateRange', () => {
    it('renders date range content', () => {
      render(<EmptyDateRange />);
      
      expect(screen.getByText(/No data found for the selected date range/)).toBeInTheDocument();
      expect(screen.getByTestId('empty-date-range')).toBeInTheDocument();
    });

    it('renders with specific date range', () => {
      const dateRange = {
        from: new Date('2024-01-01'),
        to: new Date('2024-01-31')
      };
      
      render(<EmptyDateRange dateRange={dateRange} entityType="calls" />);
      
      expect(screen.getByText(/No calls found from/)).toBeInTheDocument();
    });

    it('renders change date range action', () => {
      const mockChangeDateRange = vi.fn();
      render(<EmptyDateRange onChangeDateRange={mockChangeDateRange} />);
      
      const changeButton = screen.getByRole('button', { name: 'Change Date Range' });
      fireEvent.click(changeButton);
      expect(mockChangeDateRange).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error States', () => {
    it('renders LoadingFailed', () => {
      render(<LoadingFailed />);
      
      expect(screen.getByText('Failed to load data')).toBeInTheDocument();
    });

    it('renders NetworkError', () => {
      render(<NetworkError />);
      
      expect(screen.getByText('Connection Error')).toBeInTheDocument();
    });

    it('renders UnauthorizedAccess', () => {
      render(<UnauthorizedAccess />);
      
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(
        <BaseEmptyState
          title="Test Title"
          description="Test Description"
          testId="empty-state"
        />
      );

      const container = screen.getByTestId('empty-state');
      expect(container).toHaveAttribute('role', 'status');
      expect(container).toHaveAttribute('aria-live', 'polite');
    });

    it('has proper button labels', () => {
      const mockAction = vi.fn();
      render(
        <BaseEmptyState
          title="Test Title"
          description="Test Description"
          action={{
            label: "Test Action",
            onClick: mockAction
          }}
        />
      );

      const button = screen.getByRole('button', { name: 'Test Action' });
      expect(button).toHaveAttribute('aria-label', 'Test Action');
    });
  });
});