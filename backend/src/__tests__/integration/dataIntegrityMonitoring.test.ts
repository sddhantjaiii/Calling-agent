import request from 'supertest';
import app from '../../server';
import { pool } from '../../config/database';
import { dataIntegrityMonitor } from '../../services/dataIntegrityMonitor';
import { dataIntegrityAlerts } from '../../services/dataIntegrityAlerts';

describe('Data Integrity Monitoring Integration Tests', () => {
  let adminToken: string;
  let regularUserToken: string;
  let testUserId1: string;
  let testUserId2: string;
  let testAgentId1: string;
  let testAgentId2: string;

  beforeAll(async () => {
    // Create test users
    const user1Result = await pool.query(`
      INSERT INTO users (id, email, password_hash, role, created_at)
      VALUES (gen_random_uuid(), 'testuser1@example.com', 'hash1', 'user', NOW())
      RETURNING id
    `);
    testUserId1 = user1Result.rows[0].id;

    const user2Result = await pool.query(`
      INSERT INTO users (id, email, password_hash, role, created_at)
      VALUES (gen_random_uuid(), 'testuser2@example.com', 'hash2', 'user', NOW())
      RETURNING id
    `);
    testUserId2 = user2Result.rows[0].id;

    // Create admin user
    const adminResult = await pool.query(`
      INSERT INTO users (id, email, password_hash, role, created_at)
      VALUES (gen_random_uuid(), 'admin@example.com', 'adminhash', 'admin', NOW())
      RETURNING id
    `);

    // Create test agents
    const agent1Result = await pool.query(`
      INSERT INTO agents (id, user_id, name, voice_id, created_at)
      VALUES (gen_random_uuid(), $1, 'Test Agent 1', 'voice1', NOW())
      RETURNING id
    `, [testUserId1]);
    testAgentId1 = agent1Result.rows[0].id;

    const agent2Result = await pool.query(`
      INSERT INTO agents (id, user_id, name, voice_id, created_at)
      VALUES (gen_random_uuid(), $2, 'Test Agent 2', 'voice2', NOW())
      RETURNING id
    `, [testUserId2]);
    testAgentId2 = agent2Result.rows[0].id;

    // Get auth tokens (mock implementation)
    adminToken = 'mock-admin-token';
    regularUserToken = 'mock-user-token';
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM calls WHERE user_id IN ($1, $2)', [testUserId1, testUserId2]);
    await pool.query('DELETE FROM agents WHERE user_id IN ($1, $2)', [testUserId1, testUserId2]);
    await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [testUserId1, testUserId2]);
    await pool.query('DELETE FROM users WHERE email = $1', ['admin@example.com']);
  });

  describe('Cross-Agent Data Contamination Detection', () => {
    beforeEach(async () => {
      // Clean up any existing calls
      await pool.query('DELETE FROM calls WHERE user_id IN ($1, $2)', [testUserId1, testUserId2]);
    });

    it('should detect no contamination when data is properly isolated', async () => {
      // Create properly isolated calls
      await pool.query(`
        INSERT INTO calls (id, user_id, agent_id, phone_number, status, created_at)
        VALUES 
          (gen_random_uuid(), $1, $2, '+1234567890', 'completed', NOW()),
          (gen_random_uuid(), $3, $4, '+1234567891', 'completed', NOW())
      `, [testUserId1, testAgentId1, testUserId2, testAgentId2]);

      const contamination = await dataIntegrityMonitor.detectCrossAgentContamination();
      expect(contamination).toHaveLength(0);
    });

    it('should detect contamination when calls are assigned to wrong agents', async () => {
      // Create contaminated data - user1's call assigned to user2's agent
      await pool.query(`
        INSERT INTO calls (id, user_id, agent_id, phone_number, status, created_at)
        VALUES (gen_random_uuid(), $1, $2, '+1234567890', 'completed', NOW())
      `, [testUserId1, testAgentId2]); // User1's call with User2's agent

      const contamination = await dataIntegrityMonitor.detectCrossAgentContamination();
      expect(contamination).toHaveLength(1);
      expect(contamination[0].call_user_id).toBe(testUserId1);
      expect(contamination[0].agent_user_id).toBe(testUserId2);
      expect(contamination[0].mismatched_calls).toBe('1');
    });

    it('should classify contamination severity correctly', async () => {
      // Create multiple contaminated calls for severity testing
      const callPromises = [];
      for (let i = 0; i < 15; i++) {
        callPromises.push(
          pool.query(`
            INSERT INTO calls (id, user_id, agent_id, phone_number, status, created_at)
            VALUES (gen_random_uuid(), $1, $2, $3, 'completed', NOW())
          `, [testUserId1, testAgentId2, `+123456789${i}`])
        );
      }
      await Promise.all(callPromises);

      const contamination = await dataIntegrityMonitor.detectCrossAgentContamination();
      expect(contamination).toHaveLength(1);
      expect(contamination[0].severity).toBe('medium'); // 15 calls = medium severity
    });
  });

  describe('Analytics Data Contamination Detection', () => {
    beforeEach(async () => {
      // Clean up existing data
      await pool.query('DELETE FROM lead_analytics WHERE user_id IN ($1, $2)', [testUserId1, testUserId2]);
      await pool.query('DELETE FROM calls WHERE user_id IN ($1, $2)', [testUserId1, testUserId2]);
    });

    it('should detect analytics contamination', async () => {
      // Create a call
      const callResult = await pool.query(`
        INSERT INTO calls (id, user_id, agent_id, phone_number, status, created_at)
        VALUES (gen_random_uuid(), $1, $2, '+1234567890', 'completed', NOW())
        RETURNING id
      `, [testUserId1, testAgentId1]);
      const callId = callResult.rows[0].id;

      // Create analytics record with wrong user_id
      await pool.query(`
        INSERT INTO lead_analytics (id, call_id, user_id, intent_level, created_at)
        VALUES (gen_random_uuid(), $1, $2, 'high', NOW())
      `, [callId, testUserId2]); // Wrong user_id

      const contamination = await dataIntegrityMonitor.detectAnalyticsContamination();
      expect(contamination.length).toBeGreaterThan(0);
      expect(contamination[0].table_name).toBe('lead_analytics');
    });
  });

  describe('Orphaned Records Detection', () => {
    it('should detect calls without valid agents', async () => {
      // Create a call with non-existent agent
      await pool.query(`
        INSERT INTO calls (id, user_id, agent_id, phone_number, status, created_at)
        VALUES (gen_random_uuid(), $1, gen_random_uuid(), '+1234567890', 'completed', NOW())
      `, [testUserId1]);

      const orphaned = await dataIntegrityMonitor.detectOrphanedRecords();
      const callsWithoutAgents = orphaned.filter(r => r.orphan_type === 'missing_agent');
      expect(callsWithoutAgents.length).toBeGreaterThan(0);
    });

    it('should detect analytics without valid calls', async () => {
      // Create analytics record with non-existent call
      await pool.query(`
        INSERT INTO lead_analytics (id, call_id, user_id, intent_level, created_at)
        VALUES (gen_random_uuid(), gen_random_uuid(), $1, 'high', NOW())
      `, [testUserId1]);

      const orphaned = await dataIntegrityMonitor.detectOrphanedRecords();
      const analyticsWithoutCalls = orphaned.filter(r => r.orphan_type === 'missing_call');
      expect(analyticsWithoutCalls.length).toBeGreaterThan(0);
    });
  });

  describe('Trigger Health Monitoring', () => {
    it('should handle missing trigger log table gracefully', async () => {
      // Ensure trigger log table doesn't exist
      await pool.query('DROP TABLE IF EXISTS trigger_execution_log');

      const triggerHealth = await dataIntegrityMonitor.checkTriggerHealth();
      expect(Array.isArray(triggerHealth)).toBe(true);
      expect(triggerHealth).toHaveLength(0);
    });

    it('should detect trigger failures when log table exists', async () => {
      // Create trigger log table and add a failure
      await pool.query(`
        CREATE TABLE IF NOT EXISTS trigger_execution_log (
          id SERIAL PRIMARY KEY,
          trigger_name VARCHAR(255) NOT NULL,
          table_name VARCHAR(255) NOT NULL,
          operation VARCHAR(50) NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'success',
          error_message TEXT,
          execution_time_ms INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        INSERT INTO trigger_execution_log (trigger_name, table_name, operation, status, error_message)
        VALUES ('test_trigger', 'test_table', 'INSERT', 'error', 'Test error message')
      `);

      const triggerHealth = await dataIntegrityMonitor.checkTriggerHealth();
      expect(triggerHealth.length).toBeGreaterThan(0);
      expect(triggerHealth[0].trigger_name).toBe('test_trigger');
      expect(triggerHealth[0].error_message).toBe('Test error message');
    });
  });

  describe('Alert System', () => {
    beforeEach(async () => {
      // Clear any existing alerts
      dataIntegrityAlerts['activeAlerts'].clear();
    });

    it('should generate alerts for cross-agent contamination', async () => {
      // Create contaminated data
      await pool.query('DELETE FROM calls WHERE user_id IN ($1, $2)', [testUserId1, testUserId2]);
      await pool.query(`
        INSERT INTO calls (id, user_id, agent_id, phone_number, status, created_at)
        VALUES (gen_random_uuid(), $1, $2, '+1234567890', 'completed', NOW())
      `, [testUserId1, testAgentId2]);

      const alerts = await dataIntegrityAlerts.checkAlerts();
      const contaminationAlerts = alerts.filter(a => a.rule_id === 'cross-agent-contamination');
      expect(contaminationAlerts.length).toBeGreaterThan(0);
      expect(contaminationAlerts[0].severity).toBe('critical');
    });

    it('should provide detailed alert information', async () => {
      // Create contaminated data
      await pool.query('DELETE FROM calls WHERE user_id IN ($1, $2)', [testUserId1, testUserId2]);
      await pool.query(`
        INSERT INTO calls (id, user_id, agent_id, phone_number, status, created_at)
        VALUES (gen_random_uuid(), $1, $2, '+1234567890', 'completed', NOW())
      `, [testUserId1, testAgentId2]);

      const alerts = await dataIntegrityAlerts.checkAlerts();
      const contaminationAlert = alerts.find(a => a.rule_id === 'cross-agent-contamination');
      
      expect(contaminationAlert).toBeDefined();
      expect(contaminationAlert!.details).toHaveProperty('contaminatedRecords');
      expect(contaminationAlert!.details).toHaveProperty('affectedUsers');
      expect(contaminationAlert!.details.affectedUsers).toHaveLength(1);
    });

    it('should allow acknowledging and resolving alerts', async () => {
      // Create an alert
      await pool.query('DELETE FROM calls WHERE user_id IN ($1, $2)', [testUserId1, testUserId2]);
      await pool.query(`
        INSERT INTO calls (id, user_id, agent_id, phone_number, status, created_at)
        VALUES (gen_random_uuid(), $1, $2, '+1234567890', 'completed', NOW())
      `, [testUserId1, testAgentId2]);

      const alerts = await dataIntegrityAlerts.checkAlerts();
      expect(alerts.length).toBeGreaterThan(0);

      const alertId = alerts[0].id;

      // Acknowledge alert
      const acknowledged = dataIntegrityAlerts.acknowledgeAlert(alertId);
      expect(acknowledged).toBe(true);

      const activeAlerts = dataIntegrityAlerts.getActiveAlerts();
      const acknowledgedAlert = activeAlerts.find(a => a.id === alertId);
      expect(acknowledgedAlert?.status).toBe('acknowledged');

      // Resolve alert
      const resolved = dataIntegrityAlerts.resolveAlert(alertId);
      expect(resolved).toBe(true);

      const resolvedAlert = dataIntegrityAlerts.getActiveAlerts().find(a => a.id === alertId);
      expect(resolvedAlert?.status).toBe('resolved');
    });
  });

  describe('API Endpoints', () => {
    it('should require admin authentication for all endpoints', async () => {
      const endpoints = [
        '/api/data-integrity/metrics',
        '/api/data-integrity/full-check',
        '/api/data-integrity/contamination/cross-agent',
        '/api/data-integrity/dashboard'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .expect(401);
        
        expect(response.body.success).toBe(false);
      }
    });

    it('should return metrics for admin users', async () => {
      // Mock admin authentication
      jest.spyOn(require('../../middleware/auth'), 'authenticateToken')
        .mockImplementation((req: any, res: any, next: any) => {
          req.user = { id: 'admin-id', role: 'admin' };
          next();
        });

      jest.spyOn(require('../../middleware/adminAuth'), 'requireAdmin')
        .mockImplementation((req: any, res: any, next: any) => next());

      const response = await request(app)
        .get('/api/data-integrity/metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('crossAgentContamination');
      expect(response.body.data).toHaveProperty('orphanedRecords');
      expect(response.body.data).toHaveProperty('triggerFailures');
      expect(response.body.data).toHaveProperty('performanceIssues');
      expect(response.body.data).toHaveProperty('lastChecked');
    });

    it('should return full integrity check results', async () => {
      const response = await request(app)
        .get('/api/data-integrity/full-check')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data).toHaveProperty('details');
      expect(response.body.data.details).toHaveProperty('contamination');
      expect(response.body.data.details).toHaveProperty('orphanedRecords');
      expect(response.body.data.details).toHaveProperty('triggerFailures');
    });

    it('should return dashboard data with health score and recommendations', async () => {
      const response = await request(app)
        .get('/api/data-integrity/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('metrics');
      expect(response.body.data).toHaveProperty('details');
      expect(response.body.data).toHaveProperty('alerts');
      expect(response.body.data).toHaveProperty('healthScore');
      expect(response.body.data).toHaveProperty('recommendations');
      expect(Array.isArray(response.body.data.recommendations)).toBe(true);
    });
  });

  describe('Performance and Reliability', () => {
    it('should complete integrity checks within reasonable time', async () => {
      const startTime = Date.now();
      await dataIntegrityMonitor.runFullIntegrityCheck();
      const endTime = Date.now();
      
      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should handle database errors gracefully', async () => {
      // Mock a database error
      const originalQuery = pool.query;
      pool.query = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      try {
        const result = await dataIntegrityMonitor.getDataIntegrityMetrics();
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect((error as Error).message).toContain('Failed to get data integrity metrics');
      }

      // Restore original query method
      pool.query = originalQuery;
    });

    it('should provide consistent results across multiple runs', async () => {
      // Run the same check multiple times
      const results = await Promise.all([
        dataIntegrityMonitor.detectCrossAgentContamination(),
        dataIntegrityMonitor.detectCrossAgentContamination(),
        dataIntegrityMonitor.detectCrossAgentContamination()
      ]);

      // Results should be identical
      expect(results[0]).toEqual(results[1]);
      expect(results[1]).toEqual(results[2]);
    });
  });
});

