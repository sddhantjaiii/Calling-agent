#!/usr/bin/env ts-node

/**
 * Test Script: Authentication Flow Without 2FA Verification
 * 
 * This script tests the complete authentication flow to ensure:
 * 1. Settings page loads without requiring 2FA
 * 2. Existing token-based authentication still works
 * 3. Session validation works correctly
 * 4. Logout functionality remains intact
 * 
 * Requirements: 3.2, 3.3, 3.4
 */

import axios, { AxiosResponse } from 'axios';
import { config } from 'dotenv';

// Load environment variables
config();

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL';
  message: string;
  details?: any;
}

interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    credits: number;
    emailVerified: boolean;
    isActive: boolean;
    role?: string;
  };
  token: string;
  refreshToken: string;
}

interface UserProfile {
  id: string;
  email: string;
  name: string;
  credits: number;
  emailVerified: boolean;
  isActive: boolean;
  role?: string;
  company?: string;
  website?: string;
  location?: string;
  bio?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

class AuthenticationFlowTester {
  private results: TestResult[] = [];
  private testUser = {
    email: `test-auth-${Date.now()}@example.com`,
    password: 'testpassword123',
    name: 'Test User Auth Flow'
  };
  private authToken: string = '';
  private refreshToken: string = '';

  private addResult(test: string, status: 'PASS' | 'FAIL', message: string, details?: any) {
    this.results.push({ test, status, message, details });
    console.log(`${status === 'PASS' ? '✅' : '❌'} ${test}: ${message}`);
    if (details && status === 'FAIL') {
      console.log('   Details:', JSON.stringify(details, null, 2));
    }
  }

