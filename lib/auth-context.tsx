"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api, refreshAccessToken, type AuthUser } from "@/lib/api";
import {
  clearSession,
  getStoredAccessToken,
  persistSession,
  subscribeSession,
} from "@/lib/session";

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

const KEEP_ALIVE_MS = 8 * 60 * 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return subscribeSession((nextToken, nextUser) => {
      setToken(nextToken);
      if (!nextToken) {
        setUser(null);
        return;
      }
      if (nextUser) setUser(nextUser);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const stored = getStoredAccessToken();
      try {
        if (stored) {
          const res = await api.me(stored);
          if (cancelled) return;
          persistSession(getStoredAccessToken() ?? stored, res.data.user);
        } else {
          const refreshed = await refreshAccessToken();
          if (cancelled || !refreshed) return;
        }
      } catch {
        const refreshed = await refreshAccessToken();
        if (cancelled || refreshed) return;
        clearSession();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!token) return;

    const keepAlive = () => {
      void refreshAccessToken();
    };

    const id = window.setInterval(keepAlive, KEEP_ALIVE_MS);
    const onFocus = () => keepAlive();
    const onVisible = () => {
      if (document.visibilityState === "visible") keepAlive();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [token]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password);
    persistSession(res.data.accessToken, res.data.user);
    return res.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout(getStoredAccessToken());
    } catch {
      clearSession();
    }
  }, []);

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
