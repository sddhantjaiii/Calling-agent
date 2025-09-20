# Server-Side Validation Error Handling Implementation

## Overview

This implementation provides comprehensive server-side validation error handling for forms throughout the application. It maps backend validation errors to form fields and provides clear, user-friendly error messages.

## Key Features

### 1. Server Validation Error Detection
- Automatically detects server validation errors (status 400, 422, or code 'VALIDATION_ERROR')
- Validates error structure to ensure it contains validation details
- Handles both single field and multiple field validation errors

### 2. Field Mapping System
- Maps server field names to frontend form field names
- Supports common field name variations (e.g., `phone_number` → `phoneNumber`)
- Provides predefined mappings for different form types (contact, agent, auth, billing, settings)
- Allows custom field mappings for specific forms

### 3. Error Message Processing
- Handles both string and array error messages from server
- Capitalizes error messages for consistency
- Preserves original error message content for clarity
- Takes first error message when multiple errors exist for a field

### 4. Form Integration
- Separates client-side and server-side validation errors
- Server errors take precedence over client errors for the same field
- Automatically clears server errors when user starts typing
- Provides utility functions for merging and accessing errors

### 5. User Feedback
- Shows toast notifications for validation errors
- Provides contextual error descriptions
- Handles single vs. multiple field error scenarios
- Customizable toast titles and options

## Implementation Files

### Core Handler
- `Frontend/src/utils/serverValidationHandler.ts` - Main implementation
- `Frontend/src/utils/__tests__/serverValidationHandler.test.ts` - Comprehensive tests

### Updated Components
- `Frontend/src/components/contacts/ContactForm.tsx` - Contact form integration
- `Frontend/src/components/agents/CreateAgentModal.tsx` - Agent form integration  
- `Frontend/src/components/auth/LoginForm.tsx` - Login form integration

### Example Component
- `Frontend/src/components/examples/ServerValidationExample.tsx` - Demonstration component

## Usage Examples

### Basic Usage

```typescript
import { 
  handleServerValidationErrors, 
  FORM_FIELD_MAPPINGS 
} from '@/utils/serverValidationHandler';

// In your form component
const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

// In your error handling
try {
  await submitForm(formData);
} catch (error) {
  const wasValidationError = handleServerValidationErrors(
    error,
    setServerErrors,
    FORM_FIELD_MAPPINGS.contact,
    {
      showToast: true,
      toastTitle: 'Validation Failed',
    }
  );
  
  if (!wasValidationError) {
    // Handle other error types
  }
}
```

### Using Form Validation Handler

```typescript
import { createFormValidationHandler } from '@/utils/serverValidationHandler';

// Create a reusable handler
const handleServerValidation = createFormValidationHandler(
  setServerErrors,
  FORM_FIELD_MAPPINGS.contact,
  {
    showToast: true,
    toastTitle: 'Creation Failed',
  }
);

// Use in error handling
try {
  await createContact(formData);
} catch (error) {
  const wasHandled = handleServerValidation(error);
  if (!wasHandled) {
    // Handle non-validation errors
  }
}
```

### Merging Client and Server Errors

```typescript
import { mergeValidationErrors, getFieldError } from '@/utils/serverValidationHandler';

const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

// Merge errors (server takes precedence)
const errors = mergeValidationErrors(clientErrors, serverErrors);

// Get specific field error
const nameError = getFieldError('name', clientErrors, serverErrors);
```

## Field Mapping Configurations

### Contact Form
```typescript
{
  'phoneNumber': 'phoneNumber',
  'phone_number': 'phoneNumber',
  'phone': 'phoneNumber',
  'email': 'email',
  'name': 'name',
  'company': 'company',
  'notes': 'notes',
}
```

### Agent Form
```typescript
{
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
}
```

### Auth Form
```typescript
{
  'email': 'email',
  'password': 'password',
  'confirmPassword': 'confirmPassword',
  'confirm_password': 'confirmPassword',
  'name': 'name',
  'firstName': 'firstName',
  'first_name': 'firstName',
  'lastName': 'lastName',
  'last_name': 'lastName',
}
```

## Error Handling Flow

1. **Error Detection**: Check if error is a server validation error
2. **Field Mapping**: Map server field names to form field names
3. **Message Processing**: Clean and format error messages
4. **State Update**: Set field errors in component state
5. **User Feedback**: Show toast notification with appropriate message
6. **User Interaction**: Clear errors when user starts typing

## Integration Pattern

### Form Component Structure
```typescript
const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

// Merge errors (server takes precedence)
const errors = mergeValidationErrors(clientErrors, serverErrors);

// Create server validation handler
const handleServerValidation = createFormValidationHandler(
  setServerErrors,
  FORM_FIELD_MAPPINGS.formType,
  { showToast: true, toastTitle: 'Validation Failed' }
);

// Clear errors on input change
const handleInputChange = (field: string, value: string) => {
  setFormData(prev => ({ ...prev, [field]: value }));
  
  if (clientErrors[field]) {
    setClientErrors(prev => ({ ...prev, [field]: '' }));
  }
  if (serverErrors[field]) {
    setServerErrors(prev => ({ ...prev, [field]: '' }));
  }
};

// Handle form submission errors
const handleSubmit = async (e: React.FormEvent) => {
  try {
    await submitForm(formData);
  } catch (error) {
    const wasValidationError = handleServerValidation(error);
    if (!wasValidationError) {
      // Handle other error types
    }
  }
};
```

## Benefits

1. **Consistent Error Handling**: Standardized approach across all forms
2. **Better User Experience**: Clear, actionable error messages
3. **Reduced Code Duplication**: Reusable validation handlers
4. **Type Safety**: Full TypeScript support with proper typing
5. **Flexible Configuration**: Customizable field mappings and options
6. **Comprehensive Testing**: Full test coverage for all scenarios
7. **Real-time Feedback**: Errors clear as user fixes them

## Requirements Satisfied

This implementation satisfies the following requirements from task 12.2:

✅ **Display backend validation errors in forms**
- Server validation errors are properly displayed in form fields
- Errors are mapped to the correct form fields using field mappings

✅ **Map server validation errors to form fields**
- Comprehensive field mapping system with predefined mappings
- Support for custom mappings per form type
- Handles common field name variations (snake_case to camelCase)

✅ **Provide clear error messages for validation failures**
- Error messages are cleaned and formatted for better readability
- Toast notifications provide contextual feedback
- Different messages for single vs. multiple field errors
- User action suggestions included in error descriptions

The implementation provides a robust, scalable solution for handling server-side validation errors that enhances the user experience and maintains code consistency across the application.