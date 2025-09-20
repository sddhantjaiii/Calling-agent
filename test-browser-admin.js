// Test the admin agent creation endpoint directly
// Open your browser's developer tools and run this in the console

console.log('🧪 Testing Admin Agent Creation...');

// Get the auth token from localStorage
const token = localStorage.getItem('auth_token') || localStorage.getItem('authToken') || localStorage.getItem('token');

if (!token) {
  console.error('❌ No auth token found in localStorage');
  console.log('Available keys:', Object.keys(localStorage));
} else {
  console.log('✅ Found auth token:', token.substring(0, 20) + '...');
  
  // Test admin validation first
  fetch('/api/admin/validate', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    console.log('Admin validate status:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('Admin validate response:', data);
    
    // If admin validation passes, test agent creation
    if (data.success || data.hasAccess) {
      console.log('✅ Admin validation passed, testing agent creation...');
      
      const agentData = {
        name: 'Test Admin Agent',
        type: 'outbound',
        voice_id: 'default',
        model: 'gpt-3.5-turbo',
        prompt: 'You are a helpful assistant.',
        assigned_user_id: null
      };
      
      return fetch('/api/admin/agents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(agentData)
      });
    } else {
      throw new Error('Admin validation failed');
    }
  })
  .then(response => {
    console.log('Agent creation status:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('Agent creation response:', data);
  })
  .catch(error => {
    console.error('❌ Test failed:', error);
  });
}

// Also check what's in localStorage
console.log('\n📋 localStorage contents:');
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  const value = localStorage.getItem(key);
  if (key && (key.includes('auth') || key.includes('token') || key.includes('user'))) {
    console.log(`${key}:`, value ? value.substring(0, 50) + '...' : value);
  }
}