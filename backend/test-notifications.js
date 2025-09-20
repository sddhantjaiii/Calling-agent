const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function addSampleNotifications() {
  try {
    console.log('Adding sample smart notifications...');
    
    // First, let's check if there are any calls with lead_analytics
    const callsResult = await pool.query(`
      SELECT c.id, c.user_id, la.id as analytics_id
      FROM calls c
      LEFT JOIN lead_analytics la ON la.call_id = c.id
      WHERE c.user_id IS NOT NULL
      LIMIT 5
    `);
    
    console.log('Found calls:', callsResult.rows);
    
    if (callsResult.rows.length === 0) {
      console.log('No calls found. Creating sample data...');
      
      // Create a sample user first
      const userResult = await pool.query(`
        INSERT INTO users (id, email, name, credits, is_active, auth_provider, role, email_verified, created_at, updated_at)
        VALUES ('test-user-123', 'test@example.com', 'Test User', 1000, true, 'email', 'user', true, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
        RETURNING id
      `);
      
      const userId = userResult.rows[0]?.id || 'test-user-123';
      
      // Create sample calls
      const callResult = await pool.query(`
        INSERT INTO calls (id, user_id, agent_id, phone_number, status, duration_minutes, credits_used, created_at, updated_at)
        VALUES 
          ('call-1', $1, 'agent-1', '+1234567890', 'completed', 5, 10, NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour'),
          ('call-2', $1, 'agent-1', '+1234567891', 'completed', 3, 8, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),
          ('call-3', $1, 'agent-1', '+1234567892', 'completed', 7, 15, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours')
        ON CONFLICT (id) DO NOTHING
        RETURNING id
      `, [userId]);
      
      console.log('Created calls:', callResult.rows);
      
      // Create sample lead analytics with smart notifications
      const analyticsResult = await pool.query(`
        INSERT INTO lead_analytics (
          id, call_id, total_score, lead_status_tag, intent_score, urgency_score, 
          budget_score, fit_score, engagement_score, reasoning, smart_notification,
          lead_type, is_read, created_at, updated_at
        )
        VALUES 
          ('analytics-1', 'call-1', 85, 'Hot', 80, 90, 85, 80, 90, 'High intent customer', 'Demo booked for tomorrow', 'inbound', false, NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour'),
          ('analytics-2', 'call-2', 65, 'Warm', 70, 60, 70, 60, 65, 'Interested in pricing', 'Wants pricing details', 'outbound', false, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),
          ('analytics-3', 'call-3', 45, 'Cold', 50, 40, 50, 40, 45, 'Low engagement', 'Not interested now', 'inbound', true, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours')
        ON CONFLICT (id) DO NOTHING
        RETURNING id
      `);
      
      console.log('Created analytics:', analyticsResult.rows);
    } else {
      // Update existing lead_analytics with smart notifications
      for (const call of callsResult.rows) {
        if (call.analytics_id) {
          await pool.query(`
            UPDATE lead_analytics 
            SET smart_notification = $1, lead_type = $2, is_read = $3
            WHERE id = $4
          `, [
            `Sample notification for call ${call.id}`,
            'inbound',
            Math.random() > 0.5
          ], call.analytics_id);
        } else {
          // Create new analytics entry
          await pool.query(`
            INSERT INTO lead_analytics (
              id, call_id, total_score, lead_status_tag, intent_score, urgency_score,
              budget_score, fit_score, engagement_score, reasoning, smart_notification,
              lead_type, is_read, created_at, updated_at
            )
            VALUES (
              $1, $2, 75, 'Warm', 70, 80, 75, 70, 80, 'Sample lead', 
              'Sample smart notification', 'inbound', false, NOW(), NOW()
            )
          `, [`analytics-${call.id}`, call.id]);
        }
      }
    }
    
    console.log('Sample notifications added successfully!');
    
    // Test the notifications query
    const testResult = await pool.query(`
      SELECT 
        la.id,
        la.call_id as lead_id,
        c.contact_id,
        c.phone_number,
        c.email,
        la.smart_notification,
        la.demo_book_datetime,
        la.created_at,
        la.is_read,
        la.lead_type,
        la.total_score
      FROM lead_analytics la
      JOIN calls c ON c.id = la.call_id
      WHERE c.user_id IS NOT NULL
        AND la.smart_notification IS NOT NULL
        AND la.smart_notification != ''
      ORDER BY la.created_at DESC
      LIMIT 10
    `);
    
    console.log('Test query result:', testResult.rows);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

addSampleNotifications();
