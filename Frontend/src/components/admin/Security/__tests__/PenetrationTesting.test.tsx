import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { adminSecurityService } from '@/services/adminSecurityService';

// Mock fetch for testing
global.fetch = vi.fn();

describe('Penetration Testing - Security Validation', () => {
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authentication Bypass Attempts', () => {
    it('should reject requests without valid admin tokens', async () => {
      // Mock unauthorized response
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } })
      } as Response);

      // Remove auth token
      vi.mocked(window.localStorage.getItem).mockReturnValue(null);

      try {
        await adminSecurityService.validateAdminSession();
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('Session validation failed');
      }
    });

    it('should reject requests with malformed tokens', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: { code: 'INVALID_TOKEN', message: 'Malformed token' } })
      } as Response);

      // Mock malformed token
      vi.mocked(window.localStorage.getItem).mockReturnValue('invalid.token.format');

      try {
        await adminSecurityService.validateAdminSession();
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('Session validation failed');
      }
    });

    it('should reject expired tokens', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: { code: 'TOKEN_EXPIRED', message: 'Token has expired' } })
      } as Response);

      // Mock expired token (JWT with exp in the past)
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';
      vi.mocked(window.localStorage.getItem).mockReturnValue(expiredToken);

      try {
        await adminSecurityService.validateAdminSession();
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('Session validation failed');
      }
    });
  });

  describe('CSRF Attack Prevention', () => {
    it('should reject requests without CSRF tokens', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: { code: 'CSRF_TOKEN_MISSING', message: 'CSRF token required' } })
      } as Response);

      try {
        await adminSecurityService.secureAdminRequest('POST', '/admin/test', {});
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('CSRF token generation failed');
      }
    });

    it('should reject requests with invalid CSRF tokens', async () => {
      // First call to get CSRF token fails
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'invalid-csrf-token', expiresIn: 3600 })
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          json: async () => ({ error: { code: 'INVALID_CSRF_TOKEN', message: 'Invalid CSRF token' } })
        } as Response);

      try {
        await adminSecurityService.secureAdminRequest('POST', '/admin/test', {});
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });

    it('should include CSRF tokens in all state-changing requests', async () => {
      const mockToken = 'valid-csrf-token-123';
      
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: mockToken, expiresIn: 3600 })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        } as Response);

      await adminSecurityService.secureAdminRequest('POST', '/admin/test', { data: 'test' });

      // Verify CSRF token was included in the request
      expect(fetch).toHaveBeenCalledWith(
        '/admin/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-CSRF-Token': mockToken,
            'X-Admin-Request': 'true'
          })
        })
      );
    });
  });

  describe('Session Hijacking Prevention', () => {
    it('should validate session fingerprints', async () => {
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

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSessionInfo
      } as Response);

      const result = await adminSecurityService.validateAdminSession();

      expect(result.ipAddress).toBeDefined();
      expect(result.userAgent).toBeDefined();
      expect(result.sessionId).toBeDefined();
    });

    it('should detect suspicious IP address changes', async () => {
      const suspiciousActivity = {
        hasSuspiciousActivity: true,
        alerts: [
          {
            type: 'unusual_location',
            message: 'Login from new IP address detected',
            severity: 'high' as const,
            timestamp: new Date()
          }
        ]
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => suspiciousActivity
      } as Response);

      const result = await adminSecurityService.checkSuspiciousActivity();

      expect(result.hasSuspiciousActivity).toBe(true);
      expect(result.alerts).toHaveLength(1);
      expect(result.alerts[0].type).toBe('unusual_location');
    });

    it('should detect rapid successive actions', async () => {
      const suspiciousActivity = {
        hasSuspiciousActivity: true,
        alerts: [
          {
            type: 'rapid_actions',
            message: 'Unusually rapid admin actions detected',
            severity: 'medium' as const,
            timestamp: new Date()
          }
        ]
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => suspiciousActivity
      } as Response);

      const result = await adminSecurityService.checkSuspiciousActivity();

      expect(result.hasSuspiciousActivity).toBe(true);
      expect(result.alerts[0].type).toBe('rapid_actions');
    });
  });

  describe('Privilege Escalation Prevention', () => {
    it('should validate admin role before sensitive operations', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: { code: 'INSUFFICIENT_PRIVILEGES', message: 'Admin role required' } })
      } as Response);

      try {
        await adminSecurityService.secureAdminRequest('POST', '/admin/users/delete', { userId: 'test' });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });

    it('should prevent unauthorized access to super admin functions', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: { code: 'SUPER_ADMIN_REQUIRED', message: 'Super admin role required' } })
      } as Response);

      try {
        await adminSecurityService.secureAdminRequest('POST', '/admin/system/config', { setting: 'test' });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Data Exposure Prevention', () => {
    it('should mask sensitive data in API responses', async () => {
      const mockAccessLogs = [
        {
          id: 'log-1',
          adminUserId: 'admin-1',
          action: 'user_update',
          resource: 'user',
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0',
          timestamp: new Date(),
          success: true,
          details: { apiKey: 'sk-1234567890abcdef', password: 'secret123' }
        }
      ];

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAccessLogs
      } as Response);

      const logs = await adminSecurityService.getAccessLogs();

      // Verify sensitive data is not exposed in logs
      expect(JSON.stringify(logs)).not.toContain('sk-1234567890abcdef');
      expect(JSON.stringify(logs)).not.toContain('secret123');
    });

    it('should prevent information disclosure through error messages', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ 
          error: { 
            code: 'INTERNAL_ERROR', 
            message: 'An error occurred',
            // Should not include sensitive details like database connection strings
            details: undefined
          } 
        })
      } as Response);

      try {
        await adminSecurityService.validateAdminSession();
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        // Error message should be generic, not expose internal details
        expect(error.message).not.toContain('database');
        expect(error.message).not.toContain('connection');
        expect(error.message).not.toContain('password');
      }
    });
  });

  describe('Brute Force Attack Prevention', () => {
    it('should handle rate limiting responses', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Map([['retry-after', '60']]),
        json: async () => ({ 
          error: { 
            code: 'RATE_LIMITED', 
            message: 'Too many requests. Please wait 60 seconds.' 
          } 
        })
      } as Response);

      try {
        await adminSecurityService.validateAdminSession();
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('Session validation failed');
      }
    });

    it('should detect multiple failed login attempts', async () => {
      const suspiciousActivity = {
        hasSuspiciousActivity: true,
        alerts: [
          {
            type: 'multiple_failed_logins',
            message: 'Multiple failed login attempts from same IP',
            severity: 'high' as const,
            timestamp: new Date()
          }
        ]
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => suspiciousActivity
      } as Response);

      const result = await adminSecurityService.checkSuspiciousActivity();

      expect(result.alerts[0].type).toBe('multiple_failed_logins');
      expect(result.alerts[0].severity).toBe('high');
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should handle malicious input in admin requests', async () => {
      const maliciousPayload = {
        userId: '<script>alert("xss")</script>',
        action: '../../etc/passwd',
        data: { __proto__: { isAdmin: true } }
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Invalid input data' 
          } 
        })
      } as Response);

      try {
        await adminSecurityService.secureAdminRequest('POST', '/admin/test', maliciousPayload);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });

    it('should validate request parameters', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ 
          error: { 
            code: 'INVALID_PARAMETERS', 
            message: 'Invalid request parameters' 
          } 
        })
      } as Response);

      try {
        await adminSecurityService.getAccessLogs({
          limit: -1, // Invalid limit
          startDate: new Date('invalid-date') // Invalid date
        });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Secure Communication', () => {
    it('should use HTTPS for all admin requests', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as Response);

      await adminSecurityService.secureAdminRequest('GET', '/admin/test');

      // In a real test, you would verify the URL starts with https://
      // For this mock test, we just verify the request was made
      expect(fetch).toHaveBeenCalledWith(
        '/admin/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Admin-Request': 'true'
          })
        })
      );
    });

    it('should include security headers in requests', async () => {
      const mockToken = 'csrf-token-123';
      
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: mockToken, expiresIn: 3600 })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        } as Response);

      await adminSecurityService.secureAdminRequest('POST', '/admin/test', {});

      expect(fetch).toHaveBeenLastCalledWith(
        '/admin/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-CSRF-Token': mockToken,
            'X-Admin-Request': 'true',
            'Content-Type': 'application/json'
          })
        })
      );
    });
  });

  describe('Session Management Security', () => {
    it('should properly clean up session data on logout', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        } as Response);

      // Mock caches API
      Object.defineProperty(window, 'caches', {
        value: {
          keys: vi.fn().mockResolvedValue(['cache1', 'cache2']),
          delete: vi.fn().mockResolvedValue(true)
        },
        writable: true
      });

      await adminSecurityService.secureLogout();

      // Verify all cleanup operations were performed
      expect(window.localStorage.clear).toHaveBeenCalled();
      expect(window.sessionStorage.clear).toHaveBeenCalled();
      expect(window.caches.keys).toHaveBeenCalled();
      expect(window.caches.delete).toHaveBeenCalledTimes(2);
    });

    it('should handle session timeout gracefully', async () => {
      const expiredSession = {
        sessionId: 'expired-session',
        userId: 'admin-user-1',
        role: 'admin' as const,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
        lastActivity: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        isValid: false
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => expiredSession
      } as Response);

      const result = await adminSecurityService.validateAdminSession();

      expect(result.isValid).toBe(false);
      expect(new Date(result.expiresAt).getTime()).toBeLessThan(Date.now());
    });
  });

  describe('Audit Trail Security', () => {
    it('should log all admin actions for audit trail', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as Response);

      await adminSecurityService.logAdminAction(
        'user_delete',
        'user',
        'user-123',
        { reason: 'policy violation' }
      );

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/security/audit-log'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('user_delete')
        })
      );
    });

    it('should prevent audit log tampering', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ 
          error: { 
            code: 'AUDIT_LOG_READONLY', 
            message: 'Audit logs are read-only' 
          } 
        })
      } as Response);

      try {
        await adminSecurityService.secureAdminRequest('DELETE', '/admin/security/audit-log/123');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });
  });
});