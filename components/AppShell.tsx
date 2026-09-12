"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
} from "react";
import {
  Activity,
  BarChart3,
  BriefcaseBusiness,
  ClipboardCheck,
  History,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Search,
  Settings2,
  Shield,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  isWideContentPath,
  navItemsForRole,
  pathMatches,
  profileIdFromPathname,
  type NavIcon,
  type NavItem,
} from "@/lib/navigation";
import { personName, roleLabel } from "@/lib/labels";
import { api, type ProfileListItem } from "@/lib/api";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Avatar } from "@/components/ui";
import { SeWorkspaceProvider } from "@/lib/se-workspace-context";
import { useOwnSalesProfileId } from "@/lib/own-profile";
import {
  seNavForRole,
  seSectionFromPathname,
} from "@/lib/se-workspace-nav";
import {
  clearSeWorkspaceMemory,
  isSeRelatedPathname,
  readRememberedSeProfileId,
  rememberSeWorkspace,
} from "@/lib/se-workspace-persist";

const SIDEBAR_COLLAPSED_KEY = "commando.sidebar.collapsed";

const NAV_ICONS: Record<
  NavIcon,
  ComponentType<{ size?: number; className?: string }>
> = {
  dashboard: LayoutDashboard,
  users: Users,
  teams: UsersRound,
  organization: Network,
  profiles: BriefcaseBusiness,
  interventions: Activity,
  history: History,
  reports: BarChart3,
  audit: Shield,
  configuration: Settings2,
  tasks: ListChecks,
  reviews: ClipboardCheck,
  sync: RefreshCw,
  roles: Users,
};

