"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Target,
} from "lucide-react";
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
import { formatDate, formatWhen } from "@/lib/dates";
import { personName } from "@/lib/labels";
import { seCreateHref, seWorkspaceHref } from "@/lib/se-workspace-nav";
import { StatusBadge } from "@/components/StatusBadge";
import { ButtonLink, Skeleton } from "@/components/ui";

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
  managementActions?: ReactNode;
};

function latestBySource(swots: SwotItem[], source: SwotItem["source"]) {
  return (
    swots
      .filter((s) => s.source === source)
      .slice()
      .sort((a, b) => {
        const av = a.versionNumber ?? 0;
        const bv = b.versionNumber ?? 0;
        if (bv !== av) return bv - av;
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      })[0] ?? null
  );
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

type AttentionItem = {
  key: string;
  title: string;
  meta: string;
  href: string;
  tone: "warn" | "danger" | "info";
};

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

  const metric = metrics?.myPerformanceMetric ?? null;
  const score = metric?.averageMetricScore ?? metric?.rating ?? null;

  const openActions = actions.filter((a) => a.status === "ACTIVE");
  const overdueFromWorkspace = workspace?.overdueActions ?? [];
  const overdueCount =
    overdueFromWorkspace.length ||
    openActions.filter(isOverdueAction).length;
  const nextActionItem = nextDueAction(openActions);
  const overdueSupportTasks = supportTasks.filter((t) => t.isOverdue);

  const selfSwot = latestBySource(swots, "SALES_EXECUTIVE");
  const tlSwot = latestBySource(swots, "TEAM_LEAD");
  const commandoSwot = latestBySource(swots, "COMMANDO");
  const attention = workspace?.attention ?? [];
  const nextWorkspaceAction = workspace?.nextAction ?? null;
  const recentActivity = timeline.slice(0, 5);
  const recentReviews = reviews.slice(0, 3);

  const teamLeadName = assignment
    ? personName(assignment.teamLead)
    : profile.assignmentHistory[0]
      ? personName(profile.assignmentHistory[0].teamLead)
      : null;

  const currentMonthTasks = eisenhower.filter((t) => t.isCurrentMonth);
  const goalPreview = currentMonthTasks.slice(0, 3);

  const attentionItems: AttentionItem[] = [];
  for (const item of attention) {
    attentionItems.push({
      key: item.code,
      title: item.label,
      meta: item.reason,
      href: attentionHref(profile.id, item.code, referral?.id),
      tone:
        item.code.includes("OVERDUE") || item.code.includes("RISK")
          ? "danger"
          : "warn",
    });
  }
  if (overdueCount > 0 && !attention.some((a) => a.code === "ACTIONS_OVERDUE")) {
    attentionItems.push({
      key: "overdue-actions",
      title: "Overdue assignments",
      meta: `${overdueCount} action${overdueCount === 1 ? "" : "s"} past due`,
      href: seWorkspaceHref(profile.id, "actions"),
      tone: "danger",
    });
  }
  if (
    overdueSupportTasks.length > 0 &&
    !attention.some((a) => a.code.includes("SUPPORT"))
  ) {
    attentionItems.push({
      key: "overdue-support",
      title: "Overdue support tasks",
      meta: `${overdueSupportTasks.length} task${overdueSupportTasks.length === 1 ? "" : "s"} need attention`,
      href: seWorkspaceHref(profile.id, "support"),
      tone: "warn",
    });
  }

  const hasAttention = attentionItems.length > 0;
  const primaryNext =
    nextWorkspaceAction?.label ||
    nextActionItem?.title ||
    (hasAttention ? attentionItems[0]?.title : null);

  return (
    <div className="space-y-5">
      {/* Primary actions — only when relevant */}
      {(!isSe && managementActions) ||
      (isSe && (canEditSelfSwot || assignment)) ? (
        <div className="flex flex-wrap items-center gap-2">
          {managementActions}
          {isSe && assignment && !managementActions ? (
            <Link
              href={seWorkspaceHref(profile.id, "history")}
              className="btn btn-secondary btn-sm"
            >
              Review intervention
            </Link>
          ) : null}
        </div>
      ) : isSe && !hasAttention ? (
        <p className="text-sm text-[var(--color-ink-muted)]">
          No action required right now.
        </p>
      ) : null}

      {/* Attention + status — primary row */}
      <div className="grid gap-3 lg:grid-cols-12 lg:items-stretch">
        <section
          aria-labelledby="attention-heading"
          className={`rounded-[var(--radius-md)] border p-4 sm:p-5 lg:col-span-7 ${
            hasAttention
              ? "border-[var(--status-warn-ring)] bg-[var(--status-warn-bg)]"
              : "border-[var(--color-line)] bg-[var(--color-surface)]"
          }`}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-subtle)]">
            What needs attention
          </p>
          <h2
            id="attention-heading"
            className="mt-1 text-[15px] font-semibold tracking-tight text-[var(--color-ink)]"
          >
            {hasAttention
              ? `${attentionItems.length} item${attentionItems.length === 1 ? "" : "s"}`
              : "You're all caught up"}
          </h2>

          {!hasAttention ? (
            <div className="mt-4 flex items-start gap-3">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--status-success-bg)] text-[var(--status-success)]">
                <CheckCircle2 size={16} aria-hidden />
              </span>
              <div>
                <p className="text-sm font-medium text-[var(--status-success)]">
                  No immediate actions required
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--color-ink-muted)]">
                  {nextWorkspaceAction?.reason ||
                    "Your reviews, actions, and development items are in good shape."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ButtonLink
                    href={seWorkspaceHref(profile.id, "performance")}
                    variant="secondary"
                    size="sm"
                  >
                    View goals
                  </ButtonLink>
                  <ButtonLink
                    href={seWorkspaceHref(profile.id, "reviews")}
                    variant="ghost"
                    size="sm"
                  >
                    Weekly reviews
                  </ButtonLink>
                </div>
              </div>
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {attentionItems.map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className="group flex items-start justify-between gap-3 rounded-[var(--radius-sm)] border border-transparent bg-[var(--color-surface)]/80 px-3 py-2.5 transition hover:border-[var(--color-line)] hover:bg-[var(--color-surface)]"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--color-ink)]">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
                        {item.meta}
                      </p>
                    </div>
                    <ArrowRight
                      size={14}
                      className="mt-1 shrink-0 text-[var(--color-ink-subtle)] opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
              {nextWorkspaceAction ? (
                <li className="px-1 pt-1 text-xs text-[var(--color-ink-muted)]">
                  Next step:{" "}
                  <span className="font-medium text-[var(--color-ink)]">
                    {nextWorkspaceAction.label}
                  </span>
                  {nextWorkspaceAction.owner
                    ? ` · ${nextWorkspaceAction.owner.replaceAll("_", " ")}`
                    : ""}
                </li>
              ) : null}
            </ul>
          )}
        </section>

        <aside
          aria-labelledby="status-heading"
          className="flex flex-col rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 sm:p-5 lg:col-span-5"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-subtle)]">
            Current status
          </p>
          <h2
            id="status-heading"
            className="mt-1 text-[15px] font-semibold tracking-tight text-[var(--color-ink)]"
          >
            {assignment ? "Active intervention" : "Normal management"}
          </h2>

          {assignment ? (
            <div className="mt-3 flex-1 space-y-3">
              <StatusBadge status="UNDER_INTERVENTION" label="Under intervention" />
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-xs text-[var(--color-ink-subtle)]">Commando</dt>
                  <dd className="font-medium text-[var(--color-ink)]">
                    {personName(assignment.commando)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--color-ink-subtle)]">Started</dt>
                  <dd className="text-[var(--color-ink)]">
                    {formatWhen(assignment.startedAt)}
                  </dd>
                </div>
                {referral?.recommendationFocus || referral?.whatIsTheGap ? (
                  <div>
                    <dt className="text-xs text-[var(--color-ink-subtle)]">Focus</dt>
                    <dd className="text-[var(--color-ink-muted)]">
                      {referral.recommendationFocus || referral.whatIsTheGap}
                    </dd>
                  </div>
                ) : null}
              </dl>
              <Link
                href={
                  isSe
                    ? seWorkspaceHref(profile.id, "history")
                    : seWorkspaceHref(profile.id, "interventions")
                }
                className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-brand)] hover:underline"
              >
                View intervention
                <ArrowRight size={14} aria-hidden />
              </Link>
            </div>
          ) : (
            <div className="mt-3 flex-1">
              <p className="text-sm leading-relaxed text-[var(--color-ink-muted)]">
                No active intervention.
                {teamLeadName
                  ? ` You're under normal management by ${teamLeadName}.`
                  : " You're under normal team management."}
              </p>
              {primaryNext && hasAttention ? (
                <p className="mt-3 text-xs text-[var(--color-ink-muted)]">
                  Suggested next:{" "}
                  <span className="font-medium text-[var(--color-ink)]">
                    {primaryNext}
                  </span>
                </p>
              ) : null}
            </div>
          )}
        </aside>
      </div>

      {/* Performance — compact, no duplicated health */}
      <section
        aria-labelledby="perf-heading"
        className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2
              id="perf-heading"
              className="text-[15px] font-semibold tracking-tight text-[var(--color-ink)]"
            >
              Performance
            </h2>
            <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
              Your latest recorded score and development progress
            </p>
          </div>
          <Link
            href={seWorkspaceHref(profile.id, "performance")}
            className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-brand)] hover:underline"
          >
            View goals
            <ArrowRight size={14} aria-hidden />
          </Link>
        </div>

        {metricsLoading ? (
          <div className="mt-4 flex gap-6">
            <Skeleton className="h-12 w-20" />
            <Skeleton className="h-12 w-48" />
          </div>
        ) : metricsError ? (
          <div className="mt-4">
            <p className="text-sm text-[var(--color-ink)]">
              Unable to load performance data
            </p>
            <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
              {metricsError}
            </p>
          </div>
        ) : score != null ? (
          <div className="mt-4 flex flex-wrap items-end gap-6">
            <div>
              <p className="text-[2rem] font-semibold tabular-nums leading-none tracking-tight text-[var(--color-ink)]">
                {Math.round(score)}
                <span className="ml-1 text-sm font-medium text-[var(--color-ink-muted)]">
                  / 100
                </span>
              </p>
              {metric?.verdict ? (
                <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
                  {metric.verdict.replaceAll("_", " ")}
                </p>
              ) : null}
            </div>
            {metric?.scores?.length ? (
              <ul className="flex flex-wrap gap-4">
                {metric.scores.slice(0, 3).map((s) => (
                  <li key={s.id}>
                    <p className="text-[11px] text-[var(--color-ink-subtle)]">
                      {s.metricLabel}
                    </p>
                    <p className="text-sm font-semibold tabular-nums text-[var(--color-ink)]">
                      {s.scoreValue}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}
            {metric ? (
              <p className="w-full text-xs text-[var(--color-ink-subtle)]">
                Source: {metric.source.replaceAll("_", " ")} ·{" "}
                {formatDate(metric.evaluatedAt)}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="mt-4 flex items-start gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-canvas-2)] text-[var(--color-ink-muted)]">
              <Target size={16} aria-hidden />
            </span>
            <div>
              <p className="text-sm font-medium text-[var(--color-ink)]">
                No score yet
              </p>
              <p className="mt-1 max-w-md text-xs leading-relaxed text-[var(--color-ink-muted)]">
                Your first performance score will appear after a completed
                review. No action is required right now.
              </p>
              <Link
                href={seWorkspaceHref(profile.id, "reviews")}
                className="mt-2 inline-flex text-sm font-medium text-[var(--color-brand)] hover:underline"
              >
                View weekly reviews →
              </Link>
            </div>
          </div>
        )}

        {metrics?.currentCommandoScore &&
        !metrics.currentCommandoScore.visible ? (
          <p className="mt-3 text-xs text-[var(--color-ink-muted)]">
            Commando performance scores are not available during an active
            assignment.
          </p>
        ) : null}
      </section>

      {/* Work previews */}
      <div className="grid gap-3 lg:grid-cols-12">
        <section
          aria-labelledby="goals-preview-heading"
          className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 sm:p-5 lg:col-span-5"
        >
          <div className="flex items-center justify-between gap-2">
            <h2
              id="goals-preview-heading"
              className="text-[15px] font-semibold tracking-tight text-[var(--color-ink)]"
            >
              Goals
            </h2>
            <Link
              href={seWorkspaceHref(profile.id, "eisenhower")}
              className="text-xs font-medium text-[var(--color-brand)] hover:underline"
            >
              View all →
            </Link>
          </div>
          {goalPreview.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
              No monthly planning items yet.
            </p>
          ) : (
            <>
              <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                {currentMonthTasks.length} active this month
              </p>
              <ul className="mt-3 space-y-2">
                {goalPreview.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-start justify-between gap-2 text-sm"
                  >
                    <span className="min-w-0 truncate text-[var(--color-ink)]">
                      {t.title}
                    </span>
                    <span className="shrink-0 text-[11px] uppercase tracking-wide text-[var(--color-ink-subtle)]">
                      {t.category.replaceAll("_", " ")}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section
          aria-labelledby="actions-preview-heading"
          className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 sm:p-5 lg:col-span-3"
        >
          <div className="flex items-center justify-between gap-2">
            <h2
              id="actions-preview-heading"
              className="text-[15px] font-semibold tracking-tight text-[var(--color-ink)]"
            >
              Actions
            </h2>
            <Link
              href={seWorkspaceHref(profile.id, "actions")}
              className="text-xs font-medium text-[var(--color-brand)] hover:underline"
            >
              View →
            </Link>
          </div>
          <p className="mt-3 text-2xl font-semibold tabular-nums text-[var(--color-ink)]">
            {openActions.length}
          </p>
          <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
            open
            {overdueCount > 0 ? (
              <span className="text-[var(--status-danger)]">
                {" "}
                · {overdueCount} overdue
              </span>
            ) : null}
          </p>
          {nextActionItem ? (
            <p className="mt-3 line-clamp-2 text-xs text-[var(--color-ink-muted)]">
              Next: {nextActionItem.title}
            </p>
          ) : null}
        </section>

        <section
          aria-labelledby="reviews-preview-heading"
          className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 sm:p-5 lg:col-span-4"
        >
          <div className="flex items-center justify-between gap-2">
            <h2
              id="reviews-preview-heading"
              className="text-[15px] font-semibold tracking-tight text-[var(--color-ink)]"
            >
              Recent reviews
            </h2>
            <Link
              href={seWorkspaceHref(profile.id, "reviews")}
              className="text-xs font-medium text-[var(--color-brand)] hover:underline"
            >
              View →
            </Link>
          </div>
          {recentReviews.length === 0 ? (
            <div className="mt-3 flex items-start gap-2">
              <ClipboardList
                size={14}
                className="mt-0.5 text-[var(--color-ink-subtle)]"
                aria-hidden
              />
              <p className="text-sm text-[var(--color-ink-muted)]">
                No weekly reviews yet.
              </p>
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {recentReviews.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/weekly-reviews/${r.id}?returnTo=${encodeURIComponent(seWorkspaceHref(profile.id, "reviews"))}`}
                    className="flex items-center justify-between gap-2 text-sm hover:underline"
                  >
                    <span className="truncate font-medium text-[var(--color-ink)]">
                      {r.weekLabel || "Weekly review"}
                    </span>
                    <StatusBadge status={r.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Activity + feedback + SWOT compact */}
      <div className="grid gap-3 lg:grid-cols-12">
        <section
          aria-labelledby="activity-heading"
          className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 sm:p-5 lg:col-span-7"
        >
          <div className="flex items-center justify-between gap-2">
            <h2
              id="activity-heading"
              className="text-[15px] font-semibold tracking-tight text-[var(--color-ink)]"
            >
              Recent activity
            </h2>
            <Link
              href={seWorkspaceHref(profile.id, "history")}
              className="text-xs font-medium text-[var(--color-brand)] hover:underline"
            >
              View history →
            </Link>
          </div>
          {recentActivity.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
              Activity will appear as reviews, actions, and interventions move
              forward.
            </p>
          ) : (
            <ol className="relative mt-3 space-y-0">
              {recentActivity.map((event, index) => {
                const isLast = index === recentActivity.length - 1;
                const body = (
                  <>
                    <p className="text-sm font-medium text-[var(--color-ink)]">
                      {event.title}
                    </p>
                    <time className="mt-0.5 block text-[11px] text-[var(--color-ink-subtle)]">
                      {activityDayLabel(event.at)}
                    </time>
                  </>
                );
                return (
                  <li key={`${event.at}-${event.title}`} className="relative flex gap-3 pb-3 last:pb-0">
                    {!isLast && (
                      <span
                        className="absolute left-[5px] top-3 bottom-0 w-px bg-[var(--color-line)]"
                        aria-hidden
                      />
                    )}
                    <span
                      className="relative z-[1] mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-[var(--color-brand)] bg-[var(--color-surface)]"
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      {event.href ? (
                        <Link href={event.href} className="hover:underline">
                          {body}
                        </Link>
                      ) : (
                        body
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section
          aria-labelledby="feedback-heading"
          className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 sm:p-5 lg:col-span-5"
        >
          <div className="flex items-center justify-between gap-2">
            <h2
              id="feedback-heading"
              className="text-[15px] font-semibold tracking-tight text-[var(--color-ink)]"
            >
              Latest feedback
            </h2>
            <Link
              href={seWorkspaceHref(profile.id, "feedback")}
              className="text-xs font-medium text-[var(--color-brand)] hover:underline"
            >
              View all →
            </Link>
          </div>
          {feedback[0] ? (
            <div className="mt-3">
              <p className="line-clamp-4 text-sm leading-relaxed text-[var(--color-ink)]">
                {feedback[0].body}
              </p>
              <p className="mt-2 text-[11px] text-[var(--color-ink-subtle)]">
                {personName(feedback[0].createdBy)} ·{" "}
                {formatDate(feedback[0].createdAt)}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
              No feedback yet.
            </p>
          )}

          {(isSe || canEditSelfSwot) && (
            <div className="mt-4 border-t border-[var(--color-line)] pt-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-[var(--color-ink)]">
                  Your SWOT
                </p>
                {selfSwot ? (
                  <Link
                    href={`/swot/${selfSwot.id}`}
                    className="text-xs font-medium text-[var(--color-brand)] hover:underline"
                  >
                    Open →
                  </Link>
                ) : canEditSelfSwot ? (
                  <Link
                    href={seCreateHref(profile.id, "swot")}
                    className="text-xs font-medium text-[var(--color-brand)] hover:underline"
                  >
                    Create →
                  </Link>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                {selfSwot
                  ? `Updated ${formatDate(selfSwot.updatedAt ?? selfSwot.createdAt)}`
                  : "No self assessment yet"}
              </p>
            </div>
          )}

          {!isSe && (isTl || isCommando) ? (
            <div className="mt-4 border-t border-[var(--color-line)] pt-3 space-y-2">
              <p className="text-xs font-medium text-[var(--color-ink)]">SWOT</p>
              <ul className="space-y-1.5 text-xs text-[var(--color-ink-muted)]">
                <li>
                  Team Lead:{" "}
                  {tlSwot ? (
                    <Link
                      href={`/swot/${tlSwot.id}`}
                      className="font-medium text-[var(--color-brand)] hover:underline"
                    >
                      View
                    </Link>
                  ) : (
                    "None"
                  )}
                </li>
                <li>
                  Self:{" "}
                  {selfSwot ? (
                    <Link
                      href={`/swot/${selfSwot.id}`}
                      className="font-medium text-[var(--color-brand)] hover:underline"
                    >
                      View
                    </Link>
                  ) : (
                    "None"
                  )}
                </li>
                <li>
                  Commando:{" "}
                  {commandoSwot ? (
                    <Link
                      href={`/swot/${commandoSwot.id}`}
                      className="font-medium text-[var(--color-brand)] hover:underline"
                    >
                      View
                    </Link>
                  ) : (
                    "None"
                  )}
                </li>
              </ul>
            </div>
          ) : null}

          {canViewSupport && supportTeam ? (
            <div className="mt-3 border-t border-[var(--color-line)] pt-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-[var(--color-ink)]">
                  Support team
                </p>
                <Link
                  href={seWorkspaceHref(profile.id, "support")}
                  className="text-xs font-medium text-[var(--color-brand)] hover:underline"
                >
                  View →
                </Link>
              </div>
              <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                {supportTeam.activeSupport.length > 0
                  ? supportTeam.activeSupport
                      .map((l) => personName(l.supportUser))
                      .join(" · ")
                  : "No active support assignments"}
              </p>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
