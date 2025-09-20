// Test script to verify data flow debugging is working
// This can be run in the browser console to test the debugging system

import { dataFlowDebugger } from './dataFlowDebugger';

export const testDataFlowDebugging = () => {
  console.log('🧪 Testing Data Flow Debugging System...');

  // Test API response logging
  dataFlowDebugger.logApiResponse('/api/dashboard/overview', {
    success: true,
    data: { kpis: [{ label: 'Test KPI', value: 100 }] }
  });

  // Test API error logging
  dataFlowDebugger.logApiResponse('/api/dashboard/analytics', null, 'Network error');

  // Test hook data logging
  dataFlowDebugger.logHookData('useDashboard.overview', { kpis: [] }, false);
  dataFlowDebugger.logHookData('useDashboard.analytics', null, true);

  // Test component data logging
  dataFlowDebugger.logComponentData('OverviewKPIs', { kpis: [] }, false);
  dataFlowDebugger.logComponentData('OverviewCharts', null, true);

  // Test mock data usage logging
  dataFlowDebugger.logMockDataUsage('OverviewKPIs', 'defaultKpis', 'overview.kpis is null');
  dataFlowDebugger.logMockDataUsage('OverviewCharts', 'defaultLeadsOverTimeData', 'analytics.leadsOverTimeData is empty');

  // Test data transformation logging
  dataFlowDebugger.logDataTransformation('OverviewKPIs', { raw: 'data' }, { processed: 'data' }, 'KPI processing');

  // Get summary
  const summary = dataFlowDebugger.getDataFlowSummary();
  
  console.log('✅ Data Flow Debugging Test Complete');
  return summary;
};

// Export logs for analysis
export const exportDataFlowLogs = () => {
  const logs = dataFlowDebugger.exportLogs();
  console.log('📄 Exported Data Flow Logs:');
  console.log(logs);
  return logs;
};

// Clear all logs
export const clearDataFlowLogs = () => {
  dataFlowDebugger.clearLogs();
  console.log('🧹 Data Flow Logs Cleared');
};