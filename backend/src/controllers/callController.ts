import { Request, Response } from 'express';
import { CallService } from '../services/callService';
import { AgentOwnershipRequest } from '../middleware/agentOwnership';
import { logger } from '../utils/logger';
import fetch from 'node-fetch';

// Call controller - handles call data and transcript management
export class CallController {
  /**
   * Get calls for the authenticated user with filtering, pagination and search
   * GET /api/calls
   */
  static async getCalls(req: Request, res: Response): Promise<Response> {
    try {
      const authReq = req as AgentOwnershipRequest;
      const userId = (req.user as any)?.id;
      const specificAgent = authReq.agent;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Parse query parameters for filtering
      const filters: any = {};
      const options: any = {};

      // Search term filter (searches across contact name, phone, summary)
      if (req.query.search && typeof req.query.search === 'string') {
        filters.search = req.query.search;
      }

      // Status filter
      if (req.query.status && typeof req.query.status === 'string') {
        const validStatuses = ['completed', 'failed', 'in_progress', 'cancelled'];
        if (validStatuses.includes(req.query.status)) {
          filters.status = req.query.status as any;
        }
      }

      // Agent filter
      if (req.query.agent_id && typeof req.query.agent_id === 'string') {
        filters.agentId = req.query.agent_id;
      }

      // Agent name filter
      if (req.query.agent && typeof req.query.agent === 'string') {
        filters.agentName = req.query.agent;
      }

      // Phone number search
      if (req.query.phone && typeof req.query.phone === 'string') {
        filters.phoneNumber = req.query.phone;
      }

      // Contact name search
      if (req.query.contact && typeof req.query.contact === 'string') {
        filters.contactName = req.query.contact;
      }

      // Date range filters
      if (req.query.start_date && typeof req.query.start_date === 'string') {
        filters.startDate = new Date(req.query.start_date);
      }

      if (req.query.end_date && typeof req.query.end_date === 'string') {
        filters.endDate = new Date(req.query.end_date);
      }

      // Duration filters
      if (req.query.min_duration && typeof req.query.min_duration === 'string') {
        const minDuration = parseInt(req.query.min_duration);
        if (!isNaN(minDuration)) {
          filters.minDuration = minDuration;
        }
      }

      if (req.query.max_duration && typeof req.query.max_duration === 'string') {
        const maxDuration = parseInt(req.query.max_duration);
        if (!isNaN(maxDuration)) {
          filters.maxDuration = maxDuration;
        }
      }

      // Content filters
      if (req.query.has_transcript === 'true') {
        filters.hasTranscript = true;
      } else if (req.query.has_transcript === 'false') {
        filters.hasTranscript = false;
      }

      if (req.query.has_analytics === 'true') {
        filters.hasAnalytics = true;
      } else if (req.query.has_analytics === 'false') {
        filters.hasAnalytics = false;
      }

      // Lead scoring filters
      if (req.query.min_score && typeof req.query.min_score === 'string') {
        const minScore = parseInt(req.query.min_score);
        if (!isNaN(minScore)) {
          filters.minScore = minScore;
        }
      }

      if (req.query.max_score && typeof req.query.max_score === 'string') {
        const maxScore = parseInt(req.query.max_score);
        if (!isNaN(maxScore)) {
          filters.maxScore = maxScore;
        }
      }

      if (req.query.lead_status && typeof req.query.lead_status === 'string') {
        filters.leadStatus = req.query.lead_status;
      }

      // Lead tag filter (Hot, Warm, Cold)
      if (req.query.lead_tag && typeof req.query.lead_tag === 'string') {
        filters.leadTag = req.query.lead_tag;
      }

      // Pagination options
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

      // Sorting options
      if (req.query.sort_by && typeof req.query.sort_by === 'string') {
        const validSortFields = ['created_at', 'duration_minutes', 'total_score', 'contact_name', 'phone_number'];
        if (validSortFields.includes(req.query.sort_by)) {
          options.sortBy = req.query.sort_by as any;
        }
      }

      if (req.query.sort_order && typeof req.query.sort_order === 'string') {
        if (['ASC', 'DESC', 'asc', 'desc'].includes(req.query.sort_order)) {
          options.sortOrder = req.query.sort_order.toUpperCase() as any;
        }
      }

      // Get all calls for the user
      let calls = await CallService.getUserCalls(userId);

      // Apply filters
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        calls = calls.filter(call => 
          (call.contact_name && call.contact_name.toLowerCase().includes(searchTerm)) ||
          call.phone_number.includes(searchTerm) ||
          // call_summary not available in call model
          (call.agent_name && call.agent_name.toLowerCase().includes(searchTerm))
        );
      }

      if (filters.status) {
        calls = calls.filter(call => call.status === filters.status);
      }

      if (filters.agentId) {
        calls = calls.filter(call => call.agent_id === filters.agentId);
      }

      if (filters.agentName) {
        calls = calls.filter(call => call.agent_name === filters.agentName);
      }

      if (filters.phoneNumber) {
        calls = calls.filter(call => call.phone_number.includes(filters.phoneNumber));
      }

      if (filters.contactName) {
        const contactTerm = filters.contactName.toLowerCase();
        calls = calls.filter(call => 
          call.contact_name && call.contact_name.toLowerCase().includes(contactTerm)
        );
      }

      if (filters.startDate) {
        calls = calls.filter(call => new Date(call.created_at) >= filters.startDate);
      }

      if (filters.endDate) {
        calls = calls.filter(call => new Date(call.created_at) <= filters.endDate);
      }

      if (filters.minDuration) {
        calls = calls.filter(call => (call.duration_minutes || 0) >= filters.minDuration);
      }

      if (filters.maxDuration) {
        calls = calls.filter(call => (call.duration_minutes || 0) <= filters.maxDuration);
      }

      if (filters.hasTranscript !== undefined) {
        calls = calls.filter(call => !!call.transcript === filters.hasTranscript);
      }

      if (filters.hasAnalytics !== undefined) {
        calls = calls.filter(call => !!call.lead_analytics === filters.hasAnalytics);
      }

      if (filters.minScore) {
        calls = calls.filter(call => 
          call.lead_analytics && (call.lead_analytics.total_score || 0) >= filters.minScore
        );
      }

      if (filters.maxScore) {
        calls = calls.filter(call => 
          call.lead_analytics && (call.lead_analytics.total_score || 0) <= filters.maxScore
        );
      }

      if (filters.leadStatus) {
        calls = calls.filter(call => 
          call.lead_analytics && call.lead_analytics.lead_status_tag === filters.leadStatus
        );
      }

      if (filters.leadTag) {
        calls = calls.filter(call => {
          if (!call.lead_analytics?.total_score) return filters.leadTag === 'Cold';
          const score = call.lead_analytics.total_score;
          const tag = score >= 80 ? 'Hot' : score >= 60 ? 'Warm' : 'Cold';
          return tag === filters.leadTag;
        });
      }

      // Apply sorting
      if (options.sortBy) {
        calls.sort((a, b) => {
          let aValue: any = a[options.sortBy as keyof typeof a];
          let bValue: any = b[options.sortBy as keyof typeof b];

          // Handle special cases
          if (options.sortBy === 'total_score') {
            aValue = a.lead_analytics?.total_score || 0;
            bValue = b.lead_analytics?.total_score || 0;
          }

          // Handle date sorting
          if (options.sortBy === 'created_at') {
            aValue = new Date(aValue).getTime();
            bValue = new Date(bValue).getTime();
          }

          // Handle string sorting
          if (typeof aValue === 'string' && typeof bValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
          }

          // Handle null/undefined values
          if (aValue == null && bValue == null) return 0;
          if (aValue == null) return options.sortOrder === 'DESC' ? 1 : -1;
          if (bValue == null) return options.sortOrder === 'DESC' ? -1 : 1;

          if (options.sortOrder === 'DESC') {
            return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
          } else {
            return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
          }
        });
      } else {
        // Default sort by created_at (newest first)
        calls.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }

      // Apply pagination
      const total = calls.length;
      const limit = options.limit || 50;
      const offset = options.offset || 0;
      const paginatedCalls = calls.slice(offset, offset + limit);

      return res.json({
        success: true,
        data: paginatedCalls,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      });
    } catch (error) {
      logger.error('Error in getCalls controller:', error);
      return res.status(500).json({
        error: 'Failed to fetch calls',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get a specific call with full details
   * GET /api/calls/:id
   */
  static async getCall(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const callId = req.params.id;
      if (!callId) {
        return res.status(400).json({ error: 'Call ID is required' });
      }

      const call = await CallService.getCallDetails(callId, userId);

      if (!call) {
        return res.status(404).json({ error: 'Call not found' });
      }

      return res.json({
        success: true,
        data: call
      });
    } catch (error) {
      logger.error('Error in getCall controller:', error);
      return res.status(500).json({
        error: 'Failed to fetch call details',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get transcript for a specific call
   * GET /api/calls/:id/transcript
   */
  static async getCallTranscript(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const callId = req.params.id;
      if (!callId) {
        return res.status(400).json({ error: 'Call ID is required' });
      }

      const transcript = await CallService.getCallTranscript(callId, userId);

      if (!transcript) {
        return res.status(404).json({ error: 'Transcript not found' });
      }

      return res.json({
        success: true,
        data: transcript
      });
    } catch (error) {
      logger.error('Error in getCallTranscript controller:', error);
      return res.status(500).json({
        error: 'Failed to fetch transcript',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get recording URL for a specific call
   * GET /api/calls/:id/recording
   */
  static async getCallRecording(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const callId = req.params.id;
      if (!callId) {
        return res.status(400).json({ error: 'Call ID is required' });
      }

      const recording = await CallService.getCallRecording(callId, userId);

      if (!recording) {
        return res.status(404).json({ error: 'Recording not found' });
      }

      return res.json({
        success: true,
        data: recording
      });
    } catch (error) {
      logger.error('Error in getCallRecording controller:', error);
      return res.status(500).json({
        error: 'Failed to fetch recording',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Search calls across all user calls with advanced filtering
   * GET /api/calls/search
   */
  static async searchCalls(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req.user as any)?.id;
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

      const options: any = {};

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

      // Get all calls for the user
      let calls = await CallService.getUserCalls(userId);

      // Search across multiple fields
      const searchTermLower = searchTerm.toLowerCase();
      const matchingCalls = calls.filter(call => 
        (call.contact_name && call.contact_name.toLowerCase().includes(searchTermLower)) ||
        call.phone_number.includes(searchTerm) ||
        // call_summary not available in call model
        (call.agent_name && call.agent_name.toLowerCase().includes(searchTermLower)) ||
        (call.transcript?.content && call.transcript.content.toLowerCase().includes(searchTermLower))
      );

      // Apply pagination
      const total = matchingCalls.length;
      const limit = options.limit || 50;
      const offset = options.offset || 0;
      const paginatedResults = matchingCalls.slice(offset, offset + limit);

      return res.json({
        success: true,
        data: {
          results: paginatedResults,
          search_term: searchTerm,
          pagination: {
            total,
            limit,
            offset,
            hasMore: offset + limit < total
          }
        }
      });
    } catch (error) {
      logger.error('Error in searchCalls controller:', error);
      return res.status(500).json({
        error: 'Failed to search calls',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Search transcripts across all user calls
   * GET /api/calls/search/transcripts
   */
  static async searchTranscripts(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req.user as any)?.id;
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

      const options: any = {};

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

      const result = await CallService.searchTranscripts(userId, searchTerm, options);

      return res.json({
        success: true,
        data: {
          results: result.results,
          search_term: searchTerm,
          pagination: {
            total: result.total,
            limit: options.limit || 50,
            offset: options.offset || 0
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
   * Get call statistics for dashboard
   * GET /api/calls/stats
   */
  static async getCallStats(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req.user as any)?.id;
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

      const stats = await CallService.getCallStatistics(userId, validPeriod);

      return res.json({
        success: true,
        data: {
          ...stats,
          period: validPeriod || 'all_time'
        }
      });
    } catch (error) {
      logger.error('Error in getCallStats controller:', error);
      return res.status(500).json({
        error: 'Failed to fetch call statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get recent calls for dashboard
   * GET /api/calls/recent
   */
  static async getRecentCalls(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      let limit = 10;
      if (req.query.limit && typeof req.query.limit === 'string') {
        const parsedLimit = parseInt(req.query.limit);
        if (!isNaN(parsedLimit) && parsedLimit > 0 && parsedLimit <= 50) {
          limit = parsedLimit;
        }
      }

      const calls = await CallService.getRecentCalls(userId, limit);

      return res.json({
        success: true,
        data: calls
      });
    } catch (error) {
      logger.error('Error in getRecentCalls controller:', error);
      return res.status(500).json({
        error: 'Failed to fetch recent calls',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get call audio from ElevenLabs
   * GET /api/calls/:id/audio
   */
  static async getCallAudio(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const callId = req.params.id;
      if (!callId) {
        res.status(400).json({ error: 'Call ID is required' });
        return;
      }

      const call = await CallService.getCallDetails(callId, userId);

      if (!call) {
        res.status(404).json({ error: 'Call not found or you do not have permission to access it.' });
        return;
      }

      const conversationId = call.elevenlabs_conversation_id;
      if (!conversationId) {
        res.status(404).json({ error: 'ElevenLabs conversation ID not found for this call.' });
        return;
      }

      const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
      if (!elevenLabsApiKey) {
        logger.error('ELEVENLABS_API_KEY is not set in environment variables.');
        res.status(500).json({ error: 'Server configuration error.' });
        return;
      }

      const url = `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}/audio`;
      
      logger.info(`Fetching audio from ElevenLabs for conversation ID: ${conversationId}`);

      const elevenLabsResponse = await fetch(url, {
        method: 'GET',
        headers: {
          'xi-api-key': elevenLabsApiKey,
        },
      });

      if (!elevenLabsResponse.ok) {
        const errorBody = await elevenLabsResponse.text();
        logger.error(`ElevenLabs API error: ${elevenLabsResponse.statusText}`, { status: elevenLabsResponse.status, body: errorBody });
        res.status(elevenLabsResponse.status).json({ error: 'Failed to fetch audio from provider.' });
        return;
      }

      res.setHeader('Content-Type', 'audio/mpeg');
      elevenLabsResponse.body.pipe(res);

    } catch (error) {
      logger.error('Error in getCallAudio controller:', error);
      res.status(500).json({
        error: 'Failed to fetch call audio',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
