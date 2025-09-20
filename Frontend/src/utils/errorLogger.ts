// Error Logging Utility for Data Integration Issues
// This utility provides comprehensive error logging for data integration problems

import { dataFlowDebugger } from './dataFlowDebugger';

// Error types for data integration
export enum DataIntegrationErrorType {
  API_RESPONSE_INVALID = 'API_RESPONSE_INVALID',
  DATA_TRANSFORMATION_FAILED = 'DATA_TRANSFORMATION_FAILED',
  MOCK_DATA_DETECTED = 'MOCK_DATA_DETECTED',
  EMPTY_DATA_UNEXPECTED = 'EMPTY_DATA_UNEXPECTED',
  TYPE_MISMATCH = 'TYPE_MISMATCH',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  HOOK_DATA_INVALID = 'HOOK_DATA_INVALID',
  COMPONENT_PROP_INVALID = 'COMPONENT_PROP_INVALID',
  FALLBACK_DATA_USED = 'FALLBACK_DATA_USED',
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'LOW',       // Warning, doesn't break functionality
  MEDIUM = 'MEDIUM', // May cause issues, should be investigated
  HIGH = 'HIGH',     // Likely to cause user-visible problems
  CRITICAL = 'CRITICAL', // Breaks core functionality
}

// Data integration error interface
export interface DataIntegrationError {
  id: string;
  timestamp: Date;
  type: DataIntegrationErrorType;
  severity: ErrorSeverity;
  component: string;
  message: string;
  context: {
    endpoint?: string;
    hook?: string;
    expectedData?: any;
    actualData?: any;
    stackTrace?: string;
  };
  userImpact: string;
  suggestedFix: string;
}

class ErrorLogger {
  private errors: DataIntegrationError[] = [];
  private isEnabled: boolean = process.env.NODE_ENV === 'development';

  // Enable/disable error logging
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  // Log a data integration error
  logError(
    type: DataIntegrationErrorType,
    severity: ErrorSeverity,
    component: string,
    message: string,
    context: DataIntegrationError['context'] = {},
    userImpact: string = 'Unknown impact',
    suggestedFix: string = 'No suggested fix available'
  ): void {
    if (!this.isEnabled) return;

    const error: DataIntegrationError = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type,
      severity,
      component,
      message,
      context: {
        ...context,
        stackTrace: new Error().stack,
      },
      userImpact,
      suggestedFix,
    };

    this.errors.push(error);

    // Log to console with appropriate level
    const logMethod = this.getLogMethod(severity);
    logMethod(`🚨 Data Integration Error [${severity}] in ${component}:`, {
      type,
      message,
      userImpact,
      suggestedFix,
      context,
    });

