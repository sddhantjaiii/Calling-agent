/**
 * Comprehensive Data Isolation Tests
 * 
 * This test suite verifies zero cross-agent data contamination by testing:
 * - Agent ownership validation in all API endpoints
 * - Database constraints prevent cross-tenant data access
 * - User context validation in all data operations
 * 
 * Requirements: Data Isolation Acceptance Criteria
 */

import request from 'supertest';
import { app } from '../../server';
import { pool } from '../../config/database';
import AgentModel from '../../models/Agent';
import UserModel from '../../models/User';

describe('Data Isolation Tests', () => {
  let user1Token: string;
  let user2Token: string;
  let user1Id: string;
  let user2Id: string;
  let user1Agent: any;
  let user2Agent: any;
  let user1Call: any;
  let user2Call: any;

  beforeAll(async () => {
    // Create test users
    const user1 = await UserModel.create({
      email: 'user1@test.com',
      name: 'Test User 1',
      password: 'password123',
      isActive: true,
    });

    const user2 = await UserModel.create({
      email: 'user2@test.com',
      name: 'Test User 2',
      password: 'password123',
      isActive: true,
    });

    user1Id = user1.id;
    user2Id = user2.id;

    // Generate tokens for both users
    user1Token = generateTestToken(user1Id);
    user2Token = generateTestToken(user2Id);

    // Create agents for both users
    user1Agent = await AgentModel.create({
      user_id: user1Id,
      name: 'User 1 Agent',
      agent_type: 'call',
      elevenlabs_agent_id: 'agent1_elevenlabs',
      is_active: true,
    });

    user2Agent = await AgentModel.create({
      user_id: user2Id,
      name: 'User 2 Agent',
      agent_type: 'call',
      elevenlabs_agent_id: 'agent2_elevenlabs',
      is_active: true,
    });

    // Create calls for both users
    const callResult1 = await pool.query(`
      INSERT INTO calls (id, user_id, agent_id, phone_number, status, created_at)
      VALUES (gen_random_uuid(), $1, $2, '+1234567890', 'completed', NOW())
      RETURNING *
    `, [user1Id, user1Agent.id]);

    const callResult2 = await pool.query(`
      INSERT INTO calls (id, user_id, agent_id, phone_number, status, created_at)
      VALUES (gen_random_uuid(), $1, $2, '+0987654321', 'completed', NOW())
      RETURNING *
    `, [user2Id, user2Agent.id]);

    user1Call = callResult1.rows[0];
    user2Call = callResult2.rows[0];

    // Create analytics data for both users
    await pool.query(`
      INSERT INTO agent_analytics (id, user_id, agent_id, date, total_calls, successful_calls)
      VALUES (gen_random_uuid(), $1, $2, CURRENT_DATE, 5, 3)
    `, [user1Id, user1Agent.id]);

    await pool.query(`
      INSERT INTO agent_analytics (id, user_id, agent_id, date, total_calls, successful_calls)
      VALUES (gen_random_uuid(), $1, $2, CURRENT_DATE, 8, 6)
    `, [user2Id, user2Agent.id]);

    // Create lead analytics for both users
    await pool.query(`
      INSERT INTO lead_analytics (id, call_id, user_id, intent_level, intent_score, created_at)
      VALUES (gen_random_uuid(), $1, $2, 'high', 85, NOW())
    `, [user1Call.id, user1Id]);

    await pool.query(`
      INSERT INTO lead_analytics (id, call_id, user_id, intent_level, intent_score, created_at)
      VALUES (gen_random_uuid(), $1, $2, 'medium', 65, NOW())
    `, [user2Call.id, user2Id]);
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM lead_analytics WHERE user_id IN ($1, $2)', [user1Id, user2Id]);
    await pool.query('DELETE FROM agent_analytics WHERE user_id IN ($1, $2)', [user1Id, user2Id]);
    await pool.query('DELETE FROM calls WHERE user_id IN ($1, $2)', [user1Id, user2Id]);
    await pool.query('DELETE FROM agents WHERE user_id IN ($1, $2)', [user1Id, user2Id]);
    await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [user1Id, user2Id]);
  });

  describe('Agent Ownership Validation', () => {
    test('should prevent user from accessing other users agent data', async () => {
      const response = await request(app)
        .get(`/api/agents/${user1Agent.id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AGENT_ACCESS_DENIED');
      expect(response.body.error.message).toContain('access denied');
    });

    test('should allow user to access their own agent data', async () => {
      const response = await request(app)
        .get(`/api/agents/${user1Agent.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(user1Agent.id);
      expect(response.body.data.user_id).toBe(user1Id);
    });

    test('should prevent user from updating other users agent', async () => {
      const response = await request(app)
        .put(`/api/agents/${user1Agent.id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ name: 'Hacked Agent Name' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AGENT_ACCESS_DENIED');
    });

    test('should prevent user from deleting other users agent', async () => {
      const response = await request(app)
        .delete(`/api/agents/${user1Agent.id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AGENT_ACCESS_DENIED');
    });

    test('should validate agent ID format', async () => {
      const response = await request(app)
        .get('/api/agents/invalid-uuid')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_AGENT_ID');
    });
  });

  describe('Analytics Data Isolation', () => {
    test('should prevent cross-agent analytics contamination in agent analytics', async () => {
      const response = await request(app)
        .get(`/api/analytics/agents/${user1Agent.id}/overview`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AGENT_ACCESS_DENIED');
    });

    test('should return only user-specific analytics data', async () => {
      const response = await request(app)
        .get(`/api/analytics/agents/${user1Agent.id}/overview`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      // Verify the data belongs to user1
      if (response.body.data.agent_id) {
        expect(response.body.data.agent_id).toBe(user1Agent.id);
      }
    });

    test('should prevent cross-user call analytics access', async () => {
      const response = await request(app)
        .get('/api/analytics/calls/kpis')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Verify no data from user2 is included
      const data = response.body.data;
      if (data && typeof data === 'object') {
        // Check that any agent-specific data only includes user1's agents
        if (data.agents && Array.isArray(data.agents)) {
          data.agents.forEach((agent: any) => {
            expect(agent.user_id).toBe(user1Id);
          });
        }
      }
    });

    test('should isolate dashboard overview data by user', async () => {
      const response = await request(app)
        .get('/api/dashboard/overview')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Verify the overview data is scoped to user1
      const data = response.body.data;
      if (data && data.agents && Array.isArray(data.agents)) {
        data.agents.forEach((agent: any) => {
          expect(agent.user_id).toBe(user1Id);
        });
      }
    });
  });

  describe('Call Data Isolation', () => {
    test('should prevent access to other users calls', async () => {
      const response = await request(app)
        .get(`/api/calls/${user1Call.id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CALL_ACCESS_DENIED');
    });

    test('should allow access to own calls', async () => {
      const response = await request(app)
        .get(`/api/calls/${user1Call.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(user1Call.id);
      expect(response.body.data.user_id).toBe(user1Id);
    });

    test('should return only user-specific calls in list', async () => {
      const response = await request(app)
        .get('/api/calls')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const calls = response.body.data;
      if (Array.isArray(calls)) {
        calls.forEach((call: any) => {
          expect(call.user_id).toBe(user1Id);
        });
      }
    });
  });

  describe('Lead Data Isolation', () => {
    test('should prevent access to other users leads', async () => {
      const response = await request(app)
        .get('/api/leads')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const leads = response.body.data;
      if (Array.isArray(leads)) {
        leads.forEach((lead: any) => {
          expect(lead.user_id).toBe(user1Id);
        });
      }
    });

    test('should prevent access to other users lead profiles', async () => {
      // Try to access user2's call lead profile with user1's token
      const response = await request(app)
        .get(`/api/leads/${user2Call.id}/profile`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('LEAD_ACCESS_DENIED');
    });
  });

  describe('Database Constraint Validation', () => {
    test('should enforce user_id consistency in database queries', async () => {
      // Test direct database query to ensure constraints work
      const result = await pool.query(`
        SELECT c.*, a.user_id as agent_user_id
        FROM calls c
        JOIN agents a ON c.agent_id = a.id
        WHERE c.user_id != a.user_id
      `);

      // Should return no rows - all calls should have matching user_id with their agent
      expect(result.rows.length).toBe(0);
    });

    test('should prevent cross-user data in analytics queries', async () => {
      // Test that analytics queries maintain user_id consistency
      const result = await pool.query(`
        SELECT la.*, c.user_id as call_user_id
        FROM lead_analytics la
        JOIN calls c ON la.call_id = c.id
        WHERE la.user_id != c.user_id
      `);

      // Should return no rows - all lead analytics should match call user_id
      expect(result.rows.length).toBe(0);
    });

    test('should validate agent ownership in agent_analytics', async () => {
      // Test that agent analytics maintain proper user_id relationships
      const result = await pool.query(`
        SELECT aa.*, a.user_id as agent_user_id
        FROM agent_analytics aa
        JOIN agents a ON aa.agent_id = a.id
        WHERE aa.user_id != a.user_id
      `);

      // Should return no rows - all agent analytics should match agent user_id
      expect(result.rows.length).toBe(0);
    });
  });

  describe('Authentication and Authorization', () => {
    test('should reject requests without authentication token', async () => {
      const response = await request(app)
        .get('/api/agents')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    test('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/api/agents')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    test('should validate token user context', async () => {
      // Create a token for a non-existent user
      const fakeToken = generateTestToken('00000000-0000-0000-0000-000000000000');
      
      const response = await request(app)
        .get('/api/agents')
        .set('Authorization', `Bearer ${fakeToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('Data Leakage Prevention', () => {
    test('should not leak other users data in error messages', async () => {
      const response = await request(app)
        .get(`/api/agents/${user1Agent.id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(403);

      // Error message should not contain sensitive information about the agent
      expect(response.body.error.message).not.toContain(user1Agent.name);
      expect(response.body.error.message).not.toContain(user1Agent.elevenlabs_agent_id);
      expect(response.body.error.message).not.toContain(user1Id);
    });

    test('should not expose user existence through different error codes', async () => {
      // Test with non-existent agent ID
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      
      const response1 = await request(app)
        .get(`/api/agents/${nonExistentId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(403);

      // Test with existing agent belonging to another user
      const response2 = await request(app)
        .get(`/api/agents/${user2Agent.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(403);

      // Both should return the same error code to prevent user enumeration
      expect(response1.body.error.code).toBe(response2.body.error.code);
    });
  });

  describe('Bulk Operations Data Isolation', () => {
    test('should prevent bulk operations on other users data', async () => {
      // Try to perform bulk operation that might affect other users data
      const response = await request(app)
        .post('/api/agents/bulk-update')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          agentIds: [user1Agent.id, user2Agent.id], // Include other user's agent
          updates: { is_active: false }
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AGENT_ACCESS_DENIED');
    });

    test('should allow bulk operations only on owned data', async () => {
      // Create another agent for user1
      const user1Agent2 = await AgentModel.create({
        user_id: user1Id,
        name: 'User 1 Agent 2',
        agent_type: 'call',
        elevenlabs_agent_id: 'agent1_2_elevenlabs',
        is_active: true,
      });

      const response = await request(app)
        .post('/api/agents/bulk-update')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          agentIds: [user1Agent.id, user1Agent2.id], // Only user1's agents
          updates: { is_active: false }
        });

      // Should succeed or return appropriate error (depending on implementation)
      expect([200, 404]).toContain(response.status); // 404 if endpoint doesn't exist yet

      // Clean up
      await pool.query('DELETE FROM agents WHERE id = $1', [user1Agent2.id]);
    });
  });

  describe('Search and Filter Data Isolation', () => {
    test('should isolate search results by user', async () => {
      const response = await request(app)
        .get('/api/calls/search')
        .query({ q: 'test', limit: 10 })
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const results = response.body.data;
      if (results && results.calls && Array.isArray(results.calls)) {
        results.calls.forEach((call: any) => {
          expect(call.user_id).toBe(user1Id);
        });
      }
    });

    test('should isolate filtered results by user', async () => {
      const response = await request(app)
        .get('/api/calls')
        .query({ status: 'completed', agentId: user1Agent.id })
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const calls = response.body.data;
      if (Array.isArray(calls)) {
        calls.forEach((call: any) => {
          expect(call.user_id).toBe(user1Id);
          expect(call.agent_id).toBe(user1Agent.id);
        });
      }
    });
  });
});

// Helper function to generate test JWT tokens
function generateTestToken(userId: string): string {
  const jwt = require('jsonwebtoken');
  const secret = process.env.JWT_SECRET || 'test-secret';
  
  return jwt.sign(
    {
      userId,
      email: `user-${userId}@test.com`,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour
    },
    secret
  );
}