import { Request, Response } from 'express';
import { TwilioNotConnectedService } from '../services/twilioMissedCallsService';
import { NotConnectedCallsScheduler } from '../schedulers/missedCallsScheduler';
import { logger } from '../utils/logger';

export class TwilioController {
  private twilioService: TwilioNotConnectedService;
  private scheduler: NotConnectedCallsScheduler;

  constructor() {
    this.twilioService = new TwilioNotConnectedService();
    this.scheduler = new NotConnectedCallsScheduler();
  }

  /**
   * Test Twilio connection
   * GET /api/twilio/test-connection
   */
  async testConnection(req: Request, res: Response): Promise<void> {
    try {
      const isConnected = await this.twilioService.testConnection();
      
      res.json({
        success: true,
        connected: isConnected,
        message: isConnected ? 'Twilio connection successful' : 'Twilio connection failed'
      });
    } catch (error) {
      logger.error('Error testing Twilio connection:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to test Twilio connection'
      });
    }
  }

  /**
   * Manually trigger not connected calls processing
   * POST /api/twilio/process-not-connected-calls
   */
  async processNotConnectedCalls(req: Request, res: Response): Promise<void> {
    try {
      if (this.scheduler.isProcessing()) {
        res.status(409).json({
          success: false,
          message: 'Not connected calls processing already in progress'
        });
        return;
      }

      await this.scheduler.runImmediately();
      
      res.json({
        success: true,
        message: 'Not connected calls processing completed successfully'
      });
    } catch (error) {
      logger.error('Error processing not connected calls:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process not connected calls'
      });
    }
  }

  /**
   * Get not connected calls processing statistics
   * GET /api/twilio/stats
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.twilioService.getProcessingStats();
      
      res.json({
        success: true,
        data: {
          ...stats,
          isCurrentlyProcessing: this.scheduler.isProcessing()
        }
      });
    } catch (error) {
      logger.error('Error getting Twilio stats:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get Twilio stats'
      });
    }
  }

  /**
   * Get contacts with not connected calls
   * GET /api/twilio/contacts-with-not-connected-calls
   */
  async getContactsWithNotConnectedCalls(req: Request, res: Response): Promise<void> {
    try {
      // This should be user-scoped, but for now we'll check if user is authenticated
      const database = require('../config/database').default;
      
      const result = await database.query(`
        SELECT 
          id,
          name,
          phone_number,
          email,
          company,
          not_connected,
          updated_at
        FROM contacts 
        WHERE not_connected > 0 
        ORDER BY not_connected DESC, updated_at DESC
        LIMIT 100
      `);

      res.json({
        success: true,
        data: result.rows,
        count: result.rows.length
      });
    } catch (error) {
      logger.error('Error getting contacts with not connected calls:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get contacts with not connected calls'
      });
    }
  }
}