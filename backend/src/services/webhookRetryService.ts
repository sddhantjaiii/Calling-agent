import { logger } from '../utils/logger';
import { webhookService } from './webhookService';
import { ElevenLabsWebhookPayload, LegacyElevenLabsWebhookPayload } from './webhookService';

interface WebhookRetryJob {
  id: string;
  payload: ElevenLabsWebhookPayload | LegacyElevenLabsWebhookPayload;
  attempts: number;
  maxAttempts: number;
  nextRetryAt: Date;
  lastError?: string;
  createdAt: Date;
}

/**
 * Service to handle webhook retry logic and dead letter queue
 */
export class WebhookRetryService {
  private retryQueue: Map<string, WebhookRetryJob> = new Map();
  private deadLetterQueue: WebhookRetryJob[] = [];
  private retryIntervalId: any | null = null;
  private readonly maxAttempts = 3;
  private readonly retryDelays = [5000, 30000, 300000]; // 5s, 30s, 5min

  /**
   * Start the retry processor
   */
  startRetryProcessor(): void {
    if (this.retryIntervalId) {
      return; // Already running
    }

    this.retryIntervalId = setInterval(() => {
      this.processRetryQueue();
    }, 10000); // Check every 10 seconds

    logger.info('Webhook retry processor started');
  }

  /**
   * Stop the retry processor
   */
  stopRetryProcessor(): void {
    if (this.retryIntervalId) {
      clearInterval(this.retryIntervalId);
      this.retryIntervalId = null;
      logger.info('Webhook retry processor stopped');
    }
  }

  /**
   * Add a failed webhook to the retry queue
   */
  async addToRetryQueue(payload: ElevenLabsWebhookPayload | LegacyElevenLabsWebhookPayload, error: Error): Promise<void> {
    // Extract conversation_id from either format
    const conversationId = getConversationId(payload);
    const jobId = `${conversationId}-${Date.now()}`;
    
    const job: WebhookRetryJob = {
      id: jobId,
      payload,
      attempts: 0,
      maxAttempts: this.maxAttempts,
      nextRetryAt: new Date(Date.now() + this.retryDelays[0]),
      lastError: error.message,
      createdAt: new Date()
    };

    this.retryQueue.set(jobId, job);
    
    logger.warn('Added webhook to retry queue', {
      conversation_id: conversationId,
      job_id: jobId,
      error: error.message,
      next_retry_at: job.nextRetryAt.toISOString()
    });
  }

  /**
   * Process the retry queue
   */
  private async processRetryQueue(): Promise<void> {
    const now = new Date();
    const jobsToRetry: WebhookRetryJob[] = [];

    // Find jobs ready for retry
    for (const job of this.retryQueue.values()) {
      if (job.nextRetryAt <= now) {
        jobsToRetry.push(job);
      }
    }

    if (jobsToRetry.length === 0) {
      return;
    }

    logger.info(`Processing ${jobsToRetry.length} webhook retry jobs`);

    for (const job of jobsToRetry) {
      await this.retryWebhookJob(job);
    }
  }

