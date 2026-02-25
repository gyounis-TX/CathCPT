import React, { useState } from 'react';
import { Eye, EyeOff, LogIn, UserPlus, ArrowLeft, Mail, Lock, AlertCircle, Ticket } from 'lucide-react';
import { signIn, signUp, signInWithApple, signInWithGoogle, resetPassword, AuthUser } from '../services/authService';
import { lookupInviteCode, redeemInvite, InviteCode } from '../services/inviteService';
import { createConnectionFromInvite } from '../services/practiceConnection';
import { isIOS, isAndroid } from '../services/platformService';

interface LoginScreenProps {
  onLoginSuccess: (user: AuthUser) => void;
}

type AuthMode = 'login' | 'signup' | 'invite' | 'forgot';

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Invite code flow state
  const [inviteCode, setInviteCode] = useState('');
  const [inviteData, setInviteData] = useState<InviteCode | null>(null);
  const [inviteStep, setInviteStep] = useState<'enter_code' | 'create_account'>('enter_code');

  // Sign-up state
  const [displayName, setDisplayName] = useState('');

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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
      const user = await signUp(email, password, displayName || undefined);
      onLoginSuccess(user);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create account.';
      if (message.includes('email-already-in-use')) {
        setError('An account with this email already exists. Please sign in instead.');
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleAppleSignIn = async () => {
    setError(null);
    setIsSocialLoading(true);

    try {
      const user = await signInWithApple();
      onLoginSuccess(user);
    } catch (err) {
      // Don't show error for user cancellation
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes('cancel') && !message.includes('Cancel') && !message.includes('1001')) {
        setError('Apple Sign-In failed. Please try again.');
      }
    } finally {
      setIsSocialLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsSocialLoading(true);

    try {
      const user = await signInWithGoogle();
      onLoginSuccess(user);
    } catch (err) {
      // Don't show error for user cancellation
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes('cancel') && !message.includes('Cancel') && !message.includes('12501')) {
        setError('Google Sign-In failed. Please try again.');
      }
    } finally {
      setIsSocialLoading(false);
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

  const renderPlatformSignIn = () => {
    const showApple = isIOS();
    const showGoogle = isAndroid();

    // No platform-native buttons on web
    if (!showApple && !showGoogle) return null;

    return (
      <>
        {showApple && (
          <button
            onClick={handleAppleSignIn}
            disabled={isSocialLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-black text-white rounded-lg font-medium hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSocialLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Sign in with Apple
              </>
            )}
          </button>
        )}

        {showGoogle && (
          <button
            onClick={handleGoogleSignIn}
            disabled={isSocialLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSocialLoading ? (
              <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Sign in with Google
              </>
            )}
          </button>
        )}

        {/* "or" divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-sm text-gray-400">or</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
      </>
    );
  };

  const renderForm = () => {
    switch (mode) {
      case 'login':
        return (
          <div className="space-y-4">
            {/* Platform-native sign-in buttons */}
            {renderPlatformSignIn()}

            {/* Email/password form */}
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

              <div className="text-center space-y-2">
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setError(null); setSuccessMessage(null); setPassword(''); setConfirmPassword(''); setDisplayName(''); }}
                  className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  <UserPlus className="w-4 h-4" />
                  Create an account
                </button>
                <br />
                <button
                  type="button"
                  onClick={() => { setMode('invite'); setError(null); setSuccessMessage(null); setInviteStep('enter_code'); setInviteCode(''); setInviteData(null); }}
                  className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 font-medium"
                >
                  <Ticket className="w-4 h-4" />
                  Have an invite code?
                </button>
              </div>
            </form>
          </div>
        );

      case 'signup':
        return (
          <div className="space-y-4">
            {renderPlatformSignIn()}

            <form onSubmit={handleSignUp} className="space-y-4">
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); setPassword(''); setConfirmPassword(''); }}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 mb-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to sign in
              </button>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name (optional)</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Dr. Jane Smith"
                  autoComplete="name"
                />
              </div>

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
                    Create Account
                  </>
                )}
              </button>

              <p className="text-xs text-gray-500 text-center">
                Individual accounts store data locally on your device.
              </p>
            </form>
          </div>
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
        <h1 className="text-2xl font-bold text-gray-900">CathCPT</h1>
        <p className="text-gray-600 mt-1">Sign in to continue</p>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 pb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            {mode === 'login' && 'Sign In'}
            {mode === 'signup' && 'Create Account'}
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
