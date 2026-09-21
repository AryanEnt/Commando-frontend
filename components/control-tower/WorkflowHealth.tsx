"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { statusTone, type WorkflowRow } from "./utils";

type Props = {
  rows: WorkflowRow[];
};

export function WorkflowHealth({ rows }: Props) {
  return (
    <section
      aria-labelledby="workflow-health-heading"
      className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]"
    >
      <div className="border-b border-[var(--color-line)] px-4 py-3.5 sm:px-5">
        <h2
          id="workflow-health-heading"
          className="text-[15px] font-semibold tracking-tight text-[var(--color-ink)]"
        >
          Workflow health
        </h2>
        <p className="mt-0.5 text-[12px] text-[var(--color-ink-muted)]">
          Requests, interventions, and accountability — kept distinct
        </p>
      </div>

      <ul className="divide-y divide-[var(--color-line)]">
        {rows.map((row) => {
          const tone = statusTone(row.status);
          return (
            <li key={row.key}>
              <div className="flex flex-col gap-2 px-4 py-3 transition hover:bg-[var(--color-surface-2)]/60 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13px] font-semibold text-[var(--color-ink)]">
                      {row.workflow}
                    </p>
                    <StatusBadge status={tone.badge} label={tone.label} />
                  </div>
                  <p className="mt-0.5 text-[12px] text-[var(--color-ink-muted)]">
                    {row.state}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <span className="text-[1.125rem] font-semibold tabular-nums tracking-tight text-[var(--color-ink)]">
                    {row.count}
                  </span>
                  <Link
                    href={row.href}
                    className="text-[13px] font-medium text-[var(--color-brand)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
                  >
                    Open
                  </Link>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
