import { Router } from 'express';
import { AuthController, validateRegistration, validateLogin, validateRefreshToken } from '../controllers/authController';
import { authenticateToken, optionalAuth } from '../middleware/auth';

const router = Router();

// Public authentication endpoints
router.post('/register', validateRegistration, AuthController.register);
router.post('/login', validateLogin, AuthController.login);
router.get('/validate', AuthController.validateToken);
router.post('/refresh', validateRefreshToken, AuthController.refreshToken);

// Protected endpoints (require authentication)
router.get('/profile', authenticateToken, AuthController.profile);
router.get('/session', authenticateToken, AuthController.session);
router.post('/logout', optionalAuth, AuthController.logout);

export default router;