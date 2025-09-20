import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import AdminMemoryManager, { adminMemoryManager, useMemoryManager } from '../adminMemoryManager';
import { renderHook, act } from '@testing-library/react';
import * as React from 'react';

// Mock performance API
const mockPerformance = {
  now: vi.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 50000000,
    totalJSHeapSize: 100000000,
    jsHeapSizeLimit: 200000000
  }
};

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true
});

// Mock window events
const mockEventListeners = new Map();
Object.defineProperty(global, 'window', {
  value: {
    addEventListener: vi.fn((event, callback) => {
      mockEventListeners.set(event, callback);
    }),
    removeEventListener: vi.fn()
  },
  writable: true
});

Object.defineProperty(global, 'document', {
  value: {
    addEventListener: vi.fn(),
    hidden: false
  },
  writable: true
});

describe('AdminMemoryManager', () => {
  let memoryManager: AdminMemoryManager;

  beforeEach(() => {
    memoryManager = new AdminMemoryManager();
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    memoryManager.destroy();
    vi.useRealTimers();
  });

  describe('Component Registration', () => {
    it('should register components', () => {
      const componentId = memoryManager.registerComponent('TestComponent', { prop: 'value' });
      
      expect(componentId).toBeTruthy();
      expect(componentId).toContain('TestComponent');
      
      const stats = memoryManager.getMemoryStats();
      expect(stats.components.totalComponents).toBe(1);
    });

    it('should unregister components', () => {
      const componentId = memoryManager.registerComponent('TestComponent');
      
      memoryManager.unregisterComponent(componentId);
      
      const stats = memoryManager.getMemoryStats();
      expect(stats.components.totalComponents).toBe(0);
    });

    it('should update component memory info', () => {
      const componentId = memoryManager.registerComponent('TestComponent');
      
      memoryManager.updateComponent(componentId, { newProp: 'value' }, { state: 'data' });
      
      const stats = memoryManager.getMemoryStats();
      expect(stats.components.totalRenders).toBe(2); // Initial + update
    });

    it('should calculate object sizes', () => {
      const largeProps = { data: Array.from({ length: 1000 }, (_, i) => `item-${i}`) };
      const componentId = memoryManager.registerComponent('TestComponent', largeProps);
      
      const stats = memoryManager.getMemoryStats();
      expect(stats.components.totalPropsSize).toBeGreaterThan(0);
    });
  });

  describe('Cleanup Tasks', () => {
    it('should register cleanup tasks', () => {
      const cleanupFn = vi.fn();
      
      memoryManager.registerCleanupTask({
        id: 'test-task',
        priority: 'medium',
        cleanup: cleanupFn,
        description: 'Test cleanup'
      });
      
      const stats = memoryManager.getMemoryStats();
      expect(stats.cleanupTasks).toBe(1);
    });

    it('should unregister cleanup tasks', () => {
      memoryManager.registerCleanupTask({
        id: 'test-task',
        priority: 'medium',
        cleanup: vi.fn(),
        description: 'Test cleanup'
      });
      
      memoryManager.unregisterCleanupTask('test-task');
      
      const stats = memoryManager.getMemoryStats();
      expect(stats.cleanupTasks).toBe(0);
    });

    it('should execute cleanup tasks by priority', () => {
      const lowPriorityCleanup = vi.fn();
      const mediumPriorityCleanup = vi.fn();
      const highPriorityCleanup = vi.fn();
      
      memoryManager.registerCleanupTask({
        id: 'low-task',
        priority: 'low',
        cleanup: lowPriorityCleanup,
        description: 'Low priority cleanup'
      });
      
      memoryManager.registerCleanupTask({
        id: 'medium-task',
        priority: 'medium',
        cleanup: mediumPriorityCleanup,
        description: 'Medium priority cleanup'
      });
      
      memoryManager.registerCleanupTask({
        id: 'high-task',
        priority: 'high',
        cleanup: highPriorityCleanup,
        description: 'High priority cleanup'
      });
      
      memoryManager.cleanup('medium');
      
      expect(lowPriorityCleanup).not.toHaveBeenCalled();
      expect(mediumPriorityCleanup).toHaveBeenCalled();
      expect(highPriorityCleanup).not.toHaveBeenCalled();
    });

    it('should handle cleanup task errors gracefully', () => {
      const errorCleanup = vi.fn().mockImplementation(() => {
        throw new Error('Cleanup failed');
      });
      
      const successCleanup = vi.fn();
      
      memoryManager.registerCleanupTask({
        id: 'error-task',
        priority: 'medium',
        cleanup: errorCleanup,
        description: 'Error cleanup'
      });
      
      memoryManager.registerCleanupTask({
        id: 'success-task',
        priority: 'medium',
        cleanup: successCleanup,
        description: 'Success cleanup'
      });
      
      expect(() => memoryManager.cleanup('medium')).not.toThrow();
      expect(errorCleanup).toHaveBeenCalled();
      expect(successCleanup).toHaveBeenCalled();
    });
  });

  describe('Memory Monitoring', () => {
    it('should start and stop monitoring', () => {
      memoryManager.startMonitoring();
      expect(memoryManager.getMemoryStats().isMonitoring).toBe(true);
      
      memoryManager.stopMonitoring();
      expect(memoryManager.getMemoryStats().isMonitoring).toBe(false);
    });

    it('should trigger cleanup on high memory usage', () => {
      const cleanupFn = vi.fn();
      
      memoryManager.registerCleanupTask({
        id: 'memory-cleanup',
        priority: 'high',
        cleanup: cleanupFn,
        description: 'Memory cleanup'
      });
      
      // Mock high memory usage
      mockPerformance.memory.usedJSHeapSize = 180000000; // 90% of limit
      
      memoryManager.startMonitoring();
      
      // Fast forward to trigger memory check
      vi.advanceTimersByTime(10000);
      
      expect(cleanupFn).toHaveBeenCalled();
    });

    it('should add memory warning callbacks', () => {
      const warningCallback = vi.fn();
      
      const unsubscribe = memoryManager.onMemoryWarning(warningCallback);
      
      // Mock high memory usage
      mockPerformance.memory.usedJSHeapSize = 150000000; // 75% of limit
      
      memoryManager.startMonitoring();
      vi.advanceTimersByTime(10000);
      
      expect(warningCallback).toHaveBeenCalledWith(75);
      
      unsubscribe();
    });

    it('should set custom memory thresholds', () => {
      memoryManager.setThresholds({
        warning: 60,
        critical: 80
      });
      
      const stats = memoryManager.getMemoryStats();
      expect(stats.thresholds.warning).toBe(60);
      expect(stats.thresholds.critical).toBe(80);
    });
  });

  describe('Stale Component Cleanup', () => {
    it('should clean up stale components', () => {
      const componentId1 = memoryManager.registerComponent('Component1');
      const componentId2 = memoryManager.registerComponent('Component2');
      
      // Update one component to make it recent
      memoryManager.updateComponent(componentId2);
      
      // Fast forward time to make first component stale
      vi.advanceTimersByTime(400000); // 6+ minutes
      
      memoryManager.cleanup('low');
      
      const stats = memoryManager.getMemoryStats();
      expect(stats.components.totalComponents).toBe(1); // Only recent component remains
    });

    it('should perform aggressive cleanup in emergency mode', () => {
      const componentId = memoryManager.registerComponent('Component');
      
      // Fast forward less time than normal cleanup threshold
      vi.advanceTimersByTime(60000); // 1 minute
      
      memoryManager.cleanup('emergency');
      
      const stats = memoryManager.getMemoryStats();
      expect(stats.components.totalComponents).toBe(0); // All components cleaned up
    });
  });

  describe('Memory Statistics', () => {
    it('should provide accurate memory statistics', () => {
      // Register components
      memoryManager.registerComponent('Component1', { data: 'test' });
      memoryManager.registerComponent('Component2', { data: 'test' });
      
      // Register cleanup tasks
      memoryManager.registerCleanupTask({
        id: 'task1',
        priority: 'low',
        cleanup: vi.fn(),
        description: 'Task 1'
      });
      
      const stats = memoryManager.getMemoryStats();
      
      expect(stats.components.totalComponents).toBe(2);
      expect(stats.components.totalRenders).toBe(2);
      expect(stats.cleanupTasks).toBe(1);
      expect(stats.browser).toBeTruthy();
      expect(stats.browser?.usagePercentage).toBe(25); // 50M / 200M * 100
    });

    it('should handle missing performance.memory gracefully', () => {
      // Temporarily remove memory API
      const originalMemory = (performance as any).memory;
      delete (performance as any).memory;
      
      const stats = memoryManager.getMemoryStats();
      
      expect(stats.browser).toBeNull();
      
      // Restore memory API
      (performance as any).memory = originalMemory;
    });
  });

  describe('Emergency Cleanup', () => {
    it('should perform comprehensive emergency cleanup', () => {
      const cleanupFn = vi.fn();
      
      // Register components and tasks
      memoryManager.registerComponent('Component1');
      memoryManager.registerComponent('Component2');
      
      memoryManager.registerCleanupTask({
        id: 'task1',
        priority: 'high',
        cleanup: cleanupFn,
        description: 'Emergency task'
      });
      
      memoryManager.cleanup('emergency');
      
      expect(cleanupFn).toHaveBeenCalled();
      
      const stats = memoryManager.getMemoryStats();
      expect(stats.components.totalComponents).toBe(0);
    });

    it('should clear caches during emergency cleanup', () => {
      // Mock global cache objects
      (window as any).adminCache = { clear: vi.fn() };
      (window as any).queryClient = { clear: vi.fn() };
      
      memoryManager.cleanup('emergency');
      
      expect((window as any).adminCache.clear).toHaveBeenCalled();
      expect((window as any).queryClient.clear).toHaveBeenCalled();
    });
  });

  describe('Visibility Change Handling', () => {
    it('should trigger cleanup when page becomes hidden', () => {
      const cleanupFn = vi.fn();
      
      memoryManager.registerCleanupTask({
        id: 'visibility-task',
        priority: 'low',
        cleanup: cleanupFn,
        description: 'Visibility cleanup'
      });
      
      // Simulate page becoming hidden
      Object.defineProperty(document, 'hidden', { value: true, writable: true });
      
      // Trigger visibility change event
      const visibilityCallback = mockEventListeners.get('visibilitychange');
      if (visibilityCallback) {
        visibilityCallback();
      }
      
      expect(cleanupFn).toHaveBeenCalled();
    });
  });
});

