"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import { useState } from "react";

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const { pushToast } = useToast();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    router.replace("/dashboard");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      pushToast("Signed in.", "success");
      router.replace("/dashboard");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "We couldn't sign you in. Please try again.";
      setError(message);
      pushToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[22rem_1fr]">
      <aside className="hidden flex-col justify-between bg-[var(--color-sidebar)] px-8 py-10 text-zinc-300 lg:flex">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-zinc-500">
            COMMANDO
          </p>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-white">
            Sales performance intervention
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Identify struggling executives, intervene early, coach
            systematically, and keep a complete history.
          </p>
        </div>
        <p className="text-xs text-zinc-500">Graphite · Emerald · Trust</p>
      </aside>
      <div className="flex items-center justify-center bg-[var(--color-canvas)] px-4">
        <form onSubmit={onSubmit} className="w-full max-w-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-brand)] lg:hidden">
            Commando
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Sign in</h2>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            Use your role workspace.
          </p>

          <label className="mt-8 block text-sm font-medium" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className="mt-1 h-10 w-full rounded-[var(--radius-sm)] border border-[var(--color-line)] px-3 text-sm"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />

          <label className="mt-4 block text-sm font-medium" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            className="mt-1 h-10 w-full rounded-[var(--radius-sm)] border border-[var(--color-line)] px-3 text-sm"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          {error && (
            <p className="mt-3 text-sm text-[var(--status-danger)]" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 h-10 w-full rounded-[var(--radius-sm)] bg-[var(--color-brand)] text-sm font-medium text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-60"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
