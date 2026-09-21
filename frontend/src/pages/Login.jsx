import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to sign in. Please verify your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUseDemo = () => {
    setEmail('demo@invoiceai.com');
    setPassword('Password123!');
  };

  return (
    <div className="bg-[#181b21] p-8 sm:p-10 rounded-3xl border border-[#252932] shadow-2xl backdrop-blur-sm">
      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-2xl bg-[#8ff59c]/10 border border-[#8ff59c]/30 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-6 h-6 text-[#8ff59c]" />
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Sign In to Rivlo AI</h2>
        <p className="text-xs text-[#7e8695] mt-2">
          Access your autonomous AI invoice processing dashboard & analytics.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-rose-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[11px] font-semibold text-[#7e8695] uppercase tracking-wider mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-[#7e8695] absolute left-3.5 top-3" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full pl-10 pr-4 py-2.5 bg-[#0c0e12] border border-[#252932] rounded-xl text-sm text-white placeholder-[#7e8695]/60 focus:outline-none focus:border-[#8ff59c] focus:ring-1 focus:ring-[#8ff59c] transition-all"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[11px] font-semibold text-[#7e8695] uppercase tracking-wider">
              Password
            </label>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-[#7e8695] absolute left-3.5 top-3" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-10 pr-4 py-2.5 bg-[#0c0e12] border border-[#252932] rounded-xl text-sm text-white placeholder-[#7e8695]/60 focus:outline-none focus:border-[#8ff59c] focus:ring-1 focus:ring-[#8ff59c] transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full mt-3 py-3 px-4 bg-[#8ff59c] hover:bg-[#7de48b] disabled:opacity-50 text-[#0d1710] font-semibold text-sm rounded-full shadow-lg shadow-[#8ff59c]/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
        >
          {submitting ? 'Signing In...' : 'Sign In'}
          <ArrowRight className="w-4 h-4 text-[#0d1710]" />
        </button>
      </form>

      {/* Quick Demo Fill Button */}
      <div className="mt-8 pt-6 border-t border-[#252932] text-center">
        <button
          type="button"
          onClick={handleUseDemo}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#252932]/70 hover:bg-[#252932] text-xs font-medium text-slate-200 hover:text-white transition-colors border border-[#252932]"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#8ff59c]" />
          <span>Fill Demo Credentials (demo@invoiceai.com)</span>
        </button>

        <p className="mt-5 text-xs text-[#7e8695]">
          Don't have an account?{' '}
          <Link to="/register" className="text-[#8ff59c] font-semibold hover:underline">
            Register now
          </Link>
        </p>
      </div>
    </div>
  );
};
