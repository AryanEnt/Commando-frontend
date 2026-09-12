"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type ControlTowerData } from "@/lib/api";
import { ErrorState } from "@/components/ui";
import {
  AttentionPanel,
  ControlTowerHeader,
  ControlTowerSkeleton,
  GovernanceHub,
  OperationsPulse,
  PlatformPulse,
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

  return (
    <div className="space-y-6 lg:space-y-7">
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

          <PlatformPulse metrics={tower.metrics} />

          <div className="grid gap-3 lg:grid-cols-12 lg:items-stretch">
            <div className="lg:col-span-7">
              <OperationsPulse metrics={tower.metrics} rows={workflowRows} />
            </div>
            <div className="lg:col-span-5">
              <AttentionPanel alerts={tower.alerts} />
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-12 lg:items-stretch">
            <div className="lg:col-span-7">
              <WorkflowHealth rows={workflowRows} />
            </div>
            <div className="lg:col-span-5">
              <RecentActivity items={tower.recentActivity ?? []} />
            </div>
          </div>

          <GovernanceHub />
        </>
      )}
    </div>
  );
}
