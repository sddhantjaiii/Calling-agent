/**
 * Agent Ownership Middleware Tests
 * 
 * This test suite verifies the agent ownership validation middleware
 * prevents cross-agent data contamination at the middleware level.
 * 
 * Requirements: Data Isolation Acceptance Criteria
 */

import { Request, Response, NextFunction } from 'express';
import { 
  validateAgentOwnership, 
  optionalAgentOwnership, 
  validateAgentOwnershipFromBody,
  AgentOwnershipRequest 
} from '../../middleware/agentOwnership';
import AgentModel from '../../models/Agent';

// Mock the Agent model
const mockFindOne = jest.fn();
jest.mock('../../models/Agent', () => ({
  default: {
    findOne: mockFindOne,
  },
}));

describe('Agent Ownership Middleware Tests', () => {
  let mockRequest: Partial<AgentOwnershipRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    
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
      status: mockStatus,
      json: mockJson,
    };
    
    mockNext = jest.fn();
    
    jest.clearAllMocks();
    mockFindOne.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateAgentOwnership middleware', () => {
    test('should pass validation when user owns the agent', async () => {
      const mockAgent = {
        id: 'agent1-id',
        user_id: 'user1-id',
        name: 'Test Agent',
      };

      mockRequest.params = { agentId: 'agent1-id' };
      (AgentModel.findOne as jest.Mock).mockResolvedValue(mockAgent);

      await validateAgentOwnership(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(AgentModel.findOne).toHaveBeenCalledWith({
        id: 'agent1-id',
        user_id: 'user1-id',
      });
      expect(mockRequest.agent).toBe(mockAgent);
      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    test('should reject when user does not own the agent', async () => {
      mockRequest.params = { agentId: 'agent2-id' };
      (AgentModel.findOne as jest.Mock).mockResolvedValue(null);

      await validateAgentOwnership(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(AgentModel.findOne).toHaveBeenCalledWith({
        id: 'agent2-id',
        user_id: 'user1-id',
      });
      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
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

      await validateAgentOwnership(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'User must be authenticated to access agent data',
          timestamp: expect.any(Date),
        },
      });
      expect(AgentModel.findOne).not.toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should skip validation when no agentId is provided', async () => {
      mockRequest.params = {};

      await validateAgentOwnership(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(AgentModel.findOne).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    test('should reject invalid UUID format', async () => {
      mockRequest.params = { agentId: 'invalid-uuid' };

      await validateAgentOwnership(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_AGENT_ID',
          message: 'Invalid agent ID format',
          timestamp: expect.any(Date),
        },
      });
      expect(AgentModel.findOne).not.toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should handle database errors gracefully', async () => {
      mockRequest.params = { agentId: 'agent1-id' };
      (AgentModel.findOne as jest.Mock).mockRejectedValue(new Error('Database error'));

      await validateAgentOwnership(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AGENT_VALIDATION_ERROR',
          message: 'Failed to validate agent ownership',
          timestamp: expect.any(Date),
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should work with different parameter names', async () => {
      const mockAgent = {
        id: 'agent1-id',
        user_id: 'user1-id',
        name: 'Test Agent',
      };

      // Test with 'id' parameter instead of 'agentId'
      mockRequest.params = { id: 'agent1-id' };
      (AgentModel.findOne as jest.Mock).mockResolvedValue(mockAgent);

      await validateAgentOwnership(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(AgentModel.findOne).toHaveBeenCalledWith({
        id: 'agent1-id',
        user_id: 'user1-id',
      });
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('optionalAgentOwnership middleware', () => {
    test('should pass validation when user owns the agent', async () => {
      const mockAgent = {
        id: 'agent1-id',
        user_id: 'user1-id',
        name: 'Test Agent',
      };

      mockRequest.params = { agentId: 'agent1-id' };
      (AgentModel.findOne as jest.Mock).mockResolvedValue(mockAgent);

      await optionalAgentOwnership(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.agent).toBe(mockAgent);
      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    test('should continue without error when agent is not found', async () => {
      mockRequest.params = { agentId: 'agent2-id' };
      (AgentModel.findOne as jest.Mock).mockResolvedValue(null);

      await optionalAgentOwnership(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.agent).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    test('should continue when user is not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.userId = undefined;
      mockRequest.params = { agentId: 'agent1-id' };

      await optionalAgentOwnership(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(AgentModel.findOne).not.toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    test('should continue when no agentId is provided', async () => {
      mockRequest.params = {};

      await optionalAgentOwnership(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(AgentModel.findOne).not.toHaveBeenCalled();
    });

    test('should continue when agentId format is invalid', async () => {
      mockRequest.params = { agentId: 'invalid-uuid' };

      await optionalAgentOwnership(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(AgentModel.findOne).not.toHaveBeenCalled();
    });

    test('should handle database errors gracefully', async () => {
      mockRequest.params = { agentId: 'agent1-id' };
      (AgentModel.findOne as jest.Mock).mockRejectedValue(new Error('Database error'));

      await optionalAgentOwnership(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    test('should check query parameters for agentId', async () => {
      const mockAgent = {
        id: 'agent1-id',
        user_id: 'user1-id',
        name: 'Test Agent',
      };

      mockRequest.query = { agentId: 'agent1-id' };
      (AgentModel.findOne as jest.Mock).mockResolvedValue(mockAgent);

      await optionalAgentOwnership(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(AgentModel.findOne).toHaveBeenCalledWith({
        id: 'agent1-id',
        user_id: 'user1-id',
      });
      expect(mockRequest.agent).toBe(mockAgent);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('validateAgentOwnershipFromBody middleware', () => {
    test('should pass validation when user owns the agent from body', async () => {
      const mockAgent = {
        id: 'agent1-id',
        user_id: 'user1-id',
        name: 'Test Agent',
      };

      mockRequest.body = { agentId: 'agent1-id' };
      (AgentModel.findOne as jest.Mock).mockResolvedValue(mockAgent);

      await validateAgentOwnershipFromBody(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(AgentModel.findOne).toHaveBeenCalledWith({
        id: 'agent1-id',
        user_id: 'user1-id',
      });
      expect(mockRequest.agent).toBe(mockAgent);
      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    test('should work with agent_id field name', async () => {
      const mockAgent = {
        id: 'agent1-id',
        user_id: 'user1-id',
        name: 'Test Agent',
      };

      mockRequest.body = { agent_id: 'agent1-id' };
      (AgentModel.findOne as jest.Mock).mockResolvedValue(mockAgent);

      await validateAgentOwnershipFromBody(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(AgentModel.findOne).toHaveBeenCalledWith({
        id: 'agent1-id',
        user_id: 'user1-id',
      });
      expect(mockNext).toHaveBeenCalled();
    });

    test('should reject when user does not own the agent', async () => {
      mockRequest.body = { agentId: 'agent2-id' };
      (AgentModel.findOne as jest.Mock).mockResolvedValue(null);

      await validateAgentOwnershipFromBody(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
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
      mockRequest.body = { agentId: 'agent1-id' };

      await validateAgentOwnershipFromBody(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'User must be authenticated to access agent data',
          timestamp: expect.any(Date),
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should skip validation when no agentId is in body', async () => {
      mockRequest.body = {};

      await validateAgentOwnershipFromBody(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(AgentModel.findOne).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    test('should reject invalid UUID format in body', async () => {
      mockRequest.body = { agentId: 'invalid-uuid' };

      await validateAgentOwnershipFromBody(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_AGENT_ID',
          message: 'Invalid agent ID format in request body',
          timestamp: expect.any(Date),
        },
      });
      expect(AgentModel.findOne).not.toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Security Edge Cases', () => {
    test('should prevent SQL injection attempts in agent ID', async () => {
      const maliciousId = "'; DROP TABLE agents; --";
      mockRequest.params = { agentId: maliciousId };

      await validateAgentOwnership(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_AGENT_ID',
          message: 'Invalid agent ID format',
          timestamp: expect.any(Date),
        },
      });
      expect(AgentModel.findOne).not.toHaveBeenCalled();
    });

    test('should handle null/undefined agent ID gracefully', async () => {
      mockRequest.params = {};

      await validateAgentOwnership(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(AgentModel.findOne).not.toHaveBeenCalled();
    });

    test('should not leak agent information in error messages', async () => {
      mockRequest.params = { agentId: 'agent2-id' };
      (AgentModel.findOne as jest.Mock).mockResolvedValue(null);

      await validateAgentOwnership(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const errorCall = mockJson.mock.calls[0][0];
      const errorMessage = errorCall.error.message;

      // Error message should not contain the agent ID or any sensitive info
      expect(errorMessage).not.toContain('agent2-id');
      expect(errorMessage).not.toContain('user1-id');
      expect(errorMessage).toBe('Agent not found or access denied');
    });

    test('should handle concurrent requests safely', async () => {
      const mockAgent = {
        id: 'agent1-id',
        user_id: 'user1-id',
        name: 'Test Agent',
      };

      mockRequest.params = { agentId: 'agent1-id' };
      (AgentModel.findOne as jest.Mock).mockResolvedValue(mockAgent);

      // Simulate concurrent requests
      const promises = Array(10).fill(null).map(() =>
        validateAgentOwnership(
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        )
      );

      await Promise.all(promises);

      // All requests should succeed
      expect(mockNext).toHaveBeenCalledTimes(10);
      expect(mockStatus).not.toHaveBeenCalled();
    });
  });

  describe('Performance and Caching', () => {
    test('should make database query for each validation', async () => {
      const mockAgent = {
        id: 'agent1-id',
        user_id: 'user1-id',
        name: 'Test Agent',
      };

      mockRequest.params = { agentId: 'agent1-id' };
      (AgentModel.findOne as jest.Mock).mockResolvedValue(mockAgent);

      // First call
      await validateAgentOwnership(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Second call
      await validateAgentOwnership(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Should make database query each time (no caching in middleware)
      expect(AgentModel.findOne).toHaveBeenCalledTimes(2);
    });

    test('should handle database timeout gracefully', async () => {
      mockRequest.params = { agentId: 'agent1-id' };
      
      // Simulate database timeout
      (AgentModel.findOne as jest.Mock).mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 100)
        )
      );

      await validateAgentOwnership(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AGENT_VALIDATION_ERROR',
          message: 'Failed to validate agent ownership',
          timestamp: expect.any(Date),
        },
      });
    });
  });
});