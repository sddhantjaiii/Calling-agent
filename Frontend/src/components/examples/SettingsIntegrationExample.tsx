import React, { useState, useEffect } from 'react';
import { apiService } from '@/services/apiService';
import { User, UserProfileUpdate } from '@/types/api';
import { toast } from 'sonner';

/**
 * Example component demonstrating how to use the updated API service
 * for extended profile support in settings integration
 */
export const SettingsIntegrationExample: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  // Load user profile on component mount
  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const response = await apiService.getUserProfile();
      
      if (response.success && response.data) {
        setUser(response.data);
      } else {
        toast.error('Failed to load user profile');
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      toast.error('Error loading profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (profileData: UserProfileUpdate) => {
    try {
      setLoading(true);
      
      // The API service now validates and sends extended profile fields
      const response = await apiService.updateUserProfile(profileData);
      
      if (response.success && response.data) {
        setUser(response.data);
        toast.success('Profile updated successfully!');
      } else {
        toast.error('Failed to update profile');
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      
      // Handle validation errors from the API service
      if (error.code === 'VALIDATION_ERROR') {
        const field = error.details?.field;
        toast.error(`Validation Error: ${error.message}`, {
          description: field ? `Please check the ${field} field` : undefined
        });
      } else {
        toast.error('Failed to update profile');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading && !user) {
    return <div>Loading profile...</div>;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Settings Integration Example</h2>
      
      {user && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Current Profile Data:</h3>
            <div className="bg-gray-100 p-4 rounded-lg space-y-2">
              <p><strong>Name:</strong> {user.name}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Company:</strong> {user.company || 'Not set'}</p>
              <p><strong>Website:</strong> {user.website || 'Not set'}</p>
              <p><strong>Location:</strong> {user.location || 'Not set'}</p>
              <p><strong>Bio:</strong> {user.bio || 'Not set'}</p>
              <p><strong>Phone:</strong> {user.phone || 'Not set'}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Test Profile Update:</h3>
            <button
              onClick={() => handleSaveProfile({
                name: 'Updated Name',
                company: 'Test Company Inc.',
                website: 'https://example.com',
                location: 'San Francisco, CA',
                bio: 'Updated bio description',
                phone: '+1234567890'
              })}
              disabled={loading}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Test Update Profile'}
            </button>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Test Validation Errors:</h3>
            <div className="space-x-2">
              <button
                onClick={() => handleSaveProfile({ email: 'invalid-email' })}
                disabled={loading}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
              >
                Test Invalid Email
              </button>
              <button
                onClick={() => handleSaveProfile({ website: 'invalid-url' })}
                disabled={loading}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
              >
                Test Invalid Website
              </button>
              <button
                onClick={() => handleSaveProfile({ name: 'a'.repeat(101) })}
                disabled={loading}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
              >
                Test Long Name
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsIntegrationExample;