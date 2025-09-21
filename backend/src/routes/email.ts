import { Router } from 'express';
import EmailController from '../controllers/emailController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// Email verification routes
router.post('/send-verification', authenticateToken, EmailController.sendVerification);
router.post('/verify', EmailController.verifyEmail);

// Password reset routes
router.post('/send-password-reset', EmailController.sendPasswordReset);
router.post('/reset-password', EmailController.resetPassword);
router.post('/validate-reset-token', EmailController.validateResetToken);

// Admin routes
router.get('/test', requireAdmin, EmailController.testEmailConfig);
router.post('/admin/send-verification-reminders', requireAdmin, EmailController.sendVerificationReminders);

export default router;