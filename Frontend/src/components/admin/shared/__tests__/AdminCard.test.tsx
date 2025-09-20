import { render, screen } from '@testing-library/react';
import { Users } from 'lucide-react';
import { AdminCard } from '../AdminCard';

describe('AdminCard', () => {
  it('renders basic card with title and value', () => {
    render(<AdminCard title="Total Users" value={150} />);
    
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
  });

  it('renders card with icon', () => {
    render(<AdminCard title="Total Users" value={150} icon={Users} />);
    
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    
    // Check if icon is rendered (SVG element)
    const icon = document.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('renders card with description', () => {
    render(
      <AdminCard
        title="Total Users"
        value={150}
        description="Active users in the system"
      />
    );
    
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('Active users in the system')).toBeInTheDocument();
  });

  it('renders card with positive trend', () => {
    render(
      <AdminCard
        title="Total Users"
        value={150}
        trend={{ value: 12, isPositive: true }}
      />
    );
    
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('+12%')).toBeInTheDocument();
    
    const trendElement = screen.getByText('+12%');
    expect(trendElement).toHaveClass('text-green-600');
  });

  it('renders card with negative trend', () => {
    render(
      <AdminCard
        title="Total Users"
        value={150}
        trend={{ value: -5, isPositive: false }}
      />
    );
    
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('-5%')).toBeInTheDocument();
    
    const trendElement = screen.getByText('-5%');
    expect(trendElement).toHaveClass('text-red-600');
  });

  it('renders card with children content', () => {
    render(
      <AdminCard title="System Status">
        <div data-testid="custom-content">Custom content here</div>
      </AdminCard>
    );
    
    expect(screen.getByText('System Status')).toBeInTheDocument();
    expect(screen.getByTestId('custom-content')).toBeInTheDocument();
    expect(screen.getByText('Custom content here')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <AdminCard title="Test" className="custom-class" />
    );
    
    const cardElement = container.firstChild as HTMLElement;
    expect(cardElement).toHaveClass('custom-class');
  });

  it('renders card without value', () => {
    render(<AdminCard title="System Status" description="All systems operational" />);
    
    expect(screen.getByText('System Status')).toBeInTheDocument();
    expect(screen.getByText('All systems operational')).toBeInTheDocument();
    
    // Should not render value section
    expect(screen.queryByText('text-2xl')).not.toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<AdminCard title="Total Users" value={150} icon={Users} />);
    
    const icon = document.querySelector('svg');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
  });
});