'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  Auth,
  Workspaces,
  getToken,
  setToken,
  getWorkspaceId,
  setWorkspaceId,
  type Me,
  type Workspace,
} from '@/lib/api';

interface AuthState {
  me: Me | null;
  loading: boolean;
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  setActiveWorkspace: (id: string) => void;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: {
    email: string;
    password: string;
    full_name: string;
    org_name: string;
    org_type: string;
  }) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setMe(null);
      setLoading(false);
      return;
    }
    try {
      const data = await Auth.me();
      setMe(data);
      const stored = getWorkspaceId();
      const valid = data.workspaces.find((w) => w.id === stored);
      const next = valid?.id || data.workspaces[0]?.id || null;
      if (next) {
        setWorkspaceId(next);
        setActiveId(next);
      }
    } catch {
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setActiveWorkspace = useCallback((id: string) => {
    setWorkspaceId(id);
    setActiveId(id);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await Auth.login({ email, password });
      setToken(res.access_token);
      await refresh();
      router.push('/dashboard');
    },
    [refresh, router]
  );

  const signup = useCallback(
    async (data: {
      email: string;
      password: string;
      full_name: string;
      org_name: string;
      org_type: string;
    }) => {
      const res = await Auth.signup(data);
      setToken(res.access_token);
      // Pull workspaces to set the active one.
      const ws = await Workspaces.list();
      if (ws[0]) setWorkspaceId(ws[0].id);
      await refresh();
      router.push('/dashboard');
    },
    [refresh, router]
  );

  const logout = useCallback(() => {
    setToken(null);
    setWorkspaceId(null);
    setMe(null);
    setActiveId(null);
    router.push('/login');
  }, [router]);

  const activeWorkspace = useMemo(
    () => me?.workspaces.find((w) => w.id === activeId) || me?.workspaces[0] || null,
    [me, activeId]
  );

  const value: AuthState = {
    me,
    loading,
    workspaces: me?.workspaces || [],
    activeWorkspace,
    setActiveWorkspace,
    refresh,
    login,
    signup,
    logout,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
