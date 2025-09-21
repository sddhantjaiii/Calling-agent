import { Router } from 'express';
import { AuthController, validateRegistration, validateLogin, validateRefreshToken } from '../controllers/authController';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import { authService } from '../services/authService';

const router = Router();

// Public authentication endpoints
router.post('/register', validateRegistration, AuthController.register);
router.post('/login', validateLogin, AuthController.login);
router.get('/validate', AuthController.validateToken);
router.post('/refresh', validateRefreshToken, AuthController.refreshToken);

// Google OAuth routes - simplified without Passport sessions
router.get('/google', (req, res) => {
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(process.env.GOOGLE_REDIRECT_URI!)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent('profile email')}&` +
    `access_type=offline&` +
    `prompt=consent`;
  
  res.redirect(googleAuthUrl);
});

router.get('/google/callback', AuthController.googleCallback);

// Protected endpoints (require authentication)
router.get('/profile', authenticateToken, AuthController.profile);
router.get('/session', authenticateToken, AuthController.session);
router.post('/logout', optionalAuth, AuthController.logout);

export default router;