import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAdmin } from '@/contexts/AdminContext';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from './AdminLayout';
import AdminDashboard from './AdminDashboard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Lazy load admin sections for better performance
const UserManagement = lazy(() => import('./UserManagement/UserManagement'));
const AgentManagement = lazy(() => import('./AgentManagement/AgentManagement'));
const SystemAnalytics = lazy(() => import('./SystemAnalytics/AnalyticsDashboard'));
const Configuration = lazy(() => import('./Configuration'));
const AuditLogs = lazy(() => import('./AuditLogs'));
const Communication = lazy(() => import('./Communication'));
const AdvancedFeatures = lazy(() => import('./AdvancedFeatures/AdvancedFeatures'));
const Reports = lazy(() => import('./Reports'));
const RealTime = lazy(() => import('./RealTime/RealTimeDashboard'));

const AdminPanel: React.FC = () => {
  const { user: authUser, isLoading: authLoading } = useAuth();
  const { isLoading: adminLoading, error: adminError } = useAdmin();

  // Show loading state
  if (authLoading || adminLoading) {
    return (
      <div 
        className="flex items-center justify-center min-h-screen"
        data-testid="admin-loading"
      >
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Check if user has admin access
  if (!authUser || (authUser.role !== 'admin' && authUser.role !== 'super_admin')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access the admin panel.</p>
        </div>
      </div>
    );
  }

  // Show admin error if any
  if (adminError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Admin Panel Error</h1>
          <p className="text-gray-600">{adminError}</p>
        </div>
      </div>
    );
  }

  return (
    <div role="main" aria-label="Admin Panel">
      <AdminLayout>
        <Suspense fallback={<LoadingSpinner size="lg" />}>
          <Routes>
            <Route index element={<AdminDashboard />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route 
              path="users/*" 
              element={
                <div data-testid="user-management">
                  <UserManagement />
                </div>
              } 
            />
            <Route 
              path="agents/*" 
              element={
                <div data-testid="agent-management">
                  <AgentManagement />
                </div>
              } 
            />
            <Route path="analytics/*" element={<SystemAnalytics />} />
            <Route path="configuration/*" element={<Configuration />} />
            <Route path="audit/*" element={<AuditLogs />} />
            <Route path="communication/*" element={<Communication />} />
            <Route path="advanced/*" element={<AdvancedFeatures />} />
            <Route path="reports/*" element={<Reports />} />
            <Route path="realtime/*" element={<RealTime />} />
            <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
          </Routes>
        </Suspense>
      </AdminLayout>
    </div>
  );
};

export default AdminPanel;