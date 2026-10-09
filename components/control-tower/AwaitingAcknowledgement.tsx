"use client";

import Link from "next/link";
import type { ControlTowerData } from "@/lib/api";
import { Avatar } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { DashEmpty, DashPanel } from "@/components/dashboard/DashboardKit";
import { formatDate } from "@/lib/dates";

type Props = {
  pendingReferrals: ControlTowerData["attention"]["pendingReferrals"];
};

export function AwaitingAcknowledgement({ pendingReferrals }: Props) {
  const rows = pendingReferrals.slice(0, 6);

  return (
    <DashPanel
      id="ct-awaiting-ack"
      tone="brand"
      title="Awaiting acknowledgement"
      description="Submitted referrals waiting on Commando"
      aside={
        <Link
          href="/referrals?status=SUBMITTED"
          className="text-[13px] font-medium text-[var(--color-brand)] hover:underline"
        >
          View all
        </Link>
      }
    >
      {rows.length === 0 ? (
        <DashEmpty
          tone="positive"
          title="Nothing waiting"
          description="New submitted referrals will appear here for follow-up."
        />
      ) : (
        <ul className="dash-list">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center gap-3">
              <Avatar name={row.profileName} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/referrals/${row.id}`}
                    className="truncate text-[13px] font-semibold text-[var(--color-ink)] hover:underline"
                  >
                    {row.profileName}
                  </Link>
                  <StatusBadge status="DUE_TODAY" label="Awaiting Commando" />
                </div>
                <p className="truncate text-meta">
                  {row.teamName} · TL {row.teamLead} · Commando {row.commando}
                </p>
              </div>
              <time className="shrink-0 text-[12px] tabular-nums text-[var(--color-ink-subtle)]">
                {formatDate(row.createdAt)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </DashPanel>
  );
}
