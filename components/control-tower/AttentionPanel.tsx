"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import type { ControlTowerAlert } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { ButtonLink } from "@/components/ui";
import { DashEmpty, DashPanel } from "@/components/dashboard/DashboardKit";
import { attentionActionLabel } from "./utils";

type Props = {
  alerts: ControlTowerAlert[];
  /** Optional filter applied by command-center tabs. */
  filterCodes?: string[] | null;
};

function severityMeta(severity: ControlTowerAlert["severity"]) {
  if (severity === "critical") {
    return {
      priority: "High",
      signal: "critical",
      badge: <StatusBadge status="CRITICAL" label="Critical" />,
    };
  }
  if (severity === "warning") {
    return {
      priority: "Medium",
      signal: "warning",
      badge: <StatusBadge status="NEEDS_ATTENTION" label="Warning" />,
    };
  }
  return {
    priority: "Low",
    signal: "info",
    badge: <StatusBadge status="WATCH" label="Watch" />,
  };
}

export function AttentionPanel({ alerts, filterCodes = null }: Props) {
  const base = alerts.filter((a) => a.code !== "INACTIVE_USERS");
  const attentionItems =
    filterCodes == null
      ? base
      : base.filter((a) => filterCodes.includes(a.code));
  const hasIssues = attentionItems.length > 0;
  const criticalCount = attentionItems.filter(
    (a) => a.severity === "critical",
  ).length;

  return (
    <DashPanel
      id="ct-attention"
      tone={hasIssues ? "warn" : "plain"}
      title="Attention required"
      description={
        hasIssues
          ? `${attentionItems.length} exception${attentionItems.length === 1 ? "" : "s"} across platform workflows${
              criticalCount ? ` · ${criticalCount} critical` : ""
            }`
          : "No operational exceptions in this view"
      }
      aside={
        hasIssues ? (
          <Link
            href="/reports"
            className="text-[13px] font-medium text-[var(--color-brand)] hover:underline"
          >
            View all
          </Link>
        ) : (
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--status-success-bg)] text-[var(--status-success)]"
            aria-hidden
          >
            <CheckCircle2 size={18} />
          </span>
        )
      }
    >
      {!hasIssues ? (
        <DashEmpty
          tone="positive"
          title="All monitored workflows look healthy"
          description="Referrals, interventions, actions, reviews, and support tasks have no open exceptions requiring Super Admin follow-up."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="dash-table w-full min-w-[40rem] text-left text-[13px]">
            <thead>
              <tr>
                <th>Priority</th>
                <th>Exception</th>
                <th>Count</th>
                <th>Severity</th>
                <th className="hidden lg:table-cell">Context</th>
                <th>
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {attentionItems.map((alert) => {
                const meta = severityMeta(alert.severity);
                return (
                  <tr key={alert.code} data-signal={meta.signal}>
                    <td className="text-[12px] font-semibold text-[var(--color-ink-muted)]">
                      {meta.priority}
                    </td>
                    <td className="max-w-[16rem]">
                      <p className="font-semibold text-[var(--color-ink)]">
                        {alert.title}
                      </p>
                      <p className="mt-0.5 text-meta lg:hidden">
                        {alert.reason}
                      </p>
                    </td>
                    <td className="text-[15px] font-semibold tabular-nums text-[var(--color-ink)]">
                      {alert.count}
                    </td>
                    <td>{meta.badge}</td>
                    <td className="hidden max-w-[14rem] text-meta lg:table-cell">
                      {alert.reason}
                    </td>
                    <td className="text-right">
                      <ButtonLink
                        href={alert.href}
                        variant="outline"
                        size="sm"
                        className="whitespace-nowrap"
                      >
                        {attentionActionLabel(alert.severity)}
                      </ButtonLink>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </DashPanel>
  );
}
