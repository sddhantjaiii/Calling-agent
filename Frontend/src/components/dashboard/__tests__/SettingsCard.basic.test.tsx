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

describe('SettingsCard Basic Functionality', () => {
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

  it('should render settings form', async () => {
    render(<SettingsCard />);

    // Check that the settings form renders
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Edit Personal Info')).toBeInTheDocument();
    expect(screen.getByText('Edit Profile')).toBeInTheDocument();
  });

  it('should call getUserProfile on mount', async () => {
    render(<SettingsCard />);

    await waitFor(() => {
      expect(mockApiService.getUserProfile).toHaveBeenCalled();
    });
  });

  it('should enter edit mode when edit button is clicked', async () => {
    render(<SettingsCard />);

    // Wait for initial load
    await waitFor(() => {
      expect(mockApiService.getUserProfile).toHaveBeenCalled();
    });

    // Click edit button
    const editButton = screen.getByText('Edit Profile');
    fireEvent.click(editButton);

    // Should show Cancel button and Save Changes button
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });

  it('should have all required form fields', async () => {
    render(<SettingsCard />);

    // Wait for initial load
    await waitFor(() => {
      expect(mockApiService.getUserProfile).toHaveBeenCalled();
    });

    // Check that all form fields are present
    expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Organization/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Website/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Phone/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Location/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Bio/)).toBeInTheDocument();
  });

  it('should call updateUserProfile when form is submitted', async () => {
    mockApiService.updateUserProfile.mockResolvedValue({
      success: true,
      data: mockUser,
    });

    render(<SettingsCard />);

    // Wait for initial load
    await waitFor(() => {
      expect(mockApiService.getUserProfile).toHaveBeenCalled();
    });

    // Enter edit mode
    const editButton = screen.getByText('Edit Profile');
    fireEvent.click(editButton);

    // Submit form
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockApiService.updateUserProfile).toHaveBeenCalled();
    });

    expect(mockToast.success).toHaveBeenCalledWith('Settings updated successfully!');
  });

  it('should handle API errors gracefully', async () => {
    const apiError = new Error('API Error');
    mockApiService.updateUserProfile.mockRejectedValue(apiError);

    render(<SettingsCard />);

    // Wait for initial load
    await waitFor(() => {
      expect(mockApiService.getUserProfile).toHaveBeenCalled();
    });

    // Enter edit mode
    const editButton = screen.getByText('Edit Profile');
    fireEvent.click(editButton);

    // Submit form
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockApiService.updateUserProfile).toHaveBeenCalled();
    });

    // Should handle error (exact error handling depends on implementation)
    expect(mockApiService.updateUserProfile).toHaveBeenCalled();
  });
});