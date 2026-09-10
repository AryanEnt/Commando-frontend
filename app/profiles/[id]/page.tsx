"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  api,
  type ActionItem,
  type DailyLog,
  type EisenhowerTask,
  type FeedbackItem,
  type InterventionWorkspace,
  type MonitoringRecord,
  type ProfileDetail,
  type RoleAssignment,
  type SupportTask,
  type SwotItem,
  type WeeklyReview,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/dates";
import { personName } from "@/lib/labels";
import { INTERVENTION_STAGES, interventionStageFromAssignment } from "@/lib/lifecycle";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Avatar,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LifecycleStepper,
  LoadingState,
  Tabs,
} from "@/components/ui";

type Tab =
  | "overview"
  | "coaching"
  | "reviews"
  | "actions"
  | "support"
  | "history";

export default function ProfileDetailPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading workspace…" />}>
      <ProfileWorkspace />
    </Suspense>
  );
}

function ProfileWorkspace() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token, hasPermission, user } = useAuth();
  const [profile, setProfile] = useState<ProfileDetail | null>(null);
  const [workspace, setWorkspace] = useState<InterventionWorkspace | null>(null);
  const [timeline, setTimeline] = useState<
    Array<{ at: string; type: string; title: string; href?: string }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const requestedTab = (searchParams.get("tab") as Tab | null) ?? "overview";
  const [tab, setTab] = useState<Tab>(requestedTab);
  const [swots, setSwots] = useState<SwotItem[]>([]);
  const [reviews, setReviews] = useState<WeeklyReview[]>([]);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [monitoring, setMonitoring] = useState<MonitoringRecord[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [eisenhower, setEisenhower] = useState<EisenhowerTask[]>([]);
  const [supportTasks, setSupportTasks] = useState<SupportTask[]>([]);
  const [roleAssignments, setRoleAssignments] = useState<RoleAssignment[]>([]);
  const [ackBusy, setAckBusy] = useState(false);
  const [completeBusy, setCompleteBusy] = useState(false);
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setTab(requestedTab);
  }, [requestedTab]);

  async function reloadProfile() {
    if (!token || !params.id) return;
    const [profileRes, workspaceRes, timelineRes] = await Promise.all([
      api.getProfile(token, params.id),
      api.getIntervention(token, params.id).catch(() => null),
      api.getInterventionTimeline(token, params.id).catch(() => null),
    ]);
    setProfile(profileRes.data.profile);
    setWorkspace(workspaceRes?.data ?? null);
    setTimeline(timelineRes?.data.events ?? []);
  }

  useEffect(() => {
    if (!token || !params.id) return;
    api
      .getProfile(token, params.id)
      .then((res) => setProfile(res.data.profile))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "We couldn't load this workspace."),
      );
    api
      .getIntervention(token, params.id)
      .then((res) => setWorkspace(res.data))
      .catch(() => setWorkspace(null));
    api
      .getInterventionTimeline(token, params.id)
      .then((res) => setTimeline(res.data.events))
      .catch(() => setTimeline([]));
  }, [token, params.id]);

  useEffect(() => {
    if (!token || !params.id) return;
    const id = params.id;
    const jobs: Promise<void>[] = [];
    if (hasPermission("SWOT_VIEW")) {
      jobs.push(
        api.getSwotList(token, { profileId: id, pageSize: 20 }).then((r) => setSwots(r.data.items)).catch(() => setSwots([])),
      );
    }
    if (tab === "coaching" || tab === "overview") {
      if (hasPermission("FEEDBACK_VIEW")) {
        jobs.push(
          api.getFeedback(token, { profileId: id, pageSize: 8 }).then((r) => setFeedback(r.data.feedback)).catch(() => setFeedback([])),
        );
      }
      if (hasPermission("DAILY_LOG_VIEW")) {
        jobs.push(
          api.getDailyLogs(token, { profileId: id, pageSize: 12 }).then((r) => setLogs(r.data.logs)).catch(() => setLogs([])),
        );
      }
      if (hasPermission("MONITORING_VIEW")) {
        jobs.push(
          api.getMonitoringRecords(token, { profileId: id, pageSize: 8 }).then((r) => setMonitoring(r.data.records)).catch(() => setMonitoring([])),
        );
      }
    }
    if (tab === "reviews" || tab === "overview") {
      if (hasPermission("WEEKLY_REVIEW_VIEW")) {
        jobs.push(
          api.getWeeklyReviews(token, { profileId: id, pageSize: 12 }).then((r) => setReviews(r.data.reviews)).catch(() => setReviews([])),
        );
      }
      if (hasPermission("EISENHOWER_VIEW")) {
        jobs.push(
          api.getEisenhowerTasks(token, { profileId: id, pageSize: 40 }).then((r) => setEisenhower(r.data.tasks)).catch(() => setEisenhower([])),
        );
      }
    }
    if (tab === "actions" || tab === "overview") {
      if (hasPermission("ACTION_ITEM_VIEW")) {
        jobs.push(
          api.getActionItems(token, { profileId: id, view: "all", pageSize: 20 }).then((r) => setActions(r.data.actionItems)).catch(() => setActions([])),
        );
      }
    }
    if (tab === "support") {
      if (hasPermission("SALES_SUPPORT_TASK_VIEW")) {
        jobs.push(
          api.getSupportTasks(token, { profileId: id, view: "all", pageSize: 20 }).then((r) => setSupportTasks(r.data.tasks)).catch(() => setSupportTasks([])),
        );
      }
      if (hasPermission("ROLE_ASSIGNMENT_VIEW")) {
        jobs.push(
          api.getRoleAssignments(token, { profileId: id, includeHistory: true, pageSize: 20 }).then((r) => setRoleAssignments(r.data.roleAssignments)).catch(() => setRoleAssignments([])),
        );
      }
    }
    void Promise.all(jobs);
  }, [token, params.id, hasPermission, tab]);

  async function completeIntervention() {
    if (!token || !profile?.currentAssignment) return;
    setCompleteBusy(true);
    setActionError(null);
    try {
      await api.endAssignment(token, profile.currentAssignment.id, {
        status: "COMPLETED",
        completionReason: "Intervention completed from Sales Executive workspace",
      });
      setConfirmComplete(false);
      await reloadProfile();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not complete intervention");
    } finally {
      setCompleteBusy(false);
    }
  }

  async function acknowledgeIntervention() {
    if (!token || !profile) return;
    setAckBusy(true);
    try {
      await api.acknowledgeRecord(token, {
        entityType: "INTERVENTION",
        entityId: profile.id,
        salesExecutiveProfileId: profile.id,
      });
    } finally {
      setAckBusy(false);
    }
  }

  function setWorkspaceTab(next: Tab) {
    setTab(next);
    router.replace(`/profiles/${params.id}?tab=${next}`, { scroll: false });
  }

  const role = user?.roleCode;
  const isSe = role === "SALES_EXECUTIVE";
  const isTl = role === "TEAM_LEAD";
  const isCommando = role === "COMMANDO_EXECUTIVE";
  const isSupport = role === "SALES_SUPPORT_EXECUTIVE";

  const tabs: Array<{ value: Tab; label: string }> = useMemo(() => {
    if (isSe) {
      return [
        { value: "overview", label: "Overview" },
        { value: "reviews", label: "Reviews" },
        { value: "actions", label: "My actions" },
        { value: "history", label: "History" },
      ];
    }
    if (isTl) {
      return [
        { value: "overview", label: "Overview" },
        { value: "coaching", label: "Coaching" },
        { value: "reviews", label: "Reviews" },
        { value: "actions", label: "Actions" },
        { value: "support", label: "Support" },
        { value: "history", label: "History" },
      ];
    }
    if (isSupport) {
      return [
        { value: "overview", label: "Overview" },
        { value: "support", label: "Support" },
        { value: "actions", label: "Tasks" },
      ];
    }
    return [
      { value: "overview", label: "Overview" },
      { value: "coaching", label: "Coaching" },
      { value: "reviews", label: "Reviews" },
      { value: "actions", label: "Actions" },
      { value: "support", label: "Support" },
      { value: "history", label: "History" },
    ];
  }, [isSe, isTl, isSupport]);

  if (error) return <ErrorState message={error} />;
  if (!profile) return <LoadingState label="Loading workspace…" />;

  const assignment = profile.currentAssignment;
  const latestAssignment = assignment ?? profile.assignmentHistory?.[0] ?? null;
  const canCompleteIntervention = Boolean(assignment) && hasPermission("ASSIGNMENT_UPDATE");

  const stage = interventionStageFromAssignment(
    assignment,
    workspace?.latestReferral?.status,
  );
  const health = workspace?.health.status ?? "ON_TRACK";
  const latestSwot = workspace?.latestSwot ?? swots[0] ?? null;
  const referral = workspace?.latestReferral;

  const query = `profileId=${profile.id}`;

  const teamLeadLocked =
    user?.roleCode === "TEAM_LEAD" && Boolean(assignment);

  return (
    <div className="space-y-5">
      <p className="text-sm text-[var(--color-ink-muted)]">
        <Link href="/profiles" className="hover:text-[var(--color-ink)]">
          ← Sales Executives
        </Link>
      </p>

      {teamLeadLocked ? (
        <div
          role="status"
          className="border border-[var(--color-attention)]/40 bg-[var(--color-attention)]/10 px-4 py-3 text-sm text-[var(--color-ink)]"
        >
          <p className="font-medium">Operational work paused</p>
          <p className="mt-1 text-[var(--color-ink-muted)]">
            This Sales Executive is under an active Commando intervention. You
            remain the permanent owner and can view history, but normal
            management writes are locked until the intervention is completed or
            exited.
          </p>
        </div>
      ) : null}

      <header className="sticky top-0 z-10 -mx-1 border-b border-[var(--color-line)] bg-[var(--color-canvas)]/95 px-1 py-3 backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <Avatar name={profile.displayName} size="lg" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-subtle)]">
                Sales Executive · {profile.team.name}
              </p>
              <h1 className="mt-1 truncate text-[1.75rem] font-semibold tracking-tight">
                {profile.displayName}
              </h1>
              <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                Team Lead: {latestAssignment ? personName(latestAssignment.teamLead) : "—"}
                {" · "}
                Commando: {latestAssignment ? personName(latestAssignment.commando) : "None"}
                {latestAssignment ? ` · Started ${formatDate(latestAssignment.startedAt)}` : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {assignment ? (
              <StatusBadge status="ACTIVE" label="Active intervention" />
            ) : isTl ? (
              <StatusBadge status="ACTIVE" label="Normal Team Lead management" />
            ) : latestAssignment ? (
              <StatusBadge
                status={latestAssignment.status}
                label={latestAssignment.status === "COMPLETED" ? "Completed" : latestAssignment.status === "EXITED" ? "Exited" : latestAssignment.status}
              />
            ) : (
              <StatusBadge status="INACTIVE" label="No active intervention" />
            )}
            {assignment && <StatusBadge status={health.replaceAll("_", " ")} />}
            {referral && referral.status !== "COMPLETED" && referral.status !== "REJECTED" && (
              <StatusBadge status={referral.status} label={`Request ${referral.status.replaceAll("_", " ").toLowerCase()}`} />
            )}
          </div>
        </div>

        {!isSe && (
          <div className="mt-3 flex flex-wrap gap-2">
            {(isCommando || isTl) &&
              hasPermission("DAILY_LOG_CREATE") &&
              (isCommando ? Boolean(assignment) : !teamLeadLocked) && (
              <Link className="action-chip" href={`/daily-logs/new?${query}`}>Add daily log</Link>
            )}
            {(isCommando || isTl) &&
              hasPermission("MONITORING_CREATE") &&
              (isCommando ? Boolean(assignment) : !teamLeadLocked) && (
              <Link className="action-chip" href={`/monitoring/new?${query}`}>Start monitoring</Link>
            )}
            {(isCommando || isTl) &&
              hasPermission("WEEKLY_REVIEW_CREATE") &&
              (isCommando ? Boolean(assignment) : !teamLeadLocked) && (
              <Link className="action-chip" href={`/weekly-reviews/new?${query}`}>Create weekly review</Link>
            )}
            {(isCommando || isTl) &&
              hasPermission("EISENHOWER_CREATE") &&
              (isCommando ? Boolean(assignment) : !teamLeadLocked) && (
              <Link className="action-chip" href={`/eisenhower/new?${query}`}>Create Eisenhower</Link>
            )}
            {(isCommando || isTl) &&
              hasPermission("ACTION_ITEM_CREATE") &&
              (isCommando ? Boolean(assignment) : !teamLeadLocked) && (
              <Link className="action-chip" href={`/action-items/new?${query}`}>Create action</Link>
            )}
            {hasPermission("FEEDBACK_CREATE") &&
              (isCommando ? Boolean(assignment) : isTl ? !teamLeadLocked : true) && (
              <Link className="action-chip" href={`/feedback/new?${query}`}>Add feedback</Link>
            )}
            {hasPermission("SWOT_CREATE") && !(isTl && teamLeadLocked) && (
              <Link className="action-chip" href={`/swot/new?${query}`}>Update SWOT</Link>
            )}
            {isCommando && !assignment && hasPermission("REFERRAL_VIEW") && (
              <Link className="action-chip" href="/referrals/request">Request this SE</Link>
            )}
            {canCompleteIntervention && (
              <Button variant="secondary" size="sm" disabled={completeBusy} onClick={() => setConfirmComplete(true)}>
                Complete intervention
              </Button>
            )}
          </div>
        )}
      </header>

      {!isSe && assignment && (
        <LifecycleStepper stages={[...INTERVENTION_STAGES]} current={stage} />
      )}

      {actionError && <ErrorState message={actionError} />}

      <Tabs value={tab} onChange={setWorkspaceTab} options={tabs} />

      {tab === "overview" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <section className="surface p-4 lg:col-span-2 space-y-5">
            <h2 className="text-sm font-semibold">What is happening now</h2>
            {assignment ? (
              <dl className="grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <dt className="text-xs text-[var(--color-ink-subtle)]">Intervention</dt>
                  <dd><StatusBadge status="ACTIVE" label="Active" /></dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--color-ink-subtle)]">Days in intervention</dt>
                  <dd className="tabular-nums">{workspace?.daysInIntervention ?? assignment.totalDaysUnderCommando}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--color-ink-subtle)]">Handoff</dt>
                  <dd>{referral ? referral.status.replaceAll("_", " ") : "None open"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--color-ink-subtle)]">Health</dt>
                  <dd>{workspace?.health.status.replaceAll("_", " ") ?? "—"}</dd>
                </div>
              </dl>
            ) : latestAssignment ? (
              <p className="text-sm text-[var(--color-ink-muted)]">
                Coaching ended {formatDate(latestAssignment.endedAt)}. Open History for the full record.
              </p>
            ) : (
              <div className="space-y-2 text-sm">
                <p className="font-medium text-[var(--color-ink)]">
                  {isTl
                    ? "This Sales Executive is under your normal management."
                    : "No active Commando intervention."}
                </p>
                <p className="text-[var(--color-ink-muted)]">
                  {isTl
                    ? "Use Coaching, Reviews, and Actions to maintain this person. A Commando may request intervention later."
                    : "Open History for past interventions, or request this Sales Executive if you need temporary intervention access."}
                </p>
                {isCommando && (
                  <Link
                    href="/referrals/request"
                    className="inline-flex text-sm font-medium text-[var(--color-brand)] hover:underline"
                  >
                    Request Sales Executive
                  </Link>
                )}
              </div>
            )}

            {workspace?.nextAction && (
              <div className="rounded-[var(--radius-sm)] bg-[var(--color-brand-soft)] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-brand)]">
                  Next action
                </p>
                <p className="mt-1 text-sm font-semibold">{workspace.nextAction.label}</p>
                <p className="text-xs text-[var(--color-ink-muted)]">
                  Owner: {workspace.nextAction.owner} · {workspace.nextAction.reason}
                </p>
              </div>
            )}

            {referral && (
              <div>
                <h3 className="text-sm font-semibold">Team Lead assessment</h3>
                <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                  Read-only packet from the last intervention request.
                </p>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <Field label="Root cause" value={referral.whySalesIsDown} />
                  <Field label="Gap" value={referral.whatIsTheGap} />
                  <div className="sm:col-span-2">
                    <Field label="Detailed gap" value={referral.detailedSummaryOfGap} />
                  </div>
                  <Field label="Support already provided" value={referral.supportAlreadyProvided} />
                  <Field label="Needed from Commando" value={referral.supportRequiredFromCommando} />
                  <div className="sm:col-span-2">
                    <Field label="Recommended focus" value={referral.recommendationFocus} />
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-[var(--color-ink-subtle)]">Current priorities</dt>
                    <dd className="mt-1">
                      1. {referral.priority1 ?? "—"}<br />
                      2. {referral.priority2 ?? "—"}<br />
                      3. {referral.priority3 ?? "—"}
                    </dd>
                  </div>
                </dl>
                <Link href={`/referrals/${referral.id}`} className="mt-3 inline-block text-sm text-[var(--color-brand)] hover:underline">
                  Open handoff
                </Link>
              </div>
            )}

            {latestSwot && (
              <div>
                <h3 className="text-sm font-semibold">Current SWOT</h3>
                <p className="text-xs text-[var(--color-ink-muted)]">
                  {latestSwot.source.replaceAll("_", " ")} · {formatDate(latestSwot.createdAt)}
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
                  <Field label="Strengths" value={latestSwot.strength} />
                  <Field label="Weaknesses" value={latestSwot.weakness} />
                  <Field label="Opportunities" value={latestSwot.opportunity} />
                  <Field label="Threats" value={latestSwot.threat} />
                </div>
              </div>
            )}
          </section>

          <div className="space-y-4">
            <section className="surface p-4">
              <h2 className="text-sm font-semibold">Needs attention</h2>
              {workspace?.attention.length ? (
                <ul className="mt-3 space-y-2 text-sm">
                  {workspace.attention.map((item) => (
                    <li key={item.code}>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-xs text-[var(--color-ink-muted)]">{item.reason}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-[var(--color-ink-muted)]">Nothing needs attention.</p>
              )}
              {isSe && (
                <button
                  type="button"
                  className="mt-4 text-sm text-[var(--color-brand)] hover:underline"
                  disabled={ackBusy}
                  onClick={() => void acknowledgeIntervention()}
                >
                  {ackBusy ? "Saving…" : "Mark as seen"}
                </button>
              )}
            </section>
            <section className="surface p-4">
              <h2 className="text-sm font-semibold">Recent activity</h2>
              {timeline.length === 0 ? (
                <p className="mt-2 text-sm text-[var(--color-ink-muted)]">No activity yet.</p>
              ) : (
                <ol className="mt-3 space-y-3 border-l border-[var(--color-line)] pl-3">
                  {timeline.slice(0, 8).map((event) => (
                    <li key={`${event.type}-${event.at}-${event.title}`} className="text-sm">
                      <p className="text-xs text-[var(--color-ink-subtle)]">{formatDate(event.at)}</p>
                      {event.href ? (
                        <Link href={event.href} className="font-medium hover:underline">{event.title}</Link>
                      ) : (
                        <p className="font-medium">{event.title}</p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </div>
      )}

      {tab === "coaching" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="surface p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Daily observations</h2>
              {hasPermission("DAILY_LOG_CREATE") && assignment && (
                <Link href={`/daily-logs/new?${query}`} className="text-sm text-[var(--color-brand)] hover:underline">New</Link>
              )}
            </div>
            {logs.length === 0 ? (
              <EmptyState title="No coaching logs" description="Observations, evidence, and coaching given appear here." />
            ) : (
              <ul className="mt-3 divide-y divide-[var(--color-line)]">
                {logs.map((log) => (
                  <li key={log.id} className="py-3">
                    <Link href={`/daily-logs/${log.id}`} className="block">
                      <p className="text-sm font-medium">{log.sessionTitle}</p>
                      <p className="text-xs text-[var(--color-ink-muted)]">
                        {log.activityType.name} · {formatDate(log.loggedAt)} · {personName(log.createdBy)}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm text-[var(--color-ink-muted)]">{log.observation}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="surface p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Live monitoring</h2>
              {hasPermission("MONITORING_CREATE") && assignment && (
                <Link href={`/monitoring/new?${query}`} className="text-sm text-[var(--color-brand)] hover:underline">New</Link>
              )}
            </div>
            {monitoring.length === 0 ? (
              <EmptyState title="No monitoring sessions" description="Configurable checklist observations appear here." />
            ) : (
              <ul className="mt-3 divide-y divide-[var(--color-line)]">
                {monitoring.map((m) => (
                  <li key={m.id} className="py-3">
                    <Link href={`/monitoring/${m.id}`} className="flex justify-between gap-3">
                      <span>
                        <span className="block text-sm font-medium">{m.category.name}</span>
                        <span className="text-xs text-[var(--color-ink-muted)]">{personName(m.createdBy)}</span>
                      </span>
                      <span className="text-xs">{formatDate(m.observedAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="surface p-4 lg:col-span-2">
            <h2 className="text-sm font-semibold">Feedback</h2>
            {feedback.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--color-ink-muted)]">No feedback visible for this profile.</p>
            ) : (
              <ul className="mt-2 space-y-3">
                {feedback.map((f) => (
                  <li key={f.id}>
                    <Link href={`/feedback/${f.id}`} className="block">
                      <p className="text-sm font-medium">{personName(f.createdBy)} · {f.source.replaceAll("_", " ")}</p>
                      <p className="line-clamp-3 text-sm text-[var(--color-ink-muted)]">{f.body}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {tab === "reviews" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="surface p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Weekly reviews</h2>
              {hasPermission("WEEKLY_REVIEW_CREATE") && assignment && (
                <Link href={`/weekly-reviews/new?${query}`} className="text-sm text-[var(--color-brand)] hover:underline">New</Link>
              )}
            </div>
            {reviews.length === 0 ? (
              <EmptyState title="No weekly reviews yet" description="Submitted meetings stay here historically." />
            ) : (
              <ul className="mt-3 divide-y divide-[var(--color-line)]">
                {reviews.map((r) => (
                  <li key={r.id} className="py-3">
                    <Link href={`/weekly-reviews/${r.id}`} className="flex justify-between gap-3">
                      <span>
                        <span className="block text-sm font-medium">{r.weekLabel}</span>
                        <span className="text-xs text-[var(--color-ink-muted)]">Meeting {formatDate(r.meetingDate)}</span>
                      </span>
                      <StatusBadge status={r.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="surface p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Eisenhower matrix</h2>
              {hasPermission("EISENHOWER_CREATE") && (
                <Link href={`/eisenhower/new?${query}`} className="text-sm text-[var(--color-brand)] hover:underline">New</Link>
              )}
            </div>
            {eisenhower.length === 0 ? (
              <EmptyState title="No Eisenhower tasks" description="Monthly matrices are preserved. Previous months are never overwritten." />
            ) : (
              <EisenhowerPreview tasks={eisenhower} />
            )}
          </section>
        </div>
      )}

      {tab === "actions" && (
        <section className="surface p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Action items</h2>
            {hasPermission("ACTION_ITEM_CREATE") && assignment && (
              <Link href={`/action-items/new?${query}`} className="text-sm text-[var(--color-brand)] hover:underline">New</Link>
            )}
          </div>
          {actions.length === 0 ? (
            <EmptyState title="No action items" description="Ownership, due dates, and status appear here." />
          ) : (
            <ul className="mt-3 divide-y divide-[var(--color-line)]">
              {actions.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                  <Link href={`/action-items/${a.id}`}>
                    <span className="block text-sm font-medium">{a.title}</span>
                    <span className="text-xs text-[var(--color-ink-muted)]">Due {formatDate(a.dueDate)}</span>
                  </Link>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === "support" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="surface p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Role assignments</h2>
              {hasPermission("ROLE_ASSIGNMENT_CREATE") && (
                <Link href={`/role-assignments/new?${query}`} className="text-sm text-[var(--color-brand)] hover:underline">New</Link>
              )}
            </div>
            <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
              Multiple Sales Support Executives can be assigned to one person.
            </p>
            {roleAssignments.length === 0 ? (
              <EmptyState title="No support roles yet" description="DO / DON’T guidance for Sales Support appears here." />
            ) : (
              <ul className="mt-3 divide-y divide-[var(--color-line)]">
                {roleAssignments.map((r) => (
                  <li key={r.id} className="py-3">
                    <Link href={`/role-assignments/${r.id}`}>
                      <p className="text-sm font-medium">{personName(r.salesSupportUser)}</p>
                      <p className="text-xs text-[var(--color-ink-muted)]">
                        {r.salesSupportLink?.isActive ? "Active" : "Historical"}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="surface p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Support tasks</h2>
              {hasPermission("SALES_SUPPORT_TASK_CREATE") && (
                <Link href={`/my-tasks/new?${query}`} className="text-sm text-[var(--color-brand)] hover:underline">New</Link>
              )}
            </div>
            {supportTasks.length === 0 ? (
              <EmptyState title="No support tasks" description="Pending → In progress → Completed." />
            ) : (
              <ul className="mt-3 divide-y divide-[var(--color-line)]">
                {supportTasks.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                    <Link href={`/my-tasks/${t.id}`}>
                      <span className="block text-sm font-medium">{t.title}</span>
                      <span className="text-xs text-[var(--color-ink-muted)]">{personName(t.salesSupportUser)} · {t.priority}</span>
                    </Link>
                    <StatusBadge status={t.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-4">
          <section className="surface overflow-hidden">
            <h2 className="border-b border-[var(--color-line)] px-4 py-3 text-sm font-semibold">Assignments</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Commando</th>
                  <th>Team Lead</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Days</th>
                </tr>
              </thead>
              <tbody>
                {[...(assignment ? [assignment] : []), ...profile.assignmentHistory].map((a) => (
                  <tr key={a.id}>
                    <td><StatusBadge status={a.status} /></td>
                    <td>{personName(a.commando)}</td>
                    <td>{personName(a.teamLead)}</td>
                    <td>{formatDate(a.startedAt)}</td>
                    <td>{formatDate(a.endedAt)}</td>
                    <td className="tabular-nums">{a.totalDaysUnderCommando}</td>
                  </tr>
                ))}
                {!assignment && profile.assignmentHistory.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[var(--color-ink-muted)]">
                      No assignment history.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
          <section className="surface p-4">
            <h2 className="text-sm font-semibold">SWOT history</h2>
            {swots.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--color-ink-muted)]">No SWOT records.</p>
            ) : (
              <ul className="mt-3 divide-y divide-[var(--color-line)]">
                {swots.map((s) => (
                  <li key={s.id} className="py-3">
                    <Link href={`/swot/${s.id}`} className="flex justify-between gap-3 text-sm">
                      <span>{s.source.replaceAll("_", " ")}</span>
                      <span className="text-[var(--color-ink-muted)]">{formatDate(s.createdAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="surface p-4">
            <h2 className="text-sm font-semibold">Timeline</h2>
            {timeline.length === 0 ? (
              <EmptyState title="No timeline yet" description="Events stay here after status changes." />
            ) : (
              <ol className="mt-3 space-y-3 border-l border-[var(--color-line)] pl-3">
                {timeline.map((event) => (
                  <li key={`${event.type}-${event.at}-${event.title}`} className="text-sm">
                    <p className="text-xs text-[var(--color-ink-subtle)]">{formatDate(event.at)}</p>
                    {event.href ? (
                      <Link href={event.href} className="font-medium hover:underline">{event.title}</Link>
                    ) : (
                      <p className="font-medium">{event.title}</p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      )}

      <ConfirmDialog
        open={confirmComplete}
        title="Complete this intervention?"
        message="Ends the active assignment only. Closing a Team Lead handoff is a separate action and does not remove this Sales Executive from your active list."
        confirmLabel="Complete intervention"
        busy={completeBusy}
        onConfirm={() => void completeIntervention()}
        onCancel={() => setConfirmComplete(false)}
      />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-[var(--color-ink-subtle)]">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}

function EisenhowerPreview({ tasks }: { tasks: EisenhowerTask[] }) {
  const months = Array.from(new Set(tasks.map((t) => t.monthLabel)));
  const groups: Record<string, EisenhowerTask[]> = {
    DO_FIRST: tasks.filter((t) => t.category === "DO_FIRST" && t.isCurrentMonth),
    SCHEDULE: tasks.filter((t) => t.category === "SCHEDULE" && t.isCurrentMonth),
    DELEGATE: tasks.filter((t) => t.category === "DELEGATE" && t.isCurrentMonth),
    ELIMINATE: tasks.filter((t) => t.category === "ELIMINATE" && t.isCurrentMonth),
  };
  return (
    <div className="mt-3 space-y-3">
      <p className="text-xs text-[var(--color-ink-muted)]">Months: {months.join(" · ")}</p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Quad title="Do first" hint="Important + Urgent" items={groups.DO_FIRST} />
        <Quad title="Schedule" hint="Important + Not urgent" items={groups.SCHEDULE} />
        <Quad title="Delegate" hint="Not important + Urgent" items={groups.DELEGATE} />
        <Quad title="Eliminate" hint="Not important + Not urgent" items={groups.ELIMINATE} />
      </div>
    </div>
  );
}

function Quad({
  title,
  hint,
  items,
}: {
  title: string;
  hint: string;
  items: EisenhowerTask[];
}) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--color-line)] p-2">
      <p className="font-semibold">{title}</p>
      <p className="text-[var(--color-ink-subtle)]">{hint}</p>
      <ul className="mt-1 space-y-1">
        {items.slice(0, 3).map((t) => (
          <li key={t.id}>
            <Link href={`/eisenhower/${t.id}`} className="hover:underline">{t.title}</Link>
          </li>
        ))}
        {items.length === 0 && <li className="text-[var(--color-ink-muted)]">None this month</li>}
      </ul>
    </div>
  );
}
