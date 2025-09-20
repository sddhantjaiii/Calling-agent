import { Request, Response } from 'express';
import { TranscriptService, TranscriptSearchOptions } from '../services/transcriptService';
import { logger } from '../utils/logger';

// Transcript controller - handles transcript-specific operations
export class TranscriptController {
  /**
   * Search transcripts across all user calls
   * GET /api/transcripts/search
   */
  static async searchTranscripts(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const searchTerm = req.query.q;
      if (!searchTerm || typeof searchTerm !== 'string') {
        return res.status(400).json({ error: 'Search term (q) is required' });
      }

      if (searchTerm.length < 2) {
        return res.status(400).json({ error: 'Search term must be at least 2 characters' });
      }

      const options: TranscriptSearchOptions = {};

      // Pagination
      if (req.query.limit && typeof req.query.limit === 'string') {
        const limit = parseInt(req.query.limit);
        if (!isNaN(limit) && limit > 0 && limit <= 100) {
          options.limit = limit;
        }
      }

      if (req.query.offset && typeof req.query.offset === 'string') {
        const offset = parseInt(req.query.offset);
        if (!isNaN(offset) && offset >= 0) {
          options.offset = offset;
        }
      }

      // Sorting
      if (req.query.sort_by && typeof req.query.sort_by === 'string') {
        const validSortFields = ['created_at', 'relevance'];
        if (validSortFields.includes(req.query.sort_by)) {
          options.sortBy = req.query.sort_by as any;
        }
      }

      if (req.query.sort_order && typeof req.query.sort_order === 'string') {
        if (['ASC', 'DESC'].includes(req.query.sort_order.toUpperCase())) {
          options.sortOrder = req.query.sort_order.toUpperCase() as any;
        }
      }

      // Filters
      if (req.query.call_id && typeof req.query.call_id === 'string') {
        options.callId = req.query.call_id;
      }

      if (req.query.speaker && typeof req.query.speaker === 'string') {
        if (['agent', 'user'].includes(req.query.speaker)) {
          options.speaker = req.query.speaker as 'agent' | 'user';
        }
      }

      if (req.query.min_timestamp && typeof req.query.min_timestamp === 'string') {
        const minTimestamp = parseInt(req.query.min_timestamp);
        if (!isNaN(minTimestamp)) {
          options.minTimestamp = minTimestamp;
        }
      }

      if (req.query.max_timestamp && typeof req.query.max_timestamp === 'string') {
        const maxTimestamp = parseInt(req.query.max_timestamp);
        if (!isNaN(maxTimestamp)) {
          options.maxTimestamp = maxTimestamp;
        }
      }

      const result = await TranscriptService.searchTranscripts(userId, searchTerm, options);

      return res.json({
        success: true,
        data: {
          results: result.results,
          search_term: searchTerm,
          pagination: {
            total: result.total,
            limit: options.limit || 20,
            offset: options.offset || 0,
            hasMore: result.hasMore
          }
        }
      });
    } catch (error) {
      logger.error('Error in searchTranscripts controller:', error);
      return res.status(500).json({
        error: 'Failed to search transcripts',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get transcript by call ID
   * GET /api/transcripts/call/:callId
   */
  static async getTranscriptByCallId(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const callId = req.params.callId;
      if (!callId) {
        return res.status(400).json({ error: 'Call ID is required' });
      }

      const transcript = await TranscriptService.getTranscriptByCallId(callId, userId);

      if (!transcript) {
        return res.status(404).json({ error: 'Transcript not found' });
      }

      // Check if formatting is requested
      const format = req.query.format as string;
      const searchTerm = req.query.highlight as string;

      if (format === 'formatted') {
        const formatted = TranscriptService.formatTranscriptForDisplay(transcript, searchTerm);
        return res.json({
          success: true,
          data: {
            ...transcript,
            ...formatted
          }
        });
      }

      return res.json({
        success: true,
        data: transcript
      });
    } catch (error) {
      logger.error('Error in getTranscriptByCallId controller:', error);
      return res.status(500).json({
        error: 'Failed to fetch transcript',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Export transcript in various formats
   * GET /api/transcripts/call/:callId/export
   */
  static async exportTranscript(req: Request, res: Response): Promise<Response | void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const callId = req.params.callId;
      if (!callId) {
        return res.status(400).json({ error: 'Call ID is required' });
      }

      const format = req.query.format as string || 'txt';
      if (!['txt', 'json', 'csv'].includes(format)) {
        return res.status(400).json({ error: 'Invalid format. Supported formats: txt, json, csv' });
      }

      const transcript = await TranscriptService.getTranscriptByCallId(callId, userId);

      if (!transcript) {
        return res.status(404).json({ error: 'Transcript not found' });
      }

      const exportedContent = TranscriptService.exportTranscript(transcript, format as any);

      // Set appropriate content type and filename
      const contentTypes = {
        txt: 'text/plain',
        json: 'application/json',
        csv: 'text/csv'
      };

      const filename = `transcript_${callId}.${format}`;

      res.setHeader('Content-Type', contentTypes[format as keyof typeof contentTypes]);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(exportedContent);
    } catch (error) {
      logger.error('Error in exportTranscript controller:', error);
      return res.status(500).json({
        error: 'Failed to export transcript',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get transcript analytics for user
   * GET /api/transcripts/analytics
   */
  static async getTranscriptAnalytics(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const period = req.query.period;
      let validPeriod: 'day' | 'week' | 'month' | undefined;

      if (period && typeof period === 'string') {
        if (['day', 'week', 'month'].includes(period)) {
          validPeriod = period as 'day' | 'week' | 'month';
        }
      }

      const analytics = await TranscriptService.getTranscriptAnalytics(userId, validPeriod);

      return res.json({
        success: true,
        data: {
          ...analytics,
          period: validPeriod || 'all_time'
        }
      });
    } catch (error) {
      logger.error('Error in getTranscriptAnalytics controller:', error);
      return res.status(500).json({
        error: 'Failed to fetch transcript analytics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get formatted transcript with highlighting
   * GET /api/transcripts/call/:callId/formatted
   */
  static async getFormattedTranscript(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const callId = req.params.callId;
      if (!callId) {
        return res.status(400).json({ error: 'Call ID is required' });
      }

      const searchTerm = req.query.highlight as string;

      const transcript = await TranscriptService.getTranscriptByCallId(callId, userId);

      if (!transcript) {
        return res.status(404).json({ error: 'Transcript not found' });
      }

      const formatted = TranscriptService.formatTranscriptForDisplay(transcript, searchTerm);

      return res.json({
        success: true,
        data: {
          call_id: callId,
          transcript_id: transcript.id,
          created_at: transcript.created_at,
          search_term: searchTerm,
          ...formatted
        }
      });
    } catch (error) {
      logger.error('Error in getFormattedTranscript controller:', error);
      return res.status(500).json({
        error: 'Failed to format transcript',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}