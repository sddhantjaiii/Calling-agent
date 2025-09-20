interface AdminErrorReport {
  errorId: string;
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
  userAgent: string;
  url: string;
  userId?: string;
  adminContext: AdminContext;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'ui' | 'api' | 'auth' | 'data' | 'system';
  metadata?: Record<string, any>;
}

interface AdminContext {
  currentPath: string;
  adminSection: string;
  userRole?: string;
  sessionId?: string;
  timestamp: string;
  browserInfo: BrowserInfo;
  performanceMetrics?: PerformanceMetrics;
}

interface BrowserInfo {
  userAgent: string;
  language: string;
  platform: string;
  cookieEnabled: boolean;
  onLine: boolean;
  screenResolution: string;
  viewportSize: string;
}

interface PerformanceMetrics {
  memoryUsage?: number;
  loadTime?: number;
  renderTime?: number;
  apiResponseTimes: number[];
}

class AdminErrorReportingService {
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000;
  private readonly batchSize = 10;
  private errorQueue: AdminErrorReport[] = [];
  private isProcessing = false;

  constructor() {
    // Process error queue periodically
    setInterval(() => this.processErrorQueue(), 30000); // Every 30 seconds
    
    // Process queue before page unload
    window.addEventListener('beforeunload', () => this.flushErrorQueue());
  }

