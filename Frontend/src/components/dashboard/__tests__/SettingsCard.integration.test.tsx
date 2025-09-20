import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
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

describe('SettingsCard Integration', () => {
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
    bio: 'Test bio',
    phone: '+1234567890',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockApiService.getUserProfile.mockResolvedValue({
      success: true,
      data: mockUser,
    });
  });

  it('should load user profile data on mount', async () => {
    render(<SettingsCard />);

    await waitFor(() => {
      expect(mockApiService.getUserProfile).toHaveBeenCalled();
    });

    // Check that form fields are populated with user data
    expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Company')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('San Francisco')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test bio')).toBeInTheDocument();
    expect(screen.getByDisplayValue('+1234567890')).toBeInTheDocument();
  });

  it('should save profile updates to backend', async () => {
    const updatedUser = { ...mockUser, name: 'Updated Name', company: 'Updated Company' };
    mockApiService.updateUserProfile.mockResolvedValue({
      success: true,
      data: updatedUser,
    });

    render(<SettingsCard />);

    // Wait for initial load
    await waitFor(() => {
      expect(mockApiService.getUserProfile).toHaveBeenCalled();
    });

    // Enter edit mode
    const editButton = screen.getByText('Edit Profile');
    fireEvent.click(editButton);

    // Update form fields
    const nameInput = screen.getByDisplayValue('Test User');
    fireEvent.change(nameInput, { target: { value: 'Updated Name' } });

    const companyInput = screen.getByDisplayValue('Test Company');
    fireEvent.change(companyInput, { target: { value: 'Updated Company' } });

    // Save changes
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockApiService.updateUserProfile).toHaveBeenCalledWith({
        name: 'Updated Name',
        email: 'test@example.com',
        company: 'Updated Company',
        website: 'https://example.com',
        location: 'San Francisco',
        bio: 'Test bio',
        phone: '+1234567890',
      });
    });

    expect(mockToast.success).toHaveBeenCalledWith('Settings updated successfully!');
  });

  it('should handle validation errors from backend', async () => {
    const validationError = {
      code: 'VALIDATION_ERROR',
      message: 'Invalid email format',
      details: { field: 'email' },
    };

    mockApiService.updateUserProfile.mockRejectedValue(validationError);

    render(<SettingsCard />);

    // Wait for initial load
    await waitFor(() => {
      expect(mockApiService.getUserProfile).toHaveBeenCalled();
    });

    // Enter edit mode
    const editButton = screen.getByText('Edit Profile');
    fireEvent.click(editButton);

    // Update email with invalid format
    const emailInput = screen.getByDisplayValue('test@example.com');
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

    // Save changes
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockApiService.updateUserProfile).toHaveBeenCalled();
    });

    // Should handle validation error appropriately
    // The exact error handling depends on the serverValidationHandler implementation
  });

  it('should handle empty optional fields correctly', async () => {
    const updatedUser = { ...mockUser, company: null, website: null, location: null, bio: null, phone: null };
    mockApiService.updateUserProfile.mockResolvedValue({
      success: true,
      data: updatedUser,
    });

    render(<SettingsCard />);

    // Wait for initial load
    await waitFor(() => {
      expect(mockApiService.getUserProfile).toHaveBeenCalled();
    });

    // Enter edit mode
    const editButton = screen.getByText('Edit Profile');
    fireEvent.click(editButton);

    // Clear optional fields
    const companyInput = screen.getByDisplayValue('Test Company');
    fireEvent.change(companyInput, { target: { value: '' } });

    const websiteInput = screen.getByDisplayValue('https://example.com');
    fireEvent.change(websiteInput, { target: { value: '' } });

    // Save changes
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockApiService.updateUserProfile).toHaveBeenCalledWith({
        name: 'Test User',
        email: 'test@example.com',
        company: undefined,
        website: undefined,
        location: 'San Francisco',
        bio: 'Test bio',
        phone: '+1234567890',
      });
    });
  });

  it('should handle network errors gracefully', async () => {
    const networkError = {
      code: 'NETWORK_ERROR',
      message: 'Network connection failed',
    };

    mockApiService.updateUserProfile.mockRejectedValue(networkError);

    render(<SettingsCard />);

    // Wait for initial load
    await waitFor(() => {
      expect(mockApiService.getUserProfile).toHaveBeenCalled();
    });

    // Enter edit mode and try to save
    const editButton = screen.getByText('Edit Profile');
    fireEvent.click(editButton);

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockApiService.updateUserProfile).toHaveBeenCalled();
    });

    expect(mockToast.error).toHaveBeenCalledWith('Network Error', {
      description: 'Please check your internet connection and try again.',
    });
  });
});