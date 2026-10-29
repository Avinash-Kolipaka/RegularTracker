import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../api/client';
import { Button } from '../components/ui/Button';

export const PasswordResetPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tokenParam = searchParams.get('token');
  const uidParam = searchParams.get('uid');

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.requestPasswordReset(email);
      setSuccessMsg(res.message || 'If an account exists, a reset link has been dispatched.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch password reset request.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenParam || !uidParam) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      await api.confirmPasswordReset({
        uid: uidParam,
        token: tokenParam,
        new_password: newPassword,
      });
      setSuccessMsg('Your password has been updated. You can now sign in.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-400 flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6 text-teal-400" />
          </div>
          <span className="font-bold text-2xl text-white">RegulaTrack</span>
        </Link>
        <h2 className="text-xl font-bold tracking-tight text-white">
          {tokenParam ? 'Set new password' : 'Reset your password'}
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-800/90 py-8 px-6 shadow-2xl rounded-2xl border border-slate-700/80 sm:px-10">
          {successMsg && (
            <div className="mb-6 p-4 rounded-xl bg-teal-950/50 border border-teal-800 text-teal-200 text-sm flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-teal-400 mt-0.5" />
              <div>
                <p className="font-semibold text-white">Request Processed</p>
                <p className="mt-1 text-teal-200">{successMsg}</p>
                <Link to="/login" className="inline-block mt-3 font-semibold text-teal-400 hover:text-teal-300 underline">
                  Back to Sign In
                </Link>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="mb-6 p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-200 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!successMsg && !tokenParam && (
            <form className="space-y-4" onSubmit={handleRequest}>
              <p className="text-xs text-slate-400">
                Enter your account email. If a matching account is found, a secure reset token link will be dispatched.
              </p>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Account Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="name@company.com"
                />
              </div>
              <Button type="submit" isLoading={loading} className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold py-2.5">
                Send Reset Link
              </Button>
            </form>
          )}

          {!successMsg && tokenParam && (
            <form className="space-y-4" onSubmit={handleConfirm}>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">New Password (min 8 chars)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="••••••••"
                />
              </div>
              <Button type="submit" isLoading={loading} className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold py-2.5">
                Update Password
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link to="/login" className="text-xs text-slate-400 hover:text-white">
              Remembered your credentials? Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
