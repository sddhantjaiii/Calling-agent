import twilio from 'twilio';
import database from '../config/database';
import { logger } from '../utils/logger';

export class TwilioNotConnectedService {
  private client: twilio.Twilio;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not found in environment variables');
    }

    this.client = twilio(accountSid, authToken);
  }

  /**
   * Fetch unanswered calls from Twilio and update contacts table
   * Runs every minute to track not connected calls
   */
  async processUnansweredCalls(): Promise<void> {
    try {
      logger.info('Starting Twilio not connected calls processing...');

      // Get calls from the last 2 minutes to ensure we don't miss any
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

      const calls = await this.client.calls.list({
        status: 'no-answer',
        startTimeAfter: twoMinutesAgo,
        limit: 1000 // Increase limit to handle high volume
      });

      logger.info(`Found ${calls.length} unanswered calls from Twilio`);

      let processedCount = 0;
      let duplicateCount = 0;

      for (const call of calls) {
        try {
          // Check if we've already processed this call
          const existingCall = await database.query(
            'SELECT id FROM twilio_processed_calls WHERE twilio_call_sid = $1',
            [call.sid]
          );

          if (existingCall.rows.length > 0) {
            duplicateCount++;
            continue;
          }

          // Find matching contact by phone number
          const contactResult = await database.query(
            'SELECT id, user_id, phone_number, not_connected FROM contacts WHERE phone_number = $1',
            [call.to]
          );

          if (contactResult.rows.length > 0) {
            const contact = contactResult.rows[0];

            // Start transaction for atomic update
            await database.query('BEGIN');

            try {
              // Increment not_connected count
              await database.query(
                'UPDATE contacts SET not_connected = not_connected + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
                [contact.id]
              );

              // Record that we've processed this call
              await database.query(
                `INSERT INTO twilio_processed_calls 
                 (twilio_call_sid, phone_number, call_status, user_id, contact_id) 
                 VALUES ($1, $2, $3, $4, $5)`,
                [call.sid, call.to, call.status, contact.user_id, contact.id]
              );

              await database.query('COMMIT');
              processedCount++;

              logger.debug(`Updated contact ${contact.id} (${call.to}) - not connected calls: ${contact.not_connected + 1}`);
            } catch (error) {
              await database.query('ROLLBACK');
              logger.error(`Error updating contact ${contact.id}:`, error);
            }
          } else {
            // Record the call even if no matching contact found
            await database.query(
              `INSERT INTO twilio_processed_calls 
               (twilio_call_sid, phone_number, call_status) 
               VALUES ($1, $2, $3)`,
              [call.sid, call.to, call.status]
            );

            logger.debug(`No contact found for phone number: ${call.to}`);
          }
        } catch (error) {
          logger.error(`Error processing call ${call.sid}:`, error);
        }
      }

      logger.info(`Twilio not connected calls processing completed: ${processedCount} processed, ${duplicateCount} duplicates skipped`);

      // Clean up old processed calls (older than 7 days) to prevent table bloat
      await this.cleanupOldProcessedCalls();

    } catch (error) {
      logger.error('Error in processUnansweredCalls:', error);
      throw error;
    }
  }

  /**
   * Clean up old processed calls records (older than 7 days)
   */
  private async cleanupOldProcessedCalls(): Promise<void> {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const result = await database.query(
        'DELETE FROM twilio_processed_calls WHERE processed_at < $1',
        [sevenDaysAgo]
      );

      if (result.rowCount && result.rowCount > 0) {
        logger.info(`Cleaned up ${result.rowCount} old processed call records`);
      }
    } catch (error) {
      logger.error('Error cleaning up old processed calls:', error);
    }
  }

  /**
   * Get statistics about not connected calls processing
   */
  async getProcessingStats(): Promise<{
    totalProcessed: number;
    recentProcessed: number;
    contactsWithNotConnected: number;
  }> {
    try {
      const [totalResult, recentResult, contactsResult] = await Promise.all([
        database.query('SELECT COUNT(*) as total FROM twilio_processed_calls'),
        database.query('SELECT COUNT(*) as recent FROM twilio_processed_calls WHERE processed_at > NOW() - INTERVAL \'24 hours\''),
        database.query('SELECT COUNT(*) as contacts FROM contacts WHERE not_connected > 0')
      ]);

      return {
        totalProcessed: parseInt(totalResult.rows[0].total),
        recentProcessed: parseInt(recentResult.rows[0].recent),
        contactsWithNotConnected: parseInt(contactsResult.rows[0].contacts)
      };
    } catch (error) {
      logger.error('Error getting processing stats:', error);
      return { totalProcessed: 0, recentProcessed: 0, contactsWithNotConnected: 0 };
    }
  }

  /**
   * Manual trigger for testing
   */
  async testConnection(): Promise<boolean> {
    try {
      // Test with a simple API call
      const calls = await this.client.calls.list({ limit: 1 });
      logger.info('Twilio connection test successful');
      return true;
    } catch (error) {
      logger.error('Twilio connection test failed:', error);
      return false;
    }
  }
}