"use client";

import Link from "next/link";
import { Circle } from "lucide-react";
import type { ControlTowerData } from "@/lib/api";
import { formatDate } from "@/lib/dates";

type Props = {
  overdueActions: ControlTowerData["attention"]["overdueActions"];
};

export function OverdueActionsPanel({ overdueActions }: Props) {
  const rows = overdueActions.slice(0, 6);

  return (
    <section
      aria-labelledby="overdue-actions-heading"
      className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]"
    >
      <div className="flex items-start justify-between gap-3 border-b border-[var(--color-line)] px-4 py-3.5 sm:px-5">
        <div>
          <h2
            id="overdue-actions-heading"
            className="text-[15px] font-semibold tracking-tight text-[var(--color-ink)]"
          >
            Overdue actions
          </h2>
          <p className="mt-0.5 text-[12px] text-[var(--color-ink-muted)]">
            Past-due ownership items needing follow-up
          </p>
        </div>
        <Link
          href="/reports"
          className="shrink-0 text-[13px] font-medium text-[var(--color-brand)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
        >
          View all
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="px-4 py-7 sm:px-5">
          <p className="text-[13px] font-medium text-[var(--color-ink)]">
            No overdue actions
          </p>
          <p className="mt-1 text-[12px] text-[var(--color-ink-muted)]">
            Open assignments past their due date will surface here.
          </p>
        </div>
      ) : (
        <div className="grid gap-2.5 p-3 sm:grid-cols-2 sm:p-4">
          {rows.map((row) => (
            <Link
              key={row.id}
              href={`/action-items/${row.id}`}
              className="group flex items-start gap-2.5 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface-2)]/60 px-3 py-3 transition hover:border-[var(--status-danger-ring)] hover:bg-[var(--status-danger-bg)]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
            >
              <Circle
                size={14}
                className="mt-0.5 shrink-0 text-[var(--status-danger)]"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-[13px] font-semibold text-[var(--color-ink)] group-hover:text-[var(--color-brand)]">
                  {row.title}
                </p>
                <p className="mt-1 truncate text-[12px] text-[var(--color-ink-muted)]">
                  {row.profileName}
                </p>
                <p className="mt-1.5 text-[11px] font-semibold tabular-nums text-[var(--status-danger)]">
                  Due {formatDate(row.dueDate)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
