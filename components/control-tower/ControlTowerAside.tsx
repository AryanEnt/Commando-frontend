"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { FileSearch, Settings2, Users, UsersRound } from "lucide-react";
import type { ControlTowerData } from "@/lib/api";
import { DashPanel } from "@/components/dashboard/DashboardKit";

type Props = {
  metrics: ControlTowerData["metrics"];
};

const QUICK_ACTIONS: Array<{
  href: string;
  label: string;
  icon: LucideIcon;
}> = [
  { href: "/users", label: "View all users", icon: Users },
  { href: "/teams", label: "Manage teams", icon: UsersRound },
  { href: "/reports", label: "View reports", icon: FileSearch },
  { href: "/configuration", label: "System configuration", icon: Settings2 },
];

function progressPct(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((part / total) * 100));
}

function PipelineBar({
  label,
  href,
  value,
  total,
  fill,
  caption,
}: {
  label: string;
  href: string;
  value: number;
  total: number;
  fill: string;
  caption: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[12.5px] font-semibold text-[var(--color-ink)]">
          {label}
        </p>
        <Link
          href={href}
          className="text-[12px] font-medium text-[var(--color-brand)] hover:underline"
        >
          Open
        </Link>
      </div>
      <p className="mt-1 text-[1.5rem] font-bold leading-none tabular-nums tracking-tight text-[var(--color-ink)]">
        {value}
      </p>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[var(--color-canvas-2)]">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${progressPct(value, Math.max(total, 1))}%`,
            background: fill,
          }}
        />
      </div>
      <p className="mt-1.5 text-[11.5px] text-[var(--color-ink-muted)]">
        {caption}
      </p>
    </div>
  );
}

export function ControlTowerAside({ metrics }: Props) {
  const interventionTotal =
    metrics.interventions.active +
    metrics.interventions.completed +
    metrics.interventions.exited;
  const referralInFlight =
    metrics.referrals.acknowledged + metrics.referrals.inProgress;

  const footprint = [
    {
      label: "Users",
      value: metrics.users.total,
      hint: `${metrics.users.active} active · ${metrics.users.inactive} inactive`,
      href: "/users",
    },
    {
      label: "Teams",
      value: metrics.teams,
      hint: "Across the organization",
      href: "/teams",
    },
    {
      label: "Sales Executives",
      value: metrics.salesExecutives,
      hint: "Active in platform",
      href: "/profiles",
    },
    {
      label: "Reviews (7d)",
      value: metrics.submittedWeeklyReviewsLast7d,
      hint: `${metrics.monitoringLast7d} monitoring records`,
      href: "/reports",
    },
  ];

  return (
    <aside className="space-y-5" aria-label="Platform summary">
      <DashPanel
        id="ct-footprint"
        title="Platform footprint"
        description="Live counts across the organization"
      >
        <div className="dash-mini-stats">
          {footprint.map((m) => (
            <Link
              key={m.label}
              href={m.href}
              className="block transition hover:bg-[var(--color-surface-2)]"
            >
              <p className="text-[1.5rem] font-bold leading-none tabular-nums tracking-tight text-[var(--color-ink)]">
                {m.value}
              </p>
              <p className="mt-2 text-[12px] font-semibold text-[var(--color-ink)]">
                {m.label}
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--color-ink-muted)]">
                {m.hint}
              </p>
            </Link>
          ))}
        </div>
      </DashPanel>

      <DashPanel
        id="ct-pipeline"
        title="Pipeline"
        description="Interventions and referrals in motion"
      >
        <div className="space-y-5 border-t border-[var(--color-line)] px-6 py-5">
          <PipelineBar
            label="Active interventions"
            href="/reports/commando-performance?status=ACTIVE"
            value={metrics.interventions.active}
            total={interventionTotal}
            fill="var(--color-accent-rose)"
            caption={`${metrics.interventions.completed} completed · ${metrics.interventions.exited} exited`}
          />
          <PipelineBar
            label="Pending referrals"
            href="/referrals?status=SUBMITTED"
            value={metrics.referrals.submitted}
            total={metrics.referrals.submitted + referralInFlight}
            fill="var(--status-warn-solid)"
            caption={`Awaiting acknowledgement · ${referralInFlight} in flight`}
          />
        </div>
      </DashPanel>

      <DashPanel id="ct-quick-actions" title="Quick actions">
        <ul className="px-3 pb-3">
          {QUICK_ACTIONS.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2.5 text-[13px] font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-brand-soft)]"
                >
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
                    <Icon size={14} strokeWidth={1.75} aria-hidden />
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </DashPanel>
    </aside>
  );
}
