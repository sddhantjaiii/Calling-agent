// Component Debugging Utility
// This utility provides debugging helpers specifically for React components
// to track data flow and identify integration issues

import { dataFlowDebugger } from './dataFlowDebugger';
import { detectMockData, shouldShowEmptyState, getDataType } from './typeValidation';

// Component data logging with enhanced debugging
export function logComponentData(
  componentName: string,
  data: unknown,
  expectedDataType?: string,
  dataSource?: string
): void {
  // Log basic component data
  dataFlowDebugger.logComponentData(componentName, data, false, expectedDataType);

  // Additional component-specific checks
  if (data) {
    // Check for mock data
    const mockDetection = detectMockData(data);
    if (mockDetection.isMock) {
      console.warn(`🚨 ${componentName}: Mock data detected!`, mockDetection.reasons);
      dataFlowDebugger.logMockDataUsage(componentName, 'Component Props', mockDetection.reasons.join(', '));
    }

    // Check if empty state should be shown
    if (shouldShowEmptyState(data)) {
      console.info(`ℹ️ ${componentName}: Data is empty, consider showing empty state`);
    }

    // Log data source if provided
    if (dataSource) {
      console.log(`📊 ${componentName}: Data source - ${dataSource}`);
    }
  } else {
    console.warn(`⚠️ ${componentName}: No data received, showing empty state or fallback`);
  }
}

// Log when component uses fallback/default data
export function logFallbackDataUsage(
  componentName: string,
  fallbackData: unknown,
  reason: string
): void {
  console.warn(`🔄 ${componentName}: Using fallback data - ${reason}`);
  dataFlowDebugger.logHookData(componentName, fallbackData, true, `Fallback: ${reason}`);
  
  // Check if fallback data looks like mock data
  const mockDetection = detectMockData(fallbackData);
  if (mockDetection.isMock) {
    console.error(`🚨 ${componentName}: Fallback data appears to be mock data!`, mockDetection.reasons);
    dataFlowDebugger.logMockDataUsage(componentName, 'Fallback Data', mockDetection.reasons.join(', '));
  }
}

// Log data transformation in components
export function logDataTransformation(
  componentName: string,
  inputData: unknown,
  outputData: unknown,
  transformationDescription: string
): void {
  dataFlowDebugger.logDataTransformation(componentName, inputData, outputData, transformationDescription);
  
  // Validate transformation didn't introduce mock data
  if (outputData) {
    const mockDetection = detectMockData(outputData);
    if (mockDetection.isMock) {
      console.warn(`⚠️ ${componentName}: Data transformation may have introduced mock data`, mockDetection.reasons);
    }
  }
}

// Log when component receives unexpected data structure
export function logUnexpectedDataStructure(
  componentName: string,
  data: unknown,
  expectedStructure: string,
  actualStructure?: string
): void {
  const actual = actualStructure || getDataType(data);
  console.error(`❌ ${componentName}: Unexpected data structure. Expected: ${expectedStructure}, Got: ${actual}`);
  
  dataFlowDebugger.logDataIntegrationIssue(
    componentName,
    `Data structure mismatch: expected ${expectedStructure}, got ${actual}`,
    data,
    { expectedStructure }
  );
}

// Log component rendering with data state
export function logComponentRender(
  componentName: string,
  props: Record<string, unknown>,
  dataState: {
    loading?: boolean;
    error?: string | null;
    hasData?: boolean;
    isEmpty?: boolean;
  }
): void {
  console.group(`🎨 ${componentName} Render`);
  console.log('Props:', props);
  console.log('Data state:', dataState);
  
  // Check for potential issues
  if (dataState.loading && dataState.hasData) {
    console.warn('⚠️ Component is loading but already has data - check loading state logic');
  }
  
  if (!dataState.loading && !dataState.error && !dataState.hasData) {
    console.warn('⚠️ Component is not loading, has no error, but has no data - check data flow');
  }
  
  if (dataState.isEmpty && !dataState.loading) {
    console.info('ℹ️ Component has empty data - ensure empty state is shown');
  }
  
  console.groupEnd();
}

// Validate component props for common issues
export function validateComponentProps(
  componentName: string,
  props: Record<string, unknown>,
  requiredProps: string[] = [],
  optionalProps: string[] = []
): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check required props
  requiredProps.forEach(propName => {
    if (!(propName in props) || props[propName] === undefined) {
      issues.push(`Missing required prop: ${propName}`);
    }
  });
  
  // Check for unexpected props (if we have a defined prop list)
  if (optionalProps.length > 0) {
    const allExpectedProps = [...requiredProps, ...optionalProps];
    Object.keys(props).forEach(propName => {
      if (!allExpectedProps.includes(propName)) {
        issues.push(`Unexpected prop: ${propName}`);
      }
    });
  }
  
  // Check for mock data in props
  Object.entries(props).forEach(([propName, propValue]) => {
    if (propValue) {
      const mockDetection = detectMockData(propValue);
      if (mockDetection.isMock) {
        issues.push(`Prop '${propName}' contains mock data: ${mockDetection.reasons.join(', ')}`);
      }
    }
  });
  
  if (issues.length > 0) {
    console.warn(`⚠️ ${componentName}: Component prop validation issues:`, issues);
    dataFlowDebugger.logDataIntegrationIssue(componentName, `Prop validation failed: ${issues.join('; ')}`, props);
  }
  
  return {
    isValid: issues.length === 0,
    issues,
  };
}

// Create a React hook for component debugging
export function useComponentDebugger(componentName: string) {
  return {
    logData: (data: unknown, expectedType?: string, source?: string) => 
      logComponentData(componentName, data, expectedType, source),
    
    logFallback: (fallbackData: unknown, reason: string) => 
      logFallbackDataUsage(componentName, fallbackData, reason),
    
    logTransformation: (input: unknown, output: unknown, description: string) => 
      logDataTransformation(componentName, input, output, description),
    
    logUnexpectedStructure: (data: unknown, expected: string, actual?: string) => 
      logUnexpectedDataStructure(componentName, data, expected, actual),
    
    logRender: (props: Record<string, unknown>, dataState: any) => 
      logComponentRender(componentName, props, dataState),
    
    validateProps: (props: Record<string, unknown>, required?: string[], optional?: string[]) => 
      validateComponentProps(componentName, props, required, optional),
  };
}

// Export debugging utilities
export default {
  logComponentData,
  logFallbackDataUsage,
  logDataTransformation,
  logUnexpectedDataStructure,
  logComponentRender,
  validateComponentProps,
  useComponentDebugger,
};