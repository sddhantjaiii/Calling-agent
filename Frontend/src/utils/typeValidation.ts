// Type Validation Utility for API Responses
// This utility provides comprehensive type validation for API responses
// to catch data structure mismatches between backend and frontend

import type {
  DashboardOverview,
  DashboardAnalytics,
  Lead,
  LeadProfile,
  Contact,
  Call,
  Agent,
  CreditBalance,
  BillingHistory,
} from '../types';

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  path?: string;
}

// Type validation schemas
export const API_VALIDATION_SCHEMAS = {
  // Dashboard schemas
  dashboardOverview: {
    kpis: [{
      label: 'string',
      value: 'number|string',
      delta: 'number',
      compare: 'string',
      description: 'string',
      // Optional fields - not all KPIs have these
      percentage: 'number|undefined',
      efficiency: 'string|undefined',
    }],
    credits: {
      current: 'number',
      usedThisMonth: 'number',
      remaining: 'number',
    },
    agents: {
      total: 'number',
      active: 'number',
      draft: 'number',
    },
  },

  dashboardAnalytics: {
    leadsOverTimeData: [{
      date: 'string',
      chatLeads: 'number',
      callLeads: 'number',
      total: 'number',
    }],
    interactionsOverTimeData: [{
      date: 'string',
      chat: 'number',
      call: 'number',
      total: 'number',
    }],
    leadQualityData: [{
      name: 'string',
      chatCount: 'number',
      callCount: 'number',
      color: 'string',
    }],
  },

  // Lead schemas
  lead: {
    id: 'string',
    name: 'string',
    phone: 'string',
    email: 'string',
    leadTag: 'string',
    engagementLevel: 'string',
    intentLevel: 'string',
    interactionDate: 'string',
    platform: 'string',
    agent: 'string',
  },

  leadProfile: {
    id: 'string',
    name: 'string',
    phone: 'string',
    email: 'string',
    analytics: {
      engagementScore: 'number',
      intentScore: 'number',
      qualityScore: 'number',
      responseTime: 'number',
    },
    timeline: [{
      id: 'string',
      type: 'string',
      timestamp: 'string',
      content: 'string',
      metadata: 'object',
    }],
    reasoning: 'string',
  },

  // Contact schemas
  contact: {
    id: 'string',
    name: 'string',
    phone: 'string',
    email: 'string',
    tags: ['string'],
    createdAt: 'string',
    updatedAt: 'string',
  },

  // Call schemas
  call: {
    id: 'string',
    contactId: 'string',
    agentId: 'string',
    status: 'string',
    duration: 'number',
    startTime: 'string',
    endTime: 'string',
    transcript: 'string',
    recording: 'string',
  },

  // Agent schemas
  agent: {
    id: 'string',
    name: 'string',
    type: 'string',
    status: 'string',
    voice: 'string',
    language: 'string',
    prompt: 'string',
    createdAt: 'string',
    updatedAt: 'string',
  },

  // Billing schemas
  creditBalance: {
    current: 'number',
    used: 'number',
    remaining: 'number',
    lastUpdated: 'string',
  },

  billingHistory: {
    transactions: [{
      id: 'string',
      type: 'string',
      amount: 'number',
      credits: 'number',
      date: 'string',
      status: 'string',
    }],
    pagination: {
      total: 'number',
      page: 'number',
      limit: 'number',
      hasMore: 'boolean',
    },
  },
};

// Main validation function
export function validateApiResponse<T>(
  data: unknown,
  schemaKey: keyof typeof API_VALIDATION_SCHEMAS,
  endpoint?: string
): ValidationResult & { data?: T } {
  const schema = API_VALIDATION_SCHEMAS[schemaKey];
  if (!schema) {
    return {
      isValid: false,
      errors: [`No validation schema found for ${schemaKey}`],
      warnings: [],
    };
  }

  const result = validateStructure(data, schema, endpoint || schemaKey);
  
  // Log validation results
  if (!result.isValid) {
    console.warn(`⚠️ API Response Validation Failed for ${endpoint || schemaKey}:`, {
      errors: result.errors,
      warnings: result.warnings,
      data,
    });
  }

  return {
    ...result,
    data: result.isValid ? (data as T) : undefined,
  };
}

