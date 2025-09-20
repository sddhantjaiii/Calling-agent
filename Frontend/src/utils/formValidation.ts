/**
 * Comprehensive form validation utilities for client-side validation
 * Provides real-time validation feedback and ensures data format consistency
 */

import { useState } from 'react';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any, data?: any) => string | null;
  type?: 'email' | 'phone' | 'url' | 'number' | 'password';
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface FieldValidationResult {
  isValid: boolean;
  error: string | null;
}

/**
 * Validates a single field based on provided rules
 */
export const validateField = (
  value: any,
  rules: ValidationRule,
  fieldName?: string,
  data?: any
): FieldValidationResult => {
  const errors: string[] = [];
  const stringValue = String(value || '').trim();

  // Required validation
  if (rules.required && !stringValue) {
    return {
      isValid: false,
      error: `${fieldName || 'Field'} is required`
    };
  }

  // Skip other validations if field is empty and not required
  if (!stringValue && !rules.required) {
    return { isValid: true, error: null };
  }

  // Length validations
  if (rules.minLength && stringValue.length < rules.minLength) {
    errors.push(`Must be at least ${rules.minLength} characters long`);
  }

  if (rules.maxLength && stringValue.length > rules.maxLength) {
    errors.push(`Must be less than ${rules.maxLength} characters`);
  }

  // Type-specific validations
  if (rules.type) {
    const typeError = validateByType(stringValue, rules.type);
    if (typeError) {
      errors.push(typeError);
    }
  }

  // Pattern validation
  if (rules.pattern && !rules.pattern.test(stringValue)) {
    errors.push(`Invalid format`);
  }

  // Custom validation
  if (rules.custom) {
    const customError = rules.custom(value, data);
    if (customError) {
      errors.push(customError);
    }
  }

  return {
    isValid: errors.length === 0,
    error: errors.length > 0 ? errors[0] : null
  };
};

/**
 * Validates multiple fields based on a schema
 */
export const validateForm = (
  data: Record<string, any>,
  schema: Record<string, ValidationRule>
): ValidationResult => {
  const errors: Record<string, string> = {};

  Object.entries(schema).forEach(([fieldName, rules]) => {
    const result = validateField(data[fieldName], rules, fieldName, data);
    if (!result.isValid && result.error) {
      errors[fieldName] = result.error;
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Type-specific validation functions
 */
const validateByType = (value: string, type: ValidationRule['type']): string | null => {
  switch (type) {
    case 'email':
      return validateEmail(value);
    case 'phone':
      return validatePhone(value);
    case 'url':
      return validateUrl(value);
    case 'number':
      return validateNumber(value);
    case 'password':
      return validatePassword(value);
    default:
      return null;
  }
};

/**
 * Email validation
 */
export const validateEmail = (email: string): string | null => {
  if (!email) return null;
  
  // More strict email validation
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  // Check for consecutive dots
  if (email.includes('..')) {
    return 'Please enter a valid email address';
  }
  
  // Check for @ at start or end
  if (email.startsWith('@') || email.endsWith('@')) {
    return 'Please enter a valid email address';
  }
  
  // Check for missing domain
  if (!email.includes('@') || email.split('@').length !== 2) {
    return 'Please enter a valid email address';
  }
  
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) {
    return 'Please enter a valid email address';
  }
  
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }
  
  if (email.length > 255) {
    return 'Email address must be less than 255 characters';
  }
  
  return null;
};

/**
 * Phone number validation (international format)
 */
export const validatePhone = (phone: string): string | null => {
  if (!phone) return null;
  
  // Remove all non-digit characters for validation
  const cleanPhone = phone.replace(/\D/g, '');
  
  if (cleanPhone.length < 10) {
    return 'Phone number must be at least 10 digits';
  }
  
  if (cleanPhone.length > 15) {
    return 'Phone number must be less than 15 digits';
  }
  
  // Check for valid international phone number pattern
  const phoneRegex = /^[+]?[1-9][\d]{9,14}$/;
  if (!phoneRegex.test(cleanPhone)) {
    return 'Please enter a valid phone number';
  }
  
  // Additional validation for US numbers
  if (cleanPhone.length === 11 && cleanPhone.startsWith('1')) {
    const usNumber = cleanPhone.substring(1);
    if (usNumber.startsWith('0') || usNumber.startsWith('1')) {
      return 'US phone numbers cannot start with 0 or 1 after country code';
    }
  }
  
  return null;
};

/**
 * URL validation
 */
export const validateUrl = (url: string): string | null => {
  if (!url) return null;
  
  try {
    const urlObj = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return 'Please enter a valid URL (e.g., https://example.com)';
    }
    return null;
  } catch {
    return 'Please enter a valid URL (e.g., https://example.com)';
  }
};

/**
 * Number validation
 */
export const validateNumber = (value: string): string | null => {
  if (!value) return null;
  
  const num = Number(value);
  if (isNaN(num)) {
    return 'Please enter a valid number';
  }
  
  return null;
};

/**
 * Password validation
 */
export const validatePassword = (password: string): string | null => {
  if (!password) return null;
  
  if (password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  
  if (password.length > 128) {
    return 'Password must be less than 128 characters';
  }
  
  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }
  
  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }
  
  // Check for at least one digit
  if (!/\d/.test(password)) {
    return 'Password must contain at least one number';
  }
  
  // Check for at least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return 'Password must contain at least one special character';
  }
  
  return null;
};

