"use client";

import Link from "next/link";
import type { ControlTowerData } from "@/lib/api";
import { formatDate } from "@/lib/dates";
import { DashEmpty, DashPanel } from "@/components/dashboard/DashboardKit";

type Props = {
  overdueActions: ControlTowerData["attention"]["overdueActions"];
};

export function OverdueActionsPanel({ overdueActions }: Props) {
  const rows = overdueActions.slice(0, 6);

  return (
    <DashPanel
      id="ct-overdue-actions"
      title="Overdue actions"
      description="Past-due ownership items needing follow-up"
      aside={
        <Link
          href="/reports"
          className="text-[13px] font-medium text-[var(--color-brand)] hover:underline"
        >
          View all
        </Link>
      }
    >
      {rows.length === 0 ? (
        <DashEmpty
          tone="positive"
          title="No overdue actions"
          description="Open assignments past their due date will surface here."
        />
      ) : (
        <ul className="dash-list">
          {rows.map((row) => (
            <li
              key={row.id}
              data-signal="critical"
              className="flex flex-wrap items-center justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/action-items/${row.id}`}
                  className="line-clamp-1 text-[13px] font-semibold text-[var(--color-ink)] hover:underline"
                >
                  {row.title}
                </Link>
                <p className="mt-0.5 truncate text-meta">{row.profileName}</p>
              </div>
              <span className="shrink-0 text-[12px] font-semibold tabular-nums text-[var(--status-danger)]">
                Due {formatDate(row.dueDate)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </DashPanel>
  );
}
