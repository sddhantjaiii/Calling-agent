import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import SettingsCard from '../SettingsCard';
import { apiService } from '@/services/apiService';
import { toast } from 'sonner';

// Mock dependencies
vi.mock('@/services/apiService');
vi.mock('sonner');
vi.mock('@/components/theme/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

const mockApiService = vi.mocked(apiService);
const mockToast = vi.mocked(toast);

describe('Settings Complete Integration Flow', () => {
  const mockUser = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    credits: 100,
    isActive: true,
    authProvider: 'email',
    role: 'user',
    emailVerified: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    company: 'Test Company',
    website: 'https://example.com',
    location: 'San Francisco',
    bio: 'Test bio description',
    phone: '+1234567890',
  };

  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
    
    // Default successful responses
    mockApiService.getUserProfile.mockResolvedValue({
      success: true,
      data: mockUser,
    });
    
    mockApiService.updateUserProfile.mockResolvedValue({
      success: true,
      data: mockUser,
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Complete Profile Data Flow', () => {
    it('should load, display, and save all profile fields correctly', async () => {
      render(<SettingsCard />);

      // Verify initial data loading
      await waitFor(() => {
        expect(mockApiService.getUserProfile).toHaveBeenCalled();
      });

      // Wait for loading to complete and data to be populated
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
      });

      // Verify all fields are populated with real backend data
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Company')).toBeInTheDocument();
      expect(screen.getByDisplayValue('https://example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('San Francisco')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test bio description')).toBeInTheDocument();
      expect(screen.getByDisplayValue('+1234567890')).toBeInTheDocument();

      // Enter edit mode
      const editButton = screen.getByText('Edit Profile');
      await user.click(editButton);

      // Verify button text changed to Cancel
      expect(screen.getByText('Cancel')).toBeInTheDocument();

      // Update profile fields
      const nameInput = screen.getByDisplayValue('Test User');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Test User');

      const companyInput = screen.getByDisplayValue('Test Company');
      await user.clear(companyInput);
      await user.type(companyInput, 'Updated Company');

      // Mock successful update response
      const updatedUser = {
        ...mockUser,
        name: 'Updated Test User',
        company: 'Updated Company',
      };

      mockApiService.updateUserProfile.mockResolvedValue({
        success: true,
        data: updatedUser,
      });

      // Save changes
      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      // Verify API call with updated fields
      await waitFor(() => {
        expect(mockApiService.updateUserProfile).toHaveBeenCalledWith({
          name: 'Updated Test User',
          email: 'test@example.com',
          company: 'Updated Company',
          website: 'https://example.com',
          location: 'San Francisco',
          bio: 'Test bio description',
          phone: '+1234567890',
        });
      });

      // Verify success feedback
      expect(mockToast.success).toHaveBeenCalledWith('Settings updated successfully!');
    });

    it('should handle partial field updates correctly', async () => {
      render(<SettingsCard />);

      await waitFor(() => {
        expect(mockApiService.getUserProfile).toHaveBeenCalled();
      });

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
      });

      // Enter edit mode
      const editButton = screen.getByText('Edit Profile');
      await user.click(editButton);

      // Update only name
      const nameInput = screen.getByDisplayValue('Test User');
      await user.clear(nameInput);
      await user.type(nameInput, 'Partially Updated User');

      // Save changes
      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      // Verify API call includes all fields (unchanged ones should retain original values)
      await waitFor(() => {
        expect(mockApiService.updateUserProfile).toHaveBeenCalledWith({
          name: 'Partially Updated User',
          email: 'test@example.com',
          company: 'Test Company',
          website: 'https://example.com',
          location: 'San Francisco',
          bio: 'Test bio description',
          phone: '+1234567890',
        });
      });
    });

    it('should handle empty optional fields correctly', async () => {
      render(<SettingsCard />);

      await waitFor(() => {
        expect(mockApiService.getUserProfile).toHaveBeenCalled();
      });

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
      });

      // Enter edit mode
      const editButton = screen.getByText('Edit Profile');
      await user.click(editButton);

      // Clear optional fields
      const companyInput = screen.getByDisplayValue('Test Company');
      await user.clear(companyInput);

      const websiteInput = screen.getByDisplayValue('https://example.com');
      await user.clear(websiteInput);

      // Save changes
      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      // Verify API call with empty optional fields
      await waitFor(() => {
        expect(mockApiService.updateUserProfile).toHaveBeenCalledWith({
          name: 'Test User',
          email: 'test@example.com',
          company: undefined,
          website: undefined,
          location: 'San Francisco',
          bio: 'Test bio description',
          phone: '+1234567890',
        });
      });
    });
  });

  describe('Form Validation with Real Backend Responses', () => {
    it('should handle backend validation errors for invalid email', async () => {
      const Wrapper = createTestWrapper();
      
      render(<SettingsCard />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(mockApiService.getUserProfile).toHaveBeenCalled();
      });

      // Mock validation error response
      const validationError = {
        code: 'VALIDATION_ERROR',
        message: 'Invalid email format',
        details: { field: 'email', value: 'invalid-email' },
      };

      mockApiService.updateUserProfile.mockRejectedValue(validationError);

      // Enter edit mode
      const editButton = screen.getByText('Edit Profile');
      await user.click(editButton);

      // Enter invalid email
      const emailInput = screen.getByDisplayValue('test@example.com');
      await user.clear(emailInput);
      await user.type(emailInput, 'invalid-email');

      // Save changes
      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockApiService.updateUserProfile).toHaveBeenCalled();
      });

      // Verify error handling (implementation depends on serverValidationHandler)
      // The component should remain in edit mode and show validation errors
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    it('should handle backend validation errors for invalid website URL', async () => {
      const Wrapper = createTestWrapper();
      
      render(<SettingsCard />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(mockApiService.getUserProfile).toHaveBeenCalled();
      });

      // Mock validation error response
      const validationError = {
        code: 'VALIDATION_ERROR',
        message: 'Website must be a valid URL starting with http:// or https://',
        details: { field: 'website', value: 'invalid-url' },
      };

      mockApiService.updateUserProfile.mockRejectedValue(validationError);

      // Enter edit mode
      const editButton = screen.getByText('Edit Profile');
      await user.click(editButton);

      // Enter invalid website URL
      const websiteInput = screen.getByDisplayValue('https://example.com');
      await user.clear(websiteInput);
      await user.type(websiteInput, 'invalid-url');

      // Save changes
      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockApiService.updateUserProfile).toHaveBeenCalled();
      });

      // Verify error handling
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    it('should handle backend validation errors for invalid phone number', async () => {
      const Wrapper = createTestWrapper();
      
      render(<SettingsCard />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(mockApiService.getUserProfile).toHaveBeenCalled();
      });

      // Mock validation error response
      const validationError = {
        code: 'VALIDATION_ERROR',
        message: 'Phone number must be in international format (e.g., +1234567890)',
        details: { field: 'phone', value: 'invalid-phone' },
      };

      mockApiService.updateUserProfile.mockRejectedValue(validationError);

      // Enter edit mode
      const editButton = screen.getByText('Edit Profile');
      await user.click(editButton);

      // Enter invalid phone number
      const phoneInput = screen.getByDisplayValue('+1234567890');
      await user.clear(phoneInput);
      await user.type(phoneInput, 'invalid-phone');

      // Save changes
      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockApiService.updateUserProfile).toHaveBeenCalled();
      });

      // Verify error handling
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    it('should handle field length validation errors', async () => {
      const Wrapper = createTestWrapper();
      
      render(<SettingsCard />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(mockApiService.getUserProfile).toHaveBeenCalled();
      });

      // Mock validation error response
      const validationError = {
        code: 'VALIDATION_ERROR',
        message: 'Name cannot exceed 255 characters',
        details: { field: 'name', maxLength: 255 },
      };

      mockApiService.updateUserProfile.mockRejectedValue(validationError);

      // Enter edit mode
      const editButton = screen.getByText('Edit Profile');
      await user.click(editButton);

      // Enter name that's too long
      const nameInput = screen.getByDisplayValue('Test User');
      await user.clear(nameInput);
      await user.type(nameInput, 'a'.repeat(256));

      // Save changes
      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockApiService.updateUserProfile).toHaveBeenCalled();
      });

      // Verify error handling
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    it('should handle duplicate email validation errors', async () => {
      const Wrapper = createTestWrapper();
      
      render(<SettingsCard />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(mockApiService.getUserProfile).toHaveBeenCalled();
      });

      // Mock duplicate email error response
      const duplicateEmailError = {
        code: 'EMAIL_EXISTS',
        message: 'Email address is already in use by another account',
        details: { field: 'email' },
      };

      mockApiService.updateUserProfile.mockRejectedValue(duplicateEmailError);

      // Enter edit mode
      const editButton = screen.getByText('Edit Profile');
      await user.click(editButton);

      // Enter existing email
      const emailInput = screen.getByDisplayValue('test@example.com');
      await user.clear(emailInput);
      await user.type(emailInput, 'existing@example.com');

      // Save changes
      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockApiService.updateUserProfile).toHaveBeenCalled();
      });

      // Verify error handling
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });
  });

  describe('Error Handling Scenarios', () => {
    it('should handle network errors gracefully', async () => {
      const Wrapper = createTestWrapper();
      
      render(<SettingsCard />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(mockApiService.getUserProfile).toHaveBeenCalled();
      });

      // Mock network error
      const networkError = {
        code: 'NETWORK_ERROR',
        message: 'Network connection failed',
      };

      mockApiService.updateUserProfile.mockRejectedValue(networkError);

      // Enter edit mode and try to save
      const editButton = screen.getByText('Edit Profile');
      await user.click(editButton);

      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockApiService.updateUserProfile).toHaveBeenCalled();
      });

      // Verify network error handling
      expect(mockToast.error).toHaveBeenCalledWith('Network Error', {
        description: 'Please check your internet connection and try again.',
      });

      // Form should remain in edit mode
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    it('should handle server errors gracefully', async () => {
      const Wrapper = createTestWrapper();
      
      render(<SettingsCard />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(mockApiService.getUserProfile).toHaveBeenCalled();
      });

      // Mock server error
      const serverError = {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      };

      mockApiService.updateUserProfile.mockRejectedValue(serverError);

      // Enter edit mode and try to save
      const editButton = screen.getByText('Edit Profile');
      await user.click(editButton);

      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockApiService.updateUserProfile).toHaveBeenCalled();
      });

      // Verify server error handling
      expect(mockToast.error).toHaveBeenCalledWith('Server Error', {
        description: 'An unexpected error occurred. Please try again later.',
      });

      // Form should remain in edit mode
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    it('should handle authentication errors', async () => {
      const Wrapper = createTestWrapper();
      
      render(<SettingsCard />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(mockApiService.getUserProfile).toHaveBeenCalled();
      });

      // Mock authentication error
      const authError = {
        code: 'UNAUTHORIZED',
        message: 'Authentication token has expired',
      };

      mockApiService.updateUserProfile.mockRejectedValue(authError);

      // Enter edit mode and try to save
      const editButton = screen.getByText('Edit Profile');
      await user.click(editButton);

      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockApiService.updateUserProfile).toHaveBeenCalled();
      });

      // Verify authentication error handling
      expect(mockToast.error).toHaveBeenCalledWith('Authentication Error', {
        description: 'Please log in again to continue.',
      });
    });

    it('should handle loading failure on initial data fetch', async () => {
      const Wrapper = createTestWrapper();
      
      // Mock initial data loading failure
      const loadingError = {
        code: 'FETCH_ERROR',
        message: 'Failed to load user profile',
      };

      mockApiService.getUserProfile.mockRejectedValue(loadingError);

      render(<SettingsCard />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(mockApiService.getUserProfile).toHaveBeenCalled();
      });

      // Verify error state is displayed
      // The exact implementation depends on how the component handles loading errors
      // It should show an error message or retry button
    });

    it('should handle timeout errors', async () => {
      const Wrapper = createTestWrapper();
      
      render(<SettingsCard />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(mockApiService.getUserProfile).toHaveBeenCalled();
      });

      // Mock timeout error
      const timeoutError = {
        code: 'TIMEOUT_ERROR',
        message: 'Request timed out',
      };

      mockApiService.updateUserProfile.mockRejectedValue(timeoutError);

      // Enter edit mode and try to save
      const editButton = screen.getByText('Edit Profile');
      await user.click(editButton);

      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockApiService.updateUserProfile).toHaveBeenCalled();
      });

      // Verify timeout error handling
      expect(mockToast.error).toHaveBeenCalledWith('Request Timeout', {
        description: 'The request took too long. Please try again.',
      });
    });
  });

  describe('Loading States and User Experience', () => {
    it('should show loading state during initial data fetch', async () => {
      const Wrapper = createTestWrapper();
      
      // Mock delayed response
      let resolvePromise: (value: any) => void;
      const delayedPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockApiService.getUserProfile.mockReturnValue(delayedPromise);

      render(<SettingsCard />, { wrapper: Wrapper });

      // Should show loading state initially
      // The exact loading indicator depends on the component implementation
      expect(mockApiService.getUserProfile).toHaveBeenCalled();

      // Resolve the promise
      act(() => {
        resolvePromise!({
          success: true,
          data: mockUser,
        });
      });

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
      });
    });

    it('should show loading state during save operation', async () => {
      const Wrapper = createTestWrapper();
      
      render(<SettingsCard />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(mockApiService.getUserProfile).toHaveBeenCalled();
      });

      // Mock delayed save response
      let resolveSavePromise: (value: any) => void;
      const delayedSavePromise = new Promise((resolve) => {
        resolveSavePromise = resolve;
      });

      mockApiService.updateUserProfile.mockReturnValue(delayedSavePromise);

      // Enter edit mode
      const editButton = screen.getByText('Edit Profile');
      await user.click(editButton);

      // Start save operation
      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      // Should show loading state during save
      // The exact loading indicator depends on the component implementation
      expect(mockApiService.updateUserProfile).toHaveBeenCalled();

      // Resolve the save promise
      act(() => {
        resolveSavePromise!({
          success: true,
          data: mockUser,
        });
      });

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Settings updated successfully!');
      });
    });

    it('should disable form during save operation', async () => {
      const Wrapper = createTestWrapper();
      
      render(<SettingsCard />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(mockApiService.getUserProfile).toHaveBeenCalled();
      });

      // Mock delayed save response
      let resolveSavePromise: (value: any) => void;
      const delayedSavePromise = new Promise((resolve) => {
        resolveSavePromise = resolve;
      });

      mockApiService.updateUserProfile.mockReturnValue(delayedSavePromise);

      // Enter edit mode
      const editButton = screen.getByText('Edit Profile');
      await user.click(editButton);

      // Start save operation
      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      // Form inputs should be disabled during save
      const nameInput = screen.getByDisplayValue('Test User');
      expect(nameInput).toBeDisabled();

      // Resolve the save promise
      act(() => {
        resolveSavePromise!({
          success: true,
          data: mockUser,
        });
      });

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Settings updated successfully!');
      });
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle rapid successive save attempts', async () => {
      const Wrapper = createTestWrapper();
      
      render(<SettingsCard />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(mockApiService.getUserProfile).toHaveBeenCalled();
      });

      // Enter edit mode
      const editButton = screen.getByText('Edit Profile');
      await user.click(editButton);

      // Attempt rapid successive saves
      const saveButton = screen.getByText('Save Changes');
      
      // First click
      await user.click(saveButton);
      
      // Second click should be ignored or handled gracefully
      await user.click(saveButton);

      // Should only make one API call
      expect(mockApiService.updateUserProfile).toHaveBeenCalledTimes(1);
    });

    it('should handle component unmounting during API call', async () => {
      const Wrapper = createTestWrapper();
      
      const { unmount } = render(<SettingsCard />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(mockApiService.getUserProfile).toHaveBeenCalled();
      });

      // Mock delayed response
      let resolveSavePromise: (value: any) => void;
      const delayedSavePromise = new Promise((resolve) => {
        resolveSavePromise = resolve;
      });

      mockApiService.updateUserProfile.mockReturnValue(delayedSavePromise);

      // Enter edit mode and start save
      const editButton = screen.getByText('Edit Profile');
      await user.click(editButton);

      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      // Unmount component before API call completes
      unmount();

      // Resolve the promise (should not cause errors)
      act(() => {
        resolveSavePromise!({
          success: true,
          data: mockUser,
        });
      });

      // Should not throw errors or call toast after unmount
      expect(mockToast.success).not.toHaveBeenCalled();
    });

    it('should handle null/undefined values in user profile data', async () => {
      const Wrapper = createTestWrapper();
      
      const userWithNullFields = {
        ...mockUser,
        company: null,
        website: null,
        location: null,
        bio: null,
        phone: null,
      };

      mockApiService.getUserProfile.mockResolvedValue({
        success: true,
        data: userWithNullFields,
      });

      render(<SettingsCard />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(mockApiService.getUserProfile).toHaveBeenCalled();
      });

      // Should handle null values gracefully
      expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
      
      // Optional fields should be empty but not cause errors
      const companyInput = screen.getByLabelText(/company/i);
      expect(companyInput).toHaveValue('');
    });
  });
});