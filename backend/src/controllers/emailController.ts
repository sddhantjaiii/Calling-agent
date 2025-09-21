import { Request, Response } from 'express';
import { emailService } from '../services/emailService';
import { verificationService } from '../services/verificationService';
import { userService } from '../services/userService';
import { authService } from '../services/authService';
import UserModel from '../models/User';

export class EmailController {
  /**
   * Send email verification
   * POST /api/email/send-verification
   */
  static async sendVerification(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
            timestamp: new Date(),
          },
        });
        return;
      }

      // Check if email service is configured
      if (!emailService.isEmailConfigured()) {
        res.status(503).json({
          error: {
            code: 'EMAIL_SERVICE_UNAVAILABLE',
            message: 'Email service is not configured',
            timestamp: new Date(),
          },
        });
        return;
      }

      const userProfile = await userService.getUserProfile(req.userId);
      if (!userProfile) {
        res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date(),
          },
        });
        return;
      }

      // Check if already verified
      if (userProfile.emailVerified) {
        res.status(400).json({
          error: {
            code: 'EMAIL_ALREADY_VERIFIED',
            message: 'Email is already verified',
            timestamp: new Date(),
          },
        });
        return;
      }

      // Use the user service to resend verification
      const success = await userService.resendEmailVerification(req.userId);

      if (!success) {
        res.status(500).json({
          error: {
            code: 'EMAIL_SEND_FAILED',
            message: 'Failed to send verification email',
            timestamp: new Date(),
          },
        });
        return;
      }

      res.json({
        message: 'Verification email sent successfully',
        email: userProfile.email,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Send verification email error:', error);
      res.status(500).json({
        error: {
          code: 'VERIFICATION_EMAIL_ERROR',
          message: 'Failed to send verification email',
          timestamp: new Date(),
        },
      });
    }
  }

  /**
   * Verify email with token
   * POST /api/email/verify
   */
  static async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;

      if (!token) {
        res.status(400).json({
          error: {
            code: 'MISSING_TOKEN',
            message: 'Verification token is required',
            timestamp: new Date(),
          },
        });
        return;
      }

      // Verify token
      const tokenData = verificationService.verifyToken(token);
      if (!tokenData) {
        res.status(400).json({
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired verification token',
            timestamp: new Date(),
          },
        });
        return;
      }

      // Check token type
      if (tokenData.type !== 'email_verification') {
        res.status(400).json({
          error: {
            code: 'INVALID_TOKEN_TYPE',
            message: 'Token is not for email verification',
            timestamp: new Date(),
          },
        });
        return;
      }

      // Check if token is expired
      if (verificationService.isTokenExpired(tokenData.expiresAt)) {
        res.status(400).json({
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Verification token has expired',
            timestamp: new Date(),
          },
        });
        return;
      }

      // Get user profile
      const userProfile = await userService.getUserProfile(tokenData.userId);
      if (!userProfile) {
        res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date(),
          },
        });
        return;
      }

      // Check if email matches
      if (userProfile.email !== tokenData.email) {
        res.status(400).json({
          error: {
            code: 'EMAIL_MISMATCH',
            message: 'Token email does not match user email',
            timestamp: new Date(),
          },
        });
        return;
      }

      // Mark email as verified in our database
      const verificationSuccess = await userService.verifyUserEmail(tokenData.userId, tokenData.email);
      
      if (!verificationSuccess) {
        res.status(500).json({
          error: {
            code: 'VERIFICATION_FAILED',
            message: 'Failed to mark email as verified',
            timestamp: new Date(),
          },
        });
        return;
      }
      
      res.json({
        message: 'Email verified successfully',
        user: {
          id: userProfile.id,
          email: userProfile.email,
          emailVerified: true,
        },
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).json({
        error: {
          code: 'EMAIL_VERIFICATION_ERROR',
          message: 'Failed to verify email',
          timestamp: new Date(),
        },
      });
    }
  }

  /**
   * Send password reset email
   * POST /api/email/send-password-reset
   */
  static async sendPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          error: {
            code: 'MISSING_EMAIL',
            message: 'Email address is required',
            timestamp: new Date(),
          },
        });
        return;
      }

      // Check if email service is configured
      if (!emailService.isEmailConfigured()) {
        res.status(503).json({
          error: {
            code: 'EMAIL_SERVICE_UNAVAILABLE',
            message: 'Email service is not configured',
            timestamp: new Date(),
          },
        });
        return;
      }

      // Find user by email (for security, we don't reveal if user exists)
      const user = await userService.getUserByEmail(email);

      if (user) {
        // Generate a secure random token and store its hash with 1 hour expiry for single-use
        const rawToken = verificationService.generateSecureToken();
        const tokenHash = verificationService.hashToken(rawToken);
        const expiresAt = verificationService.getPasswordResetExpiry();

        // Persist hashed token and expiry on user
        const updated = await UserModel.setPasswordResetToken(user.id, tokenHash, expiresAt);
        if (!updated) {
          console.error('Failed to persist password reset token');
        }

        // Build frontend URL with the raw token
        if (!process.env.FRONTEND_URL) {
          throw new Error('FRONTEND_URL is not configured');
        }
        const baseUrl = process.env.FRONTEND_URL.split(',')[0].trim();
        const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;

        // Send password reset email
        const emailSent = await emailService.sendPasswordResetEmail({
          userEmail: user.email,
          userName: user.displayName || user.name,
          resetUrl,
        });

        if (emailSent) {
          console.log(`Password reset email sent to: ${email}`);
        } else {
          console.error(`Failed to send password reset email to: ${email}`);
        }
      }

      // Always return success for security (don't reveal if email exists)
      res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent',
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Send password reset error:', error);
      res.status(500).json({
        error: {
          code: 'PASSWORD_RESET_ERROR',
          message: 'Failed to send password reset email',
          timestamp: new Date(),
        },
      });
    }
  }

  /**
   * Reset password with token
   * POST /api/email/reset-password
   */
  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        res.status(400).json({
          error: {
            code: 'MISSING_FIELDS',
            message: 'Token and new password are required',
            timestamp: new Date(),
          },
        });
        return;
      }

      // Support both new single-use token flow and legacy JWT token flow
      const possibleJwt = verificationService.verifyToken(token);

      if (!possibleJwt) {
        // Treat as single-use token: look up hashed token and verify expiry
        const tokenHash = verificationService.hashToken(token);
        const found = await UserModel.findByPasswordResetToken(tokenHash);
        if (!found || !found.password_reset_expires || new Date(found.password_reset_expires) < new Date()) {
          res.status(400).json({
            error: {
              code: 'INVALID_OR_EXPIRED_TOKEN',
              message: 'Reset token is invalid or has expired',
              timestamp: new Date(),
            },
          });
          return;
        }

        // Basic password policy
        if (typeof newPassword !== 'string' || newPassword.length < 8) {
          res.status(400).json({
            error: {
              code: 'WEAK_PASSWORD',
              message: 'Password must be at least 8 characters long',
              timestamp: new Date(),
            },
          });
          return;
        }

        // Hash and update password, then clear token to enforce single-use
        const hashed = await authService.hashPassword(newPassword);
        const updatedPwd = await UserModel.update(found.id, { password_hash: hashed });
        if (!updatedPwd) {
          res.status(500).json({
            error: {
              code: 'PASSWORD_UPDATE_FAILED',
              message: 'Failed to update password',
              timestamp: new Date(),
            },
          });
          return;
        }
        await UserModel.clearPasswordResetToken(found.id);

        res.json({
          success: true,
          message: 'Password reset successful',
          timestamp: new Date(),
        });
        return;
      }

      // Legacy JWT-based flow: verify token, expiry, and email match
      const tokenData = possibleJwt;
      if (tokenData.type !== 'password_reset') {
        res.status(400).json({
          error: {
            code: 'INVALID_TOKEN_TYPE',
            message: 'Token is not for password reset',
            timestamp: new Date(),
          },
        });
        return;
      }
      if (verificationService.isTokenExpired(tokenData.expiresAt)) {
        res.status(400).json({
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Reset token has expired',
            timestamp: new Date(),
          },
        });
        return;
      }
      const userProfile = await userService.getUserProfile(tokenData.userId);
      if (!userProfile) {
        res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date(),
          },
        });
        return;
      }

      if (userProfile.email !== tokenData.email) {
        res.status(400).json({
          error: {
            code: 'EMAIL_MISMATCH',
            message: 'Token email does not match user email',
            timestamp: new Date(),
          },
        });
        return;
      }

      // Basic password policy: at least 8 chars (frontend enforces too)
      if (typeof newPassword !== 'string' || newPassword.length < 8) {
        res.status(400).json({
          error: {
            code: 'WEAK_PASSWORD',
            message: 'Password must be at least 8 characters long',
            timestamp: new Date(),
          },
        });
        return;
      }

  // Hash and update password
      const hashed = await authService.hashPassword(newPassword);
      const updated = await UserModel.update(tokenData.userId, { password_hash: hashed });

      if (!updated) {
        res.status(500).json({
          error: {
            code: 'PASSWORD_UPDATE_FAILED',
            message: 'Failed to update password',
            timestamp: new Date(),
          },
        });
        return;
      }

      res.json({
        success: true,
        message: 'Password reset successful',
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({
        error: {
          code: 'PASSWORD_RESET_ERROR',
          message: 'Failed to reset password',
          timestamp: new Date(),
        },
      });
    }
  }

  /**
   * Test email configuration
   * GET /api/email/test (admin only)
   */
  static async testEmailConfig(req: Request, res: Response): Promise<void> {
    try {
      // This would typically require admin authentication
      const isConfigured = emailService.isEmailConfigured();
      
      if (!isConfigured) {
        res.status(503).json({
          error: {
            code: 'EMAIL_NOT_CONFIGURED',
            message: 'Email service is not configured',
            timestamp: new Date(),
          },
        });
        return;
      }

      const testResult = await emailService.testEmailConfiguration();
      
      res.json({
        configured: isConfigured,
        testPassed: testResult,
        message: testResult ? 'Email configuration is working' : 'Email configuration test failed',
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Email config test error:', error);
      res.status(500).json({
        error: {
          code: 'EMAIL_TEST_ERROR',
          message: 'Failed to test email configuration',
          timestamp: new Date(),
        },
      });
    }
  }

  /**
   * Send verification reminders to unverified users
   * POST /api/email/admin/send-verification-reminders (admin only)
   */
  static async sendVerificationReminders(req: Request, res: Response): Promise<void> {
    try {
      const { hoursThreshold } = req.body;
      const threshold = hoursThreshold || 24;

      if (!emailService.isEmailConfigured()) {
        res.status(503).json({
          error: {
            code: 'EMAIL_SERVICE_UNAVAILABLE',
            message: 'Email service is not configured',
            timestamp: new Date(),
          },
        });
        return;
      }

      const remindersSent = await userService.sendVerificationReminders(threshold);

      res.json({
        message: 'Verification reminders sent successfully',
        remindersSent,
        hoursThreshold: threshold,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Send verification reminders error:', error);
      res.status(500).json({
        error: {
          code: 'VERIFICATION_REMINDERS_ERROR',
          message: 'Failed to send verification reminders',
          timestamp: new Date(),
        },
      });
    }
  }

  /**
   * Validate reset token before showing reset UI
   * POST /api/email/validate-reset-token
   */
  static async validateResetToken(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;
      if (!token) {
        res.status(400).json({
          error: { code: 'MISSING_TOKEN', message: 'Token is required', timestamp: new Date() },
        });
        return;
      }

      // Try legacy JWT first
      const jwtData = verificationService.verifyToken(token);
      if (jwtData) {
        if (jwtData.type !== 'password_reset') {
          res.status(400).json({
            error: { code: 'INVALID_TOKEN_TYPE', message: 'Token is not for password reset', timestamp: new Date() },
          });
          return;
        }
        if (verificationService.isTokenExpired(jwtData.expiresAt)) {
          res.status(400).json({
            error: { code: 'TOKEN_EXPIRED', message: 'Reset token has expired', timestamp: new Date() },
          });
          return;
        }
        res.json({ success: true, valid: true });
        return;
      }

      // Single-use token flow: check hashed token & expiry
      const tokenHash = verificationService.hashToken(token);
      const found = await UserModel.findByPasswordResetToken(tokenHash);
      const valid = !!found && !!found.password_reset_expires && new Date(found.password_reset_expires) > new Date();

      if (!valid) {
        res.status(400).json({
          error: { code: 'INVALID_OR_EXPIRED_TOKEN', message: 'Reset token is invalid or has expired', timestamp: new Date() },
        });
        return;
      }

      res.json({ success: true, valid: true });
    } catch (error) {
      console.error('Validate reset token error:', error);
      res.status(500).json({
        error: { code: 'TOKEN_VALIDATION_ERROR', message: 'Failed to validate token', timestamp: new Date() },
      });
    }
  }
}

export default EmailController;