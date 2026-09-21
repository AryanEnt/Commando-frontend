"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  BriefcaseBusiness,
  Flag,
  Inbox,
  Users,
  UsersRound,
} from "lucide-react";
import type { ControlTowerData } from "@/lib/api";

type Props = {
  metrics: ControlTowerData["metrics"];
};

type KpiTone = "success" | "info" | "brand" | "danger" | "warn";

type Kpi = {
  key: string;
  label: string;
  href: string;
  value: number;
  hint: string;
  icon: LucideIcon;
  iconClass: string;
  tone: KpiTone;
};

const TINT: Record<KpiTone, string> = {
  success: "kpi-lime",
  info: "kpi-blue",
  brand: "kpi-mint",
  danger: "kpi-rose",
  warn: "kpi-amber",
};

function buildKpis(metrics: ControlTowerData["metrics"]): Kpi[] {
  return [
    {
      key: "users",
      label: "Total Users",
      href: "/users",
      value: metrics.users.total,
      hint: `${metrics.users.active} active · ${metrics.users.inactive} inactive`,
      icon: Users,
      tone: "success",
      iconClass:
        "bg-[var(--status-success-bg)] text-[var(--status-success)] ring-[var(--status-success-ring)]",
    },
    {
      key: "teams",
      label: "Teams",
      href: "/teams",
      value: metrics.teams,
      hint: "Across the organization",
      icon: UsersRound,
      tone: "info",
      iconClass:
        "bg-[var(--status-info-bg)] text-[var(--status-info)] ring-[var(--status-info-ring)]",
    },
    {
      key: "ses",
      label: "Sales Executives",
      href: "/profiles",
      value: metrics.salesExecutives,
      hint: "Active in platform",
      icon: BriefcaseBusiness,
      tone: "brand",
      iconClass:
        "bg-[var(--color-brand-soft)] text-[var(--color-brand)] ring-[var(--color-brand-ring)]",
    },
    {
      key: "interventions",
      label: "Active Interventions",
      href: "/reports/commando-performance?status=ACTIVE",
      value: metrics.interventions.active,
      hint: `${metrics.interventions.completed} completed · ${metrics.interventions.exited} exited`,
      icon: Flag,
      tone: "brand",
      iconClass:
        "bg-[var(--color-brand-soft)] text-[var(--color-brand)] ring-[var(--color-brand-ring)]",
    },
    {
      key: "referrals",
      label: "Pending Referrals",
      href: "/referrals?status=SUBMITTED",
      value: metrics.referrals.submitted,
      hint: "Awaiting acknowledgement",
      icon: Inbox,
      tone: "warn",
      iconClass:
        "bg-[var(--status-warn-bg)] text-[var(--status-warn)] ring-[var(--status-warn-ring)]",
    },
  ];
}

export function PlatformKpiStrip({ metrics }: Props) {
  const kpis = buildKpis(metrics);

  return (
    <section aria-label="Platform metrics">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={kpi.key}
              href={kpi.href}
              className={`kpi-card ${TINT[kpi.tone]} focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]`}
            >
              <div className="flex items-start gap-3 pl-1">
                <span
                  className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] ring-1 ring-inset ${kpi.iconClass}`}
                  aria-hidden
                >
                  <Icon size={18} strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-eyebrow">{kpi.label}</p>
                  <p className="mt-1 text-kpi">{kpi.value}</p>
                  <p className="mt-1 text-meta">{kpi.hint}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
