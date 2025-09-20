import React from 'react';
import { useSkipLinks } from '../../../hooks/useAccessibility';

export const SkipLinks: React.FC = () => {
  const { skipToContent, skipToNavigation } = useSkipLinks();

  return (
    <div className="sr-only focus-within:not-sr-only">
      <div className="fixed top-0 left-0 z-50 bg-white border border-gray-300 p-2 space-x-2">
        <button
          onClick={skipToContent}
          className="px-3 py-1 bg-blue-600 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Skip to main content
        </button>
        <button
          onClick={skipToNavigation}
          className="px-3 py-1 bg-blue-600 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Skip to navigation
        </button>
      </div>
    </div>
  );
};

export default SkipLinks;