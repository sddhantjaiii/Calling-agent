import { Router } from 'express';
import { TranscriptController } from '../controllers/transcriptController';
import { authenticateToken, requireAuth } from '../middleware';

const router = Router();

// Apply authentication to all transcript routes
router.use(authenticateToken, requireAuth);

// Transcript management routes
router.get('/search', TranscriptController.searchTranscripts);
router.get('/analytics', TranscriptController.getTranscriptAnalytics);
router.get('/call/:callId', TranscriptController.getTranscriptByCallId);
router.get('/call/:callId/export', TranscriptController.exportTranscript);
router.get('/call/:callId/formatted', TranscriptController.getFormattedTranscript);

export default router;