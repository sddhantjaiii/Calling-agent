import { Router } from 'express';
import { webhookController } from '../controllers/webhookController';
import { 
  captureRawBody, 
  validateWebhookHeaders, 
  logWebhookRequest, 
  webhookRateLimit 
} from '../middleware/webhook';

const router = Router();

// Apply webhook-specific middleware
router.use(logWebhookRequest);
router.use(webhookRateLimit);

// Main ElevenLabs webhook endpoint - handles the final format only
router.post('/elevenlabs/post-call', 
  validateWebhookHeaders,
  captureRawBody,
  webhookController.handlePostCallWebhook.bind(webhookController)
);

// Health check endpoint
router.get('/health', webhookController.handleHealthCheck.bind(webhookController));

// Webhook retry endpoint (placeholder)
router.post('/retry/:webhookId', webhookController.handleWebhookRetry.bind(webhookController));

export default router;