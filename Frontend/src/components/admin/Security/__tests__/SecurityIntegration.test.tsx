import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CSRFProvider, CSRFStatus } from '../CSRFProtection';
import { QuickSecureLogout } from '../SecureLogout';
import { adminSecurityService } from '@/services/adminSecurityService';

// Mock the admin security service
vi.mock('@/services/adminSecurityService', () => ({
  adminSecurityService: {
    getCSRFToken: vi.fn(),
    secureLogout: vi.fn(),
    stopSessionMonitoring: vi.fn()
  }
}));

describe('Security Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        clear: vi.fn(),
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn()
      },
      writable: true
    });
    // Mock sessionStorage
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        clear: vi.fn()
      },
      writable: true
    });
  });

  describe('CSRF Protection Integration', () => {
    it('should provide CSRF protection context', async () => {
      vi.mocked(adminSecurityService.getCSRFToken).mockResolvedValue('test-csrf-token');

      render(
        <CSRFProvider>
          <CSRFStatus />
        </CSRFProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('CSRF Protection')).toBeInTheDocument();
      });
    });

    it('should integrate CSRF with secure logout', async () => {
      vi.mocked(adminSecurityService.getCSRFToken).mockResolvedValue('test-csrf-token');
      vi.mocked(adminSecurityService.secureLogout).mockResolvedValue();

      render(
        <CSRFProvider>
          <QuickSecureLogout showText={true} />
        </CSRFProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Logout'));

      await waitFor(() => {
        expect(adminSecurityService.secureLogout).toHaveBeenCalled();
      });
    });
  });

  describe('Secure Logout Integration', () => {
    it('should perform secure logout with cleanup', async () => {
      vi.mocked(adminSecurityService.secureLogout).mockResolvedValue();

      render(<QuickSecureLogout showText={true} />);

      fireEvent.click(screen.getByText('Logout'));

      await waitFor(() => {
        expect(adminSecurityService.secureLogout).toHaveBeenCalled();
      });
    });

    it('should handle logout failures gracefully', async () => {
      vi.mocked(adminSecurityService.secureLogout).mockRejectedValue(
        new Error('Logout failed')
      );

      render(<QuickSecureLogout showText={true} />);

      fireEvent.click(screen.getByText('Logout'));

      await waitFor(() => {
        expect(window.localStorage.clear).toHaveBeenCalled();
        expect(window.sessionStorage.clear).toHaveBeenCalled();
      });
    });
  });

  describe('Data Masking Integration', () => {
    it('should mask sensitive data correctly', async () => {
      const { maskApiKey, maskEmail, maskIpAddress } = await import('@/utils/dataMasking');

      expect(maskApiKey('sk-1234567890abcdef')).toBe('sk-1***********cdef');
      expect(maskEmail('admin@example.com')).toBe('a***n@example.com');
      expect(maskIpAddress('192.168.1.100')).toBe('192.***.***.100');
    });
  });
});