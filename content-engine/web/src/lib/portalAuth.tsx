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
  Portal,
  getPortalToken,
  setPortalToken,
  type PortalSession,
} from '@/lib/api';

interface PortalAuthState {
  session: PortalSession | null;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (email: string, password: string, workspaceId?: string) => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<PortalAuthState | null>(null);

export function PortalAuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<PortalSession | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getPortalToken()) {
      setSession(null);
      setLoading(false);
      return;
    }
    try {
      const data = await Portal.me();
      setSession(data);
    } catch {
      setSession(null);
      setPortalToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string, workspaceId?: string) => {
      const res = await Portal.login({ email, password, workspace_id: workspaceId });
      setPortalToken(res.access_token);
      setSession(res);
      router.push('/portal/overview');
    },
    [router],
  );

  const switchWorkspace = useCallback(async (workspaceId: string) => {
    const res = await Portal.switch(workspaceId);
    setPortalToken(res.access_token);
    setSession(res);
  }, []);

  const logout = useCallback(() => {
    setPortalToken(null);
    setSession(null);
    router.push('/portal/login');
  }, [router]);

  const value: PortalAuthState = useMemo(
    () => ({ session, loading, refresh, login, switchWorkspace, logout }),
    [session, loading, refresh, login, switchWorkspace, logout],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePortalAuth(): PortalAuthState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePortalAuth must be used within PortalAuthProvider');
  return ctx;
}
