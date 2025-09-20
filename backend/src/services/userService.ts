
import UserModel, { UserInterface } from '../models/User';
import { sessionService } from './sessionService';
import { emailService } from './emailService';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  displayName?: string;
  profileImageUrl?: string;
  credits: number;
  isActive: boolean;
  authProvider: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Extended profile fields
  company?: string | null;
  website?: string | null;
  location?: string | null;
  bio?: string | null;
  phone?: string | null;
}

interface UserStats {
  totalCalls: number;
  totalCreditsUsed: number;
  agentCount: number;
  contactCount: number;
}

interface ProfileUpdateData {
  name?: string;
  email?: string;
  company?: string | null;
  website?: string | null;
  location?: string | null;
  bio?: string | null;
  phone?: string | null;
}

interface ValidationError {
  field: string;
  message: string;
}

class UserService {
  /**
   * Validate profile update data
   */
  private validateProfileData(data: ProfileUpdateData): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate website URL format
    if (data.website !== undefined && data.website !== null && data.website.trim() !== '') {
      const websiteRegex = /^https?:\/\/.+/;
      if (!websiteRegex.test(data.website)) {
        errors.push({
          field: 'website',
          message: 'Website must be a valid URL starting with http:// or https://'
        });
      }
      if (data.website.length > 500) {
        errors.push({
          field: 'website',
          message: 'Website URL cannot exceed 500 characters'
        });
      }
    }

    // Validate phone number format
    if (data.phone !== undefined && data.phone !== null && data.phone.trim() !== '') {
      const phoneRegex = /^[+]?[0-9\s\-()]{7,20}$/;
      if (!phoneRegex.test(data.phone)) {
        errors.push({
          field: 'phone',
          message: 'Phone number must be 7-20 characters and contain only numbers, spaces, hyphens, parentheses, and optional + prefix'
        });
      }
    }

    // Validate field lengths
    if (data.company && data.company.length > 255) {
      errors.push({
        field: 'company',
        message: 'Company name cannot exceed 255 characters'
      });
    }

    if (data.location && data.location.length > 255) {
      errors.push({
        field: 'location',
        message: 'Location cannot exceed 255 characters'
      });
    }

    if (data.bio && data.bio.length > 1000) {
      errors.push({
        field: 'bio',
        message: 'Bio cannot exceed 1000 characters'
      });
    }

    if (data.name && data.name.length > 255) {
      errors.push({
        field: 'name',
        message: 'Name cannot exceed 255 characters'
      });
    }

    // Validate email format if provided
    if (data.email !== undefined && data.email !== null && data.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        errors.push({
          field: 'email',
          message: 'Please provide a valid email address'
        });
      }
    }

    return errors;
  }

  /**
   * Sanitize profile data by trimming whitespace and handling empty strings
   */
  private sanitizeProfileData(data: ProfileUpdateData): ProfileUpdateData {
    const sanitized: ProfileUpdateData = {};

    // Helper function to sanitize string fields
    const sanitizeString = (value: string | undefined | null): string | undefined => {
      if (value === undefined || value === null) return undefined;
      const trimmed = value.trim();
      return trimmed === '' ? undefined : trimmed;
    };

    if (data.name !== undefined) sanitized.name = sanitizeString(data.name);
    if (data.email !== undefined) sanitized.email = sanitizeString(data.email);
    if (data.company !== undefined) sanitized.company = sanitizeString(data.company);
    if (data.website !== undefined) sanitized.website = sanitizeString(data.website);
    if (data.location !== undefined) sanitized.location = sanitizeString(data.location);
    if (data.bio !== undefined) sanitized.bio = sanitizeString(data.bio);
    if (data.phone !== undefined) sanitized.phone = sanitizeString(data.phone);

    return sanitized;
  }

  /**
   * Get or create user (for custom auth system)
   * This method is now simplified since we handle user creation in authService
   */
  async getOrCreateUser(userData: { email: string; name: string }): Promise<UserInterface> {
    try {
      // Try to find existing user by email
      let user = await UserModel.findByEmail(userData.email);
      
      if (user) {
        return user;
      }

      // Create new user with default credits
      user = await UserModel.create({
        email: userData.email,
        name: userData.name,
        auth_provider: 'email',
        role: 'user',
        credits: 0, // Start with 0, will add bonus credits via billing service
        is_active: true,
        email_verified: false,
        email_verification_sent_at: undefined
      });

      // Grant new user bonus credits using billing service for proper transaction logging
      try {
        const { BillingService } = await import('./billingService');
        const bonusResult = await BillingService.grantNewUserBonus(user.id);
        user = bonusResult.user; // Update user with new credit balance
        console.log(`New user created: ${user.email} with ${user.credits} bonus credits (transaction: ${bonusResult.transaction.id})`);
      } catch (error) {
        console.error('Failed to grant new user bonus credits:', error);
        // Fallback: manually add credits without transaction logging
        user = await UserModel.addCredits(user.id, 15) as UserInterface;
        console.log(`New user created: ${user.email} with ${user.credits} fallback credits`);
      }
      
      // Send email verification for new users (async, don't wait)
      if (emailService.isEmailConfigured()) {
        this.sendEmailVerificationToNewUser(user).catch(error => {
          console.error('Failed to send verification email to new user:', error);
        });
      }
      
      return user;
    } catch (error) {
      console.error('Error in getOrCreateUser:', error);
      throw new Error('Failed to get or create user');
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<UserProfile | null> {
    try {
      const user = await UserModel.findByEmail(email);
      if (!user) {
        return null;
      }

      return await this.getUserProfile(user.id);
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        displayName: user.name,
        profileImageUrl: undefined, // Can be added later for profile pictures
        credits: user.credits,
        isActive: user.is_active,
        authProvider: user.auth_provider,
        emailVerified: user.email_verified,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        // Extended profile fields
        company: user.company,
        website: user.website,
        location: user.location,
        bio: user.bio,
        phone: user.phone,
      };
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, updates: ProfileUpdateData): Promise<UserProfile | null> {
    try {
      // Sanitize input data
      const sanitizedUpdates = this.sanitizeProfileData(updates);

      // Validate the sanitized data
      const validationErrors = this.validateProfileData(sanitizedUpdates);
      if (validationErrors.length > 0) {
        const errorMessage = validationErrors.map(err => `${err.field}: ${err.message}`).join('; ');
        throw new Error(`Validation failed: ${errorMessage}`);
      }

      // Check if user exists
      const existingUser = await UserModel.findById(userId);
      if (!existingUser) {
        throw new Error('User not found');
      }

      // Check if email is being changed and if it's already taken by another user
      if (sanitizedUpdates.email && sanitizedUpdates.email !== existingUser.email) {
        const emailExists = await UserModel.findByEmail(sanitizedUpdates.email);
        if (emailExists && emailExists.id !== userId) {
          throw new Error('Email address is already in use by another account');
        }
      }

      // Update the user with validated data
      const updatedUser = await UserModel.update(userId, sanitizedUpdates);
      if (!updatedUser) {
        throw new Error('Failed to update user profile');
      }

      // Return the updated profile
      return await this.getUserProfile(userId);
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error; // Re-throw to preserve the specific error message
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string): Promise<UserStats | null> {
    try {
      const stats = await UserModel.getUserStats(userId);
      return {
        totalCalls: stats.totalCalls,
        totalCreditsUsed: stats.totalCreditsUsed,
        agentCount: stats.agentCount,
        contactCount: stats.contactCount,
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      return null;
    }
  }

  /**
   * Get user credit balance
   */
  async getUserCredits(userId: string): Promise<number | null> {
    try {
      const user = await UserModel.findById(userId);
      return user ? user.credits : null;
    } catch (error) {
      console.error('Error getting user credits:', error);
      return null;
    }
  }

  /**
   * Check if user has sufficient credits
   */
  async hasCredits(userId: string, requiredCredits: number): Promise<boolean> {
    try {
      const user = await UserModel.findById(userId);
      return user ? user.credits >= requiredCredits : false;
    } catch (error) {
      console.error('Error checking user credits:', error);
      return false;
    }
  }

  /**
   * Deduct credits from user account
   */
  async deductCredits(userId: string, amount: number): Promise<boolean> {
    try {
      await UserModel.deductCredits(userId, amount);
      return true;
    } catch (error) {
      console.error('Error deducting credits:', error);
      return false;
    }
  }

  /**
   * Add credits to user account
   */
  async addCredits(userId: string, amount: number): Promise<boolean> {
    try {
      await UserModel.addCredits(userId, amount);
      return true;
    } catch (error) {
      console.error('Error adding credits:', error);
      return false;
    }
  }

  /**
   * Get users with low credits for notifications
   */
  async getUsersWithLowCredits(threshold: number = 5): Promise<UserInterface[]> {
    try {
      return await UserModel.getUsersWithLowCredits(threshold);
    } catch (error) {
      console.error('Error getting users with low credits:', error);
      return [];
    }
  }

  /**
   * Send low credits notifications to users
   */
  async sendLowCreditsNotifications(threshold: number = 5): Promise<number> {
    try {
      if (!emailService.isEmailConfigured()) {
        console.log('Email service not configured, skipping low credits notifications');
        return 0;
      }

      const usersWithLowCredits = await this.getUsersWithLowCredits(threshold);
      let notificationsSent = 0;

      for (const user of usersWithLowCredits) {
        try {
          const success = await emailService.sendLowCreditsNotification(
            user.email,
            user.name,
            user.credits
          );
          
          if (success) {
            notificationsSent++;
            console.log(`Low credits notification sent to ${user.email}`);
          }
        } catch (error) {
          console.error(`Failed to send low credits notification to ${user.email}:`, error);
        }
      }

      console.log(`Sent ${notificationsSent} low credits notifications`);
      return notificationsSent;
    } catch (error) {
      console.error('Error sending low credits notifications:', error);
      return 0;
    }
  }

  /**
   * Suspend or activate user account
   */
  async setUserStatus(userId: string, isActive: boolean): Promise<boolean> {
    try {
      const updatedUser = await UserModel.setUserStatus(userId, isActive);
      
      // Remove session if user is suspended
      if (!isActive && updatedUser) {
        sessionService.removeSession(userId);
      }
      
      return !!updatedUser;
    } catch (error) {
      console.error('Error setting user status:', error);
      return false;
    }
  }

  /**
   * Delete user account (soft delete by deactivating)
   */
  async deleteUser(userId: string): Promise<boolean> {
    try {
      // Soft delete by deactivating the user
      const result = await this.setUserStatus(userId, false);
      
      // Remove session
      sessionService.removeSession(userId);
      
      return result;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  /**
   * Send email verification to new user
   */
  private async sendEmailVerificationToNewUser(user: UserInterface): Promise<void> {
    try {
      const { verificationService } = await import('./verificationService');
      
      // Generate verification URL
      const verificationUrl = verificationService.generateVerificationUrl(user.id, user.email);
      
      // Send verification email
      const emailSent = await emailService.sendVerificationEmail({
        userEmail: user.email,
        userName: user.name,
        verificationUrl,
      });
      
      if (emailSent) {
        // Update verification sent timestamp
        await UserModel.updateEmailVerificationSent(user.id);
        console.log(`Email verification sent to new user: ${user.email}`);
      } else {
        console.error(`Failed to send email verification to new user: ${user.email}`);
      }
    } catch (error) {
      console.error('Error sending email verification to new user:', error);
    }
  }

  /**
   * Resend email verification
   */
  async resendEmailVerification(userId: string): Promise<boolean> {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        return false;
      }

      if (user.email_verified) {
        return false; // Already verified
      }

      if (!emailService.isEmailConfigured()) {
        return false;
      }

      const { verificationService } = await import('./verificationService');
      
      // Generate verification URL
      const verificationUrl = verificationService.generateVerificationUrl(user.id, user.email);
      
      // Send verification email
      const emailSent = await emailService.sendVerificationEmail({
        userEmail: user.email,
        userName: user.name,
        verificationUrl,
      });
      
      if (emailSent) {
        // Update verification sent timestamp
        await UserModel.updateEmailVerificationSent(user.id);
        console.log(`Email verification resent to user: ${user.email}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error resending email verification:', error);
      return false;
    }
  }

  /**
   * Verify user email
   */
  async verifyUserEmail(userId: string, email: string): Promise<boolean> {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        return false;
      }

      if (user.email !== email) {
        return false; // Email mismatch
      }

      if (user.email_verified) {
        return true; // Already verified
      }

      // Mark email as verified
      const updatedUser = await UserModel.markEmailVerified(userId);
      
      if (updatedUser) {
        // Send welcome email after verification (async, don't wait)
        if (emailService.isEmailConfigured()) {
          emailService.sendWelcomeEmail(
            user.email,
            user.name,
            user.credits
          ).catch(error => {
            console.error('Failed to send welcome email after verification:', error);
          });
        }
        
        console.log(`Email verified for user: ${user.email}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error verifying user email:', error);
      return false;
    }
  }

  /**
   * Send verification reminders to users who haven't verified
   */
  async sendVerificationReminders(hoursThreshold: number = 24): Promise<number> {
    try {
      if (!emailService.isEmailConfigured()) {
        console.log('Email service not configured, skipping verification reminders');
        return 0;
      }

      const usersNeedingReminder = await UserModel.getUsersNeedingVerificationReminder(hoursThreshold);
      let remindersSent = 0;

      for (const user of usersNeedingReminder) {
        try {
          const success = await this.resendEmailVerification(user.id);
          
          if (success) {
            remindersSent++;
            console.log(`Verification reminder sent to ${user.email}`);
          }
        } catch (error) {
          console.error(`Failed to send verification reminder to ${user.email}:`, error);
        }
      }

      console.log(`Sent ${remindersSent} verification reminders`);
      return remindersSent;
    } catch (error) {
      console.error('Error sending verification reminders:', error);
      return 0;
    }
  }

  /**
   * Authenticate user (simplified for custom auth)
   */
  async authenticateUser(userId: string): Promise<UserProfile | null> {
    try {
      // Return user profile
      return await this.getUserProfile(userId);
    } catch (error) {
      console.error('Error authenticating user:', error);
      return null;
    }
  }

  /**
   * Update user password
   */
  async updatePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      const user = await UserModel.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user has a password (some users might be OAuth only)
      if (!user.password_hash) {
        throw new Error('User does not have a password set. Please use OAuth login or contact support.');
      }

      // Verify current password
      const bcrypt = require('bcrypt');
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
      
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password in database
      const updatedUser = await UserModel.update(userId, {
        password_hash: hashedNewPassword,
      });

      if (!updatedUser) {
        throw new Error('Failed to update password');
      }

      console.log(`Password updated successfully for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error updating password:', error);
      throw error;
    }
  }
}

export const userService = new UserService();
export { UserProfile, UserStats, ProfileUpdateData, ValidationError };