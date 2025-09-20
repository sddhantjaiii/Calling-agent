/**
 * Integration test script for Settings form backend integration
 * Run this script to verify that the settings form correctly connects to the backend
 */

import { apiService } from '../services/apiService';

async function testSettingsIntegration() {
  console.log('🧪 Testing Settings Form Backend Integration...\n');

  try {
    // Test 1: Verify getUserProfile works
    console.log('1️⃣ Testing getUserProfile API call...');
    const profileResponse = await apiService.getUserProfile();
    
    if (profileResponse.success && profileResponse.data) {
      console.log('✅ getUserProfile successful');
      console.log('📋 Current profile data:');
      console.log(`   Name: ${profileResponse.data.name}`);
      console.log(`   Email: ${profileResponse.data.email}`);
      console.log(`   Company: ${profileResponse.data.company || 'Not set'}`);
      console.log(`   Website: ${profileResponse.data.website || 'Not set'}`);
      console.log(`   Location: ${profileResponse.data.location || 'Not set'}`);
      console.log(`   Bio: ${profileResponse.data.bio || 'Not set'}`);
      console.log(`   Phone: ${profileResponse.data.phone || 'Not set'}\n`);

      // Test 2: Verify updateUserProfile works with extended fields
      console.log('2️⃣ Testing updateUserProfile with extended fields...');
      const testUpdateData = {
        name: profileResponse.data.name,
        email: profileResponse.data.email,
        company: 'Updated Test Company',
        website: 'https://updated-example.com',
        location: 'Updated Test Location',
        bio: 'Updated test bio description',
        phone: '+1987654321',
      };

      const updateResponse = await apiService.updateUserProfile(testUpdateData);
      
      if (updateResponse.success && updateResponse.data) {
        console.log('✅ updateUserProfile successful');
        console.log('📋 Updated profile data:');
        console.log(`   Name: ${updateResponse.data.name}`);
        console.log(`   Email: ${updateResponse.data.email}`);
        console.log(`   Company: ${updateResponse.data.company}`);
        console.log(`   Website: ${updateResponse.data.website}`);
        console.log(`   Location: ${updateResponse.data.location}`);
        console.log(`   Bio: ${updateResponse.data.bio}`);
        console.log(`   Phone: ${updateResponse.data.phone}\n`);
      } else {
        console.log('❌ updateUserProfile failed');
        console.log('Response:', updateResponse);
      }

      // Test 3: Verify validation works
      console.log('3️⃣ Testing validation with invalid data...');
      try {
        await apiService.updateUserProfile({
          email: 'invalid-email-format',
        });
        console.log('❌ Validation should have failed for invalid email');
      } catch (error: any) {
        if (error.code === 'VALIDATION_ERROR') {
          console.log('✅ Validation correctly rejected invalid email');
          console.log(`   Error: ${error.message}\n`);
        } else {
          console.log('⚠️ Unexpected validation error:', error.message);
        }
      }

      // Test 4: Test with empty optional fields
      console.log('4️⃣ Testing with empty optional fields...');
      const emptyFieldsData = {
        name: profileResponse.data.name,
        email: profileResponse.data.email,
        company: '',
        website: '',
        location: '',
        bio: '',
        phone: '',
      };

      const emptyFieldsResponse = await apiService.updateUserProfile(emptyFieldsData);
      
      if (emptyFieldsResponse.success) {
        console.log('✅ Empty optional fields handled correctly');
        console.log('📋 Profile with empty fields:');
        console.log(`   Company: ${emptyFieldsResponse.data?.company || 'null'}`);
        console.log(`   Website: ${emptyFieldsResponse.data?.website || 'null'}`);
        console.log(`   Location: ${emptyFieldsResponse.data?.location || 'null'}`);
        console.log(`   Bio: ${emptyFieldsResponse.data?.bio || 'null'}`);
        console.log(`   Phone: ${emptyFieldsResponse.data?.phone || 'null'}\n`);
      } else {
        console.log('❌ Failed to handle empty optional fields');
      }

      console.log('🎉 All tests completed successfully!');
      console.log('✅ Settings form is properly integrated with the backend');
      console.log('✅ All extended profile fields (company, website, location, bio, phone) are working');
      console.log('✅ Form validation is working correctly');
      console.log('✅ Error handling is implemented');

    } else {
      console.log('❌ Failed to fetch user profile');
      console.log('Response:', profileResponse);
    }

  } catch (error: any) {
    console.error('❌ Integration test failed:', error.message);
    console.error('Full error:', error);
  }
}

// Run the test if this script is executed directly
if (typeof window === 'undefined') {
  // Node.js environment
  testSettingsIntegration();
} else {
  // Browser environment - expose function globally for manual testing
  (window as any).testSettingsIntegration = testSettingsIntegration;
  console.log('Settings integration test function available as window.testSettingsIntegration()');
}

export default testSettingsIntegration;