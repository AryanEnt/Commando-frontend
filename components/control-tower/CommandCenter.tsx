"use client";

import { useMemo, useState } from "react";
import type { ControlTowerAlert, ControlTowerData } from "@/lib/api";
import { AttentionPanel } from "./AttentionPanel";
import { AwaitingAcknowledgement } from "./AwaitingAcknowledgement";
import { OverdueActionsPanel } from "./OverdueActionsPanel";
import type { WorkflowRow } from "./utils";
import { WorkflowHealth } from "./WorkflowHealth";

type TabId = "priority" | "requests" | "interventions" | "overdue";

type Props = {
  alerts: ControlTowerAlert[];
  attention: ControlTowerData["attention"];
  metrics: ControlTowerData["metrics"];
  workflowRows: WorkflowRow[];
};

const REQUEST_CODES = [
  "REFERRAL_NO_ASSIGNMENT",
  "REFERRALS_AWAITING_ACK",
];
const INTERVENTION_CODES = ["REFERRAL_NO_ASSIGNMENT"];
const OVERDUE_CODES = ["ACTIONS_OVERDUE", "SUPPORT_TASKS_OVERDUE"];

export function CommandCenter({
  alerts,
  attention,
  metrics,
  workflowRows,
}: Props) {
  const [tab, setTab] = useState<TabId>("priority");

  const visibleAlerts = useMemo(
    () => alerts.filter((a) => a.code !== "INACTIVE_USERS"),
    [alerts],
  );

  const tabs: Array<{ id: TabId; label: string; count?: number }> = [
    {
      id: "priority",
      label: "Priority Queue",
      count: visibleAlerts.length || undefined,
    },
    {
      id: "requests",
      label: "All Requests",
      count: metrics.referrals.submitted || undefined,
    },
    {
      id: "interventions",
      label: "Interventions",
      count: metrics.interventions.active || undefined,
    },
    {
      id: "overdue",
      label: "Overdue Actions",
      count: metrics.overdueActionItems || undefined,
    },
  ];

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Control tower queues"
        className="flex gap-1 overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-1 shadow-[var(--shadow-sm)]"
      >
        {tabs.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(item.id)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-2 text-[13px] font-medium transition ${
                active
                  ? "bg-[var(--color-brand)] text-white shadow-[var(--shadow-sm)]"
                  : "text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
              }`}
            >
              {item.label}
              {item.count != null && item.count > 0 ? (
                <span
                  className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums ${
                    active
                      ? "bg-white/20 text-white"
                      : "bg-[var(--color-canvas-2)] text-[var(--color-ink-muted)]"
                  }`}
                >
                  {item.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {tab === "priority" ? (
        <div className="space-y-4">
          <AttentionPanel alerts={alerts} />
          <AwaitingAcknowledgement
            pendingReferrals={attention.pendingReferrals}
          />
          <OverdueActionsPanel overdueActions={attention.overdueActions} />
        </div>
      ) : null}

      {tab === "requests" ? (
        <div className="space-y-4">
          <AttentionPanel alerts={alerts} filterCodes={REQUEST_CODES} />
          <AwaitingAcknowledgement
            pendingReferrals={attention.pendingReferrals}
          />
        </div>
      ) : null}

      {tab === "interventions" ? (
        <div className="space-y-4">
          <AttentionPanel alerts={alerts} filterCodes={INTERVENTION_CODES} />
          <WorkflowHealth
            rows={workflowRows.filter(
              (r) =>
                r.category === "interventions" || r.category === "requests",
            )}
          />
        </div>
      ) : null}

      {tab === "overdue" ? (
        <div className="space-y-4">
          <AttentionPanel alerts={alerts} filterCodes={OVERDUE_CODES} />
          <OverdueActionsPanel overdueActions={attention.overdueActions} />
        </div>
      ) : null}
    </div>
  );
}
