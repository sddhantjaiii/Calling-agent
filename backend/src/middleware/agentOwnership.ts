import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import AgentModel, { AgentInterface } from '../models/Agent';

// Extend AuthenticatedRequest to include agent
export interface AgentOwnershipRequest extends AuthenticatedRequest {
  agent?: AgentInterface;
}

/**
 * Middleware to validate that the authenticated user owns the requested agent
 * This prevents cross-agent data contamination by ensuring users can only access their own agents
 */
export const validateAgentOwnership = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authReq = req as AgentOwnershipRequest;
  try {
    // Ensure user is authenticated first
    if (!authReq.user || !authReq.userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'User must be authenticated to access agent data',
          timestamp: new Date(),
        },
      });
      return;
    }

    // Extract agent ID from request parameters
    const agentId = authReq.params.agentId || authReq.params.id;
    
    // If no agent ID is provided, skip validation (for endpoints that don't require specific agent)
    if (!agentId) {
      next();
      return;
    }

    // Validate agent ID format (basic UUID check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(agentId)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_AGENT_ID',
          message: 'Invalid agent ID format',
          timestamp: new Date(),
        },
      });
      return;
    }

    // Check if agent exists and belongs to the authenticated user
    const agent = await AgentModel.findOne({ 
      id: agentId, 
      user_id: authReq.userId 
    });

    if (!agent) {
      res.status(403).json({
        success: false,
        error: {
          code: 'AGENT_ACCESS_DENIED',
          message: 'Agent not found or access denied',
          timestamp: new Date(),
        },
      });
      return;
    }

    // Attach validated agent to request for downstream use
    authReq.agent = agent;
    
    next();
  } catch (error) {
    console.error('Agent ownership validation error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AGENT_VALIDATION_ERROR',
        message: 'Failed to validate agent ownership',
        timestamp: new Date(),
      },
    });
  }
};

/**
 * Optional agent ownership validation - doesn't fail if agent doesn't exist
 * Useful for endpoints that may or may not have agent-specific data
 */
export const optionalAgentOwnership = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authReq = req as AgentOwnershipRequest;
  try {
    // Ensure user is authenticated first
    if (!authReq.user || !authReq.userId) {
      next();
      return;
    }

    // Extract agent ID from request parameters or query parameters
    const agentId = authReq.params.agentId || authReq.params.id || authReq.query.agentId as string;
    
    // If no agent ID is provided, skip validation
    if (!agentId) {
      next();
      return;
    }

    // Validate agent ID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(agentId)) {
      next();
      return;
    }

    // Check if agent exists and belongs to the authenticated user
    const agent = await AgentModel.findOne({ 
      id: agentId, 
      user_id: authReq.userId 
    });

    // Only attach agent if it exists and belongs to user
    if (agent) {
      authReq.agent = agent;
    }
    
    next();
  } catch (error) {
    console.error('Optional agent ownership validation error:', error);
    // Continue without failing the request
    next();
  }
};

/**
 * Middleware to validate agent ownership from request body
 * Useful for POST/PUT requests where agent ID is in the body
 */
export const validateAgentOwnershipFromBody = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authReq = req as AgentOwnershipRequest;
  try {
    // Ensure user is authenticated first
    if (!authReq.user || !authReq.userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'User must be authenticated to access agent data',
          timestamp: new Date(),
        },
      });
      return;
    }

    // Extract agent ID from request body
    const agentId = authReq.body.agentId || authReq.body.agent_id;
    
    // If no agent ID is provided, skip validation
    if (!agentId) {
      next();
      return;
    }

    // Validate agent ID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(agentId)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_AGENT_ID',
          message: 'Invalid agent ID format in request body',
          timestamp: new Date(),
        },
      });
      return;
    }

    // Check if agent exists and belongs to the authenticated user
    const agent = await AgentModel.findOne({ 
      id: agentId, 
      user_id: authReq.userId 
    });

    if (!agent) {
      res.status(403).json({
        success: false,
        error: {
          code: 'AGENT_ACCESS_DENIED',
          message: 'Agent not found or access denied',
          timestamp: new Date(),
        },
      });
      return;
    }

    // Attach validated agent to request for downstream use
    authReq.agent = agent;
    
    next();
  } catch (error) {
    console.error('Agent ownership validation from body error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AGENT_VALIDATION_ERROR',
        message: 'Failed to validate agent ownership',
        timestamp: new Date(),
      },
    });
  }
};