    // Also log to data flow debugger
    dataFlowDebugger.logDataIntegrationIssue(component, message, context.actualData, context.expectedData);
  }

  // Get appropriate console log method based on severity
  private getLogMethod(severity: ErrorSeverity): typeof console.log {
    switch (severity) {
      case ErrorSeverity.LOW:
        return console.info;
      case ErrorSeverity.MEDIUM:
        return console.warn;
      case ErrorSeverity.HIGH:
      case ErrorSeverity.CRITICAL:
        return console.error;
      default:
        return console.log;
    }
  }

  // Specific error logging methods
  logApiResponseError(
    component: string,
    endpoint: string,
    expectedData: any,
    actualData: any,
    validationErrors: string[]
  ): void {
    this.logError(
      DataIntegrationErrorType.API_RESPONSE_INVALID,
      ErrorSeverity.HIGH,
      component,
      `API response from ${endpoint} doesn't match expected structure`,
      {
        endpoint,
        expectedData,
        actualData,
      },
      'User may see incorrect data or empty states',
      `Verify API response structure matches frontend expectations. Validation errors: ${validationErrors.join(', ')}`
    );
  }

  logMockDataDetected(
    component: string,
    dataSource: string,
    mockDataReasons: string[]
  ): void {
    this.logError(
      DataIntegrationErrorType.MOCK_DATA_DETECTED,
      ErrorSeverity.CRITICAL,
      component,
      `Mock data detected in ${dataSource}`,
      {
        actualData: mockDataReasons,
      },
      'User sees fake/test data instead of real data',
      `Replace mock data with real API integration. Reasons: ${mockDataReasons.join(', ')}`
    );
  }

  logDataTransformationError(
    component: string,
    transformationName: string,
    inputData: any,
    error: Error
  ): void {
    this.logError(
      DataIntegrationErrorType.DATA_TRANSFORMATION_FAILED,
      ErrorSeverity.MEDIUM,
      component,
      `Data transformation '${transformationName}' failed: ${error.message}`,
      {
        actualData: inputData,
        stackTrace: error.stack,
      },
      'User may see malformed data or errors',
      'Check data transformation logic and handle edge cases'
    );
  }

  logTypeMismatch(
    component: string,
    fieldName: string,
    expectedType: string,
    actualType: string,
    data: any
  ): void {
    this.logError(
      DataIntegrationErrorType.TYPE_MISMATCH,
      ErrorSeverity.MEDIUM,
      component,
      `Type mismatch for ${fieldName}: expected ${expectedType}, got ${actualType}`,
      {
        actualData: data,
        expectedData: { [fieldName]: expectedType },
      },
      'Component may not render correctly or crash',
      `Ensure API returns ${fieldName} as ${expectedType} or add type conversion`
    );
  }

  logMissingRequiredField(
    component: string,
    fieldName: string,
    data: any
  ): void {
    this.logError(
      DataIntegrationErrorType.MISSING_REQUIRED_FIELD,
      ErrorSeverity.HIGH,
      component,
      `Missing required field: ${fieldName}`,
      {
        actualData: data,
      },
      'Component may not render correctly or show incomplete information',
      `Ensure API includes ${fieldName} field or make it optional in component`
    );
  }

  logUnexpectedEmptyData(
    component: string,
    dataSource: string,
    context: string
  ): void {
    this.logError(
      DataIntegrationErrorType.EMPTY_DATA_UNEXPECTED,
      ErrorSeverity.MEDIUM,
      component,
      `Unexpected empty data from ${dataSource} in context: ${context}`,
      {
        endpoint: dataSource,
      },
      'User sees empty states when data should be available',
      'Check API endpoint and data fetching logic'
    );
  }

  logFallbackDataUsage(
    component: string,
    reason: string,
    fallbackData: any
  ): void {
    this.logError(
      DataIntegrationErrorType.FALLBACK_DATA_USED,
      ErrorSeverity.LOW,
      component,
      `Using fallback data: ${reason}`,
      {
        actualData: fallbackData,
      },
      'User may see default/placeholder data instead of real data',
      'Fix the underlying data fetching issue to avoid fallback usage'
    );
  }

  // Get all errors
  getErrors(): DataIntegrationError[] {
    return [...this.errors];
  }

  // Get errors by severity
  getErrorsBySeverity(severity: ErrorSeverity): DataIntegrationError[] {
    return this.errors.filter(error => error.severity === severity);
  }

  // Get errors by component
  getErrorsByComponent(component: string): DataIntegrationError[] {
    return this.errors.filter(error => error.component === component);
  }

  // Get errors by type
  getErrorsByType(type: DataIntegrationErrorType): DataIntegrationError[] {
    return this.errors.filter(error => error.type === type);
  }

  // Get error summary
  getErrorSummary(): {
    total: number;
    bySeverity: Record<ErrorSeverity, number>;
    byType: Record<DataIntegrationErrorType, number>;
    byComponent: Record<string, number>;
  } {
    const summary = {
      total: this.errors.length,
      bySeverity: {} as Record<ErrorSeverity, number>,
      byType: {} as Record<DataIntegrationErrorType, number>,
      byComponent: {} as Record<string, number>,
    };

    // Initialize counters
    Object.values(ErrorSeverity).forEach(severity => {
      summary.bySeverity[severity] = 0;
    });
    Object.values(DataIntegrationErrorType).forEach(type => {
      summary.byType[type] = 0;
    });

    // Count errors
    this.errors.forEach(error => {
      summary.bySeverity[error.severity]++;
      summary.byType[error.type]++;
      summary.byComponent[error.component] = (summary.byComponent[error.component] || 0) + 1;
    });

    return summary;
  }

  // Clear all errors
  clearErrors(): void {
    this.errors = [];
    console.log('🧹 Data integration error log cleared');
  }

  // Export errors as JSON
  exportErrors(): string {
    return JSON.stringify(this.errors, null, 2);
  }

  // Print error report to console
  printErrorReport(): void {
    const summary = this.getErrorSummary();
    
    console.group('📊 Data Integration Error Report');
    console.log('Total errors:', summary.total);
    console.log('By severity:', summary.bySeverity);
    console.log('By type:', summary.byType);
    console.log('By component:', summary.byComponent);
    
    if (summary.bySeverity[ErrorSeverity.CRITICAL] > 0) {
      console.error('🚨 CRITICAL ERRORS DETECTED - These need immediate attention!');
      this.getErrorsBySeverity(ErrorSeverity.CRITICAL).forEach(error => {
        console.error(`- ${error.component}: ${error.message}`);
      });
    }
    
    console.groupEnd();
  }
}

// Create singleton instance
export const errorLogger = new ErrorLogger();

// Export convenience functions
export const logApiResponseError = errorLogger.logApiResponseError.bind(errorLogger);
export const logMockDataDetected = errorLogger.logMockDataDetected.bind(errorLogger);
export const logDataTransformationError = errorLogger.logDataTransformationError.bind(errorLogger);
export const logTypeMismatch = errorLogger.logTypeMismatch.bind(errorLogger);
export const logMissingRequiredField = errorLogger.logMissingRequiredField.bind(errorLogger);
export const logUnexpectedEmptyData = errorLogger.logUnexpectedEmptyData.bind(errorLogger);
export const logFallbackDataUsage = errorLogger.logFallbackDataUsage.bind(errorLogger);

export default errorLogger;