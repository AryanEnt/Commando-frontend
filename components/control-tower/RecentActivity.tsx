"use client";

import Link from "next/link";
import type { ControlTowerActivityItem } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { Avatar } from "@/components/ui";
import { DashEmpty, DashPanel } from "@/components/dashboard/DashboardKit";
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
    return <StatusBadge status="UPCOMING" label="Started" />;
  }
  if (action.includes("REJECTED") || action.includes("EXITED")) {
    return <StatusBadge status="EXITED" label="Closed" />;
  }
  return <StatusBadge status="WATCH" label="Updated" />;
}

export function RecentActivity({ items }: Props) {
  const visible = items.slice(0, 8);

  return (
    <DashPanel
      id="ct-recent-activity"
      tone="bare"
      title="Recent activity"
      description="High-signal events from the audit trail"
      aside={
        <Link
          href="/reports"
          className="text-[13px] font-medium text-[var(--color-brand)] hover:underline"
        >
          View all
        </Link>
      }
    >
      {visible.length === 0 ? (
        <DashEmpty
          title="No recent operational events"
          description="Referral, intervention, review, action, and support events will appear here as work moves through the platform."
        />
      ) : (
        <ul className="dash-list">
          {visible.map((item) => {
            const subject = activitySubject(item.metadata);
            const who = item.actor?.name ?? "System";
            return (
              <li key={item.id} className="flex items-start gap-3">
                <Avatar name={who} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-[var(--color-ink)]">
                    {activityLabel(item)}
                  </p>
                  <p className="mt-0.5 text-meta">
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
    </DashPanel>
  );
}
