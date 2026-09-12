"use client";

import Link from "next/link";
import type { ReportsOverview } from "@/lib/api";

type Props = {
  counts: ReportsOverview["counts"];
};

export function InterventionStatus({ counts }: Props) {
  const rows = [
    {
      label: "Active",
      value: counts.interventions.active,
      href: "/reports/commando-performance?status=ACTIVE",
      color: "bg-[var(--color-brand)]",
    },
    {
      label: "Completed",
      value: counts.interventions.completed,
      href: "/reports/commando-performance?status=COMPLETED",
      color: "bg-[var(--status-success)]",
    },
    {
      label: "Exited",
      value: counts.interventions.exited,
      href: "/reports/commando-performance?status=EXITED",
      color: "bg-[var(--color-ink-subtle)]",
    },
  ];

  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const dominant = rows.reduce(
    (best, row) => (row.value > best.value ? row : best),
    rows[0],
  );

  return (
    <section
      aria-labelledby="status-heading"
      className="flex h-full flex-col rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)]"
    >
      <div className="border-b border-[var(--color-line)] px-4 py-3.5">
        <h2
          id="status-heading"
          className="text-[15px] font-semibold tracking-tight text-[var(--color-ink)]"
        >
          Intervention status
        </h2>
        <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
          Assignment distribution by current state
        </p>
      </div>

      <div className="flex flex-1 flex-col justify-between gap-5 px-4 py-4">
        <div>
          <div
            className="flex h-2.5 overflow-hidden rounded-full bg-[var(--color-canvas-2)]"
            role="img"
            aria-label={
              total === 0
                ? "No intervention assignments"
                : `Intervention mix: ${rows
                    .map((r) => `${r.label} ${r.value}`)
                    .join(", ")}`
            }
          >
            {total === 0 ? (
              <div className="h-full w-full bg-[var(--color-line)]" />
            ) : (
              rows.map((row) =>
                row.value > 0 ? (
                  <div
                    key={row.label}
                    className={`${row.color} transition-[width] duration-300`}
                    style={{ width: `${(row.value / total) * 100}%` }}
                    title={`${row.label}: ${row.value}`}
                  />
                ) : null,
              )
            )}
          </div>

          <ul className="mt-4 space-y-1">
            {rows.map((row) => (
              <li key={row.label}>
                <Link
                  href={row.href}
                  className="group flex items-center gap-3 rounded-[var(--radius-sm)] px-1.5 py-2 transition duration-150 hover:bg-[var(--color-surface-2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${row.color}`}
                    aria-hidden
                  />
                  <span className="flex-1 text-sm text-[var(--color-ink)]">
                    {row.label}
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-[var(--color-ink)]">
                    {row.value}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <p className="border-t border-[var(--color-line)] pt-3 text-xs leading-relaxed text-[var(--color-ink-muted)]">
          {total === 0 ? (
            <>No intervention assignments recorded yet.</>
          ) : dominant.value === total ? (
            <>
              All recorded assignments are currently{" "}
              <span className="font-medium text-[var(--color-ink)]">
                {dominant.label.toLowerCase()}
              </span>
              .
            </>
          ) : (
            <>
              Largest share:{" "}
              <span className="font-medium text-[var(--color-ink)]">
                {dominant.label}
              </span>{" "}
              ({dominant.value} of {total}).
            </>
          )}
        </p>
      </div>
    </section>
  );
}
