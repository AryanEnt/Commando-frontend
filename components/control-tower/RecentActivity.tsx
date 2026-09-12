"use client";

import Link from "next/link";
import type { ControlTowerActivityItem } from "@/lib/api";
import {
  activityLabel,
  activitySubject,
  formatActivityWhen,
} from "./utils";

type Props = {
  items: ControlTowerActivityItem[];
};

export function RecentActivity({ items }: Props) {
  return (
    <section
      aria-labelledby="recent-activity-heading"
      className="flex h-full flex-col rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)]"
    >
      <div className="flex items-start justify-between gap-3 border-b border-[var(--color-line)] px-4 py-4 sm:px-5">
        <div>
          <h2
            id="recent-activity-heading"
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
          className="shrink-0 text-xs font-medium text-[var(--color-brand)] transition hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
        >
          View full audit trail →
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col justify-center px-4 py-8 sm:px-5">
          <p className="text-sm font-medium text-[var(--color-ink)]">
            Quiet for now
          </p>
          <p className="mt-1 max-w-xs text-xs leading-relaxed text-[var(--color-ink-muted)]">
            Operational events will appear here as interventions, referrals, and
            reviews move through the platform.
          </p>
        </div>
      ) : (
        <ol className="relative flex-1 space-y-0 px-4 py-3 sm:px-5">
          {items.map((item, index) => {
            const subject = activitySubject(item.metadata);
            const meta = [item.actor?.name, subject]
              .filter(Boolean)
              .join(" · ");
            const isLast = index === items.length - 1;
            return (
              <li key={item.id} className="relative flex gap-3 pb-4 last:pb-1">
                {!isLast && (
                  <span
                    className="absolute left-[5px] top-3 bottom-0 w-px bg-[var(--color-line)]"
                    aria-hidden
                  />
                )}
                <span
                  className="relative z-[1] mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-[var(--color-brand)] bg-[var(--color-surface)]"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--color-ink)]">
                    {activityLabel(item)}
                  </p>
                  {meta ? (
                    <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
                      {meta}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
                      {item.entityType}
                    </p>
                  )}
                  <time
                    dateTime={item.createdAt}
                    className="mt-1 block text-[11px] tabular-nums text-[var(--color-ink-subtle)]"
                  >
                    {formatActivityWhen(item.createdAt)}
                  </time>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
