"use client";

import Link from "next/link";
import type {
  ActionItem,
  EisenhowerTask,
  FeedbackItem,
  PerformanceMetrics,
  ProfileDetail,
  SeSupportTeamContext,
  SupportTask,
  SwotItem,
  WeeklyReview,
  InterventionWorkspace,
} from "@/lib/api";
import { formatDate } from "@/lib/dates";
import { personName, responsibilityTypeLabel } from "@/lib/labels";
import { seCreateHref, seWorkspaceHref } from "@/lib/se-workspace-nav";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState, Skeleton } from "@/components/ui";

type TimelineEvent = {
  at: string;
  type: string;
  title: string;
  href?: string;
};

type Props = {
  profile: ProfileDetail;
  workspace: InterventionWorkspace | null;
  supportTeam: SeSupportTeamContext | null;
  metrics: PerformanceMetrics | null;
  metricsLoading: boolean;
  metricsError: string | null;
  feedback: FeedbackItem[];
  reviews: WeeklyReview[];
  swots: SwotItem[];
  actions: ActionItem[];
  eisenhower: EisenhowerTask[];
  timeline: TimelineEvent[];
  supportTasks: SupportTask[];
  isSe: boolean;
  isTl: boolean;
  isCommando: boolean;
  canEditSelfSwot: boolean;
  canViewSupport: boolean;
  managementActions?: React.ReactNode;
};

function swotLabel(source: string) {
  switch (source) {
    case "TEAM_LEAD":
      return "Team Lead assessment";
    case "SALES_EXECUTIVE":
      return "Self assessment";
    case "COMMANDO":
      return "Commando assessment";
    default:
      return source.replaceAll("_", " ");
  }
}

function latestBySource(swots: SwotItem[], source: SwotItem["source"]) {
  return swots.find((s) => s.source === source) ?? null;
}

function scoreTone(value: number | null | undefined) {
  if (value == null) return "—";
  if (value >= 80) return "On Track";
  if (value >= 65) return "Needs Attention";
  if (value >= 50) return "Needs Improvement";
  return "Critical";
}

function activityDayLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return formatDate(iso);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startThat = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round(
    (startToday.getTime() - startThat.getTime()) / 86_400_000,
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return formatDate(iso);
}

function attentionHref(
  profileId: string,
  code: string,
  referralId?: string | null,
) {
  switch (code) {
    case "ACTIONS_OVERDUE":
      return seWorkspaceHref(profileId, "actions");
    case "REVIEW_DUE":
      return seWorkspaceHref(profileId, "reviews");
    case "MONITORING_MISSING":
      return seWorkspaceHref(profileId, "monitoring");
    case "REFERRAL_AWAITING_ACK":
      return referralId
        ? `/referrals/${referralId}`
        : seWorkspaceHref(profileId, "interventions");
    default:
      return seWorkspaceHref(profileId, "overview");
  }
}