  /**
   * Retry a specific webhook job
   */
  private async retryWebhookJob(job: WebhookRetryJob): Promise<void> {
    job.attempts++;
    
    const conversationId = getConversationId(job.payload);
    
    logger.info('Retrying webhook job', {
      job_id: job.id,
      conversation_id: conversationId,
      attempt: job.attempts,
      max_attempts: job.maxAttempts
    });

    try {
      // Attempt to process the webhook again
      await webhookService.processCallCompletedWebhook(job.payload);
      
      // Success - remove from retry queue
      this.retryQueue.delete(job.id);
      
      logger.info('Webhook retry successful', {
        job_id: job.id,
        conversation_id: conversationId,
        attempts: job.attempts
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      job.lastError = errorMessage;
      
      if (job.attempts >= job.maxAttempts) {
        // Move to dead letter queue
        this.retryQueue.delete(job.id);
        this.deadLetterQueue.push(job);
        
        logger.error('Webhook job moved to dead letter queue', {
          job_id: job.id,
          conversation_id: conversationId,
          attempts: job.attempts,
          final_error: errorMessage
        });
        
        // Optionally, send alert or notification here
        await this.handleDeadLetterJob(job);
        
      } else {
        // Schedule next retry
        const delayIndex = Math.min(job.attempts - 1, this.retryDelays.length - 1);
        job.nextRetryAt = new Date(Date.now() + this.retryDelays[delayIndex]);
        
        logger.warn('Webhook retry failed, scheduling next attempt', {
          job_id: job.id,
          conversation_id: conversationId,
          attempt: job.attempts,
          next_retry_at: job.nextRetryAt.toISOString(),
          error: errorMessage
        });
      }
    }
  }

  /**
   * Handle jobs that have exhausted all retry attempts
   */
  private async handleDeadLetterJob(job: WebhookRetryJob): Promise<void> {
    // Log critical failure
    logger.error('CRITICAL: Webhook processing failed permanently', {
      conversation_id: getConversationId(job.payload),
      agent_id: getAgentId(job.payload),
      status: getStatus(job.payload),
      duration: getDuration(job.payload),
      attempts: job.attempts,
      created_at: job.createdAt.toISOString(),
      final_error: job.lastError
    });

    // In a production environment, you might want to:
    // 1. Send an alert to administrators
    // 2. Store in a persistent dead letter queue (database)
    // 3. Create a support ticket
    // 4. Send notification to the user about the failed call processing
    
    // For now, we'll just keep it in memory for manual inspection
    // In production, consider implementing persistent storage
  }

  /**
   * Get retry queue status
   */
  getRetryQueueStatus(): {
    pending: number;
    deadLetter: number;
    oldestPending?: Date;
    oldestDeadLetter?: Date;
  } {
    const pendingJobs = Array.from(this.retryQueue.values());
    const oldestPending = pendingJobs.length > 0 
      ? new Date(Math.min(...pendingJobs.map(j => j.createdAt.getTime())))
      : undefined;
    
    const oldestDeadLetter = this.deadLetterQueue.length > 0
      ? new Date(Math.min(...this.deadLetterQueue.map(j => j.createdAt.getTime())))
      : undefined;

    return {
      pending: pendingJobs.length,
      deadLetter: this.deadLetterQueue.length,
      oldestPending,
      oldestDeadLetter
    };
  }

  /**
   * Get dead letter queue jobs for manual inspection
   */
  getDeadLetterJobs(): WebhookRetryJob[] {
    return [...this.deadLetterQueue];
  }

  /**
   * Manually retry a dead letter job
   */
  async retryDeadLetterJob(jobId: string): Promise<boolean> {
    const jobIndex = this.deadLetterQueue.findIndex(job => job.id === jobId);
    
    if (jobIndex === -1) {
      logger.warn('Dead letter job not found', { job_id: jobId });
      return false;
    }

    const job = this.deadLetterQueue[jobIndex];
    
    try {
      await webhookService.processCallCompletedWebhook(job.payload);
      
      // Remove from dead letter queue on success
      this.deadLetterQueue.splice(jobIndex, 1);
      
      logger.info('Manual retry of dead letter job successful', {
        job_id: jobId,
        conversation_id: getConversationId(job.payload)
      });
      
      return true;
    } catch (error) {
      logger.error('Manual retry of dead letter job failed', {
        job_id: jobId,
        conversation_id: getConversationId(job.payload),
        error: error instanceof Error ? error.message : String(error)
      });
      
      return false;
    }
  }

  /**
   * Clear old dead letter jobs (cleanup)
   */
  clearOldDeadLetterJobs(olderThanDays: number = 7): number {
    const cutoffDate = new Date(Date.now() - (olderThanDays * 24 * 60 * 60 * 1000));
    const initialCount = this.deadLetterQueue.length;
    
    this.deadLetterQueue = this.deadLetterQueue.filter(job => job.createdAt > cutoffDate);
    
    const removedCount = initialCount - this.deadLetterQueue.length;
    
    if (removedCount > 0) {
      logger.info(`Cleaned up ${removedCount} old dead letter jobs`);
    }
    
    return removedCount;
  }
}

/**
 * Helper function to extract conversation_id from either webhook format
 */
function getConversationId(payload: ElevenLabsWebhookPayload | LegacyElevenLabsWebhookPayload): string {
  return 'data' in payload ? payload.data.conversation_id : payload.conversation_id;
}

/**
 * Helper function to extract agent_id from either webhook format
 */
function getAgentId(payload: ElevenLabsWebhookPayload | LegacyElevenLabsWebhookPayload): string {
  return 'data' in payload ? payload.data.agent_id : payload.agent_id;
}

/**
 * Helper function to extract status from either webhook format
 */
function getStatus(payload: ElevenLabsWebhookPayload | LegacyElevenLabsWebhookPayload): string {
  if ('data' in payload) {
    return payload.data.status || 'completed';
  }
  return payload.status;
}

/**
 * Helper function to extract duration from either webhook format
 */
function getDuration(payload: ElevenLabsWebhookPayload | LegacyElevenLabsWebhookPayload): number | undefined {
  if ('data' in payload) {
    return payload.data.metadata?.call_duration_secs;
  }
  return payload.duration_seconds;
}

export const webhookRetryService = new WebhookRetryService();