import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, type ApiUser } from '../lib/api';

type AuthContextValue = {
  user: ApiUser | null;
  checking: boolean;
  apiAvailable: boolean | null;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const Context = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.me().then((nextUser) => { setUser(nextUser); setApiAvailable(true); }).catch((reason: unknown) => {
      setApiAvailable(reason instanceof TypeError ? false : true);
    }).finally(() => setChecking(false));
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    checking,
    apiAvailable,
    error,
    signIn: async (email, password) => { setError(null); try { setUser(await api.login({ email, password })); setApiAvailable(true); } catch (reason) { setApiAvailable(reason instanceof TypeError ? false : true); const message = reason instanceof Error ? reason.message : 'Unable to sign in'; setError(message); throw reason; } },
    signUp: async (email, password, displayName) => { setError(null); try { setUser(await api.register({ email, password, display_name: displayName })); setApiAvailable(true); } catch (reason) { setApiAvailable(reason instanceof TypeError ? false : true); const message = reason instanceof Error ? reason.message : 'Unable to create account'; setError(message); throw reason; } },
    signOut: async () => { setError(null); await api.logout(); setUser(null); },
  }), [apiAvailable, checking, error, user]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAuth() { const value = useContext(Context); if (!value) throw new Error('useAuth must be used inside AuthProvider'); return value; }
