interface MemoryThreshold {
  warning: number;
  critical: number;
}

interface ComponentMemoryInfo {
  name: string;
  mountTime: number;
  lastUpdate: number;
  renderCount: number;
  propsSize: number;
  stateSize: number;
}

interface MemoryCleanupTask {
  id: string;
  priority: 'low' | 'medium' | 'high';
  cleanup: () => void;
  description: string;
}

class AdminMemoryManager {
  private components = new Map<string, ComponentMemoryInfo>();
  private cleanupTasks = new Map<string, MemoryCleanupTask>();
  private thresholds: MemoryThreshold = {
    warning: 75, // 75% memory usage
    critical: 90  // 90% memory usage
  };
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  private memoryWarningCallbacks = new Set<(usage: number) => void>();

  constructor() {
    this.setupMemoryMonitoring();
    this.setupUnloadCleanup();
  }

  private setupMemoryMonitoring() {
    if (typeof window === 'undefined' || !(performance as any).memory) {
      return;
    }

    this.monitoringInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, 10000); // Check every 10 seconds
  }

  private setupUnloadCleanup() {
    if (typeof window === 'undefined') return;

    const cleanup = () => {
      this.performEmergencyCleanup();
    };

    window.addEventListener('beforeunload', cleanup);
    window.addEventListener('pagehide', cleanup);
    
    // Cleanup on visibility change (tab switching)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.performLowPriorityCleanup();
      }
    });
  }

  private checkMemoryUsage() {
    if (!this.isMonitoring || typeof window === 'undefined' || !(performance as any).memory) {
      return;
    }

    const memory = (performance as any).memory;
    const usagePercentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

    if (usagePercentage >= this.thresholds.critical) {
      console.warn(`Critical memory usage: ${usagePercentage.toFixed(1)}%`);
      this.performEmergencyCleanup();
      this.notifyMemoryWarning(usagePercentage);
    } else if (usagePercentage >= this.thresholds.warning) {
      console.warn(`High memory usage: ${usagePercentage.toFixed(1)}%`);
      this.performHighPriorityCleanup();
      this.notifyMemoryWarning(usagePercentage);
    }
  }

  private notifyMemoryWarning(usage: number) {
    this.memoryWarningCallbacks.forEach(callback => {
      try {
        callback(usage);
      } catch (error) {
        console.error('Error in memory warning callback:', error);
      }
    });
  }

  startMonitoring(): void {
    this.isMonitoring = true;
  }

  stopMonitoring(): void {
    this.isMonitoring = false;
  }

  // Register a component for memory tracking
  registerComponent(name: string, props?: any, state?: any): string {
    const componentId = `${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.components.set(componentId, {
      name,
      mountTime: Date.now(),
      lastUpdate: Date.now(),
      renderCount: 1,
      propsSize: props ? this.calculateObjectSize(props) : 0,
      stateSize: state ? this.calculateObjectSize(state) : 0
    });

    return componentId;
  }

  // Update component memory info
  updateComponent(componentId: string, props?: any, state?: any): void {
    const component = this.components.get(componentId);
    if (!component) return;

    component.lastUpdate = Date.now();
    component.renderCount++;
    component.propsSize = props ? this.calculateObjectSize(props) : component.propsSize;
    component.stateSize = state ? this.calculateObjectSize(state) : component.stateSize;
  }

  // Unregister a component
  unregisterComponent(componentId: string): void {
    this.components.delete(componentId);
  }

  // Register a cleanup task
  registerCleanupTask(task: MemoryCleanupTask): void {
    this.cleanupTasks.set(task.id, task);
  }

  // Unregister a cleanup task
  unregisterCleanupTask(taskId: string): void {
    this.cleanupTasks.delete(taskId);
  }

  // Perform cleanup based on priority
  private performCleanupByPriority(priority: 'low' | 'medium' | 'high') {
    const tasks = Array.from(this.cleanupTasks.values())
      .filter(task => task.priority === priority)
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

    tasks.forEach(task => {
      try {
        task.cleanup();
        console.debug(`Executed cleanup task: ${task.description}`);
      } catch (error) {
        console.error(`Failed to execute cleanup task ${task.id}:`, error);
      }
    });
  }

  private performLowPriorityCleanup(): void {
    this.performCleanupByPriority('low');
    this.cleanupStaleComponents();
  }

  private performHighPriorityCleanup(): void {
    this.performCleanupByPriority('medium');
    this.performCleanupByPriority('high');
    this.cleanupStaleComponents();
    this.forceGarbageCollection();
  }

  private performEmergencyCleanup(): void {
    console.warn('Performing emergency memory cleanup');
    
    // Execute all cleanup tasks
    this.performCleanupByPriority('high');
    this.performCleanupByPriority('medium');
    this.performCleanupByPriority('low');
    
    // Clear component tracking
    this.cleanupStaleComponents(true);
    
    // Force garbage collection if available
    this.forceGarbageCollection();
    
    // Clear caches
    this.clearCaches();
  }

  private cleanupStaleComponents(aggressive = false): void {
    const now = Date.now();
    const staleThreshold = aggressive ? 30000 : 300000; // 30s aggressive, 5min normal
    
    const staleComponents = Array.from(this.components.entries())
      .filter(([, component]) => now - component.lastUpdate > staleThreshold);

    staleComponents.forEach(([componentId]) => {
      this.components.delete(componentId);
    });

    if (staleComponents.length > 0) {
      console.debug(`Cleaned up ${staleComponents.length} stale components`);
    }
  }

  private forceGarbageCollection(): void {
    if (typeof window !== 'undefined' && (window as any).gc) {
      try {
        (window as any).gc();
        console.debug('Forced garbage collection');
      } catch (error) {
        console.debug('Garbage collection not available');
      }
    }
  }

  private clearCaches(): void {
    // Clear admin cache
    if (typeof window !== 'undefined' && (window as any).adminCache) {
      (window as any).adminCache.clear();
    }

    // Clear query cache if available
    if (typeof window !== 'undefined' && (window as any).queryClient) {
      (window as any).queryClient.clear();
    }
  }

  private calculateObjectSize(obj: any): number {
    try {
      return JSON.stringify(obj).length;
    } catch {
      return 0;
    }
  }

  // Get memory statistics
  getMemoryStats() {
    const memory = typeof window !== 'undefined' && (performance as any).memory 
      ? (performance as any).memory 
      : null;

    const componentStats = Array.from(this.components.values()).reduce(
      (acc, component) => {
        acc.totalComponents++;
        acc.totalRenders += component.renderCount;
        acc.totalPropsSize += component.propsSize;
        acc.totalStateSize += component.stateSize;
        return acc;
      },
      { totalComponents: 0, totalRenders: 0, totalPropsSize: 0, totalStateSize: 0 }
    );

    return {
      browser: memory ? {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
      } : null,
      components: componentStats,
      cleanupTasks: this.cleanupTasks.size,
      isMonitoring: this.isMonitoring,
      thresholds: this.thresholds
    };
  }

  // Add memory warning callback
  onMemoryWarning(callback: (usage: number) => void): () => void {
    this.memoryWarningCallbacks.add(callback);
    
    return () => {
      this.memoryWarningCallbacks.delete(callback);
    };
  }

  // Set memory thresholds
  setThresholds(thresholds: Partial<MemoryThreshold>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  // Manual cleanup trigger
  cleanup(priority: 'low' | 'medium' | 'high' | 'emergency' = 'medium'): void {
    if (priority === 'emergency') {
      this.performEmergencyCleanup();
    } else {
      this.performCleanupByPriority(priority);
    }
  }

  // Destroy the memory manager
  destroy(): void {
    this.stopMonitoring();
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.components.clear();
    this.cleanupTasks.clear();
    this.memoryWarningCallbacks.clear();
  }
}

// React hook for memory management
export const useMemoryManager = (componentName: string) => {
  const [componentId] = React.useState(() => 
    adminMemoryManager.registerComponent(componentName)
  );

  React.useEffect(() => {
    return () => {
      adminMemoryManager.unregisterComponent(componentId);
    };
  }, [componentId]);

  const updateMemoryInfo = React.useCallback((props?: any, state?: any) => {
    adminMemoryManager.updateComponent(componentId, props, state);
  }, [componentId]);

  const registerCleanup = React.useCallback((
    id: string,
    cleanup: () => void,
    priority: 'low' | 'medium' | 'high' = 'medium',
    description = 'Component cleanup'
  ) => {
    adminMemoryManager.registerCleanupTask({
      id: `${componentId}-${id}`,
      priority,
      cleanup,
      description
    });

    return () => {
      adminMemoryManager.unregisterCleanupTask(`${componentId}-${id}`);
    };
  }, [componentId]);

  return {
    updateMemoryInfo,
    registerCleanup,
    getStats: () => adminMemoryManager.getMemoryStats(),
    cleanup: (priority?: 'low' | 'medium' | 'high' | 'emergency') => 
      adminMemoryManager.cleanup(priority)
  };
};

// Create singleton instance
export const adminMemoryManager = new AdminMemoryManager();

// Auto-start monitoring in development
if (process.env.NODE_ENV === 'development') {
  adminMemoryManager.startMonitoring();
}

export default AdminMemoryManager;