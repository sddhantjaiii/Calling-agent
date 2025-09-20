import Transcript, { TranscriptInterface, SpeakerSegment } from '../models/Transcript';
import Call from '../models/Call';
import { logger } from '../utils/logger';

export interface TranscriptSearchOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'relevance';
  sortOrder?: 'ASC' | 'DESC';
  callId?: string;
  speaker?: 'agent' | 'user';
  minTimestamp?: number;
  maxTimestamp?: number;
}

export interface TranscriptSearchResult {
  transcript: TranscriptInterface;
  call_id: string;
  agent_name?: string;
  contact_name?: string;
  matches: Array<{
    segment_index: number;
    speaker: 'agent' | 'user';
    text: string;
    timestamp: number;
    match_context: string;
  }>;
  relevance_score: number;
}

export interface TranscriptAnalytics {
  totalTranscripts: number;
  averageLength: number;
  speakerDistribution: {
    agent_percentage: number;
    user_percentage: number;
  };
  commonPhrases: Array<{
    phrase: string;
    frequency: number;
    speaker: 'agent' | 'user' | 'both';
  }>;
  sentimentTrends?: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

// Transcript service - business logic for transcript management and analysis
export class TranscriptService {
  /**
   * Process transcript data from ElevenLabs webhook
   */
  static async processTranscriptFromWebhook(
    callId: string,
    transcriptData: {
      full_text?: string;
      segments?: Array<{
        speaker: 'agent' | 'user';
        text: string;
        timestamp: number;
        confidence?: number;
      }>;
      language?: string;
      summary?: string;
    }
  ): Promise<TranscriptInterface> {
    try {
      logger.info(`Processing transcript for call ${callId}`);

      // Check if transcript already exists
      const existingTranscript = await Transcript.findByCallId(callId);
      if (existingTranscript) {
        logger.info(`Transcript already exists for call ${callId}, skipping`);
        return existingTranscript;
      }

      // Validate and format speaker segments
      const speakerSegments: SpeakerSegment[] = [];
      let fullText = transcriptData.full_text || '';

      if (transcriptData.segments && transcriptData.segments.length > 0) {
        // Process segments
        transcriptData.segments.forEach((segment, index) => {
          if (segment.text && segment.text.trim()) {
            speakerSegments.push({
              speaker: segment.speaker,
              text: segment.text.trim(),
              timestamp: segment.timestamp || index * 1000 // Default timestamp if missing
            });
          }
        });

        // Generate full text from segments if not provided
        if (!fullText) {
          fullText = speakerSegments
            .map(segment => `${segment.speaker === 'agent' ? 'Agent' : 'User'}: ${segment.text}`)
            .join('\n');
        }
      } else if (fullText) {
        // If only full text is provided, try to parse it into segments
        speakerSegments.push(...this.parseFullTextIntoSegments(fullText));
      }

      if (!fullText && speakerSegments.length === 0) {
        throw new Error('No transcript content provided');
      }

      // Create transcript record (sanitize newlines and ensure valid JSON for segments)
      const safeFullText = fullText.replace(/\r\n/g, '\n');
      const cleanedSegments = speakerSegments.map(s => ({
        speaker: s.speaker,
        text: (s.text || '').replace(/\r\n/g, '\n'),
        timestamp: s.timestamp
      }));

      const transcript = await Transcript.createTranscript({
        call_id: callId,
        content: safeFullText,
        speaker_segments: cleanedSegments
      });

      logger.info(`Successfully processed transcript for call ${callId}`, {
        segments_count: speakerSegments.length,
        content_length: fullText.length
      });

      return transcript;
    } catch (error) {
      logger.error(`Error processing transcript for call ${callId}:`, error);
      throw new Error(`Failed to process transcript: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse full text into speaker segments (basic implementation)
   */
  private static parseFullTextIntoSegments(fullText: string): SpeakerSegment[] {
    const segments: SpeakerSegment[] = [];
    const lines = fullText.split('\n');
    let timestamp = 0;

    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      // Try to detect speaker patterns like "Agent: text" or "User: text"
      const agentMatch = trimmedLine.match(/^(Agent|AI|Assistant):\s*(.+)$/i);
      const userMatch = trimmedLine.match(/^(User|Customer|Caller):\s*(.+)$/i);

      if (agentMatch && agentMatch[2]) {
        segments.push({
          speaker: 'agent',
          text: agentMatch[2].trim(),
          timestamp: timestamp
        });
        timestamp += 2000; // Estimate 2 seconds per segment
      } else if (userMatch && userMatch[2]) {
        segments.push({
          speaker: 'user',
          text: userMatch[2].trim(),
          timestamp: timestamp
        });
        timestamp += 2000;
      } else if (trimmedLine) {
        // Default to user if no clear pattern
        segments.push({
          speaker: 'user',
          text: trimmedLine,
          timestamp: timestamp
        });
        timestamp += 2000;
      }
    });

    return segments;
  }

  /**
   * Search within transcript content
   */
  static async searchTranscripts(
    userId: string,
    searchTerm: string,
    options: TranscriptSearchOptions = {}
  ): Promise<{
    results: TranscriptSearchResult[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      logger.info(`Searching transcripts for user ${userId}`, { searchTerm, options });

      if (searchTerm.length < 2) {
        throw new Error('Search term must be at least 2 characters');
      }

      const limit = options.limit || 20;
      const offset = options.offset || 0;
      const searchPattern = `%${searchTerm.toLowerCase()}%`;

      // Build search query
      let query = `
        SELECT 
          t.*,
          c.id as call_id,
          c.phone_number,
          c.created_at as call_created_at,
          a.name as agent_name,
          ct.name as contact_name,
          -- Calculate relevance score based on match frequency and position
          (
            LENGTH(LOWER(t.content)) - LENGTH(REPLACE(LOWER(t.content), LOWER($2), ''))
          ) / LENGTH(LOWER($2)) as relevance_score
        FROM transcripts t
        INNER JOIN calls c ON t.call_id = c.id
        LEFT JOIN agents a ON c.agent_id = a.id
        LEFT JOIN contacts ct ON c.contact_id = ct.id
        WHERE c.user_id = $1
        AND (
          LOWER(t.content) LIKE $3
          OR EXISTS (
            SELECT 1 FROM jsonb_array_elements(t.speaker_segments) AS segment
            WHERE LOWER(segment->>'text') LIKE $3
          )
        )
      `;

      const params: any[] = [userId, searchTerm, searchPattern];
      let paramIndex = 4;

      // Apply additional filters
      if (options.callId) {
        query += ` AND c.id = $${paramIndex}`;
        params.push(options.callId);
        paramIndex++;
      }

      if (options.speaker) {
        query += ` AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(t.speaker_segments) AS segment
          WHERE segment->>'speaker' = $${paramIndex}
          AND LOWER(segment->>'text') LIKE $3
        )`;
        params.push(options.speaker);
        paramIndex++;
      }

      // Apply sorting
      const sortBy = options.sortBy || 'relevance';
      const sortOrder = options.sortOrder || 'DESC';

      if (sortBy === 'relevance') {
        query += ` ORDER BY relevance_score ${sortOrder}, c.created_at DESC`;
      } else {
        query += ` ORDER BY t.${sortBy} ${sortOrder}`;
      }

      // Get total count
      const countQuery = query.replace(
        /SELECT[\s\S]*?FROM/,
        'SELECT COUNT(DISTINCT t.id) as total FROM'
      ).replace(/ORDER BY[\s\S]*$/, '');

      const countResult = await Transcript.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total);

      // Apply pagination
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await Transcript.query(query, params);

      // Process results to extract matches
      const results: TranscriptSearchResult[] = result.rows.map((row: any) => {
        const matches = this.extractMatches(row.speaker_segments, searchTerm);
        
        return {
          transcript: {
            id: row.id,
            call_id: row.call_id,
            content: row.content,
            speaker_segments: row.speaker_segments,
            created_at: row.created_at
          },
          call_id: row.call_id,
          agent_name: row.agent_name,
          contact_name: row.contact_name,
          matches,
          relevance_score: parseFloat(row.relevance_score) || 0
        };
      });

      const hasMore = offset + results.length < total;

      logger.info(`Found ${results.length} transcript matches for user ${userId}`, {
        total,
        hasMore,
        search_term: searchTerm
      });

      return {
        results,
        total,
        hasMore
      };
    } catch (error) {
      logger.error('Error searching transcripts:', error);
      throw new Error(`Failed to search transcripts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract matching segments from transcript
   */
  private static extractMatches(
    speakerSegments: SpeakerSegment[],
    searchTerm: string
  ): Array<{
    segment_index: number;
    speaker: 'agent' | 'user';
    text: string;
    timestamp: number;
    match_context: string;
  }> {
    const matches: any[] = [];
    const searchLower = searchTerm.toLowerCase();

    speakerSegments.forEach((segment, index) => {
      if (segment.text && segment.text.toLowerCase().includes(searchLower)) {
        // Create context around the match
        const words = segment.text.split(' ');
        const matchWordIndex = words.findIndex(word => 
          word.toLowerCase().includes(searchLower)
        );

        let context = segment.text;
        if (matchWordIndex >= 0 && words.length > 10) {
          const start = Math.max(0, matchWordIndex - 5);
          const end = Math.min(words.length, matchWordIndex + 6);
          context = words.slice(start, end).join(' ');
          if (start > 0) context = '...' + context;
          if (end < words.length) context = context + '...';
        }

        matches.push({
          segment_index: index,
          speaker: segment.speaker,
          text: segment.text,
          timestamp: segment.timestamp,
          match_context: context
        });
      }
    });

    return matches;
  }

  /**
   * Get transcript by call ID with ownership verification
   */
  static async getTranscriptByCallId(
    callId: string,
    userId: string
  ): Promise<TranscriptInterface | null> {
    try {
      // Verify call ownership
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
   * Get transcript analytics for a user
   */
  static async getTranscriptAnalytics(
    userId: string,
    period?: 'day' | 'week' | 'month'
  ): Promise<TranscriptAnalytics> {
    try {
      let dateFilter = '';
      if (period) {
        const intervals = {
          day: '1 day',
          week: '7 days',
          month: '30 days'
        };
        dateFilter = `AND c.created_at >= NOW() - INTERVAL '${intervals[period]}'`;
      }

      // Get basic transcript statistics
      const statsQuery = `
        SELECT 
          COUNT(t.id) as total_transcripts,
          AVG(LENGTH(t.content)) as avg_length,
          AVG(jsonb_array_length(t.speaker_segments)) as avg_segments
        FROM transcripts t
        INNER JOIN calls c ON t.call_id = c.id
        WHERE c.user_id = $1 ${dateFilter}
      `;

      const statsResult = await Transcript.query(statsQuery, [userId]);
      const stats = statsResult.rows[0];

      // Get speaker distribution
      const speakerQuery = `
        SELECT 
          segment->>'speaker' as speaker,
          COUNT(*) as count
        FROM transcripts t
        INNER JOIN calls c ON t.call_id = c.id,
        jsonb_array_elements(t.speaker_segments) AS segment
        WHERE c.user_id = $1 ${dateFilter}
        GROUP BY segment->>'speaker'
      `;

      const speakerResult = await Transcript.query(speakerQuery, [userId]);
      
      let agentCount = 0;
      let userCount = 0;
      
      speakerResult.rows.forEach((row: any) => {
        if (row.speaker === 'agent') {
          agentCount = parseInt(row.count);
        } else if (row.speaker === 'user') {
          userCount = parseInt(row.count);
        }
      });

      const totalSegments = agentCount + userCount;
      const speakerDistribution = {
        agent_percentage: totalSegments > 0 ? (agentCount / totalSegments) * 100 : 0,
        user_percentage: totalSegments > 0 ? (userCount / totalSegments) * 100 : 0
      };

      // Get common phrases (simplified implementation)
      const phrasesQuery = `
        SELECT 
          word,
          COUNT(*) as frequency,
          'both' as speaker
        FROM (
          SELECT unnest(string_to_array(LOWER(content), ' ')) as word
          FROM transcripts t
          INNER JOIN calls c ON t.call_id = c.id
          WHERE c.user_id = $1 ${dateFilter}
          AND LENGTH(content) > 0
        ) words
        WHERE LENGTH(word) > 3
        AND word NOT IN ('the', 'and', 'that', 'this', 'with', 'have', 'will', 'you', 'they', 'are', 'for', 'not', 'can', 'but', 'all', 'any', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'she', 'use', 'way', 'what', 'when', 'your')
        GROUP BY word
        HAVING COUNT(*) > 2
        ORDER BY frequency DESC
        LIMIT 10
      `;

      const phrasesResult = await Transcript.query(phrasesQuery, [userId]);
      const commonPhrases = phrasesResult.rows.map((row: any) => ({
        phrase: row.word,
        frequency: parseInt(row.frequency),
        speaker: row.speaker
      }));

      return {
        totalTranscripts: parseInt(stats.total_transcripts) || 0,
        averageLength: parseFloat(stats.avg_length) || 0,
        speakerDistribution,
        commonPhrases
      };
    } catch (error) {
      logger.error('Error fetching transcript analytics:', error);
      throw new Error('Failed to fetch transcript analytics');
    }
  }

  /**
   * Format transcript for display with highlighting
   */
  static formatTranscriptForDisplay(
    transcript: TranscriptInterface,
    searchTerm?: string
  ): {
    formatted_content: string;
    segments_with_timestamps: Array<{
      speaker: string;
      text: string;
      timestamp: string;
      highlighted?: boolean;
    }>;
  } {
    try {
      const segments_with_timestamps = transcript.speaker_segments.map(segment => {
        // Format timestamp
        const minutes = Math.floor(segment.timestamp / 60000);
        const seconds = Math.floor((segment.timestamp % 60000) / 1000);
        const timestamp = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        // Check if segment contains search term
        const highlighted = searchTerm 
          ? segment.text.toLowerCase().includes(searchTerm.toLowerCase())
          : false;

        return {
          speaker: segment.speaker === 'agent' ? 'Agent' : 'User',
          text: segment.text,
          timestamp,
          highlighted
        };
      });

      // Create formatted content
      let formatted_content = segments_with_timestamps
        .map(segment => `[${segment.timestamp}] ${segment.speaker}: ${segment.text}`)
        .join('\n');

      // Highlight search terms if provided
      if (searchTerm) {
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        formatted_content = formatted_content.replace(regex, '**$1**');
      }

      return {
        formatted_content,
        segments_with_timestamps
      };
    } catch (error) {
      logger.error('Error formatting transcript:', error);
      return {
        formatted_content: transcript.content,
        segments_with_timestamps: []
      };
    }
  }

  /**
   * Export transcript in various formats
   */
  static exportTranscript(
    transcript: TranscriptInterface,
    format: 'txt' | 'json' | 'csv' = 'txt'
  ): string {
    try {
      switch (format) {
        case 'json':
          return JSON.stringify({
            call_id: transcript.call_id,
            content: transcript.content,
            speaker_segments: transcript.speaker_segments,
            created_at: transcript.created_at
          }, null, 2);

        case 'csv':
          const csvHeader = 'Timestamp,Speaker,Text\n';
          const csvRows = transcript.speaker_segments.map(segment => {
            const timestamp = new Date(segment.timestamp).toISOString();
            const escapedText = `"${segment.text.replace(/"/g, '""')}"`;
            return `${timestamp},${segment.speaker},${escapedText}`;
          }).join('\n');
          return csvHeader + csvRows;

        case 'txt':
        default:
          return transcript.speaker_segments
            .map(segment => {
              const minutes = Math.floor(segment.timestamp / 60000);
              const seconds = Math.floor((segment.timestamp % 60000) / 1000);
              const timestamp = `${minutes}:${seconds.toString().padStart(2, '0')}`;
              const speaker = segment.speaker === 'agent' ? 'Agent' : 'User';
              return `[${timestamp}] ${speaker}: ${segment.text}`;
            })
            .join('\n');
      }
    } catch (error) {
      logger.error('Error exporting transcript:', error);
      return transcript.content;
    }
  }
}