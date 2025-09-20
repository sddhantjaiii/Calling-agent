import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ValidatedInput, ValidatedTextarea } from '@/components/ui/ValidatedInput';
import { ValidatedSelect } from '@/components/ui/ValidatedSelect';
import { SelectItem } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { validateForm, validateField, validationSchemas } from '@/utils/formValidation';
import { 
  createFormValidationHandler,
  mergeValidationErrors,
  FORM_FIELD_MAPPINGS 
} from '@/utils/serverValidationHandler';

/**
 * Comprehensive validation example demonstrating both client-side and server-side validation
 * This component shows how to:
 * 1. Implement real-time client-side validation
 * 2. Handle server-side validation errors
 * 3. Provide clear user feedback
 * 4. Merge client and server errors appropriately
 */
export const ComprehensiveValidationExample: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    notes: '',
    type: '',
  });

  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Merge client and server errors (server errors take precedence)
  const validationErrors = mergeValidationErrors(clientErrors, serverErrors);

  // Create server validation handler for this form
  const handleServerValidation = createFormValidationHandler(
    setServerErrors,
    FORM_FIELD_MAPPINGS.contact,
    {
      showToast: true,
      toastTitle: 'Validation Failed',
    }
  );

  const validateFormData = (): boolean => {
    const result = validateForm(formData, validationSchemas.contact);
    setClientErrors(result.errors);
    
    // Clear server errors when doing client validation
    setServerErrors({});
    
    // Mark all fields as touched
    setTouchedFields({
      name: true,
      email: true,
      phone: true,
      company: true,
      notes: true,
      type: true,
    });
    
    return result.isValid;
  };

  const handleFieldBlur = (field: string) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
    
    // Validate individual field
    const schema = validationSchemas.contact;
    const fieldRules = schema[field as keyof typeof schema];
    
    if (fieldRules) {
      const result = validateField(formData[field as keyof typeof formData], fieldRules, field);
      if (!result.isValid && result.error) {
        setClientErrors(prev => ({ ...prev, [field]: result.error! }));
      } else {
        setClientErrors(prev => ({ ...prev, [field]: '' }));
      }
      
      // Clear server error for this field when user is actively fixing it
      if (serverErrors[field]) {
        setServerErrors(prev => ({ ...prev, [field]: '' }));
      }
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear both client and server errors when user starts typing
    if (clientErrors[field]) {
      setClientErrors(prev => ({ ...prev, [field]: '' }));
    }
    if (serverErrors[field]) {
      setServerErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const simulateServerError = (type: 'validation' | 'conflict' | 'network' | 'unauthorized') => {
    switch (type) {
      case 'validation':
        return {
          code: 'VALIDATION_ERROR',
          status: 400,
          message: 'Validation failed',
          details: {
            email: 'This email address is already registered',
            phone: 'Phone number format is invalid for your region',
          }
        };
      case 'conflict':
        return {
          code: 'CONFLICT',
          status: 409,
          message: 'Resource already exists',
        };
      case 'network':
        return {
          code: 'NETWORK_ERROR',
          status: 0,
          message: 'Network connection failed',
        };
      case 'unauthorized':
        return {
          code: 'UNAUTHORIZED',
          status: 401,
          message: 'Authentication required',
        };
      default:
        return new Error('Unknown error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setClientErrors({});
    setServerErrors({});
    
    // Validate form
    if (!validateFormData()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate different types of server responses for demonstration
      // Use crypto.getRandomValues() for better randomness in examples
      let errorType: number;
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const randomArray = new Uint8Array(1);
        crypto.getRandomValues(randomArray);
        errorType = randomArray[0] / 255;
      } else {
        // Fallback for environments without crypto
        errorType = Math.random();
      }
      
      if (errorType < 0.3) {
        // 30% chance of validation error
        throw simulateServerError('validation');
      } else if (errorType < 0.4) {
        // 10% chance of conflict error
        throw simulateServerError('conflict');
      } else if (errorType < 0.5) {
        // 10% chance of network error
        throw simulateServerError('network');
      } else if (errorType < 0.6) {
        // 10% chance of unauthorized error
        throw simulateServerError('unauthorized');
      }
      
      // 40% chance of success
      toast.success('Form submitted successfully!', {
        description: 'All validation passed and data was saved.',
      });
      
      // Reset form on success
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        notes: '',
        type: '',
      });
      setTouchedFields({});
      
    } catch (error) {
      console.error('Form submission error:', error);
      
      // Try to handle as server validation error first
      const wasValidationError = handleServerValidation(error);
      
      if (!wasValidationError) {
        // Handle other specific error types
        const errorObj = error as any;
        
        if (errorObj?.code === 'CONFLICT') {
          setServerErrors({ email: 'A contact with this email already exists' });
          toast.error('Duplicate Contact', {
            description: 'A contact with this email already exists.',
          });
        } else if (errorObj?.code === 'UNAUTHORIZED') {
          toast.error('Session Expired', {
            description: 'Please log in again to continue.',
          });
        } else if (errorObj?.code === 'NETWORK_ERROR') {
          toast.error('Network Error', {
            description: 'Please check your internet connection and try again.',
          });
        } else {
          // Generic error handling
          toast.error('Error', {
            description: errorObj?.message || 'An unexpected error occurred. Please try again.',
          });
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerSpecificError = (errorType: 'validation' | 'conflict' | 'network' | 'unauthorized') => {
    const error = simulateServerError(errorType);
    
    if (errorType === 'validation') {
      handleServerValidation(error);
    } else {
      // Simulate the error handling from the submit function
      const errorObj = error as any;
      
      if (errorObj?.code === 'CONFLICT') {
        setServerErrors({ email: 'A contact with this email already exists' });
        toast.error('Duplicate Contact', {
          description: 'A contact with this email already exists.',
        });
      } else if (errorObj?.code === 'UNAUTHORIZED') {
        toast.error('Session Expired', {
          description: 'Please log in again to continue.',
        });
      } else if (errorObj?.code === 'NETWORK_ERROR') {
        toast.error('Network Error', {
          description: 'Please check your internet connection and try again.',
        });
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Comprehensive Validation Example</CardTitle>
          <p className="text-sm text-gray-600">
            This form demonstrates both client-side and server-side validation working together.
            Try submitting the form to see different types of validation errors.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <ValidatedInput
              label="Name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              onBlur={() => handleFieldBlur('name')}
              placeholder="Enter your name"
              required
              error={validationErrors.name}
              touched={touchedFields.name}
              disabled={isSubmitting}
              maxLength={100}
              showCharCount
              description="Your full name (required)"
            />

            <ValidatedInput
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              onBlur={() => handleFieldBlur('email')}
              placeholder="Enter your email"
              required
              error={validationErrors.email}
              touched={touchedFields.email}
              disabled={isSubmitting}
              description="We'll use this to contact you"
            />

            <ValidatedInput
              label="Phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              onBlur={() => handleFieldBlur('phone')}
              placeholder="Enter your phone number"
              required
              error={validationErrors.phone}
              touched={touchedFields.phone}
              disabled={isSubmitting}
              description="Include country code for international numbers"
            />

            <ValidatedInput
              label="Company"
              value={formData.company}
              onChange={(e) => handleInputChange('company', e.target.value)}
              onBlur={() => handleFieldBlur('company')}
              placeholder="Enter your company (optional)"
              error={validationErrors.company}
              touched={touchedFields.company}
              disabled={isSubmitting}
              maxLength={100}
              showCharCount
              description="Your company or organization"
            />

            <ValidatedSelect
              label="Contact Type"
              value={formData.type}
              onValueChange={(value) => handleInputChange('type', value)}
              onBlur={() => handleFieldBlur('type')}
              placeholder="Select contact type"
              error={validationErrors.type}
              touched={touchedFields.type}
              disabled={isSubmitting}
              description="Choose the type of contact"
            >
              <SelectItem value="lead">Lead</SelectItem>
              <SelectItem value="customer">Customer</SelectItem>
              <SelectItem value="partner">Partner</SelectItem>
              <SelectItem value="vendor">Vendor</SelectItem>
            </ValidatedSelect>

            <ValidatedTextarea
              label="Notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              onBlur={() => handleFieldBlur('notes')}
              placeholder="Add any notes about this contact (optional)"
              rows={3}
              error={validationErrors.notes}
              touched={touchedFields.notes}
              disabled={isSubmitting}
              maxLength={1000}
              showCharCount
              description="Additional information about this contact"
            />

            <div className="flex gap-2 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting...
                  </div>
                ) : (
                  'Submit Form'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Different Error Types</CardTitle>
          <p className="text-sm text-gray-600">
            Click these buttons to simulate different types of server errors and see how they're handled.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => triggerSpecificError('validation')}
              disabled={isSubmitting}
              className="text-sm"
            >
              Validation Error
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => triggerSpecificError('conflict')}
              disabled={isSubmitting}
              className="text-sm"
            >
              Conflict Error
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => triggerSpecificError('network')}
              disabled={isSubmitting}
              className="text-sm"
            >
              Network Error
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => triggerSpecificError('unauthorized')}
              disabled={isSubmitting}
              className="text-sm"
            >
              Auth Error
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Validation Features Demonstrated</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Real-time client-side validation on blur</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Server-side validation error mapping</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>Error clearing when user starts typing</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span>Character count and length validation</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span>Required field validation</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
              <span>Email and phone format validation</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
              <span>Toast notifications for different error types</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ComprehensiveValidationExample;