/**
 * Call Source Indicator Component Tests
 * 
 * This test suite verifies the CallSourceIndicator component functionality including:
 * - Phone call display and labeling
 * - Internet call display and labeling
 * - Unknown source display and graceful fallbacks
 * - Accessibility compliance
 * - Visual consistency and styling
 * 
 * Requirements: Call Source Detection Acceptance Criteria
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { CallSourceIndicator, getCallSourceFromData, type CallSource } from '../CallSourceIndicator';

describe('CallSourceIndicator Component Tests', () => {
  describe('Phone Call Display', () => {
    test('should display phone call with phone number', () => {
      render(
        <CallSourceIndicator 
          callSource="phone" 
          phoneNumber="+1234567890" 
        />
      );

      expect(screen.getByText('+1234567890')).toBeInTheDocument();
      expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Phone call from +1234567890');
    });

    test('should display phone call without phone number', () => {
      render(
        <CallSourceIndicator 
          callSource="phone" 
        />
      );

      expect(screen.getByText('Phone Call')).toBeInTheDocument();
      expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Phone call');
    });

    test('should display phone call with formatted number', () => {
      render(
        <CallSourceIndicator 
          callSource="phone" 
          phoneNumber="(555) 123-4567" 
        />
      );

      expect(screen.getByText('(555) 123-4567')).toBeInTheDocument();
      expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Phone call from (555) 123-4567');
    });

    test('should display phone call with international number', () => {
      render(
        <CallSourceIndicator 
          callSource="phone" 
          phoneNumber="+44 20 7946 0958" 
        />
      );

      expect(screen.getByText('+44 20 7946 0958')).toBeInTheDocument();
      expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Phone call from +44 20 7946 0958');
    });

    test('should apply correct styling for phone calls', () => {
      render(
        <CallSourceIndicator 
          callSource="phone" 
          phoneNumber="+1234567890" 
        />
      );

      const container = screen.getByRole('img');
      expect(container).toHaveClass('bg-blue-50', 'border-blue-200');
      
      const text = screen.getByText('+1234567890');
      expect(text).toHaveClass('text-blue-600');
    });
  });

  describe('Internet Call Display', () => {
    test('should display internet call correctly', () => {
      render(
        <CallSourceIndicator 
          callSource="internet" 
        />
      );

      expect(screen.getByText('Internet Call')).toBeInTheDocument();
      expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Internet call');
    });

    test('should apply correct styling for internet calls', () => {
      render(
        <CallSourceIndicator 
          callSource="internet" 
        />
      );

      const container = screen.getByRole('img');
      expect(container).toHaveClass('bg-green-50', 'border-green-200');
      
      const text = screen.getByText('Internet Call');
      expect(text).toHaveClass('text-green-600');
    });

    test('should ignore phone number for internet calls', () => {
      render(
        <CallSourceIndicator 
          callSource="internet" 
          phoneNumber="+1234567890" 
        />
      );

      expect(screen.getByText('Internet Call')).toBeInTheDocument();
      expect(screen.queryByText('+1234567890')).not.toBeInTheDocument();
    });
  });

  describe('Unknown Source Display', () => {
    test('should display unknown source correctly', () => {
      render(
        <CallSourceIndicator 
          callSource="unknown" 
        />
      );

      expect(screen.getByText('Unknown Source')).toBeInTheDocument();
      expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Unknown call source');
    });

    test('should apply correct styling for unknown calls', () => {
      render(
        <CallSourceIndicator 
          callSource="unknown" 
        />
      );

      const container = screen.getByRole('img');
      expect(container).toHaveClass('bg-gray-50', 'border-gray-200');
      
      const text = screen.getByText('Unknown Source');
      expect(text).toHaveClass('text-gray-600');
    });

    test('should handle invalid call source as unknown', () => {
      render(
        <CallSourceIndicator 
          callSource={'invalid' as CallSource} 
        />
      );

      expect(screen.getByText('Unknown Source')).toBeInTheDocument();
      expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Unknown call source');
    });
  });

  describe('Component Sizing', () => {
    test('should apply small size styling', () => {
      render(
        <CallSourceIndicator 
          callSource="phone" 
          phoneNumber="+1234567890"
          size="sm"
        />
      );

      const container = screen.getByRole('img');
      expect(container).toHaveClass('px-2', 'py-1', 'gap-1');
      
      const text = screen.getByText('+1234567890');
      expect(text).toHaveClass('text-xs');
    });

    test('should apply medium size styling (default)', () => {
      render(
        <CallSourceIndicator 
          callSource="phone" 
          phoneNumber="+1234567890"
        />
      );

      const container = screen.getByRole('img');
      expect(container).toHaveClass('px-2.5', 'py-1.5', 'gap-2');
      
      const text = screen.getByText('+1234567890');
      expect(text).toHaveClass('text-sm');
    });

    test('should apply large size styling', () => {
      render(
        <CallSourceIndicator 
          callSource="phone" 
          phoneNumber="+1234567890"
          size="lg"
        />
      );

      const container = screen.getByRole('img');
      expect(container).toHaveClass('px-3', 'py-2', 'gap-3');
      
      const text = screen.getByText('+1234567890');
      expect(text).toHaveClass('text-base');
    });
  });

  describe('Label Display Options', () => {
    test('should show label by default', () => {
      render(
        <CallSourceIndicator 
          callSource="phone" 
          phoneNumber="+1234567890"
        />
      );

      expect(screen.getByText('+1234567890')).toBeInTheDocument();
    });

    test('should hide label when showLabel is false', () => {
      render(
        <CallSourceIndicator 
          callSource="phone" 
          phoneNumber="+1234567890"
          showLabel={false}
        />
      );

      expect(screen.queryByText('+1234567890')).not.toBeInTheDocument();
      const container = screen.getByLabelText('Phone call from +1234567890');
      expect(container).toHaveAttribute('aria-label', 'Phone call from +1234567890');
    });

    test('should show only icon for internet calls without label', () => {
      render(
        <CallSourceIndicator 
          callSource="internet" 
          showLabel={false}
        />
      );

      expect(screen.queryByText('Internet Call')).not.toBeInTheDocument();
      const container = screen.getByLabelText('Internet call');
      expect(container).toHaveAttribute('aria-label', 'Internet call');
    });
  });

  describe('Custom Styling', () => {
    test('should apply custom className', () => {
      render(
        <CallSourceIndicator 
          callSource="phone" 
          phoneNumber="+1234567890"
          className="custom-class"
        />
      );

      const container = screen.getByRole('img');
      expect(container).toHaveClass('custom-class');
    });

    test('should merge custom className with default classes', () => {
      render(
        <CallSourceIndicator 
          callSource="phone" 
          phoneNumber="+1234567890"
          className="custom-class"
        />
      );

      const container = screen.getByRole('img');
      expect(container).toHaveClass('custom-class', 'bg-blue-50', 'border-blue-200');
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels for phone calls', () => {
      render(
        <CallSourceIndicator 
          callSource="phone" 
          phoneNumber="+1234567890"
        />
      );

      const container = screen.getByRole('img');
      expect(container).toHaveAttribute('aria-label', 'Phone call from +1234567890');
    });

    test('should have proper ARIA labels for internet calls', () => {
      render(
        <CallSourceIndicator 
          callSource="internet" 
        />
      );

      const container = screen.getByRole('img');
      expect(container).toHaveAttribute('aria-label', 'Internet call');
    });

    test('should have proper ARIA labels for unknown calls', () => {
      render(
        <CallSourceIndicator 
          callSource="unknown" 
        />
      );

      const container = screen.getByRole('img');
      expect(container).toHaveAttribute('aria-label', 'Unknown call source');
    });

    test('should have aria-hidden on icons', () => {
      render(
        <CallSourceIndicator 
          callSource="phone" 
          phoneNumber="+1234567890"
        />
      );

      // The icon should have aria-hidden="true"
      const icon = screen.getByRole('img').querySelector('svg');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    test('should maintain accessibility when label is hidden', () => {
      render(
        <CallSourceIndicator 
          callSource="phone" 
          phoneNumber="+1234567890"
          showLabel={false}
        />
      );

      const container = screen.getByLabelText('Phone call from +1234567890');
      expect(container).toHaveAttribute('aria-label', 'Phone call from +1234567890');
      expect(container).toHaveAttribute('title', 'Phone call from +1234567890');
    });
  });

  describe('Icon Display', () => {
    test('should display phone icon for phone calls', () => {
      render(
        <CallSourceIndicator 
          callSource="phone" 
          phoneNumber="+1234567890"
        />
      );

      // Check that the phone icon is rendered (Lucide Phone component)
      const container = screen.getByRole('img');
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    test('should display globe icon for internet calls', () => {
      render(
        <CallSourceIndicator 
          callSource="internet" 
        />
      );

      // Check that the globe icon is rendered (Lucide Globe component)
      const container = screen.getByRole('img');
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    test('should display help circle icon for unknown calls', () => {
      render(
        <CallSourceIndicator 
          callSource="unknown" 
        />
      );

      // Check that the help circle icon is rendered (Lucide HelpCircle component)
      const container = screen.getByRole('img');
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });
});

describe('getCallSourceFromData Utility Function Tests', () => {
  describe('Call Source Detection from Data', () => {
    test('should use explicit call_source when available', () => {
      const callData = {
        phone_number: '+1234567890',
        call_source: 'internet' as CallSource
      };

      const result = getCallSourceFromData(callData);
      expect(result).toBe('internet');
    });

    test('should fallback to phone_number analysis when call_source missing', () => {
      const callData = {
        phone_number: '+1234567890'
      };

      const result = getCallSourceFromData(callData);
      expect(result).toBe('phone');
    });

    test('should detect internet calls from internal phone_number', () => {
      const callData = {
        phone_number: 'internal'
      };

      const result = getCallSourceFromData(callData);
      expect(result).toBe('internet');
    });

    test('should return unknown for missing phone_number', () => {
      const callData = {};

      const result = getCallSourceFromData(callData);
      expect(result).toBe('unknown');
    });

    test('should return unknown for null phone_number', () => {
      const callData = {
        phone_number: null
      };

      const result = getCallSourceFromData(callData);
      expect(result).toBe('unknown');
    });

    test('should return unknown for empty phone_number', () => {
      const callData = {
        phone_number: ''
      };

      const result = getCallSourceFromData(callData);
      expect(result).toBe('unknown');
    });

    test('should prioritize call_source over phone_number', () => {
      const callData = {
        phone_number: '+1234567890',
        call_source: 'unknown' as CallSource
      };

      const result = getCallSourceFromData(callData);
      expect(result).toBe('unknown');
    });
  });

  describe('Backward Compatibility', () => {
    test('should handle legacy data without call_source field', () => {
      const legacyCallData = {
        phone_number: '+1234567890'
      };

      const result = getCallSourceFromData(legacyCallData);
      expect(result).toBe('phone');
    });

    test('should handle legacy internal calls', () => {
      const legacyCallData = {
        phone_number: 'internal'
      };

      const result = getCallSourceFromData(legacyCallData);
      expect(result).toBe('internet');
    });

    test('should handle legacy data with various phone formats', () => {
      const testCases = [
        { phone_number: '+1234567890', expected: 'phone' },
        { phone_number: '(555) 123-4567', expected: 'phone' },
        { phone_number: '555-123-4567', expected: 'phone' },
        { phone_number: '5551234567', expected: 'phone' },
        { phone_number: '+44 20 7946 0958', expected: 'phone' }
      ];

      testCases.forEach(({ phone_number, expected }) => {
        const result = getCallSourceFromData({ phone_number });
        expect(result).toBe(expected);
      });
    });
  });
});

describe('CallSourceIndicator Integration Tests', () => {
  describe('Real-world Usage Scenarios', () => {
    test('should handle typical phone call data', () => {
      const callData = {
        id: '123',
        phone_number: '+1234567890',
        call_source: 'phone' as CallSource,
        status: 'completed'
      };

      render(
        <CallSourceIndicator 
          callSource={getCallSourceFromData(callData)} 
          phoneNumber={callData.phone_number}
        />
      );

      expect(screen.getByText('+1234567890')).toBeInTheDocument();
      expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Phone call from +1234567890');
    });

    test('should handle typical internet call data', () => {
      const callData = {
        id: '456',
        phone_number: 'internal',
        call_source: 'internet' as CallSource,
        status: 'completed'
      };

      render(
        <CallSourceIndicator 
          callSource={getCallSourceFromData(callData)} 
          phoneNumber={callData.phone_number}
        />
      );

      expect(screen.getByText('Internet Call')).toBeInTheDocument();
      expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Internet call');
    });

    test('should handle legacy call data without call_source', () => {
      const legacyCallData = {
        id: '789',
        phone_number: '+1234567890',
        status: 'completed'
      };

      render(
        <CallSourceIndicator 
          callSource={getCallSourceFromData(legacyCallData)} 
          phoneNumber={legacyCallData.phone_number}
        />
      );

      expect(screen.getByText('+1234567890')).toBeInTheDocument();
      expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Phone call from +1234567890');
    });

    test('should handle incomplete call data gracefully', () => {
      const incompleteCallData = {
        id: '999'
        // Missing phone_number and call_source
      };

      render(
        <CallSourceIndicator 
          callSource={getCallSourceFromData(incompleteCallData)} 
          phoneNumber={incompleteCallData.phone_number}
        />
      );

      expect(screen.getByText('Unknown Source')).toBeInTheDocument();
      expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Unknown call source');
    });
  });

  describe('Component Composition', () => {
    test('should work in call list context', () => {
      const calls = [
        { id: '1', phone_number: '+1234567890', call_source: 'phone' as CallSource },
        { id: '2', phone_number: 'internal', call_source: 'internet' as CallSource },
        { id: '3', phone_number: null, call_source: 'unknown' as CallSource }
      ];

      render(
        <div>
          {calls.map(call => (
            <div key={call.id} data-testid={`call-${call.id}`}>
              <CallSourceIndicator 
                callSource={getCallSourceFromData(call)} 
                phoneNumber={call.phone_number}
                size="sm"
              />
            </div>
          ))}
        </div>
      );

      expect(screen.getByTestId('call-1')).toContainElement(screen.getByText('+1234567890'));
      expect(screen.getByTestId('call-2')).toContainElement(screen.getByText('Internet Call'));
      expect(screen.getByTestId('call-3')).toContainElement(screen.getByText('Unknown Source'));
    });

    test('should work in analytics dashboard context', () => {
      const analyticsData = {
        phone_calls: 25,
        internet_calls: 15,
        unknown_calls: 2
      };

      render(
        <div>
          <div data-testid="phone-metric">
            <CallSourceIndicator callSource="phone" showLabel={false} size="sm" />
            <span>{analyticsData.phone_calls} calls</span>
          </div>
          <div data-testid="internet-metric">
            <CallSourceIndicator callSource="internet" showLabel={false} size="sm" />
            <span>{analyticsData.internet_calls} calls</span>
          </div>
          <div data-testid="unknown-metric">
            <CallSourceIndicator callSource="unknown" showLabel={false} size="sm" />
            <span>{analyticsData.unknown_calls} calls</span>
          </div>
        </div>
      );

      expect(screen.getByTestId('phone-metric')).toContainElement(screen.getByText('25 calls'));
      expect(screen.getByTestId('internet-metric')).toContainElement(screen.getByText('15 calls'));
      expect(screen.getByTestId('unknown-metric')).toContainElement(screen.getByText('2 calls'));
    });
  });
});