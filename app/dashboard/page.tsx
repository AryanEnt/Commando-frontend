"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, type ControlTowerAlert, type ControlTowerData, type PerformanceMetrics, type ProfileListItem, type Referral, type SupportTask } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { greeting, personName, roleLabel } from "@/lib/labels";
import {
  AttentionList,
  EmptyState,
  ErrorState,
  LifecycleStepper,
  LoadingState,
  MetricCard,
  SectionHeader,
} from "@/components/ui";
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
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-subtle)]">
        {roleLabel(roleCode)}
      </p>
      <h1 className="mt-1 text-[1.7rem] font-semibold tracking-tight text-[var(--color-ink)]">
        {greeting()}, {firstName}
      </h1>
      <p className="mt-1 text-sm text-[var(--color-ink-muted)]">{subtitle}</p>
    </div>
  );
}

function TeamLeadDashboard({
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
    teams: 0,
    profiles: 0,
    pendingReferrals: 0,
    activeAssignments: 0,
  });
  const [pending, setPending] = useState<Referral[]>([]);
  const [teamProfiles, setTeamProfiles] = useState<ProfileListItem[]>([]);

  const load = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const [teams, profiles, pendingRes, assignments] = await Promise.all([
        api.getTeams(token),
        api.getProfiles(token),
        api.getReferrals(token, { status: "SUBMITTED", pageSize: 8 }),
        api.getAssignments(token, { currentOnly: true }),
      ]);
      setStats({
        teams: teams.data.teams.length,
        profiles: profiles.data.total,
        pendingReferrals: pendingRes.data.total,
        activeAssignments: assignments.data.total,
      });
      setPending(pendingRes.data.referrals);
      setTeamProfiles(profiles.data.profiles);
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
          subtitle="Your team's performance workspace"
        />
        <Link
          href="/referrals?status=SUBMITTED"
          className="rounded-[var(--radius-sm)] bg-[var(--color-brand)] px-3 py-2 text-sm text-white hover:bg-[var(--color-brand-hover)]"
        >
          Review Commando requests
        </Link>
      </div>
      {state === "loading" && <LoadingState label="Loading team metrics…" />}
      {state === "error" && error && (
        <ErrorState message={error} onRetry={() => void load()} />
      )}
      {state === "ready" && (
        <>
          <section>
            <SectionHeader
              title="Needs attention"
              description="Sales executives on your team — open a profile to manage, or respond to Commando requests."
            />
            {teamProfiles.length === 0 && pending.length === 0 ? (
              <EmptyState
                title="No pending work"
                description="When a Commando requests intervention, the request will appear here. Manage your Sales Executives from their profiles."
                actionHref="/profiles"
                actionLabel="View team profiles"
              />
            ) : (
              <div className="divide-y divide-[var(--color-line)] border border-[var(--color-line)] bg-[var(--color-surface)]">
                {teamProfiles.slice(0, 6).map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{p.displayName}</p>
                      <p className="text-xs text-[var(--color-ink-muted)]">
                        Sales Executive · {p.team.name}
                        {p.currentAssignment
                          ? ` · ${p.currentAssignment.totalDaysUnderCommando} days under Commando`
                          : " · Normal Team Lead management"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/profiles/${p.id}`}
                        className="inline-flex h-8 items-center rounded-[var(--radius-sm)] border border-[var(--color-line)] px-3 text-xs font-medium"
                      >
                        Open workspace
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
          <section>
            <SectionHeader title="Pending Commando requests" />
            {pending.length === 0 ? (
              <EmptyState
                title="No pending requests"
                description="When a Commando requests one of your Sales Executives, the request will appear here for Approve & Provide Information or Reject."
                actionHref="/referrals"
                actionLabel="View requests"
              />
            ) : (
              <div className="border border-[var(--color-line)] bg-[var(--color-surface)] p-2">
                <AttentionList
                  items={pending.map((r) => ({
                    href: `/referrals/${r.id}`,
                    title: r.profileName,
                    meta: `${r.team.name} · Awaiting Commando acknowledgement`,
                  }))}
                />
              </div>
            )}
          </section>
          <section>
            <SectionHeader title="Coverage" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="My teams" value={stats.teams} href="/teams" hint="Teams you lead" />
              <MetricCard
                label="Team profiles"
                value={stats.profiles}
                href="/profiles"
                hint="Sales executives in scope"
              />
              <MetricCard
                label="Pending referrals"
                value={stats.pendingReferrals}
                href="/referrals?status=SUBMITTED"
                hint="Submitted, awaiting Commando"
              />
              <MetricCard
                label="Active assignments"
                value={stats.activeAssignments}
                href="/assignments?currentOnly=true"
                hint="Currently under Commando"
              />
            </div>
          </section>
        </>
      )}
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
      <Greeting
        firstName={firstName}
        roleCode={roleCode}
        subtitle="Your intervention workspace"
      />
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
              />
            ) : (
              <div className="surface p-3">
                <AttentionList
                  items={assigned.map((p) => ({
                    href: `/profiles/${p.id}`,
                    title: p.displayName,
                    meta: p.currentAssignment
                      ? `${p.team.name} · ${p.currentAssignment.status}`
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
                      meta: `${r.team.name} · ${personName(r.teamLead)}`,
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
                      meta: `${r.team.name} · Acknowledged`,
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
                      meta: `${t.profile.displayName} · ${t.priority}`,
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
      <Greeting
        firstName={firstName}
        roleCode={roleCode}
        subtitle="Your support tasks"
      />
      {state === "loading" && <LoadingState />}
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
                actionLabel="Open My Task"
              />
            ) : (
              <div className="surface p-2">
                <AttentionList
                  items={tasks.map((t) => ({
                    href: `/my-tasks/${t.id}`,
                    title: t.title,
                    meta: `${t.profile.displayName} · ${t.priority}${t.isOverdue ? " · Overdue" : ""}`,
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

function SuperAdminDashboard({
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
  const [tower, setTower] = useState<ControlTowerData | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const res = await api.getControlTower(token);
      setTower(res.data);
      setState("ready");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't load the control tower. Please try again.",
      );
      setState("error");
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const severityTone = (severity: ControlTowerAlert["severity"]) => {
    if (severity === "critical")
      return "border-[var(--status-danger-ring)] bg-[var(--status-danger-bg)]";
    if (severity === "warning")
      return "border-[var(--status-warn-ring)] bg-[var(--status-warn-bg)]";
    return "border-[var(--status-info-ring)] bg-[var(--status-info-bg)]";
  };

  return (
    <div className="space-y-8">
      <Greeting
        firstName={firstName}
        roleCode={roleCode}
        subtitle="Control Tower — govern, configure, supervise, and audit"
      />
      {state === "loading" && <LoadingState label="Loading control tower…" />}
      {state === "error" && error && (
        <ErrorState message={error} onRetry={() => void load()} />
      )}
      {state === "ready" && tower && (
        <>
          <section>
            <SectionHeader
              title="Platform pulse"
              description="Live counts from users, teams, and interventions."
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Users"
                value={tower.metrics.users.total}
                href="/users"
                hint={`${tower.metrics.users.active} active · ${tower.metrics.users.inactive} inactive`}
              />
              <MetricCard
                label="Teams"
                value={tower.metrics.teams}
                href="/teams"
                hint="Active organization units"
              />
              <MetricCard
                label="Sales Executives"
                value={tower.metrics.salesExecutives}
                href="/profiles"
                hint="Profiles under supervision"
              />
              <MetricCard
                label="Active interventions"
                value={tower.metrics.interventions.active}
                href="/reports"
                hint={`${tower.metrics.interventions.completed} completed · ${tower.metrics.interventions.exited} exited`}
              />
            </div>
          </section>

          <section>
            <SectionHeader
              title="Workflow supervision"
              description="Operational queues that need Super Admin awareness — not day-to-day coaching work."
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Pending referrals"
                value={tower.metrics.referrals.submitted}
                href="/reports"
                hint="Awaiting Commando acknowledgement"
              />
              <MetricCard
                label="Overdue actions"
                value={tower.metrics.overdueActionItems}
                href="/reports"
                hint="Past-due active action items"
                muted={tower.metrics.overdueActionItems === 0}
              />
              <MetricCard
                label="Draft weekly reviews"
                value={tower.metrics.draftWeeklyReviews}
                href="/reports"
                hint={`${tower.metrics.submittedWeeklyReviewsLast7d} submitted in last 7 days`}
              />
              <MetricCard
                label="Monitoring (7d)"
                value={tower.metrics.monitoringLast7d}
                href="/reports"
                hint="Live monitoring records this week"
              />
            </div>
          </section>

          <section>
            <SectionHeader
              title="Attention required"
              description="System alerts derived from real operational records."
            />
            {tower.alerts.length === 0 ? (
              <EmptyState
                title="All clear"
                description="No governance alerts right now. Queues and overdue items will surface here."
              />
            ) : (
              <div className="space-y-2">
                {tower.alerts.map((alert) => (
                  <Link
                    key={alert.code}
                    href={alert.href}
                    className={`block rounded-[var(--radius-md)] border px-4 py-3 transition hover:border-[var(--color-line-strong)] ${severityTone(alert.severity)}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-ink)]">
                          {alert.title}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
                          {alert.reason}
                        </p>
                      </div>
                      <span className="text-lg font-semibold tabular-nums text-[var(--color-ink)]">
                        {alert.count}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section>
              <SectionHeader
                title="Referrals awaiting acknowledgement"
                description="Submitted referrals across the organization."
              />
              {tower.attention.pendingReferrals.length === 0 ? (
                <EmptyState
                  title="No pending referrals"
                  description="Submitted referrals will appear here for oversight."
                />
              ) : (
                <div className="surface p-2">
                  <AttentionList
                    items={tower.attention.pendingReferrals.map((r) => ({
                      href: `/profiles/${r.profileId}`,
                      title: r.profileName,
                      meta: `${r.teamName} · TL ${r.teamLead} · Commando ${r.commando}`,
                    }))}
                  />
                </div>
              )}
            </section>
            <section>
              <SectionHeader
                title="Overdue action items"
                description="Active coaching actions past their due date."
              />
              {tower.attention.overdueActions.length === 0 ? (
                <EmptyState
                  title="No overdue actions"
                  description="Past-due action items will appear here."
                />
              ) : (
                <div className="surface p-2">
                  <AttentionList
                    items={tower.attention.overdueActions.map((a) => ({
                      href: `/profiles/${a.profileId}`,
                      title: a.title,
                      meta: `${a.profileName}${a.dueDate ? ` · due ${new Date(a.dueDate).toLocaleDateString()}` : ""}`,
                    }))}
                  />
                </div>
              )}
            </section>
          </div>

          <section>
            <SectionHeader
              title="Governance shortcuts"
              description="Jump into administration modules."
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  href: "/users",
                  title: "User management",
                  desc: "Create, activate, assign roles and teams",
                },
                {
                  href: "/organization",
                  title: "Organization",
                  desc: "Team Lead → Commando → Sales Executive",
                },
                {
                  href: "/reports",
                  title: "Reports & oversight",
                  desc: "Intervention and activity summaries",
                },
                {
                  href: "/audit-logs",
                  title: "Audit trail",
                  desc: "Immutable change history",
                },
                {
                  href: "/activity-types",
                  title: "Activity types",
                  desc: "Configure coaching activity catalog",
                },
                {
                  href: "/monitoring-checklists",
                  title: "Monitoring checklists",
                  desc: "Categories and checklist items",
                },
                {
                  href: "/teams",
                  title: "Teams",
                  desc: "Create teams and manage membership",
                },
                {
                  href: "/profiles",
                  title: "Sales Executives",
                  desc: "Profiles, Commando, intervention history",
                },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 transition hover:border-[var(--color-line-strong)]"
                >
                  <p className="text-sm font-semibold text-[var(--color-ink)]">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                    {item.desc}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
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
      return <SuperAdminDashboard {...props} />;
    default:
      return (
        <EmptyState
          title="No dashboard for this role"
          description={`Role ${roleLabel(user.roleCode)} does not have a configured home dashboard.`}
        />
      );
  }
}
