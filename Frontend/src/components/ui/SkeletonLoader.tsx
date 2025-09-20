import React from 'react';

interface SkeletonLoaderProps {
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  className = '',
  variant = 'text',
  width,
  height,
  lines = 1,
}) => {
  const baseClasses = 'animate-pulse bg-gray-200 rounded';
  
  const getVariantClasses = () => {
    switch (variant) {
      case 'circular':
        return 'rounded-full';
      case 'rectangular':
        return 'rounded-md';
      case 'text':
      default:
        return 'rounded';
    }
  };

  const getDefaultSize = () => {
    switch (variant) {
      case 'circular':
        return { width: '2rem', height: '2rem' };
      case 'rectangular':
        return { width: '100%', height: '1rem' };
      case 'text':
      default:
        return { width: '100%', height: '1rem' };
    }
  };

  const defaultSize = getDefaultSize();
  const style = {
    width: width || defaultSize.width,
    height: height || defaultSize.height,
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className={className}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`${baseClasses} ${getVariantClasses()} ${
              index < lines - 1 ? 'mb-2' : ''
            }`}
            style={{
              ...style,
              width: index === lines - 1 ? '75%' : style.width,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${getVariantClasses()} ${className}`}
      style={style}
    />
  );
};

// Predefined skeleton components for common use cases
export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`p-4 border rounded-lg ${className}`}>
    <div className="flex items-center space-x-3 mb-4">
      <SkeletonLoader variant="circular" width="2.5rem" height="2.5rem" />
      <div className="flex-1">
        <SkeletonLoader width="60%" height="1rem" className="mb-2" />
        <SkeletonLoader width="40%" height="0.75rem" />
      </div>
    </div>
    <SkeletonLoader lines={3} className="mb-4" />
    <div className="flex space-x-2">
      <SkeletonLoader width="5rem" height="2rem" variant="rectangular" />
      <SkeletonLoader width="5rem" height="2rem" variant="rectangular" />
    </div>
  </div>
);

// Agent-specific skeleton loader
export const SkeletonAgent: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-card border border-border rounded-lg shadow-md p-6 ${className}`}>
    <div className="flex items-center gap-2 mb-3">
      <SkeletonLoader width="60%" height="1.25rem" />
      <SkeletonLoader width="4rem" height="1.5rem" variant="rectangular" />
    </div>
    <SkeletonLoader lines={3} className="mb-4" />
    <div className="space-y-2 mb-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <SkeletonLoader width="6rem" height="0.875rem" />
          <SkeletonLoader width="8rem" height="0.875rem" />
        </div>
      ))}
    </div>
    <div className="flex items-center justify-between pt-4">
      <SkeletonLoader width="6rem" height="1rem" />
      <div className="flex gap-3">
        <SkeletonLoader variant="circular" width="2rem" height="2rem" />
        <SkeletonLoader variant="circular" width="2rem" height="2rem" />
      </div>
    </div>
  </div>
);

// Contact-specific skeleton loader
export const SkeletonContact: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`p-4 border-b border-border ${className}`}>
    <div className="flex items-center space-x-3">
      <SkeletonLoader variant="circular" width="2.5rem" height="2.5rem" />
      <div className="flex-1">
        <SkeletonLoader width="50%" height="1rem" className="mb-1" />
        <SkeletonLoader width="70%" height="0.875rem" className="mb-1" />
        <SkeletonLoader width="40%" height="0.75rem" />
      </div>
      <div className="flex gap-2">
        <SkeletonLoader variant="circular" width="2rem" height="2rem" />
        <SkeletonLoader variant="circular" width="2rem" height="2rem" />
      </div>
    </div>
  </div>
);

// Dashboard KPI skeleton loader
export const SkeletonKPI: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`rounded-lg p-4 bg-card border-border border ${className}`}>
    <div className="flex items-center justify-between mb-2">
      <SkeletonLoader width="60%" height="0.875rem" />
      <SkeletonLoader variant="circular" width="1rem" height="1rem" />
    </div>
    <SkeletonLoader width="40%" height="2rem" className="mb-2" />
    <div className="flex items-center">
      <SkeletonLoader width="3rem" height="0.75rem" />
      <SkeletonLoader width="4rem" height="0.75rem" className="ml-2" />
    </div>
  </div>
);

// Call record skeleton loader
export const SkeletonCall: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`p-4 border-b border-border ${className}`}>
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center space-x-3">
        <SkeletonLoader variant="circular" width="2rem" height="2rem" />
        <div>
          <SkeletonLoader width="8rem" height="1rem" className="mb-1" />
          <SkeletonLoader width="6rem" height="0.75rem" />
        </div>
      </div>
      <SkeletonLoader width="4rem" height="1.5rem" variant="rectangular" />
    </div>
    <div className="grid grid-cols-4 gap-4 text-sm">
      <div>
        <SkeletonLoader width="3rem" height="0.75rem" className="mb-1" />
        <SkeletonLoader width="4rem" height="0.875rem" />
      </div>
      <div>
        <SkeletonLoader width="4rem" height="0.75rem" className="mb-1" />
        <SkeletonLoader width="3rem" height="0.875rem" />
      </div>
      <div>
        <SkeletonLoader width="3rem" height="0.75rem" className="mb-1" />
        <SkeletonLoader width="5rem" height="0.875rem" />
      </div>
      <div>
        <SkeletonLoader width="4rem" height="0.75rem" className="mb-1" />
        <SkeletonLoader width="3rem" height="0.875rem" />
      </div>
    </div>
  </div>
);

// Chart skeleton loader
export const SkeletonChart: React.FC<{ 
  className?: string; 
  height?: string;
}> = ({ className = '', height = '300px' }) => (
  <div className={`bg-card border border-border rounded-lg p-4 ${className}`} style={{ height }}>
    <SkeletonLoader width="40%" height="1.25rem" className="mb-4" />
    <div className="flex items-end justify-between h-full space-x-2 pb-4">
      {[...Array(8)].map((_, i) => (
        <SkeletonLoader
          key={i}
          width="100%"
          height={`${40 + (i % 4) * 15}%`}
          variant="rectangular"
          className="flex-1"
        />
      ))}
    </div>
  </div>
);

export const SkeletonTable: React.FC<{ 
  rows?: number; 
  columns?: number; 
  className?: string; 
}> = ({ 
  rows = 5, 
  columns = 4, 
  className = '' 
}) => (
  <div className={`space-y-3 ${className}`}>
    {/* Header */}
    <div className="flex space-x-4">
      {Array.from({ length: columns }).map((_, index) => (
        <SkeletonLoader
          key={`header-${index}`}
          width="100%"
          height="1.25rem"
          className="flex-1"
        />
      ))}
    </div>
    
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={`row-${rowIndex}`} className="flex space-x-4">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <SkeletonLoader
            key={`cell-${rowIndex}-${colIndex}`}
            width="100%"
            height="1rem"
            className="flex-1"
          />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonList: React.FC<{ 
  items?: number; 
  className?: string; 
}> = ({ 
  items = 5, 
  className = '' 
}) => (
  <div className={`space-y-4 ${className}`}>
    {Array.from({ length: items }).map((_, index) => (
      <div key={index} className="flex items-center space-x-3">
        <SkeletonLoader variant="circular" width="2rem" height="2rem" />
        <div className="flex-1">
          <SkeletonLoader width="70%" height="1rem" className="mb-1" />
          <SkeletonLoader width="50%" height="0.75rem" />
        </div>
      </div>
    ))}
  </div>
);

export default SkeletonLoader;