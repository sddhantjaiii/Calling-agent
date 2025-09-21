import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const OAuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, setUser } = useAuth() as any; // Get auth context
  const [isLoading, setIsLoading] = useState(true);
  const [needsCompany, setNeedsCompany] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [isUpdatingCompany, setIsUpdatingCompany] = useState(false);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Get parameters from URL
        const token = searchParams.get('token');
        const refreshToken = searchParams.get('refreshToken');
        const userId = searchParams.get('userId');
        const email = searchParams.get('email');
        const name = searchParams.get('name');
        const needsCompanyParam = searchParams.get('needsCompany');
        const error = searchParams.get('error');

        if (error) {
          toast.error(`OAuth error: ${error}`);
          navigate('/');
          return;
        }

        if (!token || !refreshToken || !userId) {
          toast.error('OAuth callback missing required parameters');
          navigate('/');
          return;
        }

        // Store tokens in localStorage
        localStorage.setItem('auth_token', token);
        localStorage.setItem('refresh_token', refreshToken);

        // Create user object
        const userObject = {
          id: userId,
          email: email!,
          name: name!,
        };

        // Set user in auth context
        setUser(userObject);

        // Check if company name is needed (new Google users)
        if (needsCompanyParam === 'true') {
          setNeedsCompany(true);
          setIsLoading(false);
          return;
        }

        // Redirect to dashboard if no company name needed
        toast.success('Login successful!');
        navigate('/dashboard');
      } catch (error) {
        console.error('OAuth callback error:', error);
        toast.error('OAuth login failed');
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };

    handleOAuthCallback();
  }, [searchParams, navigate, setUser]);

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsUpdatingCompany(true);
    
    try {
      // Update user profile with company name (only if provided)
      if (companyName.trim()) {
        const token = localStorage.getItem('auth_token');
        const response = await fetch('http://localhost:3000/api/user/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            company: companyName.trim()
          })
        });

        if (response.ok) {
          toast.success('Profile updated successfully!');
        } else {
          toast.error('Failed to update profile');
        }
      }
      
      // Always navigate to dashboard, whether company was provided or not
      navigate('/dashboard');
    } catch (error) {
      console.error('Company update error:', error);
      toast.error('Failed to update company information');
      // Still navigate to dashboard even if company update fails
      navigate('/dashboard');
    } finally {
      setIsUpdatingCompany(false);
    }
  };

  const handleSkipCompany = () => {
    // Allow users to skip company name entry
    toast.success('Profile setup completed!');
    navigate('/dashboard');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Completing your sign-in...</p>
        </div>
      </div>
    );
  }

  if (needsCompany) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">
              Complete Your Profile
            </CardTitle>
            <p className="text-gray-600 mt-2">
              Please enter your company name to complete your account setup, or skip to continue.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCompanySubmit} className="space-y-4">
              <div>
                <Label htmlFor="company" className="text-gray-900 font-medium">
                  Company Name (Optional)
                </Label>
                <Input
                  id="company"
                  type="text"
                  placeholder="Enter your company name (optional)"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="mt-2 border-gray-300 focus:border-teal-500 focus:ring-teal-500"
                />
              </div>
              
              <div className="flex space-x-3">
                <Button
                  type="submit"
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
                  disabled={isUpdatingCompany}
                >
                  {isUpdatingCompany ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating...
                    </div>
                  ) : (
                    'Complete Setup'
                  )}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                  onClick={handleSkipCompany}
                  disabled={isUpdatingCompany}
                >
                  Skip
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};

export default OAuthCallback;