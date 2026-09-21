"use client";

import Link from "next/link";
import type { ControlTowerActivityItem } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { Avatar } from "@/components/ui";
import {
  activityLabel,
  activitySubject,
  formatActivityWhen,
} from "./utils";

type Props = {
  items: ControlTowerActivityItem[];
};

function entityStatus(action: string) {
  if (
    action.includes("COMPLETED") ||
    action.includes("ENDED") ||
    action.includes("SUBMITTED")
  ) {
    return <StatusBadge status="COMPLETED" label="Done" />;
  }
  if (action.includes("STARTED") || action.includes("CREATED")) {
    return <StatusBadge status="ACTIVE" label="Started" />;
  }
  if (action.includes("REJECTED") || action.includes("EXITED")) {
    return <StatusBadge status="EXITED" label="Closed" />;
  }
  return <StatusBadge status="IN_PROGRESS" label="Updated" />;
}

export function RecentActivity({ items }: Props) {
  const visible = items.slice(0, 8);

  return (
    <section
      aria-labelledby="recent-activity-heading"
      className="flex h-full flex-col overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]"
    >
      <div className="flex items-start justify-between gap-3 border-b border-[var(--color-line)] px-4 py-3.5 sm:px-5">
        <div>
          <h2
            id="recent-activity-heading"
            className="text-[15px] font-semibold tracking-tight text-[var(--color-ink)]"
          >
            Recent activity
          </h2>
          <p className="mt-0.5 text-[12px] text-[var(--color-ink-muted)]">
            High-signal events from the audit trail
          </p>
        </div>
        <Link
          href="/reports"
          className="shrink-0 text-[13px] font-medium text-[var(--color-brand)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
        >
          View all
        </Link>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-1 flex-col justify-center px-4 py-8 sm:px-5">
          <p className="text-[13px] font-medium text-[var(--color-ink)]">
            No recent operational events
          </p>
          <p className="mt-1.5 max-w-sm text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
            Referral, intervention, review, action, and support events will
            appear here as work moves through the platform.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--color-line)]">
          {visible.map((item) => {
            const subject = activitySubject(item.metadata);
            const who = item.actor?.name ?? "System";
            return (
              <li
                key={item.id}
                className="flex items-start gap-3 px-4 py-3 transition hover:bg-[var(--color-surface-2)]/50 sm:px-5"
              >
                <Avatar name={who} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-[var(--color-ink)]">
                    {activityLabel(item)}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[var(--color-ink-muted)]">
                    {[who, subject, item.entityType].filter(Boolean).join(" · ")}
                  </p>
                  <time
                    dateTime={item.createdAt}
                    className="mt-1 block text-[11px] tabular-nums text-[var(--color-ink-subtle)]"
                  >
                    {formatActivityWhen(item.createdAt)}
                  </time>
                </div>
                <div className="shrink-0">{entityStatus(item.action)}</div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
