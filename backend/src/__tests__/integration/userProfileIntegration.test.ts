import request from 'supertest';
import { app } from '../../server';
import { userService } from '../../services/userService';
import UserModel from '../../models/User';
import { authService } from '../../services/authService';

// Mock dependencies
jest.mock('../../services/authService');
jest.mock('../../models/User');

const mockAuthService = authService as jest.Mocked<typeof authService>;
const mockUserModel = UserModel as jest.Mocked<typeof UserModel>;

describe('User Profile Integration Tests', () => {
  const mockUserId = 'test-user-123';
  const mockToken = 'mock-jwt-token';
  
  const mockUserProfile = {
    id: mockUserId,
    email: 'test@example.com',
    name: 'Test User',
    credits: 100,
    is_active: true,
    auth_provider: 'email',
    email_verified: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-15'),
    company: 'Test Company',
    website: 'https://example.com',
    location: 'Test City',
    bio: 'Test bio description',
    phone: '+1234567890',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authentication
    mockAuthService.verifyToken.mockResolvedValue({
      userId: mockUserId,
      email: 'test@example.com',
      isValid: true,
    });
    
    mockAuthService.extractTokenFromHeader.mockReturnValue(mockToken);
  });

  describe('GET /api/user/profile', () => {
    it('should return complete user profile with extended fields', async () => {
      mockUserModel.findById.mockResolvedValue(mockUserProfile);

      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body).toEqual({
        user: {
          id: mockUserId,
          email: 'test@example.com',
          name: 'Test User',
          displayName: 'Test User',
          profileImageUrl: undefined,
          credits: 100,
          isActive: true,
          authProvider: 'email',
          emailVerified: true,
          createdAt: mockUserProfile.created_at.toISOString(),
          updatedAt: mockUserProfile.updated_at.toISOString(),
          company: 'Test Company',
          website: 'https://example.com',
          location: 'Test City',
          bio: 'Test bio description',
          phone: '+1234567890',
        },
      });

      expect(mockUserModel.findById).toHaveBeenCalledWith(mockUserId);
    });

    it('should return profile with null extended fields when not set', async () => {
      const profileWithNullFields = {
        ...mockUserProfile,
        company: null,
        website: null,
        location: null,
        bio: null,
        phone: null,
      };

      mockUserModel.findById.mockResolvedValue(profileWithNullFields);

      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body.user).toMatchObject({
        company: null,
        website: null,
        location: null,
        bio: null,
        phone: null,
      });
    });

    it('should return 401 when not authenticated', async () => {
      mockAuthService.verifyToken.mockResolvedValue({
        userId: null,
        email: null,
        isValid: false,
      });

      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer invalid-token`)
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 404 when user not found', async () => {
      mockUserModel.findById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('PUT /api/user/profile', () => {
    beforeEach(() => {
      mockUserModel.findById.mockResolvedValue(mockUserProfile);
      mockUserModel.update.mockResolvedValue(mockUserProfile);
    });

    it('should update all profile fields successfully', async () => {
      const updateData = {
        name: 'Updated Name',
        email: 'updated@example.com',
        company: 'Updated Company',
        website: 'https://updated.com',
        location: 'Updated Location',
        bio: 'Updated bio description',
        phone: '+9876543210',
      };

      const updatedProfile = {
        ...mockUserProfile,
        ...updateData,
      };

      mockUserModel.update.mockResolvedValue(updatedProfile);

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.message).toBe('Profile updated successfully');
      expect(response.body.user.name).toBe('Updated Name');
      expect(response.body.user.email).toBe('updated@example.com');
      expect(response.body.user.company).toBe('Updated Company');
      expect(response.body.user.website).toBe('https://updated.com');
      expect(response.body.user.location).toBe('Updated Location');
      expect(response.body.user.bio).toBe('Updated bio description');
      expect(response.body.user.phone).toBe('+9876543210');

      expect(mockUserModel.update).toHaveBeenCalledWith(mockUserId, {
        name: 'Updated Name',
        email: 'updated@example.com',
        company: 'Updated Company',
        website: 'https://updated.com',
        location: 'Updated Location',
        bio: 'Updated bio description',
        phone: '+9876543210',
      });
    });

    it('should update partial profile fields', async () => {
      const updateData = {
        name: 'Partial Update',
        company: 'New Company',
      };

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(updateData)
        .expect(200);

      expect(mockUserModel.update).toHaveBeenCalledWith(mockUserId, {
        name: 'Partial Update',
        company: 'New Company',
      });
    });

    it('should clear optional fields when set to empty string', async () => {
      const updateData = {
        company: '',
        website: '',
        location: '',
        bio: '',
        phone: '',
      };

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(updateData)
        .expect(200);

      expect(mockUserModel.update).toHaveBeenCalledWith(mockUserId, {
        company: null,
        website: null,
        location: null,
        bio: null,
        phone: null,
      });
    });

    it('should validate email format', async () => {
      const updateData = {
        email: 'invalid-email-format',
      };

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_INPUT');
      expect(response.body.error.message).toContain('valid email address');
    });

    it('should validate website URL format', async () => {
      const updateData = {
        website: 'not-a-valid-url',
      };

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_INPUT');
      expect(response.body.error.message).toContain('valid URL');
    });

    it('should validate phone number format', async () => {
      const updateData = {
        phone: 'invalid-phone-123abc',
      };

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_INPUT');
      expect(response.body.error.message).toContain('Phone number must be');
    });

    it('should validate field length limits', async () => {
      const updateData = {
        name: 'a'.repeat(256), // Exceeds 255 character limit
      };

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_INPUT');
      expect(response.body.error.message).toContain('cannot exceed 255 characters');
    });

    it('should handle duplicate email error', async () => {
      mockUserModel.findByEmail.mockResolvedValue({
        ...mockUserProfile,
        id: 'different-user-id',
      });

      const updateData = {
        email: 'existing@example.com',
      };

      // Mock the service to throw the appropriate error
      jest.spyOn(userService, 'updateUserProfile').mockRejectedValue(
        new Error('Email address is already in use by another account')
      );

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(updateData)
        .expect(409);

      expect(response.body.error.code).toBe('EMAIL_EXISTS');
    });

    it('should handle database errors gracefully', async () => {
      mockUserModel.update.mockRejectedValue(new Error('Database connection failed'));

      const updateData = {
        name: 'Test Update',
      };

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(updateData)
        .expect(500);

      expect(response.body.error.code).toBe('UPDATE_ERROR');
    });

    it('should require at least one field for update', async () => {
      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({})
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_INPUT');
      expect(response.body.error.message).toContain('At least one field is required');
    });

    it('should sanitize input data by trimming whitespace', async () => {
      const updateData = {
        name: '  Trimmed Name  ',
        company: '  Trimmed Company  ',
        location: '  Trimmed Location  ',
      };

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(updateData)
        .expect(200);

      expect(mockUserModel.update).toHaveBeenCalledWith(mockUserId, {
        name: 'Trimmed Name',
        company: 'Trimmed Company',
        location: 'Trimmed Location',
      });
    });

    it('should handle null values for optional fields', async () => {
      const updateData = {
        company: null,
        website: null,
        location: null,
        bio: null,
        phone: null,
      };

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(updateData)
        .expect(200);

      expect(mockUserModel.update).toHaveBeenCalledWith(mockUserId, {
        company: null,
        website: null,
        location: null,
        bio: null,
        phone: null,
      });
    });
  });

  describe('PATCH /api/user/profile/:field', () => {
    beforeEach(() => {
      mockUserModel.findById.mockResolvedValue(mockUserProfile);
      mockUserModel.update.mockResolvedValue(mockUserProfile);
    });

    it('should update single field successfully', async () => {
      const response = await request(app)
        .patch('/api/user/profile/name')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ value: 'Single Field Update' })
        .expect(200);

      expect(response.body.message).toBe('Name updated successfully');
      expect(response.body.updatedField).toBe('name');
      expect(mockUserModel.update).toHaveBeenCalledWith(mockUserId, {
        name: 'Single Field Update',
      });
    });

    it('should reject invalid field names', async () => {
      const response = await request(app)
        .patch('/api/user/profile/invalid_field')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ value: 'test' })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_FIELD');
      expect(response.body.error.message).toContain('not allowed');
    });

    it('should validate single field updates', async () => {
      const response = await request(app)
        .patch('/api/user/profile/email')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ value: 'invalid-email' })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.field).toBe('email');
    });
  });

  describe('User Service Extended Profile Validation', () => {
    it('should validate website URL with protocol', async () => {
      const validationResult = await userService.updateUserProfile(mockUserId, {
        website: 'example.com', // Missing protocol
      }).catch(error => error);

      expect(validationResult).toBeInstanceOf(Error);
      expect(validationResult.message).toContain('valid URL starting with http');
    });

    it('should validate phone number format', async () => {
      const validationResult = await userService.updateUserProfile(mockUserId, {
        phone: 'abc123def', // Invalid format
      }).catch(error => error);

      expect(validationResult).toBeInstanceOf(Error);
      expect(validationResult.message).toContain('Phone number must be');
    });

    it('should validate field length limits', async () => {
      const longBio = 'a'.repeat(1001); // Exceeds 1000 character limit
      
      const validationResult = await userService.updateUserProfile(mockUserId, {
        bio: longBio,
      }).catch(error => error);

      expect(validationResult).toBeInstanceOf(Error);
      expect(validationResult.message).toContain('Bio cannot exceed 1000 characters');
    });

    it('should sanitize and handle empty strings correctly', async () => {
      mockUserModel.findById.mockResolvedValue(mockUserProfile);
      mockUserModel.update.mockResolvedValue(mockUserProfile);

      await userService.updateUserProfile(mockUserId, {
        company: '   ', // Whitespace only
        website: '', // Empty string
        location: null, // Explicit null
      });

      expect(mockUserModel.update).toHaveBeenCalledWith(mockUserId, {
        company: undefined,
        website: undefined,
        location: undefined,
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle concurrent update attempts', async () => {
      mockUserModel.findById.mockResolvedValue(mockUserProfile);
      mockUserModel.update.mockResolvedValue(mockUserProfile);

      // Simulate concurrent updates
      const update1 = request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ name: 'Update 1' });

      const update2 = request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ name: 'Update 2' });

      const [response1, response2] = await Promise.all([update1, update2]);

      // Both should succeed (database handles concurrency)
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });

    it('should handle malformed request data', async () => {
      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${mockToken}`)
        .send('invalid json')
        .expect(400);

      // Express should handle malformed JSON
      expect(response.body.error).toBeDefined();
    });

    it('should handle very large request payloads', async () => {
      const largeData = {
        bio: 'a'.repeat(10000), // Very large bio
      };

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(largeData)
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_INPUT');
    });
  });
});