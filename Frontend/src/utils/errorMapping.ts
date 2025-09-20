/**
 * Error code mapping utility for consistent error messages across the application
 */

export interface ErrorMapping {
  code: string;
  message: string;
  category: 'auth' | 'validation' | 'network' | 'business' | 'server' | 'payment' | 'file' | 'integration';
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryable: boolean;
  userAction?: string;
}

/**
 * Comprehensive error code mappings
 */
export const ERROR_MAPPINGS: Record<string, ErrorMapping> = {
  // Authentication errors
  'UNAUTHORIZED': {
    code: 'UNAUTHORIZED',
    message: 'You are not authorized to perform this action. Please log in again.',
    category: 'auth',
    severity: 'high',
    retryable: false,
    userAction: 'Please log in again to continue.',
  },
  'TOKEN_EXPIRED': {
    code: 'TOKEN_EXPIRED',
    message: 'Your session has expired. Please log in again.',
    category: 'auth',
    severity: 'high',
    retryable: false,
    userAction: 'Please log in again to continue.',
  },
  'INVALID_CREDENTIALS': {
    code: 'INVALID_CREDENTIALS',
    message: 'Invalid email or password. Please check your credentials.',
    category: 'auth',
    severity: 'medium',
    retryable: true,
    userAction: 'Please check your email and password and try again.',
  },
  'FORBIDDEN': {
    code: 'FORBIDDEN',
    message: 'You do not have permission to perform this action.',
    category: 'auth',
    severity: 'medium',
    retryable: false,
    userAction: 'Contact support if you believe this is an error.',
  },
  'ACCOUNT_LOCKED': {
    code: 'ACCOUNT_LOCKED',
    message: 'Your account has been temporarily locked due to too many failed login attempts.',
    category: 'auth',
    severity: 'high',
    retryable: false,
    userAction: 'Please wait 30 minutes before trying again or contact support.',
  },

  // Validation errors
  'VALIDATION_ERROR': {
    code: 'VALIDATION_ERROR',
    message: 'Please check your input and try again.',
    category: 'validation',
    severity: 'low',
    retryable: true,
    userAction: 'Please correct the highlighted fields and try again.',
  },
  'INVALID_EMAIL': {
    code: 'INVALID_EMAIL',
    message: 'Please enter a valid email address.',
    category: 'validation',
    severity: 'low',
    retryable: true,
    userAction: 'Please enter a valid email address (e.g., user@example.com).',
  },
  'WEAK_PASSWORD': {
    code: 'WEAK_PASSWORD',
    message: 'Password must be at least 8 characters long and contain uppercase, lowercase, and numbers.',
    category: 'validation',
    severity: 'low',
    retryable: true,
    userAction: 'Please create a stronger password with at least 8 characters.',
  },
  'REQUIRED_FIELD': {
    code: 'REQUIRED_FIELD',
    message: 'Please fill in all required fields.',
    category: 'validation',
    severity: 'low',
    retryable: true,
    userAction: 'Please complete all required fields marked with an asterisk (*).',
  },
  'INVALID_PHONE': {
    code: 'INVALID_PHONE',
    message: 'Please enter a valid phone number.',
    category: 'validation',
    severity: 'low',
    retryable: true,
    userAction: 'Please enter a valid phone number with country code.',
  },

  // Resource errors
  'NOT_FOUND': {
    code: 'NOT_FOUND',
    message: 'The requested resource was not found.',
    category: 'business',
    severity: 'medium',
    retryable: false,
    userAction: 'Please check if the resource still exists or contact support.',
  },
  'ALREADY_EXISTS': {
    code: 'ALREADY_EXISTS',
    message: 'This resource already exists.',
    category: 'business',
    severity: 'low',
    retryable: false,
    userAction: 'Please use a different name or check existing resources.',
  },
  'CONFLICT': {
    code: 'CONFLICT',
    message: 'There was a conflict with your request. Please try again.',
    category: 'business',
    severity: 'medium',
    retryable: true,
    userAction: 'Please refresh the page and try again.',
  },

  // Business logic errors
  'INSUFFICIENT_CREDITS': {
    code: 'INSUFFICIENT_CREDITS',
    message: 'You do not have enough credits to perform this action.',
    category: 'business',
    severity: 'medium',
    retryable: false,
    userAction: 'Please purchase more credits to continue.',
  },
  'AGENT_LIMIT_EXCEEDED': {
    code: 'AGENT_LIMIT_EXCEEDED',
    message: 'You have reached the maximum number of agents allowed.',
    category: 'business',
    severity: 'medium',
    retryable: false,
    userAction: 'Please upgrade your plan or delete unused agents.',
  },
  'CONTACT_LIMIT_EXCEEDED': {
    code: 'CONTACT_LIMIT_EXCEEDED',
    message: 'You have reached the maximum number of contacts allowed.',
    category: 'business',
    severity: 'medium',
    retryable: false,
    userAction: 'Please upgrade your plan or delete unused contacts.',
  },
  'RATE_LIMITED': {
    code: 'RATE_LIMITED',
    message: 'Too many requests. Please wait a moment and try again.',
    category: 'business',
    severity: 'medium',
    retryable: true,
    userAction: 'Please wait a few seconds before making another request.',
  },

  // Network and server errors
  'NETWORK_ERROR': {
    code: 'NETWORK_ERROR',
    message: 'Unable to connect to the server. Please check your internet connection.',
    category: 'network',
    severity: 'high',
    retryable: true,
    userAction: 'Please check your internet connection and try again.',
  },
  'TIMEOUT_ERROR': {
    code: 'TIMEOUT_ERROR',
    message: 'The request timed out. Please try again.',
    category: 'network',
    severity: 'medium',
    retryable: true,
    userAction: 'Please try again. If the problem persists, contact support.',
  },
  'SERVER_ERROR': {
    code: 'SERVER_ERROR',
    message: 'A server error occurred. Please try again later.',
    category: 'server',
    severity: 'high',
    retryable: true,
    userAction: 'Please try again in a few minutes.',
  },
  'SERVICE_UNAVAILABLE': {
    code: 'SERVICE_UNAVAILABLE',
    message: 'The service is temporarily unavailable. Please try again later.',
    category: 'server',
    severity: 'high',
    retryable: true,
    userAction: 'Please try again in a few minutes.',
  },
  'BAD_GATEWAY': {
    code: 'BAD_GATEWAY',
    message: 'There was a problem with the server connection. Please try again.',
    category: 'server',
    severity: 'high',
    retryable: true,
    userAction: 'Please try again in a few minutes.',
  },

  // File upload errors
  'FILE_TOO_LARGE': {
    code: 'FILE_TOO_LARGE',
    message: 'The file is too large. Please choose a smaller file.',
    category: 'file',
    severity: 'low',
    retryable: true,
    userAction: 'Please select a file smaller than 10MB.',
  },
  'INVALID_FILE_TYPE': {
    code: 'INVALID_FILE_TYPE',
    message: 'Invalid file type. Please upload a supported file format.',
    category: 'file',
    severity: 'low',
    retryable: true,
    userAction: 'Please upload a CSV or Excel file.',
  },
  'UPLOAD_FAILED': {
    code: 'UPLOAD_FAILED',
    message: 'File upload failed. Please try again.',
    category: 'file',
    severity: 'medium',
    retryable: true,
    userAction: 'Please check your file and try uploading again.',
  },
  'FILE_CORRUPTED': {
    code: 'FILE_CORRUPTED',
    message: 'The file appears to be corrupted or invalid.',
    category: 'file',
    severity: 'medium',
    retryable: true,
    userAction: 'Please check your file and try uploading a different version.',
  },

  // Payment errors
  'PAYMENT_FAILED': {
    code: 'PAYMENT_FAILED',
    message: 'Payment processing failed. Please check your payment method.',
    category: 'payment',
    severity: 'high',
    retryable: true,
    userAction: 'Please check your payment details and try again.',
  },
  'CARD_DECLINED': {
    code: 'CARD_DECLINED',
    message: 'Your card was declined. Please try a different payment method.',
    category: 'payment',
    severity: 'medium',
    retryable: true,
    userAction: 'Please try a different card or contact your bank.',
  },
  'PAYMENT_REQUIRED': {
    code: 'PAYMENT_REQUIRED',
    message: 'Payment is required to continue.',
    category: 'payment',
    severity: 'medium',
    retryable: false,
    userAction: 'Please add a payment method to continue.',
  },
  'INSUFFICIENT_FUNDS': {
    code: 'INSUFFICIENT_FUNDS',
    message: 'Insufficient funds on your payment method.',
    category: 'payment',
    severity: 'medium',
    retryable: true,
    userAction: 'Please check your account balance or try a different payment method.',
  },
  'STRIPE_NOT_CONFIGURED': {
    code: 'STRIPE_NOT_CONFIGURED',
    message: 'Payment processing is currently unavailable.',
    category: 'payment',
    severity: 'low',
    retryable: false,
    userAction: 'Payment features will be available soon. Please check back later.',
  },

  // ElevenLabs integration errors
  'ELEVENLABS_ERROR': {
    code: 'ELEVENLABS_ERROR',
    message: 'There was an issue with the voice service. Please try again.',
    category: 'integration',
    severity: 'medium',
    retryable: true,
    userAction: 'Please try again. If the problem persists, contact support.',
  },
  'VOICE_NOT_FOUND': {
    code: 'VOICE_NOT_FOUND',
    message: 'The selected voice is not available.',
    category: 'integration',
    severity: 'low',
    retryable: false,
    userAction: 'Please select a different voice.',
  },
  'AGENT_CONNECTION_FAILED': {
    code: 'AGENT_CONNECTION_FAILED',
    message: 'Failed to connect to the agent service.',
    category: 'integration',
    severity: 'high',
    retryable: true,
    userAction: 'Please check your agent configuration and try again.',
  },
  'ELEVENLABS_QUOTA_EXCEEDED': {
    code: 'ELEVENLABS_QUOTA_EXCEEDED',
    message: 'Voice service quota exceeded. Please try again later.',
    category: 'integration',
    severity: 'medium',
    retryable: true,
    userAction: 'Please wait a few minutes before trying again.',
  },

  // Generic errors
  'UNKNOWN_ERROR': {
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred. Please try again.',
    category: 'server',
    severity: 'medium',
    retryable: true,
    userAction: 'Please try again. If the problem persists, contact support.',
  },
  'GENERIC_ERROR': {
    code: 'GENERIC_ERROR',
    message: 'Something went wrong. Please try again.',
    category: 'server',
    severity: 'medium',
    retryable: true,
    userAction: 'Please try again. If the problem persists, contact support.',
  },
};