function isOverdueAction(a: ActionItem) {
  if (a.status !== "ACTIVE" || !a.dueDate) return false;
  const due = new Date(a.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

function nextDueAction(open: ActionItem[]) {
  const dated = open
    .filter((a) => a.dueDate)
    .slice()
    .sort(
      (a, b) =>
        new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime(),
    );
  return dated[0] ?? open[0] ?? null;
}

function truncate(text: string, max = 120) {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function SeAccountabilityOverview({
  profile,
  workspace,
  supportTeam,
  metrics,
  metricsLoading,
  metricsError,
  feedback,
  reviews,
  swots,
  actions,
  eisenhower,
  timeline,
  supportTasks,
  isSe,
  isTl,
  isCommando,
  canEditSelfSwot,
  canViewSupport,
  managementActions,
}: Props) {
  const assignment = profile.currentAssignment;
  const referral = workspace?.latestReferral ?? null;
  const daysUnder =
    assignment != null
      ? (workspace?.daysInIntervention ?? assignment.totalDaysUnderCommando)
      : null;

  const metric = metrics?.myPerformanceMetric ?? null;
  const score = metric?.averageMetricScore ?? metric?.rating ?? null;
  const statusLabel =
    metric?.verdict?.replaceAll("_", " ") ??
    (score != null
      ? scoreTone(score)
      : (workspace?.health.status.replaceAll("_", " ") ?? null));

  const openActions = actions.filter((a) => a.status === "ACTIVE");
  const completedActions = actions.filter((a) => a.status !== "ACTIVE");
  const overdueFromWorkspace = workspace?.overdueActions ?? [];
  const overdueCount =
    overdueFromWorkspace.length ||
    openActions.filter(isOverdueAction).length;
  const nextActionItem = nextDueAction(openActions);
  const latestFeedback = feedback[0] ?? null;

  const tlSwot = latestBySource(swots, "TEAM_LEAD");
  const selfSwot = latestBySource(swots, "SALES_EXECUTIVE");
  const commandoSwot = latestBySource(swots, "COMMANDO");
  const duringCommando = Boolean(assignment) || metrics?.lifecycle.isDuringCommando;
  const afterCommando = metrics?.lifecycle.isAfterCommando ?? false;

  const currentMonthTasks = eisenhower.filter((t) => t.isCurrentMonth);
  const monthLabel =
    currentMonthTasks[0]?.monthLabel ??
    eisenhower[0]?.monthLabel ??
    "Current month";
  const byCat = {
    DO_FIRST: currentMonthTasks.filter((t) => t.category === "DO_FIRST"),
    SCHEDULE: currentMonthTasks.filter((t) => t.category === "SCHEDULE"),
    DELEGATE: currentMonthTasks.filter((t) => t.category === "DELEGATE"),
    ELIMINATE: currentMonthTasks.filter((t) => t.category === "ELIMINATE"),
  };
  const lastEisenhowerReview = currentMonthTasks
    .map((t) => t.updatedAt ?? t.createdAt)
    .filter(Boolean)
    .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0];

  const activeSupportTasks = supportTasks.filter(
    (t) => t.status !== "COMPLETED",
  );
  const completedSupportTasks = supportTasks.filter(
    (t) => t.status === "COMPLETED",
  );
  const overdueSupportTasks = supportTasks.filter((t) => t.isOverdue);

  const attention = workspace?.attention ?? [];
  const nextWorkspaceAction = workspace?.nextAction ?? null;
  const recentActivity = timeline.slice(0, 6);
  const recentReviews = reviews.slice(0, 5);

  const interventionFocus =
    referral?.recommendationFocus ||
    referral?.priority1 ||
    referral?.whatIsTheGap ||
    null;

  const teamLeadName = assignment
    ? personName(assignment.teamLead)
    : profile.assignmentHistory[0]
      ? personName(profile.assignmentHistory[0].teamLead)
      : null;

  return (
    <div className="space-y-5">
      {managementActions}

      {/* Performance snapshot */}
      <section className="surface p-4 sm:p-5" aria-labelledby="perf-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="perf-heading" className="text-sm font-semibold">
            Performance
          </h2>
          <Link
            href={seWorkspaceHref(profile.id, "performance")}
            className="text-sm text-[var(--color-brand)] hover:underline"
          >
            View goals
          </Link>
        </div>
        {metricsLoading ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : metricsError ? (
          <p className="mt-3 text-sm text-[var(--status-danger)]">
            Unable to load performance data.{" "}
            <span className="text-[var(--color-ink-muted)]">
              Other workspace sections remain available.
            </span>
          </p>
        ) : (
          <>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricStat
                label="Current score"
                value={
                  score != null ? (
                    <span className="tabular-nums">
                      {Math.round(score)}
                      <span className="text-base font-medium text-[var(--color-ink-muted)]">
                        {" "}
                        / 100
                      </span>
                    </span>
                  ) : (
                    "—"
                  )
                }
                hint={statusLabel ?? undefined}
              />
              <MetricStat
                label="Health"
                value={
                  workspace?.health.status
                    ? workspace.health.status.replaceAll("_", " ")
                    : "—"
                }
                hint={workspace?.health.reason || undefined}
              />
              <MetricStat
                label="Days under Commando"
                value={
                  daysUnder != null ? (
                    <span className="tabular-nums">
                      {daysUnder} {daysUnder === 1 ? "day" : "days"}
                    </span>
                  ) : (
                    "—"
                  )
                }
                hint={
                  assignment
                    ? `Since ${formatDate(assignment.startedAt)}`
                    : "No active assignment"
                }
              />
              <MetricStat
                label="Management"
                value={
                  assignment ? "Under intervention" : "Normal management"
                }
                hint={
                  assignment
                    ? personName(assignment.commando)
                    : teamLeadName
                      ? `Team Lead · ${teamLeadName}`
                      : undefined
                }
              />
            </dl>
            {metric?.scores?.length ? (
              <ul className="mt-5 grid gap-3 border-t border-[var(--color-line)] pt-4 sm:grid-cols-2 lg:grid-cols-4">
                {metric.scores.slice(0, 4).map((s) => (
                  <li key={s.id}>
                    <p className="text-xs text-[var(--color-ink-subtle)]">
                      {s.metricLabel}
                    </p>
                    <p className="mt-0.5 text-lg font-semibold tabular-nums">
                      {s.scoreValue}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}
            {metric ? (
              <p className="mt-3 text-xs text-[var(--color-ink-muted)]">
                Source: {metric.source.replaceAll("_", " ")} ·{" "}
                {formatDate(metric.evaluatedAt)}
              </p>
            ) : !metricsLoading ? (
              <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
                No performance score recorded yet.
              </p>
            ) : null}
            {metrics?.currentCommandoScore &&
            !metrics.currentCommandoScore.visible ? (
              <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
                Commando performance scores are not available during an active
                assignment.
              </p>
            ) : null}
          </>
        )}
      </section>

      {/* Current intervention */}
      <section
        className={`border px-4 py-4 sm:px-5 ${
          assignment
            ? "border-[var(--color-brand)]/30 bg-[var(--color-brand-soft)]/40"
            : "border-[var(--color-line)] bg-[var(--color-surface)]"
        }`}
        aria-labelledby="intervention-heading"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="intervention-heading" className="text-sm font-semibold">
              Current intervention
            </h2>
            <div className="mt-2">
              {assignment ? (
                <StatusBadge status="UNDER_INTERVENTION" label="Active" />
              ) : (
                <StatusBadge
                  status="NORMAL_MANAGEMENT"
                  label="No active intervention"
                />
              )}
            </div>
          </div>
          <Link
            href={seWorkspaceHref(profile.id, "interventions")}
            className="text-sm text-[var(--color-brand)] hover:underline"
          >
            {assignment ? "Open intervention" : "View intervention history"}
          </Link>
        </div>

        {assignment ? (
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs text-[var(--color-ink-subtle)]">Started</dt>
              <dd className="mt-0.5 text-sm font-semibold">
                {formatDate(assignment.startedAt)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--color-ink-subtle)]">Day</dt>
              <dd className="mt-0.5 text-sm font-semibold tabular-nums">
                {daysUnder != null ? `Day ${daysUnder}` : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--color-ink-subtle)]">Commando</dt>
              <dd className="mt-0.5 text-sm font-semibold">
                {personName(assignment.commando)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--color-ink-subtle)]">
                Team Lead
              </dt>
              <dd className="mt-0.5 text-sm font-semibold">
                {personName(assignment.teamLead)}
              </dd>
            </div>
            {interventionFocus ? (
              <div className="sm:col-span-2 lg:col-span-4">
                <dt className="text-xs text-[var(--color-ink-subtle)]">Focus</dt>
                <dd className="mt-0.5 text-sm text-[var(--color-ink)]">
                  {truncate(interventionFocus, 220)}
                </dd>
              </div>
            ) : null}
            {referral ? (
              <div className="sm:col-span-2 lg:col-span-4">
                <Link
                  href={`/referrals/${referral.id}`}
                  className="text-sm text-[var(--color-brand)] hover:underline"
                >
                  Open management packet
                </Link>
                <span className="ml-2 text-xs text-[var(--color-ink-muted)]">
                  {referral.status.replaceAll("_", " ")}
                </span>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
            This Sales Executive is currently under normal management
            {teamLeadName ? ` by ${teamLeadName}` : ""}.
          </p>
        )}

        {isCommando && assignment && nextWorkspaceAction ? (
          <p className="mt-4 border-t border-[var(--color-line)] pt-3 text-sm">
            <span className="font-medium">Next: </span>
            {nextWorkspaceAction.label}
            <span className="text-[var(--color-ink-muted)]">
              {" "}
              · {nextWorkspaceAction.owner}
            </span>
          </p>
        ) : null}
        {isTl && !assignment && referral ? (
          <p className="mt-4 border-t border-[var(--color-line)] pt-3 text-sm text-[var(--color-ink-muted)]">
            Latest handoff: {referral.status.replaceAll("_", " ")} ·{" "}
            <Link
              href={`/referrals/${referral.id}`}
              className="text-[var(--color-brand)] hover:underline"
            >
              Open
            </Link>
          </p>
        ) : null}
      </section>

      {/* Needs attention */}
      {(attention.length > 0 ||
        overdueCount > 0 ||
        nextWorkspaceAction ||
        overdueSupportTasks.length > 0) && (
        <section
          className="border border-[var(--status-warn)]/30 bg-[var(--status-warn-bg)]/40 px-4 py-4 sm:px-5"
          aria-labelledby="attention-heading"
        >
          <h2 id="attention-heading" className="text-sm font-semibold">
            Needs attention
          </h2>
          <ul className="mt-3 space-y-2">
            {attention.map((item) => (
              <li key={item.code} className="text-sm">
                <Link
                  href={attentionHref(profile.id, item.code, referral?.id)}
                  className="font-medium text-[var(--color-ink)] hover:underline"
                >
                  {item.label}
                </Link>
                {item.reason ? (
                  <span className="text-[var(--color-ink-muted)]">
                    {" "}
                    — {item.reason}
                  </span>
                ) : null}
              </li>
            ))}
            {overdueCount > 0 &&
              !attention.some((a) => a.code === "ACTIONS_OVERDUE") && (
                <li className="text-sm">
                  <Link
                    href={seWorkspaceHref(profile.id, "actions")}
                    className="font-medium hover:underline"
                  >
                    {overdueCount} overdue{" "}
                    {overdueCount === 1 ? "action" : "actions"}
                  </Link>
                </li>
              )}
            {overdueSupportTasks.length > 0 && canViewSupport ? (
              <li className="text-sm">
                <Link
                  href={seWorkspaceHref(profile.id, "support")}
                  className="font-medium hover:underline"
                >
                  {overdueSupportTasks.length} overdue support{" "}
                  {overdueSupportTasks.length === 1 ? "task" : "tasks"}
                </Link>
              </li>
            ) : null}
          </ul>
          {nextWorkspaceAction ? (
            <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
              Suggested next step ({nextWorkspaceAction.owner}):{" "}
              <span className="text-[var(--color-ink)]">
                {nextWorkspaceAction.label}
              </span>
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-3">
            {overdueCount > 0 ? (
              <Link
                href={seWorkspaceHref(profile.id, "actions")}
                className="text-sm text-[var(--color-brand)] hover:underline"
              >
                View actions
              </Link>
            ) : null}
            {isCommando && assignment ? (
              <Link
                href={seCreateHref(profile.id, "daily-log")}
                className="text-sm text-[var(--color-brand)] hover:underline"
              >
                Log coaching
              </Link>
            ) : null}
          </div>
        </section>
      )}

      {/* Actions + Support */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="surface p-4 sm:p-5" aria-labelledby="actions-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="actions-heading" className="text-sm font-semibold">
              Action items
            </h2>
            <Link
              href={seWorkspaceHref(profile.id, "actions")}
              className="text-sm text-[var(--color-brand)] hover:underline"
            >
              View all
            </Link>
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-3">
            <Stat label="Open" value={openActions.length} />
            <Stat
              label="Overdue"
              value={overdueCount}
              emphasize={overdueCount > 0}
            />
            <Stat label="Completed" value={completedActions.length} />
          </dl>
          {nextActionItem ? (
            <div className="mt-4 border-t border-[var(--color-line)] pt-3">
              <p className="text-xs text-[var(--color-ink-subtle)]">Next due</p>
              <Link
                href={`/action-items/${nextActionItem.id}`}
                className="mt-0.5 block text-sm font-medium hover:underline"
              >
                {nextActionItem.title}
              </Link>
              <p className="text-xs text-[var(--color-ink-muted)]">
                Due {formatDate(nextActionItem.dueDate)}
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-[var(--color-ink-muted)]">
              No open action items. There are currently no outstanding actions.
            </p>
          )}
        </section>

        {canViewSupport ? (
          <section
            className="surface p-4 sm:p-5"
            aria-labelledby="support-heading"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="support-heading" className="text-sm font-semibold">
                Support
              </h2>
              <Link
                href={seWorkspaceHref(profile.id, "support")}
                className="text-sm text-[var(--color-brand)] hover:underline"
              >
                Open Support
              </Link>
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-3">
              <Stat
                label="Active support"
                value={supportTeam?.activeSupport.length ?? 0}
              />
              <Stat label="Active tasks" value={activeSupportTasks.length} />
              <Stat label="Completed" value={completedSupportTasks.length} />
            </dl>
            {supportTeam?.activeSupport.length ? (
              <ul className="mt-4 space-y-2 border-t border-[var(--color-line)] pt-3">
                {supportTeam.activeSupport.slice(0, 3).map((link) => (
                  <li key={link.id} className="text-sm">
                    <span className="font-medium">
                      {personName(link.supportUser)}
                    </span>
                    {link.responsibilityType ? (
                      <span className="text-[var(--color-ink-muted)]">
                        {" "}
                        · {responsibilityTypeLabel(link.responsibilityType)}
                      </span>
                    ) : null}
                    <span className="ml-2 text-xs text-[var(--color-ink-muted)]">
                      Active
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-[var(--color-ink-muted)]">
                No active Support assignments. Support assigned to this Sales
                Executive will appear here.
              </p>
            )}
          </section>
        ) : (
          <section className="surface p-4 sm:p-5" aria-labelledby="eisen-heading">
            <EisenhowerSummary
              profileId={profile.id}
              monthLabel={monthLabel}
              byCat={byCat}
              taskCount={currentMonthTasks.length}
              lastReviewed={lastEisenhowerReview}
            />
          </section>
        )}
      </div>

      {canViewSupport ? (
        <section className="surface p-4 sm:p-5" aria-labelledby="eisen-heading">
          <EisenhowerSummary
            profileId={profile.id}
            monthLabel={monthLabel}
            byCat={byCat}
            taskCount={currentMonthTasks.length}
            lastReviewed={lastEisenhowerReview}
          />
        </section>
      ) : null}

      {/* Reviews preview */}
      <section className="surface overflow-hidden" aria-labelledby="reviews-heading">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-line)] px-4 py-3">
          <h2 id="reviews-heading" className="text-sm font-semibold">
            Recent reviews
          </h2>
          <Link
            href={seWorkspaceHref(profile.id, "reviews")}
            className="text-sm text-[var(--color-brand)] hover:underline"
          >
            View all reviews
          </Link>
        </div>
        {recentReviews.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="No reviews yet"
              description="Weekly reviews will appear here once submitted."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Week</th>
                  <th>Commando</th>
                  <th>Team Lead</th>
                  <th>Status</th>
                  <th>Key action</th>
                </tr>
              </thead>
              <tbody>
                {recentReviews.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link
                        href={`/weekly-reviews/${r.id}?returnTo=${encodeURIComponent(seWorkspaceHref(profile.id, "reviews"))}`}
                        className="font-medium hover:underline"
                      >
                        {r.weekLabel}
                      </Link>
                    </td>
                    <td>{personName(r.commando)}</td>
                    <td>{personName(r.teamLead)}</td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td
                      className="max-w-[14rem] truncate"
                      title={r.nextWeekAction}
                    >
                      {r.nextWeekAction || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent activity + feedback */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section
          className="surface p-4 sm:p-5"
          aria-labelledby="activity-heading"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="activity-heading" className="text-sm font-semibold">
              Recent activity
            </h2>
            <Link
              href={seWorkspaceHref(profile.id, "history")}
              className="text-sm text-[var(--color-brand)] hover:underline"
            >
              View history
            </Link>
          </div>
          {recentActivity.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--color-ink-muted)]">
              No recent activity recorded for this Sales Executive.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-[var(--color-line)]">
              {recentActivity.map((ev, i) => (
                <li key={`${ev.at}-${ev.type}-${i}`} className="py-2.5">
                  <p className="text-xs text-[var(--color-ink-subtle)]">
                    {activityDayLabel(ev.at)}
                  </p>
                  {ev.href ? (
                    <Link
                      href={ev.href}
                      className="text-sm font-medium hover:underline"
                    >
                      {ev.title}
                    </Link>
                  ) : (
                    <p className="text-sm font-medium">{ev.title}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          className="surface p-4 sm:p-5"
          aria-labelledby="feedback-heading"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="feedback-heading" className="text-sm font-semibold">
              Latest feedback
            </h2>
            <Link
              href={seWorkspaceHref(profile.id, "feedback")}
              className="text-sm text-[var(--color-brand)] hover:underline"
            >
              View feedback
            </Link>
          </div>
          {latestFeedback ? (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-[var(--color-ink-muted)]">
                {latestFeedback.source.replaceAll("_", " ")}
                {latestFeedback.createdBy
                  ? ` · ${personName(latestFeedback.createdBy)}`
                  : ""}{" "}
                · {formatDate(latestFeedback.createdAt)}
              </p>
              <p className="text-sm whitespace-pre-wrap text-[var(--color-ink)]">
                {truncate(latestFeedback.body, 280)}
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-[var(--color-ink-muted)]">
              No feedback yet. Feedback from authorized reviewers will appear
              here when available.
            </p>
          )}
        </section>
      </div>

      {/* SWOT by source */}
      <section className="space-y-3" aria-labelledby="swot-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="swot-heading" className="text-sm font-semibold">
            SWOT
          </h2>
          {canEditSelfSwot ? (
            <Link
              href={seCreateHref(profile.id, "swot")}
              className="text-sm text-[var(--color-brand)] hover:underline"
            >
              {isSe ? "Edit my SWOT" : "Update SWOT"}
            </Link>
          ) : null}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <SwotCard
            title="Team Lead / Management"
            swot={tlSwot}
            empty="No Team Lead SWOT recorded yet."
          />
          <SwotCard
            title="Sales Executive"
            swot={selfSwot}
            empty="No self-assessment recorded yet."
            hint={isSe ? "Your own SWOT" : undefined}
          />
          <SwotCard
            title="Commando"
            swot={commandoSwot}
            empty={
              duringCommando && !afterCommando && !commandoSwot
                ? "Not yet available. The Commando SWOT becomes available after the assignment completes."
                : "No Commando SWOT recorded yet."
            }
            locked={Boolean(duringCommando && !afterCommando && !commandoSwot)}
          />
        </div>
      </section>
    </div>
  );
}

function EisenhowerSummary({
  profileId,
  monthLabel,
  byCat,
  taskCount,
  lastReviewed,
}: {
  profileId: string;
  monthLabel: string;
  byCat: {
    DO_FIRST: EisenhowerTask[];
    SCHEDULE: EisenhowerTask[];
    DELEGATE: EisenhowerTask[];
    ELIMINATE: EisenhowerTask[];
  };
  taskCount: number;
  lastReviewed?: string | null;
}) {
  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="eisen-heading" className="text-sm font-semibold">
          Monthly Eisenhower
        </h2>
        <Link
          href={seWorkspaceHref(profileId, "eisenhower")}
          className="text-sm text-[var(--color-brand)] hover:underline"
        >
          Open Eisenhower
        </Link>
      </div>
      <p className="mt-1 text-xs text-[var(--color-ink-muted)]">{monthLabel}</p>
      {taskCount === 0 ? (
        <p className="mt-4 text-sm text-[var(--color-ink-muted)]">
          No monthly priorities yet. Eisenhower tasks for this month will
          summarize here.
        </p>
      ) : (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Stat label="Do now" value={byCat.DO_FIRST.length} />
            <Stat label="Schedule" value={byCat.SCHEDULE.length} />
            <Stat label="Delegate" value={byCat.DELEGATE.length} />
            <Stat label="Eliminate" value={byCat.ELIMINATE.length} />
          </dl>
          {lastReviewed ? (
            <p className="mt-3 text-xs text-[var(--color-ink-muted)]">
              Last reviewed {formatDate(lastReviewed)}
            </p>
          ) : null}
        </>
      )}
    </>
  );
}

function MetricStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <dt className="text-xs text-[var(--color-ink-subtle)]">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tracking-tight text-[var(--color-ink)]">
        {value}
      </dd>
      {hint ? (
        <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: number;
  emphasize?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-[var(--color-ink-subtle)]">{label}</dt>
      <dd
        className={`mt-0.5 text-lg font-semibold tabular-nums ${
          emphasize ? "text-[var(--status-danger)]" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function SwotCard({
  title,
  swot,
  empty,
  hint,
  locked,
}: {
  title: string;
  swot: SwotItem | null;
  empty: string;
  hint?: string;
  locked?: boolean;
}) {
  return (
    <article className="surface p-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-subtle)]">
        {title}
      </h3>
      {hint ? (
        <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">{hint}</p>
      ) : null}
      {swot ? (
        <div className="mt-3 space-y-2 text-sm">
          <p className="text-xs text-[var(--color-ink-muted)]">
            {swotLabel(swot.source)} · {formatDate(swot.createdAt)}
          </p>
          <Field label="Strengths" value={truncate(swot.strength, 100)} />
          <Field label="Weaknesses" value={truncate(swot.weakness, 100)} />
          <Field
            label="Opportunities"
            value={truncate(swot.opportunity, 100)}
          />
          <Field label="Threats" value={truncate(swot.threat, 100)} />
          <Link
            href={`/swot/${swot.id}`}
            className="inline-block text-sm text-[var(--color-brand)] hover:underline"
          >
            Open SWOT
          </Link>
        </div>
      ) : (
        <p
          className={`mt-3 text-sm ${locked ? "text-[var(--color-ink-muted)]" : "text-[var(--color-ink-muted)]"}`}
        >
          {empty}
        </p>
      )}
    </article>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-[var(--color-ink-subtle)]">{label}</p>
      <p className="mt-0.5 whitespace-pre-wrap text-[var(--color-ink)]">
        {value || "—"}
      </p>
    </div>
  );
}
