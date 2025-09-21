import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface VerificationEmailData {
  userEmail: string;
  userName: string;
  verificationUrl: string;
}

interface PasswordResetEmailData {
  userEmail: string;
  userName: string;
  resetUrl: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured = false;

  constructor() {
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter with Gmail SMTP
   */
  private initializeTransporter(): void {
    const zeptomailHost = process.env.ZEPTOMAIL_HOST || 'smtp.zeptomail.in';
    const zeptomailPort = parseInt(process.env.ZEPTOMAIL_PORT || '587');
    const zeptomailUser = process.env.ZEPTOMAIL_USER || 'emailapikey';
    const zeptomailPassword = process.env.ZEPTOMAIL_PASSWORD;
    const emailFrom = process.env.EMAIL_FROM || 'noreply@sniperthink.com';

    if (!zeptomailPassword) {
      console.warn('ZeptoMail credentials not configured. Email functionality will be disabled.');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: zeptomailHost,
        port: zeptomailPort,
        secure: zeptomailPort === 465, // true for 465 (SSL), false for 587 (TLS)
        auth: {
          user: zeptomailUser,
          pass: zeptomailPassword,
        },
        tls: {
          rejectUnauthorized: false // Accept self-signed certificates
        }
      });

      this.isConfigured = true;
      console.log('Email service initialized successfully with ZeptoMail');
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Send email
   */
  private async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      console.error('Email service not configured');
      return false;
    }

