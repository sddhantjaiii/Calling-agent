import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

/**
 * TokenRefreshIndicator Component
 * 
 * Shows a subtle indicator when tokens are being refreshed automatically.
 * This provides user feedback during the token refresh process.
 */
export function TokenRefreshIndicator() {
  const { isTokenExpiring } = useAuth();

  if (!isTokenExpiring) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 bg-blue-50 border border-blue-200 rounded-lg p-3 shadow-lg">
      <div className="flex items-center space-x-2">
        <LoadingSpinner size="sm" />
        <span className="text-sm text-blue-700">Refreshing session...</span>
      </div>
    </div>
  );
}

export default TokenRefreshIndicator;