/**
 * Get error mapping for a given error code
 */
export function getErrorMapping(code: string): ErrorMapping {
  return ERROR_MAPPINGS[code] || ERROR_MAPPINGS['UNKNOWN_ERROR'];
}

/**
 * Get user-friendly error message for a given error code
 */
export function getErrorMessage(code: string, defaultMessage?: string): string {
  // If we have a default message and the code is not in our mappings, use the default
  if (defaultMessage && !ERROR_MAPPINGS[code]) {
    return defaultMessage;
  }
  
  const mapping = getErrorMapping(code);
  return mapping.message || defaultMessage || 'An unexpected error occurred.';
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(code: string): boolean {
  const mapping = getErrorMapping(code);
  return mapping.retryable;
}

/**
 * Get error severity level
 */
export function getErrorSeverity(code: string): 'low' | 'medium' | 'high' | 'critical' {
  const mapping = getErrorMapping(code);
  return mapping.severity;
}

/**
 * Get error category
 */
export function getErrorCategory(code: string): 'auth' | 'validation' | 'network' | 'business' | 'server' | 'payment' | 'file' | 'integration' {
  const mapping = getErrorMapping(code);
  return mapping.category;
}

/**
 * Get user action suggestion for an error
 */
export function getUserActionSuggestion(code: string): string | undefined {
  const mapping = getErrorMapping(code);
  return mapping.userAction;
}

/**
 * Map HTTP status codes to error codes
 */
export function mapStatusToErrorCode(status: number, responseCode?: string): string {
  // If we have a specific error code from the response, use it
  if (responseCode && ERROR_MAPPINGS[responseCode]) {
    return responseCode;
  }

  // Otherwise, map based on HTTP status
  switch (status) {
    case 400:
      return 'VALIDATION_ERROR';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 422:
      return 'VALIDATION_ERROR';
    case 429:
      return 'RATE_LIMITED';
    case 408:
      return 'TIMEOUT_ERROR';
    case 500:
      return 'SERVER_ERROR';
    case 502:
      return 'BAD_GATEWAY';
    case 503:
      return 'SERVICE_UNAVAILABLE';
    case 504:
      return 'TIMEOUT_ERROR';
    default:
      if (status >= 500) {
        return 'SERVER_ERROR';
      } else if (status >= 400) {
        return 'VALIDATION_ERROR';
      }
      return 'UNKNOWN_ERROR';
  }
}