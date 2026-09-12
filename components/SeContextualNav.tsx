"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useOptionalSeWorkspace } from "@/lib/se-workspace-context";
import {
  seNavForRole,
  seSectionFromPathname,
  type SeSection,
} from "@/lib/se-workspace-nav";
import { seSectionFromRelatedPathname } from "@/lib/se-workspace-persist";

export function SeContextualNav({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const se = useOptionalSeWorkspace();
  const profile = se?.profile;

  if (!profile) {
    if (se?.loading) {
      return (
        <div className="mt-3 border-t border-[var(--color-sidebar-border)] pt-3">
          {!collapsed && (
            <p className="px-2.5 text-[11px] text-[var(--color-sidebar-subtle)]">
              Loading…
            </p>
          )}
        </div>
      );
    }
    return null;
  }

  const section =
    (seSectionFromRelatedPathname(pathname) as SeSection | null) ??
    seSectionFromPathname(pathname);
  const nav = seNavForRole(user?.roleCode ?? "COMMANDO_EXECUTIVE");
  const name = profile.displayName;

  return (
    <div className="mt-3 border-t border-[var(--color-sidebar-border)] pt-3">
      {!collapsed ? (
        <div className="mb-2 px-2.5">
          <p className="truncate text-[11px] font-semibold text-[var(--color-sidebar-subtle)]">
            {name}
          </p>
          <p className="mt-0.5 truncate text-[10px] text-[var(--color-sidebar-subtle)]">
            {profile.team.name}
          </p>
        </div>
      ) : (
        <p className="mb-2 px-2 text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--color-sidebar-subtle)]">
          SE
        </p>
      )}
      <nav aria-label={`${name} workspace`} className="space-y-0.5">
        {nav.map((item) => {
          const href = item.href(profile.id);
          const active = item.section === section;
          return (
            <Link
              key={item.section}
              href={href}
              title={item.label}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-[13px] transition duration-150 ${
                active
                  ? "bg-[var(--color-sidebar-active)] text-white"
                  : "text-[var(--color-sidebar-muted)] hover:bg-[var(--color-sidebar-hover)] hover:text-white"
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
          );
        })}
      </nav>
    </div>
  );
}
