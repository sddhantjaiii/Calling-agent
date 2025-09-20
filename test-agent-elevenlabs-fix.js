const axios = require('axios');

const API_BASE = 'http://localhost:3000';

// Test the agents API to ensure elevenlabsAgentId is consistently returned
async function testAgentsElevenLabsFix() {
    try {
        console.log('🧪 Testing Agents API ElevenLabs ID Fix...\n');
        
        // First request - should get fresh data
        console.log('1. First API call (fresh data):');
        const firstResponse = await axios.get(`${API_BASE}/api/agents`, {
            headers: { 
                'Authorization': 'Bearer test-token' 
            }
        });
        
        if (firstResponse.data.success && firstResponse.data.data.length > 0) {
            const firstAgent = firstResponse.data.data[0];
            console.log(`   ✅ Agent ID: ${firstAgent.id}`);
            console.log(`   ✅ Name: ${firstAgent.name}`);
            console.log(`   ✅ ElevenLabs Agent ID: ${firstAgent.elevenlabsAgentId || 'MISSING'}`);
            console.log(`   ✅ Total agents: ${firstResponse.data.data.length}`);
            
            // Check if elevenlabsAgentId is present
            if (firstAgent.elevenlabsAgentId) {
                console.log(`   ✅ First call: elevenlabsAgentId present`);
            } else {
                console.log(`   ❌ First call: elevenlabsAgentId MISSING`);
            }
        }
        
        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Second request - should get cached data (where the bug would occur)
        console.log('\n2. Second API call (cached data):');
        const secondResponse = await axios.get(`${API_BASE}/api/agents`, {
            headers: { 
                'Authorization': 'Bearer test-token' 
            }
        });
        
        if (secondResponse.data.success && secondResponse.data.data.length > 0) {
            const secondAgent = secondResponse.data.data[0];
            console.log(`   ✅ Agent ID: ${secondAgent.id}`);
            console.log(`   ✅ Name: ${secondAgent.name}`);
            console.log(`   ✅ ElevenLabs Agent ID: ${secondAgent.elevenlabsAgentId || 'MISSING'}`);
            console.log(`   ✅ Total agents: ${secondResponse.data.data.length}`);
            
            // Check if elevenlabsAgentId is present
            if (secondAgent.elevenlabsAgentId) {
                console.log(`   ✅ Second call: elevenlabsAgentId present`);
            } else {
                console.log(`   ❌ Second call: elevenlabsAgentId MISSING`);
            }
        }
        
        // Compare results
        console.log('\n3. Consistency Check:');
        if (firstResponse.data.data.length === secondResponse.data.data.length) {
            console.log(`   ✅ Same number of agents returned (${firstResponse.data.data.length})`);
        } else {
            console.log(`   ❌ Different number of agents: ${firstResponse.data.data.length} vs ${secondResponse.data.data.length}`);
        }
        
        // Check if elevenlabsAgentId is consistent
        const firstHasElevenLabs = firstResponse.data.data.every(agent => agent.elevenlabsAgentId);
        const secondHasElevenLabs = secondResponse.data.data.every(agent => agent.elevenlabsAgentId);
        
        if (firstHasElevenLabs && secondHasElevenLabs) {
            console.log(`   ✅ elevenlabsAgentId is consistent in both calls`);
        } else if (!firstHasElevenLabs && !secondHasElevenLabs) {
            console.log(`   ⚠️  elevenlabsAgentId missing in both calls (check if agents have ElevenLabs IDs)`);
        } else {
            console.log(`   ❌ elevenlabsAgentId inconsistent: first=${firstHasElevenLabs}, second=${secondHasElevenLabs}`);
        }
        
        // Third request to triple check
        console.log('\n4. Third API call (re-cached data):');
        const thirdResponse = await axios.get(`${API_BASE}/api/agents`, {
            headers: { 
                'Authorization': 'Bearer test-token' 
            }
        });
        
        if (thirdResponse.data.success && thirdResponse.data.data.length > 0) {
            const thirdAgent = thirdResponse.data.data[0];
            const thirdHasElevenLabs = thirdResponse.data.data.every(agent => agent.elevenlabsAgentId);
            
            console.log(`   ✅ ElevenLabs Agent ID: ${thirdAgent.elevenlabsAgentId || 'MISSING'}`);
            
            if (thirdHasElevenLabs) {
                console.log(`   ✅ Third call: elevenlabsAgentId still present`);
            } else {
                console.log(`   ❌ Third call: elevenlabsAgentId MISSING`);
            }
        }
        
        console.log('\n✅ Test completed successfully!');
        console.log('If you see "elevenlabsAgentId present" for all calls, the fix is working.');
        
    } catch (error) {
        if (error.response?.status === 401) {
            console.log('❌ Authentication required - update the Bearer token or test with valid credentials');
        } else if (error.response?.status === 404) {
            console.log('❌ API endpoint not found - make sure backend is running on localhost:3000');
        } else {
            console.error('❌ Test failed:', error.message);
            if (error.response) {
                console.error('Response:', error.response.data);
            }
        }
    }
}

// Run the test
testAgentsElevenLabsFix();