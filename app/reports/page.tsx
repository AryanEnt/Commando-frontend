"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, type ReportsOverview } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  MetricCard,
  PageHeader,
  SectionHeader,
} from "@/components/ui";

export default function ReportsHubPage() {
  const { token, user, hasPermission } = useAuth();
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<ReportsOverview | null>(null);

  const allowed =
    user?.roleCode === "SUPER_ADMIN" && hasPermission("REPORT_VIEW");

  const load = useCallback(async () => {
    if (!token || !allowed) return;
    setState("loading");
    setError(null);
    try {
      const res = await api.getReportsOverview(token);
      setOverview(res.data);
      setState("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports");
      setState("error");
    }
  }, [token, allowed]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!allowed) {
    return (
      <ErrorState message="Only Super Admin may view reports and oversight." />
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Reports & Oversight"
        description="Operational summaries from live intervention records. No invented KPI formulas."
      />

      {state === "loading" && <LoadingState label="Loading oversight…" />}
      {state === "error" && error && (
        <ErrorState message={error} onRetry={() => void load()} />
      )}
      {state === "ready" && overview && (
        <>
          <section>
            <SectionHeader
              title="Intervention overview"
              description="Assignment and referral status across the organization."
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Active interventions"
                value={overview.counts.interventions.active}
                href="/reports/commando-performance?status=ACTIVE"
              />
              <MetricCard
                label="Completed"
                value={overview.counts.interventions.completed}
                href="/reports/commando-performance?status=COMPLETED"
              />
              <MetricCard
                label="Exited"
                value={overview.counts.interventions.exited}
                href="/reports/commando-performance?status=EXITED"
              />
              <MetricCard
                label="Pending referrals"
                value={overview.counts.pendingReferrals}
                href="/reports/commando-performance"
              />
            </div>
          </section>

          <section>
            <SectionHeader
              title="Activity status"
              description="Counts from action items, weekly reviews, and monitoring."
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Overdue actions"
                value={overview.counts.overdueActions}
                href="/reports/commando-performance"
              />
              <MetricCard
                label="Draft reviews"
                value={overview.counts.weeklyReviews.draft}
                href="/reports/commando-performance"
              />
              <MetricCard
                label="Submitted reviews"
                value={overview.counts.weeklyReviews.submitted}
                href="/reports/commando-performance"
              />
              <MetricCard
                label="Monitoring records"
                value={overview.counts.monitoringRecords}
                href="/reports/commando-performance"
              />
            </div>
          </section>

          <section>
            <SectionHeader
              title="Coverage"
              description="Teams, Sales Executives, and active Commandos."
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <MetricCard
                label="Teams"
                value={overview.counts.teams}
                href="/teams"
              />
              <MetricCard
                label="Sales Executives"
                value={overview.counts.salesExecutives}
                href="/profiles"
              />
              <MetricCard
                label="Commandos"
                value={overview.counts.commandos}
                href="/users?roleCode=COMMANDO_EXECUTIVE"
              />
            </div>
          </section>

          <section>
            <SectionHeader
              title="Report modules"
              description="Open detailed historical views. Records remain immutable."
            />
            {overview.modules.length === 0 ? (
              <EmptyState
                title="No report modules"
                description="Report modules will appear here when configured."
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {overview.modules.map((mod) => (
                  <Link
                    key={mod.key}
                    href={mod.href}
                    className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 transition hover:border-[var(--color-line-strong)]"
                  >
                    <p className="text-sm font-semibold text-[var(--color-ink)]">
                      {mod.title}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                      {mod.description}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
