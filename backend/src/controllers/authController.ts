import { Request, Response } from 'express';
import { authService } from '../services/authService';
import { AuthenticatedRequest } from '../middleware/auth';
import { body, validationResult } from 'express-validator';

// Authentication controller - handles user registration, login, and session management
export class AuthController {
  /**
   * Register new user
   */
  static async register(req: Request, res: Response): Promise<void> {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array(),
            timestamp: new Date(),
          },
        });
        return;
      }

      const { email, password, name } = req.body;

      // Register user
      const result = await authService.register(email, password, name);

      if (!result) {
        res.status(400).json({
          error: {
            code: 'REGISTRATION_FAILED',
            message: 'Failed to create user account',
            timestamp: new Date(),
          },
        });
        return;
      }

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          credits: result.user.credits,
          emailVerified: result.user.emailVerified,
          isActive: result.user.isActive,
          createdAt: result.user.createdAt,
        },
        token: result.token,
        refreshToken: result.refreshToken,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Registration error:', error);

      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          res.status(409).json({
            error: {
              code: 'USER_EXISTS',
              message: 'A user with this email already exists. Please try logging in instead.',
              timestamp: new Date(),
            },
          });
          return;
        }
      }

      res.status(500).json({
        error: {
          code: 'REGISTRATION_ERROR',
          message: error instanceof Error ? error.message : 'Registration failed',
          timestamp: new Date(),
        },
      });
    }
  }

  /**
   * Login user
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array(),
            timestamp: new Date(),
          },
        });
        return;
      }

      const { email, password } = req.body;
      const ipAddress = req.ip || req.socket.remoteAddress;

      // Login user
      const result = await authService.login(email, password, ipAddress);

      if (!result) {
        res.status(401).json({
          error: {
            code: 'LOGIN_FAILED',
            message: 'Invalid email or password',
            timestamp: new Date(),
          },
        });
        return;
      }

      res.json({
        message: 'Login successful',
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          credits: result.user.credits,
          emailVerified: result.user.emailVerified,
          isActive: result.user.isActive,
          role: result.user.role,
        },
        token: result.token,
        refreshToken: result.refreshToken,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Login error:', error);

      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message.includes('Invalid email or password')) {
          res.status(401).json({
            error: {
              code: 'INVALID_CREDENTIALS',
              message: 'Invalid email or password',
              timestamp: new Date(),
            },
          });
          return;
        }

        if (error.message.includes('locked')) {
          res.status(423).json({
            error: {
              code: 'ACCOUNT_LOCKED',
              message: 'Account is temporarily locked due to too many failed attempts',
              timestamp: new Date(),
            },
          });
          return;
        }
      }

      res.status(500).json({
        error: {
          code: 'LOGIN_ERROR',
          message: error instanceof Error ? error.message : 'Login failed',
          timestamp: new Date(),
        },
      });
    }
  }

  /**
   * Validate token and return user information
   */
  static async validateToken(req: Request, res: Response): Promise<void> {
    try {
      const token = authService.extractTokenFromHeader(req.headers.authorization);

      if (!token) {
        res.status(401).json({
          error: {
            code: 'MISSING_TOKEN',
            message: 'Authorization token is required',
            timestamp: new Date(),
          },
        });
        return;
      }

      // Validate session
      const user = await authService.validateSession(token);

      if (!user) {
        res.status(401).json({
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired token',
            timestamp: new Date(),
          },
        });
        return;
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          credits: user.credits,
          emailVerified: user.emailVerified,
          isActive: user.isActive,
          role: user.role,
          createdAt: user.createdAt,
        },
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Token validation error:', error);
      res.status(500).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Failed to validate token',
          timestamp: new Date(),
        },
      });
    }
  }

  /**
   * Get user profile information
   * Requires authentication middleware
   */
  static async profile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
            timestamp: new Date(),
          },
        });
        return;
      }

      res.json({
        user: {
          id: (req.user as any).id,
          email: (req.user as any).email,
          name: (req.user as any).name,
          credits: (req.user as any).credits,
          emailVerified: (req.user as any).emailVerified,
          isActive: (req.user as any).isActive,
          role: (req.user as any).role,
          authProvider: (req.user as any).authProvider,
          createdAt: (req.user as any).createdAt,
          updatedAt: (req.user as any).updatedAt,
        },
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Profile fetch error:', error);
      res.status(500).json({
        error: {
          code: 'PROFILE_ERROR',
          message: 'Failed to fetch user profile',
          timestamp: new Date(),
        },
      });
    }
  }

  /**
   * Logout user
   */
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const token = authService.extractTokenFromHeader(req.headers.authorization);

      // Always respond with success, even if token is invalid or logout fails
      // This prevents information leakage about token validity
      res.json({
        message: 'Logged out successfully',
        timestamp: new Date(),
      });

      // Perform logout operation after sending response to avoid double response issues
      if (token) {
        try {
          await authService.logout(token);
        } catch (logoutError) {
          // Log the error but don't throw it since response is already sent
          console.error('Session cleanup error during logout:', logoutError);
        }
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Only send error response if headers haven't been sent yet
      if (!res.headersSent) {
        res.status(500).json({
          error: {
            code: 'LOGOUT_ERROR',
            message: 'Failed to logout',
            timestamp: new Date(),
          },
        });
      }
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array(),
            timestamp: new Date(),
          },
        });
        return;
      }

      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          error: {
            code: 'MISSING_REFRESH_TOKEN',
            message: 'Refresh token is required',
            timestamp: new Date(),
          },
        });
        return;
      }

      // Refresh token
      const result = await authService.refreshToken(refreshToken);

      if (!result) {
        res.status(401).json({
          error: {
            code: 'INVALID_REFRESH_TOKEN',
            message: 'Invalid or expired refresh token',
            timestamp: new Date(),
          },
        });
        return;
      }

      res.json({
        message: 'Token refreshed successfully',
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          credits: result.user.credits,
          emailVerified: result.user.emailVerified,
          isActive: result.user.isActive,
          role: result.user.role,
        },
        token: result.token,
        refreshToken: result.refreshToken,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(500).json({
        error: {
          code: 'REFRESH_ERROR',
          message: error instanceof Error ? error.message : 'Token refresh failed',
          timestamp: new Date(),
        },
      });
    }
  }

  /**
   * Get session information
   */
  static async session(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'NO_SESSION',
            message: 'No active session',
            timestamp: new Date(),
          },
        });
        return;
      }

      res.json({
        session: {
          userId: (req.user as any).id,
          email: (req.user as any).email,
          name: (req.user as any).name,
          isActive: (req.user as any).isActive,
          emailVerified: (req.user as any).emailVerified,
        },
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Session fetch error:', error);
      res.status(500).json({
        error: {
          code: 'SESSION_ERROR',
          message: 'Failed to fetch session',
          timestamp: new Date(),
        },
      });
    }
  }

  /**
   * Google OAuth callback handler
   */
  static async googleCallback(req: Request, res: Response): Promise<void> {
    try {
  const { code } = req.query;
      
      if (!code) {
        const frontendUrls = process.env.FRONTEND_URL?.split(',');
        const base = (frontendUrls && frontendUrls[0]) ? frontendUrls[0].trim() : '';
        const frontendUrl = base.endsWith('/') ? base.slice(0, -1) : base;
        res.redirect(`${frontendUrl}/?error=oauth_no_code`);
        return;
      }

      // Exchange code for access token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          code: code as string,
          grant_type: 'authorization_code',
          redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
        }),
      });

      const tokenData = await tokenResponse.json() as any;
      
      if (!tokenData.access_token) {
        const frontendUrls = process.env.FRONTEND_URL?.split(',');
        const base = (frontendUrls && frontendUrls[0]) ? frontendUrls[0].trim() : '';
        const frontendUrl = base.endsWith('/') ? base.slice(0, -1) : base;
        res.redirect(`${frontendUrl}/?error=oauth_token_failed`);
        return;
      }

      // Get user profile from Google
      const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      const profileData = await profileResponse.json() as any;
      
      if (!profileData.email) {
        const frontendUrls = process.env.FRONTEND_URL?.split(',');
        const base = (frontendUrls && frontendUrls[0]) ? frontendUrls[0].trim() : '';
        const frontendUrl = base.endsWith('/') ? base.slice(0, -1) : base;
        res.redirect(`${frontendUrl}/?error=oauth_no_email`);
        return;
      }

      // Create Google profile object
      const googleProfile = {
        googleId: profileData.id,
        email: profileData.email,
        name: profileData.name,
        profilePicture: profileData.picture,
        firstName: profileData.given_name,
        lastName: profileData.family_name
      };

      // Find or create user
      const result = await authService.findOrCreateGoogleUser(googleProfile);
      
      if (!result) {
      const frontendUrls = process.env.FRONTEND_URL?.split(',');
      const base = (frontendUrls && frontendUrls[0]) ? frontendUrls[0].trim() : '';
      const frontendUrl = base.endsWith('/') ? base.slice(0, -1) : base;
        res.redirect(`${frontendUrl}/?error=oauth_user_creation_failed`);
        return;
      }

      const { user, isNewUser } = result;

      // Generate JWT tokens for the authenticated user
      const token = authService.generateToken(user);
      const refreshToken = authService.generateRefreshToken(user);

      // Create session
      const ipAddress = req.ip || req.socket.remoteAddress;
      await authService.createSession(user.id, token, ipAddress, req.get('User-Agent'), refreshToken);

      // Get the first frontend URL (for development, typically localhost:8080)
  const frontendUrls = process.env.FRONTEND_URL?.split(',');
  const frontendUrl = (frontendUrls && frontendUrls[0]) ? frontendUrls[0].trim() : '';

      // Redirect to frontend with tokens and user info
      const redirectUrl = new URL(`${frontendUrl}/oauth/callback`);
      redirectUrl.searchParams.set('token', token);
      redirectUrl.searchParams.set('refreshToken', refreshToken);
      redirectUrl.searchParams.set('userId', user.id);
      redirectUrl.searchParams.set('email', user.email);
      redirectUrl.searchParams.set('name', user.name);
      
      // Only show company modal for newly created Google users
      if (isNewUser) {
        redirectUrl.searchParams.set('needsCompany', 'true');
      }

      res.redirect(redirectUrl.toString());
    } catch (error) {
  console.error('Google OAuth callback error:', error);
  const frontendUrls = process.env.FRONTEND_URL?.split(',');
  const base = (frontendUrls && frontendUrls[0]) ? frontendUrls[0].trim() : '';
  const frontendUrl = base.endsWith('/') ? base.slice(0, -1) : base;
  res.redirect(`${frontendUrl}/?error=oauth_callback_failed`);
    }
  }
}

// Validation middleware for registration
export const validateRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
];

// Validation middleware for login
export const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

// Validation middleware for token refresh
export const validateRefreshToken = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required'),
];