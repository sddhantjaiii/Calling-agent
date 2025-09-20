import Call, { CallInterface } from '../models/Call';
import Transcript, { TranscriptInterface } from '../models/Transcript';
import LeadAnalytics, { LeadAnalyticsInterface } from '../models/LeadAnalytics';

import { logger } from '../utils/logger';

export interface CallSearchFilters {
  status?: CallInterface['status'];
  agentId?: string;
  phoneNumber?: string;
  startDate?: Date;
  endDate?: Date;
  minDuration?: number;
  maxDuration?: number;
  hasTranscript?: boolean;
  hasAnalytics?: boolean;
  minScore?: number;
  leadStatus?: string;
}

export interface CallListOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'duration_minutes' | 'total_score';
  sortOrder?: 'ASC' | 'DESC';
}

export interface CallWithDetails extends CallInterface {
  agent_name?: string;
  contact_name?: string;
  transcript?: TranscriptInterface;
  lead_analytics?: LeadAnalyticsInterface;
}

// Call service - business logic for call and transcript management
export class CallService {
  /**
   * Get calls for a user
   */
  static async getUserCalls(userId: string): Promise<CallWithDetails[]> {
    try {
      logger.info(`Fetching calls for user ${userId}`);
      const calls = await Call.findByUserId(userId);
      logger.info(`Retrieved ${calls.length} calls for user ${userId}`);
      return calls;
    } catch (error) {
      logger.error('Error fetching user calls:', error);
      throw new Error('Failed to fetch calls');
    }
  }

  /**
   * Get a specific call with full details
   */
  static async getCallDetails(
    callId: string,
    userId: string
  ): Promise<CallWithDetails | null> {
    try {
      // Verify ownership
      const hasAccess = await Call.verifyOwnership(callId, userId);
      if (!hasAccess) {
        logger.warn(`User ${userId} attempted to access call ${callId} without permission`);
        return null;
      }

      const call = await Call.findById(callId);
      if (!call) {
        return null;
      }

      // Get transcript if exists
      const transcript = await Transcript.findByCallId(callId);
      if (transcript) {
        (call as any).transcript = transcript;
      }

      // Get lead analytics if exists
      const analytics = await LeadAnalytics.findByCallId(callId);
      if (analytics) {
        (call as any).lead_analytics = analytics;
      }

      logger.info(`Retrieved call details for call ${callId}`);
      return call as CallWithDetails;
    } catch (error) {
      logger.error(`Error fetching call details for ${callId}:`, error);
      throw new Error('Failed to fetch call details');
    }
  }

  /**
   * Get calls by phone number
   */
  static async getCallsByPhone(phoneNumber: string, userId: string): Promise<CallWithDetails[]> {
    try {
      logger.info(`Fetching calls for phone ${phoneNumber} and user ${userId}`);
      const calls = await Call.findByPhoneNumber(phoneNumber, userId);
      logger.info(`Retrieved ${calls.length} calls for phone ${phoneNumber}`);
      return calls;
    } catch (error) {
      logger.error('Error fetching calls by phone:', error);
      throw new Error('Failed to fetch calls by phone');
    }
  }

  /**
   * Get calls by email address
   */
  static async getCallsByEmail(email: string, userId: string): Promise<CallWithDetails[]> {
    try {
      logger.info(`Fetching calls for email ${email} and user ${userId}`);
      const calls = await Call.findByEmail(email, userId);
      logger.info(`Retrieved ${calls.length} calls for email ${email}`);
      return calls;
    } catch (error) {
      logger.error('Error fetching calls by email:', error);
      throw new Error('Failed to fetch calls by email');
    }
  }

  /**
   * Get call transcript
   */
  static async getCallTranscript(
    callId: string,
    userId: string
  ): Promise<TranscriptInterface | null> {
    try {
      // Verify ownership
      const hasAccess = await Call.verifyOwnership(callId, userId);
      if (!hasAccess) {
        logger.warn(`User ${userId} attempted to access transcript for call ${callId} without permission`);
        return null;
      }

      const transcript = await Transcript.findByCallId(callId);
      
      if (transcript) {
        logger.info(`Retrieved transcript for call ${callId}`);
      }

      return transcript;
    } catch (error) {
      logger.error(`Error fetching transcript for call ${callId}:`, error);
      throw new Error('Failed to fetch transcript');
    }
  }

  /**
   * Get call recording URL (validates ownership)
   */
  static async getCallRecording(
    callId: string,
    userId: string
  ): Promise<{ recording_url: string } | null> {
    try {
      // Verify ownership and get call
      const call = await this.getCallDetails(callId, userId);
      
      if (!call || !call.recording_url) {
        return null;
      }

      logger.info(`Retrieved recording URL for call ${callId}`);
      return { recording_url: call.recording_url };
    } catch (error) {
      logger.error(`Error fetching recording for call ${callId}:`, error);
      throw new Error('Failed to fetch recording');
    }
  }

  /**
   * Search transcripts within calls
   */
  static async searchTranscripts(
    userId: string,
    searchTerm: string,
    options: any = {}
  ): Promise<{
    results: (CallWithDetails & { transcript_matches?: any[] })[];
    total: number;
  }> {
    try {
      logger.info(`Searching transcripts for user ${userId}`, { searchTerm });

      // Use the existing Call model method for calls with analytics
      const calls = await Call.getCallsWithAnalytics(userId, {
        limit: options.limit || 50,
        offset: options.offset || 0
      });

      // Filter calls that have transcripts matching the search term
      const results: any[] = [];
      
      for (const call of calls) {
        const transcript = await Transcript.findByCallId(call.id);
        if (transcript && transcript.content.toLowerCase().includes(searchTerm.toLowerCase())) {
          results.push({
            ...call,
            transcript,
            transcript_matches: []
          });
        }
      }

      logger.info(`Found ${results.length} transcript matches for user ${userId}`);

      return {
        results,
        total: results.length
      };
    } catch (error) {
      logger.error('Error searching transcripts:', error);
      throw new Error('Failed to search transcripts');
    }
  }

  /**
   * Get call statistics for dashboard
   */
  static async getCallStatistics(
    userId: string,
    period?: 'day' | 'week' | 'month'
  ): Promise<{
    totalCalls: number;
    completedCalls: number;
    failedCalls: number;
    totalMinutes: number;
    totalCreditsUsed: number;
    averageCallDuration: number;
    averageLeadScore?: number;
    topPerformingAgent?: string;
  }> {
    try {
      const stats = await Call.getCallStats(userId, period);
      return stats;
    } catch (error) {
      logger.error('Error fetching call statistics:', error);
      throw new Error('Failed to fetch call statistics');
    }
  }

  /**
   * Get recent calls for dashboard
   */
  static async getRecentCalls(
    userId: string,
    limit: number = 10
  ): Promise<CallWithDetails[]> {
    try {
      const calls = await Call.getRecentCalls(userId, limit);
      
      logger.info(`Retrieved ${calls.length} recent calls for user ${userId}`);
      return calls;
    } catch (error) {
      logger.error('Error fetching recent calls:', error);
      throw new Error('Failed to fetch recent calls');
    }
  }

  /**
   * Process call webhook data (called by webhook service)
   */
  static async processCallWebhook(_webhookData: any): Promise<void> {
    // This method is called by the webhook service
    // The actual processing is handled in webhookService.processCallCompletedWebhook
    logger.info('Call webhook processing delegated to webhook service');
  }
}