"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ClipboardCheck,
  GitPullRequest,
  History,
  ListChecks,
  UserCheck,
} from "lucide-react";
import type { ControlTowerActivityItem } from "@/lib/api";
import {
  ACTIVITY_LABELS,
  activityLabel,
  activitySubject,
  formatActivityWhen,
} from "@/components/control-tower/utils";

type Props = {
  items: ControlTowerActivityItem[];
};

function iconFor(action: string) {
  if (action.includes("REFERRAL") || action.includes("REQUEST")) {
    return GitPullRequest;
  }
  if (action.includes("WEEKLY_REVIEW")) return ClipboardCheck;
  if (action.includes("ACTION_ITEM")) return ListChecks;
  if (action.includes("ASSIGNMENT") || action.includes("INTERVENTION")) {
    return Activity;
  }
  if (action.includes("SUPPORT") || action.includes("ROLE")) return UserCheck;
  return History;
}

export function OperationalTimeline({ items }: Props) {
  return (
    <section
      aria-labelledby="timeline-heading"
      className="flex h-full flex-col rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)]"
    >
      <div className="flex items-start justify-between gap-3 border-b border-[var(--color-line)] px-4 py-3.5">
        <div>
          <h2
            id="timeline-heading"
            className="text-[15px] font-semibold tracking-tight text-[var(--color-ink)]"
          >
            Recent activity
          </h2>
          <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
            High-signal operational events
          </p>
        </div>
        <Link
          href="/audit-logs"
          className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-brand)] transition hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
        >
          View full audit trail
          <ArrowRight size={12} aria-hidden />
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-start justify-center gap-2 px-4 py-8">
          <p className="text-sm font-medium text-[var(--color-ink)]">
            No recent operational events
          </p>
          <p className="max-w-sm text-xs leading-relaxed text-[var(--color-ink-muted)]">
            Assignment, referral, review, and action events will appear here as
            they occur.
          </p>
        </div>
      ) : (
        <ol className="relative flex-1 divide-y divide-[var(--color-line)]">
          {items.slice(0, 8).map((item) => {
            const Icon = iconFor(item.action);
            const subject = activitySubject(item.metadata);
            const known = Boolean(ACTIVITY_LABELS[item.action]);
            return (
              <li key={item.id}>
                <Link
                  href={
                    item.entityType === "Referral" && item.entityId
                      ? `/referrals/${item.entityId}`
                      : item.entityType === "CommandoAssignment" && item.entityId
                        ? `/reports/commando-performance/${item.entityId}`
                        : "/audit-logs"
                  }
                  className="group flex gap-3 px-4 py-3.5 transition duration-150 hover:bg-[var(--color-surface-2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-focus)]"
                >
                  <span
                    className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink-muted)] transition group-hover:border-[var(--color-brand)]/30 group-hover:bg-[var(--color-brand-soft)] group-hover:text-[var(--color-brand)]"
                    aria-hidden
                  >
                    <Icon size={14} strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--color-ink)]">
                      {activityLabel(item)}
                      {!known ? (
                        <span className="sr-only"> (system event)</span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-[var(--color-ink-muted)]">
                      {item.actor?.name ?? "System"}
                      {subject ? ` · ${subject}` : ""}
                    </p>
                    <p className="mt-1 text-[11px] tabular-nums text-[var(--color-ink-subtle)]">
                      {formatActivityWhen(item.createdAt)}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