// Validate data structure against schema
function validateStructure(data: unknown, schema: any, path: string = 'root'): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    validateRecursive(data, schema, path, errors, warnings);
  } catch (error) {
    errors.push(`Validation error at ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    path,
  };
}

// Recursive validation helper
function validateRecursive(data: unknown, schema: any, path: string, errors: string[], warnings: string[]): void {
  if (schema === null || schema === undefined) {
    return; // Allow any value
  }

  // Handle union types (e.g., 'number|string', 'number|undefined')
  if (typeof schema === 'string' && schema.includes('|')) {
    const types = schema.split('|');
    const actualType = Array.isArray(data) ? 'array' : typeof data;
    
    // If undefined is allowed and data is undefined, that's valid
    if (types.includes('undefined') && data === undefined) {
      return;
    }
    
    if (!types.includes(actualType)) {
      errors.push(`${path}: Expected one of [${types.join(', ')}], got ${actualType}`);
    }
    return;
  }

  // Handle primitive type validation
  if (typeof schema === 'string') {
    const expectedType = schema;
    const actualType = Array.isArray(data) ? 'array' : typeof data;
    
    if (actualType !== expectedType) {
      errors.push(`${path}: Expected ${expectedType}, got ${actualType}`);
    }
    return;
  }

  // Handle array validation
  if (Array.isArray(schema)) {
    if (!Array.isArray(data)) {
      errors.push(`${path}: Expected array, got ${typeof data}`);
      return;
    }

    if (data.length === 0) {
      warnings.push(`${path}: Empty array - consider showing empty state`);
      return;
    }

    // Validate array items against schema
    if (schema.length > 0) {
      data.forEach((item, index) => {
        validateRecursive(item, schema[0], `${path}[${index}]`, errors, warnings);
      });
    }
    return;
  }

  // Handle object validation
  if (typeof schema === 'object' && schema !== null) {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      errors.push(`${path}: Expected object, got ${Array.isArray(data) ? 'array' : typeof data}`);
      return;
    }

    const dataObj = data as Record<string, unknown>;

    // Check required properties
    for (const key in schema) {
      const newPath = `${path}.${key}`;
      
      // Check if the field is optional (has 'undefined' in its type)
      const isOptional = typeof schema[key] === 'string' && schema[key].includes('undefined');
      
      if (!(key in dataObj)) {
        if (!isOptional) {
          errors.push(`${newPath}: Missing required property`);
        }
        continue;
      }

      validateRecursive(dataObj[key], schema[key], newPath, errors, warnings);
    }

    // Check for unexpected properties
    for (const key in dataObj) {
      if (!(key in schema)) {
        warnings.push(`${path}.${key}: Unexpected property`);
      }
    }

    // Check for empty objects
    if (Object.keys(dataObj).length === 0) {
      warnings.push(`${path}: Empty object - consider showing empty state`);
    }
  }
}

// Validate specific API response types
export const validateDashboardOverview = (data: unknown): ValidationResult & { data?: DashboardOverview } =>
  validateApiResponse<DashboardOverview>(data, 'dashboardOverview', '/api/dashboard/overview');

export const validateDashboardAnalytics = (data: unknown): ValidationResult & { data?: DashboardAnalytics } =>
  validateApiResponse<DashboardAnalytics>(data, 'dashboardAnalytics', '/api/dashboard/analytics');

export const validateLead = (data: unknown): ValidationResult & { data?: Lead } =>
  validateApiResponse<Lead>(data, 'lead', '/api/leads/:id');

export const validateLeadProfile = (data: unknown): ValidationResult & { data?: LeadProfile } =>
  validateApiResponse<LeadProfile>(data, 'leadProfile', '/api/leads/:id/profile');

export const validateContact = (data: unknown): ValidationResult & { data?: Contact } =>
  validateApiResponse<Contact>(data, 'contact', '/api/contacts/:id');

export const validateCall = (data: unknown): ValidationResult & { data?: Call } =>
  validateApiResponse<Call>(data, 'call', '/api/calls/:id');

export const validateAgent = (data: unknown): ValidationResult & { data?: Agent } =>
  validateApiResponse<Agent>(data, 'agent', '/api/agents/:id');

export const validateCreditBalance = (data: unknown): ValidationResult & { data?: CreditBalance } =>
  validateApiResponse<CreditBalance>(data, 'creditBalance', '/api/billing/credits');

export const validateBillingHistory = (data: unknown): ValidationResult & { data?: BillingHistory } =>
  validateApiResponse<BillingHistory>(data, 'billingHistory', '/api/billing/history');

// Utility to check if data is empty and should show empty state
export function shouldShowEmptyState(data: unknown): boolean {
  if (data === null || data === undefined) return true;
  if (Array.isArray(data) && data.length === 0) return true;
  if (typeof data === 'object' && Object.keys(data as object).length === 0) return true;
  return false;
}

// Utility to get human-readable data type
export function getDataType(data: unknown): string {
  if (data === null) return 'null';
  if (data === undefined) return 'undefined';
  if (Array.isArray(data)) return 'array';
  return typeof data;
}

// Utility to check if data looks like mock/fallback data
export function detectMockData(data: unknown): { isMock: boolean; reasons: string[] } {
  const reasons: string[] = [];
  
  if (Array.isArray(data)) {
    // Check for repeated patterns that might indicate mock data
    if (data.length > 1) {
      const firstItem = JSON.stringify(data[0]);
      const duplicates = data.filter(item => JSON.stringify(item) === firstItem).length;
      if (duplicates === data.length) {
        reasons.push('All array items are identical (possible mock data)');
      }
    }

    // Check for sequential IDs or obvious test data
    data.forEach((item, index) => {
      if (typeof item === 'object' && item !== null) {
        const obj = item as Record<string, unknown>;
        if (obj.id === `test-${index}` || obj.id === `mock-${index}`) {
          reasons.push('Contains test/mock IDs');
        }
        if (typeof obj.name === 'string' && obj.name.includes('Test')) {
          reasons.push('Contains test names');
        }
      }
    });
  }

  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    
    // Check for common mock data patterns
    if (obj.id && typeof obj.id === 'string' && obj.id.startsWith('mock-')) {
      reasons.push('ID starts with "mock-"');
    }
    
    if (obj.name && typeof obj.name === 'string' && obj.name.includes('Test')) {
      reasons.push('Name contains "Test"');
    }

    // Check for Math.random() generated values (unlikely to be exactly 0.5, but possible)
    Object.values(obj).forEach(value => {
      if (typeof value === 'number' && value > 0 && value < 1) {
        const str = value.toString();
        if (str.length > 10) { // Long decimal, might be Math.random()
          reasons.push('Contains long decimal values (possible Math.random())');
        }
      }
    });
  }

  return {
    isMock: reasons.length > 0,
    reasons,
  };
}

export default {
  validateApiResponse,
  validateDashboardOverview,
  validateDashboardAnalytics,
  validateLead,
  validateLeadProfile,
  validateContact,
  validateCall,
  validateAgent,
  validateCreditBalance,
  validateBillingHistory,
  shouldShowEmptyState,
  getDataType,
  detectMockData,
  API_VALIDATION_SCHEMAS,
};