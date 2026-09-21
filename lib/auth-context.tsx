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

/** Refresh before the 15m access cookie expires so the session stays live. */
const ACCESS_REFRESH_MS = 10 * 60 * 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return subscribeSession((nextToken, nextUser) => {
      setToken(nextToken);
      if (nextToken === null) {
        setUser(null);
      } else if (nextUser) {
        setUser(nextUser);
      }
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const stored = getStoredAccessToken();

    void (async () => {
      if (!stored) {
        try {
          const refreshed = await api.refresh();
          if (cancelled) return;
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
        try {
          const refreshed = await api.refresh();
          if (cancelled) return;
          setToken(refreshed.data.accessToken);
          setUser(refreshed.data.user);
        } catch {
          clearSession();
        }
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

    let lastKeepAlive = 0;
    async function keepAlive() {
      const now = Date.now();
      if (now - lastKeepAlive < 60_000) return;
      lastKeepAlive = now;
      try {
        const refreshed = await api.refresh();
        persistSession(refreshed.data.accessToken, refreshed.data.user);
      } catch {
        /* next API 401 will retry; do not log out here */
      }
    }

    const id = window.setInterval(() => {
      void keepAlive();
    }, ACCESS_REFRESH_MS);

    const onFocus = () => {
      void keepAlive();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [token]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password);
    persistSession(res.data.accessToken, res.data.user);
    setToken(res.data.accessToken);
    setUser(res.data.user);
    return res.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout(token);
    } catch {
      clearSession();
    }
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
