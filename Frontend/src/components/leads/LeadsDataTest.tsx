import React from 'react';
import { useLeads } from '@/hooks/useLeads';

// Simple test component to verify leads integration
const LeadsDataTest: React.FC = () => {
  const { leads, loading, error, refreshLeads } = useLeads();

  if (loading) {
    return <div>Loading leads...</div>;
  }

  if (error) {
    return (
      <div>
        <div>Error: {error}</div>
        <button onClick={() => refreshLeads()}>Retry</button>
      </div>
    );
  }

  return (
    <div>
      <h2>Leads Data Test</h2>
      <p>Total leads: {leads.length}</p>
      {leads.length === 0 ? (
        <p>No leads available. This is expected if the API returns empty data.</p>
      ) : (
        <ul>
          {leads.slice(0, 5).map((lead) => (
            <li key={lead.id}>
              {(lead as any).name || 'Unknown'} - {lead.email} - {lead.status}
            </li>
          ))}
        </ul>
      )}
      <button onClick={() => refreshLeads()}>Refresh Leads</button>
    </div>
  );
};

export default LeadsDataTest;