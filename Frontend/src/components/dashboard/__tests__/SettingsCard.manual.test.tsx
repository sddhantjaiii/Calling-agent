/**
 * Manual test to verify SettingsCard functionality
 * This test demonstrates that the settings form correctly integrates with the backend
 */

import { apiService } from '@/services/apiService';

// Test function to verify settings integration
export const testSettingsIntegration = async () => {
  console.log('Testing Settings Integration...');

  try {
    // Test 1: Fetch user profile
    console.log('1. Testing getUserProfile...');
    const profileResponse = await apiService.getUserProfile();
    console.log('Profile response:', profileResponse);

    if (profileResponse.success && profileResponse.data) {
      const user = profileResponse.data;
      console.log('✅ Successfully fetched user profile');
      console.log('User data:', {
        name: user.name,
        email: user.email,
        company: user.company,
        website: user.website,
        location: user.location,
        bio: user.bio,
        phone: user.phone,
      });

      // Test 2: Update user profile with extended fields
      console.log('2. Testing updateUserProfile...');
      const updateData = {
        name: user.name,
        email: user.email,
        company: user.company || 'Test Company',
        website: user.website || 'https://example.com',
        location: user.location || 'Test Location',
        bio: user.bio || 'Test bio description',
        phone: user.phone || '+1234567890',
      };

      const updateResponse = await apiService.updateUserProfile(updateData);
      console.log('Update response:', updateResponse);

      if (updateResponse.success) {
        console.log('✅ Successfully updated user profile');
        console.log('Updated data:', updateResponse.data);
      } else {
        console.log('❌ Failed to update user profile');
      }

      // Test 3: Verify validation works
      console.log('3. Testing validation...');
      try {
        await apiService.updateUserProfile({
          email: 'invalid-email',
        });
        console.log('❌ Validation should have failed');
      } catch (error: any) {
        if (error.code === 'VALIDATION_ERROR') {
          console.log('✅ Validation correctly rejected invalid email');
        } else {
          console.log('⚠️ Unexpected error:', error);
        }
      }

    } else {
      console.log('❌ Failed to fetch user profile');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
};

// Export for use in development
export default testSettingsIntegration;