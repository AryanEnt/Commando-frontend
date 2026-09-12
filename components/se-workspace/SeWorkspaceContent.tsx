"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  api,
  type ActionItem,
  type DailyLog,
  type EisenhowerTask,
  type FeedbackItem,
  type MonitoringRecord,
  type PerformanceMetrics,
  type RoleAssignment,
  type SupportTask,
  type SwotItem,
  type WeeklyReview,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/dates";
import { personName } from "@/lib/labels";
import { INTERVENTION_STAGES, interventionStageFromAssignment } from "@/lib/lifecycle";
import { useSeWorkspace } from "@/lib/se-workspace-context";
import {
  seCreateHref,
  seSectionFromPathname,
  seWorkspaceHref,
  type SeSection,
} from "@/lib/se-workspace-nav";
import { StatusBadge } from "@/components/StatusBadge";
import { SupportTeamPanel } from "@/components/support-team/SupportTeamPanel";
import { SeAccountabilityOverview } from "@/components/se-workspace/SeAccountabilityOverview";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LifecycleStepper,
  LoadingState,
} from "@/components/ui";

export function SeWorkspaceContent() {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token, hasPermission, user } = useAuth();
  const {
    profile,
    workspace,
    supportTeam,
    loading,
    error: profileError,
    teamLeadLocked,
    reload,
  } = useSeWorkspace();

  const section = seSectionFromPathname(pathname);

  useEffect(() => {
    const legacy = searchParams.get("tab");
    if (!legacy || !params.id) return;
    const map: Record<string, SeSection> = {
      overview: "overview",
      coaching: "coaching",
      reviews: "reviews",
      actions: "actions",
      support: "support",
      history: "history",
    };
    const next = map[legacy];
    if (next) {
      router.replace(seWorkspaceHref(params.id, next));
    }
  }, [searchParams, params.id, router]);

  const [timeline, setTimeline] = useState<
    Array<{ at: string; type: string; title: string; href?: string }>
  >([]);
  const [swots, setSwots] = useState<SwotItem[]>([]);
  const [reviews, setReviews] = useState<WeeklyReview[]>([]);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [monitoring, setMonitoring] = useState<MonitoringRecord[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [eisenhower, setEisenhower] = useState<EisenhowerTask[]>([]);
  const [supportTasks, setSupportTasks] = useState<SupportTask[]>([]);
  const [roleAssignments, setRoleAssignments] = useState<RoleAssignment[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [ackBusy, setAckBusy] = useState(false);
  const [completeBusy, setCompleteBusy] = useState(false);
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !params.id) return;
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
        api
          .getSwotList(token, { profileId: id, pageSize: 20 })
          .then((r) => setSwots(r.data.items))
          .catch(() => setSwots([])),
      );
    }
    if (section === "coaching" || section === "overview" || section === "feedback") {
      if (hasPermission("FEEDBACK_VIEW")) {
        jobs.push(
          api
            .getFeedback(token, { profileId: id, pageSize: 8 })
            .then((r) => setFeedback(r.data.feedback))
            .catch(() => setFeedback([])),
        );
      }
      if (
        hasPermission("DAILY_LOG_VIEW") &&
        (section === "coaching" || section === "overview")
      ) {
        jobs.push(
          api
            .getDailyLogs(token, { profileId: id, pageSize: 12 })
            .then((r) => setLogs(r.data.logs))
            .catch(() => setLogs([])),
        );
      }
    }
    if (section === "monitoring" || section === "overview") {
      if (hasPermission("MONITORING_VIEW")) {
        jobs.push(
          api
            .getMonitoringRecords(token, { profileId: id, pageSize: 8 })
            .then((r) => setMonitoring(r.data.records))
            .catch(() => setMonitoring([])),
        );
      }
    }
    if (section === "reviews" || section === "overview") {
      if (hasPermission("WEEKLY_REVIEW_VIEW")) {
        jobs.push(
          api
            .getWeeklyReviews(token, { profileId: id, pageSize: 12 })
            .then((r) => setReviews(r.data.reviews))
            .catch(() => setReviews([])),
        );
      }
    }
    if (
      section === "eisenhower" ||
      section === "reviews" ||
      section === "overview"
    ) {
      if (hasPermission("EISENHOWER_VIEW")) {
        jobs.push(
          api
            .getEisenhowerTasks(token, { profileId: id, pageSize: 40 })
            .then((r) => setEisenhower(r.data.tasks))
            .catch(() => setEisenhower([])),
        );
      }
    }
    if (section === "actions" || section === "overview") {
      if (hasPermission("ACTION_ITEM_VIEW")) {
        const actionView =
          user?.roleCode === "SALES_EXECUTIVE" ? "active" : "all";
        jobs.push(
          api
            .getActionItems(token, {
              profileId: id,
              view: actionView,
              pageSize: 20,
            })
            .then((r) => setActions(r.data.actionItems))
            .catch(() => setActions([])),
        );
      }
    }
    if (
      section === "overview" ||
      section === "performance"
    ) {
      if (hasPermission("PERFORMANCE_VIEW")) {
        setMetricsLoading(true);
        jobs.push(
          api
            .getPerformanceMetrics(token, id)
            .then((r) => {
              setMetrics(r.data.metrics);
              setMetricsError(null);
            })
            .catch((err) => {
              setMetrics(null);
              setMetricsError(
                err instanceof Error
                  ? err.message
                  : "Unable to load performance data",
              );
            })
            .finally(() => setMetricsLoading(false)),
        );
      }
    }
    if (section === "support" || section === "overview") {
      if (hasPermission("SALES_SUPPORT_TASK_VIEW")) {
        jobs.push(
          api
            .getSupportTasks(token, { profileId: id, view: "all", pageSize: 20 })
            .then((r) => setSupportTasks(r.data.tasks))
            .catch(() => setSupportTasks([])),
        );
      }
      if (hasPermission("ROLE_ASSIGNMENT_VIEW")) {
        jobs.push(
          api
            .getRoleAssignments(token, {
              profileId: id,
              includeHistory: true,
              pageSize: 20,
            })
            .then((r) => setRoleAssignments(r.data.roleAssignments))
            .catch(() => setRoleAssignments([])),
        );
      }
    }
    void Promise.all(jobs);
  }, [token, params.id, hasPermission, section, user?.roleCode]);

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
      await reload();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not complete intervention",
      );
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

  if (profileError && !profile) return <ErrorState message={profileError} />;
  if (loading && !profile) return <LoadingState label="Loading…" />;
  if (!profile) return <ErrorState message="Sales Executive not found." />;

  const role = user?.roleCode;
  const isSe = role === "SALES_EXECUTIVE";
  const isTl = role === "TEAM_LEAD";
  const isCommando = role === "COMMANDO_EXECUTIVE";

  const assignment = profile.currentAssignment;
  const canCompleteIntervention =
    Boolean(assignment) && hasPermission("ASSIGNMENT_UPDATE");

  const stage = interventionStageFromAssignment(
    assignment,
    workspace?.latestReferral?.status,
  );
  const referral = workspace?.latestReferral;

  const canOperate =
    !isSe &&
    (isCommando ? Boolean(assignment) : isTl ? !teamLeadLocked : true);

  function canCreate(permission: string) {
    return hasPermission(permission) && canOperate;
  }

  return (
    <div className="space-y-5">
      {!isSe && assignment && (
        <LifecycleStepper stages={[...INTERVENTION_STAGES]} current={stage} />
      )}

      {actionError && <ErrorState message={actionError} />}

      {section === "overview" && (
        <SeAccountabilityOverview
          profile={profile}
          workspace={workspace}
          supportTeam={supportTeam}
          metrics={metrics}
          metricsLoading={metricsLoading}
          metricsError={metricsError}
          feedback={feedback}
          reviews={reviews}
          swots={swots}
          actions={actions}
          eisenhower={eisenhower}
          timeline={timeline}
          supportTasks={supportTasks}
          isSe={isSe}
          isTl={isTl}
          isCommando={isCommando}
          canEditSelfSwot={
            Boolean(
              hasPermission("SWOT_CREATE") &&
                user?.roleCode !== "SUPER_ADMIN" &&
                (isSe || (isTl && !teamLeadLocked) || isCommando),
            )
          }
          canViewSupport={hasPermission("SALES_SUPPORT_LINK_VIEW")}
          managementActions={
            !isSe ? (
              <div className="flex flex-wrap items-center gap-2">
                {isCommando && assignment && canCreate("DAILY_LOG_CREATE") ? (
                  <Link
                    href={seCreateHref(profile.id, "daily-log")}
                    className="inline-flex items-center rounded-[var(--radius-sm)] bg-[var(--color-brand)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-brand-hover)]"
                  >
                    Complete today&apos;s coaching
                  </Link>
                ) : null}
    {isTl && !assignment && hasPermission("REFERRAL_CREATE") ? (
                  <Link
                    href={`/referrals/new?profileId=${encodeURIComponent(profile.id)}`}
                    className="inline-flex items-center rounded-[var(--radius-sm)] bg-[var(--color-brand)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-brand-hover)]"
                  >
                    Request intervention
                  </Link>
                ) : null}
                {!(isCommando && assignment) && canCreate("DAILY_LOG_CREATE") && (
                  <Link
                    className="action-chip"
                    href={seCreateHref(profile.id, "daily-log")}
                  >
                    Add daily log
                  </Link>
                )}
                {canCreate("MONITORING_CREATE") && (
                  <Link
                    className="action-chip"
                    href={seCreateHref(profile.id, "monitoring")}
                  >
                    Start monitoring
                  </Link>
                )}
                {canCreate("WEEKLY_REVIEW_CREATE") && (
                  <Link
                    className="action-chip"
                    href={seCreateHref(profile.id, "weekly-review")}
                  >
                    Create weekly review
                  </Link>
                )}
                {canCreate("ACTION_ITEM_CREATE") && (
                  <Link
                    className="action-chip"
                    href={seCreateHref(profile.id, "action")}
                  >
                    Create action
                  </Link>
                )}
                {canCreate("FEEDBACK_CREATE") && (
                  <Link
                    className="action-chip"
                    href={seCreateHref(profile.id, "feedback")}
                  >
                    Add feedback
                  </Link>
                )}
                {hasPermission("SWOT_CREATE") &&
                  user?.roleCode !== "SUPER_ADMIN" &&
                  !(isTl && teamLeadLocked) && (
                    <Link
                      className="action-chip"
                      href={seCreateHref(profile.id, "swot")}
                    >
                      Update SWOT
                    </Link>
                  )}
                {isCommando && !assignment && hasPermission("REFERRAL_VIEW") && (
                  <Link className="action-chip" href="/referrals/request">
                    Request this SE
                  </Link>
                )}
                {canCompleteIntervention && (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={completeBusy}
                    onClick={() => setConfirmComplete(true)}
                  >
                    Complete intervention
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {hasPermission("SWOT_CREATE") && (
                  <Link
                    className="action-chip"
                    href={seCreateHref(profile.id, "swot")}
                  >
                    Update my SWOT
                  </Link>
                )}
                <button
                  type="button"
                  className="text-sm text-[var(--color-ink-muted)] hover:underline"
                  disabled={ackBusy}
                  onClick={() => void acknowledgeIntervention()}
                >
                  {ackBusy ? "Saving…" : "Mark intervention as seen"}
                </button>
              </div>
            )
          }
        />
      )}

      {section === "coaching" && (
        <SectionFrame
          title="Coaching"
          description="Daily observations and coaching given for this Sales Executive."
          primary={
            canCreate("DAILY_LOG_CREATE") ? (
              <Link
                href={seCreateHref(profile.id, "daily-log")}
                className="action-chip"
              >
                Add daily log
              </Link>
            ) : null
          }
        >
          <section className="surface p-4">
            {logs.length === 0 ? (
              <EmptyState
                title="No coaching logs"
                description="Observations, evidence, and coaching given appear here."
              />
            ) : (
              <ul className="divide-y divide-[var(--color-line)]">
                {logs.map((log) => (
                  <li key={log.id} className="py-3">
                    <Link href={`/daily-logs/${log.id}`} className="block">
                      <p className="text-sm font-medium">{log.sessionTitle}</p>
                      <p className="text-xs text-[var(--color-ink-muted)]">
                        {log.activityType.name} · {formatDate(log.loggedAt)} ·{" "}
                        {personName(log.createdBy)}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm text-[var(--color-ink-muted)]">
                        {log.observation}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </SectionFrame>
      )}

      {section === "monitoring" && (
        <SectionFrame
          title="Live Monitoring"
          description="Checklist observations for this Sales Executive — context is already set."
          primary={
            canCreate("MONITORING_CREATE") ? (
              <Link
                href={seCreateHref(profile.id, "monitoring")}
                className="action-chip"
              >
                Start monitoring
              </Link>
            ) : null
          }
        >
          <section className="surface p-4">
            {monitoring.length === 0 ? (
              <EmptyState
                title="No monitoring sessions"
                description="Configurable checklist observations appear here."
              />
            ) : (
              <ul className="divide-y divide-[var(--color-line)]">
                {monitoring.map((m) => (
                  <li key={m.id} className="py-3">
                    <Link
                      href={`/monitoring/${m.id}`}
                      className="flex justify-between gap-3"
                    >
                      <span>
                        <span className="block text-sm font-medium">
                          {m.category.name}
                        </span>
                        <span className="text-xs text-[var(--color-ink-muted)]">
                          {personName(m.createdBy)}
                        </span>
                      </span>
                      <span className="text-xs">{formatDate(m.observedAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </SectionFrame>
      )}

      {section === "reviews" && (
        <SectionFrame
          title="Weekly Reviews"
          description="Submitted meetings for this Sales Executive."
          primary={
            canCreate("WEEKLY_REVIEW_CREATE") ? (
              <Link
                href={seCreateHref(profile.id, "weekly-review")}
                className="action-chip"
              >
                Create weekly review
              </Link>
            ) : null
          }
        >
          <section className="surface overflow-hidden">
            {reviews.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  title="No weekly reviews yet"
                  description="Weekly reviews will appear here when created."
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
                      <th>Signed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviews.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <Link
                            href={`/weekly-reviews/${r.id}?returnTo=${encodeURIComponent(seWorkspaceHref(profile.id, "reviews"))}`}
                            className="font-medium hover:underline"
                          >
                            {r.weekLabel}
                          </Link>
                          <p className="text-xs text-[var(--color-ink-muted)]">
                            {formatDate(r.meetingDate)}
                          </p>
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
                        <td>
                          {r.signed ? (
                            <span aria-label="Signed">✓ Signed</span>
                          ) : (
                            <span className="text-[var(--color-ink-muted)]">
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </SectionFrame>
      )}

      {section === "eisenhower" && (
        <SectionFrame
          title="Eisenhower"
          description="Monthly priority matrix for this Sales Executive."
          primary={
            canCreate("EISENHOWER_CREATE") ? (
              <Link
                href={seCreateHref(profile.id, "eisenhower")}
                className="action-chip"
              >
                New matrix
              </Link>
            ) : null
          }
        >
          <section className="surface p-4">
            {eisenhower.length === 0 ? (
              <EmptyState
                title="No Eisenhower tasks"
                description="Monthly matrices are preserved. Previous months are never overwritten."
              />
            ) : (
              <EisenhowerPreview tasks={eisenhower} profileId={profile.id} />
            )}
          </section>
        </SectionFrame>
      )}

      {section === "actions" && (
        <SectionFrame
          title="Actions"
          description="Owned follow-ups with due dates for this Sales Executive."
          primary={
            canCreate("ACTION_ITEM_CREATE") ? (
              <Link
                href={seCreateHref(profile.id, "action")}
                className="action-chip"
              >
                Create action
              </Link>
            ) : null
          }
        >
          <section className="surface p-4">
            {actions.length === 0 ? (
              <EmptyState
                title="No action items"
                description="Ownership, due dates, and status appear here."
              />
            ) : (
              <ul className="divide-y divide-[var(--color-line)]">
                {actions.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <Link href={`/action-items/${a.id}`}>
                      <span className="block text-sm font-medium">{a.title}</span>
                      <span className="text-xs text-[var(--color-ink-muted)]">
                        Due {formatDate(a.dueDate)}
                      </span>
                    </Link>
                    <StatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </SectionFrame>
      )}

      {section === "support" && (
        <SectionFrame
          title="Support"
          description="Commando ownership, active Sales Support assignments, and support task responsibilities for this person."
        >
          <SupportTeamPanel
            profileId={profile.id}
            profileName={profile.displayName}
            teamLeadLocked={teamLeadLocked}
            canAssign={hasPermission("SALES_SUPPORT_LINK_ASSIGN") && !teamLeadLocked}
            canView={hasPermission("SALES_SUPPORT_LINK_VIEW")}
            canCreateTask={
              hasPermission("SALES_SUPPORT_TASK_CREATE") && !teamLeadLocked
            }
            supportTeam={supportTeam}
            supportTasks={supportTasks}
            currentAssignment={profile.currentAssignment}
            onChanged={async () => {
              await reload();
              if (!token) return;
              try {
                const r = await api.getSupportTasks(token, {
                  profileId: profile.id,
                  view: "all",
                  pageSize: 40,
                });
                setSupportTasks(r.data.tasks);
              } catch {
                /* keep existing */
              }
            }}
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="surface p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Role assignments</h2>
                {hasPermission("ROLE_ASSIGNMENT_CREATE") && (
                  <Link
                    href={`/role-assignments/new?profileId=${profile.id}&returnTo=${encodeURIComponent(`/profiles/${profile.id}/support`)}`}
                    className="text-sm text-[var(--color-brand)] hover:underline"
                  >
                    New
                  </Link>
                )}
              </div>
              <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                Standing DO / DON&apos;T guidance for each Support person.
              </p>
              {roleAssignments.length === 0 ? (
                <EmptyState
                  title="No support roles yet"
                  description="Team Lead or Commando can add DO / DON’T guidance for assigned Sales Support."
                />
              ) : (
                <ul className="mt-3 divide-y divide-[var(--color-line)]">
                  {roleAssignments.map((r) => (
                    <li key={r.id} className="py-3">
                      <Link
                        href={`/role-assignments/${r.id}?returnTo=${encodeURIComponent(`/profiles/${profile.id}/support`)}`}
                      >
                        <p className="text-sm font-medium">
                          {personName(r.salesSupportUser)}
                        </p>
                        <p className="text-xs text-[var(--color-ink-muted)]">
                          {r.salesSupportLink?.isActive
                            ? "Active"
                            : "Historical"}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="surface p-4 lg:col-span-1">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Support tasks</h2>
              </div>
              {supportTasks.length === 0 ? (
                <EmptyState
                  title="No Support tasks"
                  description={
                    (supportTeam?.activeSupport.length ?? 0) > 0
                      ? "Sales Support is assigned, but no specific tasks have been assigned yet."
                      : "Assign Sales Support first, then create task-level work."
                  }
                />
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Task</th>
                        <th>Owner</th>
                        <th>Status</th>
                        <th>Due</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supportTasks.map((t) => (
                        <tr key={t.id}>
                          <td>
                            <Link
                              href={`/my-tasks/${t.id}?returnTo=${encodeURIComponent(`/profiles/${profile.id}/support`)}`}
                              className="font-medium hover:underline"
                            >
                              {t.title}
                            </Link>
                          </td>
                          <td className="text-[var(--color-ink-muted)]">
                            {personName(t.salesSupportUser)}
                            {t.salesSupportLink?.responsibilityType
                              ? ` · ${t.salesSupportLink.responsibilityType}`
                              : ""}
                          </td>
                          <td>
                            <StatusBadge status={t.status} />
                          </td>
                          <td className="tabular-nums text-[var(--color-ink-muted)]">
                            {formatDate(t.dueDate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </SectionFrame>
      )}

      {section === "interventions" && (
        <SectionFrame
          title="Intervention"
          description={
            assignment
              ? "Active Commando intervention and assignment history for this Sales Executive."
              : "This Sales Executive is under normal management. Past interventions appear below when available."
          }
          primary={
            canCompleteIntervention ? (
              <Button
                variant="secondary"
                size="sm"
                disabled={completeBusy}
                onClick={() => setConfirmComplete(true)}
              >
                Complete intervention
              </Button>
            ) : isCommando && !assignment && hasPermission("REFERRAL_VIEW") ? (
              <Link href="/referrals/request" className="action-chip">
                Request this SE
              </Link>
            ) : isTl && !assignment && hasPermission("REFERRAL_CREATE") ? (
              <Link
                href={`/referrals/new?profileId=${encodeURIComponent(profile.id)}`}
                className="action-chip"
              >
                Request intervention
              </Link>
            ) : null
          }
        >
          {assignment ? (
            <section className="mb-4 border border-[var(--color-brand)]/30 bg-[var(--color-brand-soft)]/40 px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <StatusBadge
                    status="UNDER_INTERVENTION"
                    label="Active intervention"
                  />
                  <p className="mt-2 text-sm font-semibold">
                    {personName(assignment.commando)} · Day{" "}
                    {workspace?.daysInIntervention ??
                      assignment.totalDaysUnderCommando}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                    Started {formatDate(assignment.startedAt)} · Team Lead{" "}
                    {personName(assignment.teamLead)}
                  </p>
                  {referral?.recommendationFocus ? (
                    <p className="mt-3 text-sm text-[var(--color-ink)]">
                      Focus: {referral.recommendationFocus}
                    </p>
                  ) : null}
                </div>
                {referral ? (
                  <Link
                    href={`/referrals/${referral.id}`}
                    className="text-sm font-medium text-[var(--color-brand)] hover:underline"
                  >
                    Open management packet
                  </Link>
                ) : null}
              </div>
            </section>
          ) : (
            <section className="mb-4 surface px-4 py-4">
              <StatusBadge
                status="NORMAL_MANAGEMENT"
                label="Normal management"
              />
              <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
                No active Commando intervention. Team Lead manages day-to-day
                performance.
              </p>
            </section>
          )}
          <section className="surface overflow-hidden">
            <div className="border-b border-[var(--color-line)] px-4 py-3">
              <h2 className="text-sm font-semibold">Assignment history</h2>
            </div>
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
                {[
                  ...(assignment ? [assignment] : []),
                  ...profile.assignmentHistory,
                ].map((a) => (
                  <tr key={a.id}>
                    <td>
                      <StatusBadge status={a.status} />
                    </td>
                    <td>{personName(a.commando)}</td>
                    <td>{personName(a.teamLead)}</td>
                    <td>{formatDate(a.startedAt)}</td>
                    <td>{formatDate(a.endedAt)}</td>
                    <td className="tabular-nums">
                      {a.totalDaysUnderCommando}
                    </td>
                  </tr>
                ))}
                {!assignment && profile.assignmentHistory.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-[var(--color-ink-muted)]"
                    >
                      No interventions yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
          {referral && !assignment ? (
            <section className="surface mt-4 p-4">
              <h2 className="text-sm font-semibold">Latest handoff</h2>
              <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                Status: {referral.status.replaceAll("_", " ")}
              </p>
              <Link
                href={`/referrals/${referral.id}`}
                className="mt-2 inline-block text-sm text-[var(--color-brand)] hover:underline"
              >
                Open handoff
              </Link>
            </section>
          ) : null}
        </SectionFrame>
      )}

      {section === "feedback" && (
        <SectionFrame
          title="Feedback"
          description="Feedback history for this Sales Executive."
          primary={
            canCreate("FEEDBACK_CREATE") ? (
              <Link
                href={seCreateHref(profile.id, "feedback")}
                className="action-chip"
              >
                Add feedback
              </Link>
            ) : null
          }
        >
          <section className="surface p-4">
            {feedback.length === 0 ? (
              <EmptyState
                title="No feedback yet"
                description="Feedback from Team Lead and Commando appears here."
              />
            ) : (
              <ul className="space-y-3">
                {feedback.map((f) => (
                  <li key={f.id}>
                    <Link href={`/feedback/${f.id}`} className="block">
                      <p className="text-sm font-medium">
                        {personName(f.createdBy)} ·{" "}
                        {f.source.replaceAll("_", " ")}
                      </p>
                      <p className="line-clamp-3 text-sm text-[var(--color-ink-muted)]">
                        {f.body}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </SectionFrame>
      )}

      {section === "performance" && (
        <SectionFrame
          title={isSe ? "My development" : "Goals"}
          description="Current score, metrics, and SWOT assessments by source."
          primary={
            hasPermission("SWOT_CREATE") &&
            user?.roleCode !== "SUPER_ADMIN" &&
            !(isTl && teamLeadLocked) ? (
              <Link
                href={seCreateHref(profile.id, "swot")}
                className="action-chip"
              >
                {isSe ? "Edit my SWOT" : "Update SWOT"}
              </Link>
            ) : null
          }
        >
          <div className="space-y-4">
            <section className="surface p-4">
              <h2 className="text-sm font-semibold">Current score</h2>
              {metricsLoading ? (
                <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
                  Loading…
                </p>
              ) : metricsError ? (
                <p className="mt-2 text-sm text-[var(--status-danger)]">
                  Unable to load performance data
                </p>
              ) : metrics?.myPerformanceMetric ? (
                <div className="mt-3 grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-[var(--color-ink-subtle)]">
                      Score
                    </p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums">
                      {Math.round(
                        metrics.myPerformanceMetric.averageMetricScore ??
                          metrics.myPerformanceMetric.rating ??
                          0,
                      )}{" "}
                      <span className="text-base text-[var(--color-ink-muted)]">
                        / 100
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--color-ink-subtle)]">
                      Status
                    </p>
                    <p className="mt-1 text-sm font-semibold">
                      {metrics.myPerformanceMetric.verdict?.replaceAll(
                        "_",
                        " ",
                      ) ??
                        workspace?.health.status.replaceAll("_", " ") ??
                        "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--color-ink-subtle)]">
                      Source
                    </p>
                    <p className="mt-1 text-sm">
                      {metrics.myPerformanceMetric.source.replaceAll("_", " ")}{" "}
                      · {formatDate(metrics.myPerformanceMetric.evaluatedAt)}
                    </p>
                  </div>
                </div>
              ) : (
                <EmptyState
                  title="No score yet"
                  description="Authorized evaluations will appear here when recorded."
                />
              )}
              {metrics?.myPerformanceMetric?.scores?.length ? (
                <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {metrics.myPerformanceMetric.scores.map((s) => (
                    <li key={s.id}>
                      <p className="text-xs text-[var(--color-ink-subtle)]">
                        {s.metricLabel}
                      </p>
                      <p className="mt-1 text-lg font-semibold tabular-nums">
                        {s.scoreValue}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>

            <div className="grid gap-4 lg:grid-cols-3">
              {(
                [
                  {
                    source: "TEAM_LEAD" as const,
                    title: "Team Lead assessment",
                  },
                  {
                    source: "SALES_EXECUTIVE" as const,
                    title: "Self assessment",
                  },
                  {
                    source: "COMMANDO" as const,
                    title: "Commando assessment",
                  },
                ] as const
              ).map(({ source, title }) => {
                const item = swots.find((s) => s.source === source) ?? null;
                const locked =
                  source === "COMMANDO" &&
                  Boolean(assignment) &&
                  !item &&
                  isSe;
                return (
                  <section key={source} className="surface p-4">
                    <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-subtle)]">
                      {title}
                    </h2>
                    {item ? (
                      <div className="mt-3 space-y-2 text-sm">
                        <p className="text-xs text-[var(--color-ink-muted)]">
                          {formatDate(item.createdAt)}
                        </p>
                        <Field label="Strengths" value={item.strength} />
                        <Field label="Weaknesses" value={item.weakness} />
                        <Field label="Opportunities" value={item.opportunity} />
                        <Field label="Threats" value={item.threat} />
                        <Link
                          href={`/swot/${item.id}`}
                          className="inline-block text-sm text-[var(--color-brand)] hover:underline"
                        >
                          Open SWOT
                        </Link>
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
                        {locked
                          ? "Not yet available. The Commando SWOT becomes available after the monthly review period ends (when the Commando assignment completes)."
                          : `No ${title.toLowerCase()} recorded yet.`}
                      </p>
                    )}
                  </section>
                );
              })}
            </div>

            <section className="surface p-4">
              <h2 className="text-sm font-semibold">SWOT history</h2>
              {swots.length === 0 ? (
                <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
                  No SWOT records.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-[var(--color-line)]">
                  {swots.map((s) => (
                    <li key={s.id} className="py-3">
                      <Link
                        href={`/swot/${s.id}`}
                        className="flex justify-between gap-3 text-sm"
                      >
                        <span>{s.source.replaceAll("_", " ")}</span>
                        <span className="text-[var(--color-ink-muted)]">
                          {formatDate(s.createdAt)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </SectionFrame>
      )}

      {section === "history" && (
        <SectionFrame
          title="History"
          description="Assignments, SWOT, and activity timeline for this Sales Executive."
        >
          <div className="space-y-4">
            <section className="surface overflow-hidden">
              <h2 className="border-b border-[var(--color-line)] px-4 py-3 text-sm font-semibold">
                Assignments
              </h2>
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
                  {[
                    ...(assignment ? [assignment] : []),
                    ...profile.assignmentHistory,
                  ].map((a) => (
                    <tr key={a.id}>
                      <td>
                        <StatusBadge status={a.status} />
                      </td>
                      <td>{personName(a.commando)}</td>
                      <td>{personName(a.teamLead)}</td>
                      <td>{formatDate(a.startedAt)}</td>
                      <td>{formatDate(a.endedAt)}</td>
                      <td className="tabular-nums">
                        {a.totalDaysUnderCommando}
                      </td>
                    </tr>
                  ))}
                  {!assignment && profile.assignmentHistory.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-8 text-center text-[var(--color-ink-muted)]"
                      >
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
                <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
                  No SWOT records.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-[var(--color-line)]">
                  {swots.map((s) => (
                    <li key={s.id} className="py-3">
                      <Link
                        href={`/swot/${s.id}`}
                        className="flex justify-between gap-3 text-sm"
                      >
                        <span>{s.source.replaceAll("_", " ")}</span>
                        <span className="text-[var(--color-ink-muted)]">
                          {formatDate(s.createdAt)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="surface p-4">
              <h2 className="text-sm font-semibold">Timeline</h2>
              {timeline.length === 0 ? (
                <EmptyState
                  title="No timeline yet"
                  description="Events stay here after status changes."
                />
              ) : (
                <ol className="mt-3 space-y-3 border-l border-[var(--color-line)] pl-3">
                  {timeline.map((event) => (
                    <li
                      key={`${event.type}-${event.at}-${event.title}`}
                      className="text-sm"
                    >
                      <p className="text-xs text-[var(--color-ink-subtle)]">
                        {formatDate(event.at)}
                      </p>
                      {event.href ? (
                        <Link
                          href={event.href}
                          className="font-medium hover:underline"
                        >
                          {event.title}
                        </Link>
                      ) : (
                        <p className="font-medium">{event.title}</p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </SectionFrame>
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

function SectionFrame({
  title,
  description,
  primary,
  children,
}: {
  title: string;
  description: string;
  primary?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            {description}
          </p>
        </div>
        {primary}
      </div>
      {children}
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

function EisenhowerPreview({
  tasks,
  profileId,
}: {
  tasks: EisenhowerTask[];
  profileId: string;
}) {
  const returnTo = `/profiles/${profileId}/eisenhower`;
  const months = Array.from(new Set(tasks.map((t) => t.monthLabel)));
  const groups: Record<string, EisenhowerTask[]> = {
    DO_FIRST: tasks.filter((t) => t.category === "DO_FIRST" && t.isCurrentMonth),
    SCHEDULE: tasks.filter((t) => t.category === "SCHEDULE" && t.isCurrentMonth),
    DELEGATE: tasks.filter((t) => t.category === "DELEGATE" && t.isCurrentMonth),
    ELIMINATE: tasks.filter(
      (t) => t.category === "ELIMINATE" && t.isCurrentMonth,
    ),
  };
  return (
    <div className="mt-3 space-y-3">
      <p className="text-xs text-[var(--color-ink-muted)]">
        Months: {months.join(" · ")}
      </p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Quad
          title="Do first"
          hint="Important + Urgent"
          items={groups.DO_FIRST}
          returnTo={returnTo}
        />
        <Quad
          title="Schedule"
          hint="Important + Not urgent"
          items={groups.SCHEDULE}
          returnTo={returnTo}
        />
        <Quad
          title="Delegate"
          hint="Not important + Urgent"
          items={groups.DELEGATE}
          returnTo={returnTo}
        />
        <Quad
          title="Eliminate"
          hint="Not important + Not urgent"
          items={groups.ELIMINATE}
          returnTo={returnTo}
        />
      </div>
    </div>
  );
}

function Quad({
  title,
  hint,
  items,
  returnTo,
}: {
  title: string;
  hint: string;
  items: EisenhowerTask[];
  returnTo: string;
}) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--color-line)] p-2">
      <p className="font-semibold">{title}</p>
      <p className="text-[var(--color-ink-subtle)]">{hint}</p>
      <ul className="mt-1 space-y-1">
        {items.slice(0, 3).map((t) => (
          <li key={t.id}>
            <Link
              href={`/eisenhower/${t.id}?returnTo=${encodeURIComponent(returnTo)}`}
              className="hover:underline"
            >
              {t.title}
            </Link>
          </li>
        ))}
        {items.length === 0 && (
          <li className="text-[var(--color-ink-muted)]">None this month</li>
        )}
      </ul>
    </div>
  );
}
