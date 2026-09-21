"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Flag,
  History,
  Info,
  LayoutGrid,
  ListChecks,
  Plus,
  RefreshCw,
  Target,
  Users,
} from "lucide-react";
import type {
  ActionItem,
  EisenhowerCategory,
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
import { seWorkspaceHref } from "@/lib/se-workspace-nav";
import { StatusBadge } from "@/components/StatusBadge";
import { Avatar, Button, ButtonLink, PerformanceMeter, Skeleton } from "@/components/ui";

type Props = {
  profile: ProfileDetail;
  workspace: InterventionWorkspace | null;
  supportTeam: SeSupportTeamContext | null;
  metrics: PerformanceMetrics | null;
  metricsLoading: boolean;
  metricsError: string | null;
  onRetryMetrics?: () => void;
  feedback: FeedbackItem[];
  reviews: WeeklyReview[];
  swots: SwotItem[];
  actions: ActionItem[];
  eisenhower: EisenhowerTask[];
  supportTasks: SupportTask[];
  canEditSelfSwot: boolean;
  canViewSupport: boolean;
};

type PriorityItem = {
  id: string;
  title: string;
  meta: string;
  href: string;
  actionLabel: string;
  severity: "critical" | "warning" | "watch" | "info";
};

const EISENHOWER_META: Record<
  EisenhowerCategory,
  { title: string; subtitle: string; iconClass: string; icon: LucideIcon }
> = {
  DO_FIRST: {
    title: "Do first",
    subtitle: "Important + Urgent",
    iconClass:
      "bg-[var(--status-danger-bg)] text-[var(--status-danger)] ring-[var(--status-danger-ring)]",
    icon: Flag,
  },
  SCHEDULE: {
    title: "Schedule",
    subtitle: "Important",
    iconClass:
      "bg-[var(--status-info-bg)] text-[var(--status-info)] ring-[var(--status-info-ring)]",
    icon: CalendarDays,
  },
  DELEGATE: {
    title: "Delegate",
    subtitle: "Urgent",
    iconClass:
      "bg-[var(--status-warn-bg)] text-[var(--status-warn)] ring-[var(--status-warn-ring)]",
    icon: Users,
  },
  ELIMINATE: {
    title: "Eliminate",
    subtitle: "Neither",
    iconClass:
      "bg-[var(--status-neutral-bg)] text-[var(--status-neutral)] ring-[var(--status-neutral-ring)]",
    icon: Target,
  },
};

function latestBySource(swots: SwotItem[], source: SwotItem["source"]) {
  return swots.find((s) => s.source === source) ?? null;
}

function isOverdueAction(a: ActionItem) {
  if (a.status !== "ACTIVE" || !a.dueDate) return false;
  const due = new Date(a.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

function isDueSoon(a: ActionItem) {
  if (a.status !== "ACTIVE" || !a.dueDate || isOverdueAction(a)) return false;
  const due = new Date(a.dueDate).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const inWeek = today.getTime() + 7 * 86_400_000;
  return due >= today.getTime() && due <= inWeek;
}

function swotSourceLabel(source: SwotItem["source"]) {
  if (source === "TEAM_LEAD") return "Team Lead SWOT";
  if (source === "COMMANDO") return "Commando SWOT";
  return "My self-added SWOT";
}

function SectionCard({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-line)] px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-tight text-[var(--color-ink)]">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-0.5 text-[12px] text-[var(--color-ink-muted)]">
              {subtitle}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyBlock({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-start gap-2 px-4 py-7 sm:px-5">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-canvas-2)] text-[var(--color-ink-muted)]">
        <Icon size={16} strokeWidth={1.75} aria-hidden />
      </span>
      <p className="text-[13px] font-semibold text-[var(--color-ink)]">{title}</p>
      <p className="max-w-sm text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
        {description}
      </p>
    </div>
  );
}

function SwotTile({ item, title }: { item: SwotItem | null; title: string }) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface-2)]/50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-ink-subtle)]">
        {title}
      </p>
      {!item ? (
        <p className="mt-2 text-[12px] text-[var(--color-ink-muted)]">
          Not recorded yet.
        </p>
      ) : (
        <>
          <div className="mt-2.5 grid grid-cols-2 gap-1.5">
            {(
              [
                ["S", item.strength, "bg-[var(--status-success-bg)] text-[var(--status-success)]"],
                ["W", item.weakness, "bg-[var(--status-info-bg)] text-[var(--status-info)]"],
                ["O", item.opportunity, "bg-[var(--status-warn-bg)] text-[var(--status-warn)]"],
                ["T", item.threat, "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"],
              ] as const
            ).map(([k, v, tone]) => (
              <div
                key={k}
                className="rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)] p-2"
              >
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${tone}`}
                >
                  {k}
                </span>
                <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-[var(--color-ink)]">
                  {v || "—"}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-[var(--color-ink-subtle)]">
            {personName(item.createdBy)} · {formatDate(item.createdAt)}
          </p>
        </>
      )}
    </div>
  );
}

/**
 * Sales Executive personal performance workspace.
 * Managers keep SeAccountabilityOverview.
 */
export function SalesExecutiveDashboard({
  profile,
  workspace,
  supportTeam,
  metrics,
  metricsLoading,
  metricsError,
  onRetryMetrics,
  feedback,
  reviews,
  swots,
  actions,
  eisenhower,
  supportTasks,
  canEditSelfSwot,
  canViewSupport,
}: Props) {
  const assignment = profile.currentAssignment;
  const referral = workspace?.latestReferral ?? null;
  const underIntervention = Boolean(assignment);

  const myMetric = metrics?.myPerformanceMetric ?? null;
  const myScore = myMetric?.averageMetricScore ?? myMetric?.rating ?? null;
  const commandoScore = metrics?.currentCommandoScore ?? null;

  const openActions = actions.filter((a) => a.status === "ACTIVE");
  const overdueActions = openActions.filter(isOverdueAction);
  const dueSoonActions = openActions.filter(isDueSoon);
  const activeSupport = supportTasks.filter((t) => t.status !== "COMPLETED");
  const overdueSupport = supportTasks.filter((t) => t.isOverdue);
  const submittedReviews = reviews.filter((r) => r.status === "SUBMITTED");
  const draftReviews = reviews.filter((r) => r.status === "DRAFT");
  const recentReviews = reviews.slice(0, 5);

  const currentMonthTasks = eisenhower.filter((t) => t.isCurrentMonth);
  const eisenhowerCounts = (
    ["DO_FIRST", "SCHEDULE", "DELEGATE", "ELIMINATE"] as EisenhowerCategory[]
  ).map((key) => ({
    key,
    ...EISENHOWER_META[key],
    count: currentMonthTasks.filter((t) => t.category === key).length,
  }));

  const selfSwot = latestBySource(swots, "SALES_EXECUTIVE");
  const tlSwot = latestBySource(swots, "TEAM_LEAD");
  const commandoSwot = latestBySource(swots, "COMMANDO");

  const teamLeadName = assignment
    ? personName(assignment.teamLead)
    : profile.assignmentHistory[0]
      ? personName(profile.assignmentHistory[0].teamLead)
      : null;

  const supportNames =
    supportTeam?.activeSupport
      ?.map((link) => personName(link.supportUser))
      .filter(Boolean) ?? [];

  const daysUnder = assignment
    ? (workspace?.daysInIntervention ??
      assignment.totalDaysUnderCommando ??
      profile.totalDaysUnderCommando)
    : null;

  const swotHref = `/swot/new?profileId=${profile.id}&returnTo=${encodeURIComponent(seWorkspaceHref(profile.id, "overview"))}`;

  const priorities: PriorityItem[] = [];
  for (const a of overdueActions.slice(0, 4)) {
    priorities.push({
      id: `od-${a.id}`,
      title: a.title,
      meta: `Overdue action · Due ${formatDate(a.dueDate)}`,
      href: seWorkspaceHref(profile.id, "actions"),
      actionLabel: "Open actions →",
      severity: "critical",
    });
  }
  for (const t of overdueSupport.slice(0, 3)) {
    priorities.push({
      id: `sup-${t.id}`,
      title: t.title,
      meta: `Overdue support · ${personName(t.salesSupportUser)}`,
      href: seWorkspaceHref(profile.id, "support"),
      actionLabel: "Open support →",
      severity: "warning",
    });
  }
  for (const a of dueSoonActions.slice(0, 3)) {
    priorities.push({
      id: `soon-${a.id}`,
      title: a.title,
      meta: `Action due ${formatDate(a.dueDate)}`,
      href: seWorkspaceHref(profile.id, "actions"),
      actionLabel: "Open actions →",
      severity: "warning",
    });
  }
  if (draftReviews[0]) {
    priorities.push({
      id: `rev-${draftReviews[0].id}`,
      title: draftReviews[0].weekLabel || "Weekly review draft",
      meta: "Review in progress — awaiting completion",
      href: `/weekly-reviews/${draftReviews[0].id}?returnTo=${encodeURIComponent(seWorkspaceHref(profile.id, "reviews"))}`,
      actionLabel: "Open review →",
      severity: "watch",
    });
  } else if (submittedReviews[0] && !submittedReviews[0].signed) {
    priorities.push({
      id: `sign-${submittedReviews[0].id}`,
      title: submittedReviews[0].weekLabel || "Weekly review",
      meta: "Submitted — awaiting your signature",
      href: `/weekly-reviews/${submittedReviews[0].id}?returnTo=${encodeURIComponent(seWorkspaceHref(profile.id, "reviews"))}`,
      actionLabel: "Review & sign →",
      severity: "watch",
    });
  }
  if (feedback[0] && priorities.length < 6) {
    priorities.push({
      id: `fb-${feedback[0].id}`,
      title: "Latest feedback",
      meta: `${personName(feedback[0].createdBy)} · ${formatDate(feedback[0].createdAt)}`,
      href: seWorkspaceHref(profile.id, "feedback"),
      actionLabel: "Read feedback →",
      severity: "info",
    });
  }
  if (
    underIntervention &&
    workspace?.nextAction?.label &&
    priorities.length < 6
  ) {
    priorities.push({
      id: "next-ws",
      title: workspace.nextAction.label,
      meta: workspace.nextAction.reason || "Current coaching priority",
      href: seWorkspaceHref(profile.id, "overview"),
      actionLabel: "View →",
      severity: "info",
    });
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="page-hero flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-brand)]">
            Sales Executive
          </p>
          <h1 className="mt-1 text-[1.5rem] font-semibold tracking-[-0.03em] text-[var(--color-ink)]">
            My Workspace
          </h1>
          <p className="mt-1 text-[0.9375rem] text-[var(--color-ink-muted)]">
            Personal performance and development overview
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEditSelfSwot ? (
            <ButtonLink href={swotHref} variant="secondary" size="sm">
              <Plus size={14} aria-hidden />
              Add my SWOT
            </ButtonLink>
          ) : null}
          <ButtonLink
            href={seWorkspaceHref(profile.id, "history")}
            variant="ghost"
            size="sm"
          >
            History
          </ButtonLink>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12 xl:items-start">
        {/* PRIMARY */}
        <div className="min-w-0 space-y-4 xl:col-span-8">
          {/* Current performance summary */}
          <SectionCard
            title="Current performance summary"
            subtitle={`${profile.displayName} · ${profile.team.name}`}
          >
            <div className="grid gap-0 lg:grid-cols-2">
              <div className="border-b border-[var(--color-line)] px-4 py-4 sm:px-5 lg:border-b-0 lg:border-r">
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-ink-subtle)]">
                  Management state
                </p>
                <div className="mt-2.5">
                  {underIntervention ? (
                    <StatusBadge
                      status="UNDER_INTERVENTION"
                      label="Active Commando intervention"
                    />
                  ) : (
                    <StatusBadge
                      status="NORMAL_MANAGEMENT"
                      label="Normal Team Lead management"
                    />
                  )}
                </div>
                {underIntervention && assignment ? (
                  <dl className="mt-3 space-y-2 text-[13px]">
                    <div>
                      <dt className="text-[12px] text-[var(--color-ink-muted)]">
                        Current Commando
                      </dt>
                      <dd className="font-medium text-[var(--color-ink)]">
                        {personName(assignment.commando)}
                      </dd>
                    </div>
                    {daysUnder != null ? (
                      <div>
                        <dt className="text-[12px] text-[var(--color-ink-muted)]">
                          Days under Commando
                        </dt>
                        <dd className="font-medium tabular-nums text-[var(--color-ink)]">
                          {daysUnder}
                          {assignment.startedAt
                            ? ` · since ${formatWhen(assignment.startedAt)}`
                            : ""}
                        </dd>
                      </div>
                    ) : null}
                    {referral?.recommendationFocus || referral?.whatIsTheGap ? (
                      <div>
                        <dt className="text-[12px] text-[var(--color-ink-muted)]">
                          Current focus
                        </dt>
                        <dd className="text-[var(--color-ink-muted)]">
                          {referral.recommendationFocus || referral.whatIsTheGap}
                        </dd>
                      </div>
                    ) : null}
                    {teamLeadName ? (
                      <div>
                        <dt className="text-[12px] text-[var(--color-ink-muted)]">
                          Team Lead (permanent owner)
                        </dt>
                        <dd className="font-medium text-[var(--color-ink)]">
                          {teamLeadName}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                ) : (
                  <p className="mt-3 text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
                    You are not under an active Commando intervention.
                    {teamLeadName
                      ? ` ${teamLeadName} remains your Team Lead.`
                      : " Your Team Lead manages day-to-day performance."}
                  </p>
                )}
              </div>

              <div className="px-4 py-4 sm:px-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-ink-subtle)]">
                  Performance
                </p>
                {metricsLoading ? (
                  <div className="mt-3 space-y-2">
                    <Skeleton className="h-9 w-20" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                ) : metricsError ? (
                  <div className="mt-3 rounded-[var(--radius-sm)] border border-[var(--status-danger-ring)] bg-[var(--status-danger-bg)] p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle
                        size={16}
                        className="mt-0.5 shrink-0 text-[var(--status-danger)]"
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[var(--color-ink)]">
                          Performance data unavailable
                        </p>
                        <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
                          Unable to load your latest performance data.
                        </p>
                        {onRetryMetrics ? (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="mt-2.5"
                            onClick={() => onRetryMetrics()}
                          >
                            <RefreshCw size={13} aria-hidden />
                            Retry
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3">
                    {myScore != null ? (
                      <PerformanceMeter
                        value={myScore}
                        className="max-w-[14rem]"
                      />
                    ) : (
                      <p className="text-[1.75rem] font-semibold tabular-nums tracking-tight text-[var(--color-ink)]">
                        —
                      </p>
                    )}
                    <p className="mt-2 text-[12px] text-[var(--color-ink-muted)]">
                      {myMetric
                        ? `My metric · ${myMetric.source.replaceAll("_", " ")} · ${formatDate(myMetric.evaluatedAt)}`
                        : "No personal performance score yet"}
                    </p>
                    {myMetric?.verdict ? (
                      <p className="mt-1 text-[13px] text-[var(--color-ink-muted)]">
                        {myMetric.verdict.replaceAll("_", " ")}
                      </p>
                    ) : null}
                    {myMetric?.scores?.length ? (
                      <ul className="mt-3 flex flex-wrap gap-3">
                        {myMetric.scores.slice(0, 4).map((s) => (
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
                  </div>
                )}
                {commandoScore && !commandoScore.visible ? (
                  <p className="mt-3 text-[12px] text-[var(--color-ink-muted)]">
                    {commandoScore.hiddenReason ||
                      "Commando performance scores are not visible during an active assignment."}
                  </p>
                ) : null}
                {commandoScore?.visible &&
                commandoScore.averageMetricScore != null ? (
                  <p className="mt-3 text-[12px] text-[var(--color-ink-muted)]">
                    Commando score:{" "}
                    <span className="font-medium tabular-nums text-[var(--color-ink)]">
                      {Math.round(commandoScore.averageMetricScore)}
                    </span>
                    {commandoScore.evaluatedAt
                      ? ` · ${formatDate(commandoScore.evaluatedAt)}`
                      : ""}
                  </p>
                ) : null}
                <Link
                  href={seWorkspaceHref(profile.id, "performance")}
                  className="mt-4 inline-block text-[13px] font-medium text-[var(--color-brand)] hover:underline"
                >
                  Open performance details →
                </Link>
              </div>
            </div>
          </SectionCard>

          {/* Current priorities */}
          <section
            className={`overflow-hidden rounded-[var(--radius-md)] border shadow-[var(--shadow-sm)] ${
              priorities.length > 0
                ? "border-[var(--status-warn-ring)] bg-[var(--color-surface)]"
                : "border-[var(--color-line)] bg-[var(--color-surface)]"
            }`}
          >
            <div
              className={`flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3.5 sm:px-5 ${
                priorities.length > 0
                  ? "border-[var(--status-warn-ring)] bg-[var(--status-warn-bg)]/70"
                  : "border-[var(--color-line)]"
              }`}
            >
              <div>
                <h2 className="text-[15px] font-semibold tracking-tight text-[var(--color-ink)]">
                  Current priorities
                </h2>
                <p className="mt-0.5 text-[12px] text-[var(--color-ink-muted)]">
                  What you should work on next
                </p>
              </div>
              {priorities.length > 0 ? (
                <Link
                  href={seWorkspaceHref(profile.id, "actions")}
                  className="text-[13px] font-medium text-[var(--color-brand)] hover:underline"
                >
                  View all priorities →
                </Link>
              ) : (
                <span
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--status-success-bg)] text-[var(--status-success)]"
                  aria-hidden
                >
                  <CheckCircle2 size={16} />
                </span>
              )}
            </div>
            {priorities.length === 0 ? (
              <div className="px-4 py-6 sm:px-5">
                <p className="text-[13px] font-medium text-[var(--status-success)]">
                  Nothing urgent right now
                </p>
                <p className="mt-1 text-[12px] text-[var(--color-ink-muted)]">
                  Overdue actions, upcoming reviews, and support follow-ups will
                  appear here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--color-line)]">
                {priorities.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 sm:px-5"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-2.5">
                      <span
                        className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                          item.severity === "critical"
                            ? "bg-[var(--status-danger-bg)] text-[var(--status-danger)]"
                            : item.severity === "warning"
                              ? "bg-[var(--status-warn-bg)] text-[var(--status-warn)]"
                              : "bg-[var(--status-info-bg)] text-[var(--status-info)]"
                        }`}
                        aria-hidden
                      >
                        <Info size={12} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[var(--color-ink)]">
                          {item.title}
                        </p>
                        <p className="mt-0.5 text-[12px] text-[var(--color-ink-muted)]">
                          {item.meta}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={item.href}
                      className="shrink-0 text-[13px] font-medium text-[var(--color-brand)] hover:underline"
                    >
                      {item.actionLabel}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Reviews + Actions row */}
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard
              title="Reviews"
              subtitle="Recent weekly reviews and resulting actions"
              action={
                <Link
                  href={seWorkspaceHref(profile.id, "reviews")}
                  className="text-[13px] font-medium text-[var(--color-brand)] hover:underline"
                >
                  View all →
                </Link>
              }
            >
              {recentReviews.length === 0 ? (
                <EmptyBlock
                  icon={ClipboardList}
                  title="No weekly reviews yet"
                  description="Reviews from your Team Lead or Commando will appear here."
                />
              ) : (
                <ul className="divide-y divide-[var(--color-line)]">
                  {recentReviews.map((r) => (
                    <li key={r.id} className="px-4 py-3 sm:px-5">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/weekly-reviews/${r.id}?returnTo=${encodeURIComponent(seWorkspaceHref(profile.id, "reviews"))}`}
                          className="text-[13px] font-semibold text-[var(--color-ink)] hover:underline"
                        >
                          {r.weekLabel || "Weekly review"}
                        </Link>
                        <StatusBadge status={r.status} />
                      </div>
                      <p className="mt-1 text-[12px] text-[var(--color-ink-muted)]">
                        {formatDate(r.meetingDate || r.weekStartDate)}
                        {r.nextWeekAction
                          ? ` · ${r.nextWeekAction}`
                          : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard
              title="Assignment"
              subtitle="Your current open follow-through items"
              action={
                <Link
                  href={seWorkspaceHref(profile.id, "actions")}
                  className="text-[13px] font-medium text-[var(--color-brand)] hover:underline"
                >
                  View all →
                </Link>
              }
            >
              {openActions.length === 0 ? (
                <EmptyBlock
                  icon={ListChecks}
                  title="No open assignments"
                  description="Assignments from reviews and coaching will appear here."
                />
              ) : (
                <ul className="divide-y divide-[var(--color-line)]">
                  {openActions.slice(0, 6).map((a) => {
                    const overdue = isOverdueAction(a);
                    return (
                      <li
                        key={a.id}
                        className="flex items-start justify-between gap-3 px-4 py-3 sm:px-5"
                      >
                        <div className="min-w-0">
                          <Link
                            href={`/action-items/${a.id}?returnTo=${encodeURIComponent(seWorkspaceHref(profile.id, "actions"))}`}
                            className="text-[13px] font-semibold text-[var(--color-ink)] hover:underline"
                          >
                            {a.title}
                          </Link>
                          <p
                            className={`mt-1 text-[12px] tabular-nums ${
                              overdue
                                ? "font-medium text-[var(--status-danger)]"
                                : "text-[var(--color-ink-muted)]"
                            }`}
                          >
                            Due {formatDate(a.dueDate)}
                            {overdue ? " · Overdue" : ""}
                          </p>
                        </div>
                        <StatusBadge
                          status={overdue ? "OVERDUE" : a.status}
                          label={overdue ? "Overdue" : undefined}
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </SectionCard>
          </div>

          {/* SWOT */}
          <SectionCard
            title="SWOT"
            subtitle="Separated by who recorded it — sources are not merged"
            action={
              canEditSelfSwot ? (
                <Link
                  href={swotHref}
                  className="text-[13px] font-medium text-[var(--color-brand)] hover:underline"
                >
                  Add my SWOT →
                </Link>
              ) : null
            }
          >
            <div className="grid gap-3 p-4 sm:grid-cols-3 sm:px-5">
              <SwotTile item={tlSwot} title={swotSourceLabel("TEAM_LEAD")} />
              <SwotTile
                item={selfSwot}
                title={swotSourceLabel("SALES_EXECUTIVE")}
              />
              <SwotTile
                item={commandoSwot}
                title={swotSourceLabel("COMMANDO")}
              />
            </div>
          </SectionCard>

          {/* Latest feedback */}
          <SectionCard
            title="Latest feedback"
            subtitle="Recent guidance from Team Lead or Commando"
            action={
              <Link
                href={seWorkspaceHref(profile.id, "feedback")}
                className="text-[13px] font-medium text-[var(--color-brand)] hover:underline"
              >
                View all →
              </Link>
            }
          >
            {feedback.length === 0 ? (
              <EmptyBlock
                icon={Info}
                title="No feedback yet"
                description="Guidance from your Team Lead or Commando will appear here."
              />
            ) : (
              <ul className="divide-y divide-[var(--color-line)]">
                {feedback.slice(0, 3).map((f) => (
                  <li
                    key={f.id}
                    className="flex items-start gap-3 px-4 py-3.5 sm:px-5"
                  >
                    <Avatar name={personName(f.createdBy)} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[13px] font-semibold text-[var(--color-ink)]">
                          {personName(f.createdBy)}
                        </p>
                        <StatusBadge
                          status={f.source}
                          label={f.source.replaceAll("_", " ")}
                        />
                        <time className="text-[11px] tabular-nums text-[var(--color-ink-subtle)]">
                          {formatDate(f.createdAt)}
                        </time>
                      </div>
                      <p className="mt-1.5 line-clamp-3 text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
                        {f.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        {/* SECONDARY */}
        <aside className="space-y-4 xl:col-span-4">
          <SectionCard title="Quick actions">
            <ul className="p-2">
              {[
                canEditSelfSwot
                  ? {
                      href: swotHref,
                      label: "Add my SWOT",
                      icon: Plus,
                    }
                  : null,
                {
                  href: seWorkspaceHref(profile.id, "history"),
                  label: "View history",
                  icon: History,
                },
                {
                  href: seWorkspaceHref(profile.id, "performance"),
                  label: "Open performance",
                  icon: Target,
                },
                {
                  href: seWorkspaceHref(profile.id, "eisenhower"),
                  label: "Open monthly planning",
                  icon: LayoutGrid,
                },
              ]
                .filter(Boolean)
                .map((item) => {
                  const Icon = item!.icon;
                  return (
                    <li key={item!.href}>
                      <Link
                        href={item!.href}
                        className="flex items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2.5 text-[13px] font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-surface-2)]"
                      >
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-canvas-2)] text-[var(--color-ink-muted)]">
                          <Icon size={14} strokeWidth={1.75} aria-hidden />
                        </span>
                        {item!.label}
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </SectionCard>

          <SectionCard
            title="Performance progress"
            subtitle="Snapshot of your current and recent state"
            action={
              <Link
                href={seWorkspaceHref(profile.id, "performance")}
                className="text-[12px] font-medium text-[var(--color-brand)] hover:underline"
              >
                Full details →
              </Link>
            }
          >
            <div className="grid grid-cols-2 gap-2.5 p-3 sm:p-4">
              {(
                [
                  {
                    label: "Open actions",
                    value: openActions.length,
                    hint:
                      overdueActions.length > 0
                        ? `${overdueActions.length} overdue`
                        : "None overdue",
                    tone: "bg-[var(--status-success-bg)] text-[var(--status-success)] ring-[var(--status-success-ring)]",
                    icon: ListChecks,
                  },
                  {
                    label: "Reviews",
                    value: reviews.length,
                    hint: `${submittedReviews.length} submitted`,
                    tone: "bg-[var(--status-info-bg)] text-[var(--status-info)] ring-[var(--status-info-ring)]",
                    icon: ClipboardList,
                  },
                  {
                    label: "Days under Commando",
                    value: underIntervention
                      ? (daysUnder ?? profile.totalDaysUnderCommando)
                      : profile.totalDaysUnderCommando || 0,
                    hint: underIntervention
                      ? "Current intervention"
                      : "Lifetime total",
                    tone: "bg-[var(--color-brand-soft)] text-[var(--color-brand)] ring-[var(--color-brand-ring)]",
                    icon: Flag,
                  },
                  {
                    label: "Monthly planning",
                    value: currentMonthTasks.length,
                    hint: "Eisenhower items this month",
                    tone: "bg-[var(--status-warn-bg)] text-[var(--status-warn)] ring-[var(--status-warn-ring)]",
                    icon: LayoutGrid,
                  },
                ] as const
              ).map((m) => {
                const Icon = m.icon;
                return (
                  <div
                    key={m.label}
                    className="rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface-2)]/40 p-3"
                  >
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] ring-1 ring-inset ${m.tone}`}
                      aria-hidden
                    >
                      <Icon size={13} strokeWidth={1.75} />
                    </span>
                    <p className="mt-2 text-[11px] font-medium text-[var(--color-ink-muted)]">
                      {m.label}
                    </p>
                    <p className="mt-0.5 text-[1.25rem] font-semibold tabular-nums tracking-tight text-[var(--color-ink)]">
                      {m.value}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--color-ink-subtle)]">
                      {m.hint}
                    </p>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard
            title="Monthly Eisenhower summary"
            subtitle="Compact view of this month's planning"
            action={
              <Link
                href={seWorkspaceHref(profile.id, "eisenhower")}
                className="text-[12px] font-medium text-[var(--color-brand)] hover:underline"
              >
                Open Eisenhower →
              </Link>
            }
          >
            <div className="grid grid-cols-2 gap-2.5 p-3 sm:p-4">
              {eisenhowerCounts.map((cell) => {
                const Icon = cell.icon;
                return (
                  <div
                    key={cell.key}
                    className="rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface-2)]/40 p-3"
                  >
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] ring-1 ring-inset ${cell.iconClass}`}
                      aria-hidden
                    >
                      <Icon size={13} strokeWidth={1.75} />
                    </span>
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--color-ink-muted)]">
                      {cell.title}
                    </p>
                    <p className="mt-0.5 text-[1.25rem] font-semibold tabular-nums text-[var(--color-ink)]">
                      {cell.count}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--color-ink-subtle)]">
                      {cell.subtitle}
                    </p>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {canViewSupport ? (
            <SectionCard
              title="Support"
              subtitle={
                supportNames.length > 0
                  ? `Support team: ${supportNames.join(" · ")}`
                  : "Sales Support tasks assigned to help you"
              }
              action={
                <Link
                  href={seWorkspaceHref(profile.id, "support")}
                  className="text-[12px] font-medium text-[var(--color-brand)] hover:underline"
                >
                  View support →
                </Link>
              }
            >
              {activeSupport.length === 0 ? (
                <EmptyBlock
                  icon={Users}
                  title="No active support tasks"
                  description="When Support is assigned work for you, it will appear here."
                />
              ) : (
                <ul className="divide-y divide-[var(--color-line)]">
                  {activeSupport.slice(0, 4).map((t) => (
                    <li key={t.id} className="px-4 py-3 sm:px-5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[13px] font-semibold text-[var(--color-ink)]">
                          {t.title}
                        </p>
                        <StatusBadge
                          status={t.isOverdue ? "OVERDUE" : t.status}
                        />
                      </div>
                      <p className="mt-1 text-[12px] text-[var(--color-ink-muted)]">
                        {personName(t.salesSupportUser)} · Due{" "}
                        {formatDate(t.dueDate)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
