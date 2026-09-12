"use client";

import { useCallback, useEffect, useState } from "react";
import {
  api,
  type ControlTowerActivityItem,
  type ReportsOverview,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ErrorState, LoadingState, Skeleton } from "@/components/ui";
import { ActivityHealth } from "@/components/reports/ActivityHealth";
import { AttentionCenter } from "@/components/reports/AttentionCenter";
import { InterventionLifecycle } from "@/components/reports/InterventionLifecycle";
import { InterventionStatus } from "@/components/reports/InterventionStatus";
import { InvestigationModules } from "@/components/reports/InvestigationModules";
import { OperationalSummary } from "@/components/reports/OperationalSummary";
import { OperationalTimeline } from "@/components/reports/OperationalTimeline";
import { OrganizationCoverage } from "@/components/reports/OrganizationCoverage";
import { ReportsHeader } from "@/components/reports/ReportsHeader";
import { WorkflowMap } from "@/components/reports/WorkflowMap";

export default function ReportsHubPage() {
  const { token, user, hasPermission } = useAuth();
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<ReportsOverview | null>(null);
  const [activity, setActivity] = useState<ControlTowerActivityItem[]>([]);
  const [loadedAt, setLoadedAt] = useState(() => Date.now());

  const allowed =
    user?.roleCode === "SUPER_ADMIN" && hasPermission("REPORT_VIEW");

  const load = useCallback(
    async (opts?: { soft?: boolean }) => {
      if (!token || !allowed) return;
      if (opts?.soft) setRefreshing(true);
      else {
        setState("loading");
        setError(null);
      }
      try {
        const [overviewRes, towerRes] = await Promise.all([
          api.getReportsOverview(token),
          api.getControlTower(token).catch(() => null),
        ]);
        setOverview(overviewRes.data);
        setActivity(towerRes?.data.recentActivity ?? []);
        setLoadedAt(Date.now());
        setState("ready");
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load reports");
        if (!opts?.soft) setState("error");
      } finally {
        setRefreshing(false);
      }
    },
    [token, allowed],
  );

  useEffect(() => {
    void load();
  }, [load]);

  if (!allowed) {
    return (
      <ErrorState message="Only Super Admin may view reports and oversight." />
    );
  }

  return (
    <div className="space-y-6 pb-4">
      <ReportsHeader
        loadedAt={loadedAt}
        refreshing={refreshing}
        loading={state === "loading"}
        onRefresh={() => void load({ soft: true })}
      />

      {state === "loading" && (
        <div className="space-y-4" aria-busy="true" aria-label="Loading oversight">
          <LoadingState label="Loading oversight…" />
          <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)]">
            <div className="grid gap-0 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="space-y-3 border-[var(--color-line)] p-4 sm:border-r sm:last:border-r-0">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-9 w-16" />
                  <Skeleton className="h-3 w-28" />
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="space-y-3 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 lg:col-span-8">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-24 w-full" />
            </div>
            <div className="space-y-3 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 lg:col-span-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        </div>
      )}

      {state === "error" && error && (
        <ErrorState message={error} onRetry={() => void load()} />
      )}

      {state === "ready" && overview && (
        <>
          {error && (
            <ErrorState
              message={error}
              onRetry={() => void load({ soft: true })}
            />
          )}

          <OperationalSummary counts={overview.counts} />

          <div className="grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <InterventionLifecycle counts={overview.counts} />
            </div>
            <div className="lg:col-span-4">
              <InterventionStatus counts={overview.counts} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <AttentionCenter counts={overview.counts} />
            </div>
            <div className="lg:col-span-7">
              <ActivityHealth counts={overview.counts} />
            </div>
          </div>

          <WorkflowMap counts={overview.counts} />

          <div className="grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <OrganizationCoverage counts={overview.counts} />
            </div>
            <div className="lg:col-span-7">
              <OperationalTimeline items={activity} />
            </div>
          </div>

          <InvestigationModules modules={overview.modules} />
        </>
      )}
    </div>
  );
}
