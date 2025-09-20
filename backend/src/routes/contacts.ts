import { Router } from 'express';
import { ContactController } from '../controllers/contactController';
import { 
  authenticateToken, 
  requireAuth, 
  uploadMiddleware, 

  optionalApiKeyAuth,
  externalApiRateLimit
} from '../middleware';

const router = Router();

// Contact CRUD operations (authenticated routes)
router.get('/', authenticateToken, requireAuth, ContactController.getContacts);
router.post('/', authenticateToken, requireAuth, ContactController.createContact);
router.get('/stats', authenticateToken, requireAuth, ContactController.getContactStats);

// Bulk upload endpoints (must be before /:id route)
router.get('/template', ContactController.downloadTemplate);

// Test endpoint to verify backend connectivity
router.post('/test-upload', authenticateToken, requireAuth, (req, res) => {
  console.log('Test upload endpoint hit successfully');
  res.json({ 
    success: true, 
    message: 'Backend is reachable',
    headers: req.headers,
    hasBody: !!req.body,
    bodyKeys: Object.keys(req.body || {})
  });
});

router.post('/upload', 
  (req, res, next) => {
    console.log('📍 ROUTE: Upload route handler called');
    console.log('📍 ROUTE: Content-Type:', req.headers['content-type']);
    console.log('📍 ROUTE: Content-Length:', req.headers['content-length']);
    next();
  },
  authenticateToken, 
  requireAuth, 
  uploadMiddleware, 
  ContactController.uploadContacts
);

// Parameterized routes (must be after specific routes)
router.get('/:id', authenticateToken, requireAuth, ContactController.getContact);
router.put('/:id', authenticateToken, requireAuth, ContactController.updateContact);
router.delete('/:id', authenticateToken, requireAuth, ContactController.deleteContact);

// External lookup endpoints for ElevenLabs and other services
// These endpoints use optional API key authentication for security while maintaining accessibility
router.get('/lookup/:phone', externalApiRateLimit, optionalApiKeyAuth, ContactController.lookupContact);
router.post('/lookup/batch', externalApiRateLimit, optionalApiKeyAuth, ContactController.batchLookupContacts);

export default router;