/**
 * Password confirmation validation
 */
export const validatePasswordConfirmation = (
  password: string,
  confirmPassword: string
): string | null => {
  if (!confirmPassword) return 'Please confirm your password';
  
  if (password !== confirmPassword) {
    return 'Passwords do not match';
  }
  
  return null;
};

/**
 * Credit amount validation for billing
 */
export const validateCreditAmount = (
  amount: string | number,
  minAmount: number = 50,
  maxAmount: number = 10000
): string | null => {
  const numAmount = typeof amount === 'string' ? parseInt(amount) : amount;
  
  if (isNaN(numAmount) || numAmount <= 0) {
    return 'Please enter a valid credit amount';
  }
  
  if (numAmount < minAmount) {
    return `Minimum purchase is ${minAmount} credits`;
  }
  
  if (numAmount > maxAmount) {
    return `Maximum purchase is ${maxAmount} credits`;
  }
  
  return null;
};

/**
 * Agent name validation
 */
export const validateAgentName = (name: string): string | null => {
  if (!name?.trim()) {
    return 'Agent name is required';
  }
  
  const trimmedName = name.trim();
  
  if (trimmedName.length < 2) {
    return 'Agent name must be at least 2 characters';
  }
  
  if (trimmedName.length > 50) {
    return 'Agent name must be less than 50 characters';
  }
  
  // Check for valid characters (letters, numbers, spaces, hyphens, underscores)
  if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmedName)) {
    return 'Agent name can only contain letters, numbers, spaces, hyphens, and underscores';
  }
  
  return null;
};

/**
 * Contact name validation
 */
export const validateContactName = (name: string): string | null => {
  if (!name?.trim()) {
    return 'Contact name is required';
  }
  
  const trimmedName = name.trim();
  
  if (trimmedName.length < 2) {
    return 'Contact name must be at least 2 characters';
  }
  
  if (trimmedName.length > 100) {
    return 'Contact name must be less than 100 characters';
  }
  
  return null;
};

/**
 * Real-time validation hook for forms
 */
export const useFormValidation = (
  initialData: Record<string, any>,
  schema: Record<string, ValidationRule>
) => {
  const [data, setData] = useState(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateSingleField = (fieldName: string, value: any) => {
    const rules = schema[fieldName];
    if (!rules) return;

    const result = validateField(value, rules, fieldName);
    setErrors(prev => ({
      ...prev,
      [fieldName]: result.error || ''
    }));
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setData(prev => ({ ...prev, [fieldName]: value }));
    
    // Clear error when user starts typing
    if (errors[fieldName]) {
      setErrors(prev => ({ ...prev, [fieldName]: '' }));
    }
    
    // Validate field if it has been touched
    if (touched[fieldName]) {
      validateSingleField(fieldName, value);
    }
  };

  const handleFieldBlur = (fieldName: string) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    validateSingleField(fieldName, data[fieldName]);
  };

  const validateAll = (): boolean => {
    const result = validateForm(data, schema);
    setErrors(result.errors);
    
    // Mark all fields as touched
    const allTouched = Object.keys(schema).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {} as Record<string, boolean>);
    setTouched(allTouched);
    
    return result.isValid;
  };

  const clearErrors = () => {
    setErrors({});
    setTouched({});
  };

  const resetForm = () => {
    setData(initialData);
    setErrors({});
    setTouched({});
  };

  return {
    data,
    errors,
    touched,
    handleFieldChange,
    handleFieldBlur,
    validateAll,
    clearErrors,
    resetForm,
    isValid: Object.keys(errors).length === 0 && Object.keys(touched).length > 0
  };
};

