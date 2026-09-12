"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api, type AuthUser } from "@/lib/api";

const TOKEN_KEY = "commando_access_token";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (
    email: string,
    password: string,
  ) => Promise<{ user: AuthUser; accessToken: string }>;
  logout: () => Promise<void>;
  hasPermission: (code: string) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const stored = window.localStorage.getItem(TOKEN_KEY);

    void (async () => {
      if (!stored) {
        // Attempt silent refresh via httpOnly cookie when no local token.
        try {
          const refreshed = await api.refresh();
          if (cancelled) return;
          window.localStorage.setItem(TOKEN_KEY, refreshed.data.accessToken);
          setToken(refreshed.data.accessToken);
          setUser(refreshed.data.user);
        } catch {
          /* not signed in */
        } finally {
          if (!cancelled) setLoading(false);
        }
        return;
      }
      try {
        const res = await api.me(stored);
        if (cancelled) return;
        setToken(stored);
        setUser(res.data.user);
      } catch {
        // Access token may have expired — try cookie refresh once.
        try {
          const refreshed = await api.refresh();
          if (cancelled) return;
          window.localStorage.setItem(TOKEN_KEY, refreshed.data.accessToken);
          setToken(refreshed.data.accessToken);
          setUser(refreshed.data.user);
        } catch {
          window.localStorage.removeItem(TOKEN_KEY);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password);
    window.localStorage.setItem(TOKEN_KEY, res.data.accessToken);
    setToken(res.data.accessToken);
    setUser(res.data.user);
    return res.data;
  }, []);

  const logout = useCallback(async () => {
    if (token) {
      try {
        await api.logout(token);
      } catch {
        /* ignore */
      }
    }
    window.localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, [token]);

  const hasPermission = useCallback(
    (code: string) => Boolean(user?.permissions.includes(code)),
    [user],
  );

  const value = useMemo(
    () => ({ user, token, loading, login, logout, hasPermission }),
    [user, token, loading, login, logout, hasPermission],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
