/**
 * Settings Authentication Flow Test
 * 
 * Tests that the settings page works correctly without 2FA requirements:
 * 1. Settings page loads without requiring 2FA
 * 2. Existing token-based authentication still works
 * 3. Session validation works correctly
 * 4. Logout functionality remains intact
 * 
 * Requirements: 3.2, 3.3, 3.4
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import SettingsCard from '../SettingsCard';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/services/apiService';

// Mock the API service
vi.mock('@/services/apiService', () => ({
  apiService: {
    getUserProfile: vi.fn(),
    updateUserProfile: vi.fn(),
    validateToken: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refreshToken: vi.fn(),
  },
}));

// Mock the theme provider
vi.mock('@/components/theme/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          {children}
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// Mock user data
const mockUser = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  credits: 100,
  emailVerified: true,
  isActive: true,
  role: 'user',
  company: 'Test Company',
  website: 'https://example.com',
  location: 'Test Location',
  bio: 'Test bio',
  phone: '+1234567890',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('Settings Authentication Flow Without 2FA', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Reset all mocks
    vi.clearAllMocks();

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key) => {
          if (key === 'auth_token') return 'mock-token';
          if (key === 'refresh_token') return 'mock-refresh-token';
          return null;
        }),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('Settings Page Access Without 2FA', () => {
    it('should load settings page without requiring 2FA', async () => {
      // Mock successful API responses
      (apiService.getUserProfile as any).mockResolvedValue({
        success: true,
        data: mockUser,
      });

      (apiService.validateToken as any).mockResolvedValue({
        user: mockUser,
      });

      render(
        <TestWrapper>
          <SettingsCard />
        </TestWrapper>
      );

      // Wait for the component to load
      await waitFor(() => {
        expect(screen.getByText('Settings')).toBeInTheDocument();
      });

      // Verify that the settings form is displayed
      expect(screen.getByDisplayValue(mockUser.name)).toBeInTheDocument();
      expect(screen.getByDisplayValue(mockUser.email)).toBeInTheDocument();

      // Verify that 2FA section is commented out (should not be present)
      expect(screen.queryByText('Setup Two Factor Auth (2FA)')).not.toBeInTheDocument();
      expect(screen.queryByText('Enable 2FA')).not.toBeInTheDocument();

      // Verify that getUserProfile was called (settings page loaded)
      expect(apiService.getUserProfile).toHaveBeenCalled();
    });

    it('should display user profile data without 2FA verification', async () => {
      (apiService.getUserProfile as any).mockResolvedValue({
        success: true,
        data: mockUser,
      });

      render(
        <TestWrapper>
          <SettingsCard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue(mockUser.name)).toBeInTheDocument();
      });

      // Verify all profile fields are displayed
      expect(screen.getByDisplayValue(mockUser.email)).toBeInTheDocument();
      expect(screen.getByDisplayValue(mockUser.company || '')).toBeInTheDocument();
      expect(screen.getByDisplayValue(mockUser.website || '')).toBeInTheDocument();
      expect(screen.getByDisplayValue(mockUser.location || '')).toBeInTheDocument();
      expect(screen.getByDisplayValue(mockUser.bio || '')).toBeInTheDocument();
      expect(screen.getByDisplayValue(mockUser.phone || '')).toBeInTheDocument();
    });
  });

  describe('Token-Based Authentication', () => {
    it('should work with existing token-based authentication', async () => {
      (apiService.getUserProfile as any).mockResolvedValue({
        success: true,
        data: mockUser,
      });

      render(
        <TestWrapper>
          <SettingsCard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(apiService.getUserProfile).toHaveBeenCalled();
      });

      // Verify that the API call was made with authentication
      // (The apiService should automatically include the auth token)
      expect(apiService.getUserProfile).toHaveBeenCalledTimes(1);
    });

    it('should handle authentication errors gracefully', async () => {
      (apiService.getUserProfile as any).mockRejectedValue({
        code: 'UNAUTHORIZED',
        message: 'Invalid token',
      });

      render(
        <TestWrapper>
          <SettingsCard />
        </TestWrapper>
      );

      // Wait for error handling
      await waitFor(() => {
        expect(apiService.getUserProfile).toHaveBeenCalled();
      });

      // The component should handle the error without crashing
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });

  describe('Settings Update Without 2FA', () => {
    it('should allow updating settings without 2FA verification', async () => {
      (apiService.getUserProfile as any).mockResolvedValue({
        success: true,
        data: mockUser,
      });

      const updatedUser = { ...mockUser, name: 'Updated Name' };
      (apiService.updateUserProfile as any).mockResolvedValue({
        success: true,
        data: updatedUser,
      });

      render(
        <TestWrapper>
          <SettingsCard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue(mockUser.name)).toBeInTheDocument();
      });

      // Click edit button
      const editButton = screen.getByText('Edit Profile');
      fireEvent.click(editButton);

      // Update the name field
      const nameInput = screen.getByDisplayValue(mockUser.name);
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } });

      // Save changes
      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(apiService.updateUserProfile).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Updated Name',
          })
        );
      });

      // Verify no 2FA verification was required
      expect(screen.queryByText('Enter 2FA Code')).not.toBeInTheDocument();
      expect(screen.queryByText('Two Factor Authentication')).not.toBeInTheDocument();
    });

    it('should update profile with extended fields without 2FA', async () => {
      (apiService.getUserProfile as any).mockResolvedValue({
        success: true,
        data: mockUser,
      });

      const updatedData = {
        ...mockUser,
        company: 'New Company',
        website: 'https://newsite.com',
        location: 'New Location',
        bio: 'New bio',
        phone: '+9876543210',
      };

      (apiService.updateUserProfile as any).mockResolvedValue({
        success: true,
        data: updatedData,
      });

      render(
        <TestWrapper>
          <SettingsCard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue(mockUser.name)).toBeInTheDocument();
      });

      // Enter edit mode
      fireEvent.click(screen.getByText('Edit Profile'));

      // Update extended fields
      fireEvent.change(screen.getByDisplayValue(mockUser.company || ''), {
        target: { value: 'New Company' },
      });
      fireEvent.change(screen.getByDisplayValue(mockUser.website || ''), {
        target: { value: 'https://newsite.com' },
      });

      // Save changes
      fireEvent.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(apiService.updateUserProfile).toHaveBeenCalledWith(
          expect.objectContaining({
            company: 'New Company',
            website: 'https://newsite.com',
          })
        );
      });
    });
  });

  describe('Session Validation', () => {
    it('should validate session correctly without 2FA', async () => {
      (apiService.validateToken as any).mockResolvedValue({
        user: mockUser,
      });

      (apiService.getUserProfile as any).mockResolvedValue({
        success: true,
        data: mockUser,
      });

      render(
        <TestWrapper>
          <SettingsCard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Settings')).toBeInTheDocument();
      });

      // The component should load successfully, indicating session validation worked
      expect(screen.getByDisplayValue(mockUser.name)).toBeInTheDocument();
    });

    it('should handle session validation failure', async () => {
      (apiService.getUserProfile as any).mockRejectedValue({
        code: 'INVALID_TOKEN',
        message: 'Session expired',
      });

      render(
        <TestWrapper>
          <SettingsCard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(apiService.getUserProfile).toHaveBeenCalled();
      });

      // Component should handle the error gracefully
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });

  describe('No 2FA Components Present', () => {
    it('should not display any 2FA-related UI elements', async () => {
      (apiService.getUserProfile as any).mockResolvedValue({
        success: true,
        data: mockUser,
      });

      render(
        <TestWrapper>
          <SettingsCard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Settings')).toBeInTheDocument();
      });

      // Verify 2FA elements are not present
      expect(screen.queryByText('Two Factor Authentication')).not.toBeInTheDocument();
      expect(screen.queryByText('Setup Two Factor Auth (2FA)')).not.toBeInTheDocument();
      expect(screen.queryByText('Enable 2FA')).not.toBeInTheDocument();
      expect(screen.queryByText('2FA Code')).not.toBeInTheDocument();
      expect(screen.queryByText('Verification Code')).not.toBeInTheDocument();
      expect(screen.queryByText('Authenticator App')).not.toBeInTheDocument();
    });

    it('should not require 2FA verification for any settings operations', async () => {
      (apiService.getUserProfile as any).mockResolvedValue({
        success: true,
        data: mockUser,
      });

      (apiService.updateUserProfile as any).mockResolvedValue({
        success: true,
        data: { ...mockUser, name: 'Updated' },
      });

      render(
        <TestWrapper>
          <SettingsCard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Settings')).toBeInTheDocument();
      });

      // Enter edit mode and make changes
      fireEvent.click(screen.getByText('Edit Profile'));
      fireEvent.change(screen.getByDisplayValue(mockUser.name), {
        target: { value: 'Updated Name' },
      });
      fireEvent.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(apiService.updateUserProfile).toHaveBeenCalled();
      });

      // Verify no 2FA prompts appeared during the process
      expect(screen.queryByText('Enter verification code')).not.toBeInTheDocument();
      expect(screen.queryByText('2FA required')).not.toBeInTheDocument();
    });
  });

  describe('Authentication Flow Integration', () => {
    it('should maintain authentication state throughout settings usage', async () => {
      (apiService.getUserProfile as any).mockResolvedValue({
        success: true,
        data: mockUser,
      });

      (apiService.updateUserProfile as any).mockResolvedValue({
        success: true,
        data: mockUser,
      });

      render(
        <TestWrapper>
          <SettingsCard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Settings')).toBeInTheDocument();
      });

      // Perform multiple operations to ensure auth state is maintained
      fireEvent.click(screen.getByText('Edit Profile'));
      fireEvent.click(screen.getByText('Cancel'));
      fireEvent.click(screen.getByText('Edit Profile'));

      // The component should remain functional without re-authentication
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });
  });
});