import { Router } from 'express';
import { CallController } from '../controllers/callController';
import { authenticateToken, requireAuth } from '../middleware';

const router = Router();

// Apply authentication to all call routes
router.use(authenticateToken, requireAuth);

// Call management routes
router.get('/', CallController.getCalls);
router.get('/stats', CallController.getCallStats);
router.get('/recent', CallController.getRecentCalls);
router.get('/search', CallController.searchCalls);
router.get('/search/transcripts', CallController.searchTranscripts);
router.get('/:id', CallController.getCall);
router.get('/:id/transcript', CallController.getCallTranscript);
router.get('/:id/recording', CallController.getCallRecording);
router.get('/:id/audio', CallController.getCallAudio);

export default router;