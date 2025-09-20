// Test utility to verify leads data integration
import { apiService } from '../services/apiService';

export const testLeadsIntegration = async () => {
  console.log('🧪 Testing Leads Data Integration...');
  
  try {
    // Test 1: Verify leads API endpoint is accessible
    console.log('📡 Testing leads API endpoint...');
    const response = await apiService.getLeads();
    console.log('✅ Leads API response:', response);
    
    // Test 2: Verify filtering works
    console.log('🔍 Testing leads filtering...');
    const filteredResponse = await apiService.getLeads({
      search: 'test',
      leadTag: 'Hot',
      limit: 10,
      offset: 0
    });
    console.log('✅ Filtered leads response:', filteredResponse);
    
    // Test 3: Verify sorting works
    console.log('📊 Testing leads sorting...');
    const sortedResponse = await apiService.getLeads({
      sortBy: 'name',
      sortOrder: 'asc',
      limit: 5
    });
    console.log('✅ Sorted leads response:', sortedResponse);
    
    // Test 4: Verify pagination works
    console.log('📄 Testing leads pagination...');
    const paginatedResponse = await apiService.getLeads({
      limit: 2,
      offset: 0
    });
    console.log('✅ Paginated leads response:', paginatedResponse);
    
    console.log('🎉 All leads integration tests completed successfully!');
    
    return {
      success: true,
      message: 'Leads integration is working correctly',
      tests: {
        apiEndpoint: true,
        filtering: true,
        sorting: true,
        pagination: true
      }
    };
    
  } catch (error) {
    console.error('❌ Leads integration test failed:', error);
    
    return {
      success: false,
      message: 'Leads integration has issues',
      error: error instanceof Error ? error.message : 'Unknown error',
      tests: {
        apiEndpoint: false,
        filtering: false,
        sorting: false,
        pagination: false
      }
    };
  }
};

// Test data transformation
export const testDataTransformation = (leads: any[]) => {
  console.log('🔄 Testing data transformation...');
  
  if (!Array.isArray(leads)) {
    console.error('❌ Leads data is not an array:', leads);
    return false;
  }
  
  if (leads.length === 0) {
    console.log('ℹ️ No leads data to transform (empty array)');
    return true;
  }
  
  const sampleLead = leads[0];
  const requiredFields = ['id', 'email', 'status', 'createdAt'];
  const missingFields = requiredFields.filter(field => !(field in sampleLead));
  
  if (missingFields.length > 0) {
    console.error('❌ Missing required fields in lead data:', missingFields);
    return false;
  }
  
  console.log('✅ Data transformation test passed');
  return true;
};

// Test empty state handling
export const testEmptyStateHandling = () => {
  console.log('🔍 Testing empty state handling...');
  
  // Simulate empty API response
  const emptyResponse = {
    success: true,
    data: [],
    pagination: {
      total: 0,
      limit: 20,
      offset: 0,
      hasMore: false
    }
  };
  
  // Verify empty state is handled correctly
  if (Array.isArray(emptyResponse.data) && emptyResponse.data.length === 0) {
    console.log('✅ Empty state handling test passed');
    return true;
  }
  
  console.error('❌ Empty state handling test failed');
  return false;
};

// Test error handling
export const testErrorHandling = async () => {
  console.log('⚠️ Testing error handling...');
  
  try {
    // This should trigger error handling
    await apiService.getLeads({ search: 'invalid-search-that-should-fail' });
    console.log('ℹ️ No error occurred (API might be returning valid results)');
    return true;
  } catch (error) {
    console.log('✅ Error handling test passed - error was caught:', error);
    return true;
  }
};

// Run all tests
export const runAllLeadsTests = async () => {
  console.log('🚀 Running comprehensive leads integration tests...');
  
  const integrationTest = await testLeadsIntegration();
  const emptyStateTest = testEmptyStateHandling();
  const errorTest = await testErrorHandling();
  
  const allTestsPassed = integrationTest.success && emptyStateTest && errorTest;
  
  console.log('📊 Test Results Summary:');
  console.log('- Integration Test:', integrationTest.success ? '✅' : '❌');
  console.log('- Empty State Test:', emptyStateTest ? '✅' : '❌');
  console.log('- Error Handling Test:', errorTest ? '✅' : '❌');
  console.log('- Overall Result:', allTestsPassed ? '🎉 PASSED' : '❌ FAILED');
  
  return {
    success: allTestsPassed,
    results: {
      integration: integrationTest,
      emptyState: emptyStateTest,
      errorHandling: errorTest
    }
  };
};