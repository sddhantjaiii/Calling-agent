import React, { useState, useCallback } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
  message?: string;
}

export interface ValidationRules {
  [fieldName: string]: ValidationRule;
}

export interface ValidationError {
  field: string;
  message: string;
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
}

export interface FormState {
  values: Record<string, any>;
  errors: ValidationError[];
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  submitAttempted: boolean;
}

interface UseAdminFormValidationReturn {
  formState: FormState;
  setValue: (field: string, value: any) => void;
  setTouched: (field: string, touched?: boolean) => void;
  validate: (field?: string) => boolean;
  validateAll: () => boolean;
  clearErrors: (field?: string) => void;
  reset: () => void;
  handleSubmit: (onSubmit: (values: Record<string, any>) => Promise<void>) => Promise<void>;
}

export function useAdminFormValidation(
  initialValues: Record<string, any> = {},
  validationRules: ValidationRules = {}
): UseAdminFormValidationReturn {
  const [formState, setFormState] = useState<FormState>({
    values: initialValues,
    errors: [],
    touched: {},
    isSubmitting: false,
    submitAttempted: false
  });

  const validateField = useCallback((field: string, value: any): ValidationError | null => {
    const rule = validationRules[field];
    if (!rule) return null;

    // Required validation
    if (rule.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return {
        field,
        message: rule.message || `${field} is required`,
        type: 'required'
      };
    }

    // Skip other validations if value is empty and not required
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return null;
    }

    // Min length validation
    if (rule.minLength && typeof value === 'string' && value.length < rule.minLength) {
      return {
        field,
        message: rule.message || `${field} must be at least ${rule.minLength} characters`,
        type: 'minLength'
      };
    }

    // Max length validation
    if (rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
      return {
        field,
        message: rule.message || `${field} must be no more than ${rule.maxLength} characters`,
        type: 'maxLength'
      };
    }

    // Pattern validation
    if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
      return {
        field,
        message: rule.message || `${field} format is invalid`,
        type: 'pattern'
      };
    }

    // Custom validation
    if (rule.custom) {
      const customError = rule.custom(value);
      if (customError) {
        return {
          field,
          message: customError,
          type: 'custom'
        };
      }
    }

    return null;
  }, [validationRules]);

  const setValue = useCallback((field: string, value: any) => {
    setFormState(prev => ({
      ...prev,
      values: {
        ...prev.values,
        [field]: value
      }
    }));
  }, []);

  const setTouched = useCallback((field: string, touched = true) => {
    setFormState(prev => ({
      ...prev,
      touched: {
        ...prev.touched,
        [field]: touched
      }
    }));
  }, []);

  const validate = useCallback((field?: string): boolean => {
    if (field) {
      // Validate single field
      const error = validateField(field, formState.values[field]);
      
      setFormState(prev => ({
        ...prev,
        errors: [
          ...prev.errors.filter(e => e.field !== field),
          ...(error ? [error] : [])
        ]
      }));
      
      return !error;
    } else {
      // Validate all fields
      return validateAll();
    }
  }, [formState.values, validateField]);

  const validateAll = useCallback(): boolean => {
    const errors: ValidationError[] = [];
    
    Object.keys(validationRules).forEach(field => {
      const error = validateField(field, formState.values[field]);
      if (error) {
        errors.push(error);
      }
    });
    
    setFormState(prev => ({
      ...prev,
      errors
    }));
    
    return errors.length === 0;
  }, [formState.values, validationRules, validateField]);

  const clearErrors = useCallback((field?: string) => {
    setFormState(prev => ({
      ...prev,
      errors: field 
        ? prev.errors.filter(e => e.field !== field)
        : []
    }));
  }, []);

  const reset = useCallback(() => {
    setFormState({
      values: initialValues,
      errors: [],
      touched: {},
      isSubmitting: false,
      submitAttempted: false
    });
  }, [initialValues]);

  const handleSubmit = useCallback(async (onSubmit: (values: Record<string, any>) => Promise<void>) => {
    setFormState(prev => ({
      ...prev,
      submitAttempted: true,
      isSubmitting: true
    }));

    try {
      const isValid = validateAll();
      
      if (!isValid) {
        throw new Error('Please fix the validation errors before submitting');
      }

      await onSubmit(formState.values);
      
      // Reset form on successful submit
      reset();
    } catch (error) {
      // Keep form state on error
      console.error('Form submission error:', error);
      throw error;
    } finally {
      setFormState(prev => ({
        ...prev,
        isSubmitting: false
      }));
    }
  }, [formState.values, validateAll, reset]);

  return {
    formState,
    setValue,
    setTouched,
    validate,
    validateAll,
    clearErrors,
    reset,
    handleSubmit
  };
}

