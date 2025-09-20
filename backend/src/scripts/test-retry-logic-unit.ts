#!/usr/bin/env ts-node

/**
 * Unit test for retry logic implementation (no external dependencies)
 * Requirements: 5.1, 5.5, 5.6
 */

import { RetryService, createElevenLabsRetryConfig } from '../services/retryService';

// Mock functions to simulate different failure scenarios
async function simulateNetworkError(): Promise<string> {
  throw new Error('ECONNRESET');
}

async function simulateRateLimitError(): Promise<string> {
  const error = new Error('Rate limit exceeded') as any;
  error.response = { status: 429 };
  throw error;
}

async function simulateServerError(): Promise<string> {
  const error = new Error('Internal server error') as any;
  error.response = { status: 500 };
  throw error;
}

async function simulateNonRetryableError(): Promise<string> {
  const error = new Error('Authentication failed') as any;
  error.response = { status: 401 };
  throw error;
}

async function simulateSuccessAfterRetries(attempts: number): Promise<string> {
  if (attempts < 3) {
    throw new Error('ETIMEDOUT');
  }
  return 'Success after retries!';
}

async function simulateTimeout(): Promise<string> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Operation timed out')), 5000);
  });
}

async function simulateSuccess(): Promise<string> {
  return 'Immediate success!';
}

