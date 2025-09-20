interface AdminAnalyticsEvent {
  event: string;
  properties: Record<string, any>;
  timestamp: Date;
  userId: string;
  sessionId: string;
}

interface AdminUsageMetrics {
  pageViews: Record<string, number>;
  actions: Record<string, number>;
  sessionDuration: number;
  errorCount: number;
  performanceMetrics: {
    loadTimes: Record<string, number>;
    apiResponseTimes: Record<string, number>;
  };
}

class AdminAnalyticsService {
  private events: AdminAnalyticsEvent[] = [];
  private sessionId: string;
  private sessionStart: Date;
  private currentUserId: string | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.sessionStart = new Date();
    this.setupPerformanceMonitoring();
    this.setupErrorTracking();
  }

  private generateSessionId(): string {
    return `admin_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  setUserId(userId: string) {
    this.currentUserId = userId;
  }

  // Track page views
  trackPageView(page: string, properties: Record<string, any> = {}) {
    this.track('admin_page_view', {
      page,
      ...properties
    });
  }

  // Track user actions
  trackAction(action: string, properties: Record<string, any> = {}) {
    this.track('admin_action', {
      action,
      ...properties
    });
  }

  // Track errors
  trackError(error: Error, context: Record<string, any> = {}) {
    this.track('admin_error', {
      error: error.message,
      stack: error.stack,
      context
    });
  }

  // Track performance metrics
  trackPerformance(metric: string, value: number, properties: Record<string, any> = {}) {
    this.track('admin_performance', {
      metric,
      value,
      ...properties
    });
  }

  // Track API calls
  trackApiCall(endpoint: string, method: string, duration: number, status: number) {
    this.track('admin_api_call', {
      endpoint,
      method,
      duration,
      status,
      success: status >= 200 && status < 300
    });
  }

  // Generic tracking method
  private track(event: string, properties: Record<string, any> = {}) {
    if (!this.currentUserId) return;

    const analyticsEvent: AdminAnalyticsEvent = {
      event,
      properties: {
        ...properties,
        userAgent: navigator.userAgent,
        url: window.location.href,
        referrer: document.referrer,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date(),
      userId: this.currentUserId,
      sessionId: this.sessionId
    };

    this.events.push(analyticsEvent);
    
    // Send to backend (batch processing)
    this.batchSendEvents();
  }

  // Batch send events to reduce API calls
  private batchSendEvents() {
    if (this.events.length >= 10) {
      this.sendEvents();
    }
  }

  // Send events to backend
  private async sendEvents() {
    if (this.events.length === 0) return;

    const eventsToSend = [...this.events];
    this.events = [];

    try {
      await fetch('/admin/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events: eventsToSend,
          sessionId: this.sessionId,
          sessionDuration: Date.now() - this.sessionStart.getTime()
        })
      });
    } catch (error) {
      console.error('Failed to send analytics events:', error);
      // Re-add events to queue for retry
      this.events.unshift(...eventsToSend);
    }
  }

  // Setup performance monitoring
  private setupPerformanceMonitoring() {
    // Monitor page load times
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        this.trackPerformance('page_load_time', navigation.loadEventEnd - navigation.loadEventStart);
        this.trackPerformance('dom_content_loaded', navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart);
        this.trackPerformance('first_paint', navigation.loadEventEnd - navigation.fetchStart);
      }
    });

    // Monitor resource loading
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'resource') {
          const resourceEntry = entry as PerformanceResourceTiming;
          this.trackPerformance('resource_load_time', resourceEntry.duration, {
            resource: resourceEntry.name,
            type: resourceEntry.initiatorType
          });
        }
      });
    });
    observer.observe({ entryTypes: ['resource'] });
  }

  // Setup error tracking
  private setupErrorTracking() {
    window.addEventListener('error', (event) => {
      this.trackError(event.error || new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.trackError(new Error(event.reason), {
        type: 'unhandled_promise_rejection'
      });
    });
  }

  // Get current session metrics
  getSessionMetrics(): AdminUsageMetrics {
    const pageViews: Record<string, number> = {};
    const actions: Record<string, number> = {};
    const loadTimes: Record<string, number> = {};
    const apiResponseTimes: Record<string, number> = {};
    let errorCount = 0;

    this.events.forEach(event => {
      switch (event.event) {
        case 'admin_page_view':
          const page = event.properties.page;
          pageViews[page] = (pageViews[page] || 0) + 1;
          break;
        case 'admin_action':
          const action = event.properties.action;
          actions[action] = (actions[action] || 0) + 1;
          break;
        case 'admin_error':
          errorCount++;
          break;
        case 'admin_performance':
          const metric = event.properties.metric;
          loadTimes[metric] = event.properties.value;
          break;
        case 'admin_api_call':
          const endpoint = event.properties.endpoint;
          apiResponseTimes[endpoint] = event.properties.duration;
          break;
      }
    });

    return {
      pageViews,
      actions,
      sessionDuration: Date.now() - this.sessionStart.getTime(),
      errorCount,
      performanceMetrics: {
        loadTimes,
        apiResponseTimes
      }
    };
  }

  // Flush remaining events (call on page unload)
  flush() {
    this.sendEvents();
  }

  // Get admin panel usage statistics
  async getAdminUsageStats(timeRange: '24h' | '7d' | '30d' = '24h') {
    try {
      const response = await fetch(`/admin/analytics/stats?range=${timeRange}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch admin usage stats:', error);
      return null;
    }
  }

  // Get admin user activity
  async getAdminUserActivity(userId?: string, timeRange: '24h' | '7d' | '30d' = '24h') {
    try {
      const url = userId 
        ? `/admin/analytics/user-activity?userId=${userId}&range=${timeRange}`
        : `/admin/analytics/user-activity?range=${timeRange}`;
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch admin user activity:', error);
      return null;
    }
  }
}

// Create singleton instance
export const adminAnalyticsService = new AdminAnalyticsService();

// React hook for admin analytics
export const useAdminAnalytics = () => {
  const trackPageView = (page: string, properties?: Record<string, any>) => {
    adminAnalyticsService.trackPageView(page, properties);
  };

  const trackAction = (action: string, properties?: Record<string, any>) => {
    adminAnalyticsService.trackAction(action, properties);
  };

  const trackError = (error: Error, context?: Record<string, any>) => {
    adminAnalyticsService.trackError(error, context);
  };

  const trackPerformance = (metric: string, value: number, properties?: Record<string, any>) => {
    adminAnalyticsService.trackPerformance(metric, value, properties);
  };

  return {
    trackPageView,
    trackAction,
    trackError,
    trackPerformance,
    getSessionMetrics: () => adminAnalyticsService.getSessionMetrics()
  };
};

// Setup page unload handler
window.addEventListener('beforeunload', () => {
  adminAnalyticsService.flush();
});

export default adminAnalyticsService;