require('dotenv').config({ path: './backend/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkCallsTable() {
  try {
    console.log('Connecting to database...');
    const result = await pool.query('SELECT id, phone_number, caller_name, caller_email, credits_used, duration_seconds, duration_minutes, status, elevenlabs_conversation_id, created_at FROM calls ORDER BY created_at DESC LIMIT 3');
    
    console.log('Recent calls in database:');
    console.log('==================================================');
    
    if (result.rows.length === 0) {
      console.log('No calls found in database');
    } else {
      result.rows.forEach((call, index) => {
        console.log('');
        console.log('Call ' + (index + 1) + ':');
        console.log('  ID: ' + call.id);
        console.log('  Phone: ' + call.phone_number);
        console.log('  Name: ' + (call.caller_name || 'null'));
        console.log('  Email: ' + (call.caller_email || 'null'));
        console.log('  Credits Used: ' + call.credits_used);
        console.log('  Duration: ' + call.duration_seconds + 's (' + call.duration_minutes + 'm)');
        console.log('  Status: ' + call.status);
        console.log('  Conversation ID: ' + call.elevenlabs_conversation_id);
        console.log('  Created: ' + call.created_at);
      });
    }
    
  } catch (error) {
    console.error('Error checking database:', error.message);
  } finally {
    await pool.end();
  }
}

checkCallsTable();