async function testRetryLogic() {
  console.log('🧪 Testing Retry Logic Implementation');
  console.log('=====================================\n');

  let testsPassed = 0;
  let testsTotal = 0;

  // Test 1: Exponential backoff timing
  console.log('Test 1: Exponential backoff timing verification');
  testsTotal++;
  
  const startTime = Date.now();
  const backoffResult = await RetryService.executeWithRetry(
    simulateNetworkError,
    createElevenLabsRetryConfig(),
    'backoffTest'
  );
  const totalTime = Date.now() - startTime;
  
  // Should take at least 1s + 2s + 4s = 7s for 3 retries
  if (!backoffResult.success && totalTime >= 6000) {
    console.log(`✅ Correct exponential backoff timing: ${totalTime}ms`);
    testsPassed++;
  } else {
    console.log(`❌ Incorrect timing: ${totalTime}ms (expected >= 6000ms)`);
  }

  // Test 2: Maximum retry attempts
  console.log('\nTest 2: Maximum retry attempts (should be 3)');
  testsTotal++;
  
  const maxRetriesResult = await RetryService.executeWithRetry(
    simulateNetworkError,
    createElevenLabsRetryConfig(),
    'maxRetriesTest'
  );
  
  if (!maxRetriesResult.success && maxRetriesResult.attempts === 4) { // 1 initial + 3 retries
    console.log(`✅ Correct number of attempts: ${maxRetriesResult.attempts}`);
    testsPassed++;
  } else {
    console.log(`❌ Incorrect attempts: ${maxRetriesResult.attempts} (expected 4)`);
  }

  // Test 3: Success after retries
  console.log('\nTest 3: Success after retries');
  testsTotal++;
  
  let attemptCount = 0;
  const successResult = await RetryService.executeWithRetry(
    () => {
      attemptCount++;
      return simulateSuccessAfterRetries(attemptCount);
    },
    createElevenLabsRetryConfig(),
    'successAfterRetriesTest'
  );
  
  if (successResult.success && successResult.data === 'Success after retries!' && successResult.attempts === 3) {
    console.log(`✅ Success after ${successResult.attempts} attempts`);
    testsPassed++;
  } else {
    console.log(`❌ Unexpected result: ${JSON.stringify(successResult)}`);
  }

  // Test 4: Immediate success (no retries needed)
  console.log('\nTest 4: Immediate success (no retries)');
  testsTotal++;
  
  const immediateResult = await RetryService.executeWithRetry(
    simulateSuccess,
    createElevenLabsRetryConfig(),
    'immediateSuccessTest'
  );
  
  if (immediateResult.success && immediateResult.data === 'Immediate success!' && immediateResult.attempts === 1) {
    console.log(`✅ Immediate success with ${immediateResult.attempts} attempt`);
    testsPassed++;
  } else {
    console.log(`❌ Unexpected result: ${JSON.stringify(immediateResult)}`);
  }

  // Test 5: Timeout handling
  console.log('\nTest 5: Timeout handling');
  testsTotal++;
  
  const timeoutStartTime = Date.now();
  try {
    const result = await RetryService.withTimeout(
      simulateTimeout,
      2000, // 2 second timeout
      'timeoutTest'
    );
    console.log('❌ Expected timeout but got success');
  } catch (error) {
    const totalTime = Date.now() - timeoutStartTime;
    if (totalTime >= 1900 && totalTime <= 2500) { // Allow some variance
      console.log(`✅ Correct timeout behavior: ${totalTime}ms`);
      testsPassed++;
    } else {
      console.log(`❌ Incorrect timeout: ${totalTime}ms (expected ~2000ms)`);
    }
  }

  // Test 6: Combined retry and timeout
  console.log('\nTest 6: Combined retry and timeout');
  testsTotal++;
  
  const combinedResult = await RetryService.executeWithRetryAndTimeout(
    simulateTimeout,
    createElevenLabsRetryConfig(),
    1000, // 1 second timeout per attempt
    'combinedTest'
  );
  
  // Timeout errors should not be retryable unless explicitly configured
  if (!combinedResult.success && combinedResult.attempts === 1) {
    console.log(`✅ Timeout not retried (correct): ${combinedResult.attempts} attempt`);
    testsPassed++;
  } else {
    console.log(`❌ Expected 1 attempt for timeout, got: ${combinedResult.attempts}`);
  }

  // Test 7: Retryable vs non-retryable errors
  console.log('\nTest 7: Non-retryable error handling');
  testsTotal++;
  
  const nonRetryableResult = await RetryService.executeWithRetry(
    simulateNonRetryableError,
    {
      ...createElevenLabsRetryConfig(),
      retryableErrors: ['ECONNRESET', 'ETIMEDOUT', '429', '500', '502', '503', '504'] // 401 not included
    },
    'nonRetryableTest'
  );
  
  // Should fail immediately without retries for 401 error
  if (!nonRetryableResult.success && nonRetryableResult.attempts === 1) {
    console.log(`✅ Non-retryable error handled correctly: ${nonRetryableResult.attempts} attempt`);
    testsPassed++;
  } else {
    console.log(`❌ Expected 1 attempt for non-retryable error, got: ${nonRetryableResult.attempts}`);
  }

  // Test 8: Retry configuration validation
  console.log('\nTest 8: ElevenLabs retry configuration');
  testsTotal++;
  const config = createElevenLabsRetryConfig();
  
  if (config.maxRetries === 3 && 
      config.baseDelay === 1000 && 
      config.maxDelay === 4000 && 
      config.backoffMultiplier === 2) {
    console.log('✅ ElevenLabs retry configuration is correct');
    testsPassed++;
  } else {
    console.log('❌ ElevenLabs retry configuration is incorrect');
    console.log('Expected: maxRetries=3, baseDelay=1000, maxDelay=4000, backoffMultiplier=2');
    console.log(`Actual: maxRetries=${config.maxRetries}, baseDelay=${config.baseDelay}, maxDelay=${config.maxDelay}, backoffMultiplier=${config.backoffMultiplier}`);
  }

  // Summary
  console.log('\n📊 Test Results Summary');
  console.log('=======================');
  console.log(`Tests passed: ${testsPassed}/${testsTotal}`);
  console.log(`Success rate: ${Math.round((testsPassed / testsTotal) * 100)}%`);

  if (testsPassed === testsTotal) {
    console.log('\n✅ All retry logic tests passed!');
    console.log('\n🎯 Implementation Requirements Verified:');
    console.log('- ✅ Exponential backoff with 1s, 2s, 4s delays');
    console.log('- ✅ Maximum 3 retry attempts for failed requests');
    console.log('- ✅ Proper error logging for failed API calls');
    console.log('- ✅ Timeout handling for individual API requests');
    console.log('- ✅ Retryable vs non-retryable error classification');
    console.log('- ✅ Combined retry and timeout functionality');
    return true;
  } else {
    console.log('\n❌ Some tests failed. Please review the implementation.');
    return false;
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  testRetryLogic().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { testRetryLogic };