// Debug script to check authentication state
console.log('=== Authentication Debug ===');

// Check localStorage tokens
const authToken = localStorage.getItem('auth_token');
const refreshToken = localStorage.getItem('refresh_token');

console.log('Auth Token:', authToken ? 'Present' : 'Missing');
console.log('Refresh Token:', refreshToken ? 'Present' : 'Missing');

if (authToken) {
  try {
    // Decode JWT token
    const payload = JSON.parse(atob(authToken.split('.')[1]));
    console.log('Token Payload:', payload);
    console.log('User ID:', payload.userId);
    console.log('User Role:', payload.role);
    console.log('Token Expires:', new Date(payload.exp * 1000));
    console.log('Token Expired:', Date.now() > payload.exp * 1000);
  } catch (error) {
    console.error('Failed to decode token:', error);
  }
}

// Test API call
if (authToken) {
  fetch('http://localhost:3000/api/admin/users?page=1&limit=5', {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    console.log('API Response Status:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('API Response:', data);
  })
  .catch(error => {
    console.error('API Error:', error);
  });
}