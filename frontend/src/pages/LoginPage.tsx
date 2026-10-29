import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
    setError(null);
    setLoading(true);
    try {
      await login(demoEmail, 'Password123!');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate demo user.');
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
        <h2 className="text-xl font-bold tracking-tight text-white">Sign in to your compliance workspace</h2>
        <p className="mt-2 text-sm text-slate-400">
          Or{' '}
          <Link to="/signup" className="font-medium text-teal-400 hover:text-teal-300">
            register a new business account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-800/90 py-8 px-6 shadow-2xl rounded-2xl border border-slate-700/80 sm:px-10">
          {error && (
            <div className="mb-6 p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-200 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Work Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder-slate-500"
                placeholder="name@company.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-300">Password</label>
                <Link to="/reset-password" className="text-xs text-teal-400 hover:text-teal-300">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder-slate-500"
                placeholder="••••••••"
              />
            </div>

            <Button type="submit" isLoading={loading} className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold py-2.5">
              Sign In to Workspace
            </Button>
          </form>

          {/* Quick-Fill Demo Accounts */}
          <div className="mt-8 pt-6 border-t border-slate-700/80">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Quick Demo Sign-In
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('owner@example.com')}
                className="px-2.5 py-2 rounded-lg bg-slate-900/80 hover:bg-slate-700 border border-slate-700 text-left text-slate-300 transition-colors"
              >
                <span className="font-semibold block text-white">Sarah Jenkins</span>
                <span className="text-teal-400 text-[11px]">Business Owner</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('manager@example.com')}
                className="px-2.5 py-2 rounded-lg bg-slate-900/80 hover:bg-slate-700 border border-slate-700 text-left text-slate-300 transition-colors"
              >
                <span className="font-semibold block text-white">Alex Rivera</span>
                <span className="text-teal-400 text-[11px]">Compliance Mgr</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('employee@example.com')}
                className="px-2.5 py-2 rounded-lg bg-slate-900/80 hover:bg-slate-700 border border-slate-700 text-left text-slate-300 transition-colors"
              >
                <span className="font-semibold block text-white">David Chen</span>
                <span className="text-teal-400 text-[11px]">Employee</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('consultant@example.com')}
                className="px-2.5 py-2 rounded-lg bg-slate-900/80 hover:bg-slate-700 border border-slate-700 text-left text-slate-300 transition-colors"
              >
                <span className="font-semibold block text-white">Elena Rostova</span>
                <span className="text-teal-400 text-[11px]">Consultant</span>
              </button>
            </div>

            <div className="mt-2 text-center">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@regulatrack.local')}
                className="text-[11px] text-slate-400 hover:text-slate-200 underline"
              >
                Sign in as Platform Admin (admin@regulatrack.local)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
