"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  GitPullRequest,
  ListChecks,
} from "lucide-react";
import type { ReportsOverview } from "@/lib/api";

type Props = {
  counts: ReportsOverview["counts"];
};

type AttentionItem = {
  key: string;
  severity: "critical" | "warning";
  title: string;
  detail: string;
  count: number;
  href: string;
  icon: typeof ListChecks;
};

export function AttentionCenter({ counts }: Props) {
  const items: AttentionItem[] = [];

  if (counts.overdueActions > 0) {
    items.push({
      key: "overdue",
      severity: "critical",
      title: "Overdue actions",
      detail: `${counts.overdueActions} action item${counts.overdueActions === 1 ? "" : "s"} past due`,
      count: counts.overdueActions,
      href: "/reports/commando-performance",
      icon: ListChecks,
    });
  }
  if (counts.pendingReferrals > 0) {
    items.push({
      key: "referrals",
      severity: "warning",
      title: "Pending referrals",
      detail: `${counts.pendingReferrals} awaiting acknowledgement`,
      count: counts.pendingReferrals,
      href: "/referrals?status=SUBMITTED",
      icon: GitPullRequest,
    });
  }
  if (counts.weeklyReviews.draft > 0) {
    items.push({
      key: "drafts",
      severity: "warning",
      title: "Draft reviews",
      detail: `${counts.weeklyReviews.draft} weekly review${counts.weeklyReviews.draft === 1 ? "" : "s"} still open`,
      count: counts.weeklyReviews.draft,
      href: "/reports/commando-performance",
      icon: ClipboardList,
    });
  }

  const clear = items.length === 0;

  return (
    <section
      aria-labelledby="attention-heading"
      className={`flex h-full flex-col overflow-hidden rounded-[var(--radius-md)] border ${
        clear
          ? "border-[var(--status-success-ring)] bg-[var(--status-success-bg)]/40"
          : "border-[var(--color-line)] bg-[var(--color-surface)]"
      }`}
    >
      <div
        className={`flex items-start gap-3 border-b px-4 py-3.5 ${
          clear
            ? "border-[var(--status-success-ring)]/60"
            : "border-[var(--color-line)]"
        }`}
      >
        <span
          className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] ${
            clear
              ? "bg-[var(--status-success-bg)] text-[var(--status-success)]"
              : "bg-[var(--status-warn-bg)] text-[var(--status-warn)]"
          }`}
          aria-hidden
        >
          {clear ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
        </span>
        <div className="min-w-0">
          <h2
            id="attention-heading"
            className="text-[15px] font-semibold tracking-tight text-[var(--color-ink)]"
          >
            {clear ? "Attention center" : "Attention required"}
          </h2>
          <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
            {clear
              ? "All monitored workflows are clear"
              : `${items.length} item${items.length === 1 ? "" : "s"} require review`}
          </p>
        </div>
      </div>

      {clear ? (
        <div className="flex flex-1 flex-col justify-center gap-3 px-4 py-5">
          <ul className="space-y-2 text-sm text-[var(--color-ink-muted)]">
            <li className="flex items-center gap-2">
              <CheckCircle2
                size={14}
                className="text-[var(--status-success)]"
                aria-hidden
              />
              No overdue actions
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2
                size={14}
                className="text-[var(--status-success)]"
                aria-hidden
              />
              No draft reviews
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2
                size={14}
                className="text-[var(--status-success)]"
                aria-hidden
              />
              No pending referrals
            </li>
          </ul>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--color-line)]">
          {items.map((item) => {
            const Icon = item.icon;
            const severityLabel =
              item.severity === "critical" ? "Critical" : "Warning";
            const severityClass =
              item.severity === "critical"
                ? "bg-[var(--status-danger-bg)] text-[var(--status-danger)]"
                : "bg-[var(--status-warn-bg)] text-[var(--status-warn)]";
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="group flex items-start gap-3 px-4 py-3.5 transition duration-150 hover:bg-[var(--color-surface-2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-focus)]"
                >
                  <span
                    className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] ${severityClass}`}
                    aria-hidden
                  >
                    <Icon size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${severityClass}`}
                      >
                        {severityLabel}
                      </span>
                      <span className="text-sm font-medium text-[var(--color-ink)]">
                        {item.title}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                      {item.detail}
                    </p>
                  </div>
                  <span className="flex items-center gap-1 pt-1 text-sm font-semibold tabular-nums text-[var(--color-ink)]">
                    {item.count}
                    <ChevronRight
                      size={14}
                      className="text-[var(--color-ink-subtle)] transition group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
