// Enhanced Data Flow Debugger Utility
// This utility helps track API data flow through hooks and components
// to identify where data is not reaching components properly

interface DataFlowLog {
  timestamp: Date;
  component: string;
  hook?: string;
  apiEndpoint?: string;
  dataReceived: boolean;
  dataStructure?: any;
  error?: string;
  fallbackUsed?: boolean;
  mockDataUsed?: boolean;
  validationResult?: ValidationResult;
  transformationApplied?: string;
  performanceMetrics?: {
    duration: number;
    memoryUsage?: number;
  };
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  expectedStructure?: any;
  actualStructure?: any;
}

interface PerformanceMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryBefore?: number;
  memoryAfter?: number;
}

class DataFlowDebugger {
  private logs: DataFlowLog[] = [];
  private isEnabled: boolean = process.env.NODE_ENV === 'development';
  private performanceTracking: Map<string, PerformanceMetrics> = new Map();
  private validationSchemas: Map<string, any> = new Map();

  // Enable/disable debugging
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  // Register validation schema for an endpoint
  registerValidationSchema(endpoint: string, schema: any) {
    this.validationSchemas.set(endpoint, schema);
  }

  // Start performance tracking for an operation
  startPerformanceTracking(operationId: string): void {
    if (!this.isEnabled) return;
    
    this.performanceTracking.set(operationId, {
      startTime: performance.now(),
      memoryBefore: (performance as any).memory?.usedJSHeapSize,
    });
  }

  // End performance tracking for an operation
  endPerformanceTracking(operationId: string): PerformanceMetrics | null {
    if (!this.isEnabled) return null;
    
    const metrics = this.performanceTracking.get(operationId);
    if (!metrics) return null;

    const endTime = performance.now();
    const updatedMetrics = {
      ...metrics,
      endTime,
      duration: endTime - metrics.startTime,
      memoryAfter: (performance as any).memory?.usedJSHeapSize,
    };

    this.performanceTracking.set(operationId, updatedMetrics);
    return updatedMetrics;
  }

  // Enhanced API response logging with validation
  logApiResponse(endpoint: string, data: any, error?: string, performanceId?: string) {
    if (!this.isEnabled) return;

    // Get performance metrics if available
    const performanceMetrics = performanceId ? this.endPerformanceTracking(performanceId) : undefined;

    // Validate data structure if schema is registered
    const validationResult = this.validateDataStructure(endpoint, data);

    const log: DataFlowLog = {
      timestamp: new Date(),
      component: 'API_SERVICE',
      apiEndpoint: endpoint,
      dataReceived: !!data && !error,
      dataStructure: this.sanitizeData(data),
      error,
      validationResult,
      performanceMetrics: performanceMetrics ? {
        duration: performanceMetrics.duration || 0,
        memoryUsage: performanceMetrics.memoryAfter && performanceMetrics.memoryBefore 
          ? performanceMetrics.memoryAfter - performanceMetrics.memoryBefore 
          : undefined,
      } : undefined,
    };

    this.logs.push(log);
    console.group(`🔍 API Response: ${endpoint}`);
    console.log('Data received:', !!data && !error);
    console.log('Data structure:', this.sanitizeData(data));
    if (error) console.error('Error:', error);
    if (validationResult && !validationResult.isValid) {
      console.warn('⚠️ Validation errors:', validationResult.errors);
      if (validationResult.warnings.length > 0) {
        console.warn('⚠️ Validation warnings:', validationResult.warnings);
      }
    }
    if (performanceMetrics) {
      console.log('⏱️ Performance:', {
        duration: `${performanceMetrics.duration?.toFixed(2)}ms`,
        memoryDelta: performanceMetrics.memoryAfter && performanceMetrics.memoryBefore 
          ? `${((performanceMetrics.memoryAfter - performanceMetrics.memoryBefore) / 1024 / 1024).toFixed(2)}MB`
          : 'N/A'
      });
    }
    console.groupEnd();
  }

  // Enhanced hook data processing logging
  logHookData(hookName: string, data: any, fallbackUsed: boolean = false, transformationApplied?: string) {
    if (!this.isEnabled) return;

    // Validate hook data if we have a schema
    const validationResult = this.validateHookData(hookName, data);

    const log: DataFlowLog = {
      timestamp: new Date(),
      component: 'HOOK',
      hook: hookName,
      dataReceived: !!data,
      dataStructure: this.sanitizeData(data),
      fallbackUsed,
      validationResult,
      transformationApplied,
    };

    this.logs.push(log);
    console.group(`🎣 Hook Data: ${hookName}`);
    console.log('Data available:', !!data);
    console.log('Fallback used:', fallbackUsed);
    if (transformationApplied) {
      console.log('Transformation applied:', transformationApplied);
    }
    console.log('Data structure:', this.sanitizeData(data));
    if (validationResult && !validationResult.isValid) {
      console.warn('⚠️ Hook data validation errors:', validationResult.errors);
    }
    console.groupEnd();
  }

