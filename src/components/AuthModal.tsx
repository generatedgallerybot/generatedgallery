'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { trackEvent } from '@/lib/track';

export function AuthModal() {
  const { showAuthModal, setShowAuthModal, signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithGithub, session } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (showAuthModal) trackEvent('auth_modal_open', { mode }, { token: session?.access_token || null });
  }, [showAuthModal, mode, session?.access_token]);

  if (!showAuthModal) return null;

  const handleClose = () => {
    setShowAuthModal(false);
    setError(null);
    setSuccess(null);
    setEmail('');
    setPassword('');
  };

  const handleOAuth = async (provider: 'google' | 'github') => {
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      trackEvent(`oauth_${provider}_click`, { mode }, { token: session?.access_token || null, sendBeacon: false });
      const { error } = provider === 'google' ? await signInWithGoogle() : await signInWithGithub();
      if (error) {
        trackEvent(`oauth_${provider}_error`, { error }, { sendBeacon: false });
        setError(error);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => handleOAuth('google');
  const handleGithub = async () => handleOAuth('github');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const domain = email.split('@')[1]?.toLowerCase() || null;
      if (mode === 'signin') {
        trackEvent('signin_submit', { domain }, { token: session?.access_token || null, sendBeacon: false });
        const { error } = await signInWithEmail(email, password);
        if (error) {
          trackEvent('signin_error', { domain, error }, { sendBeacon: false });
          setError(error);
        } else {
          trackEvent('signin_success', { domain }, { sendBeacon: false });
          handleClose();
        }
      } else {
        trackEvent('signup_submit', { domain }, { token: session?.access_token || null, sendBeacon: false });
        const { error } = await signUpWithEmail(email, password);
        if (error) {
          trackEvent('signup_error', { domain, error }, { sendBeacon: false });
          setError(error);
        } else {
          trackEvent('signup_success', { domain }, { sendBeacon: false });
          setSuccess('Check your email to confirm your account.');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={handleClose}>
      <div
        className="bg-surface-2 border border-white/[0.08] rounded-2xl p-8 max-w-sm w-full mx-4 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-display font-semibold text-white">
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </h2>
          <button onClick={handleClose} className="text-white/30 hover:text-white/60 transition-colors">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 4L14 14M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <p className="text-[13px] text-white/45 leading-relaxed">Sign in to save galleries, likes, credits, and generation history.</p>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleGoogle}
            disabled={submitting}
            className="py-2.5 rounded-xl text-[13px] font-medium text-white bg-white/[0.06] border border-white/[0.1] hover:bg-white/[0.1] disabled:opacity-50 transition-all"
          >
            Google
          </button>
          <button
            type="button"
            onClick={handleGithub}
            disabled={submitting}
            className="py-2.5 rounded-xl text-[13px] font-medium text-white bg-white/[0.06] border border-white/[0.1] hover:bg-white/[0.1] disabled:opacity-50 transition-all"
          >
            GitHub
          </button>
        </div>

        <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-white/25"><span className="h-px flex-1 bg-white/[0.08]" />or email<span className="h-px flex-1 bg-white/[0.08]" /></div>

        {/* Email form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-[13px] placeholder:text-white/25 focus:outline-none focus:border-accent/30 transition-colors"
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-[13px] placeholder:text-white/25 focus:outline-none focus:border-accent/30 transition-colors"
            />
          </div>

          {error && <p className="text-red-400 text-[12px]">{error}</p>}
          {success && <p className="text-green-400 text-[12px]">{success}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-xl text-[13px] font-medium text-[#1a1a1a] bg-[#e8d5b7] hover:bg-[#d4c2a5] disabled:opacity-50 transition-all"
          >
            {submitting ? '...' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-[12px] text-white/30">
          {mode === 'signin' ? (
            <>No account? <button onClick={() => { trackEvent('auth_mode_switch', { mode: 'signup' }); setMode('signup'); setError(null); setSuccess(null); }} className="text-accent/70 hover:text-accent transition-colors">Sign up</button></>
          ) : (
            <>Already have an account? <button onClick={() => { trackEvent('auth_mode_switch', { mode: 'signin' }); setMode('signin'); setError(null); setSuccess(null); }} className="text-accent/70 hover:text-accent transition-colors">Sign in</button></>
          )}
        </p>
      </div>
    </div>
  );
}
