import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CallSourceIndicator, getCallSourceFromData } from '../CallSourceIndicator';

describe('CallSourceIndicator', () => {
  it('renders phone call source correctly', () => {
    render(
      <CallSourceIndicator 
        callSource="phone" 
        phoneNumber="+1234567890" 
      />
    );
    
    expect(screen.getByText('+1234567890')).toBeInTheDocument();
    expect(screen.getByLabelText('Phone call from +1234567890')).toBeInTheDocument();
  });

  it('renders internet call source correctly', () => {
    render(
      <CallSourceIndicator 
        callSource="internet" 
      />
    );
    
    expect(screen.getByText('Internet Call')).toBeInTheDocument();
    expect(screen.getByLabelText('Internet call')).toBeInTheDocument();
  });

  it('renders unknown call source correctly', () => {
    render(
      <CallSourceIndicator 
        callSource="unknown" 
      />
    );
    
    expect(screen.getByText('Unknown Source')).toBeInTheDocument();
    expect(screen.getByLabelText('Unknown call source')).toBeInTheDocument();
  });

  it('renders without label when showLabel is false', () => {
    render(
      <CallSourceIndicator 
        callSource="phone" 
        phoneNumber="+1234567890"
        showLabel={false}
      />
    );
    
    expect(screen.queryByText('+1234567890')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Phone call from +1234567890')).toBeInTheDocument();
  });

  it('applies different sizes correctly', () => {
    const { rerender } = render(
      <CallSourceIndicator 
        callSource="phone" 
        size="sm"
      />
    );
    
    let indicator = screen.getByRole('img');
    expect(indicator).toHaveClass('px-2', 'py-1');

    rerender(
      <CallSourceIndicator 
        callSource="phone" 
        size="lg"
      />
    );
    
    indicator = screen.getByRole('img');
    expect(indicator).toHaveClass('px-3', 'py-2');
  });
});

describe('getCallSourceFromData', () => {
  it('returns explicit call_source when available', () => {
    const call = {
      phone_number: '+1234567890',
      call_source: 'internet' as const
    };
    
    expect(getCallSourceFromData(call)).toBe('internet');
  });

  it('returns internet for internal phone numbers', () => {
    const call = {
      phone_number: 'internal'
    };
    
    expect(getCallSourceFromData(call)).toBe('internet');
  });

  it('returns phone for actual phone numbers', () => {
    const call = {
      phone_number: '+1234567890'
    };
    
    expect(getCallSourceFromData(call)).toBe('phone');
  });

  it('returns unknown for missing phone number', () => {
    const call = {};
    
    expect(getCallSourceFromData(call)).toBe('unknown');
  });

  it('returns unknown for null phone number', () => {
    const call = {
      phone_number: null
    };
    
    expect(getCallSourceFromData(call)).toBe('unknown');
  });
});