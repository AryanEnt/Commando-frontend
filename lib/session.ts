export const ACCESS_TOKEN_KEY = "commando_access_token";

export type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleCode: string;
  permissions: string[];
};

type SessionListener = (token: string | null, user: SessionUser | null) => void;

const listeners = new Set<SessionListener>();

export function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function persistSession(token: string, user: SessionUser | null = null) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
  listeners.forEach((fn) => fn(token, user));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  listeners.forEach((fn) => fn(null, null));
}

export function subscribeSession(listener: SessionListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
