/**
 * Check Call Record Script
 * 
 * Queries the database to check the current state of call records
 * specifically looking at credits_used, caller_name, and caller_email
 */

const axios = require('axios');

const CONFIG = {
  BACKEND_URL: 'http://localhost:3000',
  CONVERSATION_ID: 'conv_5301k5a9gk76end8ayk25n22z97p'
};

async function checkCallRecord() {
  try {
    console.log('🔍 Checking call record in database...');
    
    // Query the calls endpoint
    const callsUrl = `${CONFIG.BACKEND_URL}/api/calls`;
    const response = await axios.get(`${callsUrl}?conversation_id=${CONFIG.CONVERSATION_ID}`, {
      timeout: 10000
    });
    
    if (response.data && response.data.length > 0) {
      const call = response.data[0];
      
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
      
      if (call.metadata) {
        console.log(`   - Metadata Credits: ${call.metadata.credits_used || 'Not set'}`);
      }
      
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
      
    } else {
      console.log('❌ No call record found for this conversation ID');
    }
    
  } catch (error) {
    console.error('❌ Failed to check call record:', error.message);
  }
}

// Execute the check
checkCallRecord().catch(console.error);
