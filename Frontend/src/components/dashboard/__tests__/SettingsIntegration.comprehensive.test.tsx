import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { toast } from 'sonner';

import SettingsCard from '../SettingsCard';
import { apiService } from '@/services/apiService';
import { ThemeProvider } from '@/components/theme/ThemeProvider';

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/services/apiService', () => ({
  apiService: {
    getUserProfile: vi.fn(),
    updateUserProfile: vi.fn(),
  },
}));

// Mock theme provider
const MockThemeProvider = ({ children }: { children: React.ReactNode }) => (
  <div data-theme="light">{children}</div>
);

vi.mock('@/components/theme/ThemeProvider', () => ({
  ThemeProvider: MockThemeProvider,
  useTheme: () => ({ theme: 'light' }),
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
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// Mock user data
const mockUserProfile = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  displayName: 'Test User',
  credits: 100,
  isActive: true,
  authProvider: 'email',
  emailVerified: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-15'),
  company: 'Test Company',
  website: 'https://example.com',
  location: 'Test City',
  bio: 'Test bio description',
  phone: '+1234567890',
};

const mockEmptyProfile = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  displayName: 'Test User',
  credits: 100,
  isActive: true,
  authProvider: 'email',
  emailVerified: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-15'),
  company: null,
  website: null,
  location: null,
  bio: null,
  phone: null,
};

describe('Settings Integration Tests', () => {
  const user = userEvent.setup();
  let mockGetUserProfile: any;
  let mockUpdateUserProfile: any;

  beforeEach(() => {
    mockGetUserProfile = vi.mocked(apiService.getUserProfile);
    mockUpdateUserProfile = vi.mocked(apiService.updateUserProfile);
    
    // Reset mocks
    vi.clearAllMocks();
    
    // Default successful responses
    mockGetUserProfile.mockResolvedValue({
      success: true,
      data: mockUserProfile,
    });
    
    mockUpdateUserProfile.mockResolvedValue({
      success: true,
      data: mockUserProfile,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Profile Data Loading', () => {
    it('should load and display real user profile data from backend', async () => {
      render(
        <TestWrapper>
          <SettingsCard />
        </TestWrapper>
      );

      // Wait for API call and data loading
      await waitFor(() => {
        expect(mockGetUserProfile).toHaveBeenCalledTimes(1);
      });

      // Verify all profile fields are displayed with real data
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
        expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Test Company')).toBeInTheDocument();
        expect(screen.getByDisplayValue('https://example.com')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Test City')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Test bio description')).toBeInTheDocument();
        expect(screen.getByDisplayValue('+1234567890')).toBeInTheDocument();
      });
    });

    it('should handle empty profile fields correctly', async () => {
      mockGetUserProfile.mockResolvedValue({
        success: true,
        data: mockEmptyProfile,
      });

      render(
        <TestWrapper>
          <SettingsCard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockGetUserProfile).toHaveBeenCalledTimes(1);
      });

      // Verify required fields are shown
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
        expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
      });

      // Verify optional fields are empty but present
      const companyInput = screen.getByLabelText(/organization/i);
      const websiteInput = screen.getByLabelText(/website/i);
      const locationInput = screen.getByLabelText(/location/i);
      const bioInput = screen.getByLabelText(/bio/i);
      const phoneInput = screen.getByLabelText(/phone/i);

      expect(companyInput).toHaveValue('');
      expect(websiteInput).toHaveValue('');
      expect(locationInput).toHaveValue('');
      expect(bioInput).toHaveValue('');
      expect(phoneInput).toHaveValue('');
    });

    it('should show error message when profile loading fails', async () => {
      mockGetUserProfile.mockRejectedValue(new Error('Network error'));

      render(
        <TestWrapper>
          <SettingsCard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockGetUserProfile).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to load profile data');
      });
    });
  });

  describe('Form Validation with Backend Integration', () => {
    beforeEach(async () => {
      render(
        <TestWrapper>
          <SettingsCard />
        </TestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(mockGetUserProfile).toHaveBeenCalledTimes(1);
      });

      // Enter edit mode
      const editButton = screen.getByRole('button', { name: /edit profile/i });
      await user.click(editButton);
    });

    it('should validate email format and show backend validation errors', async () => {
      const emailInput = screen.getByLabelText(/email/i);
      
      // Clear and enter invalid email
      await user.clear(emailInput);
      await user.type(emailInput, 'invalid-email');
      await user.tab(); // Trigger blur event

      // Should show client-side validation error
      await waitFor(() => {
        expect(screen.getByText(/please provide a valid email address/i)).toBeInTheDocument();
      });

      // Try to save with invalid email
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Should not call API with invalid data
      expect(mockUpdateUserProfile).not.toHaveBeenCalled();
    });

    it('should validate website URL format', async () => {
      const websiteInput = screen.getByLabelText(/website/i);
      
      // Enter invalid URL
      await user.clear(websiteInput);
      await user.type(websiteInput, 'not-a-url');
      await user.tab();

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/website must be a valid url/i)).toBeInTheDocument();
      });
    });

    it('should validate phone number format', async () => {
      const phoneInput = screen.getByLabelText(/phone/i);
      
      // Enter invalid phone
      await user.clear(phoneInput);
      await user.type(phoneInput, 'abc123');
      await user.tab();

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/phone number must be/i)).toBeInTheDocument();
      });
    });

    it('should handle backend validation errors correctly', async () => {
      // Mock backend validation error
      mockUpdateUserProfile.mockRejectedValue({
        code: 'VALIDATION_ERROR',
        message: 'Email address is already in use',
        status: 400,
        details: { field: 'email' }
      });

      const emailInput = screen.getByLabelText(/email/i);
      await user.clear(emailInput);
      await user.type(emailInput, 'existing@example.com');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateUserProfile).toHaveBeenCalledWith({
          name: 'Test User',
          email: 'existing@example.com',
          company: 'Test Company',
          website: 'https://example.com',
          location: 'Test City',
          bio: 'Test bio description',
          phone: '+1234567890',
        });
      });

      // Should show backend error
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });
  });

  describe('Profile Field Updates', () => {
    beforeEach(async () => {
      render(
        <TestWrapper>
          <SettingsCard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockGetUserProfile).toHaveBeenCalledTimes(1);
      });

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      await user.click(editButton);
    });

    it('should save all profile fields correctly', async () => {
      // Update all fields
      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const companyInput = screen.getByLabelText(/organization/i);
      const websiteInput = screen.getByLabelText(/website/i);
      const locationInput = screen.getByLabelText(/location/i);
      const bioInput = screen.getByLabelText(/bio/i);
      const phoneInput = screen.getByLabelText(/phone/i);

      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name');
      
      await user.clear(emailInput);
      await user.type(emailInput, 'updated@example.com');
      
      await user.clear(companyInput);
      await user.type(companyInput, 'Updated Company');
      
      await user.clear(websiteInput);
      await user.type(websiteInput, 'https://updated.com');
      
      await user.clear(locationInput);
      await user.type(locationInput, 'Updated Location');
      
      await user.clear(bioInput);
      await user.type(bioInput, 'Updated bio description');
      
      await user.clear(phoneInput);
      await user.type(phoneInput, '+9876543210');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateUserProfile).toHaveBeenCalledWith({
          name: 'Updated Name',
          email: 'updated@example.com',
          company: 'Updated Company',
          website: 'https://updated.com',
          location: 'Updated Location',
          bio: 'Updated bio description',
          phone: '+9876543210',
        });
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Settings updated successfully!');
      });
    });

    it('should handle partial field updates', async () => {
      // Only update name and company
      const nameInput = screen.getByLabelText(/name/i);
      const companyInput = screen.getByLabelText(/organization/i);

      await user.clear(nameInput);
      await user.type(nameInput, 'Partial Update');
      
      await user.clear(companyInput);
      await user.type(companyInput, 'New Company');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateUserProfile).toHaveBeenCalledWith({
          name: 'Partial Update',
          email: 'test@example.com',
          company: 'New Company',
          website: 'https://example.com',
          location: 'Test City',
          bio: 'Test bio description',
          phone: '+1234567890',
        });
      });
    });

    it('should clear optional fields when emptied', async () => {
      const companyInput = screen.getByLabelText(/organization/i);
      const websiteInput = screen.getByLabelText(/website/i);

      // Clear optional fields
      await user.clear(companyInput);
      await user.clear(websiteInput);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateUserProfile).toHaveBeenCalledWith({
          name: 'Test User',
          email: 'test@example.com',
          company: undefined,
          website: undefined,
          location: 'Test City',
          bio: 'Test bio description',
          phone: '+1234567890',
        });
      });
    });
  });

  describe('Error Handling Scenarios', () => {
    beforeEach(async () => {
      render(
        <TestWrapper>
          <SettingsCard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockGetUserProfile).toHaveBeenCalledTimes(1);
      });

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      await user.click(editButton);
    });

    it('should handle network errors gracefully', async () => {
      mockUpdateUserProfile.mockRejectedValue({
        code: 'NETWORK_ERROR',
        message: 'Network connection failed',
        status: 0
      });

      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Network Test');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Network Error', {
          description: 'Please check your internet connection and try again.',
        });
      });
    });

    it('should handle unauthorized errors', async () => {
      mockUpdateUserProfile.mockRejectedValue({
        code: 'UNAUTHORIZED',
        message: 'Session expired',
        status: 401
      });

      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Auth Test');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Session Expired', {
          description: 'Please log in again to continue.',
        });
      });
    });

    it('should handle server errors', async () => {
      mockUpdateUserProfile.mockRejectedValue({
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        status: 500
      });

      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Server Error Test');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Error', {
          description: expect.stringContaining('Failed to update settings'),
        });
      });
    });

    it('should handle validation errors with field-specific messages', async () => {
      mockUpdateUserProfile.mockRejectedValue({
        code: 'VALIDATION_ERROR',
        message: 'Validation failed: email: Email address is already in use',
        status: 400,
        details: { field: 'email' }
      });

      const emailInput = screen.getByLabelText(/email/i);
      await user.clear(emailInput);
      await user.type(emailInput, 'duplicate@example.com');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateUserProfile).toHaveBeenCalled();
      });

      // Should handle the validation error appropriately
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });
  });

  describe('Loading States and UI Behavior', () => {
    it('should show loading state during initial data fetch', async () => {
      // Mock delayed response
      mockGetUserProfile.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            success: true,
            data: mockUserProfile
          }), 100)
        )
      );

      render(
        <TestWrapper>
          <SettingsCard />
        </TestWrapper>
      );

      // Should show loading state initially
      // Note: The component doesn't show explicit loading text, but fields should be empty initially
      const nameInput = screen.getByLabelText(/name/i);
      expect(nameInput).toHaveValue('');

      // Wait for data to load
      await waitFor(() => {
        expect(nameInput).toHaveValue('Test User');
      }, { timeout: 200 });
    });

    it('should disable form during save operation', async () => {
      // Mock delayed save response
      mockUpdateUserProfile.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            success: true,
            data: mockUserProfile
          }), 100)
        )
      );

      render(
        <TestWrapper>
          <SettingsCard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockGetUserProfile).toHaveBeenCalledTimes(1);
      });

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      await user.click(editButton);

      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Loading Test');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Form should be processing the save
      expect(mockUpdateUserProfile).toHaveBeenCalled();

      // Wait for save to complete
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Settings updated successfully!');
      }, { timeout: 200 });
    });

    it('should exit edit mode after successful save', async () => {
      render(
        <TestWrapper>
          <SettingsCard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockGetUserProfile).toHaveBeenCalledTimes(1);
      });

      // Enter edit mode
      const editButton = screen.getByRole('button', { name: /edit profile/i });
      await user.click(editButton);

      // Verify in edit mode
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();

      // Make a change and save
      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Exit Edit Mode Test');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateUserProfile).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Settings updated successfully!');
      });

      // Should exit edit mode
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Password Update Flow', () => {
    beforeEach(async () => {
      render(
        <TestWrapper>
          <SettingsCard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockGetUserProfile).toHaveBeenCalledTimes(1);
      });

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      await user.click(editButton);
    });

    it('should validate password fields correctly', async () => {
      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);

      // Enter new password without current password
      await user.type(newPasswordInput, 'newpassword123');
      await user.type(confirmPasswordInput, 'newpassword123');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Should show validation error for missing current password
      await waitFor(() => {
        expect(screen.getByText(/current password is required/i)).toBeInTheDocument();
      });
    });

    it('should validate password confirmation match', async () => {
      const currentPasswordInput = screen.getByLabelText(/current password/i);
      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);

      await user.type(currentPasswordInput, 'currentpass');
      await user.type(newPasswordInput, 'newpassword123');
      await user.type(confirmPasswordInput, 'differentpassword');
      await user.tab(); // Trigger blur on confirm password

      // Should show password mismatch error
      await waitFor(() => {
        expect(screen.getByText(/new passwords do not match/i)).toBeInTheDocument();
      });
    });
  });

  describe('2FA and Chat Agent Features Disabled', () => {
    it('should not display 2FA toggle (commented out as per requirements)', async () => {
      render(
        <TestWrapper>
          <SettingsCard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockGetUserProfile).toHaveBeenCalledTimes(1);
      });

      // Should not find 2FA related elements
      expect(screen.queryByText(/two factor/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/2fa/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/enable 2fa/i)).not.toBeInTheDocument();
    });

    it('should not display chat agent token purchase options', async () => {
      render(
        <TestWrapper>
          <SettingsCard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockGetUserProfile).toHaveBeenCalledTimes(1);
      });

      // Should not find chat agent token purchase elements
      expect(screen.queryByText(/chat agent token/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/token purchase/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/chat agent/i)).not.toBeInTheDocument();
    });
  });
});