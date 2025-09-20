const axios = require('axios');

async function checkCallData() {
  try {
    const response = await axios.get('http://localhost:3000/api/calls?conversation_id=conv_5301k5a9gk76end8ayk25n22z97p');
    
    if (response.data && response.data.length > 0) {
      const call = response.data[0];
      console.log('Call Data:');
      console.log('ID:', call.id);
      console.log('Phone:', call.phone_number);
      console.log('Caller Name:', call.caller_name || 'null');
      console.log('Caller Email:', call.caller_email || 'null');
      console.log('Credits Used:', call.credits_used);
      console.log('Duration Seconds:', call.duration_seconds);
      console.log('Duration Minutes:', call.duration_minutes);
      console.log('Status:', call.status);
    } else {
      console.log('No call data found');
    }
  } catch (error) {
    console.error('API Error:', error.response ? error.response.status + ' - ' + error.response.statusText : error.message);
  }
}

checkCallData();
