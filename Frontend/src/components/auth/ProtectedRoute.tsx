import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import EmailVerification from './EmailVerification';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login page with return url
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Check if user email is verified (only for non-Google login users)
  // Google login users are automatically considered verified
  if (user && !user.emailVerified) {
    // Check if the user signed up with Google (Google users should be auto-verified)
    // If not verified and not a Google user, show email verification page
    return (
      <EmailVerification 
        userEmail={user.email}
        onVerificationComplete={() => {
          // This will trigger a user refresh in the component
        }}
      />
    );
  }

  return <>{children}</>;
}

export default ProtectedRoute;