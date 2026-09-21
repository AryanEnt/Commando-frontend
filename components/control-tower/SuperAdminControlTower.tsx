"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type ControlTowerData } from "@/lib/api";
import { ErrorState } from "@/components/ui";
import {
  CommandCenter,
  ControlTowerAside,
  ControlTowerHeader,
  ControlTowerSkeleton,
  GovernanceHub,
  PlatformKpiStrip,
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
  const visibleAlerts =
    tower?.alerts.filter((a) => a.code !== "INACTIVE_USERS") ?? [];
  const hasCritical = visibleAlerts.some((a) => a.severity === "critical");

  return (
    <div className="space-y-5 lg:space-y-6">
      <ControlTowerHeader
        generatedAt={tower?.generatedAt}
        loadedAt={loadedAt}
        refreshing={refreshing}
        loading={state === "loading"}
        onRefresh={() => void load({ soft: true })}
      />

      {state === "loading" && <ControlTowerSkeleton />}

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

          <PlatformKpiStrip metrics={tower.metrics} />

          <div className="grid gap-4 xl:grid-cols-12 xl:items-start">
            <div className="min-w-0 space-y-4 xl:col-span-8">
              <CommandCenter
                alerts={tower.alerts}
                attention={tower.attention}
                metrics={tower.metrics}
                workflowRows={workflowRows}
              />
              <div className="grid gap-4 lg:grid-cols-2">
                <WorkflowHealth rows={workflowRows} />
                <RecentActivity items={tower.recentActivity ?? []} />
              </div>
            </div>
            <div className="xl:col-span-4">
              <ControlTowerAside
                metrics={tower.metrics}
                alertCount={visibleAlerts.length}
                hasCritical={hasCritical}
              />
            </div>
          </div>

          <GovernanceHub />
        </>
      )}
    </div>
  );
}
