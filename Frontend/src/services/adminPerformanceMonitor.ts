interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

interface MemoryUsage {
  used: number;
  total: number;
  percentage: number;
  timestamp: number;
}

interface ComponentRenderMetric {
  componentName: string;
  renderTime: number;
  propsSize: number;
  timestamp: number;
}

class AdminPerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private memorySnapshots: MemoryUsage[] = [];
  private renderMetrics: ComponentRenderMetric[] = [];
  private observers: PerformanceObserver[] = [];
  private isMonitoring = false;
  private maxMetrics = 1000;

  constructor() {
    this.setupPerformanceObservers();
  }

  private setupPerformanceObservers() {
    if (typeof window === 'undefined' || !window.PerformanceObserver) {
      return;
    }

    try {
      // Observe navigation timing
      const navObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          this.recordMetric({
            name: `navigation:${entry.name}`,
            startTime: entry.startTime,
            endTime: entry.startTime + entry.duration,
            duration: entry.duration,
            metadata: {
              type: entry.entryType,
              transferSize: (entry as any).transferSize,
              decodedBodySize: (entry as any).decodedBodySize
            }
          });
        });
      });

      navObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navObserver);

      // Observe resource timing
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name.includes('/admin/')) {
            this.recordMetric({
              name: `resource:${entry.name}`,
              startTime: entry.startTime,
              endTime: entry.startTime + entry.duration,
              duration: entry.duration,
              metadata: {
                type: entry.entryType,
                transferSize: (entry as any).transferSize,
                initiatorType: (entry as any).initiatorType
              }
            });
          }
        });
      });

      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);

      // Observe long tasks
      const longTaskObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          this.recordMetric({
            name: 'long-task',
            startTime: entry.startTime,
            endTime: entry.startTime + entry.duration,
            duration: entry.duration,
            metadata: {
              type: entry.entryType,
              attribution: (entry as any).attribution
            }
          });
        });
      });

      longTaskObserver.observe({ entryTypes: ['longtask'] });
      this.observers.push(longTaskObserver);

    } catch (error) {
      console.warn('Failed to setup performance observers:', error);
    }
  }

  startMonitoring(): void {
    this.isMonitoring = true;
    this.startMemoryMonitoring();
  }

  stopMonitoring(): void {
    this.isMonitoring = false;
  }

  private startMemoryMonitoring(): void {
    if (typeof window === 'undefined' || !(performance as any).memory) {
      return;
    }

    const captureMemory = () => {
      if (!this.isMonitoring) return;

      const memory = (performance as any).memory;
      const usage: MemoryUsage = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
        timestamp: Date.now()
      };

      this.memorySnapshots.push(usage);

      // Keep only last 100 snapshots
      if (this.memorySnapshots.length > 100) {
        this.memorySnapshots = this.memorySnapshots.slice(-100);
      }

      setTimeout(captureMemory, 5000); // Capture every 5 seconds
    };

    captureMemory();
  }

  // Measure admin operation performance
  measureOperation<T>(name: string, operation: () => T | Promise<T>, metadata?: Record<string, any>): Promise<T> {
    const startTime = performance.now();
    
    const finish = (result: T, error?: Error) => {
      const endTime = performance.now();
      this.recordMetric({
        name: `operation:${name}`,
        startTime,
        endTime,
        duration: endTime - startTime,
        metadata: {
          ...metadata,
          success: !error,
          error: error?.message
        }
      });
      return result;
    };

    try {
      const result = operation();
      
      if (result instanceof Promise) {
        return result
          .then(res => finish(res))
          .catch(err => {
            finish(null as any, err);
            throw err;
          });
      } else {
        return Promise.resolve(finish(result));
      }
    } catch (error) {
      finish(null as any, error as Error);
      throw error;
    }
  }

  // Measure component render performance
  measureComponentRender(componentName: string, renderFn: () => void, props?: any): void {
    const startTime = performance.now();
    
    renderFn();
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    this.renderMetrics.push({
      componentName,
      renderTime,
      propsSize: props ? JSON.stringify(props).length : 0,
      timestamp: Date.now()
    });

    // Keep only last 500 render metrics
    if (this.renderMetrics.length > 500) {
      this.renderMetrics = this.renderMetrics.slice(-500);
    }

    // Warn about slow renders
    if (renderTime > 16) { // More than one frame at 60fps
      console.warn(`Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`);
    }
  }

  private recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Keep metrics within limit
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  // Get performance statistics
  getStats() {
    const now = Date.now();
    const recentMetrics = this.metrics.filter(m => now - m.startTime < 60000); // Last minute

    const operationMetrics = recentMetrics.filter(m => m.name.startsWith('operation:'));
    const resourceMetrics = recentMetrics.filter(m => m.name.startsWith('resource:'));
    const longTasks = recentMetrics.filter(m => m.name === 'long-task');

    const avgOperationTime = operationMetrics.length > 0
      ? operationMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) / operationMetrics.length
      : 0;

    const avgResourceTime = resourceMetrics.length > 0
      ? resourceMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) / resourceMetrics.length
      : 0;

    const currentMemory = this.memorySnapshots[this.memorySnapshots.length - 1];
    const memoryTrend = this.calculateMemoryTrend();

    const slowRenders = this.renderMetrics.filter(m => m.renderTime > 16);
    const avgRenderTime = this.renderMetrics.length > 0
      ? this.renderMetrics.reduce((sum, m) => sum + m.renderTime, 0) / this.renderMetrics.length
      : 0;

    return {
      operations: {
        total: operationMetrics.length,
        averageTime: avgOperationTime,
        slowOperations: operationMetrics.filter(m => (m.duration || 0) > 1000).length
      },
      resources: {
        total: resourceMetrics.length,
        averageTime: avgResourceTime,
        slowResources: resourceMetrics.filter(m => (m.duration || 0) > 2000).length
      },
      longTasks: {
        count: longTasks.length,
        totalTime: longTasks.reduce((sum, m) => sum + (m.duration || 0), 0)
      },
      memory: {
        current: currentMemory,
        trend: memoryTrend,
        snapshots: this.memorySnapshots.length
      },
      rendering: {
        totalRenders: this.renderMetrics.length,
        averageTime: avgRenderTime,
        slowRenders: slowRenders.length,
        slowestComponents: this.getSlowestComponents(5)
      }
    };
  }

  private calculateMemoryTrend(): 'increasing' | 'decreasing' | 'stable' {
    if (this.memorySnapshots.length < 5) return 'stable';

    const recent = this.memorySnapshots.slice(-5);
    const first = recent[0].percentage;
    const last = recent[recent.length - 1].percentage;
    const diff = last - first;

    if (diff > 5) return 'increasing';
    if (diff < -5) return 'decreasing';
    return 'stable';
  }

  private getSlowestComponents(limit: number): Array<{ name: string; avgTime: number; count: number }> {
    const componentStats = new Map<string, { totalTime: number; count: number }>();

    this.renderMetrics.forEach(metric => {
      const existing = componentStats.get(metric.componentName) || { totalTime: 0, count: 0 };
      componentStats.set(metric.componentName, {
        totalTime: existing.totalTime + metric.renderTime,
        count: existing.count + 1
      });
    });

    return Array.from(componentStats.entries())
      .map(([name, stats]) => ({
        name,
        avgTime: stats.totalTime / stats.count,
        count: stats.count
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, limit);
  }

  // Export metrics for analysis
  exportMetrics() {
    return {
      metrics: this.metrics,
      memorySnapshots: this.memorySnapshots,
      renderMetrics: this.renderMetrics,
      stats: this.getStats(),
      timestamp: Date.now()
    };
  }

  // Clear all metrics
  clear(): void {
    this.metrics = [];
    this.memorySnapshots = [];
    this.renderMetrics = [];
  }

  // Cleanup
  destroy(): void {
    this.stopMonitoring();
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.clear();
  }
}

// React hook for performance monitoring
export const usePerformanceMonitor = () => {
  const measureRender = (componentName: string, props?: any) => {
    return (renderFn: () => void) => {
      adminPerformanceMonitor.measureComponentRender(componentName, renderFn, props);
    };
  };

  const measureOperation = <T>(name: string, operation: () => T | Promise<T>, metadata?: Record<string, any>) => {
    return adminPerformanceMonitor.measureOperation(name, operation, metadata);
  };

  return {
    measureRender,
    measureOperation,
    getStats: () => adminPerformanceMonitor.getStats(),
    exportMetrics: () => adminPerformanceMonitor.exportMetrics()
  };
};

// Create singleton instance
export const adminPerformanceMonitor = new AdminPerformanceMonitor();

// Auto-start monitoring in development
if (process.env.NODE_ENV === 'development') {
  adminPerformanceMonitor.startMonitoring();
}

export default AdminPerformanceMonitor;