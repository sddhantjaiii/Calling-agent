import { logger } from '../utils/logger';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // in milliseconds
  maxDelay: number; // in milliseconds
  backoffMultiplier: number;
  retryableErrors?: string[]; // HTTP status codes or error types to retry
}

export interface RetryState {
  attempt: number;
  lastAttemptTime: Date;
  nextRetryDelay: number;
  totalElapsed: number;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
}

export class RetryService {
  private static readonly DEFAULT_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 4000, // 4 seconds
    backoffMultiplier: 2,
    retryableErrors: ['ECONNRESET', 'ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', '429', '500', '502', '503', '504']
  };

  /**
   * Execute an operation with exponential backoff retry logic
   * Requirements: 5.1, 5.5, 5.6
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {},
    operationName: string = 'operation'
  ): Promise<RetryResult<T>> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    const startTime = Date.now();
    let lastError: Error | null = null;
    let actualAttempts = 0;

    logger.info(`Starting retry operation: ${operationName}`, {
      maxRetries: finalConfig.maxRetries,
      baseDelay: finalConfig.baseDelay,
      maxDelay: finalConfig.maxDelay
    });

    for (let attempt = 1; attempt <= finalConfig.maxRetries + 1; attempt++) {
      actualAttempts = attempt;
      try {
        logger.debug(`Attempt ${attempt}/${finalConfig.maxRetries + 1} for ${operationName}`);
        
        const result = await operation();
        const totalTime = Date.now() - startTime;
        
        logger.info(`Operation ${operationName} succeeded on attempt ${attempt}`, {
          attempts: attempt,
          totalTime: `${totalTime}ms`
        });

        return {
          success: true,
          data: result,
          attempts: attempt,
          totalTime
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const totalTime = Date.now() - startTime;

        logger.warn(`Attempt ${attempt}/${finalConfig.maxRetries + 1} failed for ${operationName}`, {
          error: lastError.message,
          attempt,
          totalTime: `${totalTime}ms`
        });

        // Check if this is the last attempt
        if (attempt > finalConfig.maxRetries) {
          logger.error(`All retry attempts exhausted for ${operationName}`, {
            totalAttempts: attempt,
            totalTime: `${totalTime}ms`,
            finalError: lastError.message
          });
          break;
        }

        // Check if error is retryable
        if (!this.isRetryableError(lastError, finalConfig.retryableErrors)) {
          logger.warn(`Non-retryable error for ${operationName}, stopping retries`, {
            error: lastError.message,
            attempt
          });
          break;
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt, finalConfig);
        
        logger.info(`Retrying ${operationName} in ${delay}ms (attempt ${attempt + 1}/${finalConfig.maxRetries + 1})`);
        
        await this.sleep(delay);
      }
    }

    const totalTime = Date.now() - startTime;
    return {
      success: false,
      error: lastError || new Error('Unknown error'),
      attempts: actualAttempts,
      totalTime
    };
  }

  /**
   * Calculate exponential backoff delay
   */
  private static calculateDelay(attempt: number, config: RetryConfig): number {
    // Exponential backoff: baseDelay * (backoffMultiplier ^ (attempt - 1))
    const exponentialDelay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    
    // Cap at maxDelay
    const delay = Math.min(exponentialDelay, config.maxDelay);
    
    // Add small random jitter to prevent thundering herd (±10%)
    const jitter = delay * 0.1 * (Math.random() * 2 - 1);
    
    return Math.max(0, Math.round(delay + jitter));
  }

  /**
   * Check if an error is retryable based on configuration
   */
  private static isRetryableError(error: Error, retryableErrors?: string[]): boolean {
    if (!retryableErrors || retryableErrors.length === 0) {
      return true; // Retry all errors if no specific list provided
    }

    const errorMessage = error.message.toLowerCase();
    const errorString = error.toString().toLowerCase();

    // Check for timeout errors (should not be retryable by default unless explicitly listed)
    if (errorMessage.includes('timed out') && !retryableErrors.some(re => re.toLowerCase().includes('timeout'))) {
      return false;
    }

    return retryableErrors.some(retryableError => {
      const retryableErrorLower = retryableError.toLowerCase();
      return (
        errorMessage.includes(retryableErrorLower) ||
        errorString.includes(retryableErrorLower) ||
        // Check for HTTP status codes in axios errors
        (error as any).response?.status?.toString() === retryableError ||
        // Check for network error codes
        (error as any).code === retryableError
      );
    });
  }

  /**
   * Sleep for specified milliseconds
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a timeout wrapper for operations
   * Requirements: 5.6
   */
  static withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    operationName: string = 'operation'
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        logger.error(`Operation ${operationName} timed out after ${timeoutMs}ms`);
        reject(new Error(`Operation ${operationName} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      operation()
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Combine retry logic with timeout handling
   * Requirements: 5.1, 5.5, 5.6
   */
  static async executeWithRetryAndTimeout<T>(
    operation: () => Promise<T>,
    retryConfig: Partial<RetryConfig> = {},
    timeoutMs: number = 30000,
    operationName: string = 'operation'
  ): Promise<RetryResult<T>> {
    const wrappedOperation = () => this.withTimeout(operation, timeoutMs, operationName);
    return this.executeWithRetry(wrappedOperation, retryConfig, operationName);
  }
}

/**
 * Convenience function for ElevenLabs API retry configuration
 * Requirements: 5.1, 5.5, 5.6
 */
export function createElevenLabsRetryConfig(): RetryConfig {
  return {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 4000, // 4 seconds  
    backoffMultiplier: 2,
    retryableErrors: [
      // Network errors
      'ECONNRESET',
      'ENOTFOUND', 
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ECONNABORTED',
      // HTTP status codes that should be retried
      '429', // Rate limit
      '500', // Internal server error
      '502', // Bad gateway
      '503', // Service unavailable
      '504', // Gateway timeout
      // ElevenLabs specific errors that might be temporary
      'rate limit',
      'server error',
      'temporarily unavailable'
    ]
  };
}