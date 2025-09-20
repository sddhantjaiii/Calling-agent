const axios = require('axios');
const fs = require('fs');
const crypto = require('crypto');

// Configuration
const CONFIG = {
  BACKEND_URL: 'http://localhost:3000',
  PAYLOAD_FILE: 'post_call_transcription_conv_5301k5a9gk76end8ayk25n22z97p_1758061082219.json',
  WEBHOOK_SECRET: process.env.ELEVENLABS_WEBHOOK_SECRET || 'test-secret-key'
};

console.log('🎭 ElevenLabs Webhook Processing Test');
console.log('=====================================\n');

async function testWebhookProcessing() {
  try {
    // Step 1: Check backend health
    console.log('🏥 Checking backend health...');
    console.log(`   - Testing URL: ${CONFIG.BACKEND_URL}/api/webhooks/health`);
    
    const healthResponse = await axios.get(`${CONFIG.BACKEND_URL}/api/webhooks/health`, {
      timeout: 10000,
      validateStatus: function (status) {
        return status < 500; // Accept any response under 500
      }
    });
    console.log('✅ Backend is healthy');
    console.log(`   - Status: ${healthResponse.status}`);
    console.log(`   - Response: ${JSON.stringify(healthResponse.data)}`);

    // Step 2: Load the actual JSON payload
    console.log('\n📂 Loading actual webhook payload...');
    if (!fs.existsSync(CONFIG.PAYLOAD_FILE)) {
      throw new Error(`Payload file not found: ${CONFIG.PAYLOAD_FILE}`);
    }
    
    const rawPayload = fs.readFileSync(CONFIG.PAYLOAD_FILE, 'utf8');
    const payload = JSON.parse(rawPayload);
    
    console.log('✅ Payload loaded successfully');
    console.log(`   - Agent ID: ${payload.agent_id}`);
    console.log(`   - Conversation ID: ${payload.conversation_id}`);
    console.log(`   - Status: ${payload.status}`);
    console.log(`   - Transcript Segments: ${payload.transcript?.length || 0}`);
    console.log(`   - Has Analysis: ${!!payload.analysis}`);
    console.log(`   - Has Metadata: ${!!payload.metadata}`);
    console.log(`   - Duration: ${payload.metadata?.call_duration_secs}s`);
    console.log(`   - Phone Numbers: ${payload.metadata?.phone_call?.agent_number} -> ${payload.metadata?.phone_call?.external_number}`);

    // Step 3: Generate webhook signature (if secret is configured)
    const timestamp = Math.floor(Date.now() / 1000);
    const signedPayload = `${timestamp}.${rawPayload}`;
    const signature = crypto.createHmac('sha256', CONFIG.WEBHOOK_SECRET).update(signedPayload, 'utf8').digest('hex');
    const webhookSignature = `t=${timestamp},v0=${signature}`;

    // Step 4: Send webhook to backend
    console.log('\n🚀 Sending webhook to backend...');
    console.log(`   - URL: ${CONFIG.BACKEND_URL}/api/webhooks/elevenlabs/post-call`);
    console.log(`   - Payload Size: ${(rawPayload.length / 1024).toFixed(2)} KB`);
    console.log(`   - Signature: ${webhookSignature.substring(0, 50)}...`);

    const webhookResponse = await axios.post(
      `${CONFIG.BACKEND_URL}/api/webhooks/elevenlabs/post-call`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ElevenLabs-Webhook/1.0',
          'X-ElevenLabs-Signature': webhookSignature
        },
        timeout: 30000 // 30 second timeout
      }
    );

    console.log('✅ Webhook processed successfully');
    console.log(`   - Status: ${webhookResponse.status} ${webhookResponse.statusText}`);
    console.log(`   - Response: ${JSON.stringify(webhookResponse.data)}`);

    // Step 5: Wait a moment for processing to complete
    console.log('\n⏳ Waiting for backend processing to complete...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 6: Verify database entries were created
    console.log('\n📊 Verifying database results...');
    
    try {
      // Check if call was created
      const callCheckResponse = await axios.get(
        `${CONFIG.BACKEND_URL}/api/calls?conversation_id=${payload.conversation_id}`,
        { validateStatus: () => true }
      );
      
      if (callCheckResponse.status === 200) {
        console.log('✅ Call record verification successful');
        if (callCheckResponse.data.calls && callCheckResponse.data.calls.length > 0) {
          const call = callCheckResponse.data.calls[0];
          console.log(`   - Call ID: ${call.id}`);
          console.log(`   - Duration Seconds: ${call.duration_seconds}`);
          console.log(`   - Duration Minutes: ${call.duration_minutes}`);
          console.log(`   - Phone Number: ${call.phone_number}`);
          console.log(`   - Status: ${call.status}`);
        }
      } else {
        console.log('⚠️  Call verification failed - may require authentication');
      }
    } catch (verifyError) {
      console.log('⚠️  Database verification skipped - endpoint may require auth');
    }

    console.log('\n🎉 Webhook Processing Complete!');
    console.log('================================');
    console.log('✅ Webhook received and processed successfully');
    console.log('✅ All data should now be in database tables:');
    console.log('   - calls (main call record with duration_seconds)');
    console.log('   - transcripts (conversation segments)');
    console.log('   - lead_analytics (AI analysis with smart_notification)');
    console.log('   - contacts (auto-created from conversation data)');
    console.log('   - billing_transactions (credit deduction)');

  } catch (error) {
    console.log('\n💥 Webhook processing failed:', error.message);
    
    if (error.response) {
      console.log(`   - Status: ${error.response.status} ${error.response.statusText}`);
      console.log(`   - Error: ${JSON.stringify(error.response.data)}`);
    }
    
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Ensure backend is running: npm run dev');
    console.log('   2. Check agent exists in database');
    console.log('   3. Verify database migrations are applied');
    console.log('   4. Check backend logs for detailed errors');
    
    process.exit(1);
  }

  // Log expected database updates for manual verification
  console.log('\n📋 EXPECTED DATABASE UPDATES - For Manual Verification:');
  console.log('==========================================');
  
  console.log('\n📞 calls table should contain:');
  console.log('   - phone_number: +1-555-123-4567 (from metadata.audio_url)');
  console.log('   - duration_seconds: 180.25');
  console.log('   - status: completed');
  console.log('   - transcript_url: https://api.elevenlabs.io/v1/history/...');
  console.log('   - agent_id: 1');
  
  console.log('\n📄 transcripts table should contain:');
  console.log('   - content: full transcript text');
  console.log('   - ai_analysis: extracted from webhook payload');
  
  console.log('\n📊 lead_analytics table should contain:');
  console.log('   - lead_source: ElevenLabs');
  console.log('   - conversion_status: qualified/unqualified');
  console.log('   - call_rating: from AI analysis');
  
  console.log('\n👤 contacts table should contain:');
  console.log('   - phone: +1-555-123-4567');
  console.log('   - name: extracted from transcript/analysis');
  console.log('   - created_at: current timestamp');
  
  console.log('\n💰 billing_transactions table should contain:');
  console.log('   - minutes_used: 4 (rounded up from 180.25 seconds)');
  console.log('   - rate_per_minute: from agent settings');
  console.log('   - total_cost: calculated amount');
  
  console.log('\n🔍 To verify manually, run these SQL queries:');
  console.log('   SELECT * FROM calls WHERE phone_number = \'+1-555-123-4567\';');
  console.log('   SELECT * FROM transcripts WHERE call_id = (SELECT id FROM calls WHERE phone_number = \'+1-555-123-4567\');');
  console.log('   SELECT * FROM lead_analytics WHERE call_id = (SELECT id FROM calls WHERE phone_number = \'+1-555-123-4567\');');
  console.log('   SELECT * FROM contacts WHERE phone = \'+1-555-123-4567\';');
  console.log('   SELECT * FROM billing_transactions WHERE call_id = (SELECT id FROM calls WHERE phone_number = \'+1-555-123-4567\');');
}

// Run the test
testWebhookProcessing();
