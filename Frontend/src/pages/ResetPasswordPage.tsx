import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiService } from '@/services/apiService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const ResetPasswordPage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');
  const prefillEmail = params.get('email') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    let mounted = true;
    const validate = async () => {
      if (!token) {
        setValidating(false);
        setTokenValid(false);
        return;
      }
      try {
        const res = await apiService.validateResetToken(token);
        if (!mounted) return;
        setTokenValid(!!res.success);
      } catch (e) {
        if (!mounted) return;
        setTokenValid(false);
      } finally {
        if (mounted) setValidating(false);
      }
    };
    validate();
    return () => { mounted = false; };
  }, [token]);

  const canSubmit = useMemo(() => {
    if (!token) return false;
    return password.length >= 8 && password === confirmPassword;
  }, [token, password, confirmPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    try {
      const res = await apiService.resetPassword(token, password);
      if (res.success) {
        toast.success('Password reset successful. Please log in.');
        navigate('/');
      } else {
        toast.error(res.error?.message || 'Failed to reset password');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  // No token in URL
  if (!token) {
    return (
      <div className="max-w-md mx-auto p-8 bg-white shadow-sm rounded-xl border border-gray-200">
        <h1 className="text-2xl font-semibold mb-2 text-gray-900">Reset Password</h1>
        <p className="text-gray-600 mb-4">This link doesn\'t include a reset token. Please request a new reset email.</p>
        <div className="text-sm text-gray-500 mb-6">{prefillEmail && `Email: ${decodeURIComponent(prefillEmail)}`}</div>
        <Button onClick={() => navigate('/')} className="w-full bg-teal-600 hover:bg-teal-700">Back to Login</Button>
      </div>
    );
  }

  // Token present: first show validation status
  if (validating) {
    return (
      <div className="max-w-md mx-auto p-8 bg-white shadow-sm rounded-xl border border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-teal-600"></div>
          <p className="text-gray-700">Validating reset link…</p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="max-w-md mx-auto p-8 bg-white shadow-sm rounded-xl border border-gray-200">
        <h1 className="text-2xl font-semibold mb-2 text-gray-900">Link expired or invalid</h1>
        <p className="text-gray-600 mb-6">Your reset link is invalid or has expired. Please request a new password reset email.</p>
        <Button onClick={() => navigate('/')} className="w-full bg-teal-600 hover:bg-teal-700">Back to Login</Button>
      </div>
    );
  }

  // Valid token: show reset form
  return (
    <div className="max-w-md mx-auto p-8 bg-white shadow-sm rounded-xl border border-gray-200">
      <h1 className="text-2xl font-semibold mb-2 text-gray-900">Choose a new password</h1>
      <p className="text-sm text-gray-600 mb-6">Your new password must be at least 8 characters long.</p>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-800">New password</label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" className="h-11" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-800">Confirm password</label>
          <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password" className="h-11" />
        </div>
        <Button type="submit" disabled={!canSubmit || loading} className="w-full bg-teal-600 hover:bg-teal-700 h-11">
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Resetting…
            </div>
          ) : (
            'Reset Password'
          )}
        </Button>
      </form>
    </div>
  );
};

export default ResetPasswordPage;
