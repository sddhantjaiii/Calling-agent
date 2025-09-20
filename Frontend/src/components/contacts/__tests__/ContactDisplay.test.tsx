import React from 'react';
import { render, screen } from '@testing-library/react';
import { ContactDisplay } from '../ContactDisplay';

describe('ContactDisplay', () => {
  it('should display contact information when provided', () => {
    const contact = {
      name: 'John Doe',
      email: 'john@example.com',
      phoneNumber: '+1234567890'
    };

    render(<ContactDisplay contact={contact} callSource="phone" />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('+1234567890')).toBeInTheDocument();
  });

  it('should show "Web Visitor" for internet calls without contact info', () => {
    render(<ContactDisplay callSource="internet" />);

    expect(screen.getByText('Web Visitor')).toBeInTheDocument();
    expect(screen.getByText('No contact information available')).toBeInTheDocument();
  });

  it('should show "Unknown Caller" for phone calls without contact info', () => {
    render(<ContactDisplay callSource="phone" />);

    expect(screen.getByText('Unknown Caller')).toBeInTheDocument();
    expect(screen.getByText('Contact details not provided')).toBeInTheDocument();
  });

  it('should not show fake emails', () => {
    const contact = {
      name: 'Jane Doe',
      email: null,
      phoneNumber: '+1234567890'
    };

    render(<ContactDisplay contact={contact} callSource="phone" />);

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('+1234567890')).toBeInTheDocument();
    expect(screen.queryByText(/lead.*@.*com/)).not.toBeInTheDocument();
    expect(screen.queryByText('No email available')).not.toBeInTheDocument();
  });

  it('should handle partial contact information gracefully', () => {
    const contact = {
      name: 'Bob Smith',
      email: 'bob@example.com',
      phoneNumber: null
    };

    render(<ContactDisplay contact={contact} callSource="internet" />);

    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    expect(screen.getByText('bob@example.com')).toBeInTheDocument();
    expect(screen.queryByText('No contact information available')).not.toBeInTheDocument();
  });

  it('should show appropriate message for internet calls with no contact info', () => {
    render(<ContactDisplay callSource="internet" />);

    expect(screen.getByText('Web Visitor')).toBeInTheDocument();
    expect(screen.getByText('No contact information available')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const contact = {
      name: 'Test User',
      email: 'test@example.com',
      phoneNumber: '+1234567890'
    };

    const { container } = render(
      <ContactDisplay contact={contact} callSource="phone" className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
});