import React from 'react';
import {
  NoAgentsEmptyState,
  NoContactsEmptyState,
  NoCallsEmptyState,
  NoAnalyticsEmptyState,
  NoBillingHistoryEmptyState,
  NoSearchResultsEmptyState,
  LoadingFailedEmptyState,
  PermissionDeniedEmptyState
} from './EmptyStates';

export type EmptyStateType = 
  | 'no-agents'
  | 'no-contacts'
  | 'no-calls'
  | 'no-analytics'
  | 'no-billing-history'
  | 'no-search-results'
  | 'loading-failed'
  | 'permission-denied';

interface EmptyStateManagerProps {
  type: EmptyStateType;
  // Common props
  searchTerm?: string;
  entityType?: string;
  
  // Action handlers
  onCreateAgent?: () => void;
  onAddContact?: () => void;
  onUploadContacts?: () => void;
  onPurchaseCredits?: () => void;
  onViewAgents?: () => void;
  onClearSearch?: () => void;
  onRetry?: () => void;
  onContactSupport?: () => void;
  
  // Custom props
  className?: string;
}

const EmptyStateManager: React.FC<EmptyStateManagerProps> = ({
  type,
  searchTerm,
  entityType,
  onCreateAgent,
  onAddContact,
  onUploadContacts,
  onPurchaseCredits,
  onViewAgents,
  onClearSearch,
  onRetry,
  onContactSupport,
  className
}) => {
  const renderEmptyState = () => {
    switch (type) {
      case 'no-agents':
        return <NoAgentsEmptyState onCreateAgent={onCreateAgent} />;
      
      case 'no-contacts':
        return (
          <NoContactsEmptyState 
            onAddContact={onAddContact}
            onUploadContacts={onUploadContacts}
          />
        );
      
      case 'no-calls':
        return <NoCallsEmptyState onCreateAgent={onCreateAgent} />;
      
      case 'no-analytics':
        return <NoAnalyticsEmptyState onViewAgents={onViewAgents} />;
      
      case 'no-billing-history':
        return <NoBillingHistoryEmptyState onPurchaseCredits={onPurchaseCredits} />;
      
      case 'no-search-results':
        return (
          <NoSearchResultsEmptyState 
            searchTerm={searchTerm}
            onClearSearch={onClearSearch}
            entityType={entityType}
          />
        );
      
      case 'loading-failed':
        return (
          <LoadingFailedEmptyState 
            onRetry={onRetry}
            entityType={entityType}
          />
        );
      
      case 'permission-denied':
        return <PermissionDeniedEmptyState onContactSupport={onContactSupport} />;
      
      default:
        return null;
    }
  };

  return (
    <div className={className}>
      {renderEmptyState()}
    </div>
  );
};

export default EmptyStateManager;