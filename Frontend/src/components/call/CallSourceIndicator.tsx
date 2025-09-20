import React from 'react';
import { Phone, Globe, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CallSource = 'phone' | 'internet' | 'unknown';

interface CallSourceIndicatorProps {
  callSource: CallSource;
  phoneNumber?: string | null;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const CallSourceIndicator: React.FC<CallSourceIndicatorProps> = ({
  callSource,
  phoneNumber,
  className,
  showLabel = true,
  size = 'md'
}) => {
  const getSourceConfig = () => {
    switch (callSource) {
      case 'phone':
        return {
          icon: Phone,
          label: 'Phone Call',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          ariaLabel: `Phone call${phoneNumber ? ` from ${phoneNumber}` : ''}`
        };
      case 'internet':
        return {
          icon: Globe,
          label: 'Internet Call',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          ariaLabel: 'Internet call'
        };
      case 'unknown':
      default:
        return {
          icon: HelpCircle,
          label: 'Unknown Source',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          ariaLabel: 'Unknown call source'
        };
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          icon: 'w-3 h-3',
          text: 'text-xs',
          padding: 'px-2 py-1',
          gap: 'gap-1'
        };
      case 'lg':
        return {
          icon: 'w-5 h-5',
          text: 'text-base',
          padding: 'px-3 py-2',
          gap: 'gap-3'
        };
      case 'md':
      default:
        return {
          icon: 'w-4 h-4',
          text: 'text-sm',
          padding: 'px-2.5 py-1.5',
          gap: 'gap-2'
        };
    }
  };

  const { icon: Icon, label, color, bgColor, borderColor, ariaLabel } = getSourceConfig();
  const { icon: iconSize, text: textSize, padding, gap } = getSizeClasses();

  if (!showLabel) {
    return (
      <div
        className={cn(
          'inline-flex items-center justify-center rounded-full border',
          bgColor,
          borderColor,
          padding,
          className
        )}
        title={ariaLabel}
        aria-label={ariaLabel}
      >
        <Icon className={cn(iconSize, color)} aria-hidden="true" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border',
        bgColor,
        borderColor,
        padding,
        gap,
        className
      )}
      role="img"
      aria-label={ariaLabel}
    >
      <Icon className={cn(iconSize, color)} aria-hidden="true" />
      <span className={cn(textSize, color, 'font-medium')}>
        {label}
      </span>
    </div>
  );
};

// Utility function to determine call source from call data
export const getCallSourceFromData = (call: {
  phoneNumber?: string | null;
  callSource?: CallSource;
}): CallSource => {
  // If callSource is explicitly set, use it
  if (call.callSource) {
    return call.callSource;
  }

  // Fallback logic based on phoneNumber for backward compatibility
  if (!call.phoneNumber) {
    return 'unknown';
  }

  if (call.phoneNumber === 'internal') {
    return 'internet';
  }

  // If we have a phone number that's not 'internal', assume it's a phone call
  if (call.phoneNumber && call.phoneNumber !== 'internal') {
    return 'phone';
  }

  return 'unknown';
};

export default CallSourceIndicator;