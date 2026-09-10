"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { navItemsForRole, pathMatches } from "@/lib/navigation";
import { personName, roleLabel } from "@/lib/labels";
import { api, type ProfileListItem } from "@/lib/api";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Avatar } from "@/components/ui";
import { Icons } from "@/components/icons";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, hasPermission, token } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProfileListItem[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user && pathname !== "/login") {
      router.replace("/login");
    }
  }, [loading, user, pathname, router]);

  const links = useMemo(() => {
    if (!user) return [];
    return navItemsForRole(user.roleCode, hasPermission);
  }, [user, hasPermission]);

  useEffect(() => {
    if (!token || !hasPermission("PROFILE_VIEW") || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = window.setTimeout(() => {
      void api
        .getProfiles(token, { search: query.trim() })
        .then((res) => setResults(res.data.profiles.slice(0, 8)))
        .catch(() => setResults([]));
    }, 220);
    return () => window.clearTimeout(t);
  }, [token, query, hasPermission]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[var(--color-ink-muted)]">
        Loading workspace…
      </div>
    );
  }

  if (!user) {
    return <>{children}</>;
  }

  const displayName = personName(user);
  const width = collapsed ? "lg:w-[4.5rem]" : "lg:w-[var(--sidebar-w)]";

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink)]">
      <div className="flex min-h-screen">
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close navigation"
            className="fixed inset-0 z-30 bg-[var(--color-ink)]/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-40 flex h-dvh flex-col bg-[var(--color-sidebar)] text-zinc-300 transition-transform duration-200 lg:sticky lg:top-0 lg:translate-x-0 ${width} ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } w-64`}
        >
          <div className="flex h-14 shrink-0 items-center justify-between gap-2 px-3">
            <Link
              href="/dashboard"
              className="flex min-w-0 items-center gap-2"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-brand)] text-xs font-semibold text-white">
                C
              </span>
              {!collapsed && (
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold tracking-tight text-white">
                    COMMANDO
                  </span>
                  <span className="block truncate text-[10px] text-zinc-500">
                    Sales performance
                  </span>
                </span>
              )}
            </Link>
            <button
              type="button"
              className="hidden rounded p-1 text-zinc-500 hover:text-white lg:inline-flex"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={() => setCollapsed((v) => !v)}
            >
              <Icons.collapse
                className={collapsed ? "rotate-180" : ""}
                size={16}
              />
            </button>
          </div>
          <nav
            className="min-h-0 flex-1 overflow-y-auto px-2 py-2"
            aria-label="Primary"
          >
            {links.map((item, index) => {
              const prev = links[index - 1];
              const showSection =
                !collapsed && item.section && item.section !== prev?.section;
              const active = pathMatches(pathname, item.href);
              return (
                <div key={`${item.href}-${item.label}`}>
                  {showSection && (
                    <p className="mt-4 mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      {item.section}
                    </p>
                  )}
                  <Link
                    href={item.href}
                    title={item.label}
                    onClick={() => setSidebarOpen(false)}
                    className={`mb-0.5 flex items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-[13px] transition duration-150 ${
                      active
                        ? "bg-[var(--color-brand)]/20 text-white"
                        : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
                    }`}
                  >
                    {active && (
                      <span
                        className="h-4 w-0.5 shrink-0 rounded-full bg-[var(--color-accent)]"
                        aria-hidden
                      />
                    )}
                    <span className={`truncate ${active ? "" : "pl-2.5"}`}>
                      {item.label}
                    </span>
                  </Link>
                </div>
              );
            })}
          </nav>
          <div className="shrink-0 border-t border-white/10 bg-[var(--color-sidebar)] p-3">
            <div className="flex items-center gap-2">
              <Avatar name={displayName} size="sm" />
              {!collapsed && (
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-white">{displayName}</p>
                  <p className="truncate text-[10px] text-zinc-500">
                    {roleLabel(user.roleCode)}
                  </p>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => logout().then(() => router.push("/login"))}
              className="mt-2 w-full rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-xs text-zinc-400 hover:bg-white/5 hover:text-white"
            >
              Log out
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 h-14 border-b border-[var(--color-line)] bg-[var(--color-surface)]">
            <div className="flex h-14 items-center justify-between gap-3 px-4">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  className="rounded-[var(--radius-sm)] border border-[var(--color-line)] px-2.5 py-1 text-xs lg:hidden"
                  onClick={() => setSidebarOpen(true)}
                >
                  Menu
                </button>
                <Breadcrumbs />
              </div>
              <div className="flex items-center gap-3">
                {hasPermission("PROFILE_VIEW") && (
                  <div className="relative hidden sm:block">
                    <label className="sr-only" htmlFor="global-search">
                      Search sales executives
                    </label>
                    <input
                      id="global-search"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setSearchOpen(true);
                      }}
                      onFocus={() => setSearchOpen(true)}
                      placeholder="Search people…"
                      className="h-8 w-56 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-canvas)] px-3 text-sm md:w-72"
                    />
                    {searchOpen && results.length > 0 && (
                      <ul className="absolute right-0 z-30 mt-1 w-80 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-md)]">
                        {results.map((p) => (
                          <li key={p.id}>
                            <Link
                              href={`/profiles/${p.id}`}
                              className="block px-3 py-2 hover:bg-[var(--color-surface-2)]"
                              onClick={() => {
                                setSearchOpen(false);
                                setQuery("");
                              }}
                            >
                              <span className="block text-sm font-medium">
                                {p.displayName}
                              </span>
                              <span className="text-xs text-[var(--color-ink-muted)]">
                                Sales Executive · {p.team.name}
                                {p.currentAssignment
                                  ? ` · Commando ${personName(p.currentAssignment.commando)}`
                                  : ""}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                <span className="hidden text-[11px] font-medium text-[var(--color-ink-muted)] sm:inline">
                  {roleLabel(user.roleCode)}
                </span>
                <Avatar name={displayName} size="sm" />
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
