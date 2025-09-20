import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AdminErrorBoundary } from '../AdminErrorBoundary';
import { useAdminRetry } from '../../../../hooks/useAdminRetry';
import { adminErrorReporting } from '../../../../services/adminErrorReporting';

// Mock dependencies
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn()
}));

global.fetch = vi.fn();

describe('Error Handling Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn().mockReturnValue(JSON.stringify({
          userId: 'test-user',
          token: 'test-token'
        })),
        setItem: vi.fn(),
        removeItem: vi.fn()
      }
    });

    // Mock successful fetch by default
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('AdminErrorBoundary Edge Cases', () => {
    it('handles errors during error reporting', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock fetch to fail
      (global.fetch as any).mockRejectedValue(new Error('Reporting service down'));

      const ThrowError = () => {
        throw new Error('Original error');
      };

      render(
        <AdminErrorBoundary>
          <ThrowError />
        </AdminErrorBoundary>
      );

      // Should still show error UI despite reporting failure
      expect(screen.getByText('Admin Panel Error')).toBeInTheDocument();
      expect(screen.getByText(/Original error/)).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('handles missing authentication gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock no auth data
      window.localStorage.getItem = vi.fn().mockReturnValue(null);

      const ThrowError = () => {
        throw new Error('Test error');
      };

      render(
        <AdminErrorBoundary>
          <ThrowError />
        </AdminErrorBoundary>
      );

      expect(screen.getByText('Admin Panel Error')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('handles corrupted localStorage data', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock corrupted JSON
      window.localStorage.getItem = vi.fn().mockReturnValue('invalid-json');

      const ThrowError = () => {
        throw new Error('Test error');
      };

      render(
        <AdminErrorBoundary>
          <ThrowError />
        </AdminErrorBoundary>
      );

      expect(screen.getByText('Admin Panel Error')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('handles errors in error boundary lifecycle methods', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock performance API to throw
      Object.defineProperty(window, 'performance', {
        value: {
          getEntriesByType: () => {
            throw new Error('Performance API error');
          }
        }
      });

      const ThrowError = () => {
        throw new Error('Original error');
      };

      render(
        <AdminErrorBoundary>
          <ThrowError />
        </AdminErrorBoundary>
      );

      expect(screen.getByText('Admin Panel Error')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('handles rapid successive errors', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      let errorCount = 0;
      const MultipleErrors = () => {
        errorCount++;
        throw new Error(`Error ${errorCount}`);
      };

      const { rerender } = render(
        <AdminErrorBoundary>
          <MultipleErrors />
        </AdminErrorBoundary>
      );

      // First error
      expect(screen.getByText(/Error 1/)).toBeInTheDocument();

      // Retry causes second error
      fireEvent.click(screen.getByText(/Try Again/));
      rerender(
        <AdminErrorBoundary>
          <MultipleErrors />
        </AdminErrorBoundary>
      );

      expect(screen.getByText(/Error 2/)).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('handles memory pressure during error handling', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock memory API to simulate low memory
      Object.defineProperty(window.performance, 'memory', {
        value: {
          usedJSHeapSize: 1000000000, // 1GB
          totalJSHeapSize: 1000000000,
          jsHeapSizeLimit: 1000000000
        }
      });

      const ThrowError = () => {
        throw new Error('Memory pressure error');
      };

      render(
        <AdminErrorBoundary>
          <ThrowError />
        </AdminErrorBoundary>
      );

      expect(screen.getByText('Admin Panel Error')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe('Retry Hook Edge Cases', () => {
    it('handles operations that throw non-Error objects', async () => {
      const mockOperation = vi.fn().mockRejectedValue('String error');
      const { result } = renderHook(() => useAdminRetry(mockOperation));

      await act(async () => {
        try {
          await result.current.execute();
        } catch (error) {
          expect(error).toBe('String error');
        }
      });
    });

    it('handles operations that return undefined', async () => {
      const mockOperation = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAdminRetry(mockOperation));

      let response;
      await act(async () => {
        response = await result.current.execute();
      });

      expect(response).toBeUndefined();
    });

    it('handles extremely long retry delays', async () => {
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValue('success');

      const { result } = renderHook(() => 
        useAdminRetry(mockOperation, { 
          baseDelay: 60000, // 1 minute
          maxDelay: 300000  // 5 minutes
        })
      );

      await act(async () => {
        const promise = result.current.execute();
        
        // Fast-forward through long delay
        await vi.advanceTimersByTimeAsync(60000);
        
        const response = await promise;
        expect(response).toBe('success');
      });
    });

    it('handles retry condition that always returns false', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('test error'));
      const { result } = renderHook(() => 
        useAdminRetry(mockOperation, {
          retryCondition: () => false // Never retry
        })
      );

      await act(async () => {
        try {
          await result.current.execute();
        } catch (error) {
          expect(error.message).toBe('test error');
        }
      });

      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('handles operations with complex arguments', async () => {
      const complexArg = {
        nested: { data: [1, 2, 3] },
        func: () => 'test',
        date: new Date()
      };

      const mockOperation = vi.fn().mockResolvedValue('success');
      const { result } = renderHook(() => useAdminRetry(mockOperation));

      await act(async () => {
        await result.current.execute(complexArg, 'string', 123, null);
      });

      expect(mockOperation).toHaveBeenCalledWith(complexArg, 'string', 123, null);
    });

    it('handles concurrent retry operations', async () => {
      const mockOperation1 = vi.fn().mockResolvedValue('result1');
      const mockOperation2 = vi.fn().mockResolvedValue('result2');
      
      const { result: result1 } = renderHook(() => useAdminRetry(mockOperation1));
      const { result: result2 } = renderHook(() => useAdminRetry(mockOperation2));

      let responses: any[] = [];
      
      await act(async () => {
        const promises = [
          result1.current.execute('arg1'),
          result2.current.execute('arg2')
        ];
        
        responses = await Promise.all(promises);
      });

      expect(responses).toEqual(['result1', 'result2']);
      expect(mockOperation1).toHaveBeenCalledWith('arg1');
      expect(mockOperation2).toHaveBeenCalledWith('arg2');
    });
  });

  describe('Error Reporting Edge Cases', () => {
    it('handles circular references in error context', async () => {
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;

      const error = new Error('Test error');
      
      // Should not throw when handling circular references
      expect(() => {
        adminErrorReporting.reportError(error, {}, 'medium', 'ui', { circular: circularObj });
      }).not.toThrow();
    });

    it('handles extremely large error stacks', async () => {
      const error = new Error('Test error');
      error.stack = 'a'.repeat(1000000); // 1MB stack trace

      expect(() => {
        adminErrorReporting.reportError(error);
      }).not.toThrow();
    });

    it('handles errors when navigator is undefined', async () => {
      const originalNavigator = global.navigator;
      
      // @ts-ignore
      delete global.navigator;

      const error = new Error('Test error');
      
      expect(() => {
        adminErrorReporting.reportError(error);
      }).not.toThrow();

      global.navigator = originalNavigator;
    });

    it('handles errors when window is undefined (SSR)', async () => {
      const originalWindow = global.window;
      
      // @ts-ignore
      delete global.window;

      const error = new Error('Test error');
      
      expect(() => {
        adminErrorReporting.reportError(error);
      }).not.toThrow();

      global.window = originalWindow;
    });
  });

  describe('Form Validation Edge Cases', () => {
    it('handles validation rules with null/undefined values', () => {
      const { useAdminFormValidation } = require('../AdminFormValidation');
      
      const validationRules = {
        field1: {
          required: true,
          custom: (value: any) => {
            if (value === null) return 'Cannot be null';
            if (value === undefined) return 'Cannot be undefined';
            return null;
          }
        }
      };

      const { result } = renderHook(() => 
        useAdminFormValidation({}, validationRules)
      );

      act(() => {
        result.current.setValue('field1', null);
        result.current.validate('field1');
      });

      expect(result.current.formState.errors).toHaveLength(1);
      expect(result.current.formState.errors[0].message).toBe('Cannot be null');
    });

    it('handles validation with extremely long strings', () => {
      const { useAdminFormValidation } = require('../AdminFormValidation');
      
      const validationRules = {
        longField: {
          maxLength: 100
        }
      };

      const { result } = renderHook(() => 
        useAdminFormValidation({}, validationRules)
      );

      const veryLongString = 'a'.repeat(10000);

      act(() => {
        result.current.setValue('longField', veryLongString);
        result.current.validate('longField');
      });

      expect(result.current.formState.errors).toHaveLength(1);
      expect(result.current.formState.errors[0].type).toBe('maxLength');
    });

    it('handles validation rules that throw exceptions', () => {
      const { useAdminFormValidation } = require('../AdminFormValidation');
      
      const validationRules = {
        problematicField: {
          custom: () => {
            throw new Error('Validation rule error');
          }
        }
      };

      const { result } = renderHook(() => 
        useAdminFormValidation({}, validationRules)
      );

      act(() => {
        result.current.setValue('problematicField', 'test');
        // Should not crash when validation rule throws
        expect(() => result.current.validate('problematicField')).not.toThrow();
      });
    });
  });

  describe('Browser Compatibility Edge Cases', () => {
    it('handles missing fetch API', async () => {
      const originalFetch = global.fetch;
      // @ts-ignore
      delete global.fetch;

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const ThrowError = () => {
        throw new Error('Test error');
      };

      render(
        <AdminErrorBoundary>
          <ThrowError />
        </AdminErrorBoundary>
      );

      expect(screen.getByText('Admin Panel Error')).toBeInTheDocument();

      global.fetch = originalFetch;
      consoleSpy.mockRestore();
    });

    it('handles missing localStorage', () => {
      const originalLocalStorage = window.localStorage;
      
      Object.defineProperty(window, 'localStorage', {
        value: undefined
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const ThrowError = () => {
        throw new Error('Test error');
      };

      render(
        <AdminErrorBoundary>
          <ThrowError />
        </AdminErrorBoundary>
      );

      expect(screen.getByText('Admin Panel Error')).toBeInTheDocument();

      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage
      });
      consoleSpy.mockRestore();
    });

    it('handles missing performance API', () => {
      const originalPerformance = window.performance;
      
      Object.defineProperty(window, 'performance', {
        value: undefined
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const ThrowError = () => {
        throw new Error('Test error');
      };

      render(
        <AdminErrorBoundary>
          <ThrowError />
        </AdminErrorBoundary>
      );

      expect(screen.getByText('Admin Panel Error')).toBeInTheDocument();

      Object.defineProperty(window, 'performance', {
        value: originalPerformance
      });
      consoleSpy.mockRestore();
    });
  });
});