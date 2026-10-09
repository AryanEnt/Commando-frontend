"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import {
  api,
  type ActionItem,
  type Assignment,
  type ProfileListItem,
  type Referral,
  type SupportTask,
  type WeeklyReview,
} from "@/lib/api";
import {
  buildAttentionItems,
  formatRelativeTime,
  toTitleCase,
} from "@/lib/attention";
import { formatDate, formatWhen } from "@/lib/dates";
import { personName } from "@/lib/labels";
import { isPendingTeamLeadReview } from "@/lib/referral-phase";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Avatar,
  ButtonLink,
  EmptyState,
  ErrorState,
  PageHeader,
} from "@/components/ui";
import {
  DashEmpty,
  DashHero,
  DashPanel,
  DashSkeleton,
  HealthSummary,
  KpiStat,
  type SignalTone,
} from "@/components/dashboard/DashboardKit";
import { NeedsAttentionCard } from "@/components/dashboard/NeedsAttentionCard";

type LoadState = "loading" | "ready" | "error";

type FollowUpItem = {
  id: string;
  kind: "action" | "review" | "support";
  title: string;
  seName: string;
  seId: string;
  meta: string;
  href: string;
  actionLabel: string;
};

type ActivityItem = {
  id: string;
  label: string;
  meta: string;
  when: string;
  href: string;
};

const FOLLOW_UP_BADGE: Record<
  FollowUpItem["kind"],
  { status: string; label: string }
> = {
  action: { status: "OVERDUE", label: "Overdue action" },
  support: { status: "NEEDS_ATTENTION", label: "Overdue support" },
  review: { status: "WATCH", label: "Draft review" },
};

function isActionOverdue(item: ActionItem) {
  if (item.status !== "ACTIVE" || !item.dueDate) return false;
  return new Date(item.dueDate).getTime() < Date.now();
}

function submittedLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return formatDate(iso);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startThat = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round(
    (startToday.getTime() - startThat.getTime()) / 86_400_000,
  );
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diff === 0) return `Today · ${time}`;
  if (diff === 1) return `Yesterday · ${time}`;
  return formatDate(iso);
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** Open work for one executive, e.g. "2 overdue actions · 1 draft review". */
function openWorkSummary(counts: {
  overdueActions: number;
  overdueSupport: number;
  draftReviews: number;
}): string {
  const parts = [
    counts.overdueActions > 0 ? plural(counts.overdueActions, "overdue action") : null,
    counts.overdueSupport > 0 ? plural(counts.overdueSupport, "overdue support task") : null,
    counts.draftReviews > 0 ? plural(counts.draftReviews, "draft review") : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "No overdue work";
}

export function TeamLeadDashboard({
  token,
  firstName,
}: {
  token: string;
  firstName: string;
  roleCode?: string;
}) {
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<ProfileListItem[]>([]);
  const [profilesTotal, setProfilesTotal] = useState(0);
  const [pendingRequests, setPendingRequests] = useState<Referral[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [overdueActions, setOverdueActions] = useState<ActionItem[]>([]);
  const [draftReviews, setDraftReviews] = useState<WeeklyReview[]>([]);
  const [overdueSupport, setOverdueSupport] = useState<SupportTask[]>([]);

  const load = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const [
        profilesRes,
        pendingRes,
        assignmentsRes,
        actionsRes,
        reviewsRes,
        supportRes,
      ] = await Promise.all([
        api.getProfiles(token, { pageSize: 100 }),
        api.getReferrals(token, { status: "SUBMITTED", pageSize: 50 }),
        api.getAssignments(token, { currentOnly: true, pageSize: 50 }),
        api.getActionItems(token, { view: "active", pageSize: 50 }),
        api.getWeeklyReviews(token, { status: "DRAFT", pageSize: 30 }),
        api.getSupportTasks(token, { filter: "overdue", pageSize: 30 }),
      ]);

      const awaitingReview = pendingRes.data.referrals.filter(
        isPendingTeamLeadReview,
      );

      setProfiles(profilesRes.data.profiles);
      setProfilesTotal(profilesRes.data.total);
      setPendingRequests(awaitingReview);
      setAssignments(assignmentsRes.data.assignments);
      setOverdueActions(
        actionsRes.data.actionItems.filter(isActionOverdue),
      );
      setDraftReviews(reviewsRes.data.reviews);
      setOverdueSupport(supportRes.data.tasks);
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

  const attentionItems = useMemo(
    () => buildAttentionItems(pendingRequests),
    [pendingRequests],
  );
  /** Executives with an overdue action or a pending request (KPI + health ring). */
  const attentionCount = useMemo(
    () =>
      new Set([
        ...overdueActions.map((a) => a.salesExecutiveProfileId),
        ...pendingRequests.map((r) => r.salesExecutiveProfileId),
      ]).size,
    [overdueActions, pendingRequests],
  );

  /** Oldest request first, matching the attention card. */
  const requestQueue = useMemo(
    () =>
      [...pendingRequests].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
    [pendingRequests],
  );
  const showRequestTeam = new Set(pendingRequests.map((r) => r.teamId)).size > 1;

  const overdueActionsByProfile = useMemo(() => {
    const map = new Map<string, ActionItem[]>();
    for (const a of overdueActions) {
      const list = map.get(a.salesExecutiveProfileId) ?? [];
      list.push(a);
      map.set(a.salesExecutiveProfileId, list);
    }
    return map;
  }, [overdueActions]);

  const overdueSupportByProfile = useMemo(() => {
    const map = new Map<string, SupportTask[]>();
    for (const t of overdueSupport) {
      const list = map.get(t.salesExecutiveProfileId) ?? [];
      list.push(t);
      map.set(t.salesExecutiveProfileId, list);
    }
    return map;
  }, [overdueSupport]);

  const draftReviewsByProfile = useMemo(() => {
    const map = new Map<string, WeeklyReview[]>();
    for (const r of draftReviews) {
      if (!r.salesExecutiveProfileId) continue;
      const list = map.get(r.salesExecutiveProfileId) ?? [];
      list.push(r);
      map.set(r.salesExecutiveProfileId, list);
    }
    return map;
  }, [draftReviews]);

  const followUps = useMemo((): FollowUpItem[] => {
    const items: FollowUpItem[] = [];
    for (const a of overdueActions.slice(0, 6)) {
      items.push({
        id: `action-${a.id}`,
        kind: "action",
        title: a.title,
        seName: a.profile.displayName,
        seId: a.salesExecutiveProfileId,
        meta: `Due ${formatDate(a.dueDate)}`,
        href: `/profiles/${a.salesExecutiveProfileId}/actions`,
        actionLabel: "Open",
      });
    }
    for (const t of overdueSupport.slice(0, 4)) {
      items.push({
        id: `support-${t.id}`,
        kind: "support",
        title: t.title,
        seName: t.profile.displayName,
        seId: t.salesExecutiveProfileId,
        meta: t.dueDate ? `Due ${formatDate(t.dueDate)}` : "Overdue",
        href: `/profiles/${t.salesExecutiveProfileId}/support`,
        actionLabel: "Open",
      });
    }
    for (const r of draftReviews.slice(0, 4)) {
      if (!r.salesExecutiveProfileId) continue;
      items.push({
        id: `review-${r.id}`,
        kind: "review",
        title: r.weekLabel || "Weekly review draft",
        seName: r.profile?.displayName ?? "Sales Support",
        seId: r.salesExecutiveProfileId,
        meta: "Not submitted",
        href: `/profiles/${r.salesExecutiveProfileId}/reviews`,
        actionLabel: "Continue",
      });
    }
    return items.slice(0, 10);
  }, [overdueActions, overdueSupport, draftReviews]);

  const recentActivity = useMemo((): ActivityItem[] => {
    const items: ActivityItem[] = [];
    for (const r of pendingRequests) {
      items.push({
        id: `req-${r.id}`,
        label: "Commando request awaiting review",
        meta: `${r.profileName} · ${personName(r.commando)}`,
        when: r.createdAt,
        href: `/referrals/${r.id}`,
      });
    }
    for (const a of assignments) {
      const seName = a.profile?.displayName ?? "Sales Executive";
      items.push({
        id: `asg-${a.id}`,
        label: "Active Commando intervention",
        meta: `${seName} · ${personName(a.commando)}`,
        when: a.startedAt,
        href: a.profile?.id
          ? `/profiles/${a.profile.id}`
          : `/profiles/${a.salesExecutiveProfileId}`,
      });
    }
    return items
      .sort(
        (x, y) => new Date(y.when).getTime() - new Date(x.when).getTime(),
      )
      .slice(0, 8);
  }, [pendingRequests, assignments]);

  const overdueFollowUps = overdueActions.length + overdueSupport.length;
  const kpis: {
    label: string;
    value: number;
    hint: string;
    href: string;
    tone: SignalTone;
  }[] = [
    {
      label: "Needing attention",
      value: attentionCount,
      hint: "Overdue actions or Commando requests",
      href: "#se-attention",
      tone: attentionCount > 0 ? "warning" : "neutral",
    },
    {
      label: "Overdue follow-ups",
      value: overdueFollowUps,
      hint:
        draftReviews.length > 0
          ? `${draftReviews.length} draft review${draftReviews.length === 1 ? "" : "s"} also open`
          : "Actions and support tasks",
      href: "#management-followups",
      tone: overdueFollowUps > 0 ? "critical" : "neutral",
    },
    {
      label: "Pending requests",
      value: pendingRequests.length,
      hint: "Awaiting your decision",
      href: "#commando-requests",
      tone: pendingRequests.length > 0 ? "info" : "neutral",
    },
    {
      label: "Active interventions",
      value: assignments.length,
      hint: "Under Commando now",
      href: "#active-interventions",
      tone: "neutral",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Team Lead"
        title="Team Lead Dashboard"
        description={`Here's what's happening across your team today${firstName ? ` · ${firstName}` : ""}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <ButtonLink
              href="/users/sales-executives/new"
              variant="outline"
              size="sm"
            >
              <Plus size={14} aria-hidden />
              Add Sales Executive
            </ButtonLink>
            <ButtonLink href="/users/new" variant="outline" size="sm">
              <Plus size={14} aria-hidden />
              Add Sales Support
            </ButtonLink>
          </div>
        }
      />

      {state === "loading" && (
        <DashSkeleton label="Loading Team Lead dashboard" />
      )}
      {state === "error" && error && (
        <ErrorState message={error} onRetry={() => void load()} />
      )}

      {state === "ready" && profilesTotal === 0 && (
        <EmptyState
          title="No Sales Executives yet"
          description="Add a Sales Executive to start managing your team."
          actionHref="/users/sales-executives/new"
          actionLabel="Add Sales Executive"
          icon="emptyUsers"
        />
      )}

      {state === "ready" && profilesTotal > 0 && (
        <>
          <DashHero
            anchor={
              <HealthSummary
                title="Team health"
                healthy={profiles.length - attentionCount}
                attention={attentionCount}
                healthyLabel="On track"
                attentionLabel="Needs attention"
                emptyText="No Sales Executives in scope"
              />
            }
          >
            {kpis.map((kpi) => (
              <KpiStat key={kpi.label} {...kpi} />
            ))}
          </DashHero>

          <NeedsAttentionCard
            items={attentionItems}
            viewAllHref="#commando-requests"
          />

          <div className="grid gap-5 lg:grid-cols-12 lg:items-start">
            <DashPanel
              id="commando-requests"
              tone="brand"
              title="Intervention request queue"
              description="Why each Commando asked for an intervention and what the executive already has open, oldest first"
              className="lg:col-span-7"
            >
              {requestQueue.length === 0 ? (
                <DashEmpty
                  title="No requests in the queue"
                  description="Commando intervention requests appear here when they need your review and management context."
                />
              ) : (
                <ul className="dash-list">
                  {requestQueue.map((r) => {
                    const name = toTitleCase(r.profile?.displayName || r.profileName);
                    const reason =
                      r.requestReason?.trim() ||
                      r.supportRequiredFromCommando?.trim() ||
                      null;
                    const openWork = openWorkSummary({
                      overdueActions:
                        overdueActionsByProfile.get(r.salesExecutiveProfileId)?.length ?? 0,
                      overdueSupport:
                        overdueSupportByProfile.get(r.salesExecutiveProfileId)?.length ?? 0,
                      draftReviews:
                        draftReviewsByProfile.get(r.salesExecutiveProfileId)?.length ?? 0,
                    });
                    return (
                      <li
                        key={r.id}
                        className="flex flex-wrap items-start justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/profiles/${r.salesExecutiveProfileId}`}
                            className="block truncate text-[13px] font-semibold text-[var(--color-ink)] hover:underline"
                            title={name}
                          >
                            {name}
                          </Link>
                          <p className="mt-0.5 text-meta">
                            Requested by {toTitleCase(personName(r.commando))},{" "}
                            <time dateTime={r.createdAt} title={formatWhen(r.createdAt)}>
                              {formatRelativeTime(r.createdAt)}
                            </time>
                            {showRequestTeam ? ` · ${r.team.name}` : ""}
                          </p>
                          <p className="mt-1.5 line-clamp-2 text-[13px] text-[var(--color-ink)]">
                            <span className="text-[var(--color-ink-muted)]">Reason: </span>
                            {reason ?? "No reason given"}
                          </p>
                          <p className="mt-1 text-meta">Open work: {openWork}</p>
                        </div>
                        <Link
                          href={`/referrals/${r.id}`}
                          className="shrink-0 text-[13px] font-semibold text-[var(--color-brand)] hover:underline"
                          aria-label={`Provide information for ${name}'s intervention request`}
                        >
                          Provide information
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </DashPanel>

            <DashPanel
              id="management-followups"
              title="Reviews, actions & support"
              description="Overdue work and draft reviews across your team"
              className="lg:col-span-5"
            >
              {followUps.length === 0 ? (
                <DashEmpty
                  tone="positive"
                  title="No overdue management follow-ups"
                  description="Overdue actions, overdue support tasks, and draft weekly reviews will appear here."
                />
              ) : (
                <ul className="dash-list">
                  {followUps.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-start justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge {...FOLLOW_UP_BADGE[item.kind]} />
                          <p className="text-[13px] font-semibold text-[var(--color-ink)]">
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
                        className="shrink-0 text-[13px] font-semibold text-[var(--color-brand)] hover:underline"
                      >
                        {item.actionLabel}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </DashPanel>
          </div>

          <DashPanel
            id="active-interventions"
            title="Active interventions"
            description="Temporary Commando coaching — you remain permanent owner"
          >
            {assignments.length === 0 ? (
              <DashEmpty
                title="No active Commando interventions"
                description="Sales Executives on your team are under normal management."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="dash-table w-full min-w-[40rem] text-left text-[13px]">
                  <thead>
                    <tr>
                      <th className="min-w-[13rem]">Sales Executive</th>
                      <th>Commando</th>
                      <th className="w-[8rem]">Duration</th>
                      <th>Attention</th>
                      <th>
                        <span className="sr-only">Open</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((a) => {
                      const seName =
                        a.profile?.displayName ?? "Sales Executive";
                      const seId = a.profile?.id ?? a.salesExecutiveProfileId;
                      const overdueN =
                        overdueActionsByProfile.get(seId)?.length ?? 0;
                      const followUpN =
                        (overdueSupportByProfile.get(seId)?.length ?? 0) +
                        (draftReviewsByProfile.get(seId)?.length ?? 0);
                      const signal: SignalTone =
                        overdueN > 0
                          ? "critical"
                          : followUpN > 0
                            ? "warning"
                            : "positive";
                      return (
                        <tr key={a.id} data-signal={signal}>
                          <td>
                            <Link
                              href={`/profiles/${seId}`}
                              className="inline-flex items-center gap-2.5 font-semibold text-[var(--color-ink)] hover:underline"
                            >
                              <Avatar name={seName} size="sm" />
                              {seName}
                            </Link>
                            <p className="mt-0.5 pl-[2.375rem] text-meta">
                              {a.team.name}
                            </p>
                          </td>
                          <td>
                            <p className="text-meta">{personName(a.commando)}</p>
                            <div className="mt-1">
                              <StatusBadge
                                status="UNDER_INTERVENTION"
                                label="Active intervention"
                              />
                            </div>
                          </td>
                          <td className="whitespace-nowrap">
                            <span className="text-[15px] font-semibold tabular-nums text-[var(--color-ink)]">
                              {a.totalDaysUnderCommando}
                            </span>
                            <span className="ml-1 text-meta">
                              {a.totalDaysUnderCommando === 1 ? "day" : "days"}
                            </span>
                            <p className="mt-0.5 text-[11px] text-[var(--color-ink-subtle)]">
                              Since {formatWhen(a.startedAt)}
                            </p>
                          </td>
                          <td>
                            {signal === "critical" ? (
                              <StatusBadge status="OVERDUE" label="Overdue" />
                            ) : signal === "warning" ? (
                              <StatusBadge
                                status="NEEDS_ATTENTION"
                                label="Needs follow-up"
                              />
                            ) : (
                              <StatusBadge status="ON_TRACK" label="On track" />
                            )}
                          </td>
                          <td className="text-right">
                            <ButtonLink
                              href={`/profiles/${seId}`}
                              variant="outline"
                              size="sm"
                              className="whitespace-nowrap"
                            >
                              Open workspace
                            </ButtonLink>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </DashPanel>

          {recentActivity.length > 0 ? (
            <DashPanel
              id="team-activity"
              tone="bare"
              title="Recent team activity"
              description="Live requests and active interventions in your scope"
              aside={
                <Link
                  href="/profiles"
                  className="text-[13px] font-medium text-[var(--color-brand)] hover:underline"
                >
                  All Sales Executives
                </Link>
              }
            >
              <ul className="dash-list">
                {recentActivity.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-[var(--color-ink)]">
                        {item.label}
                      </p>
                      <p className="mt-0.5 text-meta">{item.meta}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-4">
                      <time
                        dateTime={item.when}
                        className="text-[12px] tabular-nums text-[var(--color-ink-subtle)]"
                      >
                        {submittedLabel(item.when)}
                      </time>
                      <Link
                        href={item.href}
                        className="text-[13px] font-semibold text-[var(--color-brand)] hover:underline"
                      >
                        View
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </DashPanel>
          ) : null}
        </>
      )}
    </div>
  );
}
