import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { 
  useAdminFormValidation, 
  AdminFormField, 
  AdminFormValidationSummary,
  AdminFormSuccess,
  AdminFormInfo,
  type ValidationRules 
} from '../AdminFormValidation';

describe('useAdminFormValidation', () => {
  const validationRules: ValidationRules = {
    email: {
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Please enter a valid email address'
    },
    password: {
      required: true,
      minLength: 8,
      message: 'Password must be at least 8 characters'
    },
    name: {
      required: true,
      maxLength: 50
    },
    age: {
      custom: (value) => {
        const num = parseInt(value);
        if (isNaN(num) || num < 18) {
          return 'Age must be 18 or older';
        }
        return null;
      }
    }
  };

  it('initializes with default values', () => {
    const initialValues = { email: 'test@example.com', name: 'John' };
    const { result } = renderHook(() => 
      useAdminFormValidation(initialValues, validationRules)
    );

    expect(result.current.formState.values).toEqual(initialValues);
    expect(result.current.formState.errors).toEqual([]);
    expect(result.current.formState.touched).toEqual({});
    expect(result.current.formState.isSubmitting).toBe(false);
  });

  it('sets and gets field values', () => {
    const { result } = renderHook(() => 
      useAdminFormValidation({}, validationRules)
    );

    act(() => {
      result.current.setValue('email', 'test@example.com');
    });

    expect(result.current.formState.values.email).toBe('test@example.com');
  });

  it('validates required fields', () => {
    const { result } = renderHook(() => 
      useAdminFormValidation({}, validationRules)
    );

    act(() => {
      const isValid = result.current.validate('email');
      expect(isValid).toBe(false);
    });

    expect(result.current.formState.errors).toHaveLength(1);
    expect(result.current.formState.errors[0].field).toBe('email');
    expect(result.current.formState.errors[0].type).toBe('required');
  });

  it('validates email pattern', () => {
    const { result } = renderHook(() => 
      useAdminFormValidation({}, validationRules)
    );

    act(() => {
      result.current.setValue('email', 'invalid-email');
      result.current.validate('email');
    });

    expect(result.current.formState.errors).toHaveLength(1);
    expect(result.current.formState.errors[0].type).toBe('pattern');
    expect(result.current.formState.errors[0].message).toBe('Please enter a valid email address');
  });

  it('validates minimum length', () => {
    const { result } = renderHook(() => 
      useAdminFormValidation({}, validationRules)
    );

    act(() => {
      result.current.setValue('password', '123');
      result.current.validate('password');
    });

    expect(result.current.formState.errors).toHaveLength(1);
    expect(result.current.formState.errors[0].type).toBe('minLength');
  });

  it('validates maximum length', () => {
    const { result } = renderHook(() => 
      useAdminFormValidation({}, validationRules)
    );

    act(() => {
      result.current.setValue('name', 'a'.repeat(51));
      result.current.validate('name');
    });

    expect(result.current.formState.errors).toHaveLength(1);
    expect(result.current.formState.errors[0].type).toBe('maxLength');
  });

  it('validates custom rules', () => {
    const { result } = renderHook(() => 
      useAdminFormValidation({}, validationRules)
    );

    act(() => {
      result.current.setValue('age', '16');
      result.current.validate('age');
    });

    expect(result.current.formState.errors).toHaveLength(1);
    expect(result.current.formState.errors[0].type).toBe('custom');
    expect(result.current.formState.errors[0].message).toBe('Age must be 18 or older');
  });

  it('validates all fields', () => {
    const { result } = renderHook(() => 
      useAdminFormValidation({}, validationRules)
    );

    act(() => {
      const isValid = result.current.validateAll();
      expect(isValid).toBe(false);
    });

    // Should have errors for all required fields
    expect(result.current.formState.errors.length).toBeGreaterThan(0);
  });

  it('clears errors for specific field', () => {
    const { result } = renderHook(() => 
      useAdminFormValidation({}, validationRules)
    );

    act(() => {
      result.current.validate('email'); // Creates error
      result.current.clearErrors('email');
    });

    expect(result.current.formState.errors.filter(e => e.field === 'email')).toHaveLength(0);
  });

  it('clears all errors', () => {
    const { result } = renderHook(() => 
      useAdminFormValidation({}, validationRules)
    );

    act(() => {
      result.current.validateAll(); // Creates errors
      result.current.clearErrors();
    });

    expect(result.current.formState.errors).toHaveLength(0);
  });

  it('resets form to initial state', () => {
    const initialValues = { email: 'initial@example.com' };
    const { result } = renderHook(() => 
      useAdminFormValidation(initialValues, validationRules)
    );

    act(() => {
      result.current.setValue('email', 'changed@example.com');
      result.current.validate('email');
      result.current.reset();
    });

    expect(result.current.formState.values).toEqual(initialValues);
    expect(result.current.formState.errors).toHaveLength(0);
    expect(result.current.formState.touched).toEqual({});
  });

  it('handles form submission with validation', async () => {
    const mockSubmit = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => 
      useAdminFormValidation({ email: 'test@example.com', password: 'password123', name: 'John' }, validationRules)
    );

    await act(async () => {
      await result.current.handleSubmit(mockSubmit);
    });

    expect(mockSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      name: 'John'
    });
  });

  it('prevents submission with validation errors', async () => {
    const mockSubmit = vi.fn();
    const { result } = renderHook(() => 
      useAdminFormValidation({}, validationRules)
    );

    await act(async () => {
      try {
        await result.current.handleSubmit(mockSubmit);
      } catch (error) {
        expect(error.message).toBe('Please fix the validation errors before submitting');
      }
    });

    expect(mockSubmit).not.toHaveBeenCalled();
    expect(result.current.formState.submitAttempted).toBe(true);
  });
});