  // Enhanced component data consumption logging
  logComponentData(componentName: string, data: any, mockDataUsed: boolean = false, expectedDataType?: string) {
    if (!this.isEnabled) return;

    // Validate component data structure
    const validationResult = this.validateComponentData(componentName, data, expectedDataType);

    const log: DataFlowLog = {
      timestamp: new Date(),
      component: componentName,
      dataReceived: !!data,
      dataStructure: this.sanitizeData(data),
      mockDataUsed,
      validationResult,
    };

    this.logs.push(log);
    console.group(`🧩 Component Data: ${componentName}`);
    console.log('Data available:', !!data);
    console.log('Mock data used:', mockDataUsed);
    if (expectedDataType) {
      console.log('Expected data type:', expectedDataType);
    }
    console.log('Data structure:', this.sanitizeData(data));
    if (validationResult && !validationResult.isValid) {
      console.warn('⚠️ Component data validation errors:', validationResult.errors);
    }
    if (mockDataUsed) {
      console.warn('🚨 MOCK DATA DETECTED - This should be replaced with real API data');
    }
    console.groupEnd();
  }

  // Log data transformation issues
  logDataTransformation(component: string, input: any, output: any, transformationName: string) {
    if (!this.isEnabled) return;

    console.group(`🔄 Data Transformation: ${component} - ${transformationName}`);
    console.log('Input:', this.sanitizeData(input));
    console.log('Output:', this.sanitizeData(output));
    console.log('Transformation successful:', !!output);
    console.groupEnd();
  }

  // Log mock/fallback data usage
  logMockDataUsage(component: string, mockDataType: string, reason: string) {
    if (!this.isEnabled) return;

    const log: DataFlowLog = {
      timestamp: new Date(),
      component,
      dataReceived: false,
      mockDataUsed: true,
      error: reason,
    };

    this.logs.push(log);
    console.group(`⚠️ Mock Data Used: ${component}`);
    console.log('Mock data type:', mockDataType);
    console.log('Reason:', reason);
    console.groupEnd();
  }

  // Get all logs
  getLogs(): DataFlowLog[] {
    return [...this.logs];
  }

  // Get logs for specific component
  getLogsForComponent(component: string): DataFlowLog[] {
    return this.logs.filter(log => log.component === component);
  }

  // Get summary of data flow issues
  getDataFlowSummary() {
    const summary = {
      totalLogs: this.logs.length,
      apiErrors: this.logs.filter(log => log.error && log.component === 'API_SERVICE').length,
      fallbackUsage: this.logs.filter(log => log.fallbackUsed).length,
      mockDataUsage: this.logs.filter(log => log.mockDataUsed).length,
      componentsWithoutData: this.logs.filter(log => !log.dataReceived && log.component !== 'API_SERVICE').length,
    };

    console.group('📊 Data Flow Summary');
    console.table(summary);
    console.groupEnd();

    return summary;
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
    console.log('🧹 Data flow logs cleared');
  }

  // Sanitize data for logging (remove sensitive info, limit size)
  private sanitizeData(data: any): any {
    if (!data) return data;

    try {
      // Convert to JSON and back to remove functions and circular references
      const jsonData = JSON.parse(JSON.stringify(data));
      
      // Limit the size of logged data
      const dataString = JSON.stringify(jsonData);
      if (dataString.length > 1000) {
        return {
          ...jsonData,
          _truncated: true,
          _originalSize: dataString.length,
          _preview: dataString.substring(0, 500) + '...'
        };
      }

      return jsonData;
    } catch (error) {
      return { _error: 'Failed to sanitize data', _type: typeof data };
    }
  }

  // Validate data structure against registered schema
  private validateDataStructure(endpoint: string, data: any): ValidationResult | undefined {
    const schema = this.validationSchemas.get(endpoint);
    if (!schema || !data) return undefined;

    return this.performValidation(data, schema, `API endpoint: ${endpoint}`);
  }

  // Validate hook data
  private validateHookData(hookName: string, data: any): ValidationResult | undefined {
    const schema = this.validationSchemas.get(`hook:${hookName}`);
    if (!schema || !data) return undefined;

    return this.performValidation(data, schema, `Hook: ${hookName}`);
  }

  // Validate component data
  private validateComponentData(componentName: string, data: any, expectedDataType?: string): ValidationResult | undefined {
    if (!data) return undefined;

    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic type validation
    if (expectedDataType) {
      const actualType = Array.isArray(data) ? 'array' : typeof data;
      if (actualType !== expectedDataType) {
        errors.push(`Expected ${expectedDataType}, got ${actualType}`);
      }
    }

    // Check for common data issues
    if (Array.isArray(data) && data.length === 0) {
      warnings.push('Empty array - consider showing empty state');
    }

    if (typeof data === 'object' && data !== null && Object.keys(data).length === 0) {
      warnings.push('Empty object - consider showing empty state');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      expectedStructure: expectedDataType,
      actualStructure: Array.isArray(data) ? 'array' : typeof data,
    };
  }

