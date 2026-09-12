"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ChevronRight,
  ClipboardCheck,
  GitPullRequest,
  ListChecks,
  ShieldCheck,
} from "lucide-react";
import type { ReportsOverview } from "@/lib/api";

type Props = {
  counts: ReportsOverview["counts"];
};

type Row = {
  key: string;
  label: string;
  state: string;
  count: number;
  clear: boolean;
  href: string;
  icon: LucideIcon;
};

export function ActivityHealth({ counts }: Props) {
  const rows: Row[] = [
    {
      key: "actions",
      label: "Action items",
      state:
        counts.overdueActions > 0
          ? `${counts.overdueActions} overdue`
          : "No overdue actions",
      count: counts.overdueActions,
      clear: counts.overdueActions === 0,
      href: "/reports/commando-performance",
      icon: ListChecks,
    },
    {
      key: "reviews",
      label: "Weekly reviews",
      state:
        counts.weeklyReviews.draft > 0
          ? `${counts.weeklyReviews.draft} draft · ${counts.weeklyReviews.submitted} submitted`
          : counts.weeklyReviews.submitted > 0
            ? `${counts.weeklyReviews.submitted} submitted · no drafts`
            : "No open reviews",
      count: counts.weeklyReviews.draft + counts.weeklyReviews.submitted,
      clear: counts.weeklyReviews.draft === 0,
      href: "/reports/commando-performance",
      icon: ClipboardCheck,
    },
    {
      key: "monitoring",
      label: "Monitoring",
      state:
        counts.monitoringRecords > 0
          ? `${counts.monitoringRecords} recorded`
          : "No monitoring records",
      count: counts.monitoringRecords,
      clear: true,
      href: "/reports/commando-performance",
      icon: ShieldCheck,
    },
    {
      key: "referrals",
      label: "Referrals",
      state:
        counts.pendingReferrals > 0
          ? `${counts.pendingReferrals} pending`
          : "No pending referrals",
      count: counts.pendingReferrals,
      clear: counts.pendingReferrals === 0,
      href: "/referrals?status=SUBMITTED",
      icon: GitPullRequest,
    },
  ];

  return (
    <section
      aria-labelledby="activity-health-heading"
      className="flex h-full flex-col rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)]"
    >
      <div className="flex items-end justify-between gap-3 border-b border-[var(--color-line)] px-4 py-3.5">
        <div>
          <h2
            id="activity-health-heading"
            className="text-[15px] font-semibold tracking-tight text-[var(--color-ink)]"
          >
            Activity health
          </h2>
          <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
            Current state across core operational workflows
          </p>
        </div>
        <p className="hidden text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-subtle)] sm:block">
          Current state
        </p>
      </div>

      <ul className="divide-y divide-[var(--color-line)]">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <li key={row.key}>
              <Link
                href={row.href}
                className="group grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3.5 transition duration-150 hover:bg-[var(--color-surface-2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-focus)] sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,1.2fr)_auto_auto]"
              >
                <span
                  className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] text-[var(--color-ink-muted)] transition group-hover:bg-[var(--color-brand-soft)] group-hover:text-[var(--color-brand)]"
                  aria-hidden
                >
                  <Icon size={15} strokeWidth={1.75} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--color-ink)]">
                    {row.label}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--color-ink-muted)] sm:hidden">
                    {row.state}
                  </p>
                </div>
                <p className="hidden min-w-0 items-center gap-2 text-sm text-[var(--color-ink-muted)] sm:flex">
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      row.clear
                        ? "bg-[var(--status-success)]"
                        : "bg-[var(--status-warn)]"
                    }`}
                    aria-hidden
                  />
                  <span className="truncate">
                    {row.clear ? "Clear" : "Needs review"} · {row.state}
                  </span>
                </p>
                <span className="text-sm font-semibold tabular-nums text-[var(--color-ink)]">
                  {row.count}
                </span>
                <ChevronRight
                  size={16}
                  className="hidden text-[var(--color-ink-subtle)] transition duration-150 group-hover:translate-x-0.5 sm:block"
                  aria-hidden
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
