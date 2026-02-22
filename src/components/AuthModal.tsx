'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function AuthModal() {
  const { showAuthModal, setShowAuthModal, signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  if (!showAuthModal) return null;

  const handleClose = () => {
    setShowAuthModal(false);
    setError(null);
    setSuccess(null);
    setEmail('');
    setPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      if (mode === 'signin') {
        const { error } = await signInWithEmail(email, password);
        if (error) setError(error);
        else handleClose();
      } else {
        const { error } = await signUpWithEmail(email, password);
        if (error) setError(error);
        else setSuccess('Check your email to confirm your account.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    const { error } = await signInWithGoogle();
    if (error) setError(error);
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

        {/* Google */}
        <button
          onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white/70 hover:text-white hover:bg-white/[0.1] transition-all text-[13px] font-medium"
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/[0.06]" />
          <span className="text-[11px] text-white/20 uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>

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
            <>No account? <button onClick={() => { setMode('signup'); setError(null); setSuccess(null); }} className="text-accent/70 hover:text-accent transition-colors">Sign up</button></>
          ) : (
            <>Already have an account? <button onClick={() => { setMode('signin'); setError(null); setSuccess(null); }} className="text-accent/70 hover:text-accent transition-colors">Sign in</button></>
          )}
        </p>
      </div>
    </div>
  );
}
