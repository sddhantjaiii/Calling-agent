import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
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

describe('Settings Integration Core Tests', () => {
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

  describe('Requirement 1.1: Settings page displays real data from backend', () => {
    it('should fetch and display user profile data from backend API', async () => {
      render(<SettingsCard />);

      // Verify API call is made
      expect(mockApiService.getUserProfile).toHaveBeenCalled();

      // Wait for data to load and verify all fields are populated
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
      });

      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Company')).toBeInTheDocument();
      expect(screen.getByDisplayValue('https://example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('San Francisco')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test bio description')).toBeInTheDocument();
      expect(screen.getByDisplayValue('+1234567890')).toBeInTheDocument();
    });

    it('should handle null/empty extended profile fields', async () => {
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

      render(<SettingsCard />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
      });

      // Required fields should still be populated
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
      
      // Optional fields should be empty but not cause errors
      const companyInput = screen.getByLabelText(/organization/i);
      expect(companyInput).toHaveValue('');
    });
  });

  describe('Requirement 1.2: Save changes to backend database', () => {
    it('should save profile changes to backend when form is submitted', async () => {
      render(<SettingsCard />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
      });

      // Enter edit mode
      const editButton = screen.getByText('Edit Profile');
      await user.click(editButton);

      // Update a field
      const nameInput = screen.getByDisplayValue('Test User');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated User');

      // Save changes
      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      // Verify API call with updated data
      await waitFor(() => {
        expect(mockApiService.updateUserProfile).toHaveBeenCalledWith({
          name: 'Updated User',
          email: 'test@example.com',
          company: 'Test Company',
          website: 'https://example.com',
          location: 'San Francisco',
          bio: 'Test bio description',
          phone: '+1234567890',
        });
      });

      expect(mockToast.success).toHaveBeenCalledWith('Settings updated successfully!');
    });

    it('should save all extended profile fields correctly', async () => {
      render(<SettingsCard />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
      });

      // Enter edit mode
      const editButton = screen.getByText('Edit Profile');
      await user.click(editButton);

      // Update multiple fields
      const nameInput = screen.getByDisplayValue('Test User');
      await user.clear(nameInput);
      await user.type(nameInput, 'New Name');

      const companyInput = screen.getByDisplayValue('Test Company');
      await user.clear(companyInput);
      await user.type(companyInput, 'New Company');

      // Save changes
      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      // Verify all fields are included in the API call
      await waitFor(() => {
        expect(mockApiService.updateUserProfile).toHaveBeenCalledWith({
          name: 'New Name',
          email: 'test@example.com',
          company: 'New Company',
          website: 'https://example.com',
          location: 'San Francisco',
          bio: 'Test bio description',
          phone: '+1234567890',
        });
      });
    });
  });

  describe('Requirement 1.3: Form validation with real backend responses', () => {
    it('should handle backend validation errors for invalid email', async () => {
      const validationError = {
        code: 'VALIDATION_ERROR',
        message: 'Invalid email format',
        details: { field: 'email' },
      };

      mockApiService.updateUserProfile.mockRejectedValue(validationError);

      render(<SettingsCard />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
      });

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

      // Form should remain in edit mode after validation error
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    it('should handle backend validation errors for invalid website URL', async () => {
      const validationError = {
        code: 'VALIDATION_ERROR',
        message: 'Website must be a valid URL',
        details: { field: 'website' },
      };

      mockApiService.updateUserProfile.mockRejectedValue(validationError);

      render(<SettingsCard />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
      });

      // Enter edit mode
      const editButton = screen.getByText('Edit Profile');
      await user.click(editButton);

      // Enter invalid website
      const websiteInput = screen.getByDisplayValue('https://example.com');
      await user.clear(websiteInput);
      await user.type(websiteInput, 'invalid-url');

      // Save changes
      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockApiService.updateUserProfile).toHaveBeenCalled();
      });

      // Form should remain in edit mode after validation error
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });
  });

  describe('Requirement 4.4: Meaningful error feedback', () => {
    it('should handle network errors gracefully', async () => {
      const networkError = {
        code: 'NETWORK_ERROR',
        message: 'Network connection failed',
      };

      mockApiService.updateUserProfile.mockRejectedValue(networkError);

      render(<SettingsCard />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
      });

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
    });

    it('should handle authentication errors', async () => {
      const authError = {
        code: 'UNAUTHORIZED',
        message: 'Authentication token has expired',
      };

      mockApiService.updateUserProfile.mockRejectedValue(authError);

      render(<SettingsCard />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
      });

      // Enter edit mode and try to save
      const editButton = screen.getByText('Edit Profile');
      await user.click(editButton);

      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockApiService.updateUserProfile).toHaveBeenCalled();
      });

      // Verify authentication error handling
      expect(mockToast.error).toHaveBeenCalledWith('Session Expired', {
        description: 'Please log in again to continue.',
      });
    });
  });

  describe('Requirement 4.5: Confirmation of successful changes', () => {
    it('should provide confirmation when settings are updated successfully', async () => {
      render(<SettingsCard />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
      });

      // Enter edit mode
      const editButton = screen.getByText('Edit Profile');
      await user.click(editButton);

      // Update a field
      const nameInput = screen.getByDisplayValue('Test User');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated User');

      // Save changes
      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockApiService.updateUserProfile).toHaveBeenCalled();
      });

      // Verify success confirmation
      expect(mockToast.success).toHaveBeenCalledWith('Settings updated successfully!');

      // Verify form exits edit mode after successful save
      await waitFor(() => {
        expect(screen.getByText('Edit Profile')).toBeInTheDocument();
      });
    });
  });

  describe('Data Persistence Verification', () => {
    it('should verify data persists across form interactions', async () => {
      render(<SettingsCard />);

      // Initial load
      await waitFor(() => {
        expect(mockApiService.getUserProfile).toHaveBeenCalled();
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
      });

      // Enter edit mode, make changes, and save
      const editButton = screen.getByText('Edit Profile');
      await user.click(editButton);

      const nameInput = screen.getByDisplayValue('Test User');
      await user.clear(nameInput);
      await user.type(nameInput, 'Persistent User');

      // Mock updated response
      const updatedUser = { ...mockUser, name: 'Persistent User' };
      mockApiService.updateUserProfile.mockResolvedValue({
        success: true,
        data: updatedUser,
      });

      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockApiService.updateUserProfile).toHaveBeenCalledWith({
          name: 'Persistent User',
          email: 'test@example.com',
          company: 'Test Company',
          website: 'https://example.com',
          location: 'San Francisco',
          bio: 'Test bio description',
          phone: '+1234567890',
        });
      });

      // Verify success feedback
      expect(mockToast.success).toHaveBeenCalledWith('Settings updated successfully!');
    });
  });

  describe('Loading States', () => {
    it('should handle loading state during initial data fetch', async () => {
      // Mock delayed response
      let resolvePromise: (value: any) => void;
      const delayedPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockApiService.getUserProfile.mockReturnValue(delayedPromise);

      render(<SettingsCard />);

      // Should call API
      expect(mockApiService.getUserProfile).toHaveBeenCalled();

      // Resolve the promise
      resolvePromise!({
        success: true,
        data: mockUser,
      });

      // Wait for data to appear
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle API failure during initial load', async () => {
      const loadingError = {
        code: 'FETCH_ERROR',
        message: 'Failed to load user profile',
      };

      mockApiService.getUserProfile.mockRejectedValue(loadingError);

      render(<SettingsCard />);

      await waitFor(() => {
        expect(mockApiService.getUserProfile).toHaveBeenCalled();
      });

      // Component should handle the error gracefully
      // The exact error handling depends on the component implementation
    });

    it('should handle empty update request', async () => {
      render(<SettingsCard />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
      });

      // Enter edit mode without making changes
      const editButton = screen.getByText('Edit Profile');
      await user.click(editButton);

      // Try to save without changes
      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      // Should still make API call with current values
      await waitFor(() => {
        expect(mockApiService.updateUserProfile).toHaveBeenCalledWith({
          name: 'Test User',
          email: 'test@example.com',
          company: 'Test Company',
          website: 'https://example.com',
          location: 'San Francisco',
          bio: 'Test bio description',
          phone: '+1234567890',
        });
      });
    });
  });
});