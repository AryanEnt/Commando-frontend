"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Building2,
  ClipboardCheck,
  FileSearch,
  LayoutGrid,
  ScrollText,
  Shield,
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
        desc: "Roles and access",
        icon: Users,
      },
      {
        href: "/teams",
        label: "Teams",
        desc: "Membership",
        icon: UsersRound,
      },
      {
        href: "/organization",
        label: "Organization",
        desc: "Structure overview",
        icon: Building2,
      },
      {
        href: "/profiles",
        label: "Sales Executives",
        desc: "Profiles & history",
        icon: LayoutGrid,
      },
    ],
  },
  {
    title: "Configuration",
    items: [
      {
        href: "/activity-types",
        label: "Activity Types",
        desc: "Coaching catalog",
        icon: ClipboardCheck,
      },
      {
        href: "/monitoring-checklists",
        label: "Monitoring Checklists",
        desc: "Templates",
        icon: ScrollText,
      },
    ],
  },
  {
    title: "Oversight",
    items: [
      {
        href: "/reports",
        label: "Reports & Oversight",
        desc: "Investigate details",
        icon: FileSearch,
      },
      {
        href: "/audit-logs",
        label: "Audit Trail",
        desc: "Immutable history",
        icon: Shield,
      },
    ],
  },
];

function GovernanceItemRow({ item }: { item: GovernanceItem }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className="group flex items-center gap-3 rounded-[var(--radius-sm)] px-2.5 py-2.5 transition duration-200 hover:bg-[var(--color-surface-2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
    >
      <span
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-canvas-2)] text-[var(--color-ink-muted)] transition group-hover:text-[var(--color-ink)]"
        aria-hidden
      >
        <Icon size={15} strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-[var(--color-ink)]">
          {item.label}
        </span>
        <span className="block text-xs text-[var(--color-ink-muted)]">
          {item.desc}
        </span>
      </span>
      <ArrowRight
        size={14}
        className="shrink-0 text-[var(--color-ink-subtle)] opacity-0 transition duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
        aria-hidden
      />
    </Link>
  );
}

export function GovernanceHub() {
  return (
    <section aria-labelledby="governance-heading">
      <div className="mb-3">
        <h2
          id="governance-heading"
          className="text-[15px] font-semibold tracking-tight text-[var(--color-ink)]"
        >
          Governance
        </h2>
        <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
          Administration, configuration, and oversight
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {GROUPS.map((group) => (
          <div
            key={group.title}
            className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-2"
          >
            <h3 className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-subtle)]">
              {group.title}
            </h3>
            <ul>
              {group.items.map((item) => (
                <li key={item.href}>
                  <GovernanceItemRow item={item} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
