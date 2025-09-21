import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ValidatedInput } from "@/components/ui/ValidatedInput";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { validateForm, validateField, validationSchemas } from "@/utils/formValidation";
import { 
  createFormValidationHandler,
  mergeValidationErrors,
  FORM_FIELD_MAPPINGS 
} from "@/utils/serverValidationHandler";

const SignUpForm = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
  });
  const [isLoading, setIsLoading] = useState(false);
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
      toastTitle: 'Registration Failed',
    }
  );

  const navigate = useNavigate();
  const { register, error: authError, clearError } = useAuth();

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear both client and server errors when user starts typing
    if (clientErrors[field]) {
      setClientErrors(prev => ({ ...prev, [field]: '' }));
    }
    if (serverErrors[field]) {
      setServerErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Clear auth error when user starts typing
    if (authError) clearError();
  };

  const handleFieldBlur = (field: string) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
    
    // Validate field on blur using the validation schema
    const schema = validationSchemas.register;
    const fieldRules = schema[field as keyof typeof schema];
    
    if (fieldRules) {
      let result;
      
      if (field === 'confirmPassword') {
        // Special handling for password confirmation
        result = {
          isValid: formData.password === formData.confirmPassword,
          error: formData.password !== formData.confirmPassword ? 'Passwords do not match' : null
        };
      } else {
        result = validateField(formData[field as keyof typeof formData], fieldRules, field);
      }
      
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
    const result = validateForm(formData, validationSchemas.register);
    setClientErrors(result.errors);
    
    // Clear server errors when doing client validation
    setServerErrors({});
    
    // Mark all fields as touched
    setTouchedFields({
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
      agreeToTerms: true
    });
    
    return result.isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateFormData()) return;

    setIsLoading(true);
    clearError();

    try {
      const success = await register(formData.email, formData.password, formData.name);

      if (success) {
        toast.success("Account created successfully!");
        navigate("/dashboard");
      }
      // Error handling is now done in AuthContext
    } catch (error) {
      console.error("Registration error:", error);
      
      // Try to handle as server validation error first
      const wasValidationError = handleServerValidation(error);
      
      if (!wasValidationError) {
        // Error is already handled in AuthContext for other types
        // Additional specific handling can be added here if needed
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <ValidatedInput
        label="Full Name"
        type="text"
        placeholder="Enter your full name"
        value={formData.name}
        onChange={(e) => handleInputChange("name", e.target.value)}
        onBlur={() => handleFieldBlur("name")}
        error={validationErrors.name}
        touched={touchedFields.name}
        required
        className="border-gray-300 focus:border-teal-500 focus:ring-teal-500 bg-white text-black placeholder-gray-400"
        style={{ color: "#000" }}
        description="Enter your first and last name"
      />

      <ValidatedInput
        label="Email address"
        type="email"
        placeholder="john@company.com"
        value={formData.email}
        onChange={(e) => handleInputChange("email", e.target.value)}
        onBlur={() => handleFieldBlur("email")}
        error={validationErrors.email}
        touched={touchedFields.email}
        required
        className="border-gray-300 focus:border-teal-500 focus:ring-teal-500 bg-white text-black placeholder-gray-400"
        style={{ color: "#000" }}
        description="We'll use this to send you important updates"
      />

      <div>
        <Label className="text-black font-medium">Password</Label>
        <div className="relative mt-2">
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="Create a password"
            value={formData.password}
            onChange={(e) => handleInputChange("password", e.target.value)}
            onBlur={() => handleFieldBlur("password")}
            required
            className={`border-gray-300 focus:border-teal-500 focus:ring-teal-500 pr-10 bg-white text-black placeholder-gray-400 ${
              touchedFields.password && validationErrors.password ? 'border-red-500' : ''
            }`}
            style={{ color: "#000" }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
        {touchedFields.password && validationErrors.password && (
          <p className="text-sm text-red-500 mt-1">{validationErrors.password}</p>
        )}
        {!validationErrors.password && (
          <p className="text-sm text-gray-500 mt-1">
            Must be at least 8 characters with uppercase, lowercase, number, and special character
          </p>
        )}
      </div>

      <div>
        <Label className="text-black font-medium">Confirm Password</Label>
        <div className="relative mt-2">
          <Input
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
            onBlur={() => handleFieldBlur("confirmPassword")}
            required
            className={`border-gray-300 focus:border-teal-500 focus:ring-teal-500 pr-10 bg-white text-black placeholder-gray-400 ${
              touchedFields.confirmPassword && validationErrors.confirmPassword ? 'border-red-500' : ''
            }`}
            style={{ color: "#000" }}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showConfirmPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
        {touchedFields.confirmPassword && validationErrors.confirmPassword && (
          <p className="text-sm text-red-500 mt-1">{validationErrors.confirmPassword}</p>
        )}
      </div>

      {authError && (
        <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg">
          {authError}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="terms"
            checked={formData.agreeToTerms}
            onCheckedChange={(checked) =>
              handleInputChange("agreeToTerms", !!checked)
            }
            onBlur={() => handleFieldBlur("agreeToTerms")}
          />
          <Label htmlFor="terms" className="text-sm text-black">
            I agree to the{" "}
            <button
              type="button"
              className="text-teal-600 hover:text-teal-500 underline"
            >
              Terms of Service
            </button>{" "}
            and{" "}
            <button
              type="button"
              className="text-teal-600 hover:text-teal-500 underline"
            >
              Privacy Policy
            </button>
          </Label>
        </div>
        {touchedFields.agreeToTerms && validationErrors.agreeToTerms && (
          <p className="text-sm text-red-500">{validationErrors.agreeToTerms}</p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-lg font-medium disabled:opacity-50"
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Creating account...
          </div>
        ) : (
          "Create account"
        )}
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-black">or</span>
        </div>
      </div>

      <div className="space-y-3">
        <Button
          type="button"
          variant="outline"
          className="w-full py-3 border-gray-300 bg-gray-50 text-teal-800"
          onClick={() => window.location.href = 'http://localhost:3000/api/auth/google'}
        >
          <div className="w-5 h-5 bg-blue-500 rounded-full mr-2"></div>
          Sign up with Google
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full py-3 border-gray-300 text-teal-800 bg-gray-50"
        >
          <div className="w-5 h-5 bg-blue-700 rounded mr-2"></div>
          Sign up with LinkedIn
        </Button>
      </div>
    </form>
  );
};

export default SignUpForm;