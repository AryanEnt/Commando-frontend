"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type ControlTowerData } from "@/lib/api";
import { ErrorState } from "@/components/ui";
import {
  DashHero,
  DashSkeleton,
  HealthSummary,
  KpiStat,
  type SignalTone,
} from "@/components/dashboard/DashboardKit";
import {
  CommandCenter,
  ControlTowerAside,
  ControlTowerHeader,
  GovernanceHub,
  RecentActivity,
  WorkflowHealth,
  buildWorkflowRows,
} from "@/components/control-tower";

type LoadState = "loading" | "ready" | "error";

export function SuperAdminControlTower({ token }: { token: string }) {
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [tower, setTower] = useState<ControlTowerData | null>(null);
  const [loadedAt, setLoadedAt] = useState(() => Date.now());
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (opts?: { soft?: boolean }) => {
      if (opts?.soft) setRefreshing(true);
      else {
        setState("loading");
        setError(null);
      }
      try {
        const res = await api.getControlTower(token);
        setTower(res.data);
        setLoadedAt(Date.now());
        setState("ready");
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "We couldn't load the control tower. Please try again.",
        );
        setState((prev) => {
          if (opts?.soft && prev === "ready") return "ready";
          return "error";
        });
      } finally {
        setRefreshing(false);
      }
    },
    [token],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const workflowRows = tower ? buildWorkflowRows(tower) : [];
  const healthyWorkflows = workflowRows.filter(
    (r) => r.status === "Healthy",
  ).length;
  const visibleAlerts =
    tower?.alerts.filter((a) => a.code !== "INACTIVE_USERS") ?? [];
  const criticalAlerts = visibleAlerts.filter(
    (a) => a.severity === "critical",
  ).length;

  const kpis: {
    label: string;
    value: number;
    hint: string;
    href: string;
    tone: SignalTone;
  }[] = tower
    ? [
        {
          label: "Open exceptions",
          value: visibleAlerts.length,
          hint: criticalAlerts
            ? `${criticalAlerts} critical`
            : visibleAlerts.length
              ? "None critical"
              : "Nothing in the priority queue",
          href: "#ct-attention",
          tone: criticalAlerts
            ? "critical"
            : visibleAlerts.length
              ? "warning"
              : "neutral",
        },
        {
          label: "Overdue actions",
          value: tower.metrics.overdueActionItems,
          hint: tower.metrics.overdueSupportTasks
            ? `${tower.metrics.overdueSupportTasks} support tasks also overdue`
            : "Open assignments past due",
          href: "#ct-overdue-actions",
          tone: tower.metrics.overdueActionItems > 0 ? "critical" : "neutral",
        },
        {
          label: "Pending referrals",
          value: tower.metrics.referrals.submitted,
          hint: "Awaiting acknowledgement",
          href: "/referrals?status=SUBMITTED",
          tone: tower.metrics.referrals.submitted > 0 ? "info" : "neutral",
        },
        {
          label: "Active interventions",
          value: tower.metrics.interventions.active,
          hint: `${tower.metrics.interventions.completed} completed · ${tower.metrics.interventions.exited} exited`,
          href: "/reports/commando-performance?status=ACTIVE",
          tone: "neutral",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <ControlTowerHeader
        generatedAt={tower?.generatedAt}
        loadedAt={loadedAt}
        refreshing={refreshing}
        loading={state === "loading"}
        onRefresh={() => void load({ soft: true })}
      />

      {state === "loading" && <DashSkeleton label="Loading control tower" />}

      {state === "error" && error && (
        <ErrorState message={error} onRetry={() => void load()} />
      )}

      {state === "ready" && tower && (
        <>
          {error && (
            <ErrorState
              message={error}
              onRetry={() => void load({ soft: true })}
            />
          )}

          <DashHero
            anchor={
              <HealthSummary
                title="Workflow health"
                healthy={healthyWorkflows}
                attention={workflowRows.length - healthyWorkflows}
                healthyLabel="Healthy"
                attentionLabel="Attention or watch"
                emptyText="No workflows tracked"
              />
            }
          >
            {kpis.map((kpi) => (
              <KpiStat key={kpi.label} {...kpi} />
            ))}
          </DashHero>

          <div className="grid gap-5 xl:grid-cols-12 xl:items-start">
            <div className="min-w-0 space-y-5 xl:col-span-8">
              <CommandCenter
                alerts={tower.alerts}
                attention={tower.attention}
                metrics={tower.metrics}
                workflowRows={workflowRows}
              />
              <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
                <WorkflowHealth rows={workflowRows} />
                <RecentActivity items={tower.recentActivity ?? []} />
              </div>
            </div>
            <div className="xl:col-span-4">
              <ControlTowerAside metrics={tower.metrics} />
            </div>
          </div>

          <GovernanceHub />
        </>
      )}
    </div>
  );
}
