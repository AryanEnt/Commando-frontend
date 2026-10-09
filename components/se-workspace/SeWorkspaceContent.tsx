"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  api,
  errorMessage,
  type ActionItem,
  type DailyLog,
  type EisenhowerTask,
  type FeedbackItem,
  type MonitoringRecord,
  type PerformanceMetrics,
  type SupportTask,
  type SwotItem,
  type WeeklyReview,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { toast } from "@/lib/toast";
import { formatDate, formatWhen } from "@/lib/dates";
import {
  swotDetailHref,
  swotKindLabel,
  swotSourceLabel,
} from "@/lib/swot-display";
import { ProfileSwotPanel } from "@/components/swot/ProfileSwotPanel";
import {
  SwotWorkspaceView,
  UserSwotSection,
} from "@/components/swot/SwotSections";
import { personName } from "@/lib/labels";
import { INTERVENTION_STAGES, interventionStageFromAssignment } from "@/lib/lifecycle";
import { useSeWorkspace } from "@/lib/se-workspace-context";
import {
  seCreateHref,
  seSwotCreateHref,
  seSectionFromPathname,
  seWorkspaceHref,
  type SeSection,
} from "@/lib/se-workspace-nav";
import { StatusBadge } from "@/components/StatusBadge";
import { SeAccountabilityOverview } from "@/components/se-workspace/SeAccountabilityOverview";
import { SeActionsPanel } from "@/components/se-workspace/SeActionsPanel";
import { SeActivityTimeline } from "@/components/se-workspace/SeActivityTimeline";
import { SeFeedbackPanel } from "@/components/se-workspace/SeFeedbackPanel";
import { SeSupportPanel } from "@/components/se-workspace/SeSupportPanel";
import { SalesExecutiveDashboard } from "@/components/dashboard/SalesExecutiveDashboard";
import { SeEisenhowerPanel } from "@/components/se-workspace/SeEisenhowerPanel";
import { CoachingDailyLogsSection } from "@/components/daily-logs/CoachingDailyLogsSection";
import { DailyWorkLogPanel } from "@/components/daily-work-logs/DailyWorkLogPanel";
import { WeeklyReviewHub } from "@/components/weekly-reviews/WeeklyReviewHub";
import { SeWeeklyReviewsPanel } from "@/components/se-workspace/SeWeeklyReviewsPanel";
import { SeChecklistWorkspace } from "@/components/monitoring/SeChecklistWorkspace";
import { HandoffReportDialog } from "@/components/assignments/HandoffReportDialog";
import { HandoffReportsPanel } from "@/components/assignments/HandoffReportsPanel";
import {
  Button,
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
    commandoReadOnly,
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
  const [swotError, setSwotError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<WeeklyReview[]>([]);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [monitoring, setMonitoring] = useState<MonitoringRecord[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [eisenhower, setEisenhower] = useState<EisenhowerTask[]>([]);
  const [supportTasks, setSupportTasks] = useState<SupportTask[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [signingReviewId, setSigningReviewId] = useState<string | null>(null);

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
          .getSwotList(token, { profileId: id, pageSize: 100 })
          .then((r) => {
            setSwots(r.data.items);
            setSwotError(null);
          })
          .catch((err) => {
            setSwots([]);
            setSwotError(
              err instanceof Error ? err.message : "Unable to load SWOT history",
            );
          }),
      );
    }
    if (section === "coaching" || section === "overview" || section === "feedback") {
      if (hasPermission("FEEDBACK_VIEW")) {
        jobs.push(
          api
            .getFeedback(token, {
              profileId: id,
              pageSize: section === "feedback" ? 100 : 12,
            })
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
            .getWeeklyReviews(token, {
              profileId: id,
              pageSize: section === "reviews" ? 100 : 12,
            })
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
        const actionView = "all";
        jobs.push(
          api
            .getActionItems(token, {
              profileId: id,
              view: actionView,
              pageSize: 100,
            })
            .then((r) => setActions(r.data.actionItems))
            .catch(() => setActions([])),
        );
      }
    }
    if (
      section === "overview" ||
      section === "performance" ||
      section === "swot" ||
      section === "verdict"
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
    }
    void Promise.all(jobs);
  }, [token, params.id, hasPermission, section, user?.roleCode]);

  async function retryMetrics() {
    if (!token || !params.id || !hasPermission("PERFORMANCE_VIEW")) return;
    setMetricsLoading(true);
    setMetricsError(null);
    try {
      const r = await api.getPerformanceMetrics(token, params.id);
      setMetrics(r.data.metrics);
      setMetricsError(null);
    } catch (err) {
      setMetrics(null);
      setMetricsError(
        err instanceof Error
          ? err.message
          : "Unable to load performance data",
      );
    } finally {
      setMetricsLoading(false);
    }
  }

  async function onInterventionCompleted() {
    setConfirmComplete(false);
    toast.success("Intervention completed", {
      description: "Your handoff report is with the Team Lead.",
    });
    await reload();
  }

  async function signWeeklyReview(reviewId: string) {
    if (!token) return;
    setSigningReviewId(reviewId);
    try {
      const res = await api.acknowledgeWeeklyReview(token, reviewId);
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? res.data.review : r)),
      );
      toast.success("Weekly review signed");
    } catch (err) {
      toast.error(errorMessage(err, "Unable to sign weekly review"));
    } finally {
      setSigningReviewId(null);
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
  const canViewHandoffReports = role === "TEAM_LEAD" || role === "SUPER_ADMIN";
  const latestEndedAssignment = profile.assignmentHistory
    .filter((a) => a.endedAt)
    .reduce<(typeof profile.assignmentHistory)[number] | null>(
      (latest, a) => (!latest || a.endedAt! > latest.endedAt! ? a : latest),
      null,
    );

  const stage = interventionStageFromAssignment(
    assignment,
    workspace?.latestReferral?.status,
  );
  const referral = workspace?.latestReferral;

  const isSse = role === "SALES_SUPPORT_EXECUTIVE";
  const profileSwotSelfView = isSe || isSse;
  const userSwots = swots.filter(
    (s) => (s.subjectType ?? "EXECUTIVE") === "EXECUTIVE",
  );
  const canUpdateUserSwot =
    hasPermission("SWOT_CREATE") &&
    role !== "SUPER_ADMIN" &&
    !(isTl && teamLeadLocked) &&
    !commandoReadOnly;
  // Profile SWOT stays writable for the Team Lead during an intervention.
  const canUpdateProfileSwot =
    hasPermission("SWOT_CREATE") &&
    (isTl || (isCommando && Boolean(assignment) && !commandoReadOnly));

  // Super Admin is read-only on SE operational data; Commando / Team Lead write.
  const canOperate =
    !isSe &&
    role !== "SUPER_ADMIN" &&
    (isCommando ? Boolean(assignment) : isTl ? !teamLeadLocked : false);

  function canCreate(permission: string) {
    return hasPermission(permission) && canOperate;
  }

  // Monthly planning stays available to Team Leads during Commando intervention.
  // Priorities come from Daily Logs; Team Leads keep access during Commando.
  const canAddEisenhowerViaDailyLog =
    hasPermission("DAILY_LOG_CREATE") &&
    !isSe &&
    role !== "SUPER_ADMIN" &&
    (isTl || (isCommando && Boolean(assignment)));

  /* Weekly Review: SE gets a read-only review center; writers keep the hub. */
  if (section === "reviews") {
    if (isSe) {
      return (
        <div>
          <SeWeeklyReviewsPanel
            profileId={profile.id}
            profileName={profile.displayName}
            history={reviews}
            onSign={(id) => void signWeeklyReview(id)}
            signingReviewId={signingReviewId}
          />
        </div>
      );
    }
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <WeeklyReviewHub
          profileId={profile.id}
          profileName={profile.displayName}
          canCreate={Boolean(canCreate("WEEKLY_REVIEW_CREATE"))}
          isSe={false}
          history={reviews}
          onSign={(id) => void signWeeklyReview(id)}
          signingReviewId={signingReviewId}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {!isSe &&
        assignment &&
        (section === "overview" || section === "interventions") && (
        <LifecycleStepper stages={[...INTERVENTION_STAGES]} current={stage} />
      )}

      {section === "overview" &&
        (isSe ? (
          <SalesExecutiveDashboard
            profile={profile}
            workspace={workspace}
            supportTeam={supportTeam}
            metrics={metrics}
            metricsLoading={metricsLoading}
            metricsError={metricsError}
            onRetryMetrics={retryMetrics}
            feedback={feedback}
            reviews={reviews}
            swots={userSwots}
            actions={actions}
            eisenhower={eisenhower}
            supportTasks={supportTasks}
            canEditSelfSwot={
              Boolean(
                hasPermission("SWOT_CREATE") &&
                  user?.roleCode !== "SUPER_ADMIN",
              )
            }
            canViewSupport={hasPermission("SALES_SUPPORT_LINK_VIEW")}
            canCompleteActions
            onActionsChanged={async () => {
              if (!token) return;
              const res = await api.getActionItems(token, {
                profileId: profile.id,
                view: "active",
                pageSize: 20,
              });
              setActions(res.data.actionItems);
            }}
          />
        ) : (
          <SeAccountabilityOverview
            profile={profile}
            workspace={workspace}
            supportTeam={supportTeam}
            metrics={metrics}
            metricsLoading={metricsLoading}
            metricsError={metricsError}
            feedback={feedback}
            reviews={reviews}
            swots={userSwots}
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
                  (isSe ||
                    (isTl && !teamLeadLocked) ||
                    (isCommando && !commandoReadOnly)),
              )
            }
            canViewSupport={hasPermission("SALES_SUPPORT_LINK_VIEW")}
          />
        ))}

      {section === "timeline" && (
        <SeActivityTimeline
          profileId={profile.id}
          profileName={profile.displayName}
          canCreate={
            !isSe &&
            role !== "SUPER_ADMIN" &&
            !teamLeadLocked &&
            (isTl || (isCommando && Boolean(assignment)))
          }
          defaultRange="week"
        />
      )}

      {section === "coaching" && (
        <CoachingDailyLogsSection
          profileId={profile.id}
          profileName={profile.displayName}
          logs={logs}
          canCreate={canCreate("DAILY_LOG_CREATE")}
        />
      )}

      {section === "work-log" && (
        <DailyWorkLogPanel
          profileId={profile.id}
          mode={user?.id === profile.user?.id ? "author" : "review"}
          title="Daily Work Log"
        />
      )}

      {section === "checklist" && (
        <SeChecklistWorkspace
          profileId={profile.id}
          profileName={profile.displayName}
          teamName={profile.team.name}
          teamLeadName={
            profile.currentAssignment?.teamLead
              ? personName(profile.currentAssignment.teamLead)
              : null
          }
          commandoName={
            profile.currentAssignment?.commando
              ? personName(profile.currentAssignment.commando)
              : null
          }
          statusLabel={
            profile.currentAssignment
              ? "Active Intervention"
              : workspace?.health?.status
                ? workspace.health.status === "NEEDS_ATTENTION"
                  ? "Under review"
                  : workspace.health.status === "AT_RISK"
                    ? "At risk"
                    : "On track"
                : null
          }
          activeIntervention={Boolean(profile.currentAssignment)}
        />
      )}

      {section === "monitoring" && (
        <SectionFrame
          title="Monitor"
          description="Use the current checklist to record today's observation."
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
          {!commandoReadOnly ? (
            <div className="mb-3">
              <Link
                href={seWorkspaceHref(profile.id, "checklist")}
                className="ck-entry-link"
              >
                Customize Checklist
              </Link>
            </div>
          ) : null}
          <section className="surface p-4">
            {monitoring.length === 0 ? (
              <EmptyState
                title="No monitoring sessions yet"
                description="Monitoring sessions for this SE will appear here."
                actionHref={
                  canCreate("MONITORING_CREATE")
                    ? seCreateHref(profile.id, "monitoring")
                    : undefined
                }
                actionLabel={
                  canCreate("MONITORING_CREATE") ? "Start monitoring" : undefined
                }
              />
            ) : (
              <ul className="divide-y divide-[var(--color-line)]">
                {monitoring.map((m) => {
                  const yes = m.responses?.filter((r) => r.value === "YES").length ?? 0;
                  const total = m.responses?.length ?? 0;
                  return (
                    <li key={m.id} className="py-3">
                      <Link
                        href={`/monitoring/${m.id}?returnTo=${encodeURIComponent(seWorkspaceHref(profile.id, "monitoring"))}`}
                        className="flex justify-between gap-3"
                      >
                        <span>
                          <span className="block text-sm font-medium">
                            {m.category.name}
                          </span>
                          <span className="text-xs text-[var(--color-ink-muted)]">
                            {total > 0 ? `${yes} / ${total} completed` : "Session"}
                            {m.observation?.trim() ? " · Observation" : ""}
                          </span>
                        </span>
                        <span className="text-xs tabular-nums text-[var(--color-ink-subtle)]">
                          {formatDate(m.observedAt)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </SectionFrame>
      )}

      {section === "eisenhower" && (
        <SeEisenhowerPanel
          profileId={profile.id}
          profileName={profile.displayName}
          canCreate={canAddEisenhowerViaDailyLog}
        />
      )}

      {section === "actions" && (
        <SeActionsPanel
          profileId={profile.id}
          profileName={profile.displayName}
          actions={actions}
          canCreate={canCreate("ACTION_ITEM_CREATE")}
          canComplete={canCreate("ACTION_ITEM_UPDATE") || isSe}
          teamName={profile.team.name}
          teamLeadName={
            profile.currentAssignment?.teamLead
              ? personName(profile.currentAssignment.teamLead)
              : null
          }
          commandoName={
            profile.currentAssignment?.commando
              ? personName(profile.currentAssignment.commando)
              : null
          }
          statusLabel={
            profile.currentAssignment
              ? "Active Intervention"
              : workspace?.health?.status
                ? workspace.health.status === "NEEDS_ATTENTION"
                  ? "Under review"
                  : workspace.health.status === "AT_RISK"
                    ? "At risk"
                    : "On track"
                : null
          }
          activeIntervention={Boolean(profile.currentAssignment)}
          onChanged={async () => {
            if (!token) return;
            const res = await api.getActionItems(token, {
              profileId: profile.id,
              view: "all",
              pageSize: 100,
            });
            setActions(res.data.actionItems);
          }}
        />
      )}

      {section === "support" && (
        <SeSupportPanel
          profileId={profile.id}
          profileName={profile.displayName}
          teamLeadLocked={teamLeadLocked}
          canAssign={
            hasPermission("SALES_SUPPORT_LINK_ASSIGN") &&
            !teamLeadLocked &&
            !commandoReadOnly
          }
          canView={hasPermission("SALES_SUPPORT_LINK_VIEW")}
          canCreateTask={
            hasPermission("SALES_SUPPORT_TASK_CREATE") &&
            !teamLeadLocked &&
            !commandoReadOnly
          }
          supportTeam={supportTeam}
          supportTasks={supportTasks}
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
                onClick={() => setConfirmComplete(true)}
              >
                Complete intervention
              </Button>
            ) : isCommando && !assignment && hasPermission("REFERRAL_VIEW") ? (
              <Link
                href={`/referrals/request?profileId=${encodeURIComponent(profile.id)}&returnTo=${encodeURIComponent(seWorkspaceHref(profile.id, "interventions"))}`}
                className="action-chip"
              >
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
                    Started {formatWhen(assignment.startedAt)} · Team Lead{" "}
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
                    <td className="tabular-nums text-[13px]">
                      {formatWhen(a.startedAt)}
                    </td>
                    <td className="tabular-nums text-[13px]">
                      {formatWhen(a.endedAt)}
                    </td>
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
          {canViewHandoffReports && latestEndedAssignment ? (
            <div className="mt-4">
              <HandoffReportsPanel
                key={latestEndedAssignment.id}
                assignmentId={latestEndedAssignment.id}
              />
            </div>
          ) : null}
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
        <SeFeedbackPanel
          profileId={profile.id}
          profileName={profile.displayName}
          feedback={feedback}
          canCreate={canCreate("FEEDBACK_CREATE")}
          teamName={profile.team.name}
          teamLeadName={
            profile.currentAssignment?.teamLead
              ? personName(profile.currentAssignment.teamLead)
              : null
          }
          commandoName={
            profile.currentAssignment?.commando
              ? personName(profile.currentAssignment.commando)
              : null
          }
          statusLabel={
            profile.currentAssignment
              ? "Active Intervention"
              : workspace?.health?.status
                ? workspace.health.status === "NEEDS_ATTENTION"
                  ? "Under review"
                  : workspace.health.status === "AT_RISK"
                    ? "At risk"
                    : "On track"
                : null
          }
          activeIntervention={Boolean(profile.currentAssignment)}
          onFeedbackChanged={() => {
            if (!token || !hasPermission("FEEDBACK_VIEW")) return;
            void api
              .getFeedback(token, { profileId: profile.id, pageSize: 100 })
              .then((r) => setFeedback(r.data.feedback))
              .catch(() => setFeedback([]));
          }}
        />
      )}

      {section === "performance" && (
        <SectionFrame
          title={isSe ? "My development" : "Performance"}
          description="Current score, metrics, and SWOT assessments by source."
          primary={
            hasPermission("SWOT_CREATE") &&
            user?.roleCode !== "SUPER_ADMIN" &&
            !(isTl && teamLeadLocked) &&
            !commandoReadOnly ? (
              <Link
                href={seCreateHref(profile.id, "swot")}
                className="action-chip"
              >
                {isSe ? "Edit my SWOT" : "Update User SWOT"}
              </Link>
            ) : null
          }
        >
          <div className="space-y-4">
            <section className="surface p-4" id="verdict">
              <h2 className="text-sm font-semibold">Current score</h2>
              {metricsLoading ? (
                <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
                  Loading…
                </p>
              ) : metricsError ? (
                <div className="mt-2">
                  <p className="text-sm text-[var(--status-danger)]">
                    Unable to load performance data
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                    {metricsError}
                  </p>
                </div>
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

            <UserSwotSection
              swots={swots}
              viewerIsSubject={isSe}
              viewerRole={role}
              returnTo={pathname}
              error={swotError}
              historyHref={seWorkspaceHref(profile.id, "swot")}
            />

            <ProfileSwotPanel
              profileId={profile.id}
              swots={swots}
              canUpdate={canUpdateProfileSwot}
              returnTo={pathname}
              viewerIsSelf={profileSwotSelfView}
              showHistory={false}
            />
          </div>
        </SectionFrame>
      )}

      {section === "verdict" && (
        <SectionFrame
          title="TL Verdict"
          description={`Team Lead performance verdict and score for ${profile.displayName}.`}
        >
          <section className="surface p-4">
            <h2 className="text-sm font-semibold">Current verdict</h2>
            {metricsLoading ? (
              <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
                Loading…
              </p>
            ) : metricsError ? (
              <div className="mt-2">
                <p className="text-sm text-[var(--status-danger)]">
                  Unable to load performance data
                </p>
                <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                  {metricsError}
                </p>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm mt-3"
                  onClick={() => void retryMetrics()}
                >
                  Retry
                </button>
              </div>
            ) : metrics?.myPerformanceMetric ? (
              <div className="mt-3 grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-[var(--color-ink-subtle)]">Score</p>
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
                    Verdict
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {metrics.myPerformanceMetric.verdict?.replaceAll("_", " ") ??
                      workspace?.health.status.replaceAll("_", " ") ??
                      "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-ink-subtle)]">
                    Source
                  </p>
                  <p className="mt-1 text-sm">
                    {metrics.myPerformanceMetric.source.replaceAll("_", " ")} ·{" "}
                    {formatDate(metrics.myPerformanceMetric.evaluatedAt)}
                  </p>
                </div>
              </div>
            ) : (
              <EmptyState
                title="No verdict yet"
                description="Team Lead evaluations will appear here when recorded."
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
            <div className="mt-4">
              <Link
                href={seWorkspaceHref(profile.id, "performance")}
                className="text-sm font-medium text-[var(--color-brand)] hover:underline"
              >
                Open full performance →
              </Link>
            </div>
          </section>
        </SectionFrame>
      )}

      {section === "swot" && (
        <SectionFrame
          title="SWOT"
          description={
            isSe
              ? "Two separate SWOTs: User SWOT is about you as a person, Profile SWOT is about the account. Updating one never changes the other."
              : `Two separate SWOTs for ${profile.displayName}: User SWOT is about the person, Profile SWOT is about the account. Updating one never changes the other.`
          }
        >
          <SwotWorkspaceView
            swots={swots}
            viewerIsSubject={isSe}
            viewerRole={role}
            returnTo={pathname}
            error={swotError}
            userSwotLinks={
              canUpdateUserSwot
                ? {
                    updateHref: seSwotCreateHref(profile.id),
                    newHref: seSwotCreateHref(profile.id, true),
                  }
                : null
            }
            profileSection={
              <ProfileSwotPanel
                profileId={profile.id}
                swots={swots}
                canUpdate={canUpdateProfileSwot}
                returnTo={pathname}
                viewerIsSelf={profileSwotSelfView}
                showHistory={false}
              />
            }
          />
        </SectionFrame>
      )}

      {section === "history" && (
        <SectionFrame
          title="History"
          description={`Audit-style journey for ${profile.displayName}: referral, approval, intervention, reviews, monitoring, actions, support, and completion.`}
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
                      <td className="tabular-nums text-[13px]">
                        {formatWhen(a.startedAt)}
                      </td>
                      <td className="tabular-nums text-[13px]">
                        {formatWhen(a.endedAt)}
                      </td>
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
                        href={swotDetailHref(s.id, pathname)}
                        className="flex justify-between gap-3 text-sm"
                      >
                        <span>
                          {swotKindLabel(s)} · {swotSourceLabel(s.source)}
                        </span>
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
              <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                Referral · Approval · Intervention · Reviews · Monitoring ·
                Actions · Support · Completion
              </p>
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

      <HandoffReportDialog
        open={confirmComplete}
        assignmentId={profile.currentAssignment?.id ?? null}
        profileName={profile.displayName}
        endInput={{
          status: "COMPLETED",
          completionReason: "Intervention completed from Sales Executive workspace",
        }}
        onCancel={() => setConfirmComplete(false)}
        onCompleted={onInterventionCompleted}
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