describe('AdminFormField', () => {
  const mockFormState = {
    values: { email: 'test@example.com' },
    errors: [{ field: 'email', message: 'Invalid email', type: 'pattern' as const }],
    touched: { email: true },
    isSubmitting: false,
    submitAttempted: false
  };

  const mockSetValue = vi.fn();
  const mockSetTouched = vi.fn();
  const mockValidate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders input field with label', () => {
    render(
      <AdminFormField
        name="email"
        label="Email Address"
        formState={mockFormState}
        setValue={mockSetValue}
        setTouched={mockSetTouched}
        validate={mockValidate}
      />
    );

    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
  });

  it('shows required indicator for required fields', () => {
    render(
      <AdminFormField
        name="email"
        label="Email Address"
        required={true}
        formState={mockFormState}
        setValue={mockSetValue}
        setTouched={mockSetTouched}
        validate={mockValidate}
      />
    );

    const label = screen.getByText('Email Address');
    expect(label).toHaveClass('after:content-["*"]');
  });

  it('displays validation error when field is touched', () => {
    render(
      <AdminFormField
        name="email"
        label="Email Address"
        formState={mockFormState}
        setValue={mockSetValue}
        setTouched={mockSetTouched}
        validate={mockValidate}
      />
    );

    expect(screen.getByText('Invalid email')).toBeInTheDocument();
  });

  it('calls setValue on input change', () => {
    render(
      <AdminFormField
        name="email"
        label="Email Address"
        formState={mockFormState}
        setValue={mockSetValue}
        setTouched={mockSetTouched}
        validate={mockValidate}
      />
    );

    const input = screen.getByLabelText('Email Address');
    fireEvent.change(input, { target: { value: 'new@example.com' } });

    expect(mockSetValue).toHaveBeenCalledWith('email', 'new@example.com');
  });

  it('calls setTouched and validate on blur', () => {
    render(
      <AdminFormField
        name="email"
        label="Email Address"
        formState={mockFormState}
        setValue={mockSetValue}
        setTouched={mockSetTouched}
        validate={mockValidate}
      />
    );

    const input = screen.getByLabelText('Email Address');
    fireEvent.blur(input);

    expect(mockSetTouched).toHaveBeenCalledWith('email', true);
    expect(mockValidate).toHaveBeenCalledWith('email');
  });

  it('renders textarea for textarea type', () => {
    render(
      <AdminFormField
        name="description"
        label="Description"
        type="textarea"
        formState={{ ...mockFormState, values: { description: 'Test description' } }}
        setValue={mockSetValue}
        setTouched={mockSetTouched}
        validate={mockValidate}
      />
    );

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
  });
});

describe('AdminFormValidationSummary', () => {
  it('does not render when no errors', () => {
    const formState = {
      values: {},
      errors: [],
      touched: {},
      isSubmitting: false,
      submitAttempted: true
    };

    const { container } = render(
      <AdminFormValidationSummary formState={formState} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('does not render when submit not attempted', () => {
    const formState = {
      values: {},
      errors: [{ field: 'email', message: 'Required', type: 'required' as const }],
      touched: {},
      isSubmitting: false,
      submitAttempted: false
    };

    const { container } = render(
      <AdminFormValidationSummary formState={formState} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders error summary when there are errors', () => {
    const formState = {
      values: {},
      errors: [
        { field: 'email', message: 'Email is required', type: 'required' as const },
        { field: 'password', message: 'Password too short', type: 'minLength' as const }
      ],
      touched: {},
      isSubmitting: false,
      submitAttempted: true
    };

    render(
      <AdminFormValidationSummary formState={formState} />
    );

    expect(screen.getByText('Please fix the following errors:')).toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password too short')).toBeInTheDocument();
  });

  it('shows retry button when onRetry provided', () => {
    const mockRetry = vi.fn();
    const formState = {
      values: {},
      errors: [{ field: 'email', message: 'Required', type: 'required' as const }],
      touched: {},
      isSubmitting: false,
      submitAttempted: true
    };

    render(
      <AdminFormValidationSummary formState={formState} onRetry={mockRetry} />
    );

    const retryButton = screen.getByText('Try Again');
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(mockRetry).toHaveBeenCalled();
  });
});

describe('AdminFormSuccess', () => {
  it('renders success message', () => {
    render(
      <AdminFormSuccess message="Form submitted successfully!" />
    );

    expect(screen.getByText('Form submitted successfully!')).toBeInTheDocument();
  });

  it('shows dismiss button when onDismiss provided', () => {
    const mockDismiss = vi.fn();
    render(
      <AdminFormSuccess message="Success!" onDismiss={mockDismiss} />
    );

    const dismissButton = screen.getByText('Dismiss');
    fireEvent.click(dismissButton);
    expect(mockDismiss).toHaveBeenCalled();
  });
});

describe('AdminFormInfo', () => {
  it('renders info message', () => {
    render(
      <AdminFormInfo message="This is an informational message" />
    );

    expect(screen.getByText('This is an informational message')).toBeInTheDocument();
  });

  it('shows dismiss button when onDismiss provided', () => {
    const mockDismiss = vi.fn();
    render(
      <AdminFormInfo message="Info!" onDismiss={mockDismiss} />
    );

    const dismissButton = screen.getByText('Dismiss');
    fireEvent.click(dismissButton);
    expect(mockDismiss).toHaveBeenCalled();
  });
});