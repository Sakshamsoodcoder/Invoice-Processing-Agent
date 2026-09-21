import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User as UserIcon, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await register(name, email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#181b21] p-8 sm:p-10 rounded-3xl border border-[#252932] shadow-2xl backdrop-blur-sm">
      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-2xl bg-[#8ff59c]/10 border border-[#8ff59c]/30 flex items-center justify-center mx-auto mb-4">
          <UserIcon className="w-6 h-6 text-[#8ff59c]" />
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Create an Account</h2>
        <p className="text-xs text-[#7e8695] mt-2">
          Start processing invoices with automated AI validation.
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
            Full Name
          </label>
          <div className="relative">
            <UserIcon className="w-4 h-4 text-[#7e8695] absolute left-3.5 top-3" />
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sarah Connor"
              className="w-full pl-10 pr-4 py-2.5 bg-[#0c0e12] border border-[#252932] rounded-xl text-sm text-white placeholder-[#7e8695]/60 focus:outline-none focus:border-[#8ff59c] focus:ring-1 focus:ring-[#8ff59c] transition-all"
            />
          </div>
        </div>

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
              placeholder="sarah@enterprise.com"
              className="w-full pl-10 pr-4 py-2.5 bg-[#0c0e12] border border-[#252932] rounded-xl text-sm text-white placeholder-[#7e8695]/60 focus:outline-none focus:border-[#8ff59c] focus:ring-1 focus:ring-[#8ff59c] transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-[#7e8695] uppercase tracking-wider mb-1.5">
            Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-[#7e8695] absolute left-3.5 top-3" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full pl-10 pr-4 py-2.5 bg-[#0c0e12] border border-[#252932] rounded-xl text-sm text-white placeholder-[#7e8695]/60 focus:outline-none focus:border-[#8ff59c] focus:ring-1 focus:ring-[#8ff59c] transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-[#7e8695] uppercase tracking-wider mb-1.5">
            Confirm Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-[#7e8695] absolute left-3.5 top-3" />
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              className="w-full pl-10 pr-4 py-2.5 bg-[#0c0e12] border border-[#252932] rounded-xl text-sm text-white placeholder-[#7e8695]/60 focus:outline-none focus:border-[#8ff59c] focus:ring-1 focus:ring-[#8ff59c] transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full mt-3 py-3 px-4 bg-[#8ff59c] hover:bg-[#7de48b] disabled:opacity-50 text-[#0d1710] font-semibold text-sm rounded-full shadow-lg shadow-[#8ff59c]/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
        >
          {submitting ? 'Creating Account...' : 'Register Account'}
          <ArrowRight className="w-4 h-4 text-[#0d1710]" />
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-[#252932] text-center">
        <p className="text-xs text-[#7e8695]">
          Already registered?{' '}
          <Link to="/login" className="text-[#8ff59c] font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};
