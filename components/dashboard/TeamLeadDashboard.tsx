"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Plus } from "lucide-react";
import {
  api,
  type ActionItem,
  type Assignment,
  type ProfileListItem,
  type Referral,
  type SupportTask,
  type WeeklyReview,
} from "@/lib/api";
import { formatDate, formatWhen } from "@/lib/dates";
import { personName } from "@/lib/labels";
import {
  isPendingTeamLeadReview,
  referralStatusLabel,
} from "@/lib/referral-phase";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Avatar,
  ButtonLink,
  EmptyState,
  ErrorState,
  PageHeader,
  PulseGrid,
  PulseStat,
  Skeleton,
  TableFrame,
} from "@/components/ui";

type LoadState = "loading" | "ready" | "error";

type AttentionReason =
  | "pending_request"
  | "overdue_actions"
  | "overdue_support"
  | "draft_review";

type SeAttentionRow = {
  profile: ProfileListItem;
  reasons: AttentionReason[];
  pendingReferral: Referral | null;
  overdueActionCount: number;
  overdueSupportCount: number;
  draftReviewCount: number;
};

type FollowUpItem = {
  id: string;
  kind: "action" | "review" | "support";
  title: string;
  seName: string;
  seId: string;
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

function reasonLabel(reasons: AttentionReason[], row: SeAttentionRow) {
  const parts: string[] = [];
  if (reasons.includes("pending_request")) {
    parts.push("Commando request awaiting your review");
  }
  if (reasons.includes("overdue_actions")) {
    parts.push(
      `${row.overdueActionCount} overdue action${row.overdueActionCount === 1 ? "" : "s"}`,
    );
  }
  if (reasons.includes("overdue_support")) {
    parts.push(
      `${row.overdueSupportCount} overdue support task${row.overdueSupportCount === 1 ? "" : "s"}`,
    );
  }
  if (reasons.includes("draft_review")) {
    parts.push(
      `${row.draftReviewCount} draft review${row.draftReviewCount === 1 ? "" : "s"}`,
    );
  }
  return parts.join(" · ");
}

function nextActionForSe(row: SeAttentionRow) {
  if (row.pendingReferral) {
    return {
      href: `/referrals/${row.pendingReferral.id}`,
      label: "Review request",
    };
  }
  if (row.overdueActionCount > 0) {
    return {
      href: `/profiles/${row.profile.id}/actions`,
      label: "Open actions",
    };
  }
  if (row.overdueSupportCount > 0) {
    return {
      href: `/profiles/${row.profile.id}/support`,
      label: "Open support",
    };
  }
  if (row.draftReviewCount > 0) {
    return {
      href: `/profiles/${row.profile.id}/reviews`,
      label: "Open reviews",
    };
  }
  return {
    href: `/profiles/${row.profile.id}`,
    label: "Open workspace",
  };
}

function TeamLeadSkeleton() {
  return (
    <div
      className="space-y-6"
      aria-busy="true"
      aria-label="Loading Team Lead dashboard"
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
      <Skeleton className="h-48 w-full rounded-[var(--radius-md)]" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-40 w-full rounded-[var(--radius-md)]" />
        <Skeleton className="h-40 w-full rounded-[var(--radius-md)]" />
      </div>
    </div>
  );
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

  const pendingByProfile = useMemo(() => {
    const map = new Map<string, Referral>();
    for (const r of pendingRequests) {
      map.set(r.salesExecutiveProfileId, r);
    }
    return map;
  }, [pendingRequests]);

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
      const list = map.get(r.salesExecutiveProfileId) ?? [];
      list.push(r);
      map.set(r.salesExecutiveProfileId, list);
    }
    return map;
  }, [draftReviews]);

  const attentionRows = useMemo((): SeAttentionRow[] => {
    const rows: SeAttentionRow[] = [];
    for (const profile of profiles) {
      const pendingReferral = pendingByProfile.get(profile.id) ?? null;
      const actions = overdueActionsByProfile.get(profile.id) ?? [];
      const support = overdueSupportByProfile.get(profile.id) ?? [];
      const drafts = draftReviewsByProfile.get(profile.id) ?? [];
      const reasons: AttentionReason[] = [];
      if (pendingReferral) reasons.push("pending_request");
      if (actions.length) reasons.push("overdue_actions");
      if (support.length) reasons.push("overdue_support");
      if (drafts.length) reasons.push("draft_review");
      if (reasons.length === 0) continue;
      rows.push({
        profile,
        reasons,
        pendingReferral,
        overdueActionCount: actions.length,
        overdueSupportCount: support.length,
        draftReviewCount: drafts.length,
      });
    }
    // Priority: pending request → overdue actions → support → drafts
    const rank = (r: SeAttentionRow) => {
      if (r.reasons.includes("pending_request")) return 0;
      if (r.reasons.includes("overdue_actions")) return 1;
      if (r.reasons.includes("overdue_support")) return 2;
      return 3;
    };
    return rows.sort((a, b) => rank(a) - rank(b) || a.profile.displayName.localeCompare(b.profile.displayName));
  }, [
    profiles,
    pendingByProfile,
    overdueActionsByProfile,
    overdueSupportByProfile,
    draftReviewsByProfile,
  ]);

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
        severity: "critical",
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
        severity: "warning",
      });
    }
    for (const r of draftReviews.slice(0, 4)) {
      items.push({
        id: `review-${r.id}`,
        kind: "review",
        title: r.weekLabel || "Weekly review draft",
        seName: r.profile.displayName,
        seId: r.salesExecutiveProfileId,
        meta: "Draft — not submitted",
        href: `/profiles/${r.salesExecutiveProfileId}/reviews`,
        actionLabel: "Continue",
        severity: "watch",
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

  const pulse = [
    {
      label: "Sales Executives",
      value: profilesTotal,
      hint: "In your scope",
      href: "/profiles",
      warn: false,
      tone: "brand" as const,
    },
    {
      label: "Needing attention",
      value: attentionRows.length,
      hint: attentionRows.length ? "Exceptions on your team" : "None right now",
      href: "#se-attention",
      warn: attentionRows.length > 0,
      tone: attentionRows.length > 0 ? ("warn" as const) : ("success" as const),
    },
    {
      label: "Active interventions",
      value: assignments.length,
      hint: "Under Commando now",
      href: "#active-interventions",
      warn: false,
      tone: "accent" as const,
    },
    {
      label: "Pending requests",
      value: pendingRequests.length,
      hint: "Awaiting your decision",
      href: "#commando-requests",
      warn: pendingRequests.length > 0,
      tone: pendingRequests.length > 0 ? ("info" as const) : ("brand" as const),
    },
    {
      label: "Overdue follow-ups",
      value: overdueActions.length + overdueSupport.length,
      hint:
        draftReviews.length > 0
          ? `${draftReviews.length} draft review${draftReviews.length === 1 ? "" : "s"} also open`
          : "Actions + support tasks",
      href: "#management-followups",
      warn: overdueActions.length + overdueSupport.length > 0,
      tone:
        overdueActions.length + overdueSupport.length > 0
          ? ("danger" as const)
          : ("success" as const),
    },
  ];

  return (
    <div className="space-y-6 lg:space-y-7">
      <PageHeader
        eyebrow="Team Lead"
        title="Team Lead Dashboard"
        description={`Here's what's happening across your team today${firstName ? ` · ${firstName}` : ""}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <ButtonLink
              href="/users/sales-executives/new"
              variant="secondary"
              size="sm"
            >
              <Plus size={14} aria-hidden />
              Add Sales Executive
            </ButtonLink>
            <ButtonLink href="/users/new" variant="secondary" size="sm">
              <Plus size={14} aria-hidden />
              Add Sales Support
            </ButtonLink>
          </div>
        }
      />

      {state === "loading" && <TeamLeadSkeleton />}
      {state === "error" && error && (
        <ErrorState message={error} onRetry={() => void load()} />
      )}

      {state === "ready" && (
        <>
          {/* 1 — Team pulse */}
          <section aria-labelledby="team-pulse-heading">
            <div className="mb-2.5">
              <h2 id="team-pulse-heading" className="text-section-title">
                Team pulse
              </h2>
              <p className="mt-0.5 text-meta">
                Coverage across your Sales Executives — you remain permanent owner
              </p>
            </div>
            <PulseGrid>
                {pulse.map((cell) => (
                  <PulseStat key={cell.label} {...cell} />
                ))}
            </PulseGrid>
          </section>

          {/* 2 — SEs needing attention (primary) */}
          <section
            id="se-attention"
            aria-labelledby="se-attention-heading"
            className={`overflow-hidden rounded-[var(--radius-md)] border shadow-[var(--shadow-sm)] ${
              attentionRows.length > 0
                ? "border-[var(--status-warn-ring)] bg-[var(--color-surface)]"
                : "border-[var(--color-line)] bg-[var(--color-surface)]"
            }`}
          >
            <div
              className={`flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3.5 sm:px-5 ${
                attentionRows.length > 0
                  ? "border-[var(--status-warn-ring)] bg-[var(--status-warn-bg)]"
                  : "border-[var(--color-line)] bg-[var(--color-surface-2)]"
              }`}
            >
              <div>
                <p className="text-eyebrow">Priority</p>
                <h2
                  id="se-attention-heading"
                  className="mt-1 text-section-title text-[1.05rem]"
                >
                  Sales Executives needing attention
                </h2>
                <p className="mt-0.5 text-meta">
                  {attentionRows.length > 0
                    ? `${attentionRows.length} Sales Executive${attentionRows.length === 1 ? "" : "s"} with open exceptions`
                    : "No open exceptions on your team"}
                </p>
              </div>
              {attentionRows.length === 0 ? (
                <span
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--status-success-bg)] text-[var(--status-success)]"
                  aria-hidden
                >
                  <CheckCircle2 size={18} />
                </span>
              ) : (
                <StatusBadge
                  status="NEEDS_ATTENTION"
                  label={`${attentionRows.length} need review`}
                />
              )}
            </div>

            {attentionRows.length === 0 ? (
              <div className="px-4 py-8 sm:px-5">
                <p className="text-[13px] font-medium text-[var(--status-success)]">
                  Your team looks healthy
                </p>
                <p className="mt-1.5 max-w-lg text-meta leading-relaxed">
                  No pending Commando request reviews, overdue actions, overdue
                  support tasks, or draft weekly reviews in scope.
                </p>
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
                      <th className="px-3 py-2.5 font-semibold">State</th>
                      <th className="px-3 py-2.5 font-semibold">Commando</th>
                      <th className="px-3 py-2.5 font-semibold">Why attention</th>
                      <th className="px-4 py-2.5 font-semibold sm:px-5">
                        <span className="sr-only">Action</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-line)]">
                    {attentionRows.map((row) => {
                      const assignment = row.profile.currentAssignment;
                      const next = nextActionForSe(row);
                      return (
                        <tr
                          key={row.profile.id}
                          className="transition hover:bg-[var(--color-surface-2)]/50"
                        >
                          <td className="px-4 py-3 align-top sm:px-5">
                            <Link
                              href={`/profiles/${row.profile.id}`}
                              className="inline-flex items-center gap-2.5 font-medium text-[var(--color-ink)] hover:underline"
                            >
                              <Avatar
                                name={row.profile.displayName}
                                size="sm"
                              />
                              {row.profile.displayName}
                            </Link>
                          </td>
                          <td className="px-3 py-3 align-top text-meta">
                            {row.profile.team.name}
                          </td>
                          <td className="px-3 py-3 align-top">
                            {assignment ? (
                              <StatusBadge
                                status="UNDER_INTERVENTION"
                                label="Under intervention"
                              />
                            ) : (
                              <StatusBadge
                                status="NORMAL_MANAGEMENT"
                                label="Normal management"
                              />
                            )}
                          </td>
                          <td className="px-3 py-3 align-top text-meta">
                            {assignment
                              ? personName(assignment.commando)
                              : "—"}
                          </td>
                          <td className="max-w-xs px-3 py-3 align-top text-meta">
                            {reasonLabel(row.reasons, row)}
                          </td>
                          <td className="px-4 py-3 align-top text-right sm:px-5">
                            <Link
                              href={next.href}
                              className="text-[13px] font-medium text-[var(--color-brand)] hover:underline"
                            >
                              {next.label}
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </TableFrame>
            )}
          </section>

          {/* 3 + 4 — Requests | Active interventions */}
          <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
            <section
              id="commando-requests"
              aria-labelledby="requests-heading"
              className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] lg:col-span-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[var(--color-line)] bg-[var(--color-surface-2)] px-4 py-3.5 sm:px-5">
                <div>
                  <h2 id="requests-heading" className="text-section-title">
                    Commando requests
                  </h2>
                  <p className="mt-0.5 text-meta">
                    Pending requests — not active interventions
                  </p>
                </div>
                {pendingRequests.length > 0 ? (
                  <StatusBadge
                    status="NEEDS_ATTENTION"
                    label={`${pendingRequests.length} awaiting you`}
                  />
                ) : null}
              </div>

              {pendingRequests.length === 0 ? (
                <div className="px-4 py-6 sm:px-5">
                  <p className="text-[13px] font-medium text-[var(--status-success)]">
                    No requests need your decision
                  </p>
                  <p className="mt-1 text-meta">
                    Commando requests appear here when they need Team Lead
                    review and management context.
                  </p>
                </div>
              ) : (
                <TableFrame>
                  <table className="w-full min-w-[28rem] text-left text-[13px]">
                    <thead>
                      <tr className="border-b border-[var(--color-line)] text-eyebrow">
                        <th className="px-4 py-2.5 font-semibold sm:px-5">
                          Sales Executive
                        </th>
                        <th className="px-3 py-2.5 font-semibold">Commando</th>
                        <th className="px-3 py-2.5 font-semibold">Status</th>
                        <th className="px-4 py-2.5 font-semibold sm:px-5">
                          <span className="sr-only">Action</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-line)]">
                      {pendingRequests.map((r) => {
                        const reason =
                          r.requestReason?.trim() ||
                          r.supportRequiredFromCommando?.trim() ||
                          null;
                        return (
                          <tr
                            key={r.id}
                            className="transition hover:bg-[var(--color-surface-2)]/50"
                          >
                            <td className="px-4 py-3 align-top sm:px-5">
                              <Link
                                href={`/profiles/${r.salesExecutiveProfileId}`}
                                className="font-medium text-[var(--color-ink)] hover:underline"
                              >
                                {r.profileName}
                              </Link>
                              <p className="mt-0.5 text-meta">
                                {r.team.name} · {submittedLabel(r.createdAt)}
                              </p>
                              {reason ? (
                                <p className="mt-1 line-clamp-2 text-meta">
                                  {reason}
                                </p>
                              ) : null}
                            </td>
                            <td className="px-3 py-3 align-top text-meta">
                              {personName(r.commando)}
                            </td>
                            <td className="px-3 py-3 align-top">
                              <StatusBadge
                                status="PENDING"
                                label="Pending request"
                              />
                              <p className="mt-1 text-[11px] text-[var(--color-ink-subtle)]">
                                {referralStatusLabel(r)}
                              </p>
                            </td>
                            <td className="px-4 py-3 align-top text-right sm:px-5">
                              <Link
                                href={`/referrals/${r.id}`}
                                className="text-[13px] font-medium text-[var(--color-brand)] hover:underline"
                              >
                                Provide information
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </TableFrame>
              )}
            </section>

            <section
              id="active-interventions"
              aria-labelledby="interventions-heading"
              className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] lg:col-span-6"
            >
              <div className="border-b border-[var(--color-line)] bg-[var(--color-surface-2)] px-4 py-3.5 sm:px-5">
                <h2 id="interventions-heading" className="text-section-title">
                  Active interventions
                </h2>
                <p className="mt-0.5 text-meta">
                  Temporary Commando coaching — you remain permanent owner
                </p>
              </div>

              {assignments.length === 0 ? (
                <div className="px-4 py-6 sm:px-5">
                  <p className="text-[13px] font-medium text-[var(--color-ink)]">
                    No active Commando interventions
                  </p>
                  <p className="mt-1 text-meta">
                    Sales Executives on your team are under normal management.
                  </p>
                </div>
              ) : (
                <TableFrame>
                  <table className="w-full min-w-[28rem] text-left text-[13px]">
                    <thead>
                      <tr className="border-b border-[var(--color-line)] text-eyebrow">
                        <th className="px-4 py-2.5 font-semibold sm:px-5">
                          Sales Executive
                        </th>
                        <th className="px-3 py-2.5 font-semibold">Commando</th>
                        <th className="px-3 py-2.5 font-semibold">Duration</th>
                        <th className="px-4 py-2.5 font-semibold sm:px-5">
                          <span className="sr-only">Open</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-line)]">
                      {assignments.map((a) => {
                        const seName =
                          a.profile?.displayName ?? "Sales Executive";
                        const seId =
                          a.profile?.id ?? a.salesExecutiveProfileId;
                        return (
                          <tr
                            key={a.id}
                            className="transition hover:bg-[var(--color-surface-2)]/50"
                          >
                            <td className="px-4 py-3 align-top sm:px-5">
                              <Link
                                href={`/profiles/${seId}`}
                                className="font-medium text-[var(--color-ink)] hover:underline"
                              >
                                {seName}
                              </Link>
                              <p className="mt-0.5 text-meta">{a.team.name}</p>
                            </td>
                            <td className="px-3 py-3 align-top text-meta">
                              {personName(a.commando)}
                              <div className="mt-1">
                                <StatusBadge
                                  status="UNDER_INTERVENTION"
                                  label="Active"
                                />
                              </div>
                            </td>
                            <td className="px-3 py-3 align-top text-meta tabular-nums">
                              {a.totalDaysUnderCommando}{" "}
                              {a.totalDaysUnderCommando === 1 ? "day" : "days"}
                              <p className="mt-0.5 text-[11px] text-[var(--color-ink-subtle)]">
                                Since {formatWhen(a.startedAt)}
                              </p>
                            </td>
                            <td className="px-4 py-3 align-top text-right sm:px-5">
                              <Link
                                href={`/profiles/${seId}`}
                                className="text-[13px] font-medium text-[var(--color-brand)] hover:underline"
                              >
                                Open workspace
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </TableFrame>
              )}
            </section>
          </div>

          {/* 5 — Reviews / Actions / Support */}
          <section
            id="management-followups"
            aria-labelledby="followups-heading"
            className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]"
          >
            <div className="border-b border-[var(--color-line)] bg-[var(--color-surface-2)] px-4 py-3.5 sm:px-5">
              <h2 id="followups-heading" className="text-section-title">
                Reviews, actions & support
              </h2>
              <p className="mt-0.5 text-meta">
                Overdue work and draft reviews across your Sales Executives
              </p>
            </div>

            {followUps.length === 0 ? (
              <div className="px-4 py-6 sm:px-5">
                <p className="text-[13px] font-medium text-[var(--status-success)]">
                  No overdue management follow-ups
                </p>
                <p className="mt-1 text-meta">
                  Overdue actions, overdue support tasks, and draft weekly
                  reviews will appear here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--color-line)]">
                {followUps.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 sm:px-5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge
                          status={
                            item.severity === "critical"
                              ? "OVERDUE"
                              : item.severity === "warning"
                                ? "NEEDS_ATTENTION"
                                : "DRAFT"
                          }
                          label={
                            item.kind === "action"
                              ? "Action"
                              : item.kind === "support"
                                ? "Support"
                                : "Review"
                          }
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

          {/* 6 — Recent signals (from real request/assignment data; no audit invent) */}
          {recentActivity.length > 0 ? (
            <section
              aria-labelledby="activity-heading"
              className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]"
            >
              <div className="flex items-start justify-between gap-3 border-b border-[var(--color-line)] bg-[var(--color-surface-2)] px-4 py-3.5 sm:px-5">
                <div>
                  <h2 id="activity-heading" className="text-section-title">
                    Recent team activity
                  </h2>
                  <p className="mt-0.5 text-meta">
                    Live requests and active interventions in your scope
                  </p>
                </div>
                <Link
                  href="/profiles"
                  className="text-[13px] font-medium text-[var(--color-brand)] hover:underline"
                >
                  All Sales Executives
                </Link>
              </div>
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
                        {submittedLabel(item.when)}
                      </time>
                      <Link
                        href={item.href}
                        className="text-[13px] font-medium text-[var(--color-brand)] hover:underline"
                      >
                        View
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {profilesTotal === 0 ? (
            <EmptyState
              title="No Sales Executives yet"
              description="Add a Sales Executive to start managing your team."
              actionHref="/users/sales-executives/new"
              actionLabel="Add Sales Executive"
              icon="emptyUsers"
            />
          ) : null}
        </>
      )}
    </div>
  );
}
