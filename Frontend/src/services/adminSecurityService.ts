import { apiService } from './apiService';

export interface AdminSessionInfo {
  sessionId: string;
  userId: string;
  role: 'admin' | 'super_admin';
  ipAddress: string;
  userAgent: string;
  lastActivity: Date;
  expiresAt: Date;
  isValid: boolean;
}

export interface CSRFToken {
  token: string;
  expiresAt: Date;
}

export interface AdminActionLog {
  id: string;
  adminUserId: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  success: boolean;
  details?: Record<string, any>;
}

class AdminSecurityService {
  private csrfToken: string | null = null;
  private sessionCheckInterval: NodeJS.Timeout | null = null;
  private readonly SESSION_CHECK_INTERVAL = 10 * 60 * 1000; // 10 minutes

  /**
   * Enhanced session validation for admin users
   */
  async validateAdminSession(): Promise<AdminSessionInfo> {
    try {
      const response = await apiService['request']<AdminSessionInfo>('/admin/security/session/validate');
      return response as AdminSessionInfo;
    } catch (error) {
      console.error('Admin session validation failed:', error);
      throw new Error('Session validation failed');
    }
  }

  /**
   * Start continuous session monitoring (DISABLED)
   */
  startSessionMonitoring(): void {
    // Session monitoring disabled to prevent excessive API calls
    console.log('Session monitoring disabled');
    return;
  }

  /**
   * Stop session monitoring
   */
  stopSessionMonitoring(): void {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }
  }

  /**
   * Handle invalid session
   */
  private handleInvalidSession(): void {
    this.stopSessionMonitoring();
    // Clear local storage and redirect to login
    localStorage.removeItem('auth_token');
    sessionStorage.clear();
    window.location.href = '/login';
  }

  /**
   * Get CSRF token for admin operations
   */
  async getCSRFToken(): Promise<string> {
    try {
      if (this.csrfToken) {
        return this.csrfToken;
      }

      const response = await apiService['request']<{ token: string; expiresIn: number }>('/admin/security/csrf-token');
      const data = response as { token: string; expiresIn: number };
      this.csrfToken = data.token;
      
      // Auto-refresh token before expiry
      setTimeout(() => {
        this.csrfToken = null;
      }, data.expiresIn * 1000 - 60000); // Refresh 1 minute before expiry

      return this.csrfToken;
    } catch (error) {
      console.error('Failed to get CSRF token:', error);
      throw new Error('CSRF token generation failed');
    }
  }

  /**
   * Make secure admin API request with CSRF protection
   */
  async secureAdminRequest(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    options?: any
  ): Promise<any> {
    const csrfToken = await this.getCSRFToken();
    
    const headers = {
      'X-CSRF-Token': csrfToken,
      'X-Admin-Request': 'true',
      ...options?.headers
    };

    const requestOptions = {
      method,
      headers,
      ...(data && method !== 'GET' && { body: JSON.stringify(data) }),
      ...options
    };

    return apiService['request'](endpoint, requestOptions);
  }

  /**
   * Log admin action for audit trail
   */
  async logAdminAction(
    action: string,
    resource: string,
    resourceId?: string,
    details?: Record<string, any>
  ): Promise<void> {
    try {
      await this.secureAdminRequest('POST', '/admin/security/audit-log', {
        action,
        resource,
        resourceId,
        details,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to log admin action:', error);
      // Don't throw error to avoid breaking the main operation
    }
  }

  /**
   * Get IP-based access logs
   */
  async getAccessLogs(filters?: {
    adminUserId?: string;
    ipAddress?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<AdminActionLog[]> {
    try {
      let url = '/admin/security/access-logs';
      if (filters) {
        const params = new URLSearchParams();
        if (filters.adminUserId) params.append('adminUserId', filters.adminUserId);
        if (filters.ipAddress) params.append('ipAddress', filters.ipAddress);
        if (filters.startDate) params.append('startDate', filters.startDate.toISOString());
        if (filters.endDate) params.append('endDate', filters.endDate.toISOString());
        if (filters.limit) params.append('limit', filters.limit.toString());
        
        if (params.toString()) {
          url += `?${params.toString()}`;
        }
      }

      const response = await this.secureAdminRequest('GET', url);
      return Array.isArray(response) ? response : response.data || [];
    } catch (error) {
      console.error('Failed to get access logs:', error);
      throw new Error('Failed to retrieve access logs');
    }
  }

  /**
   * Secure admin logout with session cleanup
   */
  async secureLogout(): Promise<void> {
    try {
      // Stop session monitoring
      this.stopSessionMonitoring();

      // Log logout action
      await this.logAdminAction('logout', 'session');

      // Call backend logout endpoint
      await this.secureAdminRequest('POST', '/admin/security/logout');

      // Clear all local data
      localStorage.clear();
      sessionStorage.clear();
      this.csrfToken = null;

      // Clear any cached data
      if (window.caches) {
        const cacheNames = await window.caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => window.caches.delete(cacheName))
        );
      }

      // Redirect to login
      window.location.href = '/login';
    } catch (error) {
      console.error('Secure logout failed:', error);
      // Force logout even if backend call fails
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
    }
  }

  /**
   * Check for suspicious activity patterns
   */
  async checkSuspiciousActivity(): Promise<{
    hasSuspiciousActivity: boolean;
    alerts: Array<{
      type: string;
      message: string;
      severity: 'low' | 'medium' | 'high';
      timestamp: Date;
    }>;
  }> {
    try {
      const response = await this.secureAdminRequest('GET', '/admin/security/suspicious-activity');
      return response || {
        hasSuspiciousActivity: false,
        alerts: []
      };
    } catch (error) {
      console.error('Failed to check suspicious activity:', error);
      return {
        hasSuspiciousActivity: false,
        alerts: []
      };
    }
  }
}

export const adminSecurityService = new AdminSecurityService();