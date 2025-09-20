/**
 * Direct Database Query Script
 * 
 * Directly queries the database to check call records
 */

const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const CONVERSATION_ID = 'conv_5301k5a9gk76end8ayk25n22z97p';

async function checkCallRecord() {
  try {
    console.log('🔍 Checking call record directly in database...');
    
    const query = `
      SELECT 
        id,
        elevenlabs_conversation_id,
        duration_seconds,
        duration_minutes,
        credits_used,
        caller_name,
        caller_email,
        phone_number,
        status,
        created_at
      FROM calls 
      WHERE elevenlabs_conversation_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    const result = await pool.query(query, [CONVERSATION_ID]);
    
    if (result.rows.length > 0) {
      const call = result.rows[0];
      
      console.log('✅ Call record found:');
      console.log(`   - Call ID: ${call.id}`);
      console.log(`   - Conversation ID: ${call.elevenlabs_conversation_id}`);
      console.log(`   - Duration Seconds: ${call.duration_seconds}`);
      console.log(`   - Duration Minutes: ${call.duration_minutes}`);
      console.log(`   - Credits Used: ${call.credits_used}`);
      console.log(`   - Caller Name: ${call.caller_name || 'NULL'}`);
      console.log(`   - Caller Email: ${call.caller_email || 'NULL'}`);
      console.log(`   - Phone Number: ${call.phone_number}`);
      console.log(`   - Status: ${call.status}`);
      console.log(`   - Created At: ${call.created_at}`);
      
      // Check if all expected fields are populated
      const issues = [];
      if (call.credits_used === 0 || call.credits_used === null) {
        issues.push('credits_used is 0 or null');
      }
      if (!call.caller_name) {
        issues.push('caller_name is missing');
      }
      if (!call.caller_email) {
        issues.push('caller_email is missing');
      }
      
      if (issues.length > 0) {
        console.log('\\n⚠️ Issues found:');
        issues.forEach(issue => console.log(`   - ${issue}`));
      } else {
        console.log('\\n✅ All fields are properly populated!');
      }
      
      // Also check other tables
      await checkTranscripts(call.id);
      await checkAnalytics(call.id);
      
    } else {
      console.log('❌ No call record found for this conversation ID');
    }
    
  } catch (error) {
    console.error('❌ Failed to check call record:', error.message);
  } finally {
    await pool.end();
  }
}

async function checkTranscripts(callId) {
  try {
    const query = 'SELECT COUNT(*) as count FROM transcripts WHERE call_id = $1';
    const result = await pool.query(query, [callId]);
    const count = parseInt(result.rows[0].count);
    
    if (count > 0) {
      console.log(`\\n✅ Found ${count} transcript record(s)`);
    } else {
      console.log('\\n⚠️ No transcript records found');
    }
  } catch (error) {
    console.log('\\n❌ Error checking transcripts:', error.message);
  }
}

async function checkAnalytics(callId) {
  try {
    const query = 'SELECT COUNT(*) as count FROM lead_analytics WHERE call_id = $1';
    const result = await pool.query(query, [callId]);
    const count = parseInt(result.rows[0].count);
    
    if (count > 0) {
      console.log(`✅ Found ${count} analytics record(s)`);
    } else {
      console.log('⚠️ No analytics records found');
    }
  } catch (error) {
    console.log('❌ Error checking analytics:', error.message);
  }
}

// Execute the check
checkCallRecord().catch(console.error);
