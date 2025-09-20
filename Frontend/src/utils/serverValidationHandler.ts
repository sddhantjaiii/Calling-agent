/**
 * Server-side validation error handler
 * Maps backend validation errors to form fields and provides clear error messages
 */

import { toast } from 'sonner';
import { getErrorMessage, getUserActionSuggestion } from './errorMapping';

export interface ServerValidationError {
  code: string;
  message: string;
  status: number;
  details?: Record<string, string | string[]>;
}

export interface ValidationErrorMapping {
  [serverField: string]: string; // Maps server field names to form field names
}

export interface FormValidationResult {
  hasErrors: boolean;
  fieldErrors: Record<string, string>;
  generalError?: string;
}

/**
 * Default field mappings for common server field names to form field names
 */
const DEFAULT_FIELD_MAPPINGS: ValidationErrorMapping = {
  // User/Auth fields
  'email': 'email',
  'password': 'password',
  'confirmPassword': 'confirmPassword',
  'confirm_password': 'confirmPassword',
  'name': 'name',
  'firstName': 'firstName',
  'first_name': 'firstName',
  'lastName': 'lastName',
  'last_name': 'lastName',
  
  // Contact fields
  'phoneNumber': 'phoneNumber',
  'phone_number': 'phoneNumber',
  'phone': 'phoneNumber',
  'company': 'company',
  'notes': 'notes',
  
  // Agent fields
  'agentName': 'name',
  'agent_name': 'name',
  'type': 'type',
  'agentType': 'agentType',
  'agent_type': 'agentType',
  'language': 'language',
  'voiceId': 'voiceId',
  'voice_id': 'voiceId',
  'description': 'description',
  'model': 'model',
  
  // Billing fields
  'amount': 'amount',
  'customAmount': 'customAmount',
  'custom_amount': 'customAmount',
  'creditAmount': 'creditAmount',
  'credit_amount': 'creditAmount',
  
  // File upload fields
  'file': 'file',
  'upload': 'file',
  'csv': 'file',
  'contacts': 'file',
};

/**
 * Check if an error is a server validation error
 */
export function isServerValidationError(error: unknown): error is ServerValidationError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'status' in error &&
    ((error as any).code === 'VALIDATION_ERROR' || (error as any).status === 400 || (error as any).status === 422) &&
    'details' in error &&
    typeof (error as any).details === 'object'
  );
}

/**
 * Extract validation errors from server response
 */
