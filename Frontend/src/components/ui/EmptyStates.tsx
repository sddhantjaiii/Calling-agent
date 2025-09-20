import React from 'react';
import { Plus, Users, Phone, BarChart3, CreditCard, FileText } from 'lucide-react';
import EmptyState from './EmptyState';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

// No Agents Empty State
export const NoAgentsEmptyState: React.FC<{ onCreateAgent?: () => void }> = ({ onCreateAgent }) => {
  const action = onCreateAgent ? {
    label: 'Create Your First Agent',
    onClick: onCreateAgent
  } : undefined;

  return (
    <EmptyState
      icon={
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
          <Users className="h-6 w-6 text-blue-600" />
        </div>
      }
      title="No AI Agents Yet"
      description="Create your first AI calling agent to start making automated calls and engaging with your leads."
      action={action}
    />
  );
};

// No Contacts Empty State
export const NoContactsEmptyState: React.FC<{ 
  onAddContact?: () => void;
  onUploadContacts?: () => void;
}> = ({ onAddContact, onUploadContacts }) => {
  return (
    <div className="text-center py-12">
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
        <Users className="h-6 w-6 text-green-600" />
      </div>
      
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        No Contacts Found
      </h3>
      
      <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
        Add contacts to start your calling campaigns. You can add them individually or upload a CSV file.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {onAddContact && (
          <button
            onClick={onAddContact}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </button>
        )}
        {onUploadContacts && (
          <button
            onClick={onUploadContacts}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <FileText className="h-4 w-4 mr-2" />
            Upload CSV
          </button>
        )}
      </div>
    </div>
  );
};

// No Calls Empty State
export const NoCallsEmptyState: React.FC<{ onCreateAgent?: () => void }> = ({ onCreateAgent }) => {
  const action = onCreateAgent ? {
    label: 'Create an Agent to Start Calling',
    onClick: onCreateAgent
  } : undefined;

  return (
    <EmptyState
      icon={
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-purple-100">
          <Phone className="h-6 w-6 text-purple-600" />
        </div>
      }
      title="No Call Records"
      description="Once your AI agents start making calls, you'll see all call records, transcripts, and analytics here."
      action={action}
    />
  );
};

// No Analytics Data Empty State
export const NoAnalyticsEmptyState: React.FC<{ onViewAgents?: () => void }> = ({ onViewAgents }) => {
  const action = onViewAgents ? {
    label: 'Set Up Your First Agent',
    onClick: onViewAgents
  } : undefined;

  return (
    <EmptyState
      icon={
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100">
          <BarChart3 className="h-6 w-6 text-indigo-600" />
        </div>
      }
      title="No Analytics Data"
      description="Start making calls with your AI agents to see detailed analytics, conversion rates, and performance metrics."
      action={action}
    />
  );
};

// No Billing History Empty State
export const NoBillingHistoryEmptyState: React.FC<{ onPurchaseCredits?: () => void }> = ({ onPurchaseCredits }) => {
  const action = onPurchaseCredits ? {
    label: 'Purchase Credits',
    onClick: onPurchaseCredits
  } : undefined;

  return (
    <EmptyState
      icon={
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
          <CreditCard className="h-6 w-6 text-yellow-600" />
        </div>
      }
      title="No Billing History"
      description="Your billing transactions and credit purchases will appear here once you start using the platform."
      action={action}
    />
  );
};

// No Search Results Empty State
export const NoSearchResultsEmptyState: React.FC<{ 
  searchTerm?: string;
  onClearSearch?: () => void;
  entityType?: string;
}> = ({ searchTerm, onClearSearch, entityType = 'items' }) => {
  return (
    <EmptyState
      icon={
        <svg
          className="h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      }
      title={`No ${entityType} found`}
      description={
        searchTerm 
          ? `No ${entityType} match your search for "${searchTerm}". Try adjusting your search terms.`
          : `No ${entityType} match your current filters. Try adjusting your filters.`
      }
      action={onClearSearch ? {
        label: 'Clear Search',
        onClick: onClearSearch
      } : undefined}
    />
  );
};

// Generic Loading Failed Empty State
export const LoadingFailedEmptyState: React.FC<{ 
  onRetry?: () => void;
  entityType?: string;
}> = ({ onRetry, entityType = 'data' }) => {
  return (
    <EmptyState
      icon={
        <svg
          className="h-12 w-12 text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      }
      title={`Failed to Load ${entityType}`}
      description="There was an error loading the data. Please try again or contact support if the problem persists."
      action={onRetry ? {
        label: 'Try Again',
        onClick: onRetry
      } : undefined}
    />
  );
};

// Permission Denied Empty State
export const PermissionDeniedEmptyState: React.FC<{ 
  onContactSupport?: () => void;
}> = ({ onContactSupport }) => {
  return (
    <EmptyState
      icon={
        <svg
          className="h-12 w-12 text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"
          />
        </svg>
      }
      title="Access Denied"
      description="You don't have permission to view this content. Please contact your administrator or support team."
      action={onContactSupport ? {
        label: 'Contact Support',
        onClick: onContactSupport
      } : undefined}
    />
  );
};