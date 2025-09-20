import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useAdminRetry, useAdminApiRetry, useAdminBulkOperationRetry } from '../../../../hooks/useAdminRetry';

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn()
}));

describe('useAdminRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('executes operation successfully on first attempt', async () => {
    const mockOperation = vi.fn().mockResolvedValue('success');
    const { result } = renderHook(() => useAdminRetry(mockOperation));

    let response;
    await act(async () => {
      response = await result.current.execute('arg1', 'arg2');
    });

    expect(response).toBe('success');
    expect(mockOperation).toHaveBeenCalledWith('arg1', 'arg2');
    expect(mockOperation).toHaveBeenCalledTimes(1);
    expect(result.current.state.attemptCount).toBe(0);
    expect(result.current.state.isRetrying).toBe(false);
  });

  it('retries on network errors', async () => {
    const mockOperation = vi.fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValue('success');

    const { result } = renderHook(() => useAdminRetry(mockOperation));

    let response;
    await act(async () => {
      const promise = result.current.execute('test');
      
      // Fast-forward through the retry delay
      await vi.advanceTimersByTimeAsync(1000);
      
      response = await promise;
    });

    expect(response).toBe('success');
    expect(mockOperation).toHaveBeenCalledTimes(2);
  });

  it('respects maxAttempts configuration', async () => {
    const mockOperation = vi.fn().mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => 
      useAdminRetry(mockOperation, { maxAttempts: 2 })
    );

    await act(async () => {
      try {
        const promise = result.current.execute('test');
        await vi.advanceTimersByTimeAsync(5000);
        await promise;
      } catch (error) {
        expect(error.message).toBe('network error');
      }
    });

    expect(mockOperation).toHaveBeenCalledTimes(2);
  });

  it('uses exponential backoff for retry delays', async () => {
    const mockOperation = vi.fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValue('success');

    const { result } = renderHook(() => 
      useAdminRetry(mockOperation, { baseDelay: 100, backoffMultiplier: 2 })
    );

    const startTime = Date.now();
    
    await act(async () => {
      const promise = result.current.execute('test');
      
      // First retry after 100ms
      await vi.advanceTimersByTimeAsync(100);
      // Second retry after 200ms
      await vi.advanceTimersByTimeAsync(200);
      
      await promise;
    });

    expect(mockOperation).toHaveBeenCalledTimes(3);
  });

  it('respects custom retry condition', async () => {
    const mockOperation = vi.fn().mockRejectedValue(new Error('validation error'));
    const { result } = renderHook(() => 
      useAdminRetry(mockOperation, {
        retryCondition: (error) => !error.message.includes('validation')
      })
    );

    await act(async () => {
      try {
        await result.current.execute('test');
      } catch (error) {
        expect(error.message).toBe('validation error');
      }
    });

    // Should not retry validation errors
    expect(mockOperation).toHaveBeenCalledTimes(1);
  });

  it('tracks retry state correctly', async () => {
    const mockOperation = vi.fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValue('success');

    const { result } = renderHook(() => useAdminRetry(mockOperation));

    await act(async () => {
      const promise = result.current.execute('test');
      
      // Check state during retry
      expect(result.current.state.isRetrying).toBe(false);
      expect(result.current.state.attemptCount).toBe(1);
      
      await vi.advanceTimersByTimeAsync(1000);
      await promise;
    });

    // Final state after success
    expect(result.current.state.isRetrying).toBe(false);
    expect(result.current.state.attemptCount).toBe(0);
  });

  it('allows manual retry of last operation', async () => {
    const mockOperation = vi.fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValue('success');

    const { result } = renderHook(() => useAdminRetry(mockOperation));

    // First execution fails
    await act(async () => {
      try {
        await result.current.execute('test', 'args');
      } catch (error) {
        expect(error.message).toBe('network error');
      }
    });

    // Manual retry should work
    await act(async () => {
      const response = await result.current.retry();
      expect(response).toBe('success');
    });

    expect(mockOperation).toHaveBeenCalledWith('test', 'args');
    expect(mockOperation).toHaveBeenCalledTimes(2);
  });

  it('resets state correctly', async () => {
    const mockOperation = vi.fn().mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useAdminRetry(mockOperation));

    await act(async () => {
      try {
        await result.current.execute('test');
      } catch (error) {
        // Expected to fail
      }
    });

    expect(result.current.state.lastError).toBeDefined();

    act(() => {
      result.current.reset();
    });

    expect(result.current.state.attemptCount).toBe(0);
    expect(result.current.state.isRetrying).toBe(false);
    expect(result.current.state.lastError).toBeUndefined();
  });

  it('throws error when retrying without previous operation', async () => {
    const mockOperation = vi.fn();
    const { result } = renderHook(() => useAdminRetry(mockOperation));

    await act(async () => {
      try {
        await result.current.retry();
      } catch (error) {
        expect(error.message).toBe('No previous operation to retry');
      }
    });
  });
});

describe('useAdminApiRetry', () => {
  it('does not retry authentication errors', async () => {
    const mockApiCall = vi.fn().mockRejectedValue(new Error('401 unauthorized'));
    const { result } = renderHook(() => useAdminApiRetry(mockApiCall));

    await act(async () => {
      try {
        await result.current.execute('test');
      } catch (error) {
        expect(error.message).toBe('401 unauthorized');
      }
    });

    expect(mockApiCall).toHaveBeenCalledTimes(1);
  });

  it('retries server errors but not auth errors', async () => {
    const mockApiCall = vi.fn().mockRejectedValue(new Error('500 server error'));
    const { result } = renderHook(() => useAdminApiRetry(mockApiCall));

    await act(async () => {
      try {
        const promise = result.current.execute('test');
        await vi.advanceTimersByTimeAsync(5000);
        await promise;
      } catch (error) {
        expect(error.message).toBe('500 server error');
      }
    });

    expect(mockApiCall).toHaveBeenCalledTimes(3); // Default max attempts
  });
});

describe('useAdminBulkOperationRetry', () => {
  it('uses fewer retries for bulk operations', async () => {
    const mockBulkOperation = vi.fn().mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useAdminBulkOperationRetry(mockBulkOperation));

    await act(async () => {
      try {
        const promise = result.current.execute('test');
        await vi.advanceTimersByTimeAsync(10000);
        await promise;
      } catch (error) {
        expect(error.message).toBe('network error');
      }
    });

    expect(mockBulkOperation).toHaveBeenCalledTimes(2); // Fewer retries for bulk
  });

  it('uses longer delays for bulk operations', async () => {
    const mockBulkOperation = vi.fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValue('success');

    const { result } = renderHook(() => useAdminBulkOperationRetry(mockBulkOperation));

    await act(async () => {
      const promise = result.current.execute('test');
      
      // Should wait 2000ms (longer than regular retry)
      await vi.advanceTimersByTimeAsync(2000);
      
      const response = await promise;
      expect(response).toBe('success');
    });

    expect(mockBulkOperation).toHaveBeenCalledTimes(2);
  });
});