export function extractValidationErrors(
  error: unknown,
  fieldMappings: ValidationErrorMapping = {}
): FormValidationResult {
  if (!isServerValidationError(error)) {
    return {
      hasErrors: false,
      fieldErrors: {},
      generalError: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }

  const combinedMappings = { ...DEFAULT_FIELD_MAPPINGS, ...fieldMappings };
  const fieldErrors: Record<string, string> = {};
  let generalError: string | undefined;

  if (error.details) {
    // Process each field error from the server
    Object.entries(error.details).forEach(([serverField, serverError]) => {
      // Convert server error to string (handle both string and string[] formats)
      const errorMessage = Array.isArray(serverError) ? serverError[0] : serverError;
      
      if (typeof errorMessage !== 'string') {
        return;
      }

      // Map server field name to form field name
      const formField = combinedMappings[serverField] || serverField;
      
      // Clean up the error message
      const cleanedMessage = cleanErrorMessage(errorMessage, formField);
      
      fieldErrors[formField] = cleanedMessage;
    });
  }

  // If no specific field errors, treat as general error
  if (Object.keys(fieldErrors).length === 0) {
    generalError = getErrorMessage(error.code, error.message);
  }

  return {
    hasErrors: Object.keys(fieldErrors).length > 0 || !!generalError,
    fieldErrors,
    generalError,
  };
}

/**
 * Clean and format error messages for better user experience
 */
function cleanErrorMessage(message: string, fieldName: string): string {
  // Just capitalize first letter and return as-is for now
  // More aggressive cleaning can be added later if needed
  return message.charAt(0).toUpperCase() + message.slice(1);
}

/**
 * Handle server validation errors in forms
 */
export function handleServerValidationErrors(
  error: unknown,
  setFieldErrors: (errors: Record<string, string>) => void,
  fieldMappings?: ValidationErrorMapping,
  options?: {
    showToast?: boolean;
    toastTitle?: string;
    clearExistingErrors?: boolean;
  }
): boolean {
  const {
    showToast = true,
    toastTitle = 'Validation Error',
    clearExistingErrors = true,
  } = options || {};

  const result = extractValidationErrors(error, fieldMappings);

  if (!result.hasErrors) {
    return false;
  }

  // Set field errors (clear existing if requested)
  if (Object.keys(result.fieldErrors).length > 0) {
    setFieldErrors(result.fieldErrors);
  } else if (clearExistingErrors) {
    setFieldErrors({});
  }

  // Show toast notification if requested
  if (showToast) {
    const errorCount = Object.keys(result.fieldErrors).length;
    const description = result.generalError || 
      (errorCount > 1 
        ? `Please correct ${errorCount} fields and try again.`
        : 'Please correct the highlighted field and try again.'
      );

    toast.error(toastTitle, {
      description,
      duration: 6000,
    });
  }

  return true;
}

/**
 * Create a validation error handler for a specific form
 */
export function createFormValidationHandler(
  setFieldErrors: (errors: Record<string, string>) => void,
  fieldMappings?: ValidationErrorMapping,
  options?: {
    showToast?: boolean;
    toastTitle?: string;
  }
) {
  return (error: unknown): boolean => {
    return handleServerValidationErrors(error, setFieldErrors, fieldMappings, options);
  };
}

/**
 * Merge client-side and server-side validation errors
 */
export function mergeValidationErrors(
  clientErrors: Record<string, string>,
  serverErrors: Record<string, string>
): Record<string, string> {
  // Server errors take precedence over client errors for the same field
  return {
    ...clientErrors,
    ...serverErrors,
  };
}

/**
 * Check if a field has validation errors (client or server)
 */
export function hasFieldError(
  fieldName: string,
  clientErrors: Record<string, string>,
  serverErrors: Record<string, string>
): boolean {
  return !!(clientErrors[fieldName] || serverErrors[fieldName]);
}

/**
 * Get the error message for a field (server errors take precedence)
 */
export function getFieldError(
  fieldName: string,
  clientErrors: Record<string, string>,
  serverErrors: Record<string, string>
): string | undefined {
  return serverErrors[fieldName] || clientErrors[fieldName];
}

/**
 * Common field mappings for different form types
 */
export const FORM_FIELD_MAPPINGS = {
  // Contact form mappings
  contact: {
    'phoneNumber': 'phoneNumber',
    'phone_number': 'phoneNumber',
    'phone': 'phoneNumber',
    'email': 'email',
    'name': 'name',
    'company': 'company',
    'notes': 'notes',
  },

  // Agent form mappings
  agent: {
    'name': 'name',
    'agentName': 'name',
    'agent_name': 'name',
    'type': 'type',
    'agentType': 'agentType',
    'agent_type': 'agentType',
    'language': 'language',
    'voiceId': 'voiceId',
    'voice_id': 'voiceId',
    'description': 'description',
    'model': 'model',
  },

  // Auth form mappings
  auth: {
    'email': 'email',
    'password': 'password',
    'confirmPassword': 'confirmPassword',
    'confirm_password': 'confirmPassword',
    'name': 'name',
    'firstName': 'firstName',
    'first_name': 'firstName',
    'lastName': 'lastName',
    'last_name': 'lastName',
  },

  // Billing form mappings
  billing: {
    'amount': 'amount',
    'customAmount': 'customAmount',
    'custom_amount': 'customAmount',
    'creditAmount': 'creditAmount',
    'credit_amount': 'creditAmount',
  },

  // Settings form mappings
  settings: {
    'name': 'name',
    'email': 'email',
    'company': 'company',
    'website': 'website',
    'phone': 'phone',
    'location': 'location',
    'bio': 'bio',
    'oldPassword': 'oldPassword',
    'old_password': 'oldPassword',
    'currentPassword': 'oldPassword',
    'current_password': 'oldPassword',
    'newPassword': 'newPassword',
    'new_password': 'newPassword',
    'confirmPassword': 'confPassword',
    'confirm_password': 'confPassword',
    'confPassword': 'confPassword',
  },
} as const;

/**
 * Utility to get field mappings for a specific form type
 */
export function getFormFieldMappings(formType: keyof typeof FORM_FIELD_MAPPINGS): ValidationErrorMapping {
  return FORM_FIELD_MAPPINGS[formType] || {};
}