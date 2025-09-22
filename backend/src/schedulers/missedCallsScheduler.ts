import cron from 'node-cron';
import { TwilioNotConnectedService } from '../services/twilioMissedCallsService';
import { logger } from '../utils/logger';

export class NotConnectedCallsScheduler {
  private twilioService: TwilioNotConnectedService;
  private isRunning = false;

  constructor() {
    this.twilioService = new TwilioNotConnectedService();
  }

  /**
   * Start the cron job to check for not connected calls every minute
   */
  start(): void {
    logger.info('Starting not connected calls scheduler...');

    // Run every minute: '0 * * * * *' means at second 0 of every minute
    cron.schedule('0 * * * * *', async () => {
      if (this.isRunning) {
        logger.warn('Previous not connected calls job still running, skipping this iteration');
        return;
      }

      this.isRunning = true;
      try {
        await this.twilioService.processUnansweredCalls();
      } catch (error) {
        logger.error('Error in not connected calls cron job:', error);
      } finally {
        this.isRunning = false;
      }
    }, {
      timezone: "UTC"
    });

    // Log stats every 5 minutes for monitoring
    cron.schedule('0 */5 * * * *', async () => {
      try {
        const stats = await this.twilioService.getProcessingStats();
        logger.info('Not connected calls processing stats:', stats);
      } catch (error) {
        logger.error('Error getting not connected calls stats:', error);
      }
    }, {
      timezone: "UTC"
    });

    logger.info('Not connected calls scheduler started - checking every minute');
  }

  /**
   * Test the Twilio connection
   */
  async testConnection(): Promise<boolean> {
    return await this.twilioService.testConnection();
  }

  /**
   * Manual trigger for immediate processing (useful for testing)
   */
  async runImmediately(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Processing already in progress');
    }

    this.isRunning = true;
    try {
      await this.twilioService.processUnansweredCalls();
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get current processing status
   */
  isProcessing(): boolean {
    return this.isRunning;
  }
}