import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

export function AuthDebug() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const authToken = localStorage.getItem('auth_token');
  const refreshToken = localStorage.getItem('refresh_token');

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-lg text-xs max-w-sm z-50">
      <h3 className="font-bold mb-2">Auth Debug</h3>
      <div className="space-y-1">
        <div>Loading: {isLoading ? 'Yes' : 'No'}</div>
        <div>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</div>
        <div>User: {user ? `${user.email} (${user.role})` : 'None'}</div>
        <div>Auth Token: {authToken ? 'Present' : 'Missing'}</div>
        <div>Refresh Token: {refreshToken ? 'Present' : 'Missing'}</div>
        {authToken && (
          <div className="mt-2">
            <button
              onClick={() => {
                console.log('Auth Token:', authToken);
                try {
                  const payload = JSON.parse(atob(authToken.split('.')[1]));
                  console.log('Token Payload:', payload);
                } catch (e) {
                  console.error('Failed to decode token:', e);
                }
              }}
              className="bg-blue-600 px-2 py-1 rounded text-xs"
            >
              Log Token
            </button>
          </div>
        )}
      </div>
    </div>
  );
}