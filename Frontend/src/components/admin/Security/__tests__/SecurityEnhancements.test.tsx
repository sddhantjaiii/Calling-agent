import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EnhancedSessionValidation } from '../EnhancedSessionValidation';
import { CSRFProvider, CSRFStatus, useCSRF } from '../CSRFProtection';
import { SecureLogout, QuickSecureLogout } from '../SecureLogout';
import { AdminConfirmationDialog } from '../AdminConfirmationDialog';
import { AccessMonitoring } from '../AccessMonitoring';
import { adminSecurityService } from '@/services/adminSecurityService';

// Mock the admin security service
vi.mock('@/services/adminSecurityService', () => ({
  adminSecurityService: {
    validateAdminSession: vi.fn(),
    startSessionMonitoring: vi.fn(),
    stopSessionMonitoring: vi.fn(),
    getCSRFToken: vi.fn(),
    secureAdminRequest: vi.fn(),
    logAdminAction: vi.fn(),
    getAccessLogs: vi.fn(),
    secureLogout: vi.fn(),
    checkSuspiciousActivity: vi.fn()
  }
}));

// Mock data masking utility
vi.mock('@/utils/dataMasking', () => ({
  maskIpAddress: vi.fn((ip) => ip.replace(/\d+/g, '***'))
}));

describe('Security Enhancements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock localStorage and sessionStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        clear: vi.fn(),
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn()
      },
      writable: true
    });
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        clear: vi.fn()
      },
      writable: true
    });
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('EnhancedSessionValidation', () => {
    const mockSessionInfo = {
      sessionId: 'test-session-123',
      userId: 'admin-user-1',
      role: 'admin' as const,
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 Test Browser',
      lastActivity: new Date(),
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      isValid: true
    };

    it('should render session validation component', async () => {
      vi.mocked(adminSecurityService.validateAdminSession).mockResolvedValue(mockSessionInfo);

      render(<EnhancedSessionValidation />);

      await waitFor(() => {
        expect(screen.getByText('Admin Session')).toBeInTheDocument();
        expect(screen.getByText('Active')).toBeInTheDocument();
      });
    });

    it('should show session details when requested', async () => {
      vi.mocked(adminSecurityService.validateAdminSession).mockResolvedValue(mockSessionInfo);

      render(<EnhancedSessionValidation showSessionDetails={true} />);

      await waitFor(() => {
        expect(screen.getByText('Session Details')).toBeInTheDocument();
        expect(screen.getByText('admin-user-1')).toBeInTheDocument();
      });
    });

    it('should handle invalid session', async () => {
      const invalidSession = { ...mockSessionInfo, isValid: false };
      vi.mocked(adminSecurityService.validateAdminSession).mockResolvedValue(invalidSession);
      const onSessionInvalid = vi.fn();

      render(<EnhancedSessionValidation onSessionInvalid={onSessionInvalid} />);

      await waitFor(() => {
        expect(screen.getByText('Invalid')).toBeInTheDocument();
        expect(onSessionInvalid).toHaveBeenCalled();
      });
    });

    it('should show expiry warning for sessions expiring soon', async () => {
      const expiringSoon = {
        ...mockSessionInfo,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now
      };
      vi.mocked(adminSecurityService.validateAdminSession).mockResolvedValue(expiringSoon);

      render(<EnhancedSessionValidation />);

      await waitFor(() => {
        expect(screen.getByText(/expires in/)).toBeInTheDocument();
      });
    });

    it('should handle session validation errors', async () => {
      vi.mocked(adminSecurityService.validateAdminSession).mockRejectedValue(
        new Error('Session validation failed')
      );

      render(<EnhancedSessionValidation />);

      await waitFor(() => {
        expect(screen.getByText(/Session validation failed/)).toBeInTheDocument();
      });
    });

    it('should allow manual session validation', async () => {
      vi.mocked(adminSecurityService.validateAdminSession).mockResolvedValue(mockSessionInfo);

      render(<EnhancedSessionValidation />);

      await waitFor(() => {
        expect(screen.getByText('Validate')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Validate'));

      await waitFor(() => {
        expect(adminSecurityService.validateAdminSession).toHaveBeenCalledTimes(2); // Initial + manual
      });
    });
  });

  describe('CSRF Protection', () => {
    const TestComponent = () => {
      const { token, isValid } = useCSRF();
      return (
        <div>
          <span>Token: {token ? 'present' : 'absent'}</span>
          <span>Valid: {isValid ? 'yes' : 'no'}</span>
        </div>
      );
    };

    it('should provide CSRF context', async () => {
      vi.mocked(adminSecurityService.getCSRFToken).mockResolvedValue('test-csrf-token');

      render(
        <CSRFProvider>
          <TestComponent />
        </CSRFProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Token: present')).toBeInTheDocument();
        expect(screen.getByText('Valid: yes')).toBeInTheDocument();
      });
    });

    it('should render CSRF status component', async () => {
      vi.mocked(adminSecurityService.getCSRFToken).mockResolvedValue('test-csrf-token');

      render(
        <CSRFProvider>
          <CSRFStatus showDetails={true} />
        </CSRFProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('CSRF Protection Status')).toBeInTheDocument();
        expect(screen.getByText('Active')).toBeInTheDocument();
      });
    });

    it('should handle CSRF token refresh', async () => {
      vi.mocked(adminSecurityService.getCSRFToken).mockResolvedValue('new-csrf-token');

      render(
        <CSRFProvider>
          <CSRFStatus showDetails={true} />
        </CSRFProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Refresh Token')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Refresh Token'));

      await waitFor(() => {
        expect(adminSecurityService.getCSRFToken).toHaveBeenCalledTimes(2); // Initial + refresh
      });
    });

    it('should show warning when CSRF protection is inactive', async () => {
      vi.mocked(adminSecurityService.getCSRFToken).mockRejectedValue(
        new Error('CSRF token generation failed')
      );

      render(
        <CSRFProvider>
          <CSRFStatus showDetails={true} />
        </CSRFProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Inactive')).toBeInTheDocument();
        expect(screen.getByText(/CSRF protection is inactive/)).toBeInTheDocument();
      });
    });
  });

  describe('Secure Logout', () => {
    it('should render secure logout component', () => {
      render(<SecureLogout />);

      expect(screen.getByText('Secure Admin Logout')).toBeInTheDocument();
      expect(screen.getByText('Secure Logout')).toBeInTheDocument();
    });

    it('should show confirmation dialog when required', async () => {
      render(<SecureLogout requireConfirmation={true} />);

      fireEvent.click(screen.getByText('Secure Logout'));

      await waitFor(() => {
        expect(screen.getByText('Confirm Secure Logout')).toBeInTheDocument();
      });
    });

    it('should perform logout steps when confirmed', async () => {
      vi.mocked(adminSecurityService.logAdminAction).mockResolvedValue();
      vi.mocked(adminSecurityService.secureAdminRequest).mockResolvedValue({});
      vi.mocked(adminSecurityService.stopSessionMonitoring).mockImplementation(() => {});

      const onLogoutComplete = vi.fn();
      render(<SecureLogout requireConfirmation={false} onLogoutComplete={onLogoutComplete} showProgress={true} />);

      fireEvent.click(screen.getByText('Secure Logout'));

      await waitFor(() => {
        expect(adminSecurityService.logAdminAction).toHaveBeenCalledWith('secure_logout', 'session');
      });

      await waitFor(() => {
        expect(onLogoutComplete).toHaveBeenCalled();
      }, { timeout: 3000 });
    });

    it('should handle logout errors gracefully', async () => {
      vi.mocked(adminSecurityService.logAdminAction).mockRejectedValue(
        new Error('Audit log failed')
      );
      vi.mocked(adminSecurityService.secureAdminRequest).mockRejectedValue(
        new Error('Server logout failed')
      );

      render(<SecureLogout requireConfirmation={false} showProgress={true} />);

      fireEvent.click(screen.getByText('Secure Logout'));

      // Should continue with logout even if some steps fail
      await waitFor(() => {
        expect(window.localStorage.clear).toHaveBeenCalled();
        expect(window.sessionStorage.clear).toHaveBeenCalled();
      });
    });
  });

  describe('Quick Secure Logout', () => {
    it('should render quick logout button', () => {
      render(<QuickSecureLogout />);

      expect(screen.getByText('Logout')).toBeInTheDocument();
    });

    it('should perform quick logout', async () => {
      vi.mocked(adminSecurityService.secureLogout).mockResolvedValue();
      const onLogoutComplete = vi.fn();

      render(<QuickSecureLogout onLogoutComplete={onLogoutComplete} />);

      fireEvent.click(screen.getByText('Logout'));

      await waitFor(() => {
        expect(adminSecurityService.secureLogout).toHaveBeenCalled();
        expect(onLogoutComplete).toHaveBeenCalled();
      });
    });

    it('should handle quick logout failure', async () => {
      vi.mocked(adminSecurityService.secureLogout).mockRejectedValue(
        new Error('Logout failed')
      );

      render(<QuickSecureLogout />);

      fireEvent.click(screen.getByText('Logout'));

      await waitFor(() => {
        expect(window.localStorage.clear).toHaveBeenCalled();
        expect(window.sessionStorage.clear).toHaveBeenCalled();
      });
    });
  });

  describe('Admin Confirmation Dialog', () => {
    const mockProps = {
      isOpen: true,
      onClose: vi.fn(),
      onConfirm: vi.fn(),
      title: 'Test Confirmation',
      description: 'This is a test confirmation dialog',
      actionType: 'destructive' as const
    };

    it('should render confirmation dialog', () => {
      render(<AdminConfirmationDialog {...mockProps} />);

      expect(screen.getByText('Test Confirmation')).toBeInTheDocument();
      expect(screen.getByText('This is a test confirmation dialog')).toBeInTheDocument();
    });

    it('should require password when specified', () => {
      render(<AdminConfirmationDialog {...mockProps} requirePassword={true} />);

      expect(screen.getByText(/Confirm your admin password/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
    });

    it('should require confirmation text when specified', () => {
      render(
        <AdminConfirmationDialog 
          {...mockProps} 
          requireConfirmationText="DELETE" 
        />
      );

      expect(screen.getByText(/Type DELETE to confirm/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Type "DELETE" here')).toBeInTheDocument();
    });

    it('should show additional warnings', () => {
      const warnings = ['This action is irreversible', 'All data will be lost'];
      render(<AdminConfirmationDialog {...mockProps} additionalWarnings={warnings} />);

      warnings.forEach(warning => {
        expect(screen.getByText(warning)).toBeInTheDocument();
      });
    });

    it('should show resource details', () => {
      const resourceDetails = {
        type: 'user',
        name: 'John Doe',
        id: 'user-123'
      };
      render(<AdminConfirmationDialog {...mockProps} resourceDetails={resourceDetails} />);

      expect(screen.getByText('Target Resource:')).toBeInTheDocument();
      expect(screen.getByText('user')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('user-123')).toBeInTheDocument();
    });

    it('should validate inputs before confirming', async () => {
      render(
        <AdminConfirmationDialog 
          {...mockProps} 
          requirePassword={true}
          requireConfirmationText="CONFIRM"
        />
      );

      // Try to confirm without filling required fields
      fireEvent.click(screen.getByText('Confirm Action'));

      await waitFor(() => {
        expect(screen.getByText(/Please complete all required fields/)).toBeInTheDocument();
      });

      expect(mockProps.onConfirm).not.toHaveBeenCalled();
    });

    it('should call onConfirm when validation passes', async () => {
      vi.mocked(adminSecurityService.logAdminAction).mockResolvedValue();
      vi.mocked(adminSecurityService.secureAdminRequest).mockResolvedValue({});

      render(
        <AdminConfirmationDialog 
          {...mockProps} 
          requireConfirmationText="CONFIRM"
        />
      );

      // Fill confirmation text
      fireEvent.change(screen.getByPlaceholderText('Type "CONFIRM" here'), {
        target: { value: 'CONFIRM' }
      });

      fireEvent.click(screen.getByText('Confirm Action'));

      await waitFor(() => {
        expect(mockProps.onConfirm).toHaveBeenCalled();
      });
    });
  });

  describe('Access Monitoring', () => {
    const mockAccessLogs = [
      {
        id: 'log-1',
        adminUserId: 'admin-1',
        action: 'user_update',
        resource: 'user',
        resourceId: 'user-123',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        success: true,
        details: { isNewLocation: false }
      }
    ];

    const mockSuspiciousActivity = {
      hasSuspiciousActivity: true,
      alerts: [
        {
          type: 'multiple_failed_logins',
          message: 'Multiple failed login attempts detected',
          severity: 'high' as const,
          timestamp: new Date()
        }
      ]
    };

    it('should render access monitoring component', async () => {
      vi.mocked(adminSecurityService.getAccessLogs).mockResolvedValue(mockAccessLogs);
      vi.mocked(adminSecurityService.checkSuspiciousActivity).mockResolvedValue(mockSuspiciousActivity);

      render(<AccessMonitoring />);

      await waitFor(() => {
        expect(screen.getByText('Access Monitoring')).toBeInTheDocument();
        expect(screen.getByText('Recent Admin Access')).toBeInTheDocument();
      });
    });

    it('should show suspicious activity alerts', async () => {
      vi.mocked(adminSecurityService.getAccessLogs).mockResolvedValue(mockAccessLogs);
      vi.mocked(adminSecurityService.checkSuspiciousActivity).mockResolvedValue(mockSuspiciousActivity);

      render(<AccessMonitoring />);

      await waitFor(() => {
        expect(screen.getByText('Suspicious Activity Detected')).toBeInTheDocument();
        expect(screen.getByText('Multiple failed login attempts detected')).toBeInTheDocument();
      });
    });

    it('should handle access log loading errors', async () => {
      vi.mocked(adminSecurityService.getAccessLogs).mockRejectedValue(
        new Error('Failed to load access logs')
      );
      vi.mocked(adminSecurityService.checkSuspiciousActivity).mockResolvedValue({
        hasSuspiciousActivity: false,
        alerts: []
      });

      render(<AccessMonitoring />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load access logs')).toBeInTheDocument();
      });
    });

    it('should allow filtering access logs', async () => {
      vi.mocked(adminSecurityService.getAccessLogs).mockResolvedValue(mockAccessLogs);
      vi.mocked(adminSecurityService.checkSuspiciousActivity).mockResolvedValue({
        hasSuspiciousActivity: false,
        alerts: []
      });

      render(<AccessMonitoring />);

      // Open filters
      fireEvent.click(screen.getByText('Filters'));

      await waitFor(() => {
        expect(screen.getByText('Filter Access Logs')).toBeInTheDocument();
      });

      // Apply filters
      fireEvent.change(screen.getByPlaceholderText('Filter by admin user'), {
        target: { value: 'admin-1' }
      });

      fireEvent.click(screen.getByText('Apply Filters'));

      await waitFor(() => {
        expect(adminSecurityService.getAccessLogs).toHaveBeenCalledWith(
          expect.objectContaining({
            adminUserId: 'admin-1'
          })
        );
      });
    });

    it('should allow exporting access logs', async () => {
      vi.mocked(adminSecurityService.getAccessLogs).mockResolvedValue(mockAccessLogs);
      vi.mocked(adminSecurityService.checkSuspiciousActivity).mockResolvedValue({
        hasSuspiciousActivity: false,
        alerts: []
      });

      // Mock URL.createObjectURL and document.createElement
      global.URL.createObjectURL = vi.fn(() => 'blob:test-url');
      global.URL.revokeObjectURL = vi.fn();
      const mockAnchor = {
        href: '',
        download: '',
        click: vi.fn()
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);

      render(<AccessMonitoring />);

      await waitFor(() => {
        expect(screen.getByText('Export')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Export'));

      await waitFor(() => {
        expect(mockAnchor.click).toHaveBeenCalled();
      });
    });
  });

  describe('Integration Tests', () => {
    it('should integrate CSRF protection with secure logout', async () => {
      vi.mocked(adminSecurityService.getCSRFToken).mockResolvedValue('test-csrf-token');
      vi.mocked(adminSecurityService.secureLogout).mockResolvedValue();

      render(
        <CSRFProvider>
          <QuickSecureLogout />
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

    it('should handle session validation with CSRF protection', async () => {
      const mockSessionInfo = {
        sessionId: 'test-session-123',
        userId: 'admin-user-1',
        role: 'admin' as const,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 Test Browser',
        lastActivity: new Date(),
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
        isValid: true
      };

      vi.mocked(adminSecurityService.validateAdminSession).mockResolvedValue(mockSessionInfo);
      vi.mocked(adminSecurityService.getCSRFToken).mockResolvedValue('test-csrf-token');

      render(
        <CSRFProvider>
          <EnhancedSessionValidation />
          <CSRFStatus />
        </CSRFProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Admin Session')).toBeInTheDocument();
        expect(screen.getByText('CSRF Protection')).toBeInTheDocument();
      });
    });
  });
});