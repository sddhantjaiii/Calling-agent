import React, { useState } from 'react';
import EmptyStateManager from '../ui/EmptyStateManager';
import { useEmptyState } from '../../hooks/useEmptyState';
import { Card } from '../ui/card';

const EmptyStateExample: React.FC = () => {
  const [selectedType, setSelectedType] = useState<string>('no-agents');
  const [searchTerm, setSearchTerm] = useState('');
  const [entityType, setEntityType] = useState('agents');

  // Example of using the useEmptyState hook
  const emptyStateResult = useEmptyState({
    data: [],
    loading: false,
    error: null,
    searchTerm: searchTerm || undefined,
    entityType: entityType as any,
    hasPermission: true
  });

  const handleAction = (actionType: string) => {
    console.log(`Action triggered: ${actionType}`);
    alert(`${actionType} action would be triggered here`);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Empty State Examples</h2>
        <p className="text-gray-600 mb-6">
          This page demonstrates the different empty state components available in the application.
        </p>
      </div>

      {/* Controls */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Controls</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Empty State Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="no-agents">No Agents</option>
              <option value="no-contacts">No Contacts</option>
              <option value="no-calls">No Calls</option>
              <option value="no-analytics">No Analytics</option>
              <option value="no-billing-history">No Billing History</option>
              <option value="no-search-results">No Search Results</option>
              <option value="loading-failed">Loading Failed</option>
              <option value="permission-denied">Permission Denied</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Term (for search results)
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Enter search term..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Entity Type
            </label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="agents">Agents</option>
              <option value="contacts">Contacts</option>
              <option value="calls">Calls</option>
              <option value="analytics">Analytics</option>
              <option value="billing-history">Billing History</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Empty State Display */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Empty State Preview</h3>
        <div className="border-2 border-dashed border-gray-200 rounded-lg min-h-[400px] flex items-center justify-center">
          <EmptyStateManager
            type={selectedType as any}
            searchTerm={searchTerm || undefined}
            entityType={entityType}
            onCreateAgent={() => handleAction('Create Agent')}
            onAddContact={() => handleAction('Add Contact')}
            onUploadContacts={() => handleAction('Upload Contacts')}
            onPurchaseCredits={() => handleAction('Purchase Credits')}
            onViewAgents={() => handleAction('View Agents')}
            onClearSearch={() => handleAction('Clear Search')}
            onRetry={() => handleAction('Retry')}
            onContactSupport={() => handleAction('Contact Support')}
          />
        </div>
      </Card>

      {/* Hook Usage Example */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">useEmptyState Hook Result</h3>
        <div className="bg-gray-50 p-4 rounded-md">
          <pre className="text-sm">
            {JSON.stringify(emptyStateResult, null, 2)}
          </pre>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          This shows how the useEmptyState hook would determine the empty state based on the current settings.
        </p>
      </Card>

      {/* Usage Instructions */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Usage Instructions</h3>
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-medium">Using EmptyStateManager:</h4>
            <pre className="bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
{`<EmptyStateManager
  type="no-agents"
  onCreateAgent={() => navigate('/agents/create')}
/>`}
            </pre>
          </div>
          
          <div>
            <h4 className="font-medium">Using useEmptyState hook:</h4>
            <pre className="bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
{`const { shouldShowEmptyState, emptyStateType } = useEmptyState({
  data: agents,
  loading: isLoading,
  error: error,
  entityType: 'agents'
});

if (shouldShowEmptyState) {
  return <EmptyStateManager type={emptyStateType} />;
}`}
            </pre>
          </div>

          <div>
            <h4 className="font-medium">Available Empty State Types:</h4>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li><code>no-agents</code> - When user has no AI agents</li>
              <li><code>no-contacts</code> - When user has no contacts</li>
              <li><code>no-calls</code> - When user has no call records</li>
              <li><code>no-analytics</code> - When there's no analytics data</li>
              <li><code>no-billing-history</code> - When there's no billing history</li>
              <li><code>no-search-results</code> - When search returns no results</li>
              <li><code>loading-failed</code> - When data loading fails</li>
              <li><code>permission-denied</code> - When user lacks permissions</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default EmptyStateExample;