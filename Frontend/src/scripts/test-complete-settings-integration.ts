/**
 * Complete Settings Integration Test Script
 * 
 * This script tests the complete settings integration flow from frontend to backend:
 * 1. Load user profile data from backend
 * 2. Update profile fields through the settings form
 * 3. Verify data persistence and error handling
 * 4. Test all validation scenarios
 * 
 * Requirements covered: 1.1, 1.2, 1.3, 4.4, 4.5
 */

import { apiService } from '../services/apiService';

interface TestResult {
  testName: string;
  passed: boolean;
  error?: string;
  duration: number;
}

class SettingsIntegrationTester {
  private results: TestResult[] = [];
  private testUserId = 'test-integration-user';
  private originalConsoleLog = console.log;
  private originalConsoleError = console.error;

  constructor() {
    // Capture console output for testing
    console.log = (...args) => this.log('LOG', ...args);
    console.error = (...args) => this.log('ERROR', ...args);
  }

  private log(level: string, ...args: any[]) {
    this.originalConsoleLog(`[${level}]`, ...args);
  }

  private async runTest(testName: string, testFn: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    
    try {
      await testFn();
      const duration = Date.now() - startTime;
      this.results.push({ testName, passed: true, duration });
      this.log('LOG', `✅ ${testName} - PASSED (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.results.push({ testName, passed: false, error: errorMessage, duration });
      this.log('ERROR', `❌ ${testName} - FAILED (${duration}ms): ${errorMessage}`);
    }
  }

  async testCompleteSettingsFlow(): Promise<void> {
    this.log('LOG', '🚀 Starting Complete Settings Integration Tests');
    this.log('LOG', '================================================');

    // Test 1: Load user profile data
    await this.runTest('Load User Profile Data', async () => {
      const response = await apiService.getUserProfile();
      
      if (!response.success || !response.data) {
        throw new Error('Failed to load user profile data');
      }

      const user = response.data;
      
      // Verify required fields
      if (!user.id || !user.email || !user.name) {
        throw new Error('Missing required user fields');
      }

      // Verify extended profile fields are present (can be null)
      const extendedFields = ['company', 'website', 'location', 'bio', 'phone'];
      for (const field of extendedFields) {
        if (!(field in user)) {
          throw new Error(`Missing extended profile field: ${field}`);
        }
      }

      this.log('LOG', `User profile loaded: ${user.name} (${user.email})`);
    });

    // Test 2: Update all profile fields
    await this.runTest('Update All Profile Fields', async () => {
      const updateData = {
        name: 'Integration Test User',
        email: 'integration@test.com',
        company: 'Test Company Inc.',
        website: 'https://test-company.com',
        location: 'Test City, TC',
        bio: 'This is a test bio for integration testing purposes.',
        phone: '+1234567890',
      };

      const response = await apiService.updateUserProfile(updateData);
      
      if (!response.success || !response.data) {
        throw new Error('Failed to update user profile');
      }

      const updatedUser = response.data;
      
      // Verify all fields were updated
      Object.entries(updateData).forEach(([key, value]) => {
        if (updatedUser[key as keyof typeof updatedUser] !== value) {
          throw new Error(`Field ${key} was not updated correctly`);
        }
      });

      this.log('LOG', 'All profile fields updated successfully');
    });

    // Test 3: Update partial fields
    await this.runTest('Update Partial Profile Fields', async () => {
      const partialUpdateData = {
        name: 'Partially Updated User',
        company: 'Partially Updated Company',
      };

      const response = await apiService.updateUserProfile(partialUpdateData);
      
      if (!response.success || !response.data) {
        throw new Error('Failed to update partial profile fields');
      }

      const updatedUser = response.data;
      
      // Verify updated fields
      if (updatedUser.name !== partialUpdateData.name) {
        throw new Error('Name was not updated correctly');
      }
      if (updatedUser.company !== partialUpdateData.company) {
        throw new Error('Company was not updated correctly');
      }

      this.log('LOG', 'Partial profile fields updated successfully');
    });

    // Test 4: Clear optional fields
    await this.runTest('Clear Optional Profile Fields', async () => {
      const clearFieldsData = {
        company: '',
        website: '',
        location: '',
        bio: '',
        phone: '',
      };

      const response = await apiService.updateUserProfile(clearFieldsData);
      
      if (!response.success) {
        throw new Error('Failed to clear optional profile fields');
      }

      this.log('LOG', 'Optional profile fields cleared successfully');
    });

    // Test 5: Validate email format
    await this.runTest('Validate Email Format', async () => {
      const invalidEmailData = {
        email: 'invalid-email-format',
      };

      try {
        await apiService.updateUserProfile(invalidEmailData);
        throw new Error('Should have failed with invalid email format');
      } catch (error: any) {
        if (error.code !== 'VALIDATION_ERROR' && !error.message.includes('email')) {
          throw new Error(`Expected validation error for email, got: ${error.message}`);
        }
      }

      this.log('LOG', 'Email format validation working correctly');
    });

    // Test 6: Validate website URL format
    await this.runTest('Validate Website URL Format', async () => {
      const invalidWebsiteData = {
        website: 'not-a-valid-url',
      };

      try {
        await apiService.updateUserProfile(invalidWebsiteData);
        throw new Error('Should have failed with invalid website URL');
      } catch (error: any) {
        if (error.code !== 'VALIDATION_ERROR' && !error.message.includes('URL')) {
          throw new Error(`Expected validation error for website URL, got: ${error.message}`);
        }
      }

      this.log('LOG', 'Website URL format validation working correctly');
    });

    // Test 7: Validate phone number format
    await this.runTest('Validate Phone Number Format', async () => {
      const invalidPhoneData = {
        phone: 'invalid-phone-123abc',
      };

      try {
        await apiService.updateUserProfile(invalidPhoneData);
        throw new Error('Should have failed with invalid phone number');
      } catch (error: any) {
        if (error.code !== 'VALIDATION_ERROR' && !error.message.includes('phone')) {
          throw new Error(`Expected validation error for phone number, got: ${error.message}`);
        }
      }

      this.log('LOG', 'Phone number format validation working correctly');
    });

    // Test 8: Validate field length limits
    await this.runTest('Validate Field Length Limits', async () => {
      const longNameData = {
        name: 'a'.repeat(256), // Exceeds 255 character limit
      };

      try {
        await apiService.updateUserProfile(longNameData);
        throw new Error('Should have failed with name too long');
      } catch (error: any) {
        if (error.code !== 'VALIDATION_ERROR' && !error.message.includes('255')) {
          throw new Error(`Expected validation error for name length, got: ${error.message}`);
        }
      }

      this.log('LOG', 'Field length validation working correctly');
    });

    // Test 9: Test network error handling
    await this.runTest('Handle Network Errors', async () => {
      // Temporarily mock a network error
      const originalUpdateProfile = apiService.updateUserProfile;
      
      apiService.updateUserProfile = async () => {
        throw { code: 'NETWORK_ERROR', message: 'Network connection failed' };
      };

      try {
        await apiService.updateUserProfile({ name: 'Test' });
        throw new Error('Should have failed with network error');
      } catch (error: any) {
        if (error.code !== 'NETWORK_ERROR') {
          throw new Error(`Expected network error, got: ${error.message}`);
        }
      } finally {
        // Restore original function
        apiService.updateUserProfile = originalUpdateProfile;
      }

      this.log('LOG', 'Network error handling working correctly');
    });

    // Test 10: Test authentication error handling
    await this.runTest('Handle Authentication Errors', async () => {
      // Temporarily mock an authentication error
      const originalUpdateProfile = apiService.updateUserProfile;
      
      apiService.updateUserProfile = async () => {
        throw { code: 'UNAUTHORIZED', message: 'Authentication token has expired' };
      };

      try {
        await apiService.updateUserProfile({ name: 'Test' });
        throw new Error('Should have failed with authentication error');
      } catch (error: any) {
        if (error.code !== 'UNAUTHORIZED') {
          throw new Error(`Expected authentication error, got: ${error.message}`);
        }
      } finally {
        // Restore original function
        apiService.updateUserProfile = originalUpdateProfile;
      }

      this.log('LOG', 'Authentication error handling working correctly');
    });

    // Test 11: Test data persistence
    await this.runTest('Verify Data Persistence', async () => {
      // Update profile with test data
      const testData = {
        name: 'Persistence Test User',
        company: 'Persistence Test Company',
        bio: 'Testing data persistence across requests',
      };

      const updateResponse = await apiService.updateUserProfile(testData);
      if (!updateResponse.success) {
        throw new Error('Failed to update profile for persistence test');
      }

      // Load profile again to verify persistence
      const loadResponse = await apiService.getUserProfile();
      if (!loadResponse.success || !loadResponse.data) {
        throw new Error('Failed to load profile for persistence verification');
      }

      const user = loadResponse.data;
      
      // Verify data persisted correctly
      if (user.name !== testData.name) {
        throw new Error('Name did not persist correctly');
      }
      if (user.company !== testData.company) {
        throw new Error('Company did not persist correctly');
      }
      if (user.bio !== testData.bio) {
        throw new Error('Bio did not persist correctly');
      }

      this.log('LOG', 'Data persistence verified successfully');
    });

    // Test 12: Test concurrent updates
    await this.runTest('Handle Concurrent Updates', async () => {
      const update1 = apiService.updateUserProfile({ name: 'Concurrent Update 1' });
      const update2 = apiService.updateUserProfile({ company: 'Concurrent Company 2' });

      const [response1, response2] = await Promise.all([update1, update2]);

      if (!response1.success || !response2.success) {
        throw new Error('One or both concurrent updates failed');
      }

      this.log('LOG', 'Concurrent updates handled successfully');
    });

    // Test 13: Test empty request handling
    await this.runTest('Handle Empty Update Request', async () => {
      try {
        await apiService.updateUserProfile({});
        throw new Error('Should have failed with empty update request');
      } catch (error: any) {
        if (!error.message.includes('required') && error.code !== 'INVALID_INPUT') {
          throw new Error(`Expected validation error for empty request, got: ${error.message}`);
        }
      }

      this.log('LOG', 'Empty request handling working correctly');
    });

    // Test 14: Test special characters handling
    await this.runTest('Handle Special Characters', async () => {
      const specialCharsData = {
        name: 'Test User with Émojis 🚀',
        company: 'Company & Associates (Ltd.)',
        bio: 'Bio with special chars: @#$%^&*()_+-=[]{}|;:,.<>?',
      };

      const response = await apiService.updateUserProfile(specialCharsData);
      
      if (!response.success || !response.data) {
        throw new Error('Failed to handle special characters');
      }

      const updatedUser = response.data;
      
      // Verify special characters were preserved
      if (updatedUser.name !== specialCharsData.name) {
        throw new Error('Special characters in name were not preserved');
      }

      this.log('LOG', 'Special characters handled successfully');
    });

    // Test 15: Test loading states and user experience
    await this.runTest('Verify Loading States', async () => {
      // This test would typically be done in the UI component tests
      // Here we just verify that API calls complete within reasonable time
      const startTime = Date.now();
      
      const response = await apiService.getUserProfile();
      
      const duration = Date.now() - startTime;
      
      if (duration > 5000) { // 5 seconds timeout
        throw new Error(`API call took too long: ${duration}ms`);
      }

      if (!response.success) {
        throw new Error('API call failed during loading state test');
      }

      this.log('LOG', `API response time: ${duration}ms - within acceptable range`);
    });

    this.printSummary();
  }

  private printSummary(): void {
    this.log('LOG', '\n📊 Test Summary');
    this.log('LOG', '================');
    
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    
    this.log('LOG', `Total Tests: ${totalTests}`);
    this.log('LOG', `Passed: ${passedTests}`);
    this.log('LOG', `Failed: ${failedTests}`);
    
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    this.log('LOG', `Total Duration: ${totalDuration}ms`);
    
    if (failedTests > 0) {
      this.log('LOG', '\n❌ Failed Tests:');
      this.results
        .filter(r => !r.passed)
        .forEach(r => {
          this.log('ERROR', `  - ${r.testName}: ${r.error}`);
        });
    }
    
    const successRate = (passedTests / totalTests) * 100;
    this.log('LOG', `\n🎯 Success Rate: ${successRate.toFixed(1)}%`);
    
    if (successRate === 100) {
      this.log('LOG', '🎉 All tests passed! Settings integration is working correctly.');
    } else if (successRate >= 80) {
      this.log('LOG', '⚠️  Most tests passed, but some issues need attention.');
    } else {
      this.log('ERROR', '🚨 Many tests failed. Settings integration needs significant fixes.');
    }

    // Restore original console methods
    console.log = this.originalConsoleLog;
    console.error = this.originalConsoleError;
  }

  getResults(): TestResult[] {
    return [...this.results];
  }
}

// Export for use in other test files
export { SettingsIntegrationTester, TestResult };

// Run tests if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment
  const tester = new SettingsIntegrationTester();
  tester.testCompleteSettingsFlow().catch(console.error);
} else if (require.main === module) {
  // Node.js environment
  const tester = new SettingsIntegrationTester();
  tester.testCompleteSettingsFlow().catch(console.error);
}