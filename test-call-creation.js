/**
 * Simple test to verify Call.createCall method works with new fields
 */
const Call = require('./backend/src/models/Call').default;
const { v4: uuidv4 } = require('uuid');

async function testCallCreation() {
  try {
    console.log('Testing Call.createCall with new fields...');
    
    const testCallData = {
      agent_id: uuidv4(),
      user_id: uuidv4(),
      elevenlabs_conversation_id: 'test_conv_' + Date.now(),
      phone_number: '+1234567890',
      caller_name: 'Test Caller',
      caller_email: 'test@example.com',
      call_source: 'phone',
      duration_seconds: 170,
      duration_minutes: 3,
      credits_used: 3,
      status: 'completed',
      metadata: { test: true }
    };
    
    const call = await Call.createCall(testCallData);
    
    console.log('✅ Call created successfully:');
    console.log('  ID:', call.id);
    console.log('  Phone:', call.phone_number);
    console.log('  Caller Name:', call.caller_name);
    console.log('  Caller Email:', call.caller_email);
    console.log('  Credits Used:', call.credits_used);
    console.log('  Duration Seconds:', call.duration_seconds);
    console.log('  Duration Minutes:', call.duration_minutes);
    console.log('  Status:', call.status);
    
    // Verify the values are correct
    if (call.caller_name === 'Test Caller' && 
        call.caller_email === 'test@example.com' && 
        call.credits_used === 3) {
      console.log('✅ All fields are correctly set!');
    } else {
      console.log('❌ Some fields are not set correctly:');
      console.log('  Expected caller_name: Test Caller, got:', call.caller_name);
      console.log('  Expected caller_email: test@example.com, got:', call.caller_email);
      console.log('  Expected credits_used: 3, got:', call.credits_used);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testCallCreation();
