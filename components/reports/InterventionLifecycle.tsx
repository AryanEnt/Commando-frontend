"use client";

import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import type { ReportsOverview } from "@/lib/api";

type Props = {
  counts: ReportsOverview["counts"];
};

const STAGES = [
  {
    key: "referrals",
    label: "Referrals",
    hint: "Entry queue",
    href: "/referrals?status=SUBMITTED",
    getValue: (c: ReportsOverview["counts"]) => c.pendingReferrals,
    tone: "info" as const,
  },
  {
    key: "active",
    label: "Active",
    hint: "In progress",
    href: "/reports/commando-performance?status=ACTIVE",
    getValue: (c: ReportsOverview["counts"]) => c.interventions.active,
    tone: "brand" as const,
  },
  {
    key: "completed",
    label: "Completed",
    hint: "Closed successfully",
    href: "/reports/commando-performance?status=COMPLETED",
    getValue: (c: ReportsOverview["counts"]) => c.interventions.completed,
    tone: "success" as const,
  },
  {
    key: "exited",
    label: "Exited",
    hint: "Ended early",
    href: "/reports/commando-performance?status=EXITED",
    getValue: (c: ReportsOverview["counts"]) => c.interventions.exited,
    tone: "neutral" as const,
  },
] as const;

function stageClasses(tone: (typeof STAGES)[number]["tone"], hasCount: boolean) {
  if (!hasCount) {
    return {
      ring: "border-[var(--color-line)]",
      badge: "bg-[var(--color-surface-2)] text-[var(--color-ink-subtle)]",
      value: "text-[var(--color-ink-subtle)]",
    };
  }
  switch (tone) {
    case "brand":
      return {
        ring: "border-[var(--color-brand)]/35",
        badge: "bg-[var(--color-brand-soft)] text-[var(--color-brand)]",
        value: "text-[var(--color-ink)]",
      };
    case "success":
      return {
        ring: "border-[var(--status-success-ring)]",
        badge: "bg-[var(--status-success-bg)] text-[var(--status-success)]",
        value: "text-[var(--color-ink)]",
      };
    case "info":
      return {
        ring: "border-[var(--status-info-ring)]",
        badge: "bg-[var(--status-info-bg)] text-[var(--status-info)]",
        value: "text-[var(--color-ink)]",
      };
    default:
      return {
        ring: "border-[var(--color-line-strong)]",
        badge: "bg-[var(--status-neutral-bg)] text-[var(--status-neutral)]",
        value: "text-[var(--color-ink)]",
      };
  }
}

export function InterventionLifecycle({ counts }: Props) {
  const totalInterventions =
    counts.interventions.active +
    counts.interventions.completed +
    counts.interventions.exited;

  return (
    <section
      aria-labelledby="lifecycle-heading"
      className="flex h-full flex-col rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)]"
    >
      <div className="flex items-start justify-between gap-3 border-b border-[var(--color-line)] px-4 py-3.5">
        <div>
          <h2
            id="lifecycle-heading"
            className="text-[15px] font-semibold tracking-tight text-[var(--color-ink)]"
          >
            Intervention lifecycle
          </h2>
          <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
            Current stage counts across the organization — not conversion rates.
          </p>
        </div>
        <p className="shrink-0 text-xs tabular-nums text-[var(--color-ink-subtle)]">
          {totalInterventions} assignment
          {totalInterventions === 1 ? "" : "s"}
        </p>
      </div>

      <div className="flex flex-1 flex-col justify-center px-3 py-5 sm:px-4">
        {/* Desktop: horizontal */}
        <ol className="hidden items-stretch md:flex">
          {STAGES.map((stage, index) => {
            const value = stage.getValue(counts);
            const styles = stageClasses(stage.tone, value > 0);
            return (
              <li key={stage.key} className="flex min-w-0 flex-1 items-center">
                <Link
                  href={stage.href}
                  className={`group relative flex w-full flex-col rounded-[var(--radius-md)] border bg-[var(--color-surface)] px-3 py-3.5 transition duration-200 hover:bg-[var(--color-surface-2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] ${styles.ring}`}
                >
                  <span
                    className={`inline-flex w-fit rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${styles.badge}`}
                  >
                    {stage.label}
                  </span>
                  <span
                    className={`mt-2 text-[1.85rem] font-semibold tabular-nums leading-none tracking-tight ${styles.value}`}
                  >
                    {value}
                  </span>
                  <span className="mt-2 flex items-center justify-between gap-2 text-[11px] text-[var(--color-ink-muted)]">
                    {stage.hint}
                    <ChevronRight
                      size={14}
                      className="opacity-0 transition duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
                      aria-hidden
                    />
                  </span>
                </Link>
                {index < STAGES.length - 1 && (
                  <span
                    className="mx-1.5 flex shrink-0 text-[var(--color-ink-subtle)]"
                    aria-hidden
                  >
                    <ArrowRight size={16} strokeWidth={1.5} />
                  </span>
                )}
              </li>
            );
          })}
        </ol>

        {/* Mobile: vertical */}
        <ol className="flex flex-col gap-0 md:hidden">
          {STAGES.map((stage, index) => {
            const value = stage.getValue(counts);
            const styles = stageClasses(stage.tone, value > 0);
            return (
              <li key={stage.key} className="flex flex-col items-stretch">
                <Link
                  href={stage.href}
                  className={`group flex items-center gap-3 rounded-[var(--radius-md)] border bg-[var(--color-surface)] px-3.5 py-3 transition duration-200 hover:bg-[var(--color-surface-2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] ${styles.ring}`}
                >
                  <div className="min-w-0 flex-1">
                    <span
                      className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${styles.badge}`}
                    >
                      {stage.label}
                    </span>
                    <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                      {stage.hint}
                    </p>
                  </div>
                  <span
                    className={`text-[1.65rem] font-semibold tabular-nums leading-none ${styles.value}`}
                  >
                    {value}
                  </span>
                  <ChevronRight
                    size={16}
                    className="text-[var(--color-ink-subtle)] transition group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
                {index < STAGES.length - 1 && (
                  <div
                    className="flex justify-center py-1 text-[var(--color-ink-subtle)]"
                    aria-hidden
                  >
                    <span className="h-4 w-px bg-[var(--color-line-strong)]" />
                  </div>
                )}
              </li>
            );
          })}
        </ol>

        {totalInterventions === 0 && counts.pendingReferrals === 0 && (
          <p className="mt-4 text-center text-xs text-[var(--color-ink-muted)] md:mt-5">
            No active intervention workflows requiring supervision.
          </p>
        )}
      </div>
    </section>
  );
}
