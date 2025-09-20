// Test script for admin users endpoint
import { UserModel } from '../models/User';

async function testAdminUsersEndpoint() {
  console.log('🧪 Testing admin users endpoint...');
  
  try {
    const userModel = new UserModel();
    
    // Test with minimal parameters
    console.log('Testing with minimal parameters...');
    const result = await userModel.getAllUsersForAdmin({
      page: 1,
      limit: 5,
      sortBy: 'created_at',
      sortOrder: 'DESC'
    });
    
    console.log('✅ Success:', {
      total: result.total,
      users: result.users.length,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages
    });
    
    // Test with search parameter
    console.log('\nTesting with search parameter...');
    const searchResult = await userModel.getAllUsersForAdmin({
      page: 1,
      limit: 5,
      search: 'test',
      sortBy: 'created_at',
      sortOrder: 'DESC'
    });
    
    console.log('✅ Search Success:', {
      total: searchResult.total,
      users: searchResult.users.length
    });
    
  } catch (error: any) {
    console.error('❌ Error:', error);
    console.error('Error details:', {
      message: error?.message || 'Unknown error',
      stack: error?.stack || 'No stack trace'
    });
  }
}

// Run the test
testAdminUsersEndpoint()
  .then(() => {
    console.log('\n🎉 Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });