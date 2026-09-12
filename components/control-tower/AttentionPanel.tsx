"use client";

import Link from "next/link";
import { CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";
import type { ControlTowerAlert } from "@/lib/api";

type Props = {
  alerts: ControlTowerAlert[];
};

export function AttentionPanel({ alerts }: Props) {
  const attention = alerts.filter((a) => a.severity !== "info");
  const hasIssues = attention.length > 0;

  return (
    <section
      aria-labelledby="attention-heading"
      className={`flex h-full flex-col rounded-[var(--radius-md)] border p-4 sm:p-5 ${
        hasIssues
          ? "border-[var(--status-warn-ring)] bg-[var(--status-warn-bg)]"
          : "border-[var(--color-line)] bg-[var(--color-surface)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-subtle)]">
            Attention
          </p>
          <h2
            id="attention-heading"
            className="mt-1 text-[15px] font-semibold tracking-tight text-[var(--color-ink)]"
          >
            {hasIssues
              ? `${attention.length} item${attention.length === 1 ? "" : "s"}`
              : "All systems operational"}
          </h2>
        </div>
        {!hasIssues && (
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--status-success-bg)] text-[var(--status-success)]"
            aria-hidden
          >
            <CheckCircle2 size={18} strokeWidth={1.75} />
          </span>
        )}
      </div>

      {!hasIssues ? (
        <div className="mt-4 flex flex-1 flex-col justify-center">
          <p className="text-sm font-medium text-[var(--status-success)]">
            ✓ No exceptions requiring attention
          </p>
          <p className="mt-2 max-w-xs text-xs leading-relaxed text-[var(--color-ink-muted)]">
            All monitored workflows are currently within expected state.
          </p>
        </div>
      ) : (
        <ul className="mt-4 flex-1 space-y-2">
          {attention.map((alert) => {
            const critical = alert.severity === "critical";
            const Icon = critical ? ShieldAlert : AlertTriangle;
            return (
              <li key={alert.code}>
                <Link
                  href={alert.href}
                  className="group flex items-start gap-3 rounded-[var(--radius-sm)] border border-transparent bg-[var(--color-surface)]/80 px-3 py-2.5 transition duration-200 hover:border-[var(--color-line)] hover:bg-[var(--color-surface)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
                >
                  <span
                    className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      critical
                        ? "bg-[var(--status-danger-bg)] text-[var(--status-danger)]"
                        : "bg-[var(--status-warn-bg)] text-[var(--status-warn)]"
                    }`}
                    aria-label={critical ? "Critical" : "Warning"}
                  >
                    <Icon size={13} strokeWidth={2} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <p className="text-sm font-medium text-[var(--color-ink)]">
                        {alert.title}
                      </p>
                      <span className="text-xs font-semibold tabular-nums text-[var(--color-ink)]">
                        {alert.count}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
                      {alert.reason}
                    </p>
                    <span className="sr-only">Severity: {alert.severity}</span>
                  </div>
                  <span
                    aria-hidden
                    className="mt-1 text-[var(--color-ink-subtle)] transition group-hover:translate-x-0.5"
                  >
                    →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
