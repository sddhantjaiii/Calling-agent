// Debugging Test Utility
// This utility tests the debugging and validation system to ensure it's working correctly

import { dataFlowDebugger } from './dataFlowDebugger';
import { validateApiResponse, detectMockData, shouldShowEmptyState } from './typeValidation';
import { errorLogger, DataIntegrationErrorType, ErrorSeverity } from './errorLogger';
import { logComponentData, logFallbackDataUsage } from './componentDebugger';

// Test data samples
const MOCK_DASHBOARD_OVERVIEW = {
  kpis: [
    {
      label: 'Test KPI',
      value: 42,
      delta: 5,
      compare: 'vs last month',
      description: 'Test description',
      percentage: 85,
      efficiency: 'High',
    },
  ],
  credits: {
    current: 1000,
    usedThisMonth: 250,
    remaining: 750,
  },
  agents: {
    total: 5,
    active: 3,
    draft: 2,
  },
};

const INVALID_DASHBOARD_OVERVIEW = {
  kpis: 'invalid', // Should be array
  credits: {
    current: 'not a number', // Should be number
  },
  // Missing agents property
};

const MOCK_DATA_SAMPLE = [
  {
    id: 'mock-1',
    name: 'Test Lead 1',
    phone: '+1234567890',
    email: 'test@example.com',
  },
  {
    id: 'mock-2',
    name: 'Test Lead 2',
    phone: '+1234567891',
    email: 'test2@example.com',
  },
];

// Test functions
export function testDataFlowDebugger(): void {
  console.group('🧪 Testing Data Flow Debugger');
  
  // Test API response logging
  dataFlowDebugger.logApiResponse('/api/test', MOCK_DASHBOARD_OVERVIEW);
  dataFlowDebugger.logApiResponse('/api/test-error', null, 'Test error message');
  
  // Test hook data logging
  dataFlowDebugger.logHookData('testHook', MOCK_DASHBOARD_OVERVIEW, false, 'Test transformation');
  dataFlowDebugger.logHookData('testHookFallback', null, true, 'Fallback used');
  
  // Test component data logging
  dataFlowDebugger.logComponentData('TestComponent', MOCK_DASHBOARD_OVERVIEW, false, 'array');
  
  // Test mock data logging
  dataFlowDebugger.logMockDataUsage('TestComponent', 'Test Data', 'Contains test IDs');
  
  // Test data transformation logging
  dataFlowDebugger.logDataTransformation('TestComponent', MOCK_DASHBOARD_OVERVIEW, MOCK_DASHBOARD_OVERVIEW.kpis, 'Extract KPIs');
  
  // Test data integration issue logging
  dataFlowDebugger.logDataIntegrationIssue('TestComponent', 'Test integration issue', INVALID_DASHBOARD_OVERVIEW);
  
  console.log('Data flow summary:', dataFlowDebugger.getDataFlowSummary());
  console.groupEnd();
}

export function testTypeValidation(): void {
  console.group('🧪 Testing Type Validation');
  
  // Test valid data
  const validResult = validateApiResponse(MOCK_DASHBOARD_OVERVIEW, 'dashboardOverview', '/api/test');
  console.log('Valid data validation:', validResult);
  
  // Test invalid data
  const invalidResult = validateApiResponse(INVALID_DASHBOARD_OVERVIEW, 'dashboardOverview', '/api/test');
  console.log('Invalid data validation:', invalidResult);
  
  // Test mock data detection
  const mockDetection = detectMockData(MOCK_DATA_SAMPLE);
  console.log('Mock data detection:', mockDetection);
  
  // Test empty state detection
  console.log('Should show empty state for []:', shouldShowEmptyState([]));
  console.log('Should show empty state for {}:', shouldShowEmptyState({}));
  console.log('Should show empty state for null:', shouldShowEmptyState(null));
  console.log('Should show empty state for valid data:', shouldShowEmptyState(MOCK_DASHBOARD_OVERVIEW));
  
  console.groupEnd();
}

export function testErrorLogger(): void {
  console.group('🧪 Testing Error Logger');
  
  // Test different error types
  errorLogger.logApiResponseError(
    'TestComponent',
    '/api/test',
    'DashboardOverview',
    INVALID_DASHBOARD_OVERVIEW,
    ['kpis should be array', 'credits.current should be number']
  );
  
  errorLogger.logMockDataDetected(
    'TestComponent',
    'Test Data Source',
    ['Contains mock IDs', 'Contains test names']
  );
  
  errorLogger.logTypeMismatch(
    'TestComponent',
    'kpis',
    'array',
    'string',
    INVALID_DASHBOARD_OVERVIEW
  );
  
  errorLogger.logMissingRequiredField(
    'TestComponent',
    'agents',
    INVALID_DASHBOARD_OVERVIEW
  );
  
  // Print error report
  errorLogger.printErrorReport();
  
  console.groupEnd();
}

export function testComponentDebugger(): void {
  console.group('🧪 Testing Component Debugger');
  
  // Test component data logging
  logComponentData('TestComponent', MOCK_DASHBOARD_OVERVIEW, 'object', 'API Response');
  logComponentData('TestComponent', [], 'array', 'Empty API Response');
  logComponentData('TestComponent', null, 'object', 'Failed API Response');
  
  // Test fallback data logging
  logFallbackDataUsage('TestComponent', MOCK_DASHBOARD_OVERVIEW, 'API call failed');
  
  console.groupEnd();
}

export function testPerformanceTracking(): void {
  console.group('🧪 Testing Performance Tracking');
  
  // Test performance tracking
  dataFlowDebugger.startPerformanceTracking('test-operation');
  
  // Simulate some work
  setTimeout(() => {
    const metrics = dataFlowDebugger.endPerformanceTracking('test-operation');
    console.log('Performance metrics:', metrics);
    
    // Log API response with performance tracking
    dataFlowDebugger.logApiResponse('/api/test-perf', MOCK_DASHBOARD_OVERVIEW, undefined, 'test-operation');
  }, 100);
  
  console.groupEnd();
}

export function testValidationSchemas(): void {
  console.group('🧪 Testing Validation Schemas');
  
  // Register test schema
  dataFlowDebugger.registerValidationSchema('/api/test', {
    kpis: [{
      label: 'string',
      value: 'number',
    }],
    credits: {
      current: 'number',
    },
  });
  
  // Test with registered schema
  dataFlowDebugger.logApiResponse('/api/test', MOCK_DASHBOARD_OVERVIEW);
  dataFlowDebugger.logApiResponse('/api/test', INVALID_DASHBOARD_OVERVIEW);
  
  console.groupEnd();
}

// Run all tests
export function runAllDebuggingTests(): void {
  console.group('🧪 Running All Debugging Tests');
  
  testDataFlowDebugger();
  testTypeValidation();
  testErrorLogger();
  testComponentDebugger();
  testPerformanceTracking();
  testValidationSchemas();
  
  // Export logs for analysis
  console.log('📊 Data Flow Logs:', dataFlowDebugger.exportLogs());
  console.log('📊 Validation Report:', dataFlowDebugger.exportValidationReport());
  console.log('📊 Error Report:', errorLogger.exportErrors());
  
  console.groupEnd();
}

// Utility to clear all debugging data
export function clearAllDebuggingData(): void {
  dataFlowDebugger.clearLogs();
  errorLogger.clearErrors();
  console.log('🧹 All debugging data cleared');
}

// Export test functions
export default {
  testDataFlowDebugger,
  testTypeValidation,
  testErrorLogger,
  testComponentDebugger,
  testPerformanceTracking,
  testValidationSchemas,
  runAllDebuggingTests,
  clearAllDebuggingData,
};