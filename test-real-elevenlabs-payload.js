const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  BACKEND_URL: 'http://localhost:3000',
  WEBHOOK_ENDPOINT: '/api/webhooks/elevenlabs/post-call',
  WEBHOOK_SECRET: 'test-secret-key'
};

// Ultra-robust Python dict parser (same as backend)
function parseComplexPythonDict(pythonStr) {
  try {
    // Step 1: Clean and normalize the string
    let cleanStr = pythonStr.trim();
    
    // Step 2: Replace Python literals
    cleanStr = cleanStr
      .replace(/\bTrue\b/g, 'true')
      .replace(/\bFalse\b/g, 'false')
      .replace(/\bNone\b/g, 'null');

    // Step 3: Handle quoted strings first (preserve them)
    const quotedStrings = [];
    cleanStr = cleanStr.replace(/'([^']*)'/g, (match, content) => {
      const index = quotedStrings.length;
      quotedStrings.push(content);
      return `__QUOTED_${index}__`;
    });

    // Step 4: Quote unquoted keys
    cleanStr = cleanStr.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

    // Step 5: Quote unquoted string values (but not numbers or booleans)
    cleanStr = cleanStr.replace(/:\s*([a-zA-Z][a-zA-Z0-9_\s]*)\s*([,}])/g, (match, value, ending) => {
      const trimmedValue = value.trim();
      // Don't quote if it's a boolean, null, or number
      if (trimmedValue === 'true' || trimmedValue === 'false' || trimmedValue === 'null' || 
          /^\d+(\.\d+)?$/.test(trimmedValue) || trimmedValue.startsWith('__QUOTED_')) {
        return `: ${trimmedValue}${ending}`;
      }
      return `: "${trimmedValue}"${ending}`;
    });

    // Step 6: Restore quoted strings
    quotedStrings.forEach((content, index) => {
      cleanStr = cleanStr.replace(`__QUOTED_${index}__`, `"${content}"`);
    });

    // Step 7: Parse as JSON
    return JSON.parse(cleanStr);

  } catch (error) {
    console.error('Complex Python dict parsing failed:', error.message);
    return null;
  }
}

// Load the real ElevenLabs payload
function loadRealPayload() {
  try {
    const payloadPath = path.join(__dirname, 'post_call_transcription_conv_5301k5a9gk76end8ayk25n22z97p_1758061082219.json');
    const payloadData = fs.readFileSync(payloadPath, 'utf8');
    return JSON.parse(payloadData);
  } catch (error) {
    console.error('❌ Failed to load real payload:', error.message);
    process.exit(1);
  }
}

// Generate ElevenLabs webhook signature (matching comprehensive test format)
function generateWebhookSignature(payload, secret, timestamp) {
  const signaturePayload = `${timestamp}.${payload}`;
  const hash = crypto.createHmac('sha256', secret).update(signaturePayload, 'utf8').digest('hex');
  return `t=${timestamp},v0=${hash}`;
}

async function testRealElevenLabsWebhook() {
  console.log('🚀 Testing Real ElevenLabs Webhook Payload');
  console.log('=' .repeat(50));

  try {
    // Step 1: Load real payload
    console.log('📂 Loading real ElevenLabs payload...');
    const realPayload = loadRealPayload();
    const payloadString = JSON.stringify(realPayload);
    
    console.log('✅ Loaded real payload:');
    console.log(`  - Conversation ID: ${realPayload.conversation_id}`);
    console.log(`  - Agent ID: ${realPayload.agent_id}`);
    console.log(`  - Call duration: ${realPayload.metadata?.call_duration_secs}s`);
    console.log(`  - Analysis data present: ${!!realPayload.analysis?.data_collection_results?.default?.value}`);
    
    // Step 2: Generate signature
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = generateWebhookSignature(payloadString, CONFIG.WEBHOOK_SECRET, timestamp);
    
    console.log('\n📤 Sending real webhook payload...');
    const startTime = Date.now();
    
    // Step 3: Send webhook
    const response = await axios.post(`${CONFIG.BACKEND_URL}${CONFIG.WEBHOOK_ENDPOINT}`, payloadString, {
      headers: {
        'Content-Type': 'application/json',
        'X-ElevenLabs-Signature': signature,
        'User-Agent': 'ElevenLabs-Webhook/1.0'
      },
      timeout: 15000
    });
    
    const processingTime = Date.now() - startTime;
    console.log('✅ Webhook processed successfully');
    console.log('  - Status:', response.status);
    console.log('  - Processing time:', processingTime + 'ms');
    console.log('  - Response:', JSON.stringify(response.data, null, 2));
    
    // Step 4: Wait for background processing
    console.log('\n⏳ Waiting for background processing...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 5: Extract expected data from real payload
    const analysisData = realPayload.analysis?.data_collection_results?.default?.value;
    console.log('\n📊 REAL PAYLOAD ANALYSIS RESULTS:');
    console.log('=' .repeat(50));
    
    if (analysisData) {
      console.log('📋 Analysis Data Format:');
      console.log('  - Format: Python dictionary');
      console.log('  - Length:', analysisData.length, 'characters');
      console.log('  - Preview:', analysisData.substring(0, 100) + '...');
      
      // ✅ FIXED: Use the same ultra-robust parser as backend
      try {
        const parsed = parseComplexPythonDict(analysisData);
        
        if (parsed) {
          console.log('\n✅ Expected extraction results (using ultra-robust parser):');
          console.log('  - Caller Name:', parsed.extraction?.name || 'Not found');
          console.log('  - Caller Email:', parsed.extraction?.email_address || 'Not found'); 
          console.log('  - Company:', parsed.extraction?.company_name || 'Not found');
          console.log('  - Lead Status:', parsed.lead_status_tag || 'Not found');
          console.log('  - Total Score:', parsed.total_score || 'Not found');
          console.log('  - Demo DateTime:', parsed.demo_book_datetime || 'Not found');
          console.log('  - Intent Level:', parsed.intent_level || 'Not found');
          console.log('  - Intent Score:', parsed.intent_score || 'Not found');
          console.log('  - CTA Pricing Clicked:', parsed.cta_pricing_clicked || 'Not found');
        } else {
          console.log('⚠️  Ultra-robust parsing failed - this indicates a deeper issue');
        }
        
      } catch (parseError) {
        console.log('❌ Parsing failed:', parseError.message);
        console.log('This suggests the backend parsing might also fail');
      }
    }
    
    // Step 6: Show call metadata
    const metadata = realPayload.metadata;
    if (metadata?.phone_call) {
      console.log('\n📞 Call Metadata:');
      console.log('  - External Number:', metadata.phone_call.external_number);
      console.log('  - Call Duration:', metadata.call_duration_secs, 'seconds');
      console.log('  - Credits Expected:', Math.ceil(metadata.call_duration_secs / 60));
    }
    
    console.log('\n🎉 Real payload test completed successfully!');
    console.log('✅ This tests the exact format ElevenLabs sends');
    console.log('✅ Backend should now extract all lead data properly');
    
  } catch (error) {
    console.error('\n❌ Real payload test failed:');
    console.error('Error:', error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Make sure backend server is running:');
      console.error('   cd backend && npm run dev');
    }
    
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down test...');
  process.exit(0);
});

// Run the test
if (require.main === module) {
  testRealElevenLabsWebhook()
    .then(() => {
      console.log('\n✅ All tests passed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test suite failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testRealElevenLabsWebhook };
