"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ControlTowerData } from "@/lib/api";
import { Avatar } from "@/components/ui";
import { formatDate } from "@/lib/dates";

type Props = {
  pendingReferrals: ControlTowerData["attention"]["pendingReferrals"];
};

export function AwaitingAcknowledgement({ pendingReferrals }: Props) {
  const rows = pendingReferrals.slice(0, 6);

  return (
    <section
      aria-labelledby="awaiting-ack-heading"
      className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]"
    >
      <div className="flex items-start justify-between gap-3 border-b border-[var(--color-line)] px-4 py-3.5 sm:px-5">
        <div>
          <h2
            id="awaiting-ack-heading"
            className="text-[15px] font-semibold tracking-tight text-[var(--color-ink)]"
          >
            Awaiting acknowledgement
          </h2>
          <p className="mt-0.5 text-[12px] text-[var(--color-ink-muted)]">
            Submitted referrals waiting on Commando
          </p>
        </div>
        <Link
          href="/referrals?status=SUBMITTED"
          className="shrink-0 text-[13px] font-medium text-[var(--color-brand)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
        >
          View all
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="px-4 py-7 sm:px-5">
          <p className="text-[13px] font-medium text-[var(--color-ink)]">
            Nothing waiting
          </p>
          <p className="mt-1 text-[12px] text-[var(--color-ink-muted)]">
            New submitted referrals will appear here for follow-up.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--color-line)]">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={`/referrals/${row.id}`}
                className="group flex items-center gap-3 px-4 py-3 transition hover:bg-[var(--color-surface-2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-focus)] sm:px-5"
              >
                <Avatar name={row.profileName} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-[var(--color-ink)] group-hover:text-[var(--color-brand)]">
                    {row.profileName}
                  </p>
                  <p className="truncate text-[12px] text-[var(--color-ink-muted)]">
                    {row.teamName} · TL {row.teamLead} · Commando {row.commando}
                  </p>
                </div>
                <time className="shrink-0 text-[12px] tabular-nums text-[var(--color-ink-subtle)]">
                  {formatDate(row.createdAt)}
                </time>
                <ChevronRight
                  size={14}
                  className="shrink-0 text-[var(--color-ink-subtle)] transition group-hover:text-[var(--color-brand)]"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
