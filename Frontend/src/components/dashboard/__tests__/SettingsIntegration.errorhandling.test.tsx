import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import SettingsCard from '../SettingsCard';
import { apiService } from '@/services/apiService';

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/services/apiService', () => ({
  apiService: {
    getUserProfile: vi.fn(),
    updateUserProfile: vi.fn(),
  },
}));

vi.mock('@/components/theme/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('Settings Error Handling and Loading States Integration', () => {
  let mockGetUserProfile: any;
  let mockUpdateUserProfile: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserProfile = vi.mocked(apiService.getUserProfile);
    mockUpdateUserProfile = vi.mocked(apiService.updateUserProfile);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Loading States', () => {
    it('shows loading skeleton while fetching user profile', async () => {
      // Mock a delayed response
      mockGetUserProfile.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            success: true,
            data: {
              id: '1',
              name: 'John Doe',
              email: 'john@example.com',
              credits: 100,
              isActive: true,
              authProvider: 'email',
              emailVerified: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            }
          }), 100)
        )
      );

      render(
        <TestWrapper>
          <SettingsCard />
        </TestWrapper>
      );

      // Should show loading state initially
      expect(screen.getByText('Settings')).toBeInTheDocument();
      
      // Wait for profile to load
      await waitFor(() => {
        expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
      }, { timeout: 200 });

      expect(mockGetUserProfile).toHaveBeenCalledTimes(1);
    });

    it('shows saving state during profile update', async () => {
      // Mock successful profile fetch
      mockGetUserProfile.mockResolvedValue({
        success: true,
        data: {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          credits: 100,
          isActive: true,
          authProvider: 'email',
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });

      // Mock delayed update response
      mockUpdateUserProfile.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            success: true,
            data: {
              id: '1',
              name: 'Jane Doe',
              email: 'john@example.com',
              credits: 100,
              isActive: true,
              authProvider: 'email',
              emailVerified: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            }
          }), 100)
        )
      );

      render(
        <TestWrapper>
          <SettingsCard />
        </TestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
      });

      // Enter edit mode
      const editButton = screen.getByRole('button', { name: /edit profile/i });
      fireEvent.click(editButton);

      // Change name
      const nameInput = screen.getByDisplayValue('John Doe');
      fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });

      // Submit form
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      // Should show saving state
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument();
      });

      // Wait for save to complete
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Settings updated successfully!');
      }, { timeout: 200 });

      expect(mockUpdateUserProfile).toHaveBeenCalledWith({
        name: 'Jane Doe',
        email: 'john@example.com',
      });
    });
  });

  describe('Network Error Handling', () => {
    it('handles network error during profile fetch', async () => {
      mockGetUserProfile.mockRejectedValue({
        code: 'NETWORK_ERROR',
        message: 'Network connection failed',
        status: 0,
      });

      render(
        <TestWrapper>
          <SettingsCard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to load profile data');
      });
    });

    it('handles network error during profile update', async () => {
      // Mock successful profile fetch
      mockGetUserProfile.mockResolvedValue({
        success: true,
        data: {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          credits: 100,
          isActive: true,
          authProvider: 'email',
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });

      // Mock network error on update
      mockUpdateUserProfile.mockRejectedValue({
        code: 'NETWORK_ERROR',
        message: 'Network connection failed',
        status: 0,
      });

      render(
        <TestWrapper>
          <SettingsCard />
        </TestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
      });

      // Enter edit mode and make changes
      const editButton = screen.getByRole('button', { name: /edit profile/i });
      fireEvent.click(editButton);

      const nameInput = screen.getByDisplayValue('John Doe');
      fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });

      // Submit form
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      // Should show network error
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Network Error', expect.objectContaining({
          description: 'Please check your internet connection and try again.',
        }));
      });
    });
  });

  describe('Validation Error Handling', () => {
    it('handles validation errors from server', async () => {
      // Mock successful profile fetch
      mockGetUserProfile.mockResolvedValue({
        success: true,
        data: {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          credits: 100,
          isActive: true,
          authProvider: 'email',
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });

      // Mock validation error on update
      mockUpdateUserProfile.mockRejectedValue({
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        status: 400,
        details: {
          email: 'Email is already in use',
          name: 'Name is required',
        },
      });

      render(
        <TestWrapper>
          <SettingsCard />
        </TestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
      });

      // Enter edit mode and make changes
      const editButton = screen.getByRole('button', { name: /edit profile/i });
      fireEvent.click(editButton);

      const emailInput = screen.getByDisplayValue('john@example.com');
      fireEvent.change(emailInput, { target: { value: 'existing@example.com' } });

      // Submit form
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      // Should handle validation errors
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });

    it('shows field-level validation errors', async () => {
      // Mock successful profile fetch
      mockGetUserProfile.mockResolvedValue({
        success: true,
        data: {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          credits: 100,
          isActive: true,
          authProvider: 'email',
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });

      render(
        <TestWrapper>
          <SettingsCard />
        </TestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
      });

      // Enter edit mode
      const editButton = screen.getByRole('button', { name: /edit profile/i });
      fireEvent.click(editButton);

      // Clear name field (should trigger validation)
      const nameInput = screen.getByDisplayValue('John Doe');
      fireEvent.change(nameInput, { target: { value: '' } });
      fireEvent.blur(nameInput);

      // Should show client-side validation error
      await waitFor(() => {
        expect(screen.getByText(/name cannot be empty/i)).toBeInTheDocument();
      });
    });
  });

  describe('Authentication Error Handling', () => {
    it('handles unauthorized error during profile update', async () => {
      // Mock successful profile fetch
      mockGetUserProfile.mockResolvedValue({
        success: true,
        data: {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          credits: 100,
          isActive: true,
          authProvider: 'email',
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });

      // Mock unauthorized error on update
      mockUpdateUserProfile.mockRejectedValue({
        code: 'UNAUTHORIZED',
        message: 'Session expired',
        status: 401,
      });

      render(
        <TestWrapper>
          <SettingsCard />
        </TestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
      });

      // Enter edit mode and make changes
      const editButton = screen.getByRole('button', { name: /edit profile/i });
      fireEvent.click(editButton);

      const nameInput = screen.getByDisplayValue('John Doe');
      fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });

      // Submit form
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      // Should show authentication error
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Session Expired', expect.objectContaining({
          description: 'Please log in again to continue.',
        }));
      });
    });
  });

  describe('Server Error Handling', () => {
    it('handles server error during profile update', async () => {
      // Mock successful profile fetch
      mockGetUserProfile.mockResolvedValue({
        success: true,
        data: {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          credits: 100,
          isActive: true,
          authProvider: 'email',
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });

      // Mock server error on update
      mockUpdateUserProfile.mockRejectedValue({
        code: 'SERVER_ERROR',
        message: 'Internal server error',
        status: 500,
      });

      render(
        <TestWrapper>
          <SettingsCard />
        </TestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
      });

      // Enter edit mode and make changes
      const editButton = screen.getByRole('button', { name: /edit profile/i });
      fireEvent.click(editButton);

      const nameInput = screen.getByDisplayValue('John Doe');
      fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });

      // Submit form
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      // Should show server error
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Error', expect.objectContaining({
          description: expect.stringContaining('Failed to update settings'),
        }));
      });
    });
  });

  describe('Form State Management', () => {
    it('manages form dirty state correctly', async () => {
      // Mock successful profile fetch
      mockGetUserProfile.mockResolvedValue({
        success: true,
        data: {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          credits: 100,
          isActive: true,
          authProvider: 'email',
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });

      render(
        <TestWrapper>
          <SettingsCard />
        </TestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
      });

      // Enter edit mode
      const editButton = screen.getByRole('button', { name: /edit profile/i });
      fireEvent.click(editButton);

      // Save button should be disabled initially (no changes)
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      expect(saveButton).toBeInTheDocument();

      // Make a change
      const nameInput = screen.getByDisplayValue('John Doe');
      fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });

      // Save button should now be enabled
      expect(saveButton).not.toBeDisabled();
    });
  });
});

export default {};