    try {
      const emailFrom = process.env.EMAIL_FROM || 'noreply@sniperthink.com';
      
      const mailOptions = {
        from: `"AI Calling Agent Platform" <${emailFrom}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  /**
   * Send email verification email
   */
  async sendVerificationEmail(data: VerificationEmailData): Promise<boolean> {
    const { userEmail, userName, verificationUrl } = data;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4f46e5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background: #4f46e5; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to AI Calling Agent Platform!</h1>
          </div>
          <div class="content">
            <h2>Hi ${userName},</h2>
            <p>Thank you for signing up for our AI Calling Agent Platform. To complete your registration and start using our services, please verify your email address.</p>
            <p>Click the button below to verify your email:</p>
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p><a href="${verificationUrl}">${verificationUrl}</a></p>
            <p>This verification link will expire in 3 days for security reasons.</p>
            <p>If you didn't create an account with us, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>© 2024 AI Calling Agent Platform. All rights reserved.</p>
            <p>This is an automated email, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Welcome to AI Calling Agent Platform!
      
      Hi ${userName},
      
      Thank you for signing up. Please verify your email address by clicking the link below:
      
      ${verificationUrl}
      
  This link will expire in 3 days.
      
      If you didn't create an account with us, please ignore this email.
    `;

    return await this.sendEmail({
      to: userEmail,
      subject: 'Verify Your Email - AI Calling Agent Platform',
      html,
      text,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<boolean> {
    const { userEmail, userName, resetUrl } = data;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background: #dc2626; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
          .warning { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 5px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hi ${userName},</h2>
            <p>We received a request to reset your password for your AI Calling Agent Platform account.</p>
            <div class="warning">
              <strong>Security Notice:</strong> If you didn't request this password reset, please ignore this email and your password will remain unchanged.
            </div>
            <p>To reset your password, click the button below:</p>
            <a href="${resetUrl}" class="button">Reset Password</a>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p><a href="${resetUrl}">${resetUrl}</a></p>
            <p>This password reset link will expire in 1 hour for security reasons.</p>
            <p>After clicking the link, you'll be able to create a new password for your account.</p>
          </div>
          <div class="footer">
            <p>© 2024 AI Calling Agent Platform. All rights reserved.</p>
            <p>This is an automated email, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Password Reset Request
      
      Hi ${userName},
      
      We received a request to reset your password. If you didn't request this, please ignore this email.
      
      To reset your password, click the link below:
      
      ${resetUrl}
      
      This link will expire in 1 hour.
      
      If you have any questions, please contact our support team.
    `;

    return await this.sendEmail({
      to: userEmail,
      subject: 'Reset Your Password - AI Calling Agent Platform',
      html,
      text,
    });
  }

  /**
   * Send welcome email with credit information
   */
  async sendWelcomeEmail(userEmail: string, userName: string, credits: number): Promise<boolean> {
    const getFrontendBaseUrl = (): string => {
      if (!process.env.FRONTEND_URL) {
        throw new Error('FRONTEND_URL is not configured');
      }
      const base = process.env.FRONTEND_URL.split(',')[0].trim();
      return base.endsWith('/') ? base.slice(0, -1) : base;
    };

    const appBaseUrl = getFrontendBaseUrl();
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to AI Calling Agent Platform</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .credits-box { background: #ecfdf5; border: 2px solid #10b981; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to AI Calling Agent Platform!</h1>
          </div>
          <div class="content">
            <h2>Hi ${userName},</h2>
            <p>Congratulations! Your account has been successfully created and verified.</p>
            <div class="credits-box">
              <h3>🎁 Welcome Bonus</h3>
              <p><strong>${credits} FREE Credits</strong> have been added to your account!</p>
              <p>Each credit allows you to make 1 minute of AI-powered calls.</p>
            </div>
            <p>You can now start creating AI calling agents and managing your campaigns. Here's what you can do:</p>
            <ul>
              <li>Create and configure AI calling agents</li>
              <li>Upload contact lists</li>
              <li>Monitor call analytics and lead scoring</li>
              <li>Track your credit usage and purchase more when needed</li>
            </ul>
            <a href="${appBaseUrl}" class="button">Get Started</a>
            <p>If you have any questions or need help getting started, don't hesitate to reach out to our support team.</p>
          </div>
          <div class="footer">
            <p>© 2024 AI Calling Agent Platform. All rights reserved.</p>
            <p>This is an automated email, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Welcome to AI Calling Agent Platform!
      
      Hi ${userName},
      
      Your account has been successfully created! You've received ${credits} free credits to get started.
      
      Visit ${appBaseUrl} to start creating your AI calling agents.
      
      If you need help, contact our support team.
    `;

    return await this.sendEmail({
      to: userEmail,
      subject: '🎉 Welcome! Your AI Calling Agent Account is Ready',
      html,
      text,
    });
  }

  /**
   * Send low credits notification
   */
  async sendLowCreditsNotification(userEmail: string, userName: string, currentCredits: number): Promise<boolean> {
    const getFrontendBaseUrl = (): string => {
      if (!process.env.FRONTEND_URL) {
        throw new Error('FRONTEND_URL is not configured');
      }
      const base = process.env.FRONTEND_URL.split(',')[0].trim();
      return base.endsWith('/') ? base.slice(0, -1) : base;
    };

    const appBaseUrl = getFrontendBaseUrl();
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Low Credits Alert</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f59e0b; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .alert-box { background: #fef3c7; border: 2px solid #f59e0b; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #f59e0b; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Low Credits Alert</h1>
          </div>
          <div class="content">
            <h2>Hi ${userName},</h2>
            <div class="alert-box">
              <h3>Your credit balance is running low</h3>
              <p><strong>Current Balance: ${currentCredits} credits</strong></p>
              <p>You may want to purchase more credits to continue using our services.</p>
            </div>
            <p>Don't let your campaigns stop! Top up your credits to keep your AI calling agents running smoothly.</p>
            <p>Remember: Each credit allows 1 minute of AI-powered calling.</p>
            <a href="${appBaseUrl}/billing" class="button">Purchase Credits</a>
            <p>Thank you for using AI Calling Agent Platform!</p>
          </div>
          <div class="footer">
            <p>© 2024 AI Calling Agent Platform. All rights reserved.</p>
            <p>This is an automated email, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Low Credits Alert
      
      Hi ${userName},
      
      Your credit balance is running low: ${currentCredits} credits remaining.
      
      Purchase more credits at ${appBaseUrl}/billing to keep your campaigns running.
      
      Thank you for using AI Calling Agent Platform!
    `;

    return await this.sendEmail({
      to: userEmail,
      subject: '⚠️ Low Credits Alert - AI Calling Agent Platform',
      html,
      text,
    });
  }

  /**
   * Test email configuration
   */
  async testEmailConfiguration(): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      console.log('Email configuration test successful');
      return true;
    } catch (error) {
      console.error('Email configuration test failed:', error);
      return false;
    }
  }

  /**
   * Check if email service is configured
   */
  isEmailConfigured(): boolean {
    return this.isConfigured;
  }
}

export const emailService = new EmailService();
export { VerificationEmailData, PasswordResetEmailData };