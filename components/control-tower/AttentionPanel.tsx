"use client";

import Link from "next/link";
import { CheckCircle2, ChevronRight, Crosshair } from "lucide-react";
import type { ControlTowerAlert } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
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
      bar: "bg-[var(--status-danger)]",
      badge: <StatusBadge status="CRITICAL" label="Critical" />,
    };
  }
  if (severity === "warning") {
    return {
      priority: "Medium",
      bar: "bg-[var(--status-warn)]",
      badge: <StatusBadge status="NEEDS_ATTENTION" label="Warning" />,
    };
  }
  return {
    priority: "Low",
    bar: "bg-[var(--status-info)]",
    badge: <StatusBadge status="PENDING" label="Watch" />,
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
    <section
      aria-labelledby="attention-heading"
      className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]"
    >
      <div
        className={`flex flex-wrap items-start justify-between gap-3 border-b px-4 py-4 sm:px-5 ${
          hasIssues
            ? "border-[var(--status-warn-ring)] bg-gradient-to-r from-[var(--status-warn-bg)] via-[var(--status-warn-bg)]/40 to-[var(--color-surface)]"
            : "border-[var(--color-line)] bg-[var(--color-surface-2)]"
        }`}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] ${
              hasIssues
                ? "bg-[var(--status-danger-bg)] text-[var(--status-danger)] ring-1 ring-inset ring-[var(--status-danger-ring)]"
                : "bg-[var(--status-success-bg)] text-[var(--status-success)] ring-1 ring-inset ring-[var(--status-success-ring)]"
            }`}
            aria-hidden
          >
            {hasIssues ? (
              <Crosshair size={16} strokeWidth={1.75} />
            ) : (
              <CheckCircle2 size={16} strokeWidth={1.75} />
            )}
          </span>
          <div className="min-w-0">
            <h2
              id="attention-heading"
              className="text-[1.05rem] font-semibold tracking-tight text-[var(--color-ink)]"
            >
              Attention required
            </h2>
            <p className="mt-1 text-[13px] text-[var(--color-ink-muted)]">
              {hasIssues
                ? `${attentionItems.length} exception${attentionItems.length === 1 ? "" : "s"} across platform workflows${
                    criticalCount ? ` · ${criticalCount} critical` : ""
                  }`
                : "No operational exceptions in this view"}
            </p>
          </div>
        </div>
        {hasIssues ? (
          <Link
            href="/reports"
            className="text-[13px] font-medium text-[var(--color-brand)] hover:underline"
          >
            View all
          </Link>
        ) : null}
      </div>

      {!hasIssues ? (
        <div className="px-4 py-8 sm:px-5">
          <p className="text-[14px] font-medium text-[var(--status-success)]">
            All monitored workflows look healthy
          </p>
          <p className="mt-1.5 max-w-lg text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
            Referrals, interventions, actions, reviews, and support tasks have
            no open exceptions requiring Super Admin follow-up.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left">
            <thead>
              <tr className="border-b border-[var(--color-line)] bg-[var(--color-surface-2)]/70 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-ink-subtle)]">
                <th className="px-4 py-2.5 sm:px-5">Priority</th>
                <th className="px-3 py-2.5">Exception</th>
                <th className="px-3 py-2.5">Count</th>
                <th className="px-3 py-2.5">Severity</th>
                <th className="hidden px-3 py-2.5 lg:table-cell">Context</th>
                <th className="px-4 py-2.5 sm:px-5">
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-line)]">
              {attentionItems.map((alert) => {
                const meta = severityMeta(alert.severity);
                return (
                  <tr
                    key={alert.code}
                    className="group relative transition hover:bg-[var(--color-surface-2)]/70"
                  >
                    <td className="relative px-4 py-3.5 align-middle sm:px-5">
                      <span
                        className={`absolute inset-y-0 left-0 w-1 ${meta.bar}`}
                        aria-hidden
                      />
                      <span className="pl-2 text-[12px] font-semibold text-[var(--color-ink-muted)]">
                        {meta.priority}
                      </span>
                    </td>
                    <td className="max-w-[16rem] px-3 py-3.5 align-middle">
                      <p className="text-[13px] font-semibold text-[var(--color-ink)]">
                        {alert.title}
                      </p>
                      <p className="mt-0.5 text-[12px] text-[var(--color-ink-muted)] lg:hidden">
                        {alert.reason}
                      </p>
                    </td>
                    <td className="px-3 py-3.5 align-middle text-[14px] font-semibold tabular-nums text-[var(--color-ink)]">
                      {alert.count}
                    </td>
                    <td className="px-3 py-3.5 align-middle">{meta.badge}</td>
                    <td className="hidden max-w-[14rem] px-3 py-3.5 align-middle text-[12px] text-[var(--color-ink-muted)] lg:table-cell">
                      {alert.reason}
                    </td>
                    <td className="px-4 py-3.5 align-middle text-right sm:px-5">
                      <Link
                        href={alert.href}
                        className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 py-1.5 text-[12px] font-semibold text-[var(--color-ink)] shadow-[var(--shadow-sm)] transition hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
                      >
                        {attentionActionLabel(alert.severity)}
                        <ChevronRight size={13} aria-hidden />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
