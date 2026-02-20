import React, { useState } from 'react';
import { Eye, EyeOff, LogIn, UserPlus, ArrowLeft, Mail, Lock, AlertCircle, Ticket, X } from 'lucide-react';
import { signIn, signUp, resetPassword, AuthUser } from '../services/authService';
import { lookupInviteCode, redeemInvite, InviteCode } from '../services/inviteService';
import { createConnectionFromInvite } from '../services/practiceConnection';

interface LoginScreenProps {
  onLoginSuccess: (user: AuthUser) => void;
  onSkip: () => void;
}

type AuthMode = 'login' | 'invite' | 'forgot';

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, onSkip }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Invite code flow state
  const [inviteCode, setInviteCode] = useState('');
  const [inviteData, setInviteData] = useState<InviteCode | null>(null);
  const [inviteStep, setInviteStep] = useState<'enter_code' | 'create_account'>('enter_code');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const user = await signIn(email, password);
      onLoginSuccess(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLookupInviteCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const invite = await lookupInviteCode(inviteCode);
      if (!invite) {
        setError('Invalid, expired, or already redeemed invite code.');
        setIsLoading(false);
        return;
      }
      setInviteData(invite);
      setEmail(invite.email);
      setInviteStep('create_account');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to look up invite code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!inviteData) return;

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setIsLoading(true);

    try {
      const displayName = `Dr. ${inviteData.firstName} ${inviteData.lastName}`;
      const user = await signUp(inviteData.email, password, displayName);

      // Redeem invite — links user to org with correct role
      await redeemInvite(inviteData.code, user.id);

      // Create local practice connection
      await createConnectionFromInvite(inviteData);

      // Update user object with org info from invite
      const updatedUser: AuthUser = {
        ...user,
        tier: 'pro',
        role: inviteData.role,
        organizationId: inviteData.organizationId,
        organizationName: inviteData.organizationName,
        displayName
      };

      onLoginSuccess(updatedUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await resetPassword(email);
      setSuccessMessage('Password reset email sent. Please check your inbox.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderForm = () => {
    switch (mode) {
      case 'login':
        return (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => { setMode('forgot'); setError(null); setSuccessMessage(null); }}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Forgot password?
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Sign In
                </>
              )}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => { setMode('invite'); setError(null); setSuccessMessage(null); setInviteStep('enter_code'); setInviteCode(''); setInviteData(null); }}
                className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                <Ticket className="w-4 h-4" />
                Have an invite code?
              </button>
            </div>
          </form>
        );

      case 'invite':
        if (inviteStep === 'enter_code') {
          return (
            <form onSubmit={handleLookupInviteCode} className="space-y-4">
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); }}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 mb-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to login
              </button>

              <p className="text-sm text-gray-600">
                Enter the invite code provided by your practice admin.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invite Code</label>
                <div className="relative">
                  <Ticket className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-lg tracking-widest text-center"
                    placeholder="CATH8X4Y"
                    required
                    maxLength={12}
                    autoComplete="off"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || inviteCode.trim().length < 6}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Verify Code'
                )}
              </button>
            </form>
          );
        }

        // inviteStep === 'create_account'
        return (
          <form onSubmit={handleInviteSignUp} className="space-y-4">
            <button
              type="button"
              onClick={() => { setInviteStep('enter_code'); setError(null); setPassword(''); setConfirmPassword(''); }}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            {/* Pre-filled info from invite */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm font-medium text-green-800">Invite verified!</p>
              <p className="text-xs text-green-700 mt-1">
                Create your account to join {inviteData?.organizationName}.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Name:</span> Dr. {inviteData?.firstName} {inviteData?.lastName}
              </p>
              <p className="text-sm text-gray-700">
                <span className="font-medium">Practice:</span> {inviteData?.organizationName}
              </p>
              <p className="text-sm text-gray-700">
                <span className="font-medium">Role:</span> {inviteData?.role === 'admin' ? 'Admin' : 'Physician'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Email is set by your admin and cannot be changed.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Create Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Confirm password"
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Create Account & Join Practice
                </>
              )}
            </button>
          </form>
        );

      case 'forgot':
        return (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); setSuccessMessage(null); }}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to login
            </button>

            <p className="text-sm text-gray-600 mb-4">
              Enter your email address and we'll send you a link to reset your password.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
      {/* Close button */}
      <button
        onClick={onSkip}
        className="absolute top-4 right-4 z-10 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
        title="Close"
      >
        <X className="w-5 h-5 text-gray-600" />
      </button>

      {/* Header */}
      <div className="flex-shrink-0 pt-12 pb-8 px-6 text-center">
        <div className="w-20 h-20 rounded-2xl mx-auto mb-4 overflow-hidden">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <defs>
              <linearGradient id="loginBgGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#D4A84B"/>
                <stop offset="50%" stopColor="#C49A3D"/>
                <stop offset="100%" stopColor="#9A7830"/>
              </linearGradient>
            </defs>
            <rect width="100" height="100" rx="18" fill="url(#loginBgGold)"/>
            <g transform="translate(28, 5) scale(0.52)">
              <path d="M42,22 C52,8 82,12 82,42 C82,68 42,92 42,92 C42,92 2,68 2,42 C2,12 32,8 42,22" fill="#8B1538"/>
            </g>
            <text x="50" y="72" fontSize="36" fontWeight="900" fill="#F5E6B0" textAnchor="middle" fontFamily="Arial Black, sans-serif">CPT</text>
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">CathCPT Pro</h1>
        <p className="text-gray-600 mt-1">Cardiology Billing & Coding</p>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 pb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            {mode === 'login' && 'Sign In'}
            {mode === 'invite' && (inviteStep === 'enter_code' ? 'Enter Invite Code' : 'Create Your Account')}
            {mode === 'forgot' && 'Reset Password'}
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
          )}

          {renderForm()}
        </div>

        {/* Features comparison */}
        <div className="mt-8 bg-gray-50 rounded-xl p-4">
          <h3 className="font-medium text-gray-900 mb-3">Pro Features</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
              Sync cath cases to web portal
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
              Inpatient Rounds with charge tracking
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
              Multi-device sync
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
              Admin portal access
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
