"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, type PerformanceMetrics, type ProfileListItem, type Referral, type SupportTask } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { greeting, personName, roleLabel } from "@/lib/labels";
import {
  AttentionList,
  ButtonLink,
  EmptyState,
  ErrorState,
  LifecycleStepper,
  LoadingState,
  MetricCard,
  SectionHeader,
} from "@/components/ui";
import { SuperAdminControlTower } from "@/components/control-tower/SuperAdminControlTower";
import { TeamLeadDashboard } from "@/components/dashboard/TeamLeadDashboard";
import { INTERVENTION_STAGES } from "@/lib/lifecycle";

type LoadState = "loading" | "ready" | "error";

function Greeting({
  firstName,
  roleCode,
  subtitle,
}: {
  firstName: string;
  roleCode: string;
  subtitle: string;
}) {
  return (
    <div>
      <p className="text-sm text-[var(--color-ink-muted)]">
        {roleLabel(roleCode)}
      </p>
      <h1 className="mt-0.5 text-[1.7rem] font-semibold tracking-tight text-[var(--color-ink)]">
        {greeting()}, {firstName}
      </h1>
      <p className="mt-1 max-w-xl text-sm text-[var(--color-ink-muted)]">
        {subtitle}
      </p>
    </div>
  );
}

function CommandoDashboard({
  token,
  firstName,
  roleCode,
}: {
  token: string;
  firstName: string;
  roleCode: string;
}) {
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    profiles: 0,
    supportExecs: 0,
    incoming: 0,
    acknowledged: 0,
  });
  const [assigned, setAssigned] = useState<ProfileListItem[]>([]);
  const [incoming, setIncoming] = useState<Referral[]>([]);
  const [acknowledged, setAcknowledged] = useState<Referral[]>([]);
  const [overdue, setOverdue] = useState<SupportTask[]>([]);

  const load = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const [profiles, roleAssignments, submittedRes, ackRes, tasks] =
        await Promise.all([
          api.getProfiles(token),
          api.getRoleAssignments(token, { status: "ACTIVE", pageSize: 100 }),
          api.getReferrals(token, { status: "SUBMITTED", pageSize: 8 }),
          api.getReferrals(token, { status: "ACKNOWLEDGED", pageSize: 8 }),
          api.getSupportTasks(token, { filter: "overdue", pageSize: 8 }),
        ]);
      const supportIds = new Set(
        roleAssignments.data.roleAssignments.map((r) => r.salesSupportUserId),
      );
      setStats({
        profiles: profiles.data.total,
        supportExecs: supportIds.size,
        incoming: submittedRes.data.total,
        acknowledged: ackRes.data.total,
      });
      setAssigned(profiles.data.profiles.slice(0, 8));
      setIncoming(submittedRes.data.referrals);
      setAcknowledged(ackRes.data.referrals);
      setOverdue(tasks.data.tasks);
      setState("ready");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't load this dashboard. Please try again.",
      );
      setState("error");
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Greeting
          firstName={firstName}
          roleCode={roleCode}
          subtitle="Your intervention operations workspace"
        />
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/referrals/request">Request intervention</ButtonLink>
          <ButtonLink href="/profiles" variant="secondary">
            Sales Executives
          </ButtonLink>
        </div>
      </div>
      {state === "loading" && <LoadingState label="Loading Commando metrics…" />}
      {state === "error" && error && (
        <ErrorState message={error} onRetry={() => void load()} />
      )}
      {state === "ready" && (
        <>
          <section>
            <SectionHeader
              title="Assigned Sales Executives"
              description="Active coaching stays here until you Complete intervention on the Sales Executive workspace. Closing a handoff does not remove them."
            />
            {assigned.length === 0 ? (
              <EmptyState
                title="No active assignments yet"
                description="Acknowledge an incoming referral to place that Sales Executive on your workspace."
                icon="emptyUsers"
              />
            ) : (
              <div className="surface p-3">
                <AttentionList
                  items={assigned.map((p) => ({
                    href: `/profiles/${p.id}`,
                    title: p.displayName,
                    meta: p.currentAssignment
                      ? `${p.team.name} — ${p.currentAssignment.status.replaceAll("_", " ")}`
                      : p.team.name,
                  }))}
                />
                {stats.profiles > assigned.length ? (
                  <Link
                    href="/profiles"
                    className="mt-2 inline-flex px-1 text-sm font-medium text-[var(--color-brand)] hover:underline"
                  >
                    View all {stats.profiles} assigned
                  </Link>
                ) : null}
              </div>
            )}
          </section>

          <section>
            <SectionHeader title="Needs attention" />
            {incoming.length === 0 &&
            acknowledged.length === 0 &&
            overdue.length === 0 ? (
              <EmptyState
                title="Nothing waiting right now"
                description="Incoming referrals, acknowledged handoffs, and overdue support tasks will appear here."
                icon="emptyInbox"
              />
            ) : (
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="surface p-3">
                  <h3 className="mb-1 text-sm font-semibold">
                    Incoming referrals
                  </h3>
                  <AttentionList
                    items={incoming.map((r) => ({
                      href: `/referrals/${r.id}`,
                      title: r.profileName,
                      meta: `${r.team.name}, ${personName(r.teamLead)}`,
                    }))}
                  />
                  {incoming.length === 0 && (
                    <p className="px-1 py-2 text-sm text-[var(--color-ink-muted)]">
                      No submitted referrals.
                    </p>
                  )}
                </div>
                <div className="surface p-3">
                  <h3 className="mb-1 text-sm font-semibold">
                    Ready to start coaching
                  </h3>
                  <AttentionList
                    items={acknowledged.map((r) => ({
                      href: `/referrals/${r.id}`,
                      title: r.profileName,
                      meta: `${r.team.name}, acknowledged`,
                    }))}
                  />
                  {acknowledged.length === 0 && (
                    <p className="px-1 py-2 text-sm text-[var(--color-ink-muted)]">
                      No acknowledged referrals waiting to start.
                    </p>
                  )}
                </div>
                <div className="surface p-3">
                  <h3 className="mb-1 text-sm font-semibold">
                    Overdue support tasks
                  </h3>
                  <AttentionList
                    items={overdue.map((t) => ({
                      href: `/my-tasks/${t.id}`,
                      title: t.title,
                      meta: `${t.profile.displayName}, ${t.priority}`,
                    }))}
                  />
                  {overdue.length === 0 && (
                    <p className="px-1 py-2 text-sm text-[var(--color-ink-muted)]">
                      No overdue support tasks.
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>
          <section>
            <SectionHeader
              title="Intervention path"
              description="How a Sales Executive moves through coaching."
            />
            <LifecycleStepper stages={[...INTERVENTION_STAGES]} current="COACH" />
          </section>
          <section>
            <SectionHeader title="Workload" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Assigned profiles"
                value={stats.profiles}
                href="/profiles"
                hint="Active assignment scope"
              />
              <MetricCard
                label="Sales Support"
                value={stats.supportExecs}
                href="/role-assignments?status=ACTIVE"
                hint="Active role assignments"
              />
              <MetricCard
                label="Incoming"
                value={stats.incoming}
                href="/referrals?status=SUBMITTED"
                hint="Awaiting acknowledgement"
              />
              <MetricCard
                label="Acknowledged"
                value={stats.acknowledged}
                href="/referrals?status=ACKNOWLEDGED"
                hint="Ready to start coaching"
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function SalesExecutiveDashboard({
  token,
  firstName,
  roleCode,
}: {
  token: string;
  firstName: string;
  roleCode: string;
}) {
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const res = await api.getPerformanceMetrics(token);
      setMetrics(res.data.metrics);
      setState("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't load this dashboard. Please try again.");
      setState("error");
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const score = metrics?.currentCommandoScore;
  const mine = metrics?.myPerformanceMetric;

  return (
    <div className="space-y-8">
      <Greeting
        firstName={firstName}
        roleCode={roleCode}
        subtitle="Your performance workspace"
      />
      {state === "loading" && <LoadingState label="Loading your metrics…" />}
      {state === "error" && error && (
        <ErrorState message={error} onRetry={() => void load()} />
      )}
      {state === "ready" && metrics && (
        <>
          <p className="text-sm text-[var(--color-ink-muted)]">
            {metrics.profile.displayName}
            {metrics.lifecycle.isDuringCommando && (
              <span className="ml-2 rounded-full bg-[var(--status-warn-bg)] px-2 py-0.5 text-xs text-[var(--status-warn)]">
                During Commando
              </span>
            )}
            {metrics.lifecycle.isAfterCommando && (
              <span className="ml-2 rounded-full bg-[var(--status-success-bg)] px-2 py-0.5 text-xs text-[var(--status-success)]">
                After Commando
              </span>
            )}
          </p>
          <LifecycleStepper
            stages={[...INTERVENTION_STAGES]}
            current={
              metrics.lifecycle.isAfterCommando
                ? "EXIT"
                : metrics.lifecycle.isDuringCommando
                  ? "COACH"
                  : "REFER"
            }
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard
              label="Current Commando score"
              value={
                score?.visible && score.averageMetricScore != null
                  ? score.averageMetricScore.toFixed(1)
                  : "Not available"
              }
              href={
                score?.visible && score.evaluationId
                  ? `/performance/${score.evaluationId}`
                  : "/performance?source=COMMANDO"
              }
              hint={
                score?.visible
                  ? `Source: ${score.source}`
                  : (score?.hiddenReason ?? "Not available yet")
              }
              muted={!score?.visible || score.evaluationId == null}
            />
            <MetricCard
              label="Days under Commando"
              value={metrics.totalDaysUnderCommando}
              href="/assignments?currentOnly=true"
              hint="Inclusive calendar days across assignments"
            />
            <MetricCard
              label="My performance metric"
              value={
                mine?.averageMetricScore != null
                  ? mine.averageMetricScore.toFixed(1)
                  : mine?.rating != null
                    ? mine.rating.toFixed(2)
                    : "Not available"
              }
              href={mine ? `/performance/${mine.evaluationId}` : "/performance"}
              hint={
                mine
                  ? `Source: ${mine.source}${mine.verdict ? ` · ${mine.verdict}` : ""}`
                  : "No visible evaluation yet"
              }
              muted={!mine}
            />
          </div>
        </>
      )}
    </div>
  );
}

function SalesSupportDashboard({
  token,
  firstName,
  roleCode,
}: {
  token: string;
  firstName: string;
  roleCode: string;
}) {
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    evaluations: 0,
    roleAssignments: 0,
    activeTasks: 0,
  });
  const [tasks, setTasks] = useState<SupportTask[]>([]);

  const load = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const [evals, roles, tasksRes] = await Promise.all([
        api.getSyncEvaluations(token, { pageSize: 1 }),
        api.getRoleAssignments(token, { status: "ACTIVE", pageSize: 1 }),
        api.getSupportTasks(token, { view: "active", pageSize: 8 }),
      ]);
      setStats({
        evaluations: evals.data.total,
        roleAssignments: roles.data.total,
        activeTasks: tasksRes.data.total,
      });
      setTasks(tasksRes.data.tasks);
      setState("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't load this dashboard. Please try again.");
      setState("error");
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Greeting
          firstName={firstName}
          roleCode={roleCode}
          subtitle="Your assigned support work"
        />
        <ButtonLink href="/my-tasks">Open my tasks</ButtonLink>
      </div>
      {state === "loading" && <LoadingState label="Loading your tasks…" />}
      {state === "error" && error && (
        <ErrorState message={error} onRetry={() => void load()} />
      )}
      {state === "ready" && (
        <>
          <section>
            <SectionHeader title="My tasks" description="Active work assigned by Commando." />
            {tasks.length === 0 ? (
              <EmptyState
                title="No active tasks"
                description="When Commando assigns you work, it will appear here."
                actionHref="/my-tasks"
                actionLabel="Open my tasks"
                icon="tasks"
              />
            ) : (
              <div className="surface p-2">
                <AttentionList
                  items={tasks.map((t) => ({
                    href: `/my-tasks/${t.id}`,
                    title: t.title,
                    meta: t.isOverdue
                      ? `${t.profile.displayName}, ${t.priority}, overdue`
                      : `${t.profile.displayName}, ${t.priority}`,
                  }))}
                />
              </div>
            )}
          </section>
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard
              label="Active tasks"
              value={stats.activeTasks}
              href="/my-tasks"
              hint="Commando-assigned work"
            />
            <MetricCard
              label="Sync evaluations"
              value={stats.evaluations}
              href="/sync-evaluations"
              hint="Read-only Commando observations"
            />
            <MetricCard
              label="Role assignments"
              value={stats.roleAssignments}
              href="/role-assignments?status=ACTIVE"
              hint="What you should and should not do"
            />
          </div>
        </>
      )}
    </div>
  );
}

function SuperAdminDashboard({ token }: { token: string }) {
  return <SuperAdminControlTower token={token} />;
}

export default function DashboardPage() {
  const { token, user, hasPermission } = useAuth();

  if (!hasPermission("DASHBOARD_VIEW")) {
    return (
      <ErrorState message="You don't have permission to view the dashboard." />
    );
  }

  if (!token || !user) {
    return <LoadingState />;
  }

  const props = {
    token,
    firstName: user.firstName,
    roleCode: user.roleCode,
  };

  switch (user.roleCode) {
    case "TEAM_LEAD":
      return <TeamLeadDashboard {...props} />;
    case "COMMANDO_EXECUTIVE":
      return <CommandoDashboard {...props} />;
    case "SALES_EXECUTIVE":
      return <SalesExecutiveDashboard {...props} />;
    case "SALES_SUPPORT_EXECUTIVE":
      return <SalesSupportDashboard {...props} />;
    case "SUPER_ADMIN":
      return <SuperAdminDashboard token={token} />;
    default:
      return (
        <EmptyState
          title="No dashboard for this role"
          description={`Role ${roleLabel(user.roleCode)} does not have a configured home dashboard.`}
        />
      );
  }
}