  private async makeRequest(method: 'GET' | 'POST' | 'PUT', url: string, data?: any, headers?: any): Promise<AxiosResponse> {
    try {
      const config = {
        method,
        url: `${API_URL}${url}`,
        data,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        timeout: 10000
      };

      return await axios(config);
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Test 1: User Registration (Setup)
   */
  async testUserRegistration(): Promise<void> {
    try {
      const response = await this.makeRequest('POST', '/auth/register', this.testUser);

      if (response.status === 201 && response.data.token && response.data.user) {
        this.authToken = response.data.token;
        this.refreshToken = response.data.refreshToken;
        this.addResult(
          'User Registration',
          'PASS',
          'User registered successfully with token-based authentication'
        );
      } else {
        this.addResult(
          'User Registration',
          'FAIL',
          'Registration failed - no token received',
          response.data
        );
      }
    } catch (error: any) {
      this.addResult(
        'User Registration',
        'FAIL',
        `Registration failed: ${error.response?.data?.error?.message || error.message}`,
        error.response?.data
      );
    }
  }

  /**
   * Test 2: Token-Based Authentication Works
   */
  async testTokenBasedAuthentication(): Promise<void> {
    try {
      const response = await this.makeRequest('GET', '/auth/validate', undefined, {
        'Authorization': `Bearer ${this.authToken}`
      });

      if (response.status === 200 && response.data.user) {
        this.addResult(
          'Token-Based Authentication',
          'PASS',
          'Token validation works correctly without 2FA requirement'
        );
      } else {
        this.addResult(
          'Token-Based Authentication',
          'FAIL',
          'Token validation failed',
          response.data
        );
      }
    } catch (error: any) {
      this.addResult(
        'Token-Based Authentication',
        'FAIL',
        `Token validation failed: ${error.response?.data?.error?.message || error.message}`,
        error.response?.data
      );
    }
  }

  /**
   * Test 3: Session Validation Works Correctly
   */
  async testSessionValidation(): Promise<void> {
    try {
      const response = await this.makeRequest('GET', '/auth/session', undefined, {
        'Authorization': `Bearer ${this.authToken}`
      });

      if (response.status === 200 && response.data.session) {
        this.addResult(
          'Session Validation',
          'PASS',
          'Session validation works correctly without 2FA'
        );
      } else {
        this.addResult(
          'Session Validation',
          'FAIL',
          'Session validation failed',
          response.data
        );
      }
    } catch (error: any) {
      this.addResult(
        'Session Validation',
        'FAIL',
        `Session validation failed: ${error.response?.data?.error?.message || error.message}`,
        error.response?.data
      );
    }
  }

  /**
   * Test 4: Settings Page Access Without 2FA
   */
  async testSettingsPageAccess(): Promise<void> {
    try {
      // Test user profile endpoint (used by settings page)
      const response = await this.makeRequest('GET', '/user/profile', undefined, {
        'Authorization': `Bearer ${this.authToken}`
      });

      if (response.status === 200 && response.data.success && response.data.data) {
        const userProfile: UserProfile = response.data.data;
        
        // Verify that profile data is accessible without 2FA
        if (userProfile.email === this.testUser.email && userProfile.name === this.testUser.name) {
          this.addResult(
            'Settings Page Access',
            'PASS',
            'Settings page data accessible without 2FA requirement'
          );
        } else {
          this.addResult(
            'Settings Page Access',
            'FAIL',
            'Profile data mismatch',
            { expected: this.testUser, received: userProfile }
          );
        }
      } else {
        this.addResult(
          'Settings Page Access',
          'FAIL',
          'Settings page data not accessible',
          response.data
        );
      }
    } catch (error: any) {
      this.addResult(
        'Settings Page Access',
        'FAIL',
        `Settings page access failed: ${error.response?.data?.error?.message || error.message}`,
        error.response?.data
      );
    }
  }

  /**
   * Test 5: Settings Update Without 2FA
   */
  async testSettingsUpdateWithout2FA(): Promise<void> {
    try {
      const updateData = {
        name: 'Updated Test User',
        company: 'Test Company',
        website: 'https://example.com',
        location: 'Test Location',
        bio: 'Test bio',
        phone: '+1234567890'
      };

      const response = await this.makeRequest('PUT', '/user/profile', updateData, {
        'Authorization': `Bearer ${this.authToken}`
      });

      if (response.status === 200 && response.data.success && response.data.data) {
        const updatedProfile: UserProfile = response.data.data;
        
        // Verify that profile was updated without 2FA
        if (updatedProfile.name === updateData.name && updatedProfile.company === updateData.company) {
          this.addResult(
            'Settings Update Without 2FA',
            'PASS',
            'Settings can be updated without 2FA requirement'
          );
        } else {
          this.addResult(
            'Settings Update Without 2FA',
            'FAIL',
            'Profile update data mismatch',
            { expected: updateData, received: updatedProfile }
          );
        }
      } else {
        this.addResult(
          'Settings Update Without 2FA',
          'FAIL',
          'Settings update failed',
          response.data
        );
      }
    } catch (error: any) {
      this.addResult(
        'Settings Update Without 2FA',
        'FAIL',
        `Settings update failed: ${error.response?.data?.error?.message || error.message}`,
        error.response?.data
      );
    }
  }

  /**
   * Test 6: Token Refresh Works
   */
  async testTokenRefresh(): Promise<void> {
    try {
      const response = await this.makeRequest('POST', '/auth/refresh', {
        refreshToken: this.refreshToken
      });

      if (response.status === 200 && response.data.token && response.data.user) {
        // Update tokens for subsequent tests
        this.authToken = response.data.token;
        this.refreshToken = response.data.refreshToken;
        
        this.addResult(
          'Token Refresh',
          'PASS',
          'Token refresh works correctly without 2FA'
        );
      } else {
        this.addResult(
          'Token Refresh',
          'FAIL',
          'Token refresh failed',
          response.data
        );
      }
    } catch (error: any) {
      this.addResult(
        'Token Refresh',
        'FAIL',
        `Token refresh failed: ${error.response?.data?.error?.message || error.message}`,
        error.response?.data
      );
    }
  }

  /**
   * Test 7: Logout Functionality Remains Intact
   */
  async testLogoutFunctionality(): Promise<void> {
    try {
      const response = await this.makeRequest('POST', '/auth/logout', {}, {
        'Authorization': `Bearer ${this.authToken}`
      });

      if (response.status === 200) {
        this.addResult(
          'Logout Functionality',
          'PASS',
          'Logout works correctly'
        );

        // Test that token is invalidated after logout
        try {
          await this.makeRequest('GET', '/auth/validate', undefined, {
            'Authorization': `Bearer ${this.authToken}`
          });
          
          this.addResult(
            'Token Invalidation After Logout',
            'FAIL',
            'Token should be invalidated after logout'
          );
        } catch (error: any) {
          if (error.response?.status === 401) {
            this.addResult(
              'Token Invalidation After Logout',
              'PASS',
              'Token correctly invalidated after logout'
            );
          } else {
            this.addResult(
              'Token Invalidation After Logout',
              'FAIL',
              `Unexpected error: ${error.message}`,
              error.response?.data
            );
          }
        }
      } else {
        this.addResult(
          'Logout Functionality',
          'FAIL',
          'Logout failed',
          response.data
        );
      }
    } catch (error: any) {
      this.addResult(
        'Logout Functionality',
        'FAIL',
        `Logout failed: ${error.response?.data?.error?.message || error.message}`,
        error.response?.data
      );
    }
  }

  /**
   * Test 8: Login After Logout
   */
  async testLoginAfterLogout(): Promise<void> {
    try {
      const response = await this.makeRequest('POST', '/auth/login', {
        email: this.testUser.email,
        password: this.testUser.password
      });

      if (response.status === 200 && response.data.token && response.data.user) {
        this.authToken = response.data.token;
        this.refreshToken = response.data.refreshToken;
        
        this.addResult(
          'Login After Logout',
          'PASS',
          'Login works correctly after logout without 2FA requirement'
        );
      } else {
        this.addResult(
          'Login After Logout',
          'FAIL',
          'Login after logout failed',
          response.data
        );
      }
    } catch (error: any) {
      this.addResult(
        'Login After Logout',
        'FAIL',
        `Login after logout failed: ${error.response?.data?.error?.message || error.message}`,
        error.response?.data
      );
    }
  }

  /**
   * Test 9: No 2FA Requirements in Any Flow
   */
  async testNo2FARequirements(): Promise<void> {
    try {
      // Test multiple authenticated endpoints to ensure no 2FA is required
      const endpoints = [
        '/auth/profile',
        '/auth/session',
        '/user/profile'
      ];

      let allPassed = true;
      const failedEndpoints: string[] = [];

      for (const endpoint of endpoints) {
        try {
          const response = await this.makeRequest('GET', endpoint, undefined, {
            'Authorization': `Bearer ${this.authToken}`
          });

          if (response.status !== 200) {
            allPassed = false;
            failedEndpoints.push(`${endpoint} (status: ${response.status})`);
          }
        } catch (error: any) {
          // Check if error is related to 2FA requirement
          const errorMessage = error.response?.data?.error?.message || error.message;
          if (errorMessage.toLowerCase().includes('2fa') || 
              errorMessage.toLowerCase().includes('two factor') ||
              errorMessage.toLowerCase().includes('verification required')) {
            allPassed = false;
            failedEndpoints.push(`${endpoint} (2FA required)`);
          } else if (error.response?.status !== 401) {
            // 401 is expected for some endpoints, but not 2FA-related
            allPassed = false;
            failedEndpoints.push(`${endpoint} (error: ${errorMessage})`);
          }
        }
      }

      if (allPassed) {
        this.addResult(
          'No 2FA Requirements',
          'PASS',
          'No 2FA requirements found in authentication flow'
        );
      } else {
        this.addResult(
          'No 2FA Requirements',
          'FAIL',
          'Some endpoints may require 2FA or have issues',
          { failedEndpoints }
        );
      }
    } catch (error: any) {
      this.addResult(
        'No 2FA Requirements',
        'FAIL',
        `Error testing 2FA requirements: ${error.message}`,
        error
      );
    }
  }

  /**
   * Cleanup: Remove test user
   */
  async cleanup(): Promise<void> {
    // Note: In a real scenario, you might want to clean up the test user
    // For now, we'll just log that cleanup should be done
    console.log('\n🧹 Cleanup: Test user should be removed from database if needed');
    console.log(`   Test user email: ${this.testUser.email}`);
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Authentication Flow Without 2FA Tests...\n');

    await this.testUserRegistration();
    await this.testTokenBasedAuthentication();
    await this.testSessionValidation();
    await this.testSettingsPageAccess();
    await this.testSettingsUpdateWithout2FA();
    await this.testTokenRefresh();
    await this.testLogoutFunctionality();
    await this.testLoginAfterLogout();
    await this.testNo2FARequirements();

    await this.cleanup();

    // Print summary
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`   - ${r.test}: ${r.message}`));
    }

    console.log('\n✨ Authentication flow verification complete!');
    
    // Exit with appropriate code
    process.exit(failed > 0 ? 1 : 0);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new AuthenticationFlowTester();
  tester.runAllTests().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

export { AuthenticationFlowTester };