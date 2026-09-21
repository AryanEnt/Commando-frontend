"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  api,
  type ActionItem,
  type DailyLog,
  type MonitoringRecord,
  type ProfileListItem,
  type Referral,
  type SupportTask,
  type WeeklyReview,
} from "@/lib/api";
import { formatDate, formatWhen } from "@/lib/dates";
import { personName } from "@/lib/labels";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Avatar,
  Button,
  ButtonLink,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  PageHeader,
  PulseGrid,
  PulseStat,
  Skeleton,
  TableFrame,
} from "@/components/ui";
import { useToast } from "@/lib/toast-context";
import { useAuth } from "@/lib/auth-context";

type LoadState = "loading" | "ready" | "error";

type WorkBucket = "overdue" | "today" | "upcoming";

type WorkItem = {
  id: string;
  bucket: WorkBucket;
  title: string;
  seName: string;
  seId: string;
  meta: string;
  href: string;
  actionLabel: string;
  kind: "action" | "review" | "support" | "handoff";
};

type AttentionItem = {
  id: string;
  title: string;
  meta: string;
  href: string;
  actionLabel: string;
  severity: "critical" | "warning" | "watch";
};

type ActivityItem = {
  id: string;
  label: string;
  meta: string;
  when: string;
  href: string;
};

function startOfDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function isActionOverdue(item: ActionItem) {
  if (item.status !== "ACTIVE" || !item.dueDate) return false;
  return new Date(item.dueDate).getTime() < startOfDay();
}

function isActionDueToday(item: ActionItem) {
  if (item.status !== "ACTIVE" || !item.dueDate) return false;
  const due = new Date(item.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  return startOfDay(due) === startOfDay();
}

function isActionUpcoming(item: ActionItem) {
  if (item.status !== "ACTIVE" || !item.dueDate) return false;
  const due = startOfDay(new Date(item.dueDate));
  const today = startOfDay();
  const inWeek = today + 7 * 86_400_000;
  return due > today && due <= inWeek;
}

function whenLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return formatDate(iso);
  const today = startOfDay();
  const that = startOfDay(d);
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (that === today) return `Today · ${time}`;
  if (that === today - 86_400_000) return `Yesterday · ${time}`;
  return `${formatDate(iso)} · ${time}`;
}

function CommandoSkeleton() {
  return (
    <div
      className="space-y-6"
      aria-busy="true"
      aria-label="Loading Commando dashboard"
    >
      <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)]">
        <div className="grid grid-cols-2 sm:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="border-r border-b border-[var(--color-line)] px-4 py-3.5 last:border-r-0 sm:border-b-0"
            >
              <Skeleton className="h-3 w-16" />
              <Skeleton className="mt-2 h-7 w-10" />
              <Skeleton className="mt-2 h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
      <Skeleton className="h-52 w-full rounded-[var(--radius-md)]" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-40 w-full rounded-[var(--radius-md)]" />
        <Skeleton className="h-40 w-full rounded-[var(--radius-md)]" />
      </div>
    </div>
  );
}

