import crypto from 'crypto';
import jwt from 'jsonwebtoken';

interface VerificationToken {
  userId: string;
  email: string;
  type: 'email_verification' | 'password_reset';
  expiresAt: Date;
}

interface TokenPayload {
  userId: string;
  email: string;
  type: string;
  exp: number;
  iat: number;
}

class VerificationService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
  private readonly EMAIL_VERIFICATION_EXPIRY = 24 * 60 * 60; // 24 hours in seconds
  private readonly PASSWORD_RESET_EXPIRY = 60 * 60; // 1 hour in seconds

  /**
   * Generate email verification token
   */
  generateEmailVerificationToken(userId: string, email: string): string {
    const payload: Omit<TokenPayload, 'exp' | 'iat'> = {
      userId,
      email,
      type: 'email_verification',
    };

    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.EMAIL_VERIFICATION_EXPIRY,
    });
  }

  /**
   * Generate password reset token
   */
  generatePasswordResetToken(userId: string, email: string): string {
    const payload: Omit<TokenPayload, 'exp' | 'iat'> = {
      userId,
      email,
      type: 'password_reset',
    };

    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.PASSWORD_RESET_EXPIRY,
    });
  }

  /**
   * Verify and decode token
   */
  verifyToken(token: string): VerificationToken | null {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as TokenPayload;
      
      return {
        userId: decoded.userId,
        email: decoded.email,
        type: decoded.type as 'email_verification' | 'password_reset',
        expiresAt: new Date(decoded.exp * 1000),
      };
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }

  /**
   * Generate email verification URL
   */
  generateVerificationUrl(userId: string, email: string): string {
    const token = this.generateEmailVerificationToken(userId, email);
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    return `${baseUrl}/verify-email?token=${token}`;
  }

  /**
   * Generate password reset URL
   */
  generatePasswordResetUrl(userId: string, email: string): string {
    const token = this.generatePasswordResetToken(userId, email);
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    return `${baseUrl}/reset-password?token=${token}`;
  }

  /**
   * Generate secure random token (alternative to JWT for simple use cases)
   */
  generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash token for storage (if storing tokens in database)
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Verify hashed token
   */
  verifyHashedToken(token: string, hashedToken: string): boolean {
    const tokenHash = this.hashToken(token);
    return crypto.timingSafeEqual(Buffer.from(tokenHash), Buffer.from(hashedToken));
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
  }

  /**
   * Get token expiry time for email verification
   */
  getEmailVerificationExpiry(): Date {
    return new Date(Date.now() + this.EMAIL_VERIFICATION_EXPIRY * 1000);
  }

  /**
   * Get token expiry time for password reset
   */
  getPasswordResetExpiry(): Date {
    return new Date(Date.now() + this.PASSWORD_RESET_EXPIRY * 1000);
  }
}

export const verificationService = new VerificationService();
export { VerificationToken, TokenPayload };