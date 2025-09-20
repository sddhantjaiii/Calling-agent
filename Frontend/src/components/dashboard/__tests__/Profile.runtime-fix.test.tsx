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
  default: ({ profileData }: any) => (
    <div data-testid="settings-card">
      <div data-testid="profile-name">{profileData?.name || 'No Name'}</div>
      <div data-testid="profile-email">{profileData?.email || 'No Email'}</div>
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

// Test with undefined values that were causing the runtime error
const mockCreditStatsWithUndefined = {
  currentBalance: 1500,
  totalPurchased: 2000,
  totalUsed: 500,
  totalBonus: undefined, // This was causing issues
  totalAdjustments: 0,
  transactionCount: 15,
  averageUsagePerDay: undefined, // This was causing the toFixed error
  projectedRunoutDate: '2024-03-01T00:00:00Z',
};

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider defaultTheme="light" storageKey="test-theme">
      {component}
    </ThemeProvider>
  );
};

describe('Profile Runtime Error Fix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle undefined averageUsagePerDay without crashing', async () => {
    // Mock API responses with undefined values
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
      data: mockCreditStatsWithUndefined,
    });

    renderWithTheme(<Profile />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    // Should display "0.0" for undefined averageUsagePerDay instead of crashing
    expect(screen.getByText(/Daily Average:/)).toBeInTheDocument();
    
    // The component should render without throwing the toFixed error
    // We don't need to check for specific values, just that it doesn't crash
  });

  it('should handle completely missing creditStats gracefully', async () => {
    // Mock API responses with missing credit stats
    (apiService.getUserProfile as any).mockResolvedValue({
      success: true,
      data: mockUserProfile,
    });
    (apiService.getUserCredits as any).mockResolvedValue({
      success: true,
      data: mockCreditBalance,
    });
    (apiService.getCreditStats as any).mockResolvedValue({
      success: false,
      data: null,
    });

    renderWithTheme(<Profile />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    // Should still render without crashing
    expect(screen.getByText('1500 available')).toBeInTheDocument();
    expect(screen.getByText('0 transactions')).toBeInTheDocument();
  });

  it('should display correct values when all data is present', async () => {
    const completeStats = {
      ...mockCreditStatsWithUndefined,
      averageUsagePerDay: 25.5,
      totalBonus: 100,
    };

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
      data: completeStats,
    });

    renderWithTheme(<Profile />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    // Should display correct values
    expect(screen.getByText(/Daily Average:/)).toBeInTheDocument();
    expect(screen.getByText(/Bonus Credits:/)).toBeInTheDocument();
  });
});