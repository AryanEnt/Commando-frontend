"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Icons } from "@/components/icons";
import { Avatar } from "@/components/ui";
import {
  seGroupedNavForRole,
  type SeNavGroup,
  type SeNavIcon,
  type SeSection,
} from "@/lib/se-workspace-nav";

function profilesListHref() {
  if (typeof window === "undefined") return "/profiles";
  const q = sessionStorage.getItem("profilesListQuery");
  return q ? `/profiles?${q}` : "/profiles";
}

function NavIcon({
  name,
  className,
}: {
  name: SeNavIcon;
  className?: string;
}) {
  const Cmp = Icons[name];
  return <Cmp size={16} className={className} />;
}

function GroupNav({
  group,
  profileId,
  section,
}: {
  group: SeNavGroup;
  profileId: string;
  section: SeSection;
}) {
  return (
    <div className={group.prominent ? "space-y-1.5" : "space-y-1"}>
      <p className="px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-subtle)]">
        {group.label}
      </p>
      <ul
        className={
          group.prominent
            ? "overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-1 shadow-[var(--shadow-sm)]"
            : "space-y-0.5 px-0.5"
        }
      >
        {group.items.map((item) => {
          const href = item.href(profileId);
          const active = item.section === section;
          const primary = Boolean(item.primary);
          return (
            <li key={item.section}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13px] transition ${
                  active
                    ? "bg-[var(--color-brand-soft)] font-semibold text-[var(--color-brand-dark)]"
                    : primary
                      ? "font-semibold text-[var(--color-ink)] hover:bg-[var(--color-mint)]"
                      : group.prominent
                        ? "font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface-2)]"
                        : "text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
                }`}
              >
                {active ? (
                  <span
                    className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-[var(--color-brand)]"
                    aria-hidden
                  />
                ) : null}
                <span
                  className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] ${
                    active || primary
                      ? "bg-[var(--color-brand-soft)] text-[var(--color-brand-dark)]"
                      : "bg-[var(--color-surface-2)] text-[var(--color-ink-subtle)]"
                  }`}
                >
                  {item.icon ? (
                    <NavIcon name={item.icon} />
                  ) : (
                    <Icons.dashboard size={16} />
                  )}
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function SeWorkspaceSidebar({
  profileId,
  displayName,
  teamName,
  statusLabel,
  statusActive,
  section,
  roleCode,
  onAddDailyLog,
}: {
  profileId: string;
  displayName: string;
  teamName?: string;
  statusLabel: string;
  statusActive: boolean;
  section: SeSection;
  roleCode: string;
  onAddDailyLog?: () => void;
}) {
  const groups = seGroupedNavForRole(roleCode);

  return (
    <aside
      aria-label={`${displayName} workspace`}
      className="flex h-full min-h-0 w-[15.5rem] shrink-0 flex-col border-r border-[var(--color-line)] bg-[var(--color-surface)]"
    >
      <div className="shrink-0 border-b border-[var(--color-line)] px-4 py-4">
        <Link
          href={profilesListHref()}
          className="mb-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-ink-muted)] transition hover:text-[var(--color-ink)]"
        >
          <ArrowLeft size={13} aria-hidden />
          Sales Executives
        </Link>
        <div className="flex items-start gap-2.5">
          <Avatar name={displayName} size="sm" />
          <div className="min-w-0 pt-0.5">
            <p className="truncate text-[14px] font-semibold tracking-tight text-[var(--color-ink)]">
              {displayName}
            </p>
            <p className="mt-0.5 truncate text-[12px] text-[var(--color-ink-muted)]">
              Sales Executive
              {teamName ? ` · ${teamName}` : ""}
            </p>
          </div>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-ink)]">
          <span
            className={`inline-block h-2 w-2 shrink-0 rounded-full ${
              statusActive
                ? "bg-[var(--color-brand)]"
                : "bg-[var(--color-ink-subtle)]"
            }`}
            aria-hidden
          />
          {statusLabel}
        </p>
        {onAddDailyLog ? (
          <button
            type="button"
            onClick={onAddDailyLog}
            className="btn btn-primary btn-sm mt-3 w-full justify-center"
          >
            + Daily Log
          </button>
        ) : null}
      </div>

      <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {groups.map((group) => (
          <GroupNav
            key={group.id}
            group={group}
            profileId={profileId}
            section={section}
          />
        ))}
      </nav>
    </aside>
  );
}
