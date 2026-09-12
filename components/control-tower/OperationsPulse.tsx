"use client";

import type { ControlTowerData } from "@/lib/api";
import { statusTone, workflowHealthPercent, type WorkflowRow } from "./utils";

type Props = {
  metrics: ControlTowerData["metrics"];
  rows: WorkflowRow[];
};

function HealthRing({ percent }: { percent: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  const tone =
    percent === 100
      ? "var(--status-success)"
      : percent >= 75
        ? "var(--status-info)"
        : "var(--status-warn)";

  return (
    <div className="relative h-[88px] w-[88px] shrink-0">
      <svg viewBox="0 0 88 88" className="h-full w-full -rotate-90" aria-hidden>
        <circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          stroke="var(--color-canvas-2)"
          strokeWidth="8"
        />
        <circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-semibold tabular-nums text-[var(--color-ink)]">
          {percent}%
        </span>
      </div>
    </div>
  );
}

export function OperationsPulse({ metrics, rows }: Props) {
  const workflowRows = rows;
  const health = workflowHealthPercent(workflowRows);

  const activityBars = [
    {
      label: "Monitoring (7d)",
      value: metrics.monitoringLast7d,
      tone: "bg-[var(--color-brand)]",
    },
    {
      label: "Reviews submitted (7d)",
      value: metrics.submittedWeeklyReviewsLast7d,
      tone: "bg-[var(--status-info)]",
    },
    {
      label: "Referrals in flight",
      value:
        metrics.referrals.acknowledged + metrics.referrals.inProgress,
      tone: "bg-[var(--color-ink-muted)]",
    },
  ];
  const maxBar = Math.max(1, ...activityBars.map((b) => b.value));

  return (
    <section
      aria-labelledby="operations-pulse-heading"
      className="h-full rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2
            id="operations-pulse-heading"
            className="text-[15px] font-semibold tracking-tight text-[var(--color-ink)]"
          >
            Operations pulse
          </h2>
          <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
            Workflow health and recent operational volume
          </p>
        </div>
        <div className="flex items-center gap-4">
          <HealthRing percent={health} />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-subtle)]">
              Overall
            </p>
            <p className="mt-1 text-sm font-medium text-[var(--color-ink)]">
              {health === 100
                ? "Healthy"
                : health >= 75
                  ? "Mostly healthy"
                  : "Needs attention"}
            </p>
            <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
              {workflowRows.filter((r) => r.status === "Healthy").length} of{" "}
              {workflowRows.length} workflows clear
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {workflowRows.map((row) => {
          const tone = statusTone(row.status);
          const fill =
            row.status === "Healthy" ? 100 : row.status === "Review" ? 55 : 35;
          return (
            <div key={row.key}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-[var(--color-ink)]">
                  {row.workflow}
                </span>
                <span className={`text-[11px] font-medium ${tone.text}`}>
                  {tone.label}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-canvas-2)]">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${tone.bar}`}
                  style={{ width: `${fill}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 border-t border-[var(--color-line)] pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-subtle)]">
          Activity volume
        </p>
        <ul className="mt-3 space-y-2.5">
          {activityBars.map((bar) => (
            <li key={bar.label} className="flex items-center gap-3">
              <span className="w-36 shrink-0 text-xs text-[var(--color-ink-muted)] sm:w-44">
                {bar.label}
              </span>
              <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--color-canvas-2)]">
                <div
                  className={`h-full rounded-full ${bar.tone}`}
                  style={{
                    width: `${Math.max(bar.value > 0 ? 8 : 0, (bar.value / maxBar) * 100)}%`,
                  }}
                />
              </div>
              <span className="w-6 shrink-0 text-right text-xs font-medium tabular-nums text-[var(--color-ink)]">
                {bar.value}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
