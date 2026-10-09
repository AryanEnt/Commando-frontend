"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Flag,
  History,
  LayoutGrid,
  Plus,
  RefreshCw,
  Target,
  Users,
} from "lucide-react";
import {
  api,
  errorMessage,
  type ActionItem,
  type EisenhowerCategory,
  type EisenhowerTask,
  type FeedbackItem,
  type PerformanceMetrics,
  type ProfileDetail,
  type SeSupportTeamContext,
  type SupportTask,
  type SwotItem,
  type WeeklyReview,
  type InterventionWorkspace,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { toast } from "@/lib/toast";
import { formatDate, formatWhen } from "@/lib/dates";
import { formatSwotField } from "@/lib/swot-points";
import { personName } from "@/lib/labels";
import { seWorkspaceHref } from "@/lib/se-workspace-nav";
import { StatusBadge } from "@/components/StatusBadge";
import { Avatar, Button, ButtonLink, PerformanceMeter, Skeleton } from "@/components/ui";
import {
  DashEmpty,
  DashHero,
  DashPanel,
  HealthSummary,
  KpiStat,
  type SignalTone,
} from "@/components/dashboard/DashboardKit";

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
  canCompleteActions?: boolean;
  onActionsChanged?: () => void | Promise<void>;
};

type PriorityItem = {
  id: string;
  title: string;
  meta: string;
  href: string;
  actionLabel: string;
  badge: { status: string; label: string };
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

function PanelLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="text-[13px] font-medium text-[var(--color-brand)] hover:underline"
    >
      {children}
    </Link>
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
                ["T", item.threat, "bg-[var(--status-danger-bg)] text-[var(--status-danger)]"],
              ] as const
            ).map(([k, v, tone]) => (
              <div
                key={k}
                className={`rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)] p-2${
                  v == null ? " opacity-70" : ""
                }`}
              >
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${tone}`}
                >
                  {k}
                </span>
                <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-[11px] leading-snug text-[var(--color-ink)]">
                  {formatSwotField(
                    k === "S"
                      ? item.strengthPoints
                      : k === "W"
                        ? item.weaknessPoints
                        : k === "O"
                          ? item.opportunityPoints
                          : item.threatPoints,
                    v,
                  ) ?? "Held back"}
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
  canCompleteActions = false,
  onActionsChanged,
}: Props) {
  const { token } = useAuth();
  const [completingId, setCompletingId] = useState<string | null>(null);
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

  async function completeAction(id: string) {
    if (!token || !canCompleteActions) return;
    setCompletingId(id);
    try {
      await api.completeActionItem(token, id);
      toast.success("Assignment completed");
      await onActionsChanged?.();
    } catch (err) {
      toast.error(errorMessage(err, "Unable to complete assignment"));
    } finally {
      setCompletingId(null);
    }
  }

  const priorities: PriorityItem[] = [];
  for (const a of overdueActions.slice(0, 4)) {
    priorities.push({
      id: `od-${a.id}`,
      title: a.title,
      meta: `Assignment · Due ${formatDate(a.dueDate)}`,
      href: seWorkspaceHref(profile.id, "actions"),
      actionLabel: "Open actions",
      badge: { status: "OVERDUE", label: "Overdue" },
    });
  }
  for (const t of overdueSupport.slice(0, 3)) {
    priorities.push({
      id: `sup-${t.id}`,
      title: t.title,
      meta: `Support · ${personName(t.salesSupportUser)}`,
      href: seWorkspaceHref(profile.id, "support"),
      actionLabel: "Open support",
      badge: { status: "NEEDS_ATTENTION", label: "Overdue support" },
    });
  }
  for (const a of dueSoonActions.slice(0, 3)) {
    priorities.push({
      id: `soon-${a.id}`,
      title: a.title,
      meta: `Assignment · Due ${formatDate(a.dueDate)}`,
      href: seWorkspaceHref(profile.id, "actions"),
      actionLabel: "Open actions",
      badge: { status: "DUE_TODAY", label: "Due soon" },
    });
  }
  if (draftReviews[0]) {
    priorities.push({
      id: `rev-${draftReviews[0].id}`,
      title: draftReviews[0].weekLabel || "Weekly review draft",
      meta: "Review in progress — awaiting completion",
      href: `/weekly-reviews/${draftReviews[0].id}?returnTo=${encodeURIComponent(seWorkspaceHref(profile.id, "reviews"))}`,
      actionLabel: "Open review",
      badge: { status: "WATCH", label: "In progress" },
    });
  } else if (submittedReviews[0] && !submittedReviews[0].signed) {
    priorities.push({
      id: `sign-${submittedReviews[0].id}`,
      title: submittedReviews[0].weekLabel || "Weekly review",
      meta: "Submitted — awaiting your signature",
      href: `/weekly-reviews/${submittedReviews[0].id}?returnTo=${encodeURIComponent(seWorkspaceHref(profile.id, "reviews"))}`,
      actionLabel: "Review & sign",
      badge: { status: "DUE_TODAY", label: "To sign" },
    });
  }
  if (feedback[0] && priorities.length < 6) {
    priorities.push({
      id: `fb-${feedback[0].id}`,
      title: "Latest feedback",
      meta: `${personName(feedback[0].createdBy)} · ${formatDate(feedback[0].createdAt)}`,
      href: seWorkspaceHref(profile.id, "feedback"),
      actionLabel: "Read feedback",
      badge: { status: "UPCOMING", label: "Feedback" },
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
      actionLabel: "View",
      badge: { status: "UPCOMING", label: "Coaching focus" },
    });
  }

  const kpis: {
    label: string;
    value: number | string;
    hint: string;
    href: string;
    tone: SignalTone;
  }[] = [
    {
      label: "Overdue",
      value: overdueActions.length,
      hint: "Assignments past due",
      href: seWorkspaceHref(profile.id, "actions"),
      tone: overdueActions.length > 0 ? "critical" : "neutral",
    },
    {
      label: "Due this week",
      value: dueSoonActions.length,
      hint: "Assignments due in 7 days",
      href: seWorkspaceHref(profile.id, "actions"),
      tone: dueSoonActions.length > 0 ? "warning" : "neutral",
    },
    {
      label: "My score",
      value: metricsLoading
        ? "…"
        : myScore != null
          ? Math.round(myScore)
          : "—",
      hint: myMetric
        ? `Evaluated ${formatDate(myMetric.evaluatedAt)}`
        : "No personal score yet",
      href: seWorkspaceHref(profile.id, "performance"),
      tone: myScore != null ? "info" : "neutral",
    },
    {
      label: "Feedback",
      value: feedback.length,
      hint: feedback[0]
        ? `Latest ${formatDate(feedback[0].createdAt)}`
        : "None received yet",
      href: seWorkspaceHref(profile.id, "feedback"),
      tone: "neutral",
    },
  ];

  const progressStats = [
    {
      label: "Open assignments",
      value: openActions.length,
      hint:
        overdueActions.length > 0
          ? `${overdueActions.length} overdue`
          : "None overdue",
    },
    {
      label: "Reviews",
      value: reviews.length,
      hint: `${submittedReviews.length} submitted`,
    },
    {
      label: "Days under Commando",
      value: underIntervention
        ? (daysUnder ?? profile.totalDaysUnderCommando)
        : profile.totalDaysUnderCommando || 0,
      hint: underIntervention ? "Current intervention" : "Lifetime total",
    },
    {
      label: "Monthly planning",
      value: currentMonthTasks.length,
      hint: "Eisenhower items this month",
    },
  ];

  const quickActions = [
    canEditSelfSwot
      ? { href: swotHref, label: "Add my SWOT", icon: Plus }
      : null,
    {
      href: seWorkspaceHref(profile.id, "work-log"),
      label: "Add work log",
      icon: Plus,
    },
    {
      href: seWorkspaceHref(profile.id, "history"),
      label: "View history",
      icon: History,
    },
    {
      href: seWorkspaceHref(profile.id, "swot"),
      label: "Open SWOT",
      icon: Target,
    },
    {
      href: seWorkspaceHref(profile.id, "eisenhower"),
      label: "Open monthly planning",
      icon: LayoutGrid,
    },
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <div className="space-y-6">
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
            <ButtonLink href={swotHref} variant="outline" size="sm">
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

      <DashHero
        anchor={
          <HealthSummary
            title="My assignments"
            healthy={openActions.length - overdueActions.length}
            attention={overdueActions.length}
            healthyLabel="On track"
            attentionLabel="Overdue"
            emptyText="No open assignments"
          />
        }
      >
        {kpis.map((kpi) => (
          <KpiStat key={kpi.label} {...kpi} />
        ))}
      </DashHero>

      <div className="grid gap-5 xl:grid-cols-12 xl:items-start">
        <div className="min-w-0 space-y-5 xl:col-span-8">
          <DashPanel
            id="se-priorities"
            tone="brand"
            title="Current priorities"
            description="What you should work on next"
            aside={
              priorities.length > 0 ? (
                <PanelLink href={seWorkspaceHref(profile.id, "actions")}>
                  View all
                </PanelLink>
              ) : (
                <span
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--status-success-bg)] text-[var(--status-success)]"
                  aria-hidden
                >
                  <CheckCircle2 size={16} />
                </span>
              )
            }
          >
            {priorities.length === 0 ? (
              <DashEmpty
                tone="positive"
                title="Nothing urgent right now"
                description="Overdue assignments, upcoming reviews, and support follow-ups will appear here."
              />
            ) : (
              <ul className="dash-list">
                {priorities.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-start justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge {...item.badge} />
                        <p className="text-[13px] font-semibold text-[var(--color-ink)]">
                          {item.title}
                        </p>
                      </div>
                      <p className="mt-1 text-meta">{item.meta}</p>
                    </div>
                    <Link
                      href={item.href}
                      className="shrink-0 text-[13px] font-semibold text-[var(--color-brand)] hover:underline"
                    >
                      {item.actionLabel}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </DashPanel>

          <DashPanel
            id="se-performance-summary"
            title="Current performance summary"
            description={`${profile.displayName} · ${profile.team.name}`}
          >
            <div className="grid border-t border-[var(--color-line)] lg:grid-cols-2">
              <div className="border-b border-[var(--color-line)] px-6 py-5 lg:border-b-0 lg:border-r">
                <p className="text-eyebrow">Management state</p>
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
                      <dt className="text-meta">Current Commando</dt>
                      <dd className="font-medium text-[var(--color-ink)]">
                        {personName(assignment.commando)}
                      </dd>
                    </div>
                    {daysUnder != null ? (
                      <div>
                        <dt className="text-meta">Days under Commando</dt>
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
                        <dt className="text-meta">Current focus</dt>
                        <dd className="text-[var(--color-ink-muted)]">
                          {referral.recommendationFocus || referral.whatIsTheGap}
                        </dd>
                      </div>
                    ) : null}
                    {teamLeadName ? (
                      <div>
                        <dt className="text-meta">Team Lead (permanent owner)</dt>
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

              <div className="px-6 py-5">
                <p className="text-eyebrow">Performance</p>
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
                    <p className="mt-2 text-meta">
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
                      <ul className="mt-3 flex flex-wrap gap-4">
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
                  <p className="mt-3 text-meta">
                    {commandoScore.hiddenReason ||
                      "Commando performance scores are not visible during an active assignment."}
                  </p>
                ) : null}
                {commandoScore?.visible &&
                commandoScore.averageMetricScore != null ? (
                  <p className="mt-3 text-meta">
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
                  Open performance details
                </Link>
              </div>
            </div>
          </DashPanel>

          <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
            <DashPanel
              id="se-assignments"
              title="Assignments"
              description="Your current open follow-through items"
              aside={
                <PanelLink href={seWorkspaceHref(profile.id, "actions")}>
                  View all
                </PanelLink>
              }
            >
              {openActions.length === 0 ? (
                <DashEmpty
                  tone="positive"
                  title="No open assignments"
                  description="Assignments from reviews and coaching will appear here."
                />
              ) : (
                <ul className="dash-list">
                  {openActions.slice(0, 6).map((a) => {
                    const overdue = isOverdueAction(a);
                    const signal: SignalTone = overdue
                      ? "critical"
                      : isDueSoon(a)
                        ? "warning"
                        : "positive";
                    return (
                      <li
                        key={a.id}
                        data-signal={signal}
                        className="flex items-start justify-between gap-3"
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
                                ? "font-semibold text-[var(--status-danger)]"
                                : "text-[var(--color-ink-muted)]"
                            }`}
                          >
                            Due {formatDate(a.dueDate)}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          {overdue ? (
                            <StatusBadge status="OVERDUE" label="Overdue" />
                          ) : signal === "warning" ? (
                            <StatusBadge status="DUE_TODAY" label="Due soon" />
                          ) : (
                            <StatusBadge status="ON_TRACK" label="On track" />
                          )}
                          {canCompleteActions ? (
                            <Button
                              variant="success"
                              size="sm"
                              disabled={completingId === a.id}
                              onClick={() => void completeAction(a.id)}
                            >
                              {completingId === a.id
                                ? "Completing…"
                                : "Complete"}
                            </Button>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </DashPanel>

            <DashPanel
              id="se-reviews"
              title="Reviews"
              description="Recent weekly reviews and resulting actions"
              aside={
                <PanelLink href={seWorkspaceHref(profile.id, "reviews")}>
                  View all
                </PanelLink>
              }
            >
              {recentReviews.length === 0 ? (
                <DashEmpty
                  title="No weekly reviews yet"
                  description="Reviews from your Team Lead or Commando will appear here."
                />
              ) : (
                <ul className="dash-list">
                  {recentReviews.map((r) => (
                    <li key={r.id}>
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/weekly-reviews/${r.id}?returnTo=${encodeURIComponent(seWorkspaceHref(profile.id, "reviews"))}`}
                          className="text-[13px] font-semibold text-[var(--color-ink)] hover:underline"
                        >
                          {r.weekLabel || "Weekly review"}
                        </Link>
                        <StatusBadge status={r.status} />
                      </div>
                      <p className="mt-1 text-meta">
                        {formatDate(r.meetingDate || r.weekStartDate)}
                        {r.nextWeekAction ? ` · ${r.nextWeekAction}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </DashPanel>
          </div>

          <DashPanel
            id="se-swot"
            title="SWOT"
            description="Separated by who recorded it — sources are not merged"
            aside={
              canEditSelfSwot ? (
                <PanelLink href={swotHref}>Add my SWOT</PanelLink>
              ) : null
            }
          >
            <div className="grid gap-3 px-6 pb-6 sm:grid-cols-3">
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
          </DashPanel>

          <DashPanel
            id="se-feedback"
            tone="bare"
            title="Latest feedback"
            description="Recent guidance from Team Lead or Commando"
            aside={
              <PanelLink href={seWorkspaceHref(profile.id, "feedback")}>
                View all
              </PanelLink>
            }
          >
            {feedback.length === 0 ? (
              <DashEmpty
                title="No feedback yet"
                description="Guidance from your Team Lead or Commando will appear here."
              />
            ) : (
              <ul className="dash-list">
                {feedback.slice(0, 3).map((f) => (
                  <li key={f.id} className="flex items-start gap-3">
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
          </DashPanel>
        </div>

        <aside className="space-y-5 xl:col-span-4">
          <DashPanel id="se-quick-actions" title="Quick actions">
            <ul className="px-3 pb-3">
              {quickActions.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2.5 text-[13px] font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-brand-soft)]"
                    >
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
                        <Icon size={14} strokeWidth={1.75} aria-hidden />
                      </span>
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </DashPanel>

          <DashPanel
            id="se-progress"
            title="Performance progress"
            description="Snapshot of your current and recent state"
            aside={
              <PanelLink href={seWorkspaceHref(profile.id, "performance")}>
                Details
              </PanelLink>
            }
          >
            <div className="dash-mini-stats">
              {progressStats.map((m) => (
                <div key={m.label}>
                  <p className="text-[1.5rem] font-bold leading-none tabular-nums tracking-tight text-[var(--color-ink)]">
                    {m.value}
                  </p>
                  <p className="mt-2 text-[12px] font-semibold text-[var(--color-ink)]">
                    {m.label}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--color-ink-muted)]">
                    {m.hint}
                  </p>
                </div>
              ))}
            </div>
          </DashPanel>

          <DashPanel
            id="se-eisenhower"
            title="Monthly Eisenhower"
            description="This month's planning by quadrant"
            aside={
              <PanelLink href={seWorkspaceHref(profile.id, "eisenhower")}>
                Open
              </PanelLink>
            }
          >
            <div className="dash-mini-stats">
              {eisenhowerCounts.map((cell) => {
                const Icon = cell.icon;
                return (
                  <div key={cell.key} className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] ring-1 ring-inset ${cell.iconClass}`}
                      aria-hidden
                    >
                      <Icon size={13} strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[1.25rem] font-bold leading-none tabular-nums text-[var(--color-ink)]">
                        {cell.count}
                      </p>
                      <p className="mt-1.5 text-[12px] font-semibold text-[var(--color-ink)]">
                        {cell.title}
                      </p>
                      <p className="text-[11px] text-[var(--color-ink-muted)]">
                        {cell.subtitle}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </DashPanel>

          {canViewSupport ? (
            <DashPanel
              id="se-support"
              title="Support"
              description={
                supportNames.length > 0
                  ? `Support team: ${supportNames.join(" · ")}`
                  : "Sales Support tasks assigned to help you"
              }
              aside={
                <PanelLink href={seWorkspaceHref(profile.id, "support")}>
                  View
                </PanelLink>
              }
            >
              {activeSupport.length === 0 ? (
                <DashEmpty
                  title="No active support tasks"
                  description="When Support is assigned work for you, it will appear here."
                />
              ) : (
                <ul className="dash-list">
                  {activeSupport.slice(0, 4).map((t) => (
                    <li
                      key={t.id}
                      data-signal={t.isOverdue ? "critical" : "positive"}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[13px] font-semibold text-[var(--color-ink)]">
                          {t.title}
                        </p>
                        <StatusBadge
                          status={t.isOverdue ? "OVERDUE" : t.status}
                        />
                      </div>
                      <p className="mt-1 text-meta">
                        {personName(t.salesSupportUser)} · Due{" "}
                        {formatDate(t.dueDate)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </DashPanel>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