/**
 * Common validation schemas for different forms
 */
export const validationSchemas = {
  // Login form validation
  login: {
    emailOrPhone: {
      required: true,
      custom: (value: string) => {
        if (!value) return null;
        // Try email validation first
        const emailError = validateEmail(value);
        if (!emailError) return null;
        
        // Try phone validation
        const phoneError = validatePhone(value);
        if (!phoneError) return null;
        
        return 'Please enter a valid email address or phone number';
      }
    },
    password: {
      required: true,
      minLength: 1 // For login, we just need non-empty
    }
  },

  // Registration form validation
  register: {
    name: {
      required: true,
      minLength: 2,
      maxLength: 100,
      pattern: /^[a-zA-Z\s\-'\.]+$/
    },
    email: {
      required: true,
      type: 'email' as const
    },
    password: {
      required: true,
      type: 'password' as const
    },
    confirmPassword: {
      required: true,
      custom: (value: string, data: any) => {
        return validatePasswordConfirmation(data?.password || '', value);
      }
    },
    agreeToTerms: {
      required: true,
      custom: (value: boolean) => {
        return value ? null : 'You must agree to the terms and conditions';
      }
    }
  },

  // Agent creation form validation
  agent: {
    name: {
      required: true,
      custom: validateAgentName
    },
    prompt: {
      required: true,
      minLength: 10,
      maxLength: 2000
    },
    language: {
      required: true,
      minLength: 1
    },
    voice: {
      required: true,
      minLength: 1
    },
    model: {
      required: true,
      minLength: 1
    },
    description: {
      maxLength: 500
    },
    userId: {
      // Optional field for user assignment
    }
  },

  // Contact form validation
  contact: {
    name: {
      required: true,
      custom: validateContactName
    },
    phoneNumber: {
      required: true,
      type: 'phone' as const
    },
    email: {
      type: 'email' as const
    },
    company: {
      maxLength: 100
    },
    notes: {
      maxLength: 1000
    }
  },

  // Settings form validation
  settings: {
    name: {
      required: true,
      minLength: 2,
      maxLength: 100
    },
    email: {
      required: true,
      type: 'email' as const
    },
    company: {
      maxLength: 100
    },
    website: {
      type: 'url' as const
    },
    phone: {
      type: 'phone' as const
    },
    location: {
      maxLength: 100
    },
    bio: {
      maxLength: 500
    },
    oldPassword: {
      // Only required if changing password - handled in component
      custom: (value: string) => {
        return null; // Component will handle this validation
      }
    },
    newPassword: {
      custom: (value: string) => {
        if (value) {
          return validatePassword(value);
        }
        return null;
      }
    },
    confPassword: {
      custom: (value: string) => {
        return null; // Component will handle password confirmation
      }
    }
  },

  // Credit purchase validation
  creditPurchase: {
    customAmount: {
      custom: (value: string) => {
        if (!value) return null;
        return validateCreditAmount(value);
      }
    }
  },

  // Team invite validation
  teamInvite: {
    emails: {
      required: true,
      custom: (value: string) => {
        if (!value?.trim()) return 'Email addresses are required';
        
        const emails = value.split(',').map(email => email.trim()).filter(Boolean);
        
        if (emails.length === 0) {
          return 'Please enter at least one email address';
        }
        
        for (const email of emails) {
          const emailError = validateEmail(email);
          if (emailError) {
            return `Invalid email: ${email}`;
          }
        }
        
        return null;
      }
    }
  }
};