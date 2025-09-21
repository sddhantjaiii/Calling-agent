import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Mail, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiService } from "@/services/apiService";

interface EmailVerificationProps {
  userEmail: string;
  onVerificationComplete?: () => void;
}

const EmailVerification = ({ userEmail, onVerificationComplete }: EmailVerificationProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastSentTime, setLastSentTime] = useState<Date | null>(null);
  const { refreshUser } = useAuth();

  const handleResendVerification = async () => {
    setIsLoading(true);

    try {
      await apiService.sendVerificationEmail();
      setLastSentTime(new Date());
      toast.success("Verification email sent! Check your inbox.");
    } catch (error) {
      console.error("Failed to resend verification email:", error);
      toast.error("Failed to send verification email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckVerification = async () => {
    setIsLoading(true);

    try {
      await refreshUser();
      // After refreshing user data, the parent component should handle the verification status
      if (onVerificationComplete) {
        onVerificationComplete();
      }
    } catch (error) {
      console.error("Failed to check verification status:", error);
      toast.error("Failed to check verification status. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const canResend = !lastSentTime || Date.now() - lastSentTime.getTime() > 60000; // 1 minute cooldown

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 flex items-center justify-center bg-yellow-100 rounded-full">
            <Mail className="h-8 w-8 text-yellow-600" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Verify Your Email
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            We've sent a verification email to
          </p>
          <p className="font-medium text-teal-600">{userEmail}</p>
        </div>

        <div className="bg-white shadow rounded-lg p-6 space-y-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-gray-700">
              <p className="font-medium mb-1">Account Access Restricted</p>
              <p>
                You need to verify your email address before you can access your dashboard and use our services.
              </p>
            </div>
          </div>

          <div className="border-t pt-6 space-y-4">
            <h3 className="font-medium text-gray-900">Next Steps:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
              <li>Check your email inbox for our verification message</li>
              <li>Click the verification link in the email</li>
              <li>Return here and click "I've Verified My Email"</li>
            </ol>
          </div>

          <div className="border-t pt-6 space-y-3">
            <Button
              onClick={handleCheckVerification}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                  Checking...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  I've Verified My Email
                </div>
              )}
            </Button>

            <Button
              onClick={handleResendVerification}
              variant="outline"
              className="w-full"
              disabled={isLoading || !canResend}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                  Sending...
                </div>
              ) : !canResend ? (
                `Resend Available in ${60 - Math.floor((Date.now() - (lastSentTime?.getTime() || 0)) / 1000)}s`
              ) : (
                <div className="flex items-center justify-center">
                  <Mail className="h-4 w-4 mr-2" />
                  Resend Verification Email
                </div>
              )}
            </Button>
          </div>

          <div className="border-t pt-6">
            <div className="text-xs text-gray-500 space-y-1">
              <p>• Check your spam/junk folder if you don't see the email</p>
              <p>• Verification links expire after 24 hours</p>
              <p>• Having trouble? Contact our support team</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;