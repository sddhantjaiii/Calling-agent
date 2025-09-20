import * as crypto from 'crypto';
import Call from '../models/Call';
import Agent from '../models/Agent';
import { BillingService } from './billingService';
import { WebhookDataProcessor } from './webhookDataProcessor';
import { ContactAutoCreationService } from './contactAutoCreationService';
import { AnalyticsService } from './analyticsService';
import { TranscriptService } from './transcriptService';
import { logger } from '../utils/logger';

// Final ElevenLabs Webhook Payload Interface - Based on actual received format
export interface ElevenLabsWebhookPayload {
  conversation_id: string;
  agent_id: string;
  status: 'done' | 'failed' | 'error';
  user_id?: string | null;
  transcript: Array<{
    role: 'agent' | 'user';
    agent_metadata?: any;
    message: string;
    multivoice_message?: any;
    tool_calls?: any[];
    tool_results?: any[];
    feedback?: any;
    llm_override?: any;
    time_in_call_secs: number;
    conversation_turn_metrics?: any;
    rag_retrieval_info?: any;
    llm_usage?: any;
    interrupted?: boolean;
    original_message?: any;
    source_medium?: any;
  }>;
  metadata: {
    start_time_unix_secs: number;
    call_duration_secs: number;
    cost: number;
    call_id: string;
    call_type: string;
    call_timestamp: string;
    call_timestamp_timezone: string;
    latency_p50: number;
    latency_p90: number;
    latency_p95: number;
    latency_p99: number;
    interruption_rate: number;
    voice_activity_detection_rate: number;
    silence_percentage: number;
    phone_call?: {
      direction: string;
      phone_number_id: string;
      agent_number: string;
      external_number: string;
      type: string;
      stream_sid: string;
      call_sid: string;
    };
    batch_call?: {
      batch_call_id: string;
      batch_call_recipient_id: string;
    };
    termination_reason?: string;
    error?: any;
    main_language?: string;
    [key: string]: any;
  };
  analysis: {
    data_collection_results?: {
      default?: {
        value: string; // JSON string containing lead analytics
      };
    };
    value?: string; // Legacy format - JSON string containing lead analytics
  };
}

// Parsed analysis structure from analysis.value
export interface ParsedAnalysisData {
  total_score: number;
  intent_level: string;
  intent_score: number;
  urgency_level: string;
  urgency_score: number;
  budget_constraint: string;
  budget_score: number;
  fit_alignment: string;
  fit_score: number;
  engagement_health: string;
  engagement_score: number;
  lead_status_tag: string;
  reasoning: {
    intent: string;
    urgency: string;
    budget: string;
    fit: string;
    engagement: string;
    cta_behavior: string;
  };
  extraction: {
    company_name?: string;
    name?: string;
    email_address?: string;
    smartnotification?: string;
  };
  cta_pricing_clicked: string;
  cta_demo_clicked: string;
  cta_followup_clicked: string;
  cta_sample_clicked: string;
  cta_escalated_to_human: string;
  demo_book_datetime?: string;
}

class WebhookService {
  private analyticsService: AnalyticsService;

  constructor() {
    this.analyticsService = new AnalyticsService();
  }

