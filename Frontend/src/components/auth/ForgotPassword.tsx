import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ValidatedInput } from "@/components/ui/ValidatedInput";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { validateField, validationSchemas } from "@/utils/formValidation";
import { 
  createFormValidationHandler,
  mergeValidationErrors,
  FORM_FIELD_MAPPINGS 
} from "@/utils/serverValidationHandler";
import { apiService } from "@/services/apiService";

interface ForgotPasswordProps {
  onBackToLogin: () => void;
}

const ForgotPassword = ({ onBackToLogin }: ForgotPasswordProps) => {
  const [email, setEmail] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  // Merge client and server errors (server errors take precedence)
  const validationErrors = mergeValidationErrors(clientErrors, serverErrors);

  // Create server validation handler for this form
  const handleServerValidation = createFormValidationHandler(
    setServerErrors,
    FORM_FIELD_MAPPINGS.auth,
    {
      showToast: true,
      toastTitle: 'Password Reset Failed',
    }
  );

  const handleInputChange = (value: string) => {
    // Ensure value is always a string
    const emailValue = typeof value === 'string' ? value : '';
    setEmail(emailValue);
    
    // Clear both client and server errors when user starts typing
    if (clientErrors.email) {
      setClientErrors(prev => ({ ...prev, email: '' }));
    }
    if (serverErrors.email) {
      setServerErrors(prev => ({ ...prev, email: '' }));
    }
  };

  const handleFieldBlur = () => {
    setTouchedFields(prev => ({ ...prev, email: true }));
    
    // Validate email on blur
    const schema = validationSchemas.login;
    const rules = schema.emailOrPhone;
    if (rules) {
      const result = validateField(email, rules, 'email');
      if (!result.isValid && result.error) {
        setClientErrors(prev => ({ ...prev, email: result.error! }));
      } else {
        setClientErrors(prev => ({ ...prev, email: '' }));
      }
      
      // Clear server error for this field when user is actively fixing it
      if (serverErrors.email) {
        setServerErrors(prev => ({ ...prev, email: '' }));
      }
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    // Validate email
    if (!email || !email.trim()) {
      errors.email = 'Email address is required';
    } else {
      const schema = validationSchemas.login;
      const result = validateField(email, schema.emailOrPhone, 'email');
      if (!result.isValid && result.error) {
        errors.email = result.error;
      }
    }
    
    setClientErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      await apiService.sendPasswordReset(email);
      setIsEmailSent(true);
      toast.success("Password reset email sent! Check your inbox.");
    } catch (error) {
      console.error("Password reset error:", error);
      
      // Try to handle as server validation error first
      const wasValidationError = handleServerValidation(error);
      
      if (!wasValidationError) {
        // Generic error handling
        toast.error("Failed to send password reset email. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isEmailSent) {
    return (
      <div className="space-y-6 text-center">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            Check Your Email
          </h2>
          <p className="text-gray-600">
            We've sent a password reset link to <strong>{email}</strong>
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 text-sm">
            If you don't see the email in your inbox, please check your spam folder.
            The reset link will expire in 1 hour for security reasons.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => {
              setIsEmailSent(false);
              setEmail("");
            }}
            variant="outline"
            className="w-full"
          >
            Send Another Email
          </Button>
          
          <button
            onClick={onBackToLogin}
            className="flex items-center justify-center w-full text-sm text-teal-600 hover:text-teal-500"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">
          Forgot Password?
        </h2>
        <p className="text-gray-600">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <ValidatedInput
            id="email"
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => handleInputChange((e.target as HTMLInputElement).value)}
            onBlur={handleFieldBlur}
            error={validationErrors.email}
            touched={touchedFields.email}
            disabled={isLoading}
            autoComplete="email"
            required
          />
        </div>

        <Button
          type="submit"
          className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-lg font-medium disabled:opacity-50"
          disabled={isLoading || !email || !email.trim()}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Sending...
            </div>
          ) : (
            "Send Reset Link"
          )}
        </Button>

        <button
          type="button"
          onClick={onBackToLogin}
          className="flex items-center justify-center w-full text-sm text-teal-600 hover:text-teal-500"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Login
        </button>
      </form>
    </div>
  );
};

export default ForgotPassword;