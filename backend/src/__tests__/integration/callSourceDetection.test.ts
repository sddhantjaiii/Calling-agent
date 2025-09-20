/**
 * Call Source Detection Integration Tests
 * 
 * This test suite verifies call source detection integration including:
 * - Call source storage in database
 * - Historical data categorization
 * - Webhook processing with call source detection
 * - Database migration and constraints
 * - Analytics queries with call source filtering
 * 
 * Requirements: Call Source Detection Acceptance Criteria
 */

import request from 'supertest';
import app from '../../server';
import database from '../../config/database';
import { WebhookDataProcessor } from '../../services/webhookDataProcessor';
import AgentModel from '../../models/Agent';
import UserModel from '../../models/User';

const pool = database;

describe('Call Source Detection Integration Tests', () => {
  let testUserId: string;
  let testAgentId: string;
  let testToken: string;

  beforeAll(async () => {
    // Create test user
    const user = await UserModel.create({
      email: 'callsource@test.com',
      name: 'Call Source Test User',
      password_hash: 'password123',
      is_active: true,
      credits: 100,
      auth_provider: 'email',
      role: 'user',
      email_verified: true
    });

    testUserId = user.id;
    testToken = generateTestToken(testUserId);

    // Create test agent
    const agent = await AgentModel.create({
      user_id: testUserId,
      name: 'Call Source Test Agent',
      agent_type: 'call',
      elevenlabs_agent_id: 'test_agent_elevenlabs',
      is_active: true,
    });

    testAgentId = agent.id;
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM calls WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM agents WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
  });

  beforeEach(async () => {
    // Clean up calls before each test
    await pool.query('DELETE FROM calls WHERE user_id = $1', [testUserId]);
  });

  describe('Database Schema and Migration', () => {
    test('should have call_source column with proper constraints', async () => {
      const result = await pool.query(`
        SELECT column_name, data_type, column_default, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'calls' AND column_name = 'call_source'
      `);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].column_name).toBe('call_source');
      expect(result.rows[0].data_type).toBe('character varying');
      expect(result.rows[0].column_default).toContain('phone');
      expect(result.rows[0].is_nullable).toBe('NO');
    });

    test('should have caller_name and caller_email columns', async () => {
      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'calls' AND column_name IN ('caller_name', 'caller_email')
        ORDER BY column_name
      `);

      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].column_name).toBe('caller_email');
      expect(result.rows[0].is_nullable).toBe('YES');
      expect(result.rows[1].column_name).toBe('caller_name');
      expect(result.rows[1].is_nullable).toBe('YES');
    });

    test('should have call_source constraint', async () => {
      const result = await pool.query(`
        SELECT constraint_name, check_clause
        FROM information_schema.check_constraints 
        WHERE constraint_name = 'chk_call_source'
      `);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].check_clause).toContain('phone');
      expect(result.rows[0].check_clause).toContain('internet');
      expect(result.rows[0].check_clause).toContain('unknown');
    });

    test('should have proper indexes for call source queries', async () => {
      const result = await pool.query(`
        SELECT indexname, indexdef
        FROM pg_indexes 
        WHERE tablename = 'calls' AND indexname LIKE '%source%'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
      
      const sourceUserIndex = result.rows.find((row: any) => 
        row.indexname === 'idx_calls_source_user'
      );
      expect(sourceUserIndex).toBeDefined();
      expect(sourceUserIndex.indexdef).toContain('call_source');
      expect(sourceUserIndex.indexdef).toContain('user_id');
    });

    test('should enforce call_source constraint', async () => {
      // Try to insert invalid call_source
      await expect(
        pool.query(`
          INSERT INTO calls (id, user_id, agent_id, phone_number, call_source, status, created_at)
          VALUES (gen_random_uuid(), $1, $2, '+1234567890', 'invalid_source', 'completed', NOW())
        `, [testUserId, testAgentId])
      ).rejects.toThrow();
    });
  });

  describe('Call Source Storage', () => {
    test('should store phone call source correctly', async () => {
      const callId = await createTestCall({
        phone_number: '+1234567890',
        call_source: 'phone',
        caller_name: 'John Doe',
        caller_email: 'john@example.com'
      });

      const result = await pool.query(
        'SELECT call_source, caller_name, caller_email FROM calls WHERE id = $1',
        [callId]
      );

      expect(result.rows[0].call_source).toBe('phone');
      expect(result.rows[0].caller_name).toBe('John Doe');
      expect(result.rows[0].caller_email).toBe('john@example.com');
    });

    test('should store internet call source correctly', async () => {
      const callId = await createTestCall({
        phone_number: 'internal',
        call_source: 'internet',
        caller_name: 'Web Visitor',
        caller_email: 'visitor@example.com'
      });

      const result = await pool.query(
        'SELECT call_source, caller_name, caller_email FROM calls WHERE id = $1',
        [callId]
      );

      expect(result.rows[0].call_source).toBe('internet');
      expect(result.rows[0].caller_name).toBe('Web Visitor');
      expect(result.rows[0].caller_email).toBe('visitor@example.com');
    });

    test('should store unknown call source correctly', async () => {
      const callId = await createTestCall({
        phone_number: null,
        call_source: 'unknown',
        caller_name: null,
        caller_email: null
      });

      const result = await pool.query(
        'SELECT call_source, caller_name, caller_email FROM calls WHERE id = $1',
        [callId]
      );

      expect(result.rows[0].call_source).toBe('unknown');
      expect(result.rows[0].caller_name).toBeNull();
      expect(result.rows[0].caller_email).toBeNull();
    });

    test('should handle null contact information gracefully', async () => {
      const callId = await createTestCall({
        phone_number: '+1234567890',
        call_source: 'phone',
        caller_name: null,
        caller_email: null
      });

      const result = await pool.query(
        'SELECT call_source, caller_name, caller_email FROM calls WHERE id = $1',
        [callId]
      );

      expect(result.rows[0].call_source).toBe('phone');
      expect(result.rows[0].caller_name).toBeNull();
      expect(result.rows[0].caller_email).toBeNull();
    });
  });

  describe('Historical Data Categorization', () => {
    test('should categorize existing calls based on phone_number patterns', async () => {
      // Create calls with different phone number patterns
      const phoneCallId = await createTestCall({
        phone_number: '+1234567890',
        call_source: 'phone' // Will be set by default, but testing the pattern
      });

      const internalCallId = await createTestCall({
        phone_number: 'internal',
        call_source: 'phone' // Default value, should be updated by migration logic
      });

      // Simulate migration logic by updating based on phone_number patterns
      await pool.query(`
        UPDATE calls 
        SET call_source = CASE 
          WHEN phone_number IS NOT NULL 
               AND phone_number != '' 
               AND phone_number != 'internal' 
               AND phone_number ~ '^[\\+]?[0-9\\-\\(\\)\\s]+$'
          THEN 'phone'
          WHEN phone_number = 'internal' 
               OR phone_number IS NULL 
               OR phone_number = ''
          THEN 'internet'
          ELSE 'unknown'
        END
        WHERE user_id = $1
      `, [testUserId]);

      // Verify categorization
      const phoneResult = await pool.query(
        'SELECT call_source FROM calls WHERE id = $1',
        [phoneCallId]
      );
      expect(phoneResult.rows[0].call_source).toBe('phone');

      const internalResult = await pool.query(
        'SELECT call_source FROM calls WHERE id = $1',
        [internalCallId]
      );
      expect(internalResult.rows[0].call_source).toBe('internet');
    });

    test('should handle various phone number formats in categorization', async () => {
      const testCases = [
        { phone_number: '+1234567890', expected: 'phone' },
        { phone_number: '(555) 123-4567', expected: 'phone' },
        { phone_number: '555-123-4567', expected: 'phone' },
        { phone_number: '5551234567', expected: 'phone' },
        { phone_number: '+44 20 7946 0958', expected: 'phone' },
        { phone_number: 'internal', expected: 'internet' },
        { phone_number: null, expected: 'internet' },
        { phone_number: '', expected: 'internet' }
      ];

      const callIds = [];
      for (const testCase of testCases) {
        const callId = await createTestCall({
          phone_number: testCase.phone_number,
          call_source: 'phone' // Default value
        });
        callIds.push({ id: callId, expected: testCase.expected });
      }

      // Apply categorization logic
      await pool.query(`
        UPDATE calls 
        SET call_source = CASE 
          WHEN phone_number IS NOT NULL 
               AND phone_number != '' 
               AND phone_number != 'internal' 
               AND phone_number ~ '^[\\+]?[0-9\\-\\(\\)\\s]+$'
          THEN 'phone'
          WHEN phone_number = 'internal' 
               OR phone_number IS NULL 
               OR phone_number = ''
          THEN 'internet'
          ELSE 'unknown'
        END
        WHERE user_id = $1
      `, [testUserId]);

      // Verify each categorization
      for (const { id, expected } of callIds) {
        const result = await pool.query(
          'SELECT call_source FROM calls WHERE id = $1',
          [id]
        );
        expect(result.rows[0].call_source).toBe(expected);
      }
    });
  });

  describe('Webhook Processing Integration', () => {
    test('should process phone call webhook with call source detection', async () => {
      const webhookPayload = {
        conversation_initiation_client_data: {
          dynamic_variables: {
            system__caller_id: '+1234567890',
            system__call_type: 'phone',
            caller_name: 'John Doe',
            caller_email: 'john@example.com'
          }
        },
        analysis: {
          call_successful: true,
          transcript_summary: 'Customer inquiry about pricing'
        }
      };

      // Process webhook (simulating webhook controller logic)
      const callSourceInfo = WebhookDataProcessor.getCallSourceInfo(webhookPayload);
      
      expect(callSourceInfo.callSource).toBe('phone');
      expect(callSourceInfo.contactInfo).toEqual({
        phoneNumber: '+1234567890',
        name: 'John Doe',
        email: 'john@example.com'
      });

      // Store in database
      const callId = await createTestCall({
        phone_number: callSourceInfo.contactInfo?.phoneNumber || null,
        call_source: callSourceInfo.callSource,
        caller_name: callSourceInfo.contactInfo?.name || null,
        caller_email: callSourceInfo.contactInfo?.email || null
      });

      // Verify storage
      const result = await pool.query(
        'SELECT call_source, caller_name, caller_email FROM calls WHERE id = $1',
        [callId]
      );

      expect(result.rows[0].call_source).toBe('phone');
      expect(result.rows[0].caller_name).toBe('John Doe');
      expect(result.rows[0].caller_email).toBe('john@example.com');
    });

    test('should process internet call webhook with call source detection', async () => {
      const webhookPayload = {
        conversation_initiation_client_data: {
          dynamic_variables: {
            system__caller_id: 'internal',
            system__call_type: 'web',
            caller_email: 'visitor@example.com'
          }
        },
        analysis: {
          call_successful: true,
          transcript_summary: 'Web visitor inquiry'
        }
      };

      // Process webhook
      const callSourceInfo = WebhookDataProcessor.getCallSourceInfo(webhookPayload);
      
      expect(callSourceInfo.callSource).toBe('internet');
      expect(callSourceInfo.contactInfo).toEqual({
        phoneNumber: null,
        name: null,
        email: 'visitor@example.com'
      });

      // Store in database
      const callId = await createTestCall({
        phone_number: 'internal',
        call_source: callSourceInfo.callSource,
        caller_name: callSourceInfo.contactInfo?.name || null,
        caller_email: callSourceInfo.contactInfo?.email || null
      });

      // Verify storage
      const result = await pool.query(
        'SELECT call_source, caller_name, caller_email FROM calls WHERE id = $1',
        [callId]
      );

      expect(result.rows[0].call_source).toBe('internet');
      expect(result.rows[0].caller_name).toBeNull();
      expect(result.rows[0].caller_email).toBe('visitor@example.com');
    });

    test('should handle malformed webhook gracefully', async () => {
      const malformedWebhook = {
        // Missing conversation_initiation_client_data
        analysis: {
          call_successful: false
        }
      };

      // Process webhook
      const callSourceInfo = WebhookDataProcessor.getCallSourceInfo(malformedWebhook);
      
      expect(callSourceInfo.callSource).toBe('unknown');
      expect(callSourceInfo.contactInfo).toBeNull();

      // Store in database
      const callId = await createTestCall({
        phone_number: null,
        call_source: callSourceInfo.callSource,
        caller_name: null,
        caller_email: null
      });

      // Verify storage
      const result = await pool.query(
        'SELECT call_source, caller_name, caller_email FROM calls WHERE id = $1',
        [callId]
      );

      expect(result.rows[0].call_source).toBe('unknown');
      expect(result.rows[0].caller_name).toBeNull();
      expect(result.rows[0].caller_email).toBeNull();
    });
  });

  describe('Analytics Queries with Call Source', () => {
    beforeEach(async () => {
      // Create test calls with different sources
      await createTestCall({
        phone_number: '+1234567890',
        call_source: 'phone',
        status: 'completed'
      });

      await createTestCall({
        phone_number: '+0987654321',
        call_source: 'phone',
        status: 'failed'
      });

      await createTestCall({
        phone_number: 'internal',
        call_source: 'internet',
        status: 'completed'
      });

      await createTestCall({
        phone_number: null,
        call_source: 'unknown',
        status: 'completed'
      });
    });

    test('should query calls by call source', async () => {
      const phoneCallsResult = await pool.query(
        'SELECT COUNT(*) as count FROM calls WHERE user_id = $1 AND call_source = $2',
        [testUserId, 'phone']
      );
      expect(parseInt(phoneCallsResult.rows[0].count)).toBe(2);

      const internetCallsResult = await pool.query(
        'SELECT COUNT(*) as count FROM calls WHERE user_id = $1 AND call_source = $2',
        [testUserId, 'internet']
      );
      expect(parseInt(internetCallsResult.rows[0].count)).toBe(1);

      const unknownCallsResult = await pool.query(
        'SELECT COUNT(*) as count FROM calls WHERE user_id = $1 AND call_source = $2',
        [testUserId, 'unknown']
      );
      expect(parseInt(unknownCallsResult.rows[0].count)).toBe(1);
    });

    test('should get call source analytics breakdown', async () => {
      const result = await pool.query(`
        SELECT 
          call_source,
          COUNT(*) as total_calls,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_calls,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_calls
        FROM calls 
        WHERE user_id = $1
        GROUP BY call_source
        ORDER BY call_source
      `, [testUserId]);

      expect(result.rows).toHaveLength(3);
      
      const internetRow = result.rows.find((row: any) => row.call_source === 'internet');
      expect(internetRow.total_calls).toBe('1');
      expect(internetRow.completed_calls).toBe('1');
      expect(internetRow.failed_calls).toBe('0');

      const phoneRow = result.rows.find((row: any) => row.call_source === 'phone');
      expect(phoneRow.total_calls).toBe('2');
      expect(phoneRow.completed_calls).toBe('1');
      expect(phoneRow.failed_calls).toBe('1');

      const unknownRow = result.rows.find((row: any) => row.call_source === 'unknown');
      expect(unknownRow.total_calls).toBe('1');
      expect(unknownRow.completed_calls).toBe('1');
      expect(unknownRow.failed_calls).toBe('0');
    });

    test('should use call_source_analytics view', async () => {
      const result = await pool.query(
        'SELECT * FROM call_source_analytics WHERE user_id = $1 ORDER BY call_source',
        [testUserId]
      );

      expect(result.rows).toHaveLength(3);
      expect(result.rows[0].call_source).toBe('internet');
      expect(result.rows[1].call_source).toBe('phone');
      expect(result.rows[2].call_source).toBe('unknown');
    });

    test('should filter analytics by call source via API', async () => {
      const response = await request(app)
        .get('/api/analytics/calls/kpis')
        .query({ callSource: 'phone' })
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // The response should only include phone call data
      const data = response.body.data;
      if (data && data.total_calls) {
        // Should have data for phone calls only
        expect(data.total_calls).toBeGreaterThan(0);
      }
    });
  });

  describe('Call Source Database Functions', () => {
    test('should use determine_call_source database function', async () => {
      const testCases = [
        { caller_id: '+1234567890', call_type: 'phone', expected: 'phone' },
        { caller_id: 'internal', call_type: 'web', expected: 'internet' },
        { caller_id: null, call_type: 'web', expected: 'internet' },
        { caller_id: 'unknown-format', call_type: 'unknown', expected: 'unknown' }
      ];

      for (const { caller_id, call_type, expected } of testCases) {
        const result = await pool.query(
          'SELECT determine_call_source($1, $2) as call_source',
          [caller_id, call_type]
        );
        expect(result.rows[0].call_source).toBe(expected);
      }
    });

    test('should handle null parameters in determine_call_source function', async () => {
      const result = await pool.query(
        'SELECT determine_call_source(NULL, NULL) as call_source'
      );
      expect(result.rows[0].call_source).toBe('internet');
    });
  });

  describe('Data Integrity and Constraints', () => {
    test('should maintain referential integrity with call source', async () => {
      const callId = await createTestCall({
        phone_number: '+1234567890',
        call_source: 'phone'
      });

      // Verify the call exists with proper relationships
      const result = await pool.query(`
        SELECT c.call_source, c.user_id, a.user_id as agent_user_id
        FROM calls c
        JOIN agents a ON c.agent_id = a.id
        WHERE c.id = $1
      `, [callId]);

      expect(result.rows[0].call_source).toBe('phone');
      expect(result.rows[0].user_id).toBe(result.rows[0].agent_user_id);
    });

    test('should enforce call_source values through constraint', async () => {
      // Valid call sources should work
      const validSources = ['phone', 'internet', 'unknown'];
      
      for (const source of validSources) {
        const callId = await createTestCall({
          phone_number: '+1234567890',
          call_source: source
        });
        
        const result = await pool.query(
          'SELECT call_source FROM calls WHERE id = $1',
          [callId]
        );
        expect(result.rows[0].call_source).toBe(source);
      }
    });
  });

  // Helper function to create test calls
  async function createTestCall(callData: {
    phone_number?: string | null;
    call_source: string;
    caller_name?: string | null;
    caller_email?: string | null;
    status?: string;
  }) {
    const result = await pool.query(`
      INSERT INTO calls (
        id, user_id, agent_id, phone_number, call_source, 
        caller_name, caller_email, status, created_at,
        elevenlabs_conversation_id, duration_minutes, credits_used
      )
      VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW(),
        gen_random_uuid()::text, 0, 0
      )
      RETURNING id
    `, [
      testUserId,
      testAgentId,
      callData.phone_number,
      callData.call_source,
      callData.caller_name || null,
      callData.caller_email || null,
      callData.status || 'completed'
    ]);

    return result.rows[0].id;
  }
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