function readCollapsedPreference() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, hasPermission, token } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProfileListItem[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [rememberedProfileId, setRememberedProfileId] = useState<string | null>(
    null,
  );
  const searchRef = useRef<HTMLInputElement>(null);
  const { profileId: ownProfileId } = useOwnSalesProfileId();

  const isSalesExecutive = user?.roleCode === "SALES_EXECUTIVE";
  const isSalesSupport = user?.roleCode === "SALES_SUPPORT_EXECUTIVE";
  const isIndividualHome = isSalesExecutive || isSalesSupport;
  const pathProfileId = useMemo(
    () => profileIdFromPathname(pathname),
    [pathname],
  );
  const wideContent = isWideContentPath(pathname);

  useEffect(() => {
    setCollapsed(readCollapsedPreference());
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (isSalesExecutive) {
      setRememberedProfileId(null);
      return;
    }
    if (pathProfileId) {
      rememberSeWorkspace(pathProfileId, seSectionFromPathname(pathname));
      setRememberedProfileId(pathProfileId);
      return;
    }
    if (isSeRelatedPathname(pathname)) {
      setRememberedProfileId(readRememberedSeProfileId());
      return;
    }
    clearSeWorkspaceMemory();
    setRememberedProfileId(null);
  }, [pathname, pathProfileId, isSalesExecutive]);

  const seProfileId = pathProfileId ?? rememberedProfileId;

  useEffect(() => {
    if (!loading && !user && pathname !== "/login") {
      router.replace("/login");
    }
  }, [loading, user, pathname, router]);

  useEffect(() => {
    if (!isSalesExecutive || !ownProfileId) return;
    if (
      pathname === "/dashboard" ||
      pathname === "/profiles" ||
      pathname === "/"
    ) {
      router.replace(`/profiles/${ownProfileId}`);
    }
  }, [isSalesExecutive, ownProfileId, pathname, router]);

  useEffect(() => {
    if (!isSalesSupport) return;
    if (pathname === "/profiles" || pathname === "/") {
      router.replace("/dashboard");
    }
  }, [isSalesSupport, pathname, router]);

  const links = useMemo((): Array<
    NavItem & { sectionKey?: string; sectionGroup?: string }
  > => {
    if (!user) return [];
    if (isSalesExecutive && ownProfileId) {
      return seNavForRole("SALES_EXECUTIVE").map((item) => ({
        href: item.href(ownProfileId),
        label: item.label,
        permission: "PROFILE_VIEW",
        section: item.sectionGroup ?? "My performance",
        sectionKey: item.section,
        icon:
          item.section === "overview"
            ? "dashboard"
            : item.section === "reviews"
              ? "reviews"
              : item.section === "actions"
                ? "tasks"
                : item.section === "support"
                  ? "users"
                  : item.section === "history"
                    ? "history"
                    : "profiles",
      }));
    }
    return navItemsForRole(user.roleCode, hasPermission);
  }, [user, hasPermission, isSalesExecutive, ownProfileId]);

  useEffect(() => {
    if (
      isIndividualHome ||
      !token ||
      !hasPermission("PROFILE_VIEW") ||
      query.trim().length < 2
    ) {
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
  }, [token, query, hasPermission, isIndividualHome]);

  const openSearch = useCallback(() => {
    setSearchOpen(true);
    window.setTimeout(() => searchRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        if (isIndividualHome || !hasPermission("PROFILE_VIEW")) return;
        e.preventDefault();
        openSearch();
      }
      if (e.key === "Escape") setSearchOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasPermission, isIndividualHome, openSearch]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[var(--color-ink-muted)]">
        Loading…
      </div>
    );
  }

  if (!user) {
    return <>{children}</>;
  }

  const displayName = personName(user);
  const homeHref =
    isSalesExecutive && ownProfileId
      ? `/profiles/${ownProfileId}`
      : "/dashboard";

  const frame = (
    <div
      className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink)]"
      style={
        {
          ["--sidebar-current-w" as string]: collapsed
            ? "var(--sidebar-w-collapsed)"
            : "var(--sidebar-w)",
        } as CSSProperties
      }
    >
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-[var(--color-ink)]/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-dvh w-64 flex-col bg-[var(--color-sidebar)] text-[var(--color-sidebar-muted)] transition-[transform,width] duration-200 ease-[var(--ease)] lg:w-[var(--sidebar-current-w)] lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div
          className={`flex h-14 shrink-0 items-center gap-2 px-3 justify-between ${
            collapsed
              ? "lg:h-auto lg:min-h-14 lg:flex-col lg:justify-center lg:gap-1 lg:py-2"
              : ""
          }`}
        >
          <Link
            href={homeHref}
            className={`flex min-w-0 items-center gap-2.5 ${
              collapsed ? "lg:justify-center" : ""
            }`}
            onClick={() => setSidebarOpen(false)}
            title="COMMANDO"
          >
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-brand)] text-xs font-semibold text-white">
              C
            </span>
            <span className={`min-w-0 ${collapsed ? "lg:hidden" : ""}`}>
              <span className="block truncate text-[13px] font-semibold tracking-tight text-white">
                COMMANDO
              </span>
              <span className="block truncate text-[10px] text-[var(--color-sidebar-subtle)]">
                Sales Performance
              </span>
            </span>
          </Link>
          <button
            type="button"
            className="hidden rounded p-1.5 text-[var(--color-sidebar-subtle)] transition hover:bg-[var(--color-sidebar-hover)] hover:text-white lg:inline-flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={toggleCollapsed}
          >
            {collapsed ? (
              <PanelLeftOpen size={16} />
            ) : (
              <PanelLeftClose size={16} />
            )}
          </button>
        </div>

        <div
          className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-1 px-2 ${
            collapsed ? "lg:px-1.5" : ""
          }`}
        >
          <nav aria-label="Primary">
            {links.map((item, index) => {
              const prev = links[index - 1];
              const Icon = item.icon ? NAV_ICONS[item.icon] : null;
              const active =
                isSalesExecutive && "sectionKey" in item && item.sectionKey
                  ? seSectionFromPathname(pathname) === item.sectionKey
                  : pathMatches(pathname, item.href);
              return (
                <div key={`${item.href}-${item.label}`}>
                  {item.section && item.section !== prev?.section && (
                    <p
                      className={`mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-sidebar-subtle)] ${
                        index === 0 ? "mt-1" : "mt-4"
                      } ${collapsed ? "lg:hidden" : ""}`}
                    >
                      {item.section}
                    </p>
                  )}
                  <Link
                    href={item.href}
                    title={item.label}
                    onClick={() => setSidebarOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`group relative mb-0.5 flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-[13px] transition duration-150 ${
                      collapsed
                        ? "lg:justify-center lg:gap-0 lg:px-0 lg:py-2.5"
                        : ""
                    } ${
                      active
                        ? "bg-[var(--color-sidebar-active)] font-medium text-white"
                        : "text-[var(--color-sidebar-muted)] hover:bg-[var(--color-sidebar-hover)] hover:text-white"
                    }`}
                  >
                    {active && (
                      <span
                        className={`absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-[var(--color-accent)] ${
                          collapsed ? "lg:hidden" : ""
                        }`}
                        aria-hidden
                      />
                    )}
                    {Icon ? (
                      <Icon
                        size={16}
                        className={
                          active
                            ? "shrink-0 text-white"
                            : "shrink-0 text-[var(--color-sidebar-subtle)] group-hover:text-white"
                        }
                      />
                    ) : null}
                    <span className={`truncate ${collapsed ? "lg:hidden" : ""}`}>
                      {item.label}
                    </span>
                  </Link>
                </div>
              );
            })}
          </nav>
        </div>

        <div
          className={`shrink-0 border-t border-[var(--color-sidebar-border)] p-3 ${
            collapsed ? "lg:p-2" : ""
          }`}
        >
          <div
            className={`flex items-center gap-2.5 ${
              collapsed ? "lg:flex-col lg:gap-2" : ""
            }`}
          >
            <Avatar name={displayName} size="sm" />
            <div
              className={`min-w-0 flex-1 ${collapsed ? "lg:hidden" : ""}`}
            >
              <p className="truncate text-xs font-medium text-white">
                {displayName}
              </p>
              <p className="truncate text-[10px] text-[var(--color-sidebar-subtle)]">
                {roleLabel(user.roleCode)}
              </p>
            </div>
            <button
              type="button"
              title="Log out"
              aria-label="Log out"
              onClick={() => logout().then(() => router.push("/login"))}
              className="rounded p-1.5 text-[var(--color-sidebar-subtle)] transition hover:bg-[var(--color-sidebar-hover)] hover:text-white"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-col transition-[padding] duration-200 ease-[var(--ease)] lg:pl-[var(--sidebar-current-w)]">
        <header className="sticky top-0 z-20 h-14 border-b border-[var(--color-line)] bg-[var(--color-surface)]/95 backdrop-blur-sm">
          <div className="flex h-14 items-center justify-between gap-3 px-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-line)] text-[var(--color-ink-muted)] lg:hidden"
                aria-label="Open navigation"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu size={16} />
              </button>
              <Breadcrumbs />
            </div>
            <div className="flex items-center gap-2.5">
              {!isIndividualHome && hasPermission("PROFILE_VIEW") && (
                <div className="relative hidden sm:block">
                  <label className="sr-only" htmlFor="global-search">
                    Search sales executives
                  </label>
                  <div className="relative">
                    <Search
                      size={14}
                      className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-subtle)]"
                      aria-hidden
                    />
                    <input
                      ref={searchRef}
                      id="global-search"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setSearchOpen(true);
                      }}
                      onFocus={() => setSearchOpen(true)}
                      placeholder="Search people…"
                      className="h-8 w-52 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-canvas)] pl-8 pr-12 text-sm md:w-64"
                    />
                    <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-[var(--color-line)] bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px] text-[var(--color-ink-subtle)] md:inline">
                      ⌘K
                    </kbd>
                  </div>
                  {searchOpen &&
                    (query.trim().length >= 2 || results.length > 0) && (
                      <div className="absolute right-0 z-30 mt-1.5 w-80 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-md)]">
                        <div className="flex items-center justify-between border-b border-[var(--color-line)] px-3 py-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-subtle)]">
                            People
                          </p>
                          <button
                            type="button"
                            aria-label="Close search"
                            className="text-[var(--color-ink-subtle)] hover:text-[var(--color-ink)]"
                            onClick={() => setSearchOpen(false)}
                          >
                            <X size={14} />
                          </button>
                        </div>
                        {results.length === 0 ? (
                          <p className="px-3 py-4 text-sm text-[var(--color-ink-muted)]">
                            {query.trim().length < 2
                              ? "Type at least 2 characters"
                              : "No matching sales executives"}
                          </p>
                        ) : (
                          <ul>
                            {results.map((p) => (
                              <li key={p.id}>
                                <Link
                                  href={`/profiles/${p.id}`}
                                  className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-[var(--color-surface-2)]"
                                  onClick={() => {
                                    setSearchOpen(false);
                                    setQuery("");
                                  }}
                                >
                                  <Avatar name={p.displayName} size="sm" />
                                  <span className="min-w-0">
                                    <span className="block truncate text-sm font-medium">
                                      {p.displayName}
                                    </span>
                                    <span className="block truncate text-xs text-[var(--color-ink-muted)]">
                                      {p.team.name}
                                      {p.currentAssignment
                                        ? ` · ${personName(p.currentAssignment.commando)}`
                                        : ""}
                                    </span>
                                  </span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                </div>
              )}
              <span className="hidden rounded-full bg-[var(--color-surface-2)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-ink-muted)] sm:inline">
                {roleLabel(user.roleCode)}
              </span>
              <Avatar name={displayName} size="sm" />
            </div>
          </div>
        </header>

        <main
          className="app-main"
          data-wide={wideContent ? "true" : undefined}
        >
          {children}
        </main>
      </div>
    </div>
  );

  if (seProfileId) {
    return (
      <SeWorkspaceProvider profileId={seProfileId}>{frame}</SeWorkspaceProvider>
    );
  }

  return frame;
}
