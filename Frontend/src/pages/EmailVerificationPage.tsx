import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { apiService } from "@/services/apiService";
import { useAuth } from "@/contexts/AuthContext";

const EmailVerificationPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setVerificationStatus('error');
        setErrorMessage('Invalid verification link. No token provided.');
        return;
      }

      try {
        await apiService.verifyEmail(token);
        setVerificationStatus('success');
        
        // Refresh user data to update email verification status
        await refreshUser();
        
        toast.success('Email verified successfully!');
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
        
      } catch (error) {
        console.error('Email verification failed:', error);
        setVerificationStatus('error');
        
        // Parse error message
        if (error && typeof error === 'object' && 'message' in error) {
          setErrorMessage((error as any).message || 'Email verification failed.');
        } else {
          setErrorMessage('Email verification failed. The link may be expired or invalid.');
        }
      }
    };

    verifyEmail();
  }, [searchParams, refreshUser, navigate]);

  if (verificationStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto h-16 w-16 flex items-center justify-center bg-blue-100 rounded-full">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            Verifying Your Email
          </h2>
          <p className="text-gray-600">
            Please wait while we verify your email address...
          </p>
        </div>
      </div>
    );
  }

  if (verificationStatus === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto h-16 w-16 flex items-center justify-center bg-green-100 rounded-full">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            Email Verified Successfully!
          </h2>
          <p className="text-gray-600">
            Your email has been verified. You now have full access to your account.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 text-sm">
              Redirecting you to the dashboard...
            </p>
          </div>
          <Button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white"
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto h-16 w-16 flex items-center justify-center bg-red-100 rounded-full">
          <XCircle className="h-8 w-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          Email Verification Failed
        </h2>
        <p className="text-gray-600">
          {errorMessage}
        </p>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">
            If you continue to have problems, please contact our support team.
          </p>
        </div>
        <div className="space-y-3">
          <Button
            onClick={() => navigate('/')}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white"
          >
            Back to Login
          </Button>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="w-full"
          >
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationPage;