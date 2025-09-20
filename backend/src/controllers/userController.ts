import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { userService, ProfileUpdateData, ValidationError } from '../services/userService';
import { authService } from '../services/authService';

export class UserController {
  /**
   * Validate and sanitize profile update request data
   */
  private static validateProfileUpdateRequest(body: any): { 
    isValid: boolean; 
    updates: ProfileUpdateData; 
    errors: string[] 
  } {
    const errors: string[] = [];
    const updates: ProfileUpdateData = {};

    // Extract and validate each field with enhanced validation
    const { name, email, company, website, location, bio, phone } = body;

    // Enhanced validation for name
    if (name !== undefined) {
      if (typeof name !== 'string') {
        errors.push('Name must be a string');
      } else if (name.trim().length === 0) {
        errors.push('Name cannot be empty');
      } else if (name.trim().length > 255) {
        errors.push('Name cannot exceed 255 characters');
      } else {
        updates.name = name.trim();
      }
    }

    // Enhanced validation for email
    if (email !== undefined) {
      if (typeof email !== 'string') {
        errors.push('Email must be a string');
      } else if (email.trim().length === 0) {
        errors.push('Email cannot be empty');
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const trimmedEmail = email.trim().toLowerCase();
        if (!emailRegex.test(trimmedEmail)) {
          errors.push('Please provide a valid email address');
        } else {
          updates.email = trimmedEmail;
        }
      }
    }

    // Enhanced validation for company
    if (company !== undefined) {
      if (company !== null && typeof company !== 'string') {
        errors.push('Company must be a string or null');
      } else if (company !== null) {
        const trimmedCompany = company.trim();
        if (trimmedCompany.length > 255) {
          errors.push('Company name cannot exceed 255 characters');
        } else {
          updates.company = trimmedCompany || null;
        }
      } else {
        updates.company = null;
      }
    }

    // Enhanced validation for website
    if (website !== undefined) {
      if (website !== null && typeof website !== 'string') {
        errors.push('Website must be a string or null');
      } else if (website !== null) {
        const trimmedWebsite = website.trim();
        if (trimmedWebsite.length === 0) {
          updates.website = null;
        } else if (trimmedWebsite.length > 500) {
          errors.push('Website URL cannot exceed 500 characters');
        } else {
          // Basic URL validation
          const urlRegex = /^https?:\/\/.+/;
          if (!urlRegex.test(trimmedWebsite)) {
            errors.push('Website must be a valid URL starting with http:// or https://');
          } else {
            updates.website = trimmedWebsite;
          }
        }
      } else {
        updates.website = null;
      }
    }

    // Enhanced validation for location
    if (location !== undefined) {
      if (location !== null && typeof location !== 'string') {
        errors.push('Location must be a string or null');
      } else if (location !== null) {
        const trimmedLocation = location.trim();
        if (trimmedLocation.length > 255) {
          errors.push('Location cannot exceed 255 characters');
        } else {
          updates.location = trimmedLocation || null;
        }
      } else {
        updates.location = null;
      }
    }

    // Enhanced validation for bio
    if (bio !== undefined) {
      if (bio !== null && typeof bio !== 'string') {
        errors.push('Bio must be a string or null');
      } else if (bio !== null) {
        const trimmedBio = bio.trim();
        if (trimmedBio.length > 1000) {
          errors.push('Bio cannot exceed 1000 characters');
        } else {
          updates.bio = trimmedBio || null;
        }
      } else {
        updates.bio = null;
      }
    }

    // Enhanced validation for phone
    if (phone !== undefined) {
      if (phone !== null && typeof phone !== 'string') {
        errors.push('Phone must be a string or null');
      } else if (phone !== null) {
        const trimmedPhone = phone.trim();
        if (trimmedPhone.length === 0) {
          updates.phone = null;
        } else {
          // Phone number validation (international format support)
          const phoneRegex = /^[+]?[0-9\s\-()]{7,20}$/;
          if (!phoneRegex.test(trimmedPhone)) {
            errors.push('Phone number must be 7-20 characters and contain only numbers, spaces, hyphens, parentheses, and optional + prefix');
          } else {
            updates.phone = trimmedPhone;
          }
        }
      } else {
        updates.phone = null;
      }
    }

    // Check if at least one field is provided
    if (Object.keys(updates).length === 0) {
      errors.push('At least one field is required for update');
    }

    return {
      isValid: errors.length === 0,
      updates,
      errors
    };
  }
  /**
   * Get current user profile
   * GET /api/user/profile
   */
  static async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      const profile = await userService.getUserProfile(req.userId);
      
      if (!profile) {
        res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User profile not found',
            timestamp: new Date(),
          },
        });
        return;
      }

      res.json({
        user: profile,
      });
    } catch (error) {
      console.error('Get profile error:', error);
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
   * Update user profile
   * PUT /api/user/profile
   */
  static async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      // Validate and sanitize request data
      const validation = UserController.validateProfileUpdateRequest(req.body);
      
      if (!validation.isValid) {
        res.status(400).json({
          error: {
            code: 'INVALID_INPUT',
            message: validation.errors.join('; '),
            timestamp: new Date(),
          },
        });
        return;
      }

      // Log the update attempt for debugging (without sensitive data)
      console.log(`Profile update attempt for user ${req.userId}:`, {
        fieldsToUpdate: Object.keys(validation.updates),
        hasName: !!validation.updates.name,
        hasEmail: !!validation.updates.email,
        hasCompany: !!validation.updates.company,
        hasWebsite: !!validation.updates.website,
        hasLocation: !!validation.updates.location,
        hasBio: !!validation.updates.bio,
        hasPhone: !!validation.updates.phone,
        updateCount: Object.keys(validation.updates).length,
        timestamp: new Date().toISOString(),
      });

      const updatedProfile = await userService.updateUserProfile(req.userId, validation.updates);
      
      if (!updatedProfile) {
        res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date(),
          },
        });
        return;
      }

      // Log successful update
      console.log(`Profile updated successfully for user ${req.userId}`);

      res.json({
        user: updatedProfile,
        message: 'Profile updated successfully',
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Update profile error:', error);
      
      // Handle validation errors specifically with detailed field information
      if (error instanceof Error && error.message.startsWith('Validation failed:')) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            details: 'Please check the format and length of your input fields',
            timestamp: new Date(),
          },
        });
        return;
      }

      // Handle email already exists error
      if (error instanceof Error && error.message.includes('already in use')) {
        res.status(409).json({
          error: {
            code: 'EMAIL_EXISTS',
            message: error.message,
            timestamp: new Date(),
          },
        });
        return;
      }

      // Handle database constraint violations
      if (error instanceof Error && error.message.includes('constraint')) {
        res.status(400).json({
          error: {
            code: 'CONSTRAINT_VIOLATION',
            message: 'Invalid data format. Please check your input and try again.',
            timestamp: new Date(),
          },
        });
        return;
      }

      // Handle user not found during update
      if (error instanceof Error && error.message.includes('User not found')) {
        res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User account not found',
            timestamp: new Date(),
          },
        });
        return;
      }

      // Generic server error
      res.status(500).json({
        error: {
          code: 'UPDATE_ERROR',
          message: 'Failed to update user profile',
          timestamp: new Date(),
        },
      });
    }
  }

  /**
   * Update specific profile field (PATCH endpoint for partial updates)
   * PATCH /api/user/profile/:field
   */
  static async updateProfileField(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      const { field } = req.params;
      const { value } = req.body;

      // Validate field name
      const allowedFields = ['name', 'email', 'company', 'website', 'location', 'bio', 'phone'];
      if (!allowedFields.includes(field)) {
        res.status(400).json({
          error: {
            code: 'INVALID_FIELD',
            message: `Field '${field}' is not allowed. Allowed fields: ${allowedFields.join(', ')}`,
            timestamp: new Date(),
          },
        });
        return;
      }

      // Create update object with single field
      const updateData = { [field]: value };
      
      // Validate using existing validation logic
      const validation = UserController.validateProfileUpdateRequest(updateData);
      
      if (!validation.isValid) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: validation.errors.join('; '),
            field,
            timestamp: new Date(),
          },
        });
        return;
      }

      console.log(`Single field update for user ${req.userId}: ${field}`);

      const updatedProfile = await userService.updateUserProfile(req.userId, validation.updates);
      
      if (!updatedProfile) {
        res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date(),
          },
        });
        return;
      }

      res.json({
        user: updatedProfile,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully`,
        updatedField: field,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error(`Update profile field error for field '${req.params.field}':`, error);
      
      // Handle specific errors
      if (error instanceof Error && error.message.includes('already in use')) {
        res.status(409).json({
          error: {
            code: 'EMAIL_EXISTS',
            message: error.message,
            field: req.params.field,
            timestamp: new Date(),
          },
        });
        return;
      }

      res.status(500).json({
        error: {
          code: 'UPDATE_ERROR',
          message: `Failed to update ${req.params.field}`,
          field: req.params.field,
          timestamp: new Date(),
        },
      });
    }
  }

  /**
   * Get user statistics
   * GET /api/user/stats
   */
  static async getStats(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      const stats = await userService.getUserStats(req.userId);
      
      if (!stats) {
        res.status(404).json({
          error: {
            code: 'STATS_NOT_FOUND',
            message: 'User statistics not found',
            timestamp: new Date(),
          },
        });
        return;
      }

      res.json({
        stats,
      });
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({
        error: {
          code: 'STATS_ERROR',
          message: 'Failed to fetch user statistics',
          timestamp: new Date(),
        },
      });
    }
  }

  /**
   * Get user credit balance
   * GET /api/user/credits
   */
  static async getCredits(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      const credits = await userService.getUserCredits(req.userId);
      
      if (credits === null) {
        res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date(),
          },
        });
        return;
      }

      res.json({
        credits,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Get credits error:', error);
      res.status(500).json({
        error: {
          code: 'CREDITS_ERROR',
          message: 'Failed to fetch user credits',
          timestamp: new Date(),
        },
      });
    }
  }

  /**
   * Initialize user account (called on first login)
   * POST /api/user/initialize
   */
  static async initializeUser(req: Request, res: Response): Promise<void> {
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

      const userProfile = await userService.authenticateUser(token);
      
      if (!userProfile) {
        res.status(401).json({
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: 'Failed to authenticate user',
            timestamp: new Date(),
          },
        });
        return;
      }

      res.json({
        user: userProfile,
        message: 'User initialized successfully',
        isNewUser: userProfile.createdAt.getTime() > (Date.now() - 60000), // Created within last minute
      });
    } catch (error) {
      console.error('Initialize user error:', error);
      res.status(500).json({
        error: {
          code: 'INITIALIZATION_ERROR',
          message: 'Failed to initialize user',
          timestamp: new Date(),
        },
      });
    }
  }

  /**
   * Delete user account
   * DELETE /api/user/account
   */
  static async deleteAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      const success = await userService.deleteUser(req.userId);
      
      if (!success) {
        res.status(500).json({
          error: {
            code: 'DELETE_ERROR',
            message: 'Failed to delete user account',
            timestamp: new Date(),
          },
        });
        return;
      }

      res.json({
        message: 'User account deleted successfully',
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Delete account error:', error);
      res.status(500).json({
        error: {
          code: 'DELETE_ERROR',
          message: 'Failed to delete user account',
          timestamp: new Date(),
        },
      });
    }
  }

  /**
   * Get profile completion status
   * GET /api/user/profile/completion
   */
  static async getProfileCompletion(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      const profile = await userService.getUserProfile(req.userId);
      
      if (!profile) {
        res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User profile not found',
            timestamp: new Date(),
          },
        });
        return;
      }

      // Calculate completion status
      const requiredFields = ['name', 'email'];
      const optionalFields = ['company', 'website', 'location', 'bio', 'phone'];
      
      const completedRequired = requiredFields.filter(field => 
        profile[field as keyof typeof profile] && 
        String(profile[field as keyof typeof profile]).trim().length > 0
      );
      
      const completedOptional = optionalFields.filter(field => 
        profile[field as keyof typeof profile] && 
        String(profile[field as keyof typeof profile]).trim().length > 0
      );

      const totalFields = requiredFields.length + optionalFields.length;
      const completedFields = completedRequired.length + completedOptional.length;
      const completionPercentage = Math.round((completedFields / totalFields) * 100);

      const missingRequired = requiredFields.filter(field => 
        !profile[field as keyof typeof profile] || 
        String(profile[field as keyof typeof profile]).trim().length === 0
      );

      const missingOptional = optionalFields.filter(field => 
        !profile[field as keyof typeof profile] || 
        String(profile[field as keyof typeof profile]).trim().length === 0
      );

      res.json({
        completion: {
          percentage: completionPercentage,
          isComplete: missingRequired.length === 0,
          requiredFieldsComplete: completedRequired.length === requiredFields.length,
          totalFields,
          completedFields,
          requiredFields: {
            total: requiredFields.length,
            completed: completedRequired.length,
            missing: missingRequired,
          },
          optionalFields: {
            total: optionalFields.length,
            completed: completedOptional.length,
            missing: missingOptional,
          },
        },
        profile: {
          hasName: !!profile.name,
          hasEmail: !!profile.email,
          hasCompany: !!profile.company,
          hasWebsite: !!profile.website,
          hasLocation: !!profile.location,
          hasBio: !!profile.bio,
          hasPhone: !!profile.phone,
          emailVerified: profile.emailVerified,
        },
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Get profile completion error:', error);
      res.status(500).json({
        error: {
          code: 'COMPLETION_ERROR',
          message: 'Failed to get profile completion status',
          timestamp: new Date(),
        },
      });
    }
  }

  /**
   * Check credit balance and requirements
   * POST /api/user/check-credits
   */
  static async checkCredits(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      const { requiredCredits = 1 } = req.body;
      
      const currentCredits = await userService.getUserCredits(req.userId);
      const hasEnoughCredits = await userService.hasCredits(req.userId, requiredCredits);
      
      res.json({
        currentCredits,
        requiredCredits,
        hasEnoughCredits,
        needsTopUp: !hasEnoughCredits,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Check credits error:', error);
      res.status(500).json({
        error: {
          code: 'CREDITS_CHECK_ERROR',
          message: 'Failed to check credit balance',
          timestamp: new Date(),
        },
      });
    }
  }

  /**
   * Update user password
   * PUT /api/user/password
   */
  static async updatePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      const { currentPassword, newPassword } = req.body;

      // Validate input
      if (!currentPassword || !newPassword) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Current password and new password are required',
            timestamp: new Date(),
          },
        });
        return;
      }

      if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Passwords must be strings',
            timestamp: new Date(),
          },
        });
        return;
      }

      if (newPassword.length < 6) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'New password must be at least 6 characters long',
            timestamp: new Date(),
          },
        });
        return;
      }

      if (currentPassword === newPassword) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'New password must be different from current password',
            timestamp: new Date(),
          },
        });
        return;
      }

      // Update password using userService
      const success = await userService.updatePassword(req.userId, currentPassword, newPassword);
      
      if (!success) {
        res.status(400).json({
          error: {
            code: 'INVALID_PASSWORD',
            message: 'Current password is incorrect',
            timestamp: new Date(),
          },
        });
        return;
      }

      console.log(`Password updated successfully for user ${req.userId}`);

      res.json({
        message: 'Password updated successfully',
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Update password error:', error);
      
      if (error instanceof Error && error.message.includes('Current password is incorrect')) {
        res.status(400).json({
          error: {
            code: 'INVALID_PASSWORD',
            message: 'Current password is incorrect',
            timestamp: new Date(),
          },
        });
        return;
      }

      if (error instanceof Error && error.message.includes('User not found')) {
        res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User account not found',
            timestamp: new Date(),
          },
        });
        return;
      }

      res.status(500).json({
        error: {
          code: 'PASSWORD_UPDATE_ERROR',
          message: 'Failed to update password',
          timestamp: new Date(),
        },
      });
    }
  }
}

export default UserController;