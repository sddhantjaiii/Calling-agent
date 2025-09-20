import React from 'react';

interface AriaLiveRegionProps {
  message: string;
  politeness?: 'polite' | 'assertive';
  className?: string;
}

export const AriaLiveRegion: React.FC<AriaLiveRegionProps> = ({
  message,
  politeness = 'polite',
  className = '',
}) => {
  return (
    <div
      aria-live={politeness}
      aria-atomic="true"
      className={`sr-only ${className}`}
      role="status"
    >
      {message}
    </div>
  );
};

export default AriaLiveRegion;