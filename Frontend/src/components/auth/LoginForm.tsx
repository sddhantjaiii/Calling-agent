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
import { validateField, validationSchemas } from "@/utils/formValidation";
import { 
  createFormValidationHandler,
  mergeValidationErrors,
  FORM_FIELD_MAPPINGS 
} from "@/utils/serverValidationHandler";
import ForgotPassword from "./ForgotPassword";
import API_ENDPOINTS from "@/config/api";

const LoginForm = () => {
  const [isPhone, setIsPhone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [formData, setFormData] = useState({
    emailOrPhone: "",
    password: "",
    otp: "",
    rememberMe: false,
  });
  const [showOTP, setShowOTP] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();
  const { login, error: authError, clearError } = useAuth();

  // Merge client and server errors (server errors take precedence)
  const validationErrors = mergeValidationErrors(clientErrors, serverErrors);

  // Create server validation handler for this form
  const handleServerValidation = createFormValidationHandler(
    setServerErrors,
    FORM_FIELD_MAPPINGS.auth,
    {
      showToast: true,
      toastTitle: 'Login Failed',
    }
  );

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
    
    // Validate field on blur
    if (field === 'emailOrPhone' || field === 'password') {
      const schema = validationSchemas.login;
      const rules = schema[field as keyof typeof schema];
      if (rules) {
        const result = validateField(formData[field as keyof typeof formData], rules, field);
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
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    // Validate email/phone
    if (!formData.emailOrPhone.trim()) {
      errors.emailOrPhone = isPhone ? 'Phone number is required' : 'Email address is required';
    } else {
      const schema = validationSchemas.login;
      const result = validateField(formData.emailOrPhone, schema.emailOrPhone, 'emailOrPhone');
      if (!result.isValid && result.error) {
        errors.emailOrPhone = result.error;
      }
    }
    
    // Validate password (only for email login)
    if (!isPhone && !formData.password.trim()) {
      errors.password = 'Password is required';
    }
    
    // Validate OTP (only for phone login when OTP is shown)
    if (isPhone && showOTP && !formData.otp.trim()) {
      errors.otp = 'OTP is required';
    } else if (isPhone && showOTP && formData.otp.length !== 6) {
      errors.otp = 'OTP must be 6 digits';
    }
    
    setClientErrors(errors);
    setTouchedFields({
      emailOrPhone: true,
      password: !isPhone,
      otp: isPhone && showOTP
    });
    
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form before submission
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    clearError();

    try {
      if (isPhone && !showOTP) {
        // For phone authentication, show OTP input
        setShowOTP(true);
        toast.success("OTP sent to your phone");
        setIsLoading(false);
        return;
      }

      if (isPhone && showOTP) {
        // Handle OTP verification (placeholder for now)
        toast.success("Login successful!");
        navigate("/dashboard");
        setIsLoading(false);
        return;
      }

      // Email login
      const success = await login(formData.emailOrPhone, formData.password);
      
      if (success) {
        toast.success("Login successful!");
        navigate("/dashboard");
      }
      // Error handling is now done in AuthContext
    } catch (error) {
      console.error("Login error:", error);
      
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

  const toggleAuthMethod = () => {
    setIsPhone(!isPhone);
    setShowOTP(false);
    clearError();
    setClientErrors({});
    setServerErrors({});
    setTouchedFields({});
    setFormData((prev) => ({
      ...prev,
      emailOrPhone: "",
      password: "",
      otp: "",
    }));
  };

  // Show forgot password form if requested
  if (showForgotPassword) {
    return <ForgotPassword onBackToLogin={() => setShowForgotPassword(false)} />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Email/Phone Toggle */}
      <div className="flex bg-gray-100 rounded-lg p-1">
        <button
          type="button"
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            !isPhone
              ? "bg-teal-600 text-white shadow-sm"
              : "text-gray-600 hover:text-gray-800"
          }`}
          onClick={() => !isPhone || toggleAuthMethod()}
        >
          Email
        </button>
        <button
          type="button"
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            isPhone
              ? "bg-teal-600 text-white shadow-sm"
              : "text-gray-600 hover:text-gray-800"
          }`}
          onClick={() => isPhone || toggleAuthMethod()}
        >
          Phone
        </button>
      </div>

      <ValidatedInput
        label={isPhone ? "Phone number" : "Email address"}
        type={isPhone ? "tel" : "email"}
        placeholder={isPhone ? "+1 (555) 123-4567" : "john@company.com"}
        value={formData.emailOrPhone}
        onChange={(e) => handleInputChange("emailOrPhone", e.target.value)}
        onBlur={() => handleFieldBlur("emailOrPhone")}
        error={validationErrors.emailOrPhone}
        touched={touchedFields.emailOrPhone}
        required
        className="border-gray-300 focus:border-teal-500 focus:ring-teal-500 bg-white text-black placeholder-gray-400"
        style={{ color: "#000" }}
      />

      {isPhone && showOTP ? (
        <ValidatedInput
          label="Enter OTP"
          type="text"
          placeholder="Enter 6-digit OTP"
          value={formData.otp}
          onChange={(e) => handleInputChange("otp", e.target.value)}
          onBlur={() => handleFieldBlur("otp")}
          error={validationErrors.otp}
          touched={touchedFields.otp}
          maxLength={6}
          required
          className="border-gray-300 focus:border-teal-500 focus:ring-teal-500 bg-white text-black placeholder-gray-400"
          style={{ color: "#000" }}
          description="Enter the 6-digit code sent to your phone"
        />
      ) : !isPhone ? (
        <div>
          <Label className="text-black font-medium">Password</Label>
          <div className="relative mt-2">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
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
        </div>
      ) : null}

      {authError && (
        <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg">
          {authError}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="remember"
            checked={formData.rememberMe}
            onCheckedChange={(checked) =>
              handleInputChange("rememberMe", !!checked)
            }
          />
          <Label htmlFor="remember" className="text-sm text-black">
            Keep me signed in
          </Label>
        </div>
        {!isPhone && (
          <button
            type="button"
            onClick={() => setShowForgotPassword(true)}
            className="text-sm text-teal-600 hover:text-teal-500"
          >
            Forgot password?
          </button>
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
            Processing...
          </div>
        ) : isPhone && showOTP ? (
          "Verify OTP"
        ) : (
          "Sign in"
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
          onClick={() => window.location.href = API_ENDPOINTS.AUTH.GOOGLE}
        >
          <div className="w-5 h-5 bg-blue-500 rounded-full mr-2"></div>
          Sign in with Google
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full py-3 border-gray-300 text-teal-800 bg-gray-50"
        >
          <div className="w-5 h-5 bg-blue-700 rounded mr-2"></div>
          Sign in with LinkedIn
        </Button>
      </div>
    </form>
  );
};

export default LoginForm;