"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  api,
  type DailyLog,
  type FeedbackItem,
  type MonitoringRecord,
  type SupportTask,
  type SwotItem,
  type WeeklyReview,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/dates";
import { personName, responsibilityTypeLabel } from "@/lib/labels";
import { formatSwotField } from "@/lib/swot-points";
import { swotSourceLabel } from "@/lib/swot-display";
import { useSseWorkspace } from "@/lib/sse-workspace-context";
import {
  SSE_LIVE_SECTIONS,
  sseCreateHref,
  sseDailyLogHref,
  sseSectionFromPathname,
  sseSectionLabel,
  sseSwotCreateHref,
  sseWorkspaceHref,
  type SseSection,
} from "@/lib/sse-workspace-nav";
import { DailyWorkLogPanel } from "@/components/daily-work-logs/DailyWorkLogPanel";
import { CoachingDailyLogsSection } from "@/components/daily-logs/CoachingDailyLogsSection";
import { SeFeedbackPanel } from "@/components/se-workspace/SeFeedbackPanel";
import { SeChecklistWorkspace } from "@/components/monitoring/SeChecklistWorkspace";
import { StatusBadge } from "@/components/StatusBadge";
import {
  ButtonLink,
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui";

function latestBySource(swots: SwotItem[], source: SwotItem["source"]) {
  return swots.find((s) => s.source === source) ?? null;
}

function SectionFrame({
  title,
  description,
  primary,
  children,
}: {
  title: string;
  description?: string;
  primary?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[1.05rem] font-semibold tracking-tight text-[var(--color-ink)]">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-[13px] text-[var(--color-ink-muted)]">
              {description}
            </p>
          ) : null}
        </div>
        {primary ? <div className="shrink-0">{primary}</div> : null}
      </div>
      {children}
    </div>
  );
}

