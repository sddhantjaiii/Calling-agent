import express from 'express';
import { TwilioController } from '../controllers/twilioController';
import { requireAuth } from '../middleware/auth';

const router = express.Router();
const twilioController = new TwilioController();

// Test Twilio connection
router.get('/test-connection', requireAuth, (req, res) => 
  twilioController.testConnection(req, res)
);

// Manually trigger not connected calls processing
router.post('/process-not-connected-calls', requireAuth, (req, res) => 
  twilioController.processNotConnectedCalls(req, res)
);

// Get processing statistics
router.get('/stats', requireAuth, (req, res) => 
  twilioController.getStats(req, res)
);

// Get contacts with not connected calls
router.get('/contacts-with-not-connected-calls', requireAuth, (req, res) => 
  twilioController.getContactsWithNotConnectedCalls(req, res)
);

export default router;