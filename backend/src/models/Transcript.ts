import BaseModel, { BaseModelInterface } from './BaseModel';

// Transcript model - defines transcript data structure
export interface SpeakerSegment {
  speaker: 'agent' | 'user';
  text: string;
  timestamp: number;
}

export interface TranscriptInterface extends BaseModelInterface {
  id: string;
  call_id: string;
  content: string;
  speaker_segments: SpeakerSegment[];
  created_at: Date;
}

export interface CreateTranscriptData {
  call_id: string;
  content: string;
  speaker_segments: SpeakerSegment[];
}

export class TranscriptModel extends BaseModel<TranscriptInterface> {
  constructor() {
    super('transcripts');
  }

  /**
   * Find transcript by call ID
   */
  async findByCallId(callId: string): Promise<TranscriptInterface | null> {
    return await this.findOne({ call_id: callId });
  }

  /**
   * Create a new transcript
   */
  async createTranscript(transcriptData: CreateTranscriptData): Promise<TranscriptInterface> {
    // Explicitly cast speaker_segments to jsonb to avoid double-stringification issues
    const { call_id, content, speaker_segments } = transcriptData;
    // Need user_id due to NOT NULL and FK constraints; derive from calls
    const query = `
      INSERT INTO transcripts (call_id, user_id, content, speaker_segments)
      SELECT $1, c.user_id, $2, $3::jsonb
      FROM calls c
      WHERE c.id = $1
      RETURNING *
    `;
    const params = [call_id, content, JSON.stringify(speaker_segments)];
    const result = await this.query(query, params);
    return result.rows[0];
  }
}

export default new TranscriptModel();