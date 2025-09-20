// Quick test script to verify CORS configuration
const testCors = async () => {
  const testUrls = [
    'http://localhost:8080',
    'http://localhost:8081',
    'http://localhost:8082', 
    'http://localhost:5173',
    'http://localhost:3000'
  ];

  console.log('🧪 Testing CORS configuration...\n');

  for (const url of testUrls) {
    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'OPTIONS',
        headers: {
          'Origin': url,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type,Authorization'
        }
      });

      if (response.ok) {
        console.log(`✅ ${url} - CORS allowed`);
      } else {
        console.log(`❌ ${url} - CORS blocked (${response.status})`);
      }
    } catch (error) {
      console.log(`❌ ${url} - Request failed: ${error.message}`);
    }
  }
};

// Run the test if this file is executed directly
if (require.main === module) {
  testCors();
}

module.exports = { testCors };