  // Perform detailed validation
  private performValidation(data: any, schema: any, context: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const isValid = this.validateStructureRecursive(data, schema, '', errors, warnings);
      
      return {
        isValid,
        errors,
        warnings,
        expectedStructure: schema,
        actualStructure: this.getDataStructure(data),
      };
    } catch (error) {
      errors.push(`Validation failed for ${context}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        isValid: false,
        errors,
        warnings,
        expectedStructure: schema,
        actualStructure: this.getDataStructure(data),
      };
    }
  }

  // Recursive structure validation
  private validateStructureRecursive(data: any, schema: any, path: string, errors: string[], warnings: string[]): boolean {
    if (schema === null || schema === undefined) {
      return true; // Allow any value
    }

    if (typeof schema === 'string') {
      // Type validation
      const expectedType = schema;
      const actualType = Array.isArray(data) ? 'array' : typeof data;
      
      if (actualType !== expectedType) {
        errors.push(`${path || 'root'}: Expected ${expectedType}, got ${actualType}`);
        return false;
      }
      return true;
    }

    if (Array.isArray(schema)) {
      if (!Array.isArray(data)) {
        errors.push(`${path || 'root'}: Expected array, got ${typeof data}`);
        return false;
      }

      if (schema.length > 0 && data.length > 0) {
        // Validate first item against schema
        return this.validateStructureRecursive(data[0], schema[0], `${path}[0]`, errors, warnings);
      }
      return true;
    }

    if (typeof schema === 'object' && schema !== null) {
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        errors.push(`${path || 'root'}: Expected object, got ${Array.isArray(data) ? 'array' : typeof data}`);
        return false;
      }

      let isValid = true;
      for (const key in schema) {
        const newPath = path ? `${path}.${key}` : key;
        
        if (!(key in data)) {
          errors.push(`${newPath}: Missing required property`);
          isValid = false;
          continue;
        }

        if (!this.validateStructureRecursive(data[key], schema[key], newPath, errors, warnings)) {
          isValid = false;
        }
      }

      // Check for unexpected properties
      for (const key in data) {
        if (!(key in schema)) {
          warnings.push(`${path ? `${path}.${key}` : key}: Unexpected property`);
        }
      }

      return isValid;
    }

    return true;
  }

  // Get data structure description
  private getDataStructure(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.length > 0 ? [this.getDataStructure(data[0])] : [];
    }

    if (typeof data === 'object') {
      const structure: any = {};
      for (const key in data) {
        structure[key] = this.getDataStructure(data[key]);
      }
      return structure;
    }

    return typeof data;
  }

  // Log data integration issues
  logDataIntegrationIssue(component: string, issue: string, data?: any, expectedData?: any) {
    if (!this.isEnabled) return;

    console.group(`🚨 Data Integration Issue: ${component}`);
    console.error('Issue:', issue);
    if (data !== undefined) {
      console.log('Actual data:', this.sanitizeData(data));
    }
    if (expectedData !== undefined) {
      console.log('Expected data:', this.sanitizeData(expectedData));
    }
    console.groupEnd();

    // Add to logs
    this.logs.push({
      timestamp: new Date(),
      component,
      dataReceived: !!data,
      dataStructure: this.sanitizeData(data),
      error: issue,
    });
  }

  // Export logs as JSON for analysis
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Export validation report
  exportValidationReport(): string {
    const validationIssues = this.logs.filter(log => 
      log.validationResult && !log.validationResult.isValid
    );

    const report = {
      totalLogs: this.logs.length,
      validationIssues: validationIssues.length,
      issues: validationIssues.map(log => ({
        timestamp: log.timestamp,
        component: log.component,
        hook: log.hook,
        apiEndpoint: log.apiEndpoint,
        errors: log.validationResult?.errors || [],
        warnings: log.validationResult?.warnings || [],
      })),
    };

    return JSON.stringify(report, null, 2);
  }
}

// Create singleton instance
export const dataFlowDebugger = new DataFlowDebugger();

// Helper function to validate API response structure
export const validateApiResponse = (response: any, expectedStructure: any, endpoint: string): boolean => {
  if (!dataFlowDebugger) return true;

  try {
    const isValid = validateStructure(response, expectedStructure);
    
    if (!isValid) {
      console.warn(`⚠️ API Response Structure Mismatch: ${endpoint}`);
      console.log('Expected:', expectedStructure);
      console.log('Received:', response);
    }

    return isValid;
  } catch (error) {
    console.error(`❌ Validation Error for ${endpoint}:`, error);
    return false;
  }
};

// Simple structure validation helper
function validateStructure(data: any, structure: any): boolean {
  if (typeof structure !== 'object' || structure === null) {
    return typeof data === typeof structure;
  }

  if (Array.isArray(structure)) {
    return Array.isArray(data);
  }

  for (const key in structure) {
    if (!(key in data)) {
      return false;
    }
    if (!validateStructure(data[key], structure[key])) {
      return false;
    }
  }

  return true;
}

export default dataFlowDebugger;