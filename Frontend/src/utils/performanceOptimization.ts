/**
 * Performance optimization utilities for pagination and lazy loading
 */

// Debounce utility for search inputs
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate?: boolean
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    
    const callNow = immediate && !timeout;
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func(...args);
  };
}

// Throttle utility for scroll events
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Calculate optimal page size based on viewport and item height
export function calculateOptimalPageSize(
  viewportHeight: number,
  itemHeight: number,
  bufferMultiplier: number = 2
): number {
  const visibleItems = Math.floor(viewportHeight / itemHeight);
  return Math.max(10, visibleItems * bufferMultiplier);
}

// Memory-efficient data management for large lists
export class VirtualDataManager<T> {
  private data: T[] = [];
  private pageSize: number;
  private maxCachedPages: number;
  private cachedPages: Map<number, T[]> = new Map();

  constructor(pageSize: number = 20, maxCachedPages: number = 5) {
    this.pageSize = pageSize;
    this.maxCachedPages = maxCachedPages;
  }

  // Add data to the manager
  addData(newData: T[], page: number): void {
    this.cachedPages.set(page, newData);
    
    // Remove oldest cached pages if we exceed the limit
    if (this.cachedPages.size > this.maxCachedPages) {
      const oldestPage = Math.min(...this.cachedPages.keys());
      this.cachedPages.delete(oldestPage);
    }
    
    // Update the main data array for the current view
    const startIndex = (page - 1) * this.pageSize;
    this.data.splice(startIndex, newData.length, ...newData);
  }

  // Get data for a specific page
  getPage(page: number): T[] | null {
    return this.cachedPages.get(page) || null;
  }

  // Get all currently loaded data
  getAllData(): T[] {
    return this.data;
  }

  // Check if a page is cached
  isPageCached(page: number): boolean {
    return this.cachedPages.has(page);
  }

  // Clear all cached data
  clear(): void {
    this.data = [];
    this.cachedPages.clear();
  }

  // Get memory usage statistics
  getStats(): {
    totalItems: number;
    cachedPages: number;
    memoryUsage: string;
  } {
    const totalItems = this.data.length;
    const cachedPages = this.cachedPages.size;
    const memoryUsage = `${Math.round(JSON.stringify(this.data).length / 1024)}KB`;
    
    return { totalItems, cachedPages, memoryUsage };
  }
}

// Intersection Observer utility for lazy loading
export class LazyLoadObserver {
  private observer: IntersectionObserver;
  private callbacks: Map<Element, () => void> = new Map();

  constructor(
    threshold: number = 0.1,
    rootMargin: string = '100px'
  ) {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const callback = this.callbacks.get(entry.target);
            if (callback) {
              callback();
              this.unobserve(entry.target);
            }
          }
        });
      },
      { threshold, rootMargin }
    );
  }

  observe(element: Element, callback: () => void): void {
    this.callbacks.set(element, callback);
    this.observer.observe(element);
  }

  unobserve(element: Element): void {
    this.callbacks.delete(element);
    this.observer.unobserve(element);
  }

  disconnect(): void {
    this.observer.disconnect();
    this.callbacks.clear();
  }
}

// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Start timing an operation
  startTiming(operation: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (!this.metrics.has(operation)) {
        this.metrics.set(operation, []);
      }
      
      const operationMetrics = this.metrics.get(operation)!;
      operationMetrics.push(duration);
      
      // Keep only the last 100 measurements
      if (operationMetrics.length > 100) {
        operationMetrics.shift();
      }
    };
  }

  // Get performance statistics for an operation
  getStats(operation: string): {
    average: number;
    min: number;
    max: number;
    count: number;
  } | null {
    const metrics = this.metrics.get(operation);
    if (!metrics || metrics.length === 0) {
      return null;
    }

    const average = metrics.reduce((sum, time) => sum + time, 0) / metrics.length;
    const min = Math.min(...metrics);
    const max = Math.max(...metrics);
    const count = metrics.length;

    return { average, min, max, count };
  }

  // Log performance statistics
  logStats(): void {
    console.group('Performance Statistics');
    this.metrics.forEach((metrics, operation) => {
      const stats = this.getStats(operation);
      if (stats) {
        console.log(`${operation}:`, {
          average: `${stats.average.toFixed(2)}ms`,
          min: `${stats.min.toFixed(2)}ms`,
          max: `${stats.max.toFixed(2)}ms`,
          samples: stats.count
        });
      }
    });
    console.groupEnd();
  }
}

// Utility to detect if the user prefers reduced motion
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Utility to get optimal scroll behavior
export function getScrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? 'auto' : 'smooth';
}

// Export performance monitor instance
export const performanceMonitor = PerformanceMonitor.getInstance();