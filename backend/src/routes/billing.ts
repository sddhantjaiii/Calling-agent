import { Router, Request, Response } from 'express';
import { BillingController } from '../controllers/billingController';
import { authenticateToken, requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { body, query, validationResult } from 'express-validator';

const router = Router();

// Validation middleware
const validateRequest = (req: Request, res: Response, next: any): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: errors.array()
      }
    });
    return;
  }
  next();
};

// Apply authentication middleware to all billing routes
router.use(authenticateToken, requireAuth);

/**
 * GET /api/billing/credits
 * Get user's current credit balance
 */
router.get('/credits', (req: Request, res: Response) => BillingController.getCredits(req as AuthenticatedRequest, res));

/**
 * GET /api/billing/stats
 * Get detailed credit statistics for user
 */
router.get('/stats', (req: Request, res: Response) => BillingController.getCreditStats(req as AuthenticatedRequest, res));

/**
 * GET /api/billing/history
 * Get user's billing history with pagination
 */
router.get('/history', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  validateRequest
], (req: Request, res: Response) => BillingController.getBillingHistory(req as AuthenticatedRequest, res));

/**
 * POST /api/billing/purchase
 * Purchase credits via Stripe
 */
router.post('/purchase', [
  body('amount').isInt({ min: 50 }).withMessage('Minimum credit purchase is 50 credits'),
  validateRequest
], (req: Request, res: Response) => BillingController.purchaseCredits(req as AuthenticatedRequest, res));

/**
 * POST /api/billing/confirm-payment
 * Confirm Stripe payment and add credits
 */
router.post('/confirm-payment', [
  body('paymentIntentId').isString().isLength({ min: 1 }).withMessage('Payment intent ID is required'),
  validateRequest
], (req: Request, res: Response) => BillingController.confirmPayment(req, res));

/**
 * GET /api/billing/pricing
 * Get pricing information
 */
router.get('/pricing', (req: Request, res: Response) => BillingController.getPricing(req, res));

/**
 * GET /api/billing/payment-history
 * Get user's Stripe payment history
 */
router.get('/payment-history', [
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  validateRequest
], (req: Request, res: Response) => BillingController.getPaymentHistory(req as AuthenticatedRequest, res));

/**
 * GET /api/billing/check
 * Check if user has enough credits
 */
router.get('/check', [
  query('requiredCredits').optional().isInt({ min: 1 }).withMessage('Required credits must be a positive integer'),
  validateRequest
], (req: Request, res: Response) => BillingController.checkCredits(req as AuthenticatedRequest, res));

/**
 * POST /api/billing/admin/adjust
 * Admin endpoint to adjust user credits
 * Note: This will require admin role validation when admin middleware is implemented
 */
router.post('/admin/adjust', [
  body('userId').isUUID().withMessage('Valid user ID is required'),
  body('amount').isInt().custom(value => value !== 0).withMessage('Amount must be a non-zero integer'),
  body('reason').isString().isLength({ min: 1, max: 500 }).withMessage('Reason is required and must be 1-500 characters'),
  validateRequest
], (req: Request, res: Response) => BillingController.adminAdjustCredits(req as AuthenticatedRequest, res));

/**
 * POST /api/billing/process-call
 * Internal endpoint for processing call credits (used by webhooks)
 * Note: This should be protected by webhook authentication when implemented
 */
router.post('/process-call', [
  body('userId').isUUID().withMessage('Valid user ID is required'),
  body('callId').isUUID().withMessage('Valid call ID is required'),
  body('durationSeconds').isInt({ min: 0 }).withMessage('Duration must be a non-negative integer'),
  body('phoneNumber').isString().isLength({ min: 1 }).withMessage('Phone number is required'),
  validateRequest
], (req: Request, res: Response) => BillingController.processCallCredits(req, res));

export default router;