describe('Data Integrity Monitoring - Edge Cases', () => {
  it('should handle empty database gracefully', async () => {
    // Temporarily clear all data
    await pool.query('DELETE FROM lead_analytics');
    await pool.query('DELETE FROM calls');
    await pool.query('DELETE FROM agents');

    const metrics = await dataIntegrityMonitor.getDataIntegrityMetrics();
    expect(metrics.crossAgentContamination).toBe(0);
    expect(metrics.orphanedRecords).toBe(0);
    expect(metrics.triggerFailures).toBe(0);
  });

  it('should handle very large datasets efficiently', async () => {
    // This test would be skipped in CI but useful for performance testing
    if (process.env.SKIP_PERFORMANCE_TESTS) {
      return;
    }

    // Create a large number of test records
    const batchSize = 1000;
    const batches = 5;

    for (let batch = 0; batch < batches; batch++) {
      const values = [];
      const params = [];
      
      for (let i = 0; i < batchSize; i++) {
        const index = batch * batchSize + i;
        values.push(`(gen_random_uuid(), $${index * 4 + 1}, $${index * 4 + 2}, $${index * 4 + 3}, $${index * 4 + 4}, NOW())`);
        params.push('test-user-id', 'test-agent-id', `+123456${index}`, 'completed');
      }

      await pool.query(`
        INSERT INTO calls (id, user_id, agent_id, phone_number, status, created_at)
        VALUES ${values.join(', ')}
      `, params);
    }

    const startTime = Date.now();
    const contamination = await dataIntegrityMonitor.detectCrossAgentContamination();
    const endTime = Date.now();

    expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds even with 5k records
    
    // Clean up
    await pool.query('DELETE FROM calls WHERE user_id = $1', ['test-user-id']);
  });
});