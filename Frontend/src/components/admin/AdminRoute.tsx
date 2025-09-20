
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface AdminRouteProps {
    children: React.ReactNode;
    requiredRole?: 'admin' | 'super_admin';
}

export function AdminRoute({ children, requiredRole = 'admin' }: AdminRouteProps) {
    const { user, isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    // Show loading spinner while authentication is being verified
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated || !user) {
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    // Check if user has admin role
    const isAdmin = user.role === 'admin' || user.role === 'super_admin';
    if (!isAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    // Check if user has required role level
    if (requiredRole === 'super_admin' && user.role !== 'super_admin') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
                    <p className="text-gray-600 mb-4">
                        Super admin privileges are required to access this resource.
                    </p>
                    <button
                        onClick={() => window.history.back()}
                        className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}

export default AdminRoute;