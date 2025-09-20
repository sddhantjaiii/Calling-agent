import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy } from 'react';
import React from 'react';
import { Toaster } from "sonner";
import { ThemeProvider } from "./components/theme/ThemeProvider";
import { AuthProvider } from "./contexts/AuthContext";
import { AgentProvider } from "./contexts/AgentContext";
import { AdminProvider } from "./contexts/AdminContext";
import { SuccessFeedbackProvider } from "./contexts/SuccessFeedbackContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AdminRoute from "./components/admin/AdminRoute";
import TokenRefreshIndicator from "./components/auth/TokenRefreshIndicator";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import UserAnalytics from "./pages/UserAnalytics";
import AgentAnalytics from "./pages/AgentAnalytics";
import NotFound from "./pages/NotFound";
import LeadProfileTab from "./components/chat/LeadProfileTab";
import ChatDataPage from "./pages/ChatDataPage";
import AdminLayout from "./components/admin/AdminLayout";
import { EnhancedLeadCardDemo } from "./components/leads/EnhancedLeadCardDemo";
import AdminDashboard from "./components/admin/AdminDashboard";
import AuditLogs from "./components/admin/AuditLogs";
import Communication from "./components/admin/Communication";
import ErrorBoundary from "./components/ErrorBoundary";
import { queryClient } from "./lib/queryClient";

// Lazy load admin components to fix object-to-primitive conversion error
const LazyUserManagement = lazy(() => import('./components/admin/UserManagement/UserManagement'));
const LazyAgentManagement = lazy(() => import('./components/admin/AgentManagement/AgentManagement'));
const LazyPhoneNumberManagement = lazy(() => import('./components/admin/PhoneNumberManagement/PhoneNumberManagement'));
const LazyAnalyticsDashboard = lazy(() => import('./components/admin/SystemAnalytics/AnalyticsDashboard'));
const LazyConfiguration = lazy(() => import('./components/admin/Configuration'));
const LazyAdvancedFeatures = lazy(() => import('./components/admin/AdvancedFeatures/AdvancedFeatures'));
const LazyReports = lazy(() => import('./components/admin/Reports'));
const LazyRealTimeDashboard = lazy(() => import('./components/admin/RealTime/RealTimeDashboard'));

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<div>Loading...</div>}>
          <Router>
            <AuthProvider>
              <AgentProvider>
                <AdminProvider>
                  <ThemeProvider>
                    <SuccessFeedbackProvider>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route
                        path="/dashboard"
                        element={
                          <ProtectedRoute>
                            <Dashboard />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/dashboard/chat/data"
                        element={
                          <ProtectedRoute>
                            <ChatDataPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/dashboard/chat/profile"
                        element={
                          <ProtectedRoute>
                            <Dashboard
                              initialTab="chat"
                              initialSubTab="data"
                              customContent={<LeadProfileTab />}
                            />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/leads/demo"
                        element={
                          <ProtectedRoute>
                            <EnhancedLeadCardDemo />
                          </ProtectedRoute>
                        }
                      />

                      {/* Admin Routes */}
                      <Route
                        path="/admin/*"
                        element={
                          <AdminRoute>
                            <AdminLayout>
                              <Routes>
                                <Route index element={<AdminDashboard />} />
                                <Route path="users" element={
                                  <Suspense fallback={<div>Loading...</div>}>
                                    <LazyUserManagement />
                                  </Suspense>
                                } />
                                <Route path="agents" element={
                                  <Suspense fallback={<div>Loading...</div>}>
                                    <LazyAgentManagement />
                                  </Suspense>
                                } />
                                <Route path="agents/*" element={
                                  <Suspense fallback={<div>Loading...</div>}>
                                    <LazyAgentManagement />
                                  </Suspense>
                                } />
                                <Route path="phone-numbers" element={
                                  <Suspense fallback={<div>Loading...</div>}>
                                    <LazyPhoneNumberManagement />
                                  </Suspense>
                                } />
                                <Route path="analytics" element={
                                  <Suspense fallback={<div>Loading...</div>}>
                                    <LazyAnalyticsDashboard />
                                  </Suspense>
                                } />
                                <Route path="configuration" element={
                                  <Suspense fallback={<div>Loading...</div>}>
                                    <LazyConfiguration />
                                  </Suspense>
                                } />
                                <Route path="audit" element={<AuditLogs />} />
                                <Route path="communication" element={<Communication />} />
                                <Route path="advanced" element={
                                  <Suspense fallback={<div>Loading...</div>}>
                                    <LazyAdvancedFeatures />
                                  </Suspense>
                                } />
                                <Route path="reports" element={
                                  <Suspense fallback={<div>Loading...</div>}>
                                    <LazyReports />
                                  </Suspense>
                                } />
                                <Route path="realtime" element={
                                  <Suspense fallback={<div>Loading...</div>}>
                                    <LazyRealTimeDashboard />
                                  </Suspense>
                                } />
                              </Routes>
                            </AdminLayout>
                          </AdminRoute>
                        }
                      />

                      <Route path="*" element={<NotFound />} />
                    </Routes>
                    <TokenRefreshIndicator />
                  </SuccessFeedbackProvider>
                </ThemeProvider>
              </AdminProvider>
            </AgentProvider>
            </AuthProvider>
          </Router>
        </Suspense>
        <Toaster />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
