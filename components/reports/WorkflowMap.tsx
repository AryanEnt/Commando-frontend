"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BriefcaseBusiness,
  ClipboardCheck,
  History,
  ListChecks,
  Network,
  ShieldCheck,
  UserCheck,
  UsersRound,
} from "lucide-react";
import type { ReportsOverview } from "@/lib/api";

type Props = {
  counts: ReportsOverview["counts"];
};

type NodeDef = {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  count?: number;
  countLabel?: string;
};

export function WorkflowMap({ counts }: Props) {
  const org: NodeDef = {
    key: "org",
    label: "Organization",
    href: "/organization",
    icon: Network,
  };
  const teams: NodeDef = {
    key: "teams",
    label: "Teams",
    href: "/teams",
    icon: UsersRound,
    count: counts.teams,
  };
  const ses: NodeDef = {
    key: "ses",
    label: "Sales Executives",
    href: "/profiles",
    icon: BriefcaseBusiness,
    count: counts.salesExecutives,
  };
  const commandos: NodeDef = {
    key: "commandos",
    label: "Commandos",
    href: "/users?roleCode=COMMANDO_EXECUTIVE",
    icon: UserCheck,
    count: counts.commandos,
  };
  const interventions: NodeDef = {
    key: "interventions",
    label: "Interventions",
    href: "/reports/commando-performance",
    icon: Activity,
    count: counts.interventions.active,
    countLabel: "active",
  };
  const leaf: NodeDef[] = [
    {
      key: "actions",
      label: "Actions",
      href: "/reports/commando-performance",
      icon: ListChecks,
      count: counts.overdueActions,
    },
    {
      key: "reviews",
      label: "Reviews",
      href: "/reports/commando-performance",
      icon: ClipboardCheck,
      count: counts.weeklyReviews.submitted + counts.weeklyReviews.draft,
    },
    {
      key: "monitoring",
      label: "Monitoring",
      href: "/reports/commando-performance",
      icon: ShieldCheck,
      count: counts.monitoringRecords,
    },
    {
      key: "audit",
      label: "Audit",
      href: "/audit-logs",
      icon: History,
    },
  ];

  return (
    <section
      aria-labelledby="workflow-map-heading"
      className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)]"
    >
      <div className="border-b border-[var(--color-line)] px-4 py-3.5">
        <h2
          id="workflow-map-heading"
          className="text-[15px] font-semibold tracking-tight text-[var(--color-ink)]"
        >
          Workflow map
        </h2>
        <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
          Navigate from org structure into operational records
        </p>
      </div>

      {/* Desktop graph */}
      <div className="hidden px-4 py-6 lg:block">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-0">
          <FlowNode node={org} accent />
          <Connector />
          <div className="grid w-full grid-cols-2 gap-6">
            <div className="flex flex-col items-center">
              <BranchLine />
              <FlowNode node={teams} />
            </div>
            <div className="flex flex-col items-center">
              <BranchLine />
              <FlowNode node={ses} />
            </div>
          </div>
          <Connector />
          <FlowNode node={commandos} />
          <Connector />
          <FlowNode node={interventions} accent />
          <Connector />
          <div className="grid w-full grid-cols-4 gap-3">
            {leaf.map((node) => (
              <div key={node.key} className="flex flex-col items-center">
                <BranchLine />
                <FlowNode node={node} compact />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile / tablet vertical */}
      <ol className="relative space-y-0 px-3 py-4 lg:hidden">
        {[org, teams, ses, commandos, interventions, ...leaf].map(
          (node, index, arr) => (
            <li key={node.key} className="relative flex gap-3">
              <div className="flex w-6 flex-col items-center">
                <span className="mt-3.5 h-2 w-2 rounded-full bg-[var(--color-brand)]" />
                {index < arr.length - 1 && (
                  <span className="w-px flex-1 bg-[var(--color-line-strong)]" />
                )}
              </div>
              <div className="min-w-0 flex-1 pb-2">
                <FlowNode node={node} compact fullWidth />
              </div>
            </li>
          ),
        )}
      </ol>
    </section>
  );
}

function Connector() {
  return (
    <div className="flex h-5 w-px bg-[var(--color-line-strong)]" aria-hidden />
  );
}

function BranchLine() {
  return (
    <div className="mb-0 h-4 w-px bg-[var(--color-line-strong)]" aria-hidden />
  );
}

function FlowNode({
  node,
  accent,
  compact,
  fullWidth,
}: {
  node: NodeDef;
  accent?: boolean;
  compact?: boolean;
  fullWidth?: boolean;
}) {
  const Icon = node.icon;
  return (
    <Link
      href={node.href}
      className={`group flex items-center gap-2.5 rounded-[var(--radius-sm)] border px-3 py-2.5 transition duration-200 hover:border-[var(--color-line-strong)] hover:bg-[var(--color-surface-2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] ${
        accent
          ? "border-[var(--color-brand)]/30 bg-[var(--color-brand-soft)]/50"
          : "border-[var(--color-line)] bg-[var(--color-surface)]"
      } ${compact ? "w-full" : "min-w-[10.5rem]"} ${fullWidth ? "w-full" : ""}`}
    >
      <span
        className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] ${
          accent
            ? "bg-[var(--color-brand-soft)] text-[var(--color-brand)]"
            : "bg-[var(--color-surface-2)] text-[var(--color-ink-muted)]"
        } transition group-hover:text-[var(--color-brand)]`}
        aria-hidden
      >
        <Icon size={14} strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-[var(--color-ink)]">
          {node.label}
        </p>
        {typeof node.count === "number" && (
          <p className="text-[11px] tabular-nums text-[var(--color-ink-muted)]">
            {node.count}
            {node.countLabel ? ` ${node.countLabel}` : ""}
          </p>
        )}
      </div>
    </Link>
  );
}