// Form field components with built-in validation
interface AdminFormFieldProps {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'textarea';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  formState: FormState;
  setValue: (field: string, value: any) => void;
  setTouched: (field: string, touched?: boolean) => void;
  validate: (field: string) => boolean;
  className?: string;
}

export function AdminFormField({
  name,
  label,
  type = 'text',
  placeholder,
  required = false,
  disabled = false,
  formState,
  setValue,
  setTouched,
  validate,
  className = ''
}: AdminFormFieldProps) {
  const value = formState.values[name] || '';
  const error = formState.errors.find(e => e.field === name);
  const isTouched = formState.touched[name];
  const showError = error && (isTouched || formState.submitAttempted);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setValue(name, e.target.value);
    if (isTouched) {
      // Re-validate on change if field was already touched
      setTimeout(() => validate(name), 0);
    }
  };

  const handleBlur = () => {
    setTouched(name, true);
    validate(name);
  };

  const inputProps = {
    id: name,
    name,
    value,
    placeholder,
    disabled,
    onChange: handleChange,
    onBlur: handleBlur,
    className: `${showError ? 'border-red-500 focus:border-red-500' : ''} ${className}`
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={name} className={required ? 'after:content-["*"] after:text-red-500 after:ml-1' : ''}>
        {label}
      </Label>
      
      {type === 'textarea' ? (
        <Textarea {...inputProps} />
      ) : (
        <Input {...inputProps} type={type} />
      )}
      
      {showError && (
        <div className="flex items-center space-x-2 text-red-600 text-sm">
          <XCircle className="w-4 h-4" />
          <span>{error.message}</span>
        </div>
      )}
    </div>
  );
}

// Form validation summary component
interface AdminFormValidationSummaryProps {
  formState: FormState;
  onRetry?: () => void;
  className?: string;
}

export function AdminFormValidationSummary({
  formState,
  onRetry,
  className = ''
}: AdminFormValidationSummaryProps) {
  const { errors, submitAttempted } = formState;
  
  if (!submitAttempted || errors.length === 0) {
    return null;
  }

  return (
    <Alert className={`border-red-200 bg-red-50 ${className}`}>
      <AlertTriangle className="h-4 w-4 text-red-600" />
      <AlertDescription>
        <div className="space-y-2">
          <div className="font-medium text-red-800">
            Please fix the following errors:
          </div>
          <ul className="text-sm text-red-700 space-y-1">
            {errors.map((error, index) => (
              <li key={index} className="flex items-start">
                <span className="text-red-400 mr-2">•</span>
                <span>{error.message}</span>
              </li>
            ))}
          </ul>
          {onRetry && (
            <Button onClick={onRetry} size="sm" variant="outline" className="mt-2">
              Try Again
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}

// Success message component
interface AdminFormSuccessProps {
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export function AdminFormSuccess({
  message,
  onDismiss,
  className = ''
}: AdminFormSuccessProps) {
  return (
    <Alert className={`border-green-200 bg-green-50 ${className}`}>
      <CheckCircle className="h-4 w-4 text-green-600" />
      <AlertDescription className="flex items-center justify-between">
        <span className="text-green-800">{message}</span>
        {onDismiss && (
          <Button onClick={onDismiss} size="sm" variant="ghost">
            Dismiss
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

// Info message component
interface AdminFormInfoProps {
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export function AdminFormInfo({
  message,
  onDismiss,
  className = ''
}: AdminFormInfoProps) {
  return (
    <Alert className={`border-blue-200 bg-blue-50 ${className}`}>
      <Info className="h-4 w-4 text-blue-600" />
      <AlertDescription className="flex items-center justify-between">
        <span className="text-blue-800">{message}</span>
        {onDismiss && (
          <Button onClick={onDismiss} size="sm" variant="ghost">
            Dismiss
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

export default {
  useAdminFormValidation,
  AdminFormField,
  AdminFormValidationSummary,
  AdminFormSuccess,
  AdminFormInfo
};