  async reportError(
    error: Error,
    context: Partial<AdminContext> = {},
    severity: AdminErrorReport['severity'] = 'medium',
    category: AdminErrorReport['category'] = 'ui',
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const errorReport = this.createErrorReport(error, context, severity, category, metadata);
      
      // Add to queue for batch processing
      this.errorQueue.push(errorReport);
      
      // For critical errors, send immediately
      if (severity === 'critical') {
        await this.sendErrorReport(errorReport);
      }
      
      // Log locally for debugging
      this.logErrorLocally(errorReport);
      
    } catch (reportingError) {
      console.error('Failed to report admin error:', reportingError);
      // Fallback to local logging only
      this.logErrorLocally({
        errorId: this.generateErrorId(),
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        adminContext: this.getAdminContext(context),
        severity,
        category,
        metadata
      });
    }
  }

  private createErrorReport(
    error: Error,
    context: Partial<AdminContext>,
    severity: AdminErrorReport['severity'],
    category: AdminErrorReport['category'],
    metadata?: Record<string, any>
  ): AdminErrorReport {
    return {
      errorId: this.generateErrorId(),
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.getCurrentUserId(),
      adminContext: this.getAdminContext(context),
      severity,
      category,
      metadata: {
        ...metadata,
        errorName: error.name,
        errorConstructor: error.constructor.name
      }
    };
  }

  private generateErrorId(): string {
    return `admin-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCurrentUserId(): string | undefined {
    try {
      const authData = localStorage.getItem('auth');
      return authData ? JSON.parse(authData).userId : undefined;
    } catch {
      return undefined;
    }
  }

  private getAdminContext(context: Partial<AdminContext> = {}): AdminContext {
    return {
      currentPath: window.location.pathname,
      adminSection: this.extractAdminSection(),
      userRole: this.getCurrentUserRole(),
      sessionId: this.getSessionId(),
      timestamp: new Date().toISOString(),
      browserInfo: this.getBrowserInfo(),
      performanceMetrics: this.getPerformanceMetrics(),
      ...context
    };
  }

  private extractAdminSection(): string {
    const path = window.location.pathname;
    const adminMatch = path.match(/\/admin\/([^\/]+)/);
    return adminMatch ? adminMatch[1] : 'unknown';
  }

  private getCurrentUserRole(): string | undefined {
    try {
      const authData = localStorage.getItem('auth');
      return authData ? JSON.parse(authData).role : undefined;
    } catch {
      return undefined;
    }
  }

  private getSessionId(): string | undefined {
    try {
      return sessionStorage.getItem('sessionId') || undefined;
    } catch {
      return undefined;
    }
  }

  private getBrowserInfo(): BrowserInfo {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screenResolution: `${screen.width}x${screen.height}`,
      viewportSize: `${window.innerWidth}x${window.innerHeight}`
    };
  }

  private getPerformanceMetrics(): PerformanceMetrics | undefined {
    try {
      const performance = window.performance;
      const memory = (performance as any).memory;
      
      return {
        memoryUsage: memory ? memory.usedJSHeapSize : undefined,
        loadTime: performance.timing ? 
          performance.timing.loadEventEnd - performance.timing.navigationStart : undefined,
        renderTime: performance.timing ? 
          performance.timing.domContentLoadedEventEnd - performance.timing.domLoading : undefined,
        apiResponseTimes: this.getRecentApiResponseTimes()
      };
    } catch {
      return undefined;
    }
  }

  private getRecentApiResponseTimes(): number[] {
    try {
      const entries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      return entries.slice(-5).map(entry => entry.responseEnd - entry.requestStart);
    } catch {
      return [];
    }
  }

  private async sendErrorReport(errorReport: AdminErrorReport): Promise<void> {
    const authToken = this.getAuthToken();
    
    if (!authToken) {
      throw new Error('No authentication token available');
    }

    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch('/admin/errors', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify(errorReport)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return; // Success
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.maxRetries) {
          await this.sleep(this.retryDelay * attempt);
        }
      }
    }

    throw lastError;
  }

  private getAuthToken(): string | null {
    try {
      const authData = localStorage.getItem('auth');
      return authData ? JSON.parse(authData).token : null;
    } catch {
      return null;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async processErrorQueue(): Promise<void> {
    if (this.isProcessing || this.errorQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const batch = this.errorQueue.splice(0, this.batchSize);
      
      for (const errorReport of batch) {
        try {
          await this.sendErrorReport(errorReport);
        } catch (error) {
          // Re-queue failed reports (up to a limit)
          if (this.errorQueue.length < 100) {
            this.errorQueue.push(errorReport);
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private flushErrorQueue(): void {
    // Send critical errors synchronously before page unload
    const criticalErrors = this.errorQueue.filter(error => error.severity === 'critical');
    
    for (const errorReport of criticalErrors) {
      try {
        navigator.sendBeacon('/admin/errors', JSON.stringify(errorReport));
      } catch (error) {
        console.error('Failed to send critical error report:', error);
      }
    }
  }

  private logErrorLocally(errorReport: AdminErrorReport): void {
    try {
      const localErrors = JSON.parse(localStorage.getItem('adminErrors') || '[]');
      localErrors.push(errorReport);
      
      // Keep only the last 50 errors
      if (localErrors.length > 50) {
        localErrors.splice(0, localErrors.length - 50);
      }
      
      localStorage.setItem('adminErrors', JSON.stringify(localErrors));
    } catch (error) {
      console.error('Failed to log error locally:', error);
    }
  }

  // Public methods for retrieving local error logs
  getLocalErrors(): AdminErrorReport[] {
    try {
      return JSON.parse(localStorage.getItem('adminErrors') || '[]');
    } catch {
      return [];
    }
  }

  clearLocalErrors(): void {
    try {
      localStorage.removeItem('adminErrors');
    } catch (error) {
      console.error('Failed to clear local errors:', error);
    }
  }

  // Convenience methods for different error types
  reportUIError(error: Error, metadata?: Record<string, any>): Promise<void> {
    return this.reportError(error, {}, 'medium', 'ui', metadata);
  }

  reportAPIError(error: Error, metadata?: Record<string, any>): Promise<void> {
    return this.reportError(error, {}, 'high', 'api', metadata);
  }

  reportAuthError(error: Error, metadata?: Record<string, any>): Promise<void> {
    return this.reportError(error, {}, 'high', 'auth', metadata);
  }

  reportDataError(error: Error, metadata?: Record<string, any>): Promise<void> {
    return this.reportError(error, {}, 'medium', 'data', metadata);
  }

  reportSystemError(error: Error, metadata?: Record<string, any>): Promise<void> {
    return this.reportError(error, {}, 'critical', 'system', metadata);
  }
}

// Export singleton instance
export const adminErrorReporting = new AdminErrorReportingService();
export default adminErrorReporting;