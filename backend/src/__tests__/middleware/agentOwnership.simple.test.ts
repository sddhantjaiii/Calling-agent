/**
 * Simplified Agent Ownership Middleware Tests
 * 
 * This test suite verifies the agent ownership validation middleware
 * prevents cross-agent data contamination at the middleware level.
 * 
 * Requirements: Data Isolation Acceptance Criteria
 */

import { Request, Response, NextFunction } from 'express';
import { validateAgentOwnership } from '../../middleware/agentOwnership';

// Mock the Agent model
jest.mock('../../models/Agent', () => ({
  default: {
    findOne: jest.fn(),
  },
}));

import AgentModel from '../../models/Agent';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
const mockFindOne = jest.mocked(AgentModel.findOne);

describe('Agent Ownership Middleware Tests', () => {
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      user: { 
        id: 'user1-id', 
        email: 'user1@test.com',
        name: 'Test User',
        credits: 100,
        isActive: true,
        emailVerified: true,
        role: 'user',
        authProvider: 'email',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      userId: 'user1-id',
      params: {},
      body: {},
      query: {},
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    
    mockNext = jest.fn();
    
    jest.clearAllMocks();
  });

  describe('validateAgentOwnership middleware', () => {
    test('should pass validation when user owns the agent', async () => {
      const mockAgent = {
        id: 'agent1-id',
        user_id: 'user1-id',
        name: 'Test Agent',
        elevenlabs_agent_id: 'elevenlabs-123',
        agent_type: 'call' as const,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockRequest.params = { agentId: 'agent1-id' };
      mockFindOne.mockResolvedValue(mockAgent);

      await validateAgentOwnership(mockRequest, mockResponse, mockNext);

      expect(mockFindOne).toHaveBeenCalledWith({
        id: 'agent1-id',
        user_id: 'user1-id',
      });
      expect(mockRequest.agent).toBe(mockAgent);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    test('should reject when user does not own the agent', async () => {
      mockRequest.params = { agentId: 'agent2-id' };
      mockFindOne.mockResolvedValue(null);

      await validateAgentOwnership(mockRequest, mockResponse, mockNext);

      expect(mockFindOne).toHaveBeenCalledWith({
        id: 'agent2-id',
        user_id: 'user1-id',
      });
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AGENT_ACCESS_DENIED',
          message: 'Agent not found or access denied',
          timestamp: expect.any(Date),
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject when user is not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.userId = undefined;
      mockRequest.params = { agentId: 'agent1-id' };

      await validateAgentOwnership(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'User must be authenticated to access agent data',
          timestamp: expect.any(Date),
        },
      });
      expect(mockFindOne).not.toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should skip validation when no agentId is provided', async () => {
      mockRequest.params = {};

      await validateAgentOwnership(mockRequest, mockResponse, mockNext);

      expect(mockFindOne).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    test('should reject invalid UUID format', async () => {
      mockRequest.params = { agentId: 'invalid-uuid' };

      await validateAgentOwnership(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_AGENT_ID',
          message: 'Invalid agent ID format',
          timestamp: expect.any(Date),
        },
      });
      expect(mockFindOne).not.toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should handle database errors gracefully', async () => {
      mockRequest.params = { agentId: '550e8400-e29b-41d4-a716-446655440000' };
      mockFindOne.mockRejectedValue(new Error('Database error'));

      await validateAgentOwnership(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AGENT_VALIDATION_ERROR',
          message: 'Failed to validate agent ownership',
          timestamp: expect.any(Date),
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should prevent SQL injection attempts in agent ID', async () => {
      const maliciousId = "'; DROP TABLE agents; --";
      mockRequest.params = { agentId: maliciousId };

      await validateAgentOwnership(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_AGENT_ID',
          message: 'Invalid agent ID format',
          timestamp: expect.any(Date),
        },
      });
      expect(mockFindOne).not.toHaveBeenCalled();
    });

    test('should not leak agent information in error messages', async () => {
      mockRequest.params = { agentId: '550e8400-e29b-41d4-a716-446655440000' };
      mockFindOne.mockResolvedValue(null);

      await validateAgentOwnership(mockRequest, mockResponse, mockNext);

      const errorCall = mockResponse.json.mock.calls[0][0];
      const errorMessage = errorCall.error.message;

      // Error message should not contain the agent ID or any sensitive info
      expect(errorMessage).not.toContain('550e8400-e29b-41d4-a716-446655440000');
      expect(errorMessage).not.toContain('user1-id');
      expect(errorMessage).toBe('Agent not found or access denied');
    });
  });
});