function SwotTile({
  item,
  title,
}: {
  item: SwotItem | null;
  title: string;
}) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-semibold text-[var(--color-ink)]">
          {title}
        </p>
        {item ? (
          <Link
            href={`/swot/${item.id}`}
            className="text-[11px] font-medium text-[var(--color-brand)] hover:underline"
          >
            Open
          </Link>
        ) : null}
      </div>
      {!item ? (
        <p className="mt-2 text-[12px] text-[var(--color-ink-muted)]">
          Not recorded yet.
        </p>
      ) : (
        <>
          <div className="mt-2.5 grid grid-cols-2 gap-1.5">
            {(
              [
                [
                  "S",
                  item.strength,
                  item.strengthPoints,
                  "bg-[var(--status-success-bg)] text-[var(--status-success)]",
                ],
                [
                  "W",
                  item.weakness,
                  item.weaknessPoints,
                  "bg-[var(--status-info-bg)] text-[var(--status-info)]",
                ],
                [
                  "O",
                  item.opportunity,
                  item.opportunityPoints,
                  "bg-[var(--status-warn-bg)] text-[var(--status-warn)]",
                ],
                [
                  "T",
                  item.threat,
                  item.threatPoints,
                  "bg-[var(--color-accent-soft)] text-[var(--color-accent)]",
                ],
              ] as const
            ).map(([k, v, points, tone]) => (
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
                  {formatSwotField(points, v) ?? "Held back"}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-[var(--color-ink-subtle)]">
            {personName(item.createdBy)} · {formatDate(item.createdAt)}
            {item.versionNumber ? ` · v${item.versionNumber}` : ""}
          </p>
        </>
      )}
    </div>
  );
}

function PendingSection({ section }: { section: SseSection }) {
  return (
    <SectionFrame
      title={sseSectionLabel(section)}
      description="Same workspace structure as Sales Executive. Records for this Sales Support will appear here as they are captured."
    >
      <section className="surface p-4">
        <EmptyState
          title={`No ${sseSectionLabel(section).toLowerCase()} yet`}
          description="Nothing recorded for this Sales Support Executive in this section."
        />
      </section>
    </SectionFrame>
  );
}

export function SseWorkspaceContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token, user, hasPermission } = useAuth();
  const { userId, subject, loading, error, reload } = useSseWorkspace();
  const section = sseSectionFromPathname(pathname);

  const [swots, setSwots] = useState<SwotItem[]>([]);
  const [tasks, setTasks] = useState<SupportTask[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [monitoring, setMonitoring] = useState<MonitoringRecord[]>([]);
  const [reviews, setReviews] = useState<WeeklyReview[]>([]);
  const [sectionLoading, setSectionLoading] = useState(false);

  const isManager =
    user?.roleCode === "TEAM_LEAD" ||
    user?.roleCode === "COMMANDO_EXECUTIVE" ||
    user?.roleCode === "SUPER_ADMIN";

  const canCreateSwot =
    hasPermission("SWOT_CREATE") &&
    (user?.roleCode === "TEAM_LEAD" ||
      user?.roleCode === "COMMANDO_EXECUTIVE");
  const canViewSwot = hasPermission("SWOT_VIEW");
  const canViewWorkLog = hasPermission("DAILY_WORK_LOG_VIEW");
  const canViewTasks = hasPermission("SALES_SUPPORT_TASK_VIEW");
  const canViewLogs = hasPermission("DAILY_LOG_VIEW");
  const canCreateLogs =
    hasPermission("DAILY_LOG_CREATE") &&
    user?.roleCode !== "SUPER_ADMIN";
  const canViewFeedback = hasPermission("FEEDBACK_VIEW");
  const canCreateFeedback =
    hasPermission("FEEDBACK_CREATE") &&
    user?.roleCode !== "SUPER_ADMIN";
  const canViewMonitoring = hasPermission("MONITORING_VIEW");
  const canCreateMonitoring =
    hasPermission("MONITORING_CREATE") &&
    user?.roleCode !== "SUPER_ADMIN";
  const canViewReviews = hasPermission("WEEKLY_REVIEW_VIEW");
  const canCreateReviews =
    hasPermission("WEEKLY_REVIEW_CREATE") &&
    user?.roleCode !== "SUPER_ADMIN";

  useEffect(() => {
    const legacy = searchParams.get("tab");
    if (!legacy || !userId) return;
    const map: Record<string, SseSection> = {
      overview: "overview",
      swot: "swot",
      "work-log": "work-log",
      tasks: "actions",
    };
    const next = map[legacy];
    if (next) {
      router.replace(sseWorkspaceHref(userId, next));
    }
  }, [searchParams, userId, router]);

  useEffect(() => {
    if (!token || !userId || !SSE_LIVE_SECTIONS.has(section)) return;
    let cancelled = false;
    setSectionLoading(true);
    const jobs: Promise<void>[] = [];

    if (
      canViewSwot &&
      (section === "overview" ||
        section === "swot" ||
        section === "history" ||
        section === "timeline")
    ) {
      jobs.push(
        api
          .getSwotList(token, { subjectUserId: userId, pageSize: 50 })
          .then((res) => {
            if (!cancelled) setSwots(res.data.items);
          })
          .catch(() => {
            if (!cancelled) setSwots([]);
          }),
      );
    }

    if (
      canViewTasks &&
      (section === "overview" ||
        section === "actions" ||
        section === "timeline" ||
        section === "history")
    ) {
      jobs.push(
        api
          .getSupportTasks(token, {
            salesSupportUserId: userId,
            pageSize: 100,
          })
          .then((res) => {
            if (!cancelled) setTasks(res.data.tasks);
          })
          .catch(() => {
            if (!cancelled) setTasks([]);
          }),
      );
    }

    if (canViewLogs && section === "coaching") {
      jobs.push(
        api
          .getDailyLogs(token, {
            executiveUserId: userId,
            pageSize: 100,
          })
          .then((res) => {
            if (!cancelled) setLogs(res.data.logs);
          })
          .catch(() => {
            if (!cancelled) setLogs([]);
          }),
      );
    }

    if (canViewFeedback && section === "feedback") {
      jobs.push(
        api
          .getFeedback(token, {
            executiveUserId: userId,
            pageSize: 100,
          })
          .then((res) => {
            if (!cancelled) setFeedback(res.data.feedback);
          })
          .catch(() => {
            if (!cancelled) setFeedback([]);
          }),
      );
    }

    if (canViewReviews && section === "reviews") {
      jobs.push(
        api
          .getWeeklyReviews(token, {
            executiveUserId: userId,
            pageSize: 100,
          })
          .then((res) => {
            if (!cancelled) setReviews(res.data.reviews);
          })
          .catch(() => {
            if (!cancelled) setReviews([]);
          }),
      );
    }

    if (canViewMonitoring && section === "monitoring") {
      jobs.push(
        api
          .getMonitoringRecords(token, {
            executiveUserId: userId,
            pageSize: 100,
          })
          .then((res) => {
            if (!cancelled) setMonitoring(res.data.records);
          })
          .catch(() => {
            if (!cancelled) setMonitoring([]);
          }),
      );
    }

    void Promise.all(jobs).finally(() => {
      if (!cancelled) setSectionLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [
    token,
    userId,
    section,
    canViewSwot,
    canViewTasks,
    canViewLogs,
    canViewFeedback,
    canViewMonitoring,
    canViewReviews,
  ]);

  const selfSwot = useMemo(
    () => latestBySource(swots, "SALES_SUPPORT_EXECUTIVE"),
    [swots],
  );
  const tlSwot = useMemo(() => latestBySource(swots, "TEAM_LEAD"), [swots]);
  const commandoSwot = useMemo(
    () => latestBySource(swots, "COMMANDO"),
    [swots],
  );
  const openTasks = useMemo(
    () => tasks.filter((t) => t.status !== "COMPLETED"),
    [tasks],
  );

  const timelineEvents = useMemo(() => {
    const events: Array<{
      at: string;
      title: string;
      detail: string;
      href?: string;
    }> = [];
    for (const s of swots) {
      events.push({
        at: s.createdAt,
        title: `${swotSourceLabel(s.source)} SWOT`,
        detail: s.versionNumber ? `Version ${s.versionNumber}` : "Recorded",
        href: `/swot/${s.id}`,
      });
    }
    for (const t of tasks) {
      events.push({
        at: t.updatedAt ?? t.createdAt,
        title: t.title,
        detail: `${t.profile.displayName} · ${t.status}`,
        href: `/my-tasks/${t.id}?returnTo=${encodeURIComponent(sseWorkspaceHref(userId, "actions"))}`,
      });
    }
    for (const link of subject?.links ?? []) {
      events.push({
        at: link.startedAt,
        title: `Linked to ${link.profile.displayName}`,
        detail: link.responsibilityType
          ? responsibilityTypeLabel(link.responsibilityType)
          : "Support",
        href: `/profiles/${link.salesExecutiveProfileId}`,
      });
    }
    return events.sort(
      (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
    );
  }, [swots, tasks, subject?.links, userId]);

  if (!isManager) {
    return (
      <ErrorState message="This workspace is for Team Lead and Commando." />
    );
  }

  if (loading && !subject) {
    return <LoadingState label="Loading Sales Support workspace…" />;
  }

  if (error && !subject) {
    return <ErrorState message={error} onRetry={() => void reload()} />;
  }

  if (!subject) {
    return <ErrorState message="Sales Support not found." />;
  }

  if (!SSE_LIVE_SECTIONS.has(section)) {
    return <PendingSection section={section} />;
  }

  if (sectionLoading && section !== "work-log") {
    return <LoadingState label="Loading…" />;
  }

  if (section === "overview") {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)]">
          <div className="flex items-center justify-between gap-2 border-b border-[var(--color-line)] px-4 py-3">
            <div>
              <h2 className="text-[15px] font-semibold text-[var(--color-ink)]">
                Linked Sales Executives
              </h2>
              <p className="mt-0.5 text-meta">
                Active support relationships in your scope
              </p>
            </div>
            <ButtonLink
              href={sseWorkspaceHref(userId, "support")}
              variant="ghost"
              size="sm"
            >
              View all
            </ButtonLink>
          </div>
          {subject.links.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="No active links"
                description="This person is not currently assigned as Sales Support in your scope."
              />
            </div>
          ) : (
            <ul className="divide-y divide-[var(--color-line)]">
              {subject.links.slice(0, 5).map((link) => (
                <li key={link.id}>
                  <Link
                    href={`/profiles/${link.salesExecutiveProfileId}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-[var(--color-surface-2)]"
                  >
                    <span>
                      <span className="block text-sm font-medium text-[var(--color-ink)]">
                        {link.profile.displayName}
                      </span>
                      <span className="text-xs text-[var(--color-ink-muted)]">
                        {link.responsibilityType
                          ? responsibilityTypeLabel(link.responsibilityType)
                          : "Support"}
                        {" · since "}
                        {formatDate(link.startedAt)}
                      </span>
                    </span>
                    <StatusBadge status="ACTIVE" label="Active" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)]">
          <div className="flex items-center justify-between gap-2 border-b border-[var(--color-line)] px-4 py-3">
            <div>
              <h2 className="text-[15px] font-semibold text-[var(--color-ink)]">
                Executive SWOT
              </h2>
              <p className="mt-0.5 text-meta">Latest by source</p>
            </div>
            <div className="flex gap-2">
              {canCreateSwot ? (
                <ButtonLink href={sseSwotCreateHref(userId)} size="sm">
                  Update SWOT
                </ButtonLink>
              ) : null}
              <ButtonLink
                href={sseWorkspaceHref(userId, "swot")}
                variant="ghost"
                size="sm"
              >
                Open
              </ButtonLink>
            </div>
          </div>
          {canViewSwot ? (
            <div className="grid gap-3 p-4 sm:grid-cols-3">
              <SwotTile item={selfSwot} title="Self" />
              <SwotTile item={tlSwot} title="Team Lead" />
              <SwotTile item={commandoSwot} title="Commando" />
            </div>
          ) : (
            <div className="p-4">
              <EmptyState
                title="SWOT unavailable"
                description="You do not have permission to view SWOT."
              />
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] lg:col-span-2">
          <div className="flex items-center justify-between gap-2 border-b border-[var(--color-line)] px-4 py-3">
            <div>
              <h2 className="text-[15px] font-semibold text-[var(--color-ink)]">
                Open tasks
              </h2>
              <p className="mt-0.5 text-meta">Assigned support work</p>
            </div>
            <ButtonLink
              href={sseWorkspaceHref(userId, "actions")}
              variant="ghost"
              size="sm"
            >
              All tasks
            </ButtonLink>
          </div>
          {!canViewTasks ? (
            <div className="p-4">
              <EmptyState
                title="Tasks unavailable"
                description="You do not have permission to view support tasks."
              />
            </div>
          ) : openTasks.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="No open tasks"
                description="Assign tasks from a linked Sales Executive’s Support panel."
              />
            </div>
          ) : (
            <ul className="divide-y divide-[var(--color-line)]">
              {openTasks.slice(0, 6).map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/my-tasks/${t.id}?returnTo=${encodeURIComponent(sseWorkspaceHref(userId, "actions"))}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-[var(--color-surface-2)]"
                  >
                    <span>
                      <span className="block text-sm font-medium">
                        {t.title}
                      </span>
                      <span className="text-xs text-[var(--color-ink-muted)]">
                        {t.profile.displayName}
                        {t.dueDate ? ` · due ${formatDate(t.dueDate)}` : ""}
                      </span>
                    </span>
                    <StatusBadge
                      status={t.isOverdue ? "OVERDUE" : t.status}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    );
  }

  if (section === "swot") {
    return (
      <SectionFrame
        title="SWOT"
        description="Executive SWOT for this Sales Support (self, Team Lead, Commando)."
        primary={
          canCreateSwot ? (
            <ButtonLink href={sseSwotCreateHref(userId)} size="sm">
              Update SWOT
            </ButtonLink>
          ) : null
        }
      >
        {!canViewSwot ? (
          <EmptyState
            title="SWOT unavailable"
            description="You do not have permission to view SWOT."
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-3">
            <SwotTile item={selfSwot} title="Self" />
            <SwotTile item={tlSwot} title="Team Lead" />
            <SwotTile item={commandoSwot} title="Commando" />
          </div>
        )}
        {canViewSwot && swots.length > 0 ? (
          <section className="mt-4 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)]">
            <div className="border-b border-[var(--color-line)] px-4 py-3">
              <h3 className="text-[14px] font-semibold">All versions</h3>
            </div>
            <ul className="divide-y divide-[var(--color-line)]">
              {swots.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/swot/${s.id}`}
                    className="flex justify-between gap-3 px-4 py-3 text-sm hover:bg-[var(--color-surface-2)]"
                  >
                    <span>
                      <span className="font-medium">
                        {swotSourceLabel(s.source)}
                      </span>
                      <span className="text-[var(--color-ink-muted)]">
                        {" · "}
                        {personName(s.createdBy)}
                        {s.versionNumber ? ` · v${s.versionNumber}` : ""}
                      </span>
                    </span>
                    <span className="text-xs tabular-nums text-[var(--color-ink-subtle)]">
                      {formatDate(s.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </SectionFrame>
    );
  }

  if (section === "work-log") {
    if (!canViewWorkLog) {
      return (
        <EmptyState
          title="Work log unavailable"
          description="You do not have permission to view daily work logs."
        />
      );
    }
    return (
      <DailyWorkLogPanel
        authorUserId={userId}
        mode="review"
        showAuthor={false}
        title={`Work log · ${subject.displayName}`}
      />
    );
  }

  if (section === "coaching") {
    if (!canViewLogs) {
      return (
        <EmptyState
          title="Daily Logs unavailable"
          description="You do not have permission to view coaching logs."
        />
      );
    }
    return (
      <CoachingDailyLogsSection
        executiveUserId={userId}
        profileName={subject.displayName}
        logs={logs}
        canCreate={canCreateLogs}
        createHref={sseCreateHref(userId, "daily-log")}
        logHref={(logId) => sseDailyLogHref(userId, logId)}
      />
    );
  }

  if (section === "feedback") {
    if (!canViewFeedback) {
      return (
        <EmptyState
          title="Feedback unavailable"
          description="You do not have permission to view feedback."
        />
      );
    }
    return (
      <SeFeedbackPanel
        executiveUserId={userId}
        profileName={subject.displayName}
        feedback={feedback}
        canCreate={canCreateFeedback}
        teamName={subject.teamName ?? undefined}
        returnBaseHref={sseWorkspaceHref(userId, "feedback")}
        onFeedbackChanged={async () => {
          if (!token) return;
          const res = await api.getFeedback(token, {
            executiveUserId: userId,
            pageSize: 100,
          });
          setFeedback(res.data.feedback);
        }}
      />
    );
  }

  if (section === "reviews") {
    if (!canViewReviews) {
      return (
        <EmptyState
          title="Weekly reviews unavailable"
          description="You do not have permission to view weekly reviews."
        />
      );
    }
    return (
      <SectionFrame
        title="Weekly Reviews"
        description="Meeting notes and next actions for this Sales Support Executive."
        primary={
          canCreateReviews ? (
            <ButtonLink href={sseCreateHref(userId, "weekly-review")} size="sm">
              Write weekly review
            </ButtonLink>
          ) : null
        }
      >
        {reviews.length === 0 ? (
          <EmptyState
            title="No weekly reviews yet"
            description="Team Lead or Commando can write a weekly review for this Sales Support."
            actionHref={
              canCreateReviews
                ? sseCreateHref(userId, "weekly-review")
                : undefined
            }
            actionLabel={canCreateReviews ? "Write weekly review" : undefined}
          />
        ) : (
          <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)]">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--color-surface-2)] text-xs uppercase text-[var(--color-ink-muted)]">
                <tr>
                  <th className="px-4 py-2">Week</th>
                  <th className="px-4 py-2">Meeting</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Author</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-[var(--color-line)]"
                  >
                    <td className="px-4 py-2 font-medium">{r.weekLabel}</td>
                    <td className="px-4 py-2">
                      {formatDate(r.meetingDate)}
                      {r.meetingTime ? ` · ${r.meetingTime}` : ""}
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-2">{personName(r.createdBy)}</td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        href={`/weekly-reviews/${r.id}?returnTo=${encodeURIComponent(sseWorkspaceHref(userId, "reviews"))}`}
                        className="text-[13px] font-medium text-[var(--color-brand)] hover:underline"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionFrame>
    );
  }

  if (section === "checklist") {
    if (!canViewMonitoring) {
      return (
        <EmptyState
          title="Checklist unavailable"
          description="You do not have permission to view monitoring checklists."
        />
      );
    }
    return (
      <SeChecklistWorkspace
        executiveUserId={userId}
        profileName={subject.displayName}
        teamName={subject.teamName ?? undefined}
        subjectLabel="Sales Support"
      />
    );
  }

  if (section === "monitoring") {
    if (!canViewMonitoring) {
      return (
        <EmptyState
          title="Monitoring unavailable"
          description="You do not have permission to view monitoring sessions."
        />
      );
    }
    return (
      <SectionFrame
        title="Monitor"
        description="Use the current checklist to record today's observation."
        primary={
          canCreateMonitoring ? (
            <Link
              href={sseCreateHref(userId, "monitoring")}
              className="action-chip"
            >
              Start monitoring
            </Link>
          ) : null
        }
      >
        <div className="mb-3">
          <Link
            href={sseWorkspaceHref(userId, "checklist")}
            className="ck-entry-link"
          >
            Customize Checklist
          </Link>
        </div>
        <section className="surface p-4">
          {monitoring.length === 0 ? (
            <EmptyState
              title="No monitoring sessions yet"
              description="Monitoring sessions for this Sales Support will appear here."
              actionHref={
                canCreateMonitoring
                  ? sseCreateHref(userId, "monitoring")
                  : undefined
              }
              actionLabel={
                canCreateMonitoring ? "Start monitoring" : undefined
              }
            />
          ) : (
            <ul className="divide-y divide-[var(--color-line)]">
              {monitoring.map((m) => {
                const yes =
                  m.responses?.filter((r) => r.value === "YES").length ?? 0;
                const total = m.responses?.length ?? 0;
                return (
                  <li key={m.id} className="py-3">
                    <Link
                      href={`/monitoring/${m.id}?returnTo=${encodeURIComponent(sseWorkspaceHref(userId, "monitoring"))}`}
                      className="flex justify-between gap-3"
                    >
                      <span>
                        <span className="block text-sm font-medium">
                          {m.category.name}
                        </span>
                        <span className="text-xs text-[var(--color-ink-muted)]">
                          {total > 0
                            ? `${yes} / ${total} completed`
                            : "Session"}
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
    );
  }

  if (section === "support") {
    return (
      <SectionFrame
        title="Linked Sales Executives"
        description="Sales Executives this Support Executive is actively assigned to."
      >
        {subject.links.length === 0 ? (
          <EmptyState
            title="No active links"
            description="This person is not currently assigned as Sales Support in your scope."
          />
        ) : (
          <ul className="divide-y divide-[var(--color-line)] overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)]">
            {subject.links.map((link) => (
              <li key={link.id}>
                <Link
                  href={`/profiles/${link.salesExecutiveProfileId}`}
                  className="flex items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-[var(--color-surface-2)]"
                >
                  <span>
                    <span className="block text-sm font-semibold text-[var(--color-ink)]">
                      {link.profile.displayName}
                    </span>
                    <span className="text-xs text-[var(--color-ink-muted)]">
                      {link.profile.team?.name
                        ? `${link.profile.team.name} · `
                        : ""}
                      {link.responsibilityType
                        ? responsibilityTypeLabel(link.responsibilityType)
                        : "Support"}
                      {" · since "}
                      {formatDate(link.startedAt)}
                    </span>
                  </span>
                  <StatusBadge status="ACTIVE" label="Active" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionFrame>
    );
  }

  if (section === "actions") {
    return (
      <SectionFrame
        title="Tasks"
        description="Support tasks assigned to this Sales Support across linked Sales Executives."
      >
        {!canViewTasks ? (
          <EmptyState
            title="Tasks unavailable"
            description="You do not have permission to view support tasks."
          />
        ) : tasks.length === 0 ? (
          <EmptyState
            title="No tasks"
            description="Assign tasks from a linked Sales Executive’s Support panel."
          />
        ) : (
          <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)]">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--color-surface-2)] text-xs uppercase text-[var(--color-ink-muted)]">
                <tr>
                  <th className="px-4 py-2">Task</th>
                  <th className="px-4 py-2">Sales Executive</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Due</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr
                    key={t.id}
                    className="border-t border-[var(--color-line)]"
                  >
                    <td className="px-4 py-2">
                      <Link
                        href={`/my-tasks/${t.id}?returnTo=${encodeURIComponent(sseWorkspaceHref(userId, "actions"))}`}
                        className="font-medium hover:underline"
                      >
                        {t.title}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{t.profile.displayName}</td>
                    <td className="px-4 py-2">
                      <StatusBadge
                        status={t.isOverdue ? "OVERDUE" : t.status}
                      />
                    </td>
                    <td className="px-4 py-2">{formatDate(t.dueDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionFrame>
    );
  }

  if (section === "timeline") {
    return (
      <SectionFrame
        title="Timeline"
        description="Recent SWOT, tasks, and link activity for this Sales Support."
      >
        {timelineEvents.length === 0 ? (
          <EmptyState
            title="No activity yet"
            description="SWOT updates, tasks, and link changes will show here."
          />
        ) : (
          <ol className="space-y-0 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)]">
            {timelineEvents.slice(0, 40).map((ev, i) => (
              <li
                key={`${ev.at}-${ev.title}-${i}`}
                className="border-t border-[var(--color-line)] first:border-t-0"
              >
                {ev.href ? (
                  <Link
                    href={ev.href}
                    className="flex justify-between gap-3 px-4 py-3 hover:bg-[var(--color-surface-2)]"
                  >
                    <span>
                      <span className="block text-sm font-medium">
                        {ev.title}
                      </span>
                      <span className="text-xs text-[var(--color-ink-muted)]">
                        {ev.detail}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-[var(--color-ink-subtle)]">
                      {formatDate(ev.at)}
                    </span>
                  </Link>
                ) : (
                  <div className="flex justify-between gap-3 px-4 py-3">
                    <span>
                      <span className="block text-sm font-medium">
                        {ev.title}
                      </span>
                      <span className="text-xs text-[var(--color-ink-muted)]">
                        {ev.detail}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-[var(--color-ink-subtle)]">
                      {formatDate(ev.at)}
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </SectionFrame>
    );
  }

  if (section === "history") {
    return (
      <SectionFrame
        title="History"
        description="SWOT versions and support task history."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)]">
            <div className="border-b border-[var(--color-line)] px-4 py-3">
              <h3 className="text-[14px] font-semibold">SWOT history</h3>
            </div>
            {!canViewSwot || swots.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  title="No SWOT history"
                  description="Executive SWOT versions will appear here."
                />
              </div>
            ) : (
              <ul className="divide-y divide-[var(--color-line)]">
                {swots.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/swot/${s.id}`}
                      className="flex justify-between gap-3 px-4 py-3 text-sm hover:bg-[var(--color-surface-2)]"
                    >
                      <span>
                        {swotSourceLabel(s.source)}
                        {s.versionNumber ? ` · v${s.versionNumber}` : ""}
                      </span>
                      <span className="text-xs text-[var(--color-ink-subtle)]">
                        {formatDate(s.createdAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)]">
            <div className="border-b border-[var(--color-line)] px-4 py-3">
              <h3 className="text-[14px] font-semibold">Task history</h3>
            </div>
            {!canViewTasks || tasks.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  title="No tasks"
                  description="Support tasks will appear here."
                />
              </div>
            ) : (
              <ul className="divide-y divide-[var(--color-line)]">
                {tasks.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/my-tasks/${t.id}?returnTo=${encodeURIComponent(sseWorkspaceHref(userId, "history"))}`}
                      className="flex justify-between gap-3 px-4 py-3 text-sm hover:bg-[var(--color-surface-2)]"
                    >
                      <span>
                        <span className="font-medium">{t.title}</span>
                        <span className="block text-xs text-[var(--color-ink-muted)]">
                          {t.profile.displayName} · {t.status}
                        </span>
                      </span>
                      <span className="text-xs text-[var(--color-ink-subtle)]">
                        {formatDate(t.updatedAt ?? t.createdAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </SectionFrame>
    );
  }

  return <PendingSection section={section} />;
}