  /**
   * Verify webhook signature from ElevenLabs
   * ElevenLabs uses format: t=timestamp,v0=hash
   * Hash is HMAC-SHA256 of "timestamp.request_body"
   */
  verifyWebhookSignature(payload: string, signature: string, secret?: string): boolean {
    if (!secret) {
      logger.warn('No webhook secret configured, skipping signature verification');
      return true; // Allow webhooks without signature verification during development
    }

    if (!signature) {
      logger.error('No signature provided in webhook request');
      return false;
    }

    // 🐛 DEBUG: Log signature details
    logger.info('🔍 Signature verification debug', {
      signature_raw: signature,
      signature_length: signature?.length || 0,
      payload_type: typeof payload,
      payload_is_null: payload === null,
      payload_is_undefined: payload === undefined,
      payload_length: payload?.length || 0,
      payload_preview: payload?.substring(0, 100) || '[NO_PAYLOAD]',
      secret_present: !!secret,
      secret_length: secret?.length || 0
    });

    if (!payload) {
      logger.error('❌ No payload provided for signature verification');
      return false;
    }

    try {
      // Parse ElevenLabs signature format: t=timestamp,v0=hash
      const parts = signature.split(',');
      logger.info('🔍 Signature parts', { parts, parts_count: parts.length });
      
      if (parts.length !== 2) {
        logger.error('Invalid signature format, expected t=timestamp,v0=hash', { 
          received_parts: parts, 
          parts_count: parts.length 
        });
        return false;
      }

      const timestampPart = parts[0];
      const hashPart = parts[1];

      logger.info('🔍 Signature components', { 
        timestampPart, 
        hashPart,
        timestamp_starts_with_t: timestampPart.startsWith('t='),
        hash_starts_with_v0: hashPart.startsWith('v0=')
      });

      if (!timestampPart.startsWith('t=') || !hashPart.startsWith('v0=')) {
        logger.error('Invalid signature format, missing t= or v0= prefixes', {
          timestampPart,
          hashPart,
          timestamp_valid: timestampPart.startsWith('t='),
          hash_valid: hashPart.startsWith('v0=')
        });
        return false;
      }

      const timestamp = timestampPart.substring(2);
      const providedHash = hashPart.substring(3);

      logger.info('🔍 Extracted values', { 
        timestamp, 
        providedHash: providedHash.substring(0, 16) + '...', 
        providedHash_length: providedHash.length 
      });

      // Create the signed payload (timestamp.request_body)
      const signedPayload = `${timestamp}.${payload}`;
      const expectedHash = crypto.createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex');

      logger.info('🔍 Hash comparison', { 
        expectedHash: expectedHash.substring(0, 16) + '...', 
        providedHash: providedHash.substring(0, 16) + '...', 
        expectedHash_length: expectedHash.length,
        providedHash_length: providedHash.length,
        signedPayload_length: signedPayload.length
      });

      // Use constant-time comparison to prevent timing attacks
      const providedBuffer = Buffer.from(providedHash, 'hex');
      const expectedBuffer = Buffer.from(expectedHash, 'hex');

      if (providedBuffer.length !== expectedBuffer.length) {
        logger.error('Hash length mismatch', {
          provided_length: providedBuffer.length,
          expected_length: expectedBuffer.length
        });
        return false;
      }

      const isValid = crypto.timingSafeEqual(providedBuffer, expectedBuffer);

      if (!isValid) {
        logger.error('Signature verification failed - hash mismatch', {
          expectedHash: expectedHash.substring(0, 32),
          providedHash: providedHash.substring(0, 32),
          timestamp,
          payload_first_100: payload.substring(0, 100)
        });
        return false;
      }

      // Check timestamp to prevent replay attacks (5-minute tolerance)
      const now = Math.floor(Date.now() / 1000);
      const webhookTimestamp = parseInt(timestamp, 10);
      const timeDifference = Math.abs(now - webhookTimestamp);

      logger.info('🔍 Timestamp validation', { 
        now, 
        webhookTimestamp, 
        timeDifference,
        max_allowed: 300
      });

      if (timeDifference > 300) { // 5 minutes
        logger.error(`Webhook timestamp too old: ${timeDifference} seconds`, {
          now,
          webhookTimestamp,
          timeDifference,
          max_allowed_seconds: 300
        });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error during signature verification:', error);
      return false;
    }
  }

  /**
   * Validate webhook payload structure
   */
  private validatePayload(payload: ElevenLabsWebhookPayload): void {
    const requiredFields = ['conversation_id', 'agent_id', 'status', 'transcript', 'metadata'];
    
    for (const field of requiredFields) {
      if (!payload[field as keyof ElevenLabsWebhookPayload]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate transcript structure
    if (!payload.transcript || !Array.isArray(payload.transcript)) {
      throw new Error('Invalid transcript structure: transcript must be an array');
    }

    // Validate metadata structure
    if (!payload.metadata.call_duration_secs || !payload.metadata.start_time_unix_secs) {
      throw new Error('Invalid metadata structure: missing duration or start time');
    }
  }

  /**
   * Extract analysis value from payload (supports both new nested and legacy format)
   */
  private getAnalysisValue(payload: any): string | null {
    // Try ElevenLabs nested format first (payload.data.analysis.data_collection_results.default.value)
    if (payload.data?.analysis?.data_collection_results?.default?.value) {
      logger.debug('✅ Found analysis data in nested format (payload.data.analysis)');
      return payload.data.analysis.data_collection_results.default.value;
    }
    
    // Try direct format (payload.analysis.data_collection_results.default.value)
    if (payload.analysis?.data_collection_results?.default?.value) {
      logger.debug('✅ Found analysis data in direct format (payload.analysis)');
      return payload.analysis.data_collection_results.default.value;
    }
    
    // Fall back to legacy format (analysis.value)
    if (payload.analysis?.value) {
      logger.debug('✅ Found analysis data in legacy format (payload.analysis.value)');
      return payload.analysis.value;
    }
    
    logger.warn('❌ No analysis data found in any supported format', {
      has_data: !!payload.data,
      has_data_analysis: !!payload.data?.analysis,
      has_direct_analysis: !!payload.analysis,
      payload_keys: Object.keys(payload || {})
    });
    
    return null;
  }

  /**
   * Convert an unquoted Python dict-like string into a JSON object.
   * Robust single-pass state machine:
   * - Quotes unquoted keys
   * - Quotes bare string values (including spaces/commas) until the delimiter comma that precedes the next key, or until the closing '}'
   * - Preserves numbers/booleans/null
   * - Handles nested objects
   */
  private convertUnquotedPythonDict(analysisValue: string): ParsedAnalysisData {
    // 0) Normalize Python literals first
    let s = analysisValue
      .replace(/\bNone\b/g, 'null')
      .replace(/\bTrue\b/g, 'true')
      .replace(/\bFalse\b/g, 'false');

    // 1) Ensure keys are quoted: {key: ...} or , key: ... -> quote key
    s = s.replace(/([\{,]\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*:)/g, '$1"$2"$3');

    // 2) Walk and quote bare values
    const out: string[] = [];
    let i = 0;
    const n = s.length;
    let depth = 0;
    let inString = false;
    let strQuote = '';

    const isDigit = (ch: string) => /[0-9\-]/.test(ch);
    const isSpace = (ch: string) => ch === ' ' || ch === '\n' || ch === '\r' || ch === '\t';

    const peekNonSpace = (idx: number) => {
      while (idx < n && isSpace(s[idx])) idx++;
      return { ch: s[idx] || '', idx };
    };

    const isJsonLiteralStart = (ch: string) => {
      // object/array/number/boolean/null or already quoted
      return ch === '{' || ch === '[' || ch === '"' || ch === '\'' || isDigit(ch) || ch === 't' || ch === 'f' || ch === 'n';
    };

    const isKeyLookahead = (idx: number) => {
      // After a comma, if next non-space is a quoted key followed by ':' we consider it a delimiter
      const p = peekNonSpace(idx);
      if (p.ch === '"') {
        // find closing quote
        let j = p.idx + 1;
        while (j < n) {
          if (s[j] === '"' && s[j - 1] !== '\\') break;
          j++;
        }
        const q = peekNonSpace(j + 1);
        return q.ch === ':'; // ":key": :
      }
      return false;
    };

    const needsQuoting = (startIdx: number) => {
      const p = peekNonSpace(startIdx);
      return !isJsonLiteralStart(p.ch);
    };

    const escapeString = (val: string) => val.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

    while (i < n) {
      const ch = s[i];

      if (inString) {
        out.push(ch);
        if (ch === strQuote && s[i - 1] !== '\\') {
          inString = false;
          strQuote = '';
        }
        i++;
        continue;
      }

      if (ch === '"' || ch === '\'') {
        inString = true;
        strQuote = ch;
        out.push(ch);
        i++;
        continue;
      }

      if (ch === '{') {
        depth++;
        out.push(ch);
        i++;
        continue;
      }
      if (ch === '}') {
        depth = Math.max(0, depth - 1);
        out.push(ch);
        i++;
        continue;
      }

      // Detect start of value: a colon that is not inside a string
      if (ch === ':') {
        out.push(ch);
        i++;
        // skip spaces
        let j = i;
        while (j < n && isSpace(s[j])) { out.push(s[j]); j++; }
        // j is first non-space of the value
        // Always scan the value span, even if it starts with a digit.
        // This allows us to detect ISO datetimes like 2025-09-18T... and quote them,
        // while keeping pure numbers unquoted.

        // Handle nested object/array values by recursively sanitizing that segment
        if (s[j] === '{' || s[j] === '[') {
          const startCh = s[j];
          const endCh = startCh === '{' ? '}' : ']';
          let m = j;
          let balance = 0;
          while (m < n) {
            if (s[m] === startCh) balance++;
            else if (s[m] === endCh) {
              balance--;
              if (balance === 0) { m++; break; }
            }
            m++;
          }
          const segment = s.slice(j, m);
          try {
            // Recursively sanitize nested unquoted dict/array
            const nestedObj = this.convertUnquotedPythonDict(segment) as any;
            out.push(JSON.stringify(nestedObj));
            i = m;
            continue;
          } catch (e) {
            // If recursion fails, fall back to raw segment to avoid infinite loops
            out.push(segment);
            i = m;
            continue;
          }
        }

        // Scan until either a closing '}' at same depth OR a comma whose lookahead is a key
        const valueStartOutIdx = out.length; // position after spaces
        // We'll accumulate raw value separately to trim and escape
        let k = j;
        let localDepth = 0; // for nested braces inside value (rare if unquoted, but safe)
        while (k < n) {
          const c = s[k];
          if (c === '"' || c === '\'') {
            // shouldn't appear in unquoted value, but if it does, stop and let JSON parse fail later
            break;
          }
          if (c === '{') { localDepth++; }
          if (c === '}') {
            if (localDepth === 0) {
              // end of object -> end of value just before this
              break;
            }
            localDepth--;
          }
          if (c === ',' && localDepth === 0) {
            // Check if this comma precedes a key (comma + spaces + "key":)
            if (isKeyLookahead(k + 1)) {
              break;
            }
            // otherwise it's part of sentence; include it
          }
          k++;
        }
        const rawVal = s.slice(j, k).replace(/\s+$/g, '');
        const lower = rawVal.trim().toLowerCase();
        const numeric = /^-?\d+(?:\.\d+)?$/.test(rawVal.trim());
        const isLiteral = lower === 'true' || lower === 'false' || lower === 'null';

        if (numeric || isLiteral) {
          // Write raw
          out.push(rawVal);
        } else {
          // Quote
          out.push('"' + escapeString(rawVal) + '"');
        }
        // advance i to k (do not consume comma/} here; main loop will output it)
        i = k;
        continue;
      }

      // default: copy
      out.push(ch);
      i++;
    }

    const sanitized = out.join('');
    return JSON.parse(sanitized);
  }

  /**
   * Parse analysis data - HANDLES BOTH FORMATS (quoted and unquoted)
   * Based on run-parser.js but enhanced to handle format variations
   */
  private parseAnalysisData(analysisValue: string): ParsedAnalysisData | null {
    try {
      logger.info('🔧 Parsing analysis data (enhanced method)', {
        original_length: analysisValue.length,
        original_preview: analysisValue.substring(0, 100),
        has_single_quotes: analysisValue.includes("'"),
        has_double_quotes: analysisValue.includes('"'),
        first_char: analysisValue.charAt(0),
        is_unquoted_format: analysisValue.includes('intent_level:') && !analysisValue.includes("'intent_level'")
      });

      // Method 1: Try direct JSON parse first (in case it's already valid JSON)
      try {
        logger.info('🔧 Attempting Method 1: Direct JSON parse');
        const directResult = JSON.parse(analysisValue);
        logger.info('✅ Method 1: Direct JSON parse successful');
        return directResult as ParsedAnalysisData;
      } catch (directError) {
        logger.info('❌ Method 1: Direct JSON parse failed, trying quote replacement', {
          error: directError instanceof Error ? directError.message : String(directError)
        });
      }

      // Method 2: Run-parser.js method - Replace single quotes with double quotes
      try {
        logger.info('🔧 Attempting Method 2: Quoted format parsing (run-parser.js method)');
        const valueStr = analysisValue.replace(/'/g, '"');
        const quotedResult = JSON.parse(valueStr);
        logger.info('✅ Method 2: Quoted format parsing successful (run-parser.js method)', {
          total_score: quotedResult.total_score,
          lead_status: quotedResult.lead_status_tag
        });
        return quotedResult as ParsedAnalysisData;
      } catch (quotedError) {
        logger.info('❌ Method 2: Quoted format parsing failed, trying unquoted format', {
          error: quotedError instanceof Error ? quotedError.message : String(quotedError)
        });
      }

      // Method 3: Handle unquoted format {key: value}
      try {
        logger.info('🔧 Attempting Method 3: Unquoted format parsing with transformation');
        const unquotedResult = this.convertUnquotedPythonDict(analysisValue);
        logger.info('✅ Method 3: Unquoted format parsing successful', {
          total_score: unquotedResult.total_score,
          lead_status: unquotedResult.lead_status_tag
        });
        return unquotedResult as ParsedAnalysisData;
      } catch (unquotedError) {
        logger.error('❌ Method 3: Unquoted format transformation failed', {
          error: unquotedError instanceof Error ? unquotedError.message : String(unquotedError)
        });
      }

      // FINAL FALLBACK: Preserve raw data
      logger.warn('⚠️  All parsing methods failed - using raw data fallback');
      const fallbackResult = {
        raw_analysis_data: analysisValue,
        parsing_note: 'All parsing methods failed - preserved raw data',
        intent_level: 'Unknown',
        intent_score: 0,
        urgency_level: 'Unknown',
        urgency_score: 0,
        budget_constraint: 'Unknown',
        budget_score: 0,
        fit_alignment: 'Unknown',
        fit_score: 0,
        engagement_health: 'Unknown',
        engagement_score: 0,
        cta_pricing_clicked: 'No',
        cta_demo_clicked: 'No',
        cta_followup_clicked: 'No',
        cta_sample_clicked: 'No',
        cta_website_clicked: 'No',
        cta_escalated_to_human: 'No',
        total_score: 0,
        lead_status_tag: 'Raw',
        demo_book_datetime: undefined,
        reasoning: {
          intent: 'Raw data preserved',
          urgency: 'Raw',
          budget: 'Raw',
          fit: 'Raw',
          engagement: 'Raw',
          cta_behavior: 'Raw'
        },
        extraction: {
          name: 'Unknown',
          email_address: 'unknown@example.com',
          company_name: 'Unknown',
          smartnotification: 'Raw data fallback'
        }
      } as ParsedAnalysisData;
      return fallbackResult;

    } catch (error) {
      logger.error('❌ All parsing attempts failed', {
        error: error instanceof Error ? error.message : String(error),
        analysis_value_preview: analysisValue.substring(0, 200),
        analysis_value_length: analysisValue.length
      });
      
      // If parsing fails, keep the original string (as in run-parser.js)
      return { raw_value: analysisValue } as any;
    }
  }


  /**
   * Format duration for display (converts seconds to "X min Y sec" format)
   */
  private formatDurationForDisplay(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes === 0) {
      return `${remainingSeconds} sec`;
    } else if (remainingSeconds === 0) {
      return `${minutes} min`;
    } else {
      return `${minutes} min ${remainingSeconds} sec`;
    }
  }

  /**
   * Calculate billing duration (rounds up to next minute)
   */
  private calculateBillingMinutes(seconds: number): number {
    return Math.ceil(seconds / 60);
  }

  /**
   * Main webhook processing method
   */
  async processCallCompletedWebhook(payload: ElevenLabsWebhookPayload): Promise<void> {
    const processingStartTime = Date.now();
    const processingId = `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Step 1: Validate payload structure
      this.validatePayload(payload);
      
      logger.info('🚀 Starting webhook processing', {
        processing_id: processingId,
        conversation_id: payload.conversation_id,
        agent_id: payload.agent_id,
        status: payload.status,
        call_duration_secs: payload.metadata.call_duration_secs,
        caller_number: payload.metadata.phone_call?.external_number,
        agent_number: payload.metadata.phone_call?.agent_number,
        payload_size: JSON.stringify(payload).length
      });

      // Step 2: Agent lookup and validation
      const agent = await Agent.findByElevenLabsId(payload.agent_id);
      if (!agent) {
        throw new Error(`Agent not found for ElevenLabs agent ID: ${payload.agent_id}`);
      }

      logger.debug('✅ Agent lookup successful', {
        processing_id: processingId,
        agent_id: agent.id,
        user_id: agent.user_id,
        agent_name: agent.name
      });

      // Step 3: Calculate durations
      const durationSeconds = payload.metadata.call_duration_secs;
      const durationMinutes = this.calculateBillingMinutes(durationSeconds);
      const displayDuration = this.formatDurationForDisplay(durationSeconds);

      logger.debug('📊 Duration calculations', {
        processing_id: processingId,
        duration_seconds: durationSeconds,
        billing_minutes: durationMinutes,
        display_format: displayDuration
      });

      // Step 4: Call record management  
      let call = await Call.findByConversationId(payload.conversation_id);
      
      // Extract phone numbers from the correct metadata fields
      const callerPhoneNumber = payload.metadata.phone_call?.external_number || 
                               payload.metadata.phone_call?.agent_number || 
                               'unknown';

      // Extract caller information from analysis data
      const analysisValue = this.getAnalysisValue(payload);
      
      logger.debug('🔍 Analysis data extraction', {
        processing_id: processingId,
        has_analysis: !!payload.analysis,
        has_legacy_value: !!payload.analysis?.value,
        has_new_format: !!payload.analysis?.data_collection_results?.default?.value,
        extracted_value: analysisValue,
        analysis_value_length: analysisValue?.length || 0,
        analysis_value_preview: analysisValue?.substring(0, 200)
      });
      
      const parsedAnalysis = analysisValue ? this.parseAnalysisData(analysisValue) : null;
      
      logger.debug('🔍 Parsed analysis result', {
        processing_id: processingId,
        parsed_successfully: !!parsedAnalysis,
        has_extraction: !!parsedAnalysis?.extraction,
        extraction_name: parsedAnalysis?.extraction?.name,
        extraction_email: parsedAnalysis?.extraction?.email_address
      });
      
      const callerName = parsedAnalysis?.extraction?.name || undefined;
      const callerEmail = parsedAnalysis?.extraction?.email_address || undefined;
      const creditsUsed = Math.ceil(durationMinutes); // Round up for billing
      
      logger.debug('🔍 Final extracted values', {
        processing_id: processingId,
        callerName,
        callerEmail,
        creditsUsed
      });
      
      if (!call) {
        // Create new call record with both duration formats and caller information
        call = await Call.createCall({
          agent_id: agent.id,
          user_id: agent.user_id,
          elevenlabs_conversation_id: payload.conversation_id,
          phone_number: callerPhoneNumber,
          caller_name: callerName,
          caller_email: callerEmail,
          call_source: 'phone',
          duration_seconds: durationSeconds,
          duration_minutes: durationMinutes,
          credits_used: creditsUsed,
          status: payload.status === 'done' ? 'completed' : (payload.status === 'error' ? 'failed' : 'failed'),
          metadata: {
            ...payload.metadata,
            processed_at: new Date().toISOString(),
            processing_id: processingId,
            display_duration: displayDuration,
            credits_used: creditsUsed
          }
        });

        logger.debug('🔧 Created call with all fields', {
          processing_id: processingId,
          call_id: call.id,
          credits_used: call.credits_used,
          caller_name: call.caller_name,
          caller_email: call.caller_email
        });

        logger.info('✅ Created new call record', {
          processing_id: processingId,
          call_id: call.id,
          duration_seconds: durationSeconds,
          duration_minutes: durationMinutes,
          display_duration: displayDuration,
          caller_name: callerName,
          caller_email: callerEmail,
          credits_used: creditsUsed,
          phone_number: callerPhoneNumber
        });
      } else {
        // Update existing call with completion data and caller information
        const status = payload.status === 'done' ? 'completed' : (payload.status === 'error' ? 'failed' : 'failed');
        const updatedCall = status === 'completed' || status === 'failed'
          ? await Call.completeCall(call.id, {
              duration_minutes: durationMinutes,
              status,
              metadata: {
                ...call.metadata,
                ...payload.metadata,
                processed_at: new Date().toISOString(),
                processing_id: processingId,
                display_duration: displayDuration,
                credits_used: creditsUsed
              }
            })
          : await Call.update(call.id, {
              duration_seconds: durationSeconds,
              duration_minutes: durationMinutes,
              caller_name: callerName,
              caller_email: callerEmail,
              credits_used: creditsUsed,
              status,
              metadata: {
                ...call.metadata,
                ...payload.metadata,
                processed_at: new Date().toISOString(),
                processing_id: processingId,
                display_duration: displayDuration,
                credits_used: creditsUsed
              }
            });

        logger.debug('🔧 Existing call update result', {
          processing_id: processingId,
          call_id: call.id,
          updated_credits_used: updatedCall?.credits_used,
          updated_caller_name: updatedCall?.caller_name,
          updated_caller_email: updatedCall?.caller_email
        });

        logger.info('✅ Updated existing call record', {
          processing_id: processingId,
          call_id: call.id,
          duration_seconds: durationSeconds,
          duration_minutes: durationMinutes,
          caller_name: callerName,
          caller_email: callerEmail,
          credits_used: creditsUsed,
          phone_number: callerPhoneNumber
        });
      }

      // Step 5: Process transcript
      if (payload.transcript && Array.isArray(payload.transcript)) {
        try {
          await this.processTranscript(call.id, payload.transcript, processingId);
          logger.debug('✅ Transcript processing completed', {
            processing_id: processingId,
            call_id: call.id,
            segment_count: payload.transcript.length
          });
        } catch (transcriptError) {
          logger.error('❌ Transcript processing failed', {
            processing_id: processingId,
            call_id: call.id,
            error: transcriptError instanceof Error ? transcriptError.message : String(transcriptError)
          });
          // Don't throw - continue with other processing
        }
      }

      // Step 6: Process enhanced analytics from analysis data
      const enhancedAnalysisValue = this.getAnalysisValue(payload);
      logger.info('🔍 Analysis value extraction result', {
        processing_id: processingId,
        has_analysis_value: !!enhancedAnalysisValue,
        analysis_value_length: enhancedAnalysisValue?.length || 0,
        analysis_value_preview: enhancedAnalysisValue?.substring(0, 100) || 'N/A'
      });
      
      if (enhancedAnalysisValue) {
        try {
          logger.info('🚀 Starting analysis data parsing...', {
            processing_id: processingId,
            input_format: enhancedAnalysisValue.startsWith('{') && enhancedAnalysisValue.includes('intent_level') ? 'unquoted_python_dict' : 'unknown'
          });
          
          const parsedAnalysis = this.parseAnalysisData(enhancedAnalysisValue);
          
          logger.info('🎯 Analysis parsing result', {
            processing_id: processingId,
            parsing_successful: !!parsedAnalysis,
            parsed_total_score: parsedAnalysis?.total_score || 'N/A',
            parsed_lead_status: parsedAnalysis?.lead_status_tag || 'N/A'
          });
          
          if (parsedAnalysis) {
            const analyticsResult = await this.analyticsService.processEnhancedLeadAnalyticsFromWebhook(
              call.id,
              agent.user_id,
              { value: parsedAnalysis }
            );

            logger.info('✅ Enhanced analytics processed successfully', {
              processing_id: processingId,
              call_id: call.id,
              analytics_id: analyticsResult?.id,
              total_score: parsedAnalysis.total_score,
              lead_status: parsedAnalysis.lead_status_tag,
              has_smart_notification: !!parsedAnalysis.extraction?.smartnotification,
              has_demo_booking: !!parsedAnalysis.demo_book_datetime
            });

            // Step 7: Enhanced lead data extraction and contact auto-creation
            if (parsedAnalysis.extraction) {
              const enhancedLeadData = {
                companyName: parsedAnalysis.extraction.company_name || null,
                extractedName: parsedAnalysis.extraction.name || null,
                extractedEmail: parsedAnalysis.extraction.email_address || null,
                ctaPricingClicked: parsedAnalysis.cta_pricing_clicked === 'Yes',
                ctaDemoClicked: parsedAnalysis.cta_demo_clicked === 'Yes',
                ctaFollowupClicked: parsedAnalysis.cta_followup_clicked === 'Yes',
                ctaSampleClicked: parsedAnalysis.cta_sample_clicked === 'Yes',
                ctaEscalatedToHuman: parsedAnalysis.cta_escalated_to_human === 'Yes',
                smartNotification: parsedAnalysis.extraction.smartnotification || null,
                demoBookDatetime: parsedAnalysis.demo_book_datetime || null
              };

              // Auto-create or update contact
              try {
              const contactResult = await ContactAutoCreationService.createOrUpdateContact(
                agent.user_id,
                enhancedLeadData,
                call.id,
                callerPhoneNumber
              );                if (contactResult.contactId) {
                  await ContactAutoCreationService.linkContactToCall(call.id, contactResult.contactId);
                  
                  logger.info('✅ Contact auto-creation completed', {
                    processing_id: processingId,
                    call_id: call.id,
                    contact_id: contactResult.contactId,
                    created: contactResult.created,
                    updated: contactResult.updated
                  });
                }
              } catch (contactError) {
                logger.warn('⚠️ Contact auto-creation failed', {
                  processing_id: processingId,
                  call_id: call.id,
                  error: contactError instanceof Error ? contactError.message : String(contactError)
                });
              }
            }
          }
        } catch (analyticsError) {
          logger.error('❌ Analytics processing failed', {
            processing_id: processingId,
            call_id: call.id,
            error: analyticsError instanceof Error ? analyticsError.message : String(analyticsError)
          });
          // Don't throw - continue with billing
        }
      }

      // Step 8: Billing and credit deduction (only for completed calls)
      if (payload.status === 'done' && durationMinutes > 0) {
        try {
          const description = `Call to ${callerPhoneNumber} - ${displayDuration}`;
          
          await BillingService.deductCredits(
            agent.user_id,
            durationMinutes, // Rounded up billing minutes
            description,
            call.id
          );

          logger.info('💰 Credits deducted successfully', {
            processing_id: processingId,
            user_id: agent.user_id,
            credits_deducted: durationMinutes,
            actual_duration: displayDuration,
            billing_logic: 'rounded_up_to_minutes'
          });
        } catch (billingError) {
          logger.error('❌ Credit deduction failed', {
            processing_id: processingId,
            call_id: call.id,
            user_id: agent.user_id,
            error: billingError instanceof Error ? billingError.message : String(billingError)
          });
          // Don't throw - billing failure shouldn't stop webhook processing
        }
      }

      // Final success logging
      const processingDuration = Date.now() - processingStartTime;
      logger.info('🎉 Webhook processing completed successfully', {
        processing_id: processingId,
        conversation_id: payload.conversation_id,
        call_id: call.id,
        processing_duration_ms: processingDuration,
        duration_seconds: durationSeconds,
        duration_minutes: durationMinutes,
        display_duration: displayDuration,
        credits_deducted: payload.status === 'done' ? durationMinutes : 0,
        has_transcript: !!payload.transcript?.length,
        has_analytics: !!payload.analysis?.value
      });

    } catch (error) {
      const processingDuration = Date.now() - processingStartTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      logger.error('❌ Webhook processing failed', {
        processing_id: processingId,
        conversation_id: payload.conversation_id || 'unknown',
        processing_duration_ms: processingDuration,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      throw error;
    }
  }

  /**
   * Process transcript data using TranscriptService
   */
  private async processTranscript(
    callId: string, 
    transcript: ElevenLabsWebhookPayload['transcript'],
    processingId: string
  ): Promise<void> {
    try {
      // Use directly imported TranscriptService
      
      // Create full text from transcript array (role-based format)
      const fullText = transcript
        .map(entry => `${entry.role}: ${entry.message}`)
        .join('\n');

      // Convert to segments format for TranscriptService
      const segments = transcript.map(entry => ({
        speaker: entry.role,
        text: entry.message,
        timestamp: entry.time_in_call_secs
      }));

      await TranscriptService.processTranscriptFromWebhook(callId, {
        full_text: fullText,
        segments: segments,
        language: undefined, // Not provided in this format
        summary: undefined   // Not provided in this format
      });

      logger.debug('Transcript processed successfully', {
        processing_id: processingId,
        call_id: callId,
        segment_count: transcript.length,
        full_text_length: fullText.length
      });
    } catch (error) {
      logger.error('Error processing transcript:', {
        processing_id: processingId,
        call_id: callId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}

export const webhookService = new WebhookService();
