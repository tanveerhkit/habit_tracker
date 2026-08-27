'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type AuthUser = { id: string; name: string; email: string };
type AuthContextValue = { user: AuthUser; logout: () => Promise<void> };
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ user, onLogout, children }: { user: AuthUser; onLogout: () => Promise<void>; children: React.ReactNode }) {
  const value = useMemo(() => ({ user, logout: onLogout }), [onLogout, user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

export function AuthGate({ children, authScreen }: { children: React.ReactNode; authScreen: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  const loadUser = useCallback(async () => {
    setLoading(true);
    setAuthError('');
    try {
      const response = await fetch('/api/auth/me', { cache: 'no-store' });
      const data = await response.json() as { user?: AuthUser | null; error?: string };
      if (!response.ok || !Object.prototype.hasOwnProperty.call(data, 'user')) throw new Error(data.error || 'Unable to check your session.');
      setUser(data.user ?? null);
    } catch {
      setUser(null);
      setAuthError('We could not check your session. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => { void loadUser(); });
    return () => window.cancelAnimationFrame(frame);
  }, [loadUser]);

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
    }
  };

  if (loading) return <div className="app-shell grid min-h-screen place-items-center"><div className="text-sm font-medium text-muted">Preparing your space…</div></div>;
  if (authError) return <div className="app-shell grid min-h-screen place-items-center px-5"><div className="surface w-full max-w-md p-7 text-center shadow-[0_8px_30px_rgba(30,30,20,.05)]"><p className="text-xs font-semibold uppercase tracking-[.16em] text-accent">Habitly</p><h1 className="mt-3 font-display text-2xl font-semibold text-ink">Your session needs a retry.</h1><p className="mt-2 text-sm leading-6 text-muted">The app is reachable, but the session check did not finish successfully.</p><button type="button" onClick={() => void loadUser()} className="mt-5 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background hover:bg-accent-strong">Try again</button></div></div>;
  if (!user) return authScreen;
  return <AuthProvider user={user} onLogout={logout}>{children}</AuthProvider>;
}
