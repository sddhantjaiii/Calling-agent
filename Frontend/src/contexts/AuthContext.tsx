import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiService } from '@/services/apiService';
import { errorHandler } from '@/utils/errorHandler';
import { queryClient, cacheUtils } from '@/lib/queryClient';

// Import User interface from types
import type { User } from '@/types/api';

// Token refresh configuration
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiration
const TOKEN_CHECK_INTERVAL = 60 * 1000; // Check every minute

// Auth context interface
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateUserProfile: (userData: Partial<User>) => Promise<boolean>;
  clearError: () => void;
  isTokenExpiring: boolean;
  sessionValidated: boolean;
  isAdminUser: () => boolean;
  isSuperAdminUser: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Export context for testing
export { AuthContext };

// Auth context provider using custom authentication
function AuthContextProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTokenExpiring, setIsTokenExpiring] = useState(false);
  const [sessionValidated, setSessionValidated] = useState(false);
  const [refreshPromise, setRefreshPromise] = useState<Promise<boolean> | null>(null);
  const [authPromise, setAuthPromise] = useState<Promise<boolean> | null>(null);

  // Helper function to decode JWT token and get expiration
  const getTokenExpiration = (token: string): number | null => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000; // Convert to milliseconds
    } catch (error) {
      console.error('Failed to decode token:', error);
      return null;
    }
  };

  // Helper function to check if token is expiring soon
  const isTokenExpiringSoon = (token: string): boolean => {
    const expiration = getTokenExpiration(token);
    if (!expiration) return true;
    return Date.now() > expiration - TOKEN_REFRESH_THRESHOLD;
  };

  // Refresh token function
  const refreshToken = async (): Promise<boolean> => {
    // If there's already a refresh in progress, wait for it
    if (refreshPromise) {
      return refreshPromise;
    }

    const refreshTokenValue = localStorage.getItem('refresh_token');
    if (!refreshTokenValue) {
      console.log('No refresh token available');
      return false;
    }

    const promise = (async () => {
      try {
        console.log('Refreshing token...');
        const response = await apiService.refreshToken(refreshTokenValue);
        
        if (response.token && response.refreshToken && response.user) {
          // Store new tokens
          localStorage.setItem('auth_token', response.token);
          localStorage.setItem('refresh_token', response.refreshToken);
          
          // Update user state
          setUser(response.user);
          setIsTokenExpiring(false);
          
          console.log('Token refreshed successfully');
          return true;
        } else {
          console.error('Invalid refresh response');
          return false;
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
        // Clear tokens and logout on refresh failure
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        setUser(null);
        return false;
      } finally {
        setRefreshPromise(null);
      }
    })();

    setRefreshPromise(promise);
    return promise;
  };

  // Enhanced session validation on app initialization
  const validateSession = async (): Promise<boolean> => {
    const token = localStorage.getItem('auth_token');
    const refreshTokenValue = localStorage.getItem('refresh_token');
    
    if (!token) {
      console.log('No auth token found');
      return false;
    }

    try {
      // Check if token is expiring soon
      if (isTokenExpiringSoon(token) && refreshTokenValue) {
        console.log('Token is expiring soon, attempting refresh...');
        const refreshSuccess = await refreshToken();
        if (!refreshSuccess) {
          console.log('Token refresh failed during session validation');
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          return false;
        }
        return true;
      } else {
        // Validate current token with backend
        console.log('Validating current session...');
        const response = await apiService.validateToken();
        if (response.user) {
          setUser(response.user);
          console.log('Session validated successfully');
          return true;
        } else {
          console.log('Session validation failed - no user data');
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          return false;
        }
      }
    } catch (error) {
      console.error('Session validation error:', error);
      
      // Try to refresh if we have a refresh token and the error might be token-related
      if (refreshTokenValue && (error as any)?.code !== 'VALIDATION_ERROR') {
        console.log('Attempting token refresh after validation error...');
        const refreshSuccess = await refreshToken();
        if (!refreshSuccess) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          return false;
        }
        return true;
      } else {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        return false;
      }
    }
  };

  // Check for existing token on mount and set up token refresh
  useEffect(() => {
    const initAuth = async () => {
      try {
        const isValid = await validateSession();
        setSessionValidated(isValid);
      } catch (error) {
        console.error('Auth initialization failed:', error);
        setSessionValidated(false);
      } finally {
        setIsLoading(false);
      }
    };

    // Set up error handler for auth errors
    errorHandler.setAuthErrorHandler(() => {
      logout();
    });

    // Listen for auth error events from API service
    const handleAuthError = () => {
      logout();
    };

    // Listen for token refresh events from API service
    const handleTokenRefresh = (event: CustomEvent) => {
      if (event.detail?.user) {
        setUser(event.detail.user);
        setIsTokenExpiring(false);
      }
    };

    window.addEventListener('auth-error', handleAuthError);
    window.addEventListener('token-refreshed', handleTokenRefresh as EventListener);

    initAuth();

    // Cleanup event listeners
    return () => {
      window.removeEventListener('auth-error', handleAuthError);
      window.removeEventListener('token-refreshed', handleTokenRefresh as EventListener);
    };
  }, []);

  // Set up automatic token refresh check
  useEffect(() => {
    if (!user) return;

    const checkTokenExpiration = () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        logout();
        return;
      }

      if (isTokenExpiringSoon(token)) {
        setIsTokenExpiring(true);
        refreshToken().catch((error) => {
          console.error('Automatic token refresh failed:', error);
          logout();
        });
      }
    };

    // Check immediately
    checkTokenExpiration();

    // Set up interval to check periodically
    const interval = setInterval(checkTokenExpiration, TOKEN_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [user]);

  // Handle concurrent authentication requests
  const login = async (email: string, password: string): Promise<boolean> => {
    // If there's already an auth request in progress, wait for it
    if (authPromise) {
      console.log('Login request already in progress, waiting...');
      return authPromise;
    }

    const promise = (async () => {
      try {
        setError(null);
        setIsLoading(true);

        const response = await apiService.login(email, password);

        if (response.token && response.refreshToken && response.user) {
          localStorage.setItem('auth_token', response.token);
          localStorage.setItem('refresh_token', response.refreshToken);
          
          // CRITICAL: Clear cache before setting new user to prevent cross-user data leakage
          console.log('Clearing React Query cache on login to ensure fresh data for new user');
          cacheUtils.clearAll();
          
          setUser(response.user);
          setSessionValidated(true);
          return true;
        }

        return false;
      } catch (error) {
        console.error('Login failed:', error);

        // Handle specific error cases with user-friendly messages
        if (error instanceof Error) {
          const errorCode = (error as any).code;

          if (errorCode === 'INVALID_CREDENTIALS' || error.message.includes('Invalid email or password')) {
            setError('Invalid email or password. Please check your credentials and try again.');
          } else if (errorCode === 'ACCOUNT_LOCKED' || error.message.includes('locked')) {
            setError('Your account has been temporarily locked due to too many failed login attempts. Please try again in 30 minutes.');
          } else if (error.message.includes('Network error') || error.message.includes('fetch')) {
            setError('Unable to connect to the server. Please check your internet connection and try again.');
          } else {
            setError(error.message || 'Login failed. Please try again.');
          }
        } else {
          setError('An unexpected error occurred. Please try again.');
        }

        return false;
      } finally {
        setIsLoading(false);
        setAuthPromise(null);
      }
    })();

    setAuthPromise(promise);
    return promise;
  };

  const register = async (email: string, password: string, name: string): Promise<boolean> => {
    // If there's already an auth request in progress, wait for it
    if (authPromise) {
      console.log('Registration request already in progress, waiting...');
      return authPromise;
    }

    const promise = (async () => {
      try {
        setError(null);
        setIsLoading(true);

        const response = await apiService.register(email, password, name);

        if (response.token && response.refreshToken && response.user) {
          localStorage.setItem('auth_token', response.token);
          localStorage.setItem('refresh_token', response.refreshToken);
          
          // CRITICAL: Clear cache before setting new user to prevent cross-user data leakage
          console.log('Clearing React Query cache on registration to ensure fresh data for new user');
          cacheUtils.clearAll();
          
          setUser(response.user);
          setSessionValidated(true);
          return true;
        }

        return false;
      } catch (error) {
        console.error('Registration failed:', error);

        // Handle specific error cases with user-friendly messages
        if (error instanceof Error) {
          const errorCode = (error as any).code;

          if (errorCode === 'USER_EXISTS' || error.message.includes('already exists')) {
            setError('An account with this email already exists. Please try logging in instead.');
          } else if (errorCode === 'VALIDATION_ERROR' || error.message.includes('validation')) {
            setError('Please check your input. Make sure your email is valid and password is at least 6 characters long.');
          } else if (error.message.includes('Network error') || error.message.includes('fetch')) {
            setError('Unable to connect to the server. Please check your internet connection and try again.');
          } else {
            setError(error.message || 'Registration failed. Please try again.');
          }
        } else {
          setError('An unexpected error occurred. Please try again.');
        }

        return false;
      } finally {
        setIsLoading(false);
        setAuthPromise(null);
      }
    })();

    setAuthPromise(promise);
    return promise;
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    setError(null);
    setIsTokenExpiring(false);
    setSessionValidated(false);
    setRefreshPromise(null);
    setAuthPromise(null);

    // CRITICAL: Clear all React Query cache to prevent cross-user data leakage
    console.log('Clearing React Query cache on logout to prevent cross-user data leakage');
    cacheUtils.clearAll();

    // Call backend logout endpoint (optional, for session cleanup)
    try {
      apiService.logout()?.catch?.(error => {
        console.error('Backend logout failed:', error);
      });
    } catch (error) {
      console.error('Backend logout failed:', error);
    }
  };

  const refreshUser = async () => {
    try {
      const response = await apiService.validateToken();
      if (response.user) {
        setUser(response.user);
        setSessionValidated(true);
      } else {
        logout();
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      logout();
    }
  };

  // Enhanced user profile update functionality
  const updateUserProfile = async (userData: Partial<User>): Promise<boolean> => {
    try {
      setError(null);
      
      const response = await apiService.updateUserProfile(userData);
      
      if (response.data) {
        // Update local user state with the updated profile
        setUser(response.data);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to update user profile:', error);
      
      // Handle specific error cases
      if (error instanceof Error) {
        const errorCode = (error as any).code;
        
        if (errorCode === 'VALIDATION_ERROR') {
          setError('Please check your input and try again.');
        } else if (errorCode === 'UNAUTHORIZED') {
          setError('Your session has expired. Please log in again.');
          logout();
        } else if (error.message.includes('Network error')) {
          setError('Unable to connect to the server. Please check your internet connection and try again.');
        } else {
          setError(error.message || 'Failed to update profile. Please try again.');
        }
      } else {
        setError('An unexpected error occurred while updating your profile.');
      }
      
      return false;
    }
  };

  // Check if user has admin privileges
  const isAdminUser = (user: User | null): boolean => {
    return user?.role === 'admin' || user?.role === 'super_admin';
  };

  // Check if user has super admin privileges
  const isSuperAdminUser = (user: User | null): boolean => {
    return user?.role === 'super_admin';
  };

  const clearError = () => {
    setError(null);
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user && sessionValidated,
    error,
    login,
    register,
    logout,
    refreshUser,
    updateUserProfile,
    clearError,
    isTokenExpiring,
    sessionValidated,
    isAdminUser: () => isAdminUser(user),
    isSuperAdminUser: () => isSuperAdminUser(user),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Main auth provider export
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <AuthContextProvider>{children}</AuthContextProvider>;
}

export default AuthProvider;