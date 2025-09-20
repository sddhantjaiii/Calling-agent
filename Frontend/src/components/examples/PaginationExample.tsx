import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import ContactList from '@/components/contacts/ContactList';
import CallLogs from '@/components/call/CallLogs';

/**
 * Example component demonstrating pagination and lazy loading functionality
 * 
 * This component showcases:
 * - Traditional pagination with page numbers
 * - Lazy loading with infinite scroll
 * - Performance optimization for large datasets
 * - Configurable page sizes
 */
export const PaginationExample: React.FC = () => {
  const [useLazyLoading, setUseLazyLoading] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [activeTab, setActiveTab] = useState<'contacts' | 'calls'>('contacts');

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pagination and Lazy Loading Demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="lazy-loading"
                checked={useLazyLoading}
                onCheckedChange={setUseLazyLoading}
              />
              <Label htmlFor="lazy-loading">
                Use Lazy Loading (Infinite Scroll)
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Label htmlFor="page-size">Page Size:</Label>
              <select
                id="page-size"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="border rounded px-2 py-1"
              >
                <option value={5}>5 items</option>
                <option value={10}>10 items</option>
                <option value={20}>20 items</option>
                <option value={50}>50 items</option>
              </select>
            </div>
          </div>

          <div className="flex space-x-2">
            <Button
              variant={activeTab === 'contacts' ? 'default' : 'outline'}
              onClick={() => setActiveTab('contacts')}
            >
              Contacts Example
            </Button>
            <Button
              variant={activeTab === 'calls' ? 'default' : 'outline'}
              onClick={() => setActiveTab('calls')}
            >
              Calls Example
            </Button>
          </div>

          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
            <strong>Current Mode:</strong> {useLazyLoading ? 'Lazy Loading' : 'Traditional Pagination'}
            <br />
            <strong>Page Size:</strong> {pageSize} items per page
            <br />
            <strong>Performance:</strong> {useLazyLoading 
              ? 'Loads data incrementally as you scroll, better for large datasets'
              : 'Loads one page at a time, better for precise navigation'
            }
          </div>
        </CardContent>
      </Card>

      {activeTab === 'contacts' && (
        <ContactList
          useLazyLoading={useLazyLoading}
          initialPageSize={pageSize}
          onContactSelect={(contact) => console.log('Selected contact:', contact)}
          onContactEdit={(contact) => console.log('Edit contact:', contact)}
          onContactCreate={() => console.log('Create new contact')}
        />
      )}

      {activeTab === 'calls' && (
        <CallLogs
          useLazyLoading={useLazyLoading}
          initialPageSize={pageSize}
        />
      )}
    </div>
  );
};

export default PaginationExample;