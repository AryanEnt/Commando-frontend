"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { DashPanel } from "@/components/dashboard/DashboardKit";
import { statusTone, type WorkflowRow } from "./utils";

type Props = {
  rows: WorkflowRow[];
  id?: string;
};

const ROW_SIGNAL: Record<WorkflowRow["status"], string | undefined> = {
  Healthy: "positive",
  Attention: "warning",
  Watch: undefined,
};

export function WorkflowHealth({ rows, id = "ct-workflow-health" }: Props) {
  return (
    <DashPanel
      id={id}
      title="Workflow health"
      description="Requests, interventions, and accountability — kept distinct"
    >
      <ul className="dash-list">
        {rows.map((row) => {
          const tone = statusTone(row.status);
          return (
            <li
              key={row.key}
              data-signal={ROW_SIGNAL[row.status]}
              className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[13px] font-semibold text-[var(--color-ink)]">
                    {row.workflow}
                  </p>
                  <StatusBadge status={tone.badge} label={tone.label} />
                </div>
                <p className="mt-0.5 text-meta">{row.state}</p>
              </div>
              <div className="flex items-center justify-between gap-4 sm:justify-end">
                <span className="text-[1.125rem] font-bold tabular-nums tracking-tight text-[var(--color-ink)]">
                  {row.count}
                </span>
                <Link
                  href={row.href}
                  className="text-[13px] font-semibold text-[var(--color-brand)] hover:underline"
                >
                  Open
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </DashPanel>
  );
}
