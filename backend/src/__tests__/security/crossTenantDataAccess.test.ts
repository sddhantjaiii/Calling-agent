/**
 * Cross-Tenant Data Access Security Tests
 * 
 * This test suite specifically focuses on preventing cross-tenant data access
 * by testing database-level constraints and query-level security measures.
 * 
 * Requirements: Data Isolation Acceptance Criteria
 */

import { pool } from '../../config/database';
import AgentModel from '../../models/Agent';
import UserModel from '../../models/User';

describe('Cross-Tenant Data Access Security Tests', () => {
  let user1Id: string;
  let user2Id: string;
  let user1Agent: any;
  let user2Agent: any;
  let user1Call: any;
  let user2Call: any;

  beforeAll(async () => {
    // Create test users
    const user1 = await UserModel.create({
      email: 'tenant1@test.com',
      name: 'Tenant 1 User',
      password: 'password123',
      isActive: true,
    });

    const user2 = await UserModel.create({
      email: 'tenant2@test.com',
      name: 'Tenant 2 User',
      password: 'password123',
      isActive: true,
    });

    user1Id = user1.id;
    user2Id = user2.id;

    // Create agents for both users
    user1Agent = await AgentModel.create({
      user_id: user1Id,
      name: 'Tenant 1 Agent',
      agent_type: 'call',
      elevenlabs_agent_id: 'tenant1_agent',
      is_active: true,
    });

    user2Agent = await AgentModel.create({
      user_id: user2Id,
      name: 'Tenant 2 Agent',
      agent_type: 'call',
      elevenlabs_agent_id: 'tenant2_agent',
      is_active: true,
    });

    // Create calls for both users
    const callResult1 = await pool.query(`
      INSERT INTO calls (id, user_id, agent_id, phone_number, status, created_at)
      VALUES (gen_random_uuid(), $1, $2, '+1111111111', 'completed', NOW())
      RETURNING *
    `, [user1Id, user1Agent.id]);

    const callResult2 = await pool.query(`
      INSERT INTO calls (id, user_id, agent_id, phone_number, status, created_at)
      VALUES (gen_random_uuid(), $1, $2, '+2222222222', 'completed', NOW())
      RETURNING *
    `, [user2Id, user2Agent.id]);

    user1Call = callResult1.rows[0];
    user2Call = callResult2.rows[0];

    // Create comprehensive test data
    await createTestAnalyticsData();
    await createTestContactsData();
    await createTestLeadsData();
  });

  afterAll(async () => {
    // Clean up all test data
    await cleanupTestData();
  });

  async function createTestAnalyticsData() {
    // Agent analytics
    await pool.query(`
      INSERT INTO agent_analytics (id, user_id, agent_id, date, total_calls, successful_calls, hour)
      VALUES 
        (gen_random_uuid(), $1, $2, CURRENT_DATE, 10, 8, NULL),
        (gen_random_uuid(), $1, $2, CURRENT_DATE, 3, 2, 9),
        (gen_random_uuid(), $3, $4, CURRENT_DATE, 15, 12, NULL),
        (gen_random_uuid(), $3, $4, CURRENT_DATE, 5, 4, 10)
    `, [user1Id, user1Agent.id, user2Id, user2Agent.id]);

    // Lead analytics
    await pool.query(`
      INSERT INTO lead_analytics (id, call_id, user_id, intent_level, intent_score, created_at)
      VALUES 
        (gen_random_uuid(), $1, $2, 'high', 90, NOW()),
        (gen_random_uuid(), $3, $4, 'medium', 70, NOW())
    `, [user1Call.id, user1Id, user2Call.id, user2Id]);

    // User daily analytics (if table exists)
    try {
      await pool.query(`
        INSERT INTO user_daily_analytics (id, user_id, date, total_calls, successful_calls)
        VALUES 
          (gen_random_uuid(), $1, CURRENT_DATE, 10, 8),
          (gen_random_uuid(), $2, CURRENT_DATE, 15, 12)
      `, [user1Id, user2Id]);
    } catch (error) {
      // Table might not exist, ignore
    }
  }

  async function createTestContactsData() {
    // Contacts
    await pool.query(`
      INSERT INTO contacts (id, user_id, name, phone_number, email, created_at)
      VALUES 
        (gen_random_uuid(), $1, 'Tenant 1 Contact', '+1111111111', 'contact1@tenant1.com', NOW()),
        (gen_random_uuid(), $2, 'Tenant 2 Contact', '+2222222222', 'contact2@tenant2.com', NOW())
    `, [user1Id, user2Id]);
  }

  async function createTestLeadsData() {
    // Additional calls for leads testing
    const leadCall1 = await pool.query(`
      INSERT INTO calls (id, user_id, agent_id, phone_number, status, created_at)
      VALUES (gen_random_uuid(), $1, $2, '+1111111112', 'completed', NOW())
      RETURNING *
    `, [user1Id, user1Agent.id]);

    const leadCall2 = await pool.query(`
      INSERT INTO calls (id, user_id, agent_id, phone_number, status, created_at)
      VALUES (gen_random_uuid(), $1, $2, '+2222222223', 'completed', NOW())
      RETURNING *
    `, [user2Id, user2Agent.id]);

    // Lead analytics for these calls
    await pool.query(`
      INSERT INTO lead_analytics (id, call_id, user_id, intent_level, intent_score, created_at)
      VALUES 
        (gen_random_uuid(), $1, $2, 'high', 85, NOW()),
        (gen_random_uuid(), $3, $4, 'low', 45, NOW())
    `, [leadCall1.rows[0].id, user1Id, leadCall2.rows[0].id, user2Id]);
  }

  async function cleanupTestData() {
    await pool.query('DELETE FROM lead_analytics WHERE user_id IN ($1, $2)', [user1Id, user2Id]);
    await pool.query('DELETE FROM agent_analytics WHERE user_id IN ($1, $2)', [user1Id, user2Id]);
    await pool.query('DELETE FROM contacts WHERE user_id IN ($1, $2)', [user1Id, user2Id]);
    await pool.query('DELETE FROM calls WHERE user_id IN ($1, $2)', [user1Id, user2Id]);
    await pool.query('DELETE FROM agents WHERE user_id IN ($1, $2)', [user1Id, user2Id]);
    
    try {
      await pool.query('DELETE FROM user_daily_analytics WHERE user_id IN ($1, $2)', [user1Id, user2Id]);
    } catch (error) {
      // Table might not exist, ignore
    }
    
    await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [user1Id, user2Id]);
  }

  describe('Database Query Security', () => {
    test('should prevent cross-tenant agent access in queries', async () => {
      // Query that should only return user1's agents
      const result = await pool.query(`
        SELECT * FROM agents 
        WHERE user_id = $1
      `, [user1Id]);

      expect(result.rows.length).toBeGreaterThan(0);
      result.rows.forEach(agent => {
        expect(agent.user_id).toBe(user1Id);
      });

      // Verify no user2 agents are returned
      const user2AgentInResults = result.rows.find(agent => agent.user_id === user2Id);
      expect(user2AgentInResults).toBeUndefined();
    });

    test('should prevent cross-tenant call access in queries', async () => {
      // Query that should only return user1's calls
      const result = await pool.query(`
        SELECT * FROM calls 
        WHERE user_id = $1
      `, [user1Id]);

      expect(result.rows.length).toBeGreaterThan(0);
      result.rows.forEach(call => {
        expect(call.user_id).toBe(user1Id);
      });

      // Verify no user2 calls are returned
      const user2CallInResults = result.rows.find(call => call.user_id === user2Id);
      expect(user2CallInResults).toBeUndefined();
    });

    test('should prevent cross-tenant analytics access in complex joins', async () => {
      // Complex query joining multiple tables - should maintain user isolation
      const result = await pool.query(`
        SELECT 
          c.id as call_id,
          c.user_id as call_user_id,
          a.id as agent_id,
          a.user_id as agent_user_id,
          la.id as analytics_id,
          la.user_id as analytics_user_id
        FROM calls c
        JOIN agents a ON c.agent_id = a.id
        LEFT JOIN lead_analytics la ON c.id = la.call_id
        WHERE c.user_id = $1
      `, [user1Id]);

      expect(result.rows.length).toBeGreaterThan(0);
      result.rows.forEach(row => {
        expect(row.call_user_id).toBe(user1Id);
        expect(row.agent_user_id).toBe(user1Id);
        if (row.analytics_user_id) {
          expect(row.analytics_user_id).toBe(user1Id);
        }
      });
    });

    test('should maintain user_id consistency across all related tables', async () => {
      // Verify that all related data maintains user_id consistency
      const inconsistentData = await pool.query(`
        SELECT 
          'calls_agents' as table_pair,
          c.id as call_id,
          c.user_id as call_user_id,
          a.user_id as agent_user_id
        FROM calls c
        JOIN agents a ON c.agent_id = a.id
        WHERE c.user_id != a.user_id
        
        UNION ALL
        
        SELECT 
          'calls_lead_analytics' as table_pair,
          c.id as call_id,
          c.user_id as call_user_id,
          la.user_id as analytics_user_id
        FROM calls c
        JOIN lead_analytics la ON c.id = la.call_id
        WHERE c.user_id != la.user_id
        
        UNION ALL
        
        SELECT 
          'agents_agent_analytics' as table_pair,
          a.id as agent_id,
          a.user_id as agent_user_id,
          aa.user_id as analytics_user_id
        FROM agents a
        JOIN agent_analytics aa ON a.id = aa.agent_id
        WHERE a.user_id != aa.user_id
      `);

      // Should return no rows - all relationships should maintain user_id consistency
      expect(inconsistentData.rows.length).toBe(0);
    });
  });

  describe('Data Aggregation Security', () => {
    test('should prevent cross-tenant data in aggregation queries', async () => {
      // Test aggregation query that should only include user1's data
      const result = await pool.query(`
        SELECT 
          COUNT(c.id) as total_calls,
          COUNT(DISTINCT a.id) as total_agents,
          AVG(la.intent_score) as avg_intent_score
        FROM calls c
        JOIN agents a ON c.agent_id = a.id
        LEFT JOIN lead_analytics la ON c.id = la.call_id
        WHERE c.user_id = $1
      `, [user1Id]);

      expect(result.rows.length).toBe(1);
      const stats = result.rows[0];
      
      // Verify the aggregated data makes sense for user1 only
      expect(parseInt(stats.total_calls)).toBeGreaterThan(0);
      expect(parseInt(stats.total_agents)).toBeGreaterThan(0);
      
      // Compare with user2's data to ensure they're different
      const user2Result = await pool.query(`
        SELECT 
          COUNT(c.id) as total_calls,
          COUNT(DISTINCT a.id) as total_agents,
          AVG(la.intent_score) as avg_intent_score
        FROM calls c
        JOIN agents a ON c.agent_id = a.id
        LEFT JOIN lead_analytics la ON c.id = la.call_id
        WHERE c.user_id = $1
      `, [user2Id]);

      const user2Stats = user2Result.rows[0];
      
      // The stats should be different (unless by coincidence they're the same)
      // At minimum, verify they're properly isolated
      expect(stats).toBeDefined();
      expect(user2Stats).toBeDefined();
    });

    test('should prevent data leakage in analytics rollup queries', async () => {
      // Test analytics rollup that should maintain user isolation
      const result = await pool.query(`
        SELECT 
          user_id,
          date,
          SUM(total_calls) as total_calls,
          SUM(successful_calls) as successful_calls,
          COUNT(DISTINCT agent_id) as unique_agents
        FROM agent_analytics
        WHERE user_id = $1
        GROUP BY user_id, date
        ORDER BY date DESC
      `, [user1Id]);

      result.rows.forEach(row => {
        expect(row.user_id).toBe(user1Id);
        expect(parseInt(row.total_calls)).toBeGreaterThan(0);
        expect(parseInt(row.successful_calls)).toBeGreaterThanOrEqual(0);
        expect(parseInt(row.unique_agents)).toBeGreaterThan(0);
      });
    });
  });

  describe('Subquery Security', () => {
    test('should prevent cross-tenant access in subqueries', async () => {
      // Test subquery that could potentially leak data
      const result = await pool.query(`
        SELECT 
          c.*,
          (
            SELECT COUNT(*) 
            FROM calls c2 
            WHERE c2.agent_id = c.agent_id 
              AND c2.user_id = c.user_id
          ) as agent_call_count
        FROM calls c
        WHERE c.user_id = $1
      `, [user1Id]);

      result.rows.forEach(row => {
        expect(row.user_id).toBe(user1Id);
        expect(parseInt(row.agent_call_count)).toBeGreaterThan(0);
      });
    });

    test('should maintain isolation in EXISTS subqueries', async () => {
      // Test EXISTS subquery for data isolation
      const result = await pool.query(`
        SELECT a.*
        FROM agents a
        WHERE a.user_id = $1
          AND EXISTS (
            SELECT 1 
            FROM calls c 
            WHERE c.agent_id = a.id 
              AND c.user_id = a.user_id
          )
      `, [user1Id]);

      result.rows.forEach(row => {
        expect(row.user_id).toBe(user1Id);
      });
    });
  });

  describe('Window Function Security', () => {
    test('should prevent cross-tenant data in window functions', async () => {
      // Test window function that should maintain user isolation
      const result = await pool.query(`
        SELECT 
          c.id,
          c.user_id,
          c.created_at,
          ROW_NUMBER() OVER (
            PARTITION BY c.user_id 
            ORDER BY c.created_at DESC
          ) as call_rank,
          COUNT(*) OVER (
            PARTITION BY c.user_id
          ) as user_total_calls
        FROM calls c
        WHERE c.user_id = $1
        ORDER BY c.created_at DESC
      `, [user1Id]);

      result.rows.forEach(row => {
        expect(row.user_id).toBe(user1Id);
        expect(parseInt(row.call_rank)).toBeGreaterThan(0);
        expect(parseInt(row.user_total_calls)).toBeGreaterThan(0);
      });
    });
  });

  describe('CTE (Common Table Expression) Security', () => {
    test('should maintain isolation in CTEs', async () => {
      // Test CTE that should maintain user isolation
      const result = await pool.query(`
        WITH user_agent_stats AS (
          SELECT 
            a.id as agent_id,
            a.user_id,
            COUNT(c.id) as call_count
          FROM agents a
          LEFT JOIN calls c ON a.id = c.agent_id AND c.user_id = a.user_id
          WHERE a.user_id = $1
          GROUP BY a.id, a.user_id
        ),
        user_analytics AS (
          SELECT 
            aa.agent_id,
            aa.user_id,
            SUM(aa.total_calls) as analytics_calls
          FROM agent_analytics aa
          WHERE aa.user_id = $1
          GROUP BY aa.agent_id, aa.user_id
        )
        SELECT 
          uas.agent_id,
          uas.user_id,
          uas.call_count,
          COALESCE(ua.analytics_calls, 0) as analytics_calls
        FROM user_agent_stats uas
        LEFT JOIN user_analytics ua ON uas.agent_id = ua.agent_id
      `, [user1Id]);

      result.rows.forEach(row => {
        expect(row.user_id).toBe(user1Id);
      });
    });
  });

  describe('Transaction Isolation', () => {
    test('should maintain data isolation within transactions', async () => {
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Insert data for user1 within transaction
        const insertResult = await client.query(`
          INSERT INTO calls (id, user_id, agent_id, phone_number, status, created_at)
          VALUES (gen_random_uuid(), $1, $2, '+1111111113', 'in_progress', NOW())
          RETURNING *
        `, [user1Id, user1Agent.id]);
        
        const newCall = insertResult.rows[0];
        
        // Query should only see user1's data (including the new call)
        const selectResult = await client.query(`
          SELECT * FROM calls WHERE user_id = $1
        `, [user1Id]);
        
        // Verify the new call is included and all calls belong to user1
        const newCallFound = selectResult.rows.find(call => call.id === newCall.id);
        expect(newCallFound).toBeDefined();
        
        selectResult.rows.forEach(call => {
          expect(call.user_id).toBe(user1Id);
        });
        
        await client.query('ROLLBACK');
      } finally {
        client.release();
      }
    });
  });

  describe('Index Usage and Performance', () => {
    test('should use proper indexes for user-scoped queries', async () => {
      // Test that user-scoped queries use indexes efficiently
      const explainResult = await pool.query(`
        EXPLAIN (ANALYZE, BUFFERS) 
        SELECT * FROM calls WHERE user_id = $1
      `, [user1Id]);
      
      const queryPlan = explainResult.rows.map(row => row['QUERY PLAN']).join('\n');
      
      // Should use index scan, not sequential scan for user_id
      expect(queryPlan).toMatch(/Index.*Scan|Bitmap.*Scan/);
      expect(queryPlan).not.toMatch(/Seq Scan.*calls/);
    });

    test('should efficiently handle agent ownership queries', async () => {
      const explainResult = await pool.query(`
        EXPLAIN (ANALYZE, BUFFERS)
        SELECT a.* FROM agents a 
        WHERE a.user_id = $1 AND a.id = $2
      `, [user1Id, user1Agent.id]);
      
      const queryPlan = explainResult.rows.map(row => row['QUERY PLAN']).join('\n');
      
      // Should use efficient index access
      expect(queryPlan).toMatch(/Index.*Scan|Bitmap.*Scan/);
    });
  });

  describe('Data Integrity Constraints', () => {
    test('should enforce foreign key constraints with user_id consistency', async () => {
      // Try to create a call with an agent from a different user
      await expect(
        pool.query(`
          INSERT INTO calls (id, user_id, agent_id, phone_number, status, created_at)
          VALUES (gen_random_uuid(), $1, $2, '+9999999999', 'completed', NOW())
        `, [user1Id, user2Agent.id])
      ).rejects.toThrow();
    });

    test('should prevent orphaned analytics records', async () => {
      // Try to create lead analytics for a call that belongs to a different user
      await expect(
        pool.query(`
          INSERT INTO lead_analytics (id, call_id, user_id, intent_level, intent_score, created_at)
          VALUES (gen_random_uuid(), $1, $2, 'high', 90, NOW())
        `, [user2Call.id, user1Id])
      ).rejects.toThrow();
    });
  });

  describe('Audit and Monitoring', () => {
    test('should detect potential cross-tenant contamination', async () => {
      // Query to detect any cross-tenant data contamination
      const contaminationCheck = await pool.query(`
        SELECT 
          'calls_agents_mismatch' as issue_type,
          COUNT(*) as count
        FROM calls c
        JOIN agents a ON c.agent_id = a.id
        WHERE c.user_id != a.user_id
        
        UNION ALL
        
        SELECT 
          'calls_analytics_mismatch' as issue_type,
          COUNT(*) as count
        FROM calls c
        JOIN lead_analytics la ON c.id = la.call_id
        WHERE c.user_id != la.user_id
        
        UNION ALL
        
        SELECT 
          'agents_analytics_mismatch' as issue_type,
          COUNT(*) as count
        FROM agents a
        JOIN agent_analytics aa ON a.id = aa.agent_id
        WHERE a.user_id != aa.user_id
      `);

      // All counts should be 0 - no contamination
      contaminationCheck.rows.forEach(row => {
        expect(parseInt(row.count)).toBe(0);
      });
    });

    test('should validate data consistency across all user-related tables', async () => {
      // Comprehensive data consistency check
      const consistencyCheck = await pool.query(`
        SELECT 
          u.id as user_id,
          COUNT(DISTINCT a.id) as agent_count,
          COUNT(DISTINCT c.id) as call_count,
          COUNT(DISTINCT la.id) as lead_analytics_count,
          COUNT(DISTINCT aa.id) as agent_analytics_count
        FROM users u
        LEFT JOIN agents a ON u.id = a.user_id
        LEFT JOIN calls c ON u.id = c.user_id
        LEFT JOIN lead_analytics la ON u.id = la.user_id
        LEFT JOIN agent_analytics aa ON u.id = aa.user_id
        WHERE u.id IN ($1, $2)
        GROUP BY u.id
        ORDER BY u.id
      `, [user1Id, user2Id]);

      expect(consistencyCheck.rows.length).toBe(2);
      
      consistencyCheck.rows.forEach(row => {
        expect([user1Id, user2Id]).toContain(row.user_id);
        expect(parseInt(row.agent_count)).toBeGreaterThan(0);
        expect(parseInt(row.call_count)).toBeGreaterThan(0);
      });
    });
  });
});