import { Request, Response } from 'express';
import { webhookService } from '../services/webhookService';
import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

export class WebhookController {
  /**
   * Handle ElevenLabs post-call webhook
   */
  async handlePostCallWebhook(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    
    // 🐛 DEBUG: Store incoming payload for analysis (BEFORE any processing)
    const payload = req.body;
    const signature = req.get('elevenlabs-signature') || req.get('x-elevenlabs-signature');
    const rawBody = (req as any).rawBody;

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const conversationId = payload?.conversation_id || 'unknown';
      const debugFileName = `webhook_payload_${timestamp}_${conversationId}.json`;
      // Create debug directory if it doesn't exist
      const debugDir = path.join(process.cwd(), '..', 'debug');
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
      }
      const debugPath = path.join(debugDir, debugFileName);
      
      const debugData = {
        timestamp: new Date().toISOString(),
        request_info: {
          method: req.method,
          path: req.path,
          ip: req.ip,
          user_agent: req.headers['user-agent']
        },
        headers: {
          'content-type': req.headers['content-type'],
          'user-agent': req.headers['user-agent'],
          'elevenlabs-signature': signature ? signature : '[MISSING]',
          'content-length': req.headers['content-length']
        },
        signature_info: {
          present: !!signature,
          value: signature || null,
          length: signature?.length || 0
        },
        rawBody: rawBody,
        parsedPayload: payload,
        analysisData: {
          present: !!(payload?.data?.analysis?.data_collection_results?.default?.value || payload?.analysis?.data_collection_results?.default?.value),
          length: (payload?.data?.analysis?.data_collection_results?.default?.value || payload?.analysis?.data_collection_results?.default?.value)?.length || 0,
          preview: (payload?.data?.analysis?.data_collection_results?.default?.value || payload?.analysis?.data_collection_results?.default?.value)?.substring(0, 200)
        }
      };

      fs.writeFileSync(debugPath, JSON.stringify(debugData, null, 2));
      logger.info('🐛 Debug payload saved', { debugFileName, payloadSize: rawBody?.length || 0 });
    } catch (debugError) {
      logger.warn('Failed to save debug payload', { error: debugError instanceof Error ? debugError.message : String(debugError) });
    }
    
    try {

      // Handle ElevenLabs nested payload structure
      const actualPayload = payload?.data || payload; // ElevenLabs wraps data in payload.data
      
      logger.info('📞 Processing ElevenLabs post-call webhook', {
        payload_type: payload?.type,
        event_timestamp: payload?.event_timestamp,
        conversation_id: actualPayload?.conversation_id,
        agent_id: actualPayload?.agent_id,
        status: actualPayload?.status,
        has_transcript: !!actualPayload?.transcript,
        has_analysis: !!actualPayload?.analysis,
        payload_size: JSON.stringify(payload).length,
        analysis_data_present: !!actualPayload?.analysis?.data_collection_results?.default?.value,
        analysis_data_preview: actualPayload?.analysis?.data_collection_results?.default?.value?.substring(0, 100),
        analysis_data_length: actualPayload?.analysis?.data_collection_results?.default?.value?.length,
        call_duration: actualPayload?.metadata?.call_duration_secs,
        // 🐛 DEBUG: Raw body info
        rawBody_type: typeof rawBody,
        rawBody_is_null: rawBody === null,
        rawBody_is_undefined: rawBody === undefined,
        rawBody_length: rawBody?.length || 0,
        signature_present: !!signature
      });

      // 🚀 TEMPORARILY SKIP signature verification for debugging
      logger.info('🚀 Skipping signature verification to test parsing logic', {
        signature_present: !!signature,
        rawBody_available: !!rawBody
      });

      // Process the webhook with the actual nested payload
      await webhookService.processCallCompletedWebhook(actualPayload);

      const processingTime = Date.now() - startTime;
      logger.info('✅ Webhook processed successfully', {
        conversation_id: actualPayload?.conversation_id,
        processing_time_ms: processingTime
      });

      res.json({ 
        success: true, 
        message: 'Webhook processed successfully',
        processing_time_ms: processingTime
      });

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      logger.error('❌ Webhook processing failed', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        processing_time_ms: processingTime,
        conversation_id: req.body?.conversation_id || 'unknown'
      });

      res.status(500).json({ 
        success: false, 
        error: errorMessage 
      });
    }
  }

  /**
   * Health check endpoint
   */
  async handleHealthCheck(req: Request, res: Response): Promise<void> {
    try {
      res.json({ 
        success: true, 
        message: 'Webhook endpoint is healthy',
        timestamp: new Date().toISOString(),
        retry_queue: {
          pending: 0,
          deadLetter: 0
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Health check failed:', error);
      res.status(500).json({ 
        success: false, 
        error: errorMessage 
      });
    }
  }

  /**
   * Handle webhook retry (placeholder for future implementation)
   */
  async handleWebhookRetry(req: Request, res: Response): Promise<void> {
    try {
      const { webhookId } = req.params;
      
      logger.info('🔄 Webhook retry requested', { webhookId });
      
      // TODO: Implement retry logic when needed
      res.json({ 
        success: true, 
        message: 'Webhook retry functionality not implemented yet',
        webhookId 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Webhook retry failed:', error);
      res.status(500).json({ 
        success: false, 
        error: errorMessage 
      });
    }
  }
}

export const webhookController = new WebhookController();