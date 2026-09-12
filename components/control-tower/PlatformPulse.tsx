"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BriefcaseBusiness,
  Users,
  UsersRound,
} from "lucide-react";
import type { ControlTowerData } from "@/lib/api";

type MetricBlockProps = {
  label: string;
  value: ReactNode;
  hint: string;
  href: string;
  icon: LucideIcon;
  size?: "hero" | "standard" | "compact";
  accent?: "brand" | "neutral" | "info";
};

export function MetricBlock({
  label,
  value,
  hint,
  href,
  icon: Icon,
  size = "standard",
  accent = "neutral",
}: MetricBlockProps) {
  const iconWrap =
    accent === "brand"
      ? "bg-[var(--color-brand-soft)] text-[var(--color-brand)]"
      : accent === "info"
        ? "bg-[var(--status-info-bg)] text-[var(--status-info)]"
        : "bg-[var(--color-surface-2)] text-[var(--color-ink-muted)]";

  const valueClass =
    size === "hero"
      ? "text-[2.25rem] leading-none tracking-tight sm:text-[2.5rem]"
      : size === "compact"
        ? "text-[1.5rem] leading-none tracking-tight"
        : "text-[1.75rem] leading-none tracking-tight";

  return (
    <Link
      href={href}
      className="group relative flex h-full flex-col justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-4 transition duration-200 hover:border-[var(--color-line-strong)] hover:bg-[var(--color-surface-2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-subtle)]">
          {label}
        </p>
        <span
          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] ${iconWrap}`}
          aria-hidden
        >
          <Icon size={16} strokeWidth={1.75} />
        </span>
      </div>
      <div>
        <p
          className={`font-semibold tabular-nums text-[var(--color-ink)] ${valueClass}`}
        >
          {value}
        </p>
        <p className="mt-2 text-xs text-[var(--color-ink-muted)]">{hint}</p>
      </div>
    </Link>
  );
}

type Props = {
  metrics: ControlTowerData["metrics"];
};

export function PlatformPulse({ metrics }: Props) {
  const activeShare =
    metrics.users.total > 0
      ? Math.round((metrics.users.active / metrics.users.total) * 100)
      : 0;

  return (
    <section aria-labelledby="platform-pulse-heading">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2
            id="platform-pulse-heading"
            className="text-[15px] font-semibold tracking-tight text-[var(--color-ink)]"
          >
            Platform pulse
          </h2>
          <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
            Live footprint across people and interventions
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-12 lg:grid-rows-2">
        <div className="col-span-2 row-span-2 lg:col-span-5">
          <MetricBlock
            label="Users"
            value={metrics.users.total}
            hint={`${metrics.users.active} active · ${activeShare}% of directory`}
            href="/users"
            icon={Users}
            size="hero"
            accent="brand"
          />
        </div>
        <div className="lg:col-span-3">
          <MetricBlock
            label="Teams"
            value={metrics.teams}
            hint={`${metrics.teams} active`}
            href="/teams"
            icon={UsersRound}
            size="standard"
          />
        </div>
        <div className="lg:col-span-4">
          <MetricBlock
            label="Sales Executives"
            value={metrics.salesExecutives}
            hint="Under supervision"
            href="/profiles"
            icon={BriefcaseBusiness}
            size="standard"
            accent="info"
          />
        </div>
        <div className="col-span-2 lg:col-span-7">
          <Link
            href="/reports/commando-performance?status=ACTIVE"
            className="group flex h-full items-stretch gap-4 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-4 transition duration-200 hover:border-[var(--color-line-strong)] hover:bg-[var(--color-surface-2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
          >
            <span
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]"
              aria-hidden
            >
              <Activity size={16} strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-subtle)]">
                Interventions
              </p>
              <div className="mt-2 flex flex-wrap items-end gap-x-6 gap-y-2">
                <div>
                  <p className="text-[1.75rem] font-semibold tabular-nums leading-none text-[var(--color-ink)]">
                    {metrics.interventions.active}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                    active now
                  </p>
                </div>
                <div className="h-8 w-px bg-[var(--color-line)]" aria-hidden />
                <div>
                  <p className="text-lg font-semibold tabular-nums leading-none text-[var(--color-ink)]">
                    {metrics.interventions.completed}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                    completed
                  </p>
                </div>
                {metrics.interventions.exited > 0 && (
                  <div>
                    <p className="text-lg font-semibold tabular-nums leading-none text-[var(--color-ink-muted)]">
                      {metrics.interventions.exited}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                      exited
                    </p>
                  </div>
                )}
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--color-canvas-2)]">
                {(() => {
                  const total =
                    metrics.interventions.active +
                    metrics.interventions.completed +
                    metrics.interventions.exited;
                  if (total === 0) {
                    return (
                      <div className="h-full w-full bg-[var(--color-line)]" />
                    );
                  }
                  const activePct =
                    (metrics.interventions.active / total) * 100;
                  const completedPct =
                    (metrics.interventions.completed / total) * 100;
                  return (
                    <div className="flex h-full w-full">
                      <div
                        className="bg-[var(--color-brand)]"
                        style={{ width: `${activePct}%` }}
                        title={`${metrics.interventions.active} active`}
                      />
                      <div
                        className="bg-[var(--status-info)]"
                        style={{ width: `${completedPct}%` }}
                        title={`${metrics.interventions.completed} completed`}
                      />
                      <div
                        className="bg-[var(--color-line-strong)]"
                        style={{ width: `${100 - activePct - completedPct}%` }}
                        title={`${metrics.interventions.exited} exited`}
                      />
                    </div>
                  );
                })()}
              </div>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
