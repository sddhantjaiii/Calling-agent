/**
 * Simple test execution script for data integration validation
 * This can be run in the browser console or as a standalone test
 */

import { dataIntegrationTester } from './dataIntegrationTests';

/**
 * Run data integration tests and log results to console
 */
export const runDataIntegrationTests = async () => {
  console.log('🚀 Starting Data Integration Validation Tests...');
  console.log('='.repeat(60));
  
  try {
    const results = await dataIntegrationTester.runAllTests();
    
    // Log summary
    console.log('\n📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Overall Status: ${results.overallPassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Summary: ${results.summary}`);
    
    // Log detailed results
    console.log('\n📋 DETAILED RESULTS');
    console.log('='.repeat(60));
    
    results.suites.forEach((suite, index) => {
      console.log(`\n${index + 1}. ${suite.name}`);
      console.log(`   Status: ${suite.passed ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(`   Summary: ${suite.summary}`);
      
      suite.results.forEach((result, resultIndex) => {
        const status = result.passed ? '✅' : '❌';
        console.log(`   ${resultIndex + 1}.${index + 1} ${status} ${result.component} - ${result.test}`);
        console.log(`        ${result.message}`);
        
        if (!result.passed && result.data) {
          console.log(`        Data:`, result.data);
        }
      });
    });
    
    // Generate and log report
    console.log('\n📄 MARKDOWN REPORT');
    console.log('='.repeat(60));
    const report = dataIntegrationTester.generateReport();
    console.log(report);
    
    // Log specific validation points
    console.log('\n🔍 KEY VALIDATION POINTS');
    console.log('='.repeat(60));
    console.log('✓ Dashboard KPIs show real data or "No data available" (no mock data)');
    console.log('✓ Analytics charts show real data or empty states (no default mock charts)');
    console.log('✓ Lead tables show real data or "No data available" (no sample leads)');
    console.log('✓ Lead profiles show real data or appropriate empty states');
    console.log('✓ All components handle loading states properly');
    console.log('✓ All components handle error states with retry options');
    console.log('✓ Empty database scenarios show proper empty states');
    
    return results;
    
  } catch (error) {
    console.error('❌ Error running data integration tests:', error);
    throw error;
  }
};

/**
 * Quick validation function that can be called from browser console
 */
export const quickValidation = async () => {
  console.log('🔍 Quick Data Integration Validation');
  console.log('This will test the current state of data integration...');
  
  try {
    const results = await runDataIntegrationTests();
    
    if (results.overallPassed) {
      console.log('\n🎉 SUCCESS: All data integration tests passed!');
      console.log('✅ Components properly display real data or appropriate empty states');
      console.log('✅ No mock data is being displayed in the application');
    } else {
      console.log('\n⚠️  WARNING: Some data integration tests failed');
      console.log('❌ Review the detailed results above to identify issues');
      console.log('❌ Some components may still be showing mock data');
    }
    
    return results.overallPassed;
    
  } catch (error) {
    console.log('\n💥 ERROR: Failed to run validation tests');
    console.error(error);
    return false;
  }
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).runDataIntegrationTests = runDataIntegrationTests;
  (window as any).quickValidation = quickValidation;
  
  console.log('🔧 Data integration test functions available:');
  console.log('- runDataIntegrationTests() - Full test suite');
  console.log('- quickValidation() - Quick validation check');
}

export default runDataIntegrationTests;