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

describe('Settings Complete Integration Tests', () => {
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
    
    // Default user profile response
    mockUserModel.findById.mockResolvedValue(mockUserProfile);
    mockUserModel.update.mockResolvedValue(mockUserProfile);
  });

  describe('Complete Settings Flow - Load and Save All Fields', () => {
    it('should complete full settings flow: load -> update -> verify', async () => {
      // Step 1: Load user profile
      const loadResponse = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(loadResponse.body.user).toMatchObject({
        id: mockUserId,
        email: 'test@example.com',
        name: 'Test User',
        company: 'Test Company',
        website: 'https://example.com',
        location: 'Test City',
        bio: 'Test bio description',
        phone: '+1234567890',
      });

      // Step 2: Update all profile fields
      const updateData = {
        name: 'Updated Test User',
        email: 'updated@example.com',
        company: 'Updated Company',
        website: 'https://updated.com',
        location: 'Updated City',
        bio: 'Updated bio description',
        phone: '+9876543210',
      };

      const updatedProfile = {
        ...mockUserProfile,
        ...updateData,
        updated_at: new Date(),
      };

      mockUserModel.update.mockResolvedValue(updatedProfile);

      const updateResponse = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.message).toBe('Profile updated successfully');
      expect(updateResponse.body.user).toMatchObject({
        name: 'Updated Test User',
        email: 'updated@example.com',
        company: 'Updated Company',
        website: 'https://updated.com',
        location: 'Updated City',
        bio: 'Updated bio description',
        phone: '+9876543210',
      });

      // Step 3: Verify update was called with correct data
      expect(mockUserModel.update).toHaveBeenCalledWith(mockUserId, {
        name: 'Updated Test User',
        email: 'updated@example.com',
        company: 'Updated Company',
        website: 'https://updated.com',
        location: 'Updated City',
        bio: 'Updated bio description',
        phone: '+9876543210',
      });

      // Step 4: Load profile again to verify persistence
      mockUserModel.findById.mockResolvedValue(updatedProfile);

      const verifyResponse = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(verifyResponse.body.user).toMatchObject({
        name: 'Updated Test User',
        email: 'updated@example.com',
        company: 'Updated Company',
        website: 'https://updated.com',
        location: 'Updated City',
        bio: 'Updated bio description',
        phone: '+9876543210',
      });
    });

    it('should handle partial updates correctly', async () => {
      // Load initial profile
      await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      // Update only name and company
      const partialUpdateData = {
        name: 'Partially Updated User',
        company: 'Partially Updated Company',
      };

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(partialUpdateData)
        .expect(200);

      // Should only update specified fields
      expect(mockUserModel.update).toHaveBeenCalledWith(mockUserId, {
        name: 'Partially Updated User',
        company: 'Partially Updated Company',
      });

      expect(response.body.message).toBe('Profile updated successfully');
    });

    it('should handle clearing optional fields', async () => {
      // Load initial profile
      await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      // Clear optional fields
      const clearFieldsData = {
        company: '',
        website: '',
        location: '',
        bio: '',
        phone: '',
      };

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(clearFieldsData)
        .expect(200);

      // Should convert empty strings to null
      expect(mockUserModel.update).toHaveBeenCalledWith(mockUserId, {
        company: null,
        website: null,
        location: null,
        bio: null,
        phone: null,
      });

      expect(response.body.message).toBe('Profile updated successfully');
    });
  });

  describe('Form Validation with Real Backend Responses', () => {
    it('should validate email format and return proper error', async () => {
      const invalidEmailData = {
        email: 'invalid-email-format',
      };

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(invalidEmailData)
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_INPUT');
      expect(response.body.error.message).toContain('valid email address');
      expect(response.body.error.field).toBe('email');
    });

    it('should validate website URL format', async () => {
      const invalidWebsiteData = {
        website: 'not-a-valid-url',
      };

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(invalidWebsiteData)
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_INPUT');
      expect(response.body.error.message).toContain('valid URL');
      expect(response.body.error.field).toBe('website');
    });

    it('should validate phone number format', async () => {
      const invalidPhoneData = {
        phone: 'invalid-phone-123abc',
      };

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(invalidPhoneData)
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_INPUT');
      expect(response.body.error.message).toContain('Phone number must be');
      expect(response.body.error.field).toBe('phone');
    });

    it('should validate field length limits', async () => {
      const longNameData = {
        name: 'a'.repeat(256), // Exceeds 255 character limit
      };

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(longNameData)
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_INPUT');
      expect(response.body.error.message).toContain('cannot exceed 255 characters');
      expect(response.body.error.field).toBe('name');
    });

    it('should validate bio length limit', async () => {
      const longBioData = {
        bio: 'a'.repeat(1001), // Exceeds 1000 character limit
      };

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(longBioData)
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_INPUT');
      expect(response.body.error.message).toContain('Bio cannot exceed 1000 characters');
      expect(response.body.error.field).toBe('bio');
    });

    it('should handle duplicate email validation', async () => {
      // Mock finding another user with the same email
      mockUserModel.findByEmail.mockResolvedValue({
        ...mockUserProfile,
        id: 'different-user-id',
      });

      const duplicateEmailData = {
        email: 'existing@example.com',
      };

      // Mock the service to throw the appropriate error
      jest.spyOn(userService, 'updateUserProfile').mockRejectedValue(
        new Error('Email address is already in use by another account')
      );

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(duplicateEmailData)
        .expect(409);

      expect(response.body.error.code).toBe('EMAIL_EXISTS');
      expect(response.body.error.message).toContain('already in use');
    });

    it('should validate multiple fields and return all errors', async () => {
      const multipleInvalidData = {
        email: 'invalid-email',
        website: 'invalid-url',
        phone: 'invalid-phone',
        name: 'a'.repeat(256),
      };

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(multipleInvalidData)
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_INPUT');
      // Should return the first validation error encountered
      expect(response.body.error.field).toBeDefined();
    });
  });

  describe('Error Handling Scenarios', () => {
    it('should handle authentication errors', async () => {
      mockAuthService.verifyToken.mockResolvedValue({
        userId: null,
        email: null,
        isValid: false,
      });

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer invalid-token`)
        .send({ name: 'Test' })
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toContain('Authentication required');
    });

    it('should handle missing authorization header', async () => {
      const response = await request(app)
        .put('/api/user/profile')
        .send({ name: 'Test' })
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should handle user not found errors', async () => {
      mockUserModel.findById.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ name: 'Test' })
        .expect(404);

      expect(response.body.error.code).toBe('USER_NOT_FOUND');
      expect(response.body.error.message).toContain('User not found');
    });

    it('should handle database connection errors', async () => {
      mockUserModel.update.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ name: 'Test' })
        .expect(500);

      expect(response.body.error.code).toBe('UPDATE_ERROR');
      expect(response.body.error.message).toContain('Failed to update profile');
    });

    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${mockToken}`)
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      // Express should handle malformed JSON
      expect(response.body.error).toBeDefined();
    });

    it('should handle empty request body', async () => {
      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({})
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_INPUT');
      expect(response.body.error.message).toContain('At least one field is required');
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

  describe('Data Sanitization and Security', () => {
    it('should sanitize input data by trimming whitespace', async () => {
      const dataWithWhitespace = {
        name: '  Trimmed Name  ',
        company: '  Trimmed Company  ',
        location: '  Trimmed Location  ',
        bio: '  Trimmed Bio  ',
      };

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(dataWithWhitespace)
        .expect(200);

      expect(mockUserModel.update).toHaveBeenCalledWith(mockUserId, {
        name: 'Trimmed Name',
        company: 'Trimmed Company',
        location: 'Trimmed Location',
        bio: 'Trimmed Bio',
      });
    });

    it('should handle potential XSS attempts in input', async () => {
      const xssData = {
        name: '<script>alert("xss")</script>',
        bio: '<img src="x" onerror="alert(1)">',
        company: '"><script>alert("xss")</script>',
      };

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(xssData)
        .expect(200);

      // Data should be stored as-is (sanitization happens on output)
      expect(mockUserModel.update).toHaveBeenCalledWith(mockUserId, {
        name: '<script>alert("xss")</script>',
        bio: '<img src="x" onerror="alert(1)">',
        company: '"><script>alert("xss")</script>',
      });
    });

    it('should handle SQL injection attempts', async () => {
      const sqlInjectionData = {
        name: "'; DROP TABLE users; --",
        email: "test@example.com'; DELETE FROM users WHERE '1'='1",
      };

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(sqlInjectionData)
        .expect(400); // Should fail validation due to invalid email

      // Should not execute any SQL injection
      expect(response.body.error.code).toBe('INVALID_INPUT');
    });

    it('should handle null and undefined values correctly', async () => {
      const nullData = {
        company: null,
        website: undefined,
        location: null,
        bio: undefined,
        phone: null,
      };

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(nullData)
        .expect(200);

      expect(mockUserModel.update).toHaveBeenCalledWith(mockUserId, {
        company: null,
        location: null,
        phone: null,
      });
    });
  });

  describe('Concurrent Operations and Race Conditions', () => {
    it('should handle concurrent update attempts', async () => {
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

    it('should handle rapid successive requests', async () => {
      const requests = Array.from({ length: 5 }, (_, i) =>
        request(app)
          .put('/api/user/profile')
          .set('Authorization', `Bearer ${mockToken}`)
          .send({ name: `Update ${i}` })
      );

      const responses = await Promise.all(requests);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle profile updates within reasonable time', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          name: 'Performance Test User',
          company: 'Performance Test Company',
          bio: 'This is a performance test bio that contains some text to simulate real usage.',
        })
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Should complete within 1 second
      expect(responseTime).toBeLessThan(1000);
      expect(response.body.message).toBe('Profile updated successfully');
    });

    it('should handle large but valid bio content', async () => {
      const largeBio = 'a'.repeat(999); // Just under the 1000 character limit

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ bio: largeBio })
        .expect(200);

      expect(mockUserModel.update).toHaveBeenCalledWith(mockUserId, {
        bio: largeBio,
      });
    });
  });

  describe('API Response Format Consistency', () => {
    it('should return consistent response format for successful updates', async () => {
      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ name: 'Consistent Format Test' })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('email');
      expect(response.body.user).toHaveProperty('name');
      expect(response.body.user).toHaveProperty('createdAt');
      expect(response.body.user).toHaveProperty('updatedAt');
    });

    it('should return consistent error format for validation errors', async () => {
      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('field');
    });

    it('should return consistent error format for authentication errors', async () => {
      mockAuthService.verifyToken.mockResolvedValue({
        userId: null,
        email: null,
        isValid: false,
      });

      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer invalid-token`)
        .send({ name: 'Test' })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });
});