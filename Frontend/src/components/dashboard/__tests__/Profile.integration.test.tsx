import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Profile from '../Profile';
import { apiService } from '@/services/apiService';
import { ThemeProvider } from '@/components/theme/ThemeProvider';

// Mock the API service
vi.mock('@/services/apiService', () => ({
  apiService: {
    getUserProfile: vi.fn(),
    getUserCredits: vi.fn(),
    getCreditStats: vi.fn(),
    updateUserProfile: vi.fn(),
  },
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock SettingsCard component
vi.mock('../SettingsCard', () => ({
  default: ({ profileData, onSave }: any) => (
    <div data-testid="settings-card">
      <div data-testid="profile-name">{profileData?.name || 'No Name'}</div>
      <div data-testid="profile-email">{profileData?.email || 'No Email'}</div>
      <button onClick={() => onSave({ name: 'Updated Name' })}>
        Save Profile
      </button>
    </div>
  ),
}));

const mockUserProfile = {
  id: 'user-123',
  name: 'John Doe',
  email: 'john@example.com',
  credits: 1500,
  isActive: true,
  authProvider: 'email' as const,
  role: 'user' as const,
  emailVerified: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-15T00:00:00Z',
  company: 'Acme Corp',
  website: 'https://acme.com',
  location: 'New York',
  bio: 'Software developer',
  phone: '+1234567890',
};

const mockCreditBalance = {
  credits: 1500,
  userId: 'user-123',
};

const mockCreditStats = {
  currentBalance: 1500,
  totalPurchased: 2000,
  totalUsed: 500,
  totalBonus: 100,
  totalAdjustments: 0,
  transactionCount: 15,
  averageUsagePerDay: 25.5,
  projectedRunoutDate: '2024-03-01T00:00:00Z',
};

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider defaultTheme="light" storageKey="test-theme">
      {component}
    </ThemeProvider>
  );
};

describe('Profile Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load and display real user profile data', async () => {
    // Mock successful API responses
    (apiService.getUserProfile as any).mockResolvedValue({
      success: true,
      data: mockUserProfile,
    });
    (apiService.getUserCredits as any).mockResolvedValue({
      success: true,
      data: mockCreditBalance,
    });
    (apiService.getCreditStats as any).mockResolvedValue({
      success: true,
      data: mockCreditStats,
    });

    renderWithTheme(<Profile />);

    // Should show loading initially
    expect(screen.getByRole('status')).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    // Verify API calls were made
    expect(apiService.getUserProfile).toHaveBeenCalledTimes(1);
    expect(apiService.getUserCredits).toHaveBeenCalledTimes(1);
    expect(apiService.getCreditStats).toHaveBeenCalledTimes(1);

    // Verify profile data is passed to SettingsCard
    await waitFor(() => {
      expect(screen.getByTestId('profile-name')).toHaveTextContent('John Doe');
      expect(screen.getByTestId('profile-email')).toHaveTextContent('john@example.com');
    });

    // Verify credit information is displayed
    expect(screen.getByText('1500 available')).toBeInTheDocument();
    expect(screen.getByText('15 transactions')).toBeInTheDocument();
    expect(screen.getByText('2000')).toBeInTheDocument(); // Total purchased
    expect(screen.getByText('500')).toBeInTheDocument(); // Total used
  });

  it('should display account information correctly', async () => {
    (apiService.getUserProfile as any).mockResolvedValue({
      success: true,
      data: mockUserProfile,
    });
    (apiService.getUserCredits as any).mockResolvedValue({
      success: true,
      data: mockCreditBalance,
    });
    (apiService.getCreditStats as any).mockResolvedValue({
      success: true,
      data: mockCreditStats,
    });

    renderWithTheme(<Profile />);

    await waitFor(() => {
      expect(screen.getByText('Account Information')).toBeInTheDocument();
    });

    // Check account details
    expect(screen.getByText('user-123')).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByText('email')).toBeInTheDocument();
    expect(screen.getByText('user')).toBeInTheDocument();
  });

  it('should handle profile update correctly', async () => {
    (apiService.getUserProfile as any).mockResolvedValue({
      success: true,
      data: mockUserProfile,
    });
    (apiService.getUserCredits as any).mockResolvedValue({
      success: true,
      data: mockCreditBalance,
    });
    (apiService.getCreditStats as any).mockResolvedValue({
      success: true,
      data: mockCreditStats,
    });
    (apiService.updateUserProfile as any).mockResolvedValue({
      success: true,
      data: { ...mockUserProfile, name: 'Updated Name' },
    });

    renderWithTheme(<Profile />);

    await waitFor(() => {
      expect(screen.getByText('Save Profile')).toBeInTheDocument();
    });

    // Click save profile button
    screen.getByText('Save Profile').click();

    await waitFor(() => {
      expect(apiService.updateUserProfile).toHaveBeenCalledWith({
        name: 'Updated Name',
      });
    });
  });

  it('should handle API errors gracefully', async () => {
    // Mock API failures
    (apiService.getUserProfile as any).mockRejectedValue(new Error('API Error'));
    (apiService.getUserCredits as any).mockRejectedValue(new Error('API Error'));
    (apiService.getCreditStats as any).mockRejectedValue(new Error('API Error'));

    renderWithTheme(<Profile />);

    // Should still render the component without crashing
    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    // Should show fallback data
    await waitFor(() => {
      expect(screen.getByTestId('profile-name')).toHaveTextContent('No Name');
      expect(screen.getByTestId('profile-email')).toHaveTextContent('No Email');
    });
  });

  it('should display correct plan information based on user role', async () => {
    const adminUser = { ...mockUserProfile, role: 'admin' as const };
    
    (apiService.getUserProfile as any).mockResolvedValue({
      success: true,
      data: adminUser,
    });
    (apiService.getUserCredits as any).mockResolvedValue({
      success: true,
      data: mockCreditBalance,
    });
    (apiService.getCreditStats as any).mockResolvedValue({
      success: true,
      data: mockCreditStats,
    });

    renderWithTheme(<Profile />);

    await waitFor(() => {
      expect(screen.getByText('Current Plan: Admin')).toBeInTheDocument();
    });
  });
});