describe('useMemoryManager Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should register and unregister component on mount/unmount', () => {
    const { unmount } = renderHook(() => useMemoryManager('TestComponent'));
    
    let stats = adminMemoryManager.getMemoryStats();
    expect(stats.components.totalComponents).toBe(1);
    
    unmount();
    
    stats = adminMemoryManager.getMemoryStats();
    expect(stats.components.totalComponents).toBe(0);
  });

  it('should provide memory update function', () => {
    const { result } = renderHook(() => useMemoryManager('TestComponent'));
    
    act(() => {
      result.current.updateMemoryInfo({ prop: 'value' }, { state: 'data' });
    });
    
    const stats = adminMemoryManager.getMemoryStats();
    expect(stats.components.totalRenders).toBe(2); // Initial + update
  });

  it('should provide cleanup registration function', () => {
    const { result } = renderHook(() => useMemoryManager('TestComponent'));
    const cleanupFn = vi.fn();
    
    let unregister: (() => void) | undefined;
    
    act(() => {
      unregister = result.current.registerCleanup('test-cleanup', cleanupFn);
    });
    
    let stats = adminMemoryManager.getMemoryStats();
    expect(stats.cleanupTasks).toBe(1);
    
    act(() => {
      unregister?.();
    });
    
    stats = adminMemoryManager.getMemoryStats();
    expect(stats.cleanupTasks).toBe(0);
  });

  it('should provide stats and cleanup functions', () => {
    const { result } = renderHook(() => useMemoryManager('TestComponent'));
    
    const stats = result.current.getStats();
    expect(stats).toBeTruthy();
    expect(stats.components.totalComponents).toBe(1);
    
    expect(typeof result.current.cleanup).toBe('function');
  });

  it('should handle cleanup with different priorities', () => {
    const { result } = renderHook(() => useMemoryManager('TestComponent'));
    const cleanupFn = vi.fn();
    
    act(() => {
      result.current.registerCleanup('test-cleanup', cleanupFn, 'high');
    });
    
    act(() => {
      result.current.cleanup('high');
    });
    
    expect(cleanupFn).toHaveBeenCalled();
  });
});