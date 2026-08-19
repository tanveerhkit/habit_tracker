'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

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

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      fetch('/api/auth/me', { cache: 'no-store' })
        .then((response) => response.json())
        .then((data: { user: AuthUser | null }) => setUser(data.user))
        .catch(() => setUser(null))
        .finally(() => setLoading(false));
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  };

  if (loading) return <div className="app-shell grid min-h-screen place-items-center"><div className="text-sm font-medium text-muted">Preparing your space…</div></div>;
  if (!user) return authScreen;
  return <AuthProvider user={user} onLogout={logout}>{children}</AuthProvider>;
}
