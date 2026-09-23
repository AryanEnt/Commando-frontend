"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ChevronRight,
  FileSearch,
  Lightbulb,
  Settings2,
  ShieldCheck,
  Users,
  UsersRound,
} from "lucide-react";
import type { ControlTowerData } from "@/lib/api";

type Props = {
  metrics: ControlTowerData["metrics"];
  alertCount: number;
  hasCritical: boolean;
};

const QUICK_ACTIONS: Array<{
  href: string;
  label: string;
  icon: LucideIcon;
}> = [
  { href: "/users", label: "View All Users", icon: Users },
  { href: "/teams", label: "Manage Teams", icon: UsersRound },
  { href: "/reports", label: "View Reports", icon: FileSearch },
  { href: "/configuration", label: "System Configuration", icon: Settings2 },
];

function progressPct(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((part / total) * 100));
}

export function ControlTowerAside({
  metrics,
  alertCount,
  hasCritical,
}: Props) {
  const interventionTotal =
    metrics.interventions.active +
    metrics.interventions.completed +
    metrics.interventions.exited;
  const referralPending = metrics.referrals.submitted;
  const referralPipeline =
    metrics.referrals.submitted +
    metrics.referrals.acknowledged +
    metrics.referrals.inProgress;
  const healthy = alertCount === 0;

  return (
    <aside className="space-y-3" aria-label="Platform summary">
      {/* System Health — top of secondary column */}
      <section
        className={`rounded-[var(--radius-md)] border p-4 shadow-[var(--shadow-sm)] ${
          healthy
            ? "border-[var(--status-success-ring)] bg-[var(--status-success-bg)]"
            : hasCritical
              ? "border-[var(--status-danger-ring)] bg-[var(--status-danger-bg)]"
              : "border-[var(--status-warn-ring)] bg-[var(--status-warn-bg)]"
        }`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-white/70 ring-1 ring-inset ${
              healthy
                ? "text-[var(--status-success)] ring-[var(--status-success-ring)]"
                : hasCritical
                  ? "text-[var(--status-danger)] ring-[var(--status-danger-ring)]"
                  : "text-[var(--status-warn)] ring-[var(--status-warn-ring)]"
            }`}
            aria-hidden
          >
            <ShieldCheck size={16} strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-[14px] font-semibold text-[var(--color-ink)]">
                {healthy
                  ? "System Healthy"
                  : hasCritical
                    ? "Critical exceptions"
                    : "Needs attention"}
              </p>
              <span
                className={`h-2 w-2 rounded-full ${
                  healthy
                    ? "bg-[var(--status-success)]"
                    : hasCritical
                      ? "bg-[var(--status-danger)]"
                      : "bg-[var(--status-warn)]"
                }`}
                aria-hidden
              />
            </div>
            <p className="mt-1 text-[12px] leading-snug text-[var(--color-ink-muted)]">
              {healthy
                ? "All core modules running"
                : `${alertCount} exception${alertCount === 1 ? "" : "s"} in the priority queue`}
            </p>
          </div>
        </div>
      </section>

      {/* Dark platform pulse */}
      <section className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[14px] font-semibold tracking-tight text-[var(--color-ink)]">
              Platform Pulse
            </h2>
            <p className="mt-0.5 text-[11px] text-[var(--color-ink-muted)]">
              Live footprint
            </p>
          </div>
          <MetricBars
            values={[
              metrics.users.total,
              metrics.teams,
              metrics.salesExecutives,
            ]}
          />
        </div>
        <ul className="mt-4 space-y-2.5">
          <PulseRow
            label="Users"
            value={metrics.users.total}
            tone="bg-[var(--color-accent)]"
          />
          <PulseRow
            label="Teams"
            value={metrics.teams}
            tone="bg-[var(--status-info)]"
          />
          <PulseRow
            label="Sales Executives"
            value={metrics.salesExecutives}
            tone="bg-[var(--color-brand)]"
          />
        </ul>
      </section>

      <section className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[13px] font-semibold text-[var(--color-ink)]">
            Active Interventions
          </h2>
          <Link
            href="/reports/commando-performance?status=ACTIVE"
            className="text-[12px] font-medium text-[var(--color-brand)] hover:underline"
          >
            Open
          </Link>
        </div>
        <p className="mt-2 text-[1.75rem] font-semibold tabular-nums tracking-tight text-[var(--color-ink)]">
          {metrics.interventions.active}
        </p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--color-canvas-2)]">
          <div
            className="h-full rounded-full bg-[var(--color-brand)] transition-all"
            style={{
              width: `${progressPct(metrics.interventions.active, Math.max(interventionTotal, 1))}%`,
            }}
          />
        </div>
        <p className="mt-2 text-[12px] text-[var(--color-ink-muted)]">
          {metrics.interventions.active} active ·{" "}
          {metrics.interventions.completed} completed ·{" "}
          {metrics.interventions.exited} exited
        </p>
      </section>

      <section className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[13px] font-semibold text-[var(--color-ink)]">
            Pending Referrals
          </h2>
          <Link
            href="/referrals?status=SUBMITTED"
            className="text-[12px] font-medium text-[var(--color-brand)] hover:underline"
          >
            Open
          </Link>
        </div>
        <p className="mt-2 text-[1.75rem] font-semibold tabular-nums tracking-tight text-[var(--color-ink)]">
          {referralPending}
        </p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--color-canvas-2)]">
          <div
            className="h-full rounded-full bg-[var(--status-warn)] transition-all"
            style={{
              width: `${progressPct(referralPending, Math.max(referralPipeline, 1))}%`,
            }}
          />
        </div>
        <p className="mt-2 text-[12px] text-[var(--color-ink-muted)]">
          Awaiting acknowledgement ·{" "}
          {metrics.referrals.acknowledged + metrics.referrals.inProgress} in
          flight
        </p>
      </section>

      <section className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-sm)]">
        <h2 className="px-1 pb-2 text-[13px] font-semibold text-[var(--color-ink)]">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_ACTIONS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex flex-col gap-2 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface-2)]/70 px-3 py-3 transition hover:border-[var(--color-line-strong)] hover:bg-[var(--color-surface)] hover:shadow-[var(--shadow-sm)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-canvas-2)] text-[var(--color-ink-muted)] transition group-hover:bg-[var(--color-brand-soft)] group-hover:text-[var(--color-brand)]">
                  <Icon size={14} strokeWidth={1.75} aria-hidden />
                </span>
                <span className="flex items-center justify-between gap-1">
                  <span className="text-[12px] font-medium leading-snug text-[var(--color-ink)]">
                    {item.label}
                  </span>
                  <ChevronRight
                    size={12}
                    className="shrink-0 text-[var(--color-ink-subtle)]"
                    aria-hidden
                  />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section
        className={`rounded-[var(--radius-md)] border p-4 ${
          healthy
            ? "border-[var(--status-success-ring)] bg-[var(--status-success-bg)]"
            : "border-[var(--status-warn-ring)] bg-[var(--status-warn-bg)]"
        }`}
      >
        <div className="flex items-start gap-2.5">
          <Lightbulb
            size={16}
            className={
              healthy
                ? "mt-0.5 shrink-0 text-[var(--status-success)]"
                : "mt-0.5 shrink-0 text-[var(--status-warn)]"
            }
            aria-hidden
          />
          <div>
            <p className="text-[13px] font-semibold text-[var(--color-ink)]">
              {healthy ? "Tower tip" : "Focus first"}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
              {healthy
                ? "Use the priority queue and Platform Pulse to spot exceptions before they become intervention debt."
                : "Start with critical exceptions, then clear awaiting acknowledgements and overdue actions."}
            </p>
          </div>
        </div>
      </section>
    </aside>
  );
}

function PulseRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <li className="flex items-center justify-between gap-3 text-[13px]">
      <span className="inline-flex items-center gap-2 text-[var(--color-ink-muted)]">
        <span className={`h-1.5 w-1.5 rounded-full ${tone}`} aria-hidden />
        {label}
      </span>
      <span className="font-semibold tabular-nums text-[var(--color-ink)]">{value}</span>
    </li>
  );
}

function MetricBars({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-7 items-end gap-1" aria-hidden>
      {values.map((v, i) => (
        <span
          key={i}
          className="w-1.5 rounded-sm bg-[var(--color-accent)]/80"
          style={{ height: `${Math.max(18, Math.round((v / max) * 100))}%` }}
        />
      ))}
    </div>
  );
}
