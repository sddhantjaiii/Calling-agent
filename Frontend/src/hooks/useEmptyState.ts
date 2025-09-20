import { useMemo } from 'react';
import { EmptyStateType } from '../components/ui/EmptyStateManager';

interface UseEmptyStateProps {
  data: any[] | null | undefined;
  loading: boolean;
  error: Error | string | null;
  searchTerm?: string;
  entityType: 'agents' | 'contacts' | 'calls' | 'analytics' | 'billing-history';
  hasPermission?: boolean;
}

interface EmptyStateResult {
  shouldShowEmptyState: boolean;
  emptyStateType: EmptyStateType | null;
  isEmpty: boolean;
  hasError: boolean;
  isSearching: boolean;
}

export const useEmptyState = ({
  data,
  loading,
  error,
  searchTerm,
  entityType,
  hasPermission = true
}: UseEmptyStateProps): EmptyStateResult => {
  return useMemo(() => {
    // Don't show empty state while loading
    if (loading) {
      return {
        shouldShowEmptyState: false,
        emptyStateType: null,
        isEmpty: false,
        hasError: false,
        isSearching: false
      };
    }

    // Check for permission issues
    if (!hasPermission) {
      return {
        shouldShowEmptyState: true,
        emptyStateType: 'permission-denied',
        isEmpty: false,
        hasError: false,
        isSearching: false
      };
    }

    // Check for errors
    if (error) {
      return {
        shouldShowEmptyState: true,
        emptyStateType: 'loading-failed',
        isEmpty: false,
        hasError: true,
        isSearching: false
      };
    }

    // Check if data is empty
    const isEmpty = !data || data.length === 0;
    const isSearching = Boolean(searchTerm && searchTerm.trim().length > 0);

    if (!isEmpty) {
      return {
        shouldShowEmptyState: false,
        emptyStateType: null,
        isEmpty: false,
        hasError: false,
        isSearching
      };
    }

    // Determine empty state type based on context
    let emptyStateType: EmptyStateType;

    if (isSearching) {
      emptyStateType = 'no-search-results';
    } else {
      switch (entityType) {
        case 'agents':
          emptyStateType = 'no-agents';
          break;
        case 'contacts':
          emptyStateType = 'no-contacts';
          break;
        case 'calls':
          emptyStateType = 'no-calls';
          break;
        case 'analytics':
          emptyStateType = 'no-analytics';
          break;
        case 'billing-history':
          emptyStateType = 'no-billing-history';
          break;
        default:
          emptyStateType = 'no-search-results';
      }
    }

    return {
      shouldShowEmptyState: true,
      emptyStateType,
      isEmpty: true,
      hasError: false,
      isSearching
    };
  }, [data, loading, error, searchTerm, entityType, hasPermission]);
};

export default useEmptyState;