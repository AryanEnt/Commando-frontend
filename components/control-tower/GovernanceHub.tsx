"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ClipboardCheck,
  FileSearch,
  LayoutGrid,
  Network,
  ScrollText,
  Settings2,
  Users,
  UsersRound,
} from "lucide-react";

type GovernanceItem = {
  href: string;
  label: string;
  desc: string;
  icon: LucideIcon;
};

type GovernanceGroup = {
  title: string;
  items: GovernanceItem[];
};

const GROUPS: GovernanceGroup[] = [
  {
    title: "People & Organization",
    items: [
      {
        href: "/users",
        label: "Users",
        desc: "Accounts, roles, access",
        icon: Users,
      },
      {
        href: "/teams",
        label: "Teams",
        desc: "Membership and structure",
        icon: UsersRound,
      },
      {
        href: "/organization",
        label: "Organization",
        desc: "Team → people map",
        icon: Network,
      },
      {
        href: "/profiles",
        label: "Sales Executives",
        desc: "Profiles and history",
        icon: LayoutGrid,
      },
    ],
  },
  {
    title: "Configuration",
    items: [
      {
        href: "/configuration",
        label: "Configuration",
        desc: "Platform setup hub",
        icon: Settings2,
      },
      {
        href: "/activity-types",
        label: "Activity Types",
        desc: "Coaching catalog",
        icon: ClipboardCheck,
      },
      {
        href: "/monitoring-checklists",
        label: "Checklists",
        desc: "Monitoring templates",
        icon: ScrollText,
      },
    ],
  },
  {
    title: "Oversight & Audit",
    items: [
      {
        href: "/reports",
        label: "Reports",
        desc: "Oversight and investigation",
        icon: FileSearch,
      },
    ],
  },
];

/** Full governance directory — kept below the command-center body. */
export function GovernanceHub() {
  return (
    <section aria-labelledby="governance-heading">
      <div className="mb-3">
        <h2
          id="governance-heading"
          className="text-[15px] font-semibold tracking-tight text-[var(--color-ink)]"
        >
          Governance shortcuts
        </h2>
        <p className="mt-0.5 text-[12px] text-[var(--color-ink-muted)]">
          Administration, configuration, and oversight
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {GROUPS.map((group) => (
          <div
            key={group.title}
            className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-1 shadow-[var(--shadow-sm)]"
          >
            <h3 className="px-3 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-subtle)]">
              {group.title}
            </h3>
            <ul>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="group flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 transition hover:bg-[var(--color-surface-2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
                    >
                      <span
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-canvas-2)] text-[var(--color-ink-muted)] transition group-hover:bg-[var(--color-brand-soft)] group-hover:text-[var(--color-brand)]"
                        aria-hidden
                      >
                        <Icon size={14} strokeWidth={1.75} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-medium text-[var(--color-ink)]">
                          {item.label}
                        </span>
                        <span className="block text-[12px] text-[var(--color-ink-muted)]">
                          {item.desc}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
