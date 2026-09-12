"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, type ControlTowerData, type PerformanceMetrics, type ProfileListItem, type Referral, type SupportTask } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { greeting, personName, roleLabel } from "@/lib/labels";
import {
  AttentionList,
  Button,
  ButtonLink,
  EmptyState,
  ErrorState,
  LifecycleStepper,
  LoadingState,
  MetricCard,
  SectionHeader,
  Skeleton,
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
          subtitle="Which Sales Executive needs you right now?"
        />
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/users/sales-executives/new" variant="secondary">
            Add Sales Executive
          </ButtonLink>
          <ButtonLink href="/referrals?status=SUBMITTED">
            Review Commando requests
          </ButtonLink>
        </div>
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
                description="Add a Sales Executive to your team, or wait for a Commando intervention request."
                actionHref="/users/sales-executives/new"
                actionLabel="Add Sales Executive"
                icon="emptyUsers"
              />
            ) : (
              <div className="divide-y divide-[var(--color-line)] border border-[var(--color-line)] bg-[var(--color-surface)]">
                {teamProfiles.slice(0, 6).map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <div>
                      <p className="truncate text-sm font-medium" title={p.displayName}>
                        {p.displayName}
                      </p>
                      <p className="text-xs text-[var(--color-ink-muted)]">
                        {p.team.name}
                        {p.currentAssignment
                          ? ` — ${p.currentAssignment.totalDaysUnderCommando} days under Commando`
                          : " — Normal management"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <ButtonLink
                        href={`/profiles/${p.id}`}
                        variant="secondary"
                        size="sm"
                      >
                        Open
                      </ButtonLink>
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
                icon="emptyClipboard"
              />
            ) : (
              <div className="border border-[var(--color-line)] bg-[var(--color-surface)] p-2">
                <AttentionList
                  items={pending.map((r) => ({
                    href: `/referrals/${r.id}`,
                    title: r.profileName,
                    meta: `${r.team.name} — Awaiting your review`,
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

const CONTROL_TOWER_ACTIVITY_LABELS: Record<string, string> = {
  COMMANDO_ASSIGNMENT_STARTED: "Commando assignment created",
  COMMANDO_ASSIGNMENT_ENDED: "Intervention completed",
  COMMANDO_ASSIGNMENT_EXITED: "Intervention exited",
  COMMANDO_ASSIGNMENT_TRANSFERRED: "Assignment transferred",
  INTERVENTION_OUTCOME_RECORDED: "Intervention outcome recorded",
  REFERRAL_SUBMITTED: "Referral submitted",
  REFERRAL_ACKNOWLEDGED: "Referral acknowledged",
  REFERRAL_IN_PROGRESS: "Referral marked in progress",
  REFERRAL_COMPLETED: "Handoff closed",
  COMMANDO_REQUEST_SUBMITTED: "Commando request submitted",
  REFERRAL_INFORMATION_PROVIDED: "Team Lead provided referral information",
  REFERRAL_REJECTED: "Commando request rejected",
  WEEKLY_REVIEW_SUBMITTED: "Weekly review submitted",
  SUPPORT_TASK_CREATED: "Support task assigned",
  SUPPORT_TASK_STATUS_UPDATED: "Support task updated",
  ACTION_ITEM_COMPLETED: "Action item completed",
  ACTION_ITEM_CREATED: "Action item created",
  ROLE_ASSIGNMENT_CREATED: "Role assignment created",
};

function formatControlTowerTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFreshness(iso: string | undefined, loadedAt: number) {
  const source = iso ? new Date(iso).getTime() : loadedAt;
  const seconds = Math.max(0, Math.round((Date.now() - source) / 1000));
  if (seconds < 45) return "Updated just now";
  if (seconds < 120) return "Updated 1 minute ago";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `Updated ${minutes} minutes ago`;
  return `Updated at ${new Date(source).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function activitySubject(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const meta = metadata as Record<string, unknown>;
  for (const key of [
    "profileName",
    "displayName",
    "title",
    "entityLabel",
  ]) {
    const value = meta[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function SuperAdminDashboard({
  token,
}: {
  token: string;
  firstName: string;
  roleCode: string;
}) {
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [tower, setTower] = useState<ControlTowerData | null>(null);
  const [loadedAt, setLoadedAt] = useState(() => Date.now());
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (opts?: { soft?: boolean }) => {
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
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const attentionAlerts =
    tower?.alerts.filter((alert) => alert.severity !== "info") ?? [];

  const workflowRows = tower
    ? [
        {
          key: "referrals",
          workflow: "Referrals",
          state:
            tower.metrics.referrals.submitted > 0
              ? `${tower.metrics.referrals.submitted} awaiting acknowledgement`
              : "No pending acknowledgements",
          status:
            tower.metrics.referrals.submitted > 0 ? "Attention" : "Healthy",
          href: "/referrals?status=SUBMITTED",
        },
        {
          key: "actions",
          workflow: "Action Items",
          state:
            tower.metrics.overdueActionItems > 0
              ? `${tower.metrics.overdueActionItems} overdue`
              : "None overdue",
          status:
            tower.metrics.overdueActionItems > 0 ? "Attention" : "Healthy",
          href: "/reports",
        },
        {
          key: "reviews",
          workflow: "Weekly Reviews",
          state:
            tower.metrics.draftWeeklyReviews > 0
              ? `${tower.metrics.draftWeeklyReviews} drafts`
              : "No open drafts",
          status: tower.metrics.draftWeeklyReviews > 0 ? "Review" : "Healthy",
          href: "/reports",
        },
        {
          key: "support",
          workflow: "Support Tasks",
          state:
            tower.metrics.overdueSupportTasks > 0
              ? `${tower.metrics.overdueSupportTasks} overdue`
              : "None overdue",
          status:
            tower.metrics.overdueSupportTasks > 0 ? "Attention" : "Healthy",
          href: "/reports",
        },
      ]
    : [];

  const governanceGroups = [
    {
      title: "People & Organization",
      items: [
        { href: "/users", label: "Users", desc: "Roles and access" },
        { href: "/teams", label: "Teams", desc: "Membership" },
        {
          href: "/organization",
          label: "Organization",
          desc: "Structure overview",
        },
        {
          href: "/profiles",
          label: "Sales Executives",
          desc: "Profiles & history",
        },
      ],
    },
    {
      title: "Configuration",
      items: [
        {
          href: "/activity-types",
          label: "Activity Types",
          desc: "Coaching catalog",
        },
        {
          href: "/monitoring-checklists",
          label: "Monitoring Checklists",
          desc: "Templates",
        },
      ],
    },
    {
      title: "Oversight",
      items: [
        {
          href: "/reports",
          label: "Reports & Oversight",
          desc: "Investigate details",
        },
        {
          href: "/audit-logs",
          label: "Audit Trail",
          desc: "Immutable history",
        },
      ],
    },
  ] as const;

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[1.7rem] font-semibold tracking-tight text-[var(--color-ink)]">
            Control Tower
          </h1>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            Platform governance and operational oversight.
          </p>
          {state === "ready" && (
            <p className="mt-2 text-xs text-[var(--color-ink-subtle)]">
              {formatFreshness(tower?.generatedAt, loadedAt)}
            </p>
          )}
        </div>
        <Button
          variant="secondary"
          size="sm"
          disabled={refreshing || state === "loading"}
          onClick={() => void load({ soft: true })}
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </Button>
      </header>

      {state === "loading" && (
        <div className="space-y-8" aria-busy="true" aria-label="Loading control tower">
          <div className="surface grid gap-4 p-4 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-8 w-12" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
          <div className="surface space-y-3 p-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
          <div className="surface space-y-2 p-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      )}

      {state === "error" && error && (
        <ErrorState message={error} onRetry={() => void load()} />
      )}

      {state === "ready" && tower && (
        <>
          {error && (
            <ErrorState message={error} onRetry={() => void load({ soft: true })} />
          )}

          <section aria-labelledby="platform-pulse-heading">
            <SectionHeader title="Platform Pulse" />
            <div
              id="platform-pulse-heading"
              className="surface divide-y divide-[var(--color-line)] sm:grid sm:grid-cols-4 sm:divide-x sm:divide-y-0"
            >
              {[
                {
                  label: "Users",
                  value: tower.metrics.users.total,
                  hint: `${tower.metrics.users.active} active`,
                  href: "/users",
                },
                {
                  label: "Teams",
                  value: tower.metrics.teams,
                  hint: `${tower.metrics.teams} active`,
                  href: "/teams",
                },
                {
                  label: "Sales Executives",
                  value: tower.metrics.salesExecutives,
                  hint: "Under supervision",
                  href: "/profiles",
                },
                {
                  label: "Interventions",
                  value: tower.metrics.interventions.active,
                  hint: `${tower.metrics.interventions.completed} completed`,
                  href: "/reports/commando-performance?status=ACTIVE",
                  valueSuffix: "active",
                },
              ].map((kpi) => (
                <Link
                  key={kpi.label}
                  href={kpi.href}
                  className="block px-4 py-3 transition hover:bg-[var(--color-surface-2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-focus)]"
                >
                  <p className="text-[11px] font-medium text-[var(--color-ink-subtle)]">
                    {kpi.label}
                  </p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--color-ink)]">
                    {kpi.value}
                    {"valueSuffix" in kpi && kpi.valueSuffix ? (
                      <span className="ml-1.5 text-sm font-medium text-[var(--color-ink-muted)]">
                        {kpi.valueSuffix}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                    {kpi.hint}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          <section aria-labelledby="attention-heading">
            <SectionHeader
              title="Attention Required"
              description="Items requiring review or intervention."
            />
            <div className="surface overflow-hidden">
              {attentionAlerts.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p
                    id="attention-heading"
                    className="text-sm font-medium text-[var(--status-success)]"
                  >
                    No exceptions requiring attention.
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                    All monitored workflows are currently within expected state.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-[var(--color-line)]" id="attention-heading">
                  {attentionAlerts.map((alert) => (
                    <li
                      key={alert.code}
                      className="flex flex-wrap items-center gap-3 px-4 py-3.5"
                    >
                      <span
                        className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                          alert.severity === "critical"
                            ? "bg-[var(--status-danger-bg)] text-[var(--status-danger)]"
                            : "bg-[var(--status-warn-bg)] text-[var(--status-warn)]"
                        }`}
                        aria-label={
                          alert.severity === "critical" ? "Critical" : "Warning"
                        }
                      >
                        !
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <p className="text-sm font-semibold text-[var(--color-ink)]">
                            {alert.title}
                          </p>
                          <span className="text-sm font-semibold tabular-nums text-[var(--color-ink)]">
                            {alert.count}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
                          {alert.reason}
                        </p>
                        <span className="sr-only">
                          Severity: {alert.severity}
                        </span>
                      </div>
                      <Link
                        href={alert.href}
                        className="inline-flex h-8 shrink-0 items-center rounded-[var(--radius-sm)] border border-[var(--color-line)] px-3 text-xs font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface-2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
                      >
                        Review
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section aria-labelledby="workflow-health-heading">
            <SectionHeader
              title="Workflow Health"
              description="Broader operational picture across core workflows."
            />
            <div className="surface overflow-hidden">
              <table className="w-full text-left text-sm" id="workflow-health-heading">
                <caption className="sr-only">Workflow health overview</caption>
                <thead className="border-b border-[var(--color-line)] bg-[var(--color-surface-2)] text-xs uppercase tracking-[0.06em] text-[var(--color-ink-subtle)]">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 font-semibold">
                      Workflow
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">
                      Current state
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-line)]">
                  {workflowRows.map((row) => (
                    <tr key={row.key} className="hover:bg-[var(--color-surface-2)]">
                      <td className="px-4 py-3">
                        <Link
                          href={row.href}
                          className="font-medium text-[var(--color-ink)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
                        >
                          {row.workflow}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[var(--color-ink-muted)]">
                        {row.state}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            row.status === "Healthy"
                              ? "bg-[var(--status-success-bg)] text-[var(--status-success)]"
                              : row.status === "Attention"
                                ? "bg-[var(--status-warn-bg)] text-[var(--status-warn)]"
                                : "bg-[var(--status-neutral-bg)] text-[var(--status-neutral)]"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid gap-8 lg:grid-cols-2">
            <section aria-labelledby="recent-activity-heading">
              <SectionHeader
                title="Recent Activity"
                description="High-signal operational events."
                actions={
                  <Link
                    href="/audit-logs"
                    className="text-xs font-medium text-[var(--color-brand)] hover:underline"
                  >
                    Full audit trail
                  </Link>
                }
              />
              <div className="surface overflow-hidden">
                {(tower.recentActivity?.length ?? 0) === 0 ? (
                  <p className="px-4 py-6 text-sm text-[var(--color-ink-muted)]">
                    No recent operational events.
                  </p>
                ) : (
                  <ul className="divide-y divide-[var(--color-line)]" id="recent-activity-heading">
                    {(tower.recentActivity ?? []).map((item) => {
                      const subject = activitySubject(item.metadata);
                      return (
                        <li
                          key={item.id}
                          className="flex gap-3 px-4 py-3 text-sm"
                        >
                          <time
                            dateTime={item.createdAt}
                            className="w-12 shrink-0 tabular-nums text-xs text-[var(--color-ink-subtle)]"
                          >
                            {formatControlTowerTime(item.createdAt)}
                          </time>
                          <div className="min-w-0">
                            <p className="font-medium text-[var(--color-ink)]">
                              {CONTROL_TOWER_ACTIVITY_LABELS[item.action] ??
                                item.action.replaceAll("_", " ").toLowerCase()}
                            </p>
                            <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
                              {[item.actor?.name, subject]
                                .filter(Boolean)
                                .join(" · ") || item.entityType}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>

            <section aria-labelledby="governance-heading">
              <SectionHeader
                title="Governance"
                description="Administration and configuration."
              />
              <div className="space-y-5" id="governance-heading">
                {governanceGroups.map((group) => (
                  <div key={group.title}>
                    <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-subtle)]">
                      {group.title}
                    </h3>
                    <ul className="surface divide-y divide-[var(--color-line)]">
                      {group.items.map((item) => (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className="group flex items-baseline justify-between gap-3 px-4 py-2.5 transition hover:bg-[var(--color-surface-2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-focus)]"
                          >
                            <span>
                              <span className="block text-sm font-medium text-[var(--color-ink)]">
                                {item.label}
                              </span>
                              <span className="text-xs text-[var(--color-ink-muted)]">
                                {item.desc}
                              </span>
                            </span>
                            <span
                              aria-hidden
                              className="text-[var(--color-ink-subtle)] opacity-0 transition group-hover:opacity-100"
                            >
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.75"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M9 18l6-6-6-6" />
                              </svg>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          </div>
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
