/**
 * Example component demonstrating server-side validation error handling
 * This shows how to properly handle and display backend validation errors in forms
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ValidatedInput, ValidatedTextarea } from '@/components/ui/ValidatedInput';
import { ValidatedSelect } from '@/components/ui/ValidatedSelect';
import { SelectItem } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  handleServerValidationErrors, 
  createFormValidationHandler,
  mergeValidationErrors,
  getFieldError,
  FORM_FIELD_MAPPINGS,
  type ServerValidationError
} from '@/utils/serverValidationHandler';
import { validateForm, validationSchemas } from '@/utils/formValidation';

interface ExampleFormData {
  name: string;
  email: string;
  phoneNumber: string;
  type: string;
  description: string;
}

export const ServerValidationExample: React.FC = () => {
  const [formData, setFormData] = useState<ExampleFormData>({
    name: '',
    email: '',
    phoneNumber: '',
    type: '',
    description: '',
  });

  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Merge client and server errors (server errors take precedence)
  const errors = mergeValidationErrors(clientErrors, serverErrors);

  // Create server validation handler for this form
  const handleServerValidation = createFormValidationHandler(
    setServerErrors,
    FORM_FIELD_MAPPINGS.contact, // Using contact mappings as an example
    {
      showToast: true,
      toastTitle: 'Validation Failed',
    }
  );

  const handleInputChange = (field: keyof ExampleFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear both client and server errors when user starts typing
    if (clientErrors[field]) {
      setClientErrors(prev => ({ ...prev, [field]: '' }));
    }
    if (serverErrors[field]) {
      setServerErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleFieldBlur = (field: keyof ExampleFormData) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
    
    // Validate individual field using contact schema as example
    const schema = validationSchemas.contact;
    const fieldRules = schema[field as keyof typeof schema];
    
    if (fieldRules) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { validateField } = require('@/utils/formValidation');
      const result = validateField(formData[field], fieldRules, field);
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

  const validateFormData = (): boolean => {
    const result = validateForm(formData, validationSchemas.contact);
    setClientErrors(result.errors);
    
    // Clear server errors when doing client validation
    setServerErrors({});
    
    // Mark all fields as touched
    setTouchedFields({
      name: true,
      email: true,
      phoneNumber: true,
      type: true,
      description: true,
    });
    
    return result.isValid;
  };

  // Simulate different types of server validation errors
  const simulateServerError = (errorType: string) => {
    setIsSubmitting(true);
    
    setTimeout(() => {
      let mockError: ServerValidationError;
      
      switch (errorType) {
        case 'validation':
          mockError = {
            code: 'VALIDATION_ERROR',
            status: 400,
            message: 'Validation failed',
            details: {
              name: 'Name must be at least 2 characters long',
              email: 'Please enter a valid email address',
              phone_number: 'Phone number format is invalid',
            },
          };
          break;
          
        case 'single-field':
          mockError = {
            code: 'VALIDATION_ERROR',
            status: 422,
            message: 'Validation failed',
            details: {
              email: 'This email address is already registered',
            },
          };
          break;
          
        case 'array-errors':
          mockError = {
            code: 'VALIDATION_ERROR',
            status: 400,
            message: 'Multiple validation errors',
            details: {
              name: ['Name is required', 'Name must be at least 2 characters'],
              phoneNumber: ['Phone number is required', 'Invalid phone format'],
            },
          };
          break;
          
        case 'custom-mapping':
          mockError = {
            code: 'VALIDATION_ERROR',
            status: 400,
            message: 'Validation failed',
            details: {
              agent_name: 'Agent name is already taken',
              voice_id: 'Selected voice is not available',
            },
          };
          break;
          
        default:
          mockError = {
            code: 'VALIDATION_ERROR',
            status: 400,
            message: 'Unknown validation error',
            details: {},
          };
      }
      
      // Handle the mock error
      const wasHandled = handleServerValidation(mockError);
      
      if (!wasHandled) {
        toast.error('Unexpected error occurred');
      }
      
      setIsSubmitting(false);
    }, 1000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setClientErrors({});
    setServerErrors({});
    
    // Validate form
    if (!validateFormData()) {
      return;
    }
    
    // Simulate successful submission
    setIsSubmitting(true);
    setTimeout(() => {
      toast.success('Form submitted successfully!');
      setIsSubmitting(false);
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        phoneNumber: '',
        type: '',
        description: '',
      });
      setClientErrors({});
      setServerErrors({});
      setTouchedFields({});
    }, 1000);
  };

  const clearAllErrors = () => {
    setClientErrors({});
    setServerErrors({});
    setTouchedFields({});
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Server Validation Error Handling Example</CardTitle>
          <CardDescription>
            This example demonstrates how to properly handle server-side validation errors in forms.
            Try the different error simulation buttons to see how errors are displayed and managed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Error Status Display */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Client Errors</h4>
              <div className="min-h-[60px] p-3 bg-red-50 border border-red-200 rounded-md">
                {Object.keys(clientErrors).length > 0 ? (
                  <div className="space-y-1">
                    {Object.entries(clientErrors).map(([field, error]) => (
                      error && (
                        <div key={field} className="text-sm">
                          <Badge variant="destructive" className="mr-2">{field}</Badge>
                          {error}
                        </div>
                      )
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No client errors</p>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Server Errors</h4>
              <div className="min-h-[60px] p-3 bg-orange-50 border border-orange-200 rounded-md">
                {Object.keys(serverErrors).length > 0 ? (
                  <div className="space-y-1">
                    {Object.entries(serverErrors).map(([field, error]) => (
                      error && (
                        <div key={field} className="text-sm">
                          <Badge variant="secondary" className="mr-2">{field}</Badge>
                          {error}
                        </div>
                      )
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No server errors</p>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Merged Errors</h4>
              <div className="min-h-[60px] p-3 bg-blue-50 border border-blue-200 rounded-md">
                {Object.keys(errors).length > 0 ? (
                  <div className="space-y-1">
                    {Object.entries(errors).map(([field, error]) => (
                      error && (
                        <div key={field} className="text-sm">
                          <Badge variant="outline" className="mr-2">{field}</Badge>
                          {error}
                        </div>
                      )
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No errors</p>
                )}
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ValidatedInput
                label="Name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                onBlur={() => handleFieldBlur('name')}
                placeholder="Enter your name"
                error={getFieldError('name', clientErrors, serverErrors)}
                touched={touchedFields.name}
                required
                disabled={isSubmitting}
              />

              <ValidatedInput
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                onBlur={() => handleFieldBlur('email')}
                placeholder="Enter your email"
                error={getFieldError('email', clientErrors, serverErrors)}
                touched={touchedFields.email}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ValidatedInput
                label="Phone Number"
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                onBlur={() => handleFieldBlur('phoneNumber')}
                placeholder="Enter your phone number"
                error={getFieldError('phoneNumber', clientErrors, serverErrors)}
                touched={touchedFields.phoneNumber}
                required
                disabled={isSubmitting}
              />

              <ValidatedSelect
                label="Type"
                value={formData.type}
                onValueChange={(value) => handleInputChange('type', value)}
                onBlur={() => handleFieldBlur('type')}
                error={getFieldError('type', clientErrors, serverErrors)}
                touched={touchedFields.type}
                required
                disabled={isSubmitting}
              >
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </ValidatedSelect>
            </div>

            <ValidatedTextarea
              label="Description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              onBlur={() => handleFieldBlur('description')}
              placeholder="Enter a description"
              error={getFieldError('description', clientErrors, serverErrors)}
              touched={touchedFields.description}
              rows={3}
              disabled={isSubmitting}
            />

            <div className="flex flex-wrap gap-2 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Form'}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={clearAllErrors}
                disabled={isSubmitting}
              >
                Clear Errors
              </Button>
            </div>
          </form>

          {/* Error Simulation Buttons */}
          <div className="border-t pt-6">
            <h4 className="font-medium mb-4">Simulate Server Validation Errors</h4>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => simulateServerError('validation')}
                disabled={isSubmitting}
              >
                Multiple Field Errors
              </Button>
              
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => simulateServerError('single-field')}
                disabled={isSubmitting}
              >
                Single Field Error
              </Button>
              
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => simulateServerError('array-errors')}
                disabled={isSubmitting}
              >
                Array Error Messages
              </Button>
              
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => simulateServerError('custom-mapping')}
                disabled={isSubmitting}
              >
                Custom Field Mapping
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ServerValidationExample;