export function CommandoDashboard({
  token,
  firstName,
}: {
  token: string;
  firstName: string;
  roleCode?: string;
}) {
  const { hasPermission } = useAuth();
  const { pushToast } = useToast();
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<ProfileListItem[]>([]);
  const [profilesTotal, setProfilesTotal] = useState(0);
  const [readyToStart, setReadyToStart] = useState<Referral[]>([]);
  const [awaitingTl, setAwaitingTl] = useState<Referral[]>([]);
  const [activeActions, setActiveActions] = useState<ActionItem[]>([]);
  const [draftReviews, setDraftReviews] = useState<WeeklyReview[]>([]);
  const [overdueSupport, setOverdueSupport] = useState<SupportTask[]>([]);
  const [recentMonitoring, setRecentMonitoring] = useState<MonitoringRecord[]>(
    [],
  );
  const [recentLogs, setRecentLogs] = useState<DailyLog[]>([]);
  const [completeTarget, setCompleteTarget] = useState<{
    assignmentId: string;
    profileName: string;
  } | null>(null);
  const [completeBusy, setCompleteBusy] = useState(false);
  const canCompleteIntervention = hasPermission("ASSIGNMENT_UPDATE");

  const load = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const [
        profilesRes,
        submittedRes,
        ackRes,
        actionsRes,
        reviewsRes,
        supportRes,
        monitoringRes,
        logsRes,
      ] = await Promise.all([
        api.getProfiles(token, { pageSize: 100 }),
        api.getReferrals(token, { status: "SUBMITTED", pageSize: 20 }),
        api.getReferrals(token, { status: "ACKNOWLEDGED", pageSize: 20 }),
        api.getActionItems(token, { view: "active", pageSize: 50 }),
        api.getWeeklyReviews(token, { status: "DRAFT", pageSize: 30 }),
        api.getSupportTasks(token, { filter: "overdue", pageSize: 30 }),
        api.getMonitoringRecords(token, { pageSize: 8 }),
        api.getDailyLogs(token, { pageSize: 8 }),
      ]);

      setProfiles(profilesRes.data.profiles);
      setProfilesTotal(profilesRes.data.total);
      setAwaitingTl(submittedRes.data.referrals);
      setReadyToStart(ackRes.data.referrals);
      setActiveActions(actionsRes.data.actionItems);
      setDraftReviews(reviewsRes.data.reviews);
      setOverdueSupport(supportRes.data.tasks);
      setRecentMonitoring(monitoringRes.data.records);
      setRecentLogs(logsRes.data.logs);
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

  async function completeIntervention() {
    if (!completeTarget) return;
    setCompleteBusy(true);
    try {
      await api.endAssignment(token, completeTarget.assignmentId, {
        status: "COMPLETED",
        completionReason: "Intervention completed from Commando dashboard",
      });
      pushToast(
        `Intervention completed for ${completeTarget.profileName}`,
        "success",
      );
      setCompleteTarget(null);
      await load();
    } catch (err) {
      pushToast(
        err instanceof Error
          ? err.message
          : "Could not complete the intervention",
        "error",
      );
    } finally {
      setCompleteBusy(false);
    }
  }

  const activeInterventions = useMemo(
    () => profiles.filter((p) => Boolean(p.currentAssignment)),
    [profiles],
  );

  const overdueActions = useMemo(
    () => activeActions.filter(isActionOverdue),
    [activeActions],
  );
  const dueTodayActions = useMemo(
    () => activeActions.filter(isActionDueToday),
    [activeActions],
  );
  const upcomingActions = useMemo(
    () => activeActions.filter(isActionUpcoming),
    [activeActions],
  );

  const overdueByProfile = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of overdueActions) {
      map.set(
        a.salesExecutiveProfileId,
        (map.get(a.salesExecutiveProfileId) ?? 0) + 1,
      );
    }
    return map;
  }, [overdueActions]);

  const supportByProfile = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of overdueSupport) {
      map.set(
        t.salesExecutiveProfileId,
        (map.get(t.salesExecutiveProfileId) ?? 0) + 1,
      );
    }
    return map;
  }, [overdueSupport]);

  const draftByProfile = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of draftReviews) {
      map.set(
        r.salesExecutiveProfileId,
        (map.get(r.salesExecutiveProfileId) ?? 0) + 1,
      );
    }
    return map;
  }, [draftReviews]);

  const interventionsNeedingAttention = useMemo(() => {
    return activeInterventions.filter((p) => {
      const overdue = overdueByProfile.get(p.id) ?? 0;
      const support = supportByProfile.get(p.id) ?? 0;
      const drafts = draftByProfile.get(p.id) ?? 0;
      return overdue + support + drafts > 0;
    });
  }, [
    activeInterventions,
    overdueByProfile,
    supportByProfile,
    draftByProfile,
  ]);

  const workItems = useMemo((): WorkItem[] => {
    const items: WorkItem[] = [];

    for (const r of readyToStart) {
      items.push({
        id: `handoff-${r.id}`,
        bucket: "today",
        title: "Start intervention (handoff ready)",
        seName: r.profileName,
        seId: r.salesExecutiveProfileId,
        meta: `${r.team.name} · Pending request — not yet active`,
        href: `/referrals/${r.id}`,
        actionLabel: "Acknowledge & start",
        kind: "handoff",
      });
    }

    for (const a of overdueActions) {
      items.push({
        id: `action-od-${a.id}`,
        bucket: "overdue",
        title: a.title,
        seName: a.profile.displayName,
        seId: a.salesExecutiveProfileId,
        meta: `Action · Due ${formatDate(a.dueDate)}`,
        href: `/profiles/${a.salesExecutiveProfileId}/actions`,
        actionLabel: "Open action",
        kind: "action",
      });
    }

    for (const t of overdueSupport) {
      items.push({
        id: `support-${t.id}`,
        bucket: "overdue",
        title: t.title,
        seName: t.profile.displayName,
        seId: t.salesExecutiveProfileId,
        meta: `Support · ${t.priority}${t.dueDate ? ` · Due ${formatDate(t.dueDate)}` : ""}`,
        href: `/profiles/${t.salesExecutiveProfileId}/support`,
        actionLabel: "Open support",
        kind: "support",
      });
    }

    for (const a of dueTodayActions) {
      items.push({
        id: `action-td-${a.id}`,
        bucket: "today",
        title: a.title,
        seName: a.profile.displayName,
        seId: a.salesExecutiveProfileId,
        meta: "Action · Due today",
        href: `/profiles/${a.salesExecutiveProfileId}/actions`,
        actionLabel: "Open action",
        kind: "action",
      });
    }

    for (const r of draftReviews) {
      items.push({
        id: `review-${r.id}`,
        bucket: "upcoming",
        title: r.weekLabel || "Weekly review draft",
        seName: r.profile.displayName,
        seId: r.salesExecutiveProfileId,
        meta: "Review · Draft not submitted",
        href: `/profiles/${r.salesExecutiveProfileId}/reviews`,
        actionLabel: "Continue review",
        kind: "review",
      });
    }

    for (const a of upcomingActions) {
      items.push({
        id: `action-up-${a.id}`,
        bucket: "upcoming",
        title: a.title,
        seName: a.profile.displayName,
        seId: a.salesExecutiveProfileId,
        meta: `Action · Due ${formatDate(a.dueDate)}`,
        href: `/profiles/${a.salesExecutiveProfileId}/actions`,
        actionLabel: "Open action",
        kind: "action",
      });
    }

    const order: Record<WorkBucket, number> = {
      overdue: 0,
      today: 1,
      upcoming: 2,
    };
    return items.sort((a, b) => order[a.bucket] - order[b.bucket]).slice(0, 12);
  }, [
    readyToStart,
    overdueActions,
    overdueSupport,
    dueTodayActions,
    draftReviews,
    upcomingActions,
  ]);

  const attentionItems = useMemo((): AttentionItem[] => {
    const items: AttentionItem[] = [];

    if (overdueActions.length > 0) {
      items.push({
        id: "att-actions",
        title: "Overdue assignments",
        meta: `${overdueActions.length} past due across active interventions`,
        href: "#work-queue",
        actionLabel: "Review",
        severity: "critical",
      });
    }
    if (overdueSupport.length > 0) {
      items.push({
        id: "att-support",
        title: "Overdue support tasks",
        meta: `${overdueSupport.length} Sales Support follow-up${overdueSupport.length === 1 ? "" : "s"} past due`,
        href: "#work-queue",
        actionLabel: "Review",
        severity: "warning",
      });
    }
    if (readyToStart.length > 0) {
      items.push({
        id: "att-handoff",
        title: "Handoffs ready to start",
        meta: `${readyToStart.length} approved request${readyToStart.length === 1 ? "" : "s"} awaiting your acknowledgement`,
        href: "/referrals?status=ACKNOWLEDGED",
        actionLabel: "Open requests",
        severity: "warning",
      });
    }
    if (draftReviews.length > 0) {
      items.push({
        id: "att-reviews",
        title: "Draft weekly reviews",
        meta: `${draftReviews.length} review${draftReviews.length === 1 ? "" : "s"} started but not submitted`,
        href: "#work-queue",
        actionLabel: "Continue",
        severity: "watch",
      });
    }
    if (awaitingTl.length > 0) {
      items.push({
        id: "att-waiting-tl",
        title: "Requests awaiting Team Lead",
        meta: `${awaitingTl.length} submitted request${awaitingTl.length === 1 ? "" : "s"} — not active interventions`,
        href: "/referrals?status=SUBMITTED",
        actionLabel: "View",
        severity: "watch",
      });
    }
    if (interventionsNeedingAttention.length > 0) {
      items.push({
        id: "att-ses",
        title: "Interventions needing follow-up",
        meta: `${interventionsNeedingAttention.length} active SE${interventionsNeedingAttention.length === 1 ? "" : "s"} with open exceptions`,
        href: "#active-interventions",
        actionLabel: "Open list",
        severity: "warning",
      });
    }

    return items;
  }, [
    overdueActions.length,
    overdueSupport.length,
    readyToStart.length,
    draftReviews.length,
    awaitingTl.length,
    interventionsNeedingAttention.length,
  ]);

  const recentActivity = useMemo((): ActivityItem[] => {
    const items: ActivityItem[] = [];
    for (const m of recentMonitoring) {
      items.push({
        id: `mon-${m.id}`,
        label: `Monitoring · ${m.category.name}`,
        meta: m.profile.displayName,
        when: m.observedAt || m.createdAt,
        href: `/profiles/${m.salesExecutiveProfileId}/monitoring`,
      });
    }
    for (const log of recentLogs) {
      const first = log.entries?.[0];
      items.push({
        id: `log-${log.id}`,
        label: `Daily Log · ${first?.sessionTitle ?? `${log.entryCount} activities`}`,
        meta: log.profile.displayName,
        when: log.updatedAt || log.createdAt,
        href: `/profiles/${log.salesExecutiveProfileId}/daily-logs/${log.id}`,
      });
    }
    return items
      .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime())
      .slice(0, 8);
  }, [recentMonitoring, recentLogs]);

  const pulse = [
    {
      label: "Active interventions",
      value: activeInterventions.length || profilesTotal,
      hint: "SEs you are coaching now",
      href: "#active-interventions",
      warn: false,
      tone: "brand" as const,
    },
    {
      label: "Needing attention",
      value: interventionsNeedingAttention.length,
      hint: "Active SEs with exceptions",
      href: "#active-interventions",
      warn: interventionsNeedingAttention.length > 0,
      tone:
        interventionsNeedingAttention.length > 0
          ? ("warn" as const)
          : ("success" as const),
    },
    {
      label: "Ready to start",
      value: readyToStart.length,
      hint: "Approved requests (not active yet)",
      href: "/referrals?status=ACKNOWLEDGED",
      warn: readyToStart.length > 0,
      tone: "info" as const,
    },
    {
      label: "Overdue actions",
      value: overdueActions.length,
      hint: "Past due assignments",
      href: "#work-queue",
      warn: overdueActions.length > 0,
      tone: overdueActions.length > 0 ? ("danger" as const) : ("accent" as const),
    },
    {
      label: "Draft reviews",
      value: draftReviews.length,
      hint: "Weekly reviews not submitted",
      href: "#work-queue",
      warn: draftReviews.length > 0,
      tone: draftReviews.length > 0 ? ("warn" as const) : ("success" as const),
    },
  ];

  const bucketLabel = (b: WorkBucket) => {
    if (b === "overdue") return "Overdue";
    if (b === "today") return "Due today / now";
    return "Upcoming";
  };

  return (
    <div className="space-y-6 lg:space-y-7">
      <PageHeader
        eyebrow="Commando"
        title="Commando Dashboard"
        description={`Here's what's happening across your interventions today${firstName ? ` · ${firstName}` : ""}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/referrals/request" size="sm">
              Request intervention
            </ButtonLink>
            <ButtonLink href="/profiles" variant="secondary" size="sm">
              Sales Executives
            </ButtonLink>
          </div>
        }
      />

      {state === "loading" && <CommandoSkeleton />}
      {state === "error" && error && (
        <ErrorState message={error} onRetry={() => void load()} />
      )}

      {state === "ready" && (
        <>
          {/* 1 — Intervention pulse */}
          <section aria-labelledby="intervention-pulse-heading">
            <div className="mb-2.5">
              <h2
                id="intervention-pulse-heading"
                className="text-section-title"
              >
                Intervention pulse
              </h2>
              <p className="mt-0.5 text-meta">
                Temporary coaching scope — Team Lead remains permanent owner
              </p>
            </div>
            <PulseGrid>
                {pulse.map((cell) => (
                  <PulseStat key={cell.label} {...cell} />
                ))}
            </PulseGrid>
          </section>

          {/* 2 — Active interventions (primary) */}
          <section
            id="active-interventions"
            aria-labelledby="active-interventions-heading"
            className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-line)] bg-[var(--color-surface-2)] px-4 py-3.5 sm:px-5">
              <div>
                <p className="text-eyebrow">Primary</p>
                <h2
                  id="active-interventions-heading"
                  className="mt-1 text-section-title text-[1.05rem]"
                >
                  Active interventions
                </h2>
                <p className="mt-0.5 text-meta">
                  {activeInterventions.length > 0
                    ? `${activeInterventions.length} Sales Executive${activeInterventions.length === 1 ? "" : "s"} under your coaching`
                    : "No active Commando assignments right now"}
                </p>
              </div>
              {activeInterventions.length > 0 ? (
                <Link
                  href="/profiles"
                  className="text-[13px] font-medium text-[var(--color-brand)] hover:underline"
                >
                  View all
                </Link>
              ) : null}
            </div>

            {activeInterventions.length === 0 ? (
              <div className="px-4 py-8 sm:px-5">
                {readyToStart.length > 0 ? (
                  <>
                    <p className="text-[13px] font-medium text-[var(--color-ink)]">
                      No active interventions yet
                    </p>
                    <p className="mt-1.5 max-w-lg text-meta leading-relaxed">
                      You have {readyToStart.length} approved handoff
                      {readyToStart.length === 1 ? "" : "s"} ready to start.
                      Acknowledge the request to begin an active intervention —
                      a pending request is not coaching yet.
                    </p>
                    <div className="mt-3">
                      <ButtonLink
                        href="/referrals?status=ACKNOWLEDGED"
                        size="sm"
                      >
                        Open ready handoffs
                      </ButtonLink>
                    </div>
                  </>
                ) : (
                  <EmptyState
                    title="No active assignments"
                    description="Acknowledge an approved handoff to place that Sales Executive on your coaching workspace."
                    actionHref="/referrals"
                    actionLabel="View requests"
                    icon="emptyUsers"
                  />
                )}
              </div>
            ) : (
              <TableFrame>
                <table className="w-full min-w-[44rem] text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-[var(--color-line)] bg-[var(--color-surface-2)]/60 text-eyebrow">
                      <th className="px-4 py-2.5 font-semibold sm:px-5">
                        Sales Executive
                      </th>
                      <th className="px-3 py-2.5 font-semibold">Team</th>
                      <th className="px-3 py-2.5 font-semibold">Status</th>
                      <th className="px-3 py-2.5 font-semibold">Days</th>
                      <th className="px-3 py-2.5 font-semibold">Attention</th>
                      <th className="px-3 py-2.5 font-semibold">Next</th>
                      <th className="px-4 py-2.5 font-semibold sm:px-5">
                        <span className="sr-only">Open</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-line)]">
                    {activeInterventions.map((p) => {
                      const assignment = p.currentAssignment!;
                      const overdueN = overdueByProfile.get(p.id) ?? 0;
                      const supportN = supportByProfile.get(p.id) ?? 0;
                      const draftN = draftByProfile.get(p.id) ?? 0;
                      const needsHelp = overdueN + supportN + draftN > 0;
                      const attentionParts: string[] = [];
                      if (overdueN)
                        attentionParts.push(
                          `${overdueN} overdue action${overdueN === 1 ? "" : "s"}`,
                        );
                      if (supportN)
                        attentionParts.push(
                          `${supportN} overdue support`,
                        );
                      if (draftN)
                        attentionParts.push(
                          `${draftN} draft review${draftN === 1 ? "" : "s"}`,
                        );

                      let nextHref = `/profiles/${p.id}`;
                      let nextLabel = "Open workspace";
                      if (overdueN > 0) {
                        nextHref = `/profiles/${p.id}/actions`;
                        nextLabel = "Open actions";
                      } else if (supportN > 0) {
                        nextHref = `/profiles/${p.id}/support`;
                        nextLabel = "Open support";
                      } else if (draftN > 0) {
                        nextHref = `/profiles/${p.id}/reviews`;
                        nextLabel = "Open reviews";
                      } else {
                        nextHref = `/profiles/${p.id}/monitoring`;
                        nextLabel = "Start monitoring";
                      }

                      return (
                        <tr
                          key={p.id}
                          className="transition hover:bg-[var(--color-surface-2)]/50"
                        >
                          <td className="px-4 py-3 align-top sm:px-5">
                            <Link
                              href={`/profiles/${p.id}`}
                              className="inline-flex items-center gap-2.5 font-medium text-[var(--color-ink)] hover:underline"
                            >
                              <Avatar name={p.displayName} size="sm" />
                              {p.displayName}
                            </Link>
                            <p className="mt-0.5 text-meta">
                              Team Lead: {personName(assignment.teamLead)}
                            </p>
                          </td>
                          <td className="px-3 py-3 align-top text-meta">
                            {p.team.name}
                          </td>
                          <td className="px-3 py-3 align-top">
                            <StatusBadge
                              status="UNDER_INTERVENTION"
                              label="Active intervention"
                            />
                          </td>
                          <td className="px-3 py-3 align-top tabular-nums text-meta">
                            {assignment.totalDaysUnderCommando}
                            <p className="mt-0.5 text-[11px] text-[var(--color-ink-subtle)]">
                              Since {formatWhen(assignment.startedAt)}
                            </p>
                          </td>
                          <td className="max-w-[12rem] px-3 py-3 align-top">
                            {needsHelp ? (
                              <>
                                <StatusBadge
                                  status="NEEDS_ATTENTION"
                                  label="Needs follow-up"
                                />
                                <p className="mt-1 text-meta">
                                  {attentionParts.join(" · ")}
                                </p>
                              </>
                            ) : (
                              <StatusBadge
                                status="ON_TRACK"
                                label="On track"
                              />
                            )}
                          </td>
                          <td className="px-3 py-3 align-top text-meta">
                            {nextLabel}
                          </td>
                          <td className="px-4 py-3 align-top sm:px-5">
                            <div className="flex min-w-[7.5rem] flex-col items-stretch gap-1.5">
                              <Link
                                href={nextHref}
                                className="btn btn-secondary btn-sm inline-flex justify-center"
                              >
                                Open
                              </Link>
                              {canCompleteIntervention ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  disabled={completeBusy}
                                  className="justify-center text-[var(--status-danger)] hover:bg-[var(--status-danger-bg)]"
                                  title="Complete intervention"
                                  onClick={() =>
                                    setCompleteTarget({
                                      assignmentId: assignment.id,
                                      profileName: p.displayName,
                                    })
                                  }
                                >
                                  Complete
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </TableFrame>
            )}
          </section>

          {/* 3 + 4 — Work queue | Attention */}
          <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
            <section
              id="work-queue"
              aria-labelledby="work-heading"
              className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] lg:col-span-7"
            >
              <div className="border-b border-[var(--color-line)] bg-[var(--color-surface-2)] px-4 py-3.5 sm:px-5">
                <h2 id="work-heading" className="text-section-title">
                  Today / next actions
                </h2>
                <p className="mt-0.5 text-meta">
                  Overdue, due now, and upcoming coaching follow-through
                </p>
              </div>

              {workItems.length === 0 ? (
                <div className="px-4 py-6 sm:px-5">
                  <p className="text-[13px] font-medium text-[var(--status-success)]">
                    No due work in queue
                  </p>
                  <p className="mt-1 text-meta">
                    Overdue actions, handoffs ready to start, draft reviews, and
                    upcoming due dates will appear here.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-[var(--color-line)]">
                  {workItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 sm:px-5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge
                            status={
                              item.bucket === "overdue"
                                ? "OVERDUE"
                                : item.bucket === "today"
                                  ? "NEEDS_ATTENTION"
                                  : "PENDING"
                            }
                            label={bucketLabel(item.bucket)}
                          />
                          <p className="text-[13px] font-medium text-[var(--color-ink)]">
                            {item.title}
                          </p>
                        </div>
                        <p className="mt-1 text-meta">
                          <Link
                            href={`/profiles/${item.seId}`}
                            className="font-medium text-[var(--color-ink)] hover:underline"
                          >
                            {item.seName}
                          </Link>
                          {" · "}
                          {item.meta}
                        </p>
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

            <section
              id="attention"
              aria-labelledby="attention-heading"
              className={`overflow-hidden rounded-[var(--radius-md)] border shadow-[var(--shadow-sm)] lg:col-span-5 ${
                attentionItems.length > 0
                  ? "border-[var(--status-warn-ring)] bg-[var(--color-surface)]"
                  : "border-[var(--color-line)] bg-[var(--color-surface)]"
              }`}
            >
              <div
                className={`flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3.5 sm:px-5 ${
                  attentionItems.length > 0
                    ? "border-[var(--status-warn-ring)] bg-[var(--status-warn-bg)]"
                    : "border-[var(--color-line)] bg-[var(--color-surface-2)]"
                }`}
              >
                <div>
                  <h2 id="attention-heading" className="text-section-title">
                    Attention / risk
                  </h2>
                  <p className="mt-0.5 text-meta">
                    {attentionItems.length > 0
                      ? `${attentionItems.length} exception${attentionItems.length === 1 ? "" : "s"} to review`
                      : "No coaching exceptions right now"}
                  </p>
                </div>
                {attentionItems.length === 0 ? (
                  <span
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--status-success-bg)] text-[var(--status-success)]"
                    aria-hidden
                  >
                    <CheckCircle2 size={18} />
                  </span>
                ) : null}
              </div>

              {attentionItems.length === 0 ? (
                <div className="px-4 py-6 sm:px-5">
                  <p className="text-[13px] font-medium text-[var(--status-success)]">
                    Interventions look healthy
                  </p>
                  <p className="mt-1 text-meta leading-relaxed">
                    No overdue actions, overdue support, draft reviews, or
                    handoffs waiting to start.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-[var(--color-line)]">
                  {attentionItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 sm:px-5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge
                            status={
                              item.severity === "critical"
                                ? "CRITICAL"
                                : item.severity === "warning"
                                  ? "NEEDS_ATTENTION"
                                  : "PENDING"
                            }
                            label={
                              item.severity === "critical"
                                ? "Critical"
                                : item.severity === "warning"
                                  ? "Warning"
                                  : "Watch"
                            }
                          />
                          <p className="text-[13px] font-medium text-[var(--color-ink)]">
                            {item.title}
                          </p>
                        </div>
                        <p className="mt-1 text-meta">{item.meta}</p>
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
          </div>

          {/* 5 — Recent coaching activity */}
          <section
            aria-labelledby="activity-heading"
            className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]"
          >
            <div className="border-b border-[var(--color-line)] bg-[var(--color-surface-2)] px-4 py-3.5 sm:px-5">
              <h2 id="activity-heading" className="text-section-title">
                Recent coaching activity
              </h2>
              <p className="mt-0.5 text-meta">
                Latest monitoring and coaching sessions in your scope
              </p>
            </div>

            {recentActivity.length === 0 ? (
              <div className="px-4 py-6 sm:px-5">
                <p className="text-[13px] font-medium text-[var(--color-ink)]">
                  No recent coaching activity yet
                </p>
                <p className="mt-1 text-meta">
                  Monitoring sessions and daily coaching logs will appear here
                  as you record them.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--color-line)]">
                {recentActivity.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 sm:px-5"
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-[var(--color-ink)]">
                        {item.label}
                      </p>
                      <p className="mt-0.5 text-meta">{item.meta}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <time
                        dateTime={item.when}
                        className="text-[11px] tabular-nums text-[var(--color-ink-subtle)]"
                      >
                        {whenLabel(item.when)}
                      </time>
                      <Link
                        href={item.href}
                        className="text-[13px] font-medium text-[var(--color-brand)] hover:underline"
                      >
                        Open
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <ConfirmDialog
        open={Boolean(completeTarget)}
        title="Complete this intervention?"
        message={
          completeTarget
            ? `Ends the active Commando assignment for ${completeTarget.profileName}. The Team Lead remains the permanent owner.`
            : ""
        }
        confirmLabel="Complete intervention"
        busy={completeBusy}
        onConfirm={() => void completeIntervention()}
        onCancel={() => {
          if (!completeBusy) setCompleteTarget(null);
        }}
      />
    </div>
  );
}
