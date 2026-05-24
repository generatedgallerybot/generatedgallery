'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabaseBrowser } from '@/lib/supabase-browser';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signInWithEmail: async () => ({ error: null }),
  signUpWithEmail: async () => ({ error: null }),
  signInWithGoogle: async () => ({ error: null }),
  signOut: async () => {},
  showAuthModal: false,
  setShowAuthModal: () => {},
});

const AUTH_STORAGE_KEY = 'sb-tqkhbycfxrncmolifvlv-auth-token';

function withTimeout<T>(promise: Promise<T>, ms = 15000, label = 'Request') {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out. Please refresh and try again.`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function readStoredSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;
    if (!session?.access_token || !session?.user) return null;
    if (session.expires_at && session.expires_at * 1000 <= Date.now()) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

async function authRequest(email: string, password: string, mode: 'signin' | 'signup') {
  const response = await withTimeout(fetch('/api/auth/email', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, mode }),
  }), 18000, mode === 'signin' ? 'Sign in' : 'Sign up');
  const body = await response.json().catch(() => ({}));
  if (!response.ok) return { body: null, error: body.error || body.error_description || body.msg || body.message || 'Authentication failed' };
  return { body, error: null };
}

async function directPasswordSignIn(email: string, password: string): Promise<{ session: Session | null; user: User | null; error: string | null }> {
  const { body, error } = await authRequest(email, password, 'signin');
  if (error || !body) return { session: null, user: null, error };
  const expiresAt = body.expires_at || Math.floor(Date.now() / 1000) + Number(body.expires_in || 3600);
  const session = { ...body, expires_at: expiresAt } as Session;
  try {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    window.localStorage.removeItem(`${AUTH_STORAGE_KEY}-code-verifier`);
  } catch {}
  return { session, user: body.user || null, error: null };
}

async function directSignUp(email: string, password: string): Promise<{ error: string | null }> {
  const { error } = await authRequest(email, password, 'signup');
  return { error };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    let mounted = true;
    const session = readStoredSession();
    setSession(session);
    setUser(session?.user ?? null);
    supabaseBrowser.auth.getSession().then(({ data }) => {
      if (!mounted || !data.session) return;
      setSession(data.session);
      setUser(data.session.user ?? null);
    }).finally(() => mounted && setLoading(false));

    const { data: authListener } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    const onStorage = (event: StorageEvent) => {
      if (event.key !== AUTH_STORAGE_KEY) return;
      const session = readStoredSession();
      setSession(session);
      setUser(session?.user ?? null);
    };
    window.addEventListener('storage', onStorage);

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    try {
      const result = await directPasswordSignIn(email, password);
      if (result.error) return { error: result.error };
      setSession(result.session);
      setUser(result.user);
      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Sign in failed' };
    }
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    try {
      return await directSignUp(email, password);
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Sign up failed' };
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      const { error } = await supabaseBrowser.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/generate` },
      });
      return { error: error?.message || null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Google sign-in failed' };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      await supabaseBrowser.auth.signOut();
    } catch {}
    setSession(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user, session, loading,
      signInWithEmail, signUpWithEmail, signInWithGoogle, signOut,
      showAuthModal, setShowAuthModal,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
