"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp, Paperclip } from "lucide-react";
import {
  api,
  type WeeklyReview,
  type WeeklyReviewHub,
  type WeeklyReviewHubAction,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate, formatDue, formatTime } from "@/lib/dates";
import { personName } from "@/lib/labels";
import {
  currentWeekMondayYmd,
  formatWeekRangeLabel,
  mondayOfWeek,
  parseYmd,
  shiftWeek,
  toYmd,
} from "@/lib/week";
import { seWorkspaceHref } from "@/lib/se-workspace-nav";
import {
  Button,
  ErrorState,
  LoadingState,
  SegmentedControl,
} from "@/components/ui";
import {
  EvidenceEmpty,
  EvidenceNavigator,
  EvidenceSearch,
  sectionTitle,
} from "@/components/weekly-reviews/EvidenceNavigator";
import type { ContextSection } from "@/components/weekly-reviews/weekly-review-types";
import {
  MeetingMinutesUploader,
  uploadMeetingMinutes,
} from "@/components/weekly-reviews/MeetingMinutesUploader";

type MobilePane = "context" | "review";

type ActionFilter = "all" | "open" | "active" | "completed" | "overdue";
type LogFilter = "all" | "coaching" | "evidence" | "draft";
type MonitoringFilter = "all" | "incomplete" | "complete";
type EisenhowerStatusFilter = "all" | "open" | "done";
type OverviewKindFilter = "all" | "logs" | "monitoring";

type DraftState = {
  performanceSummary: string;
  whatWentWell: string;
  improvement: string;
  nextWeekActions: string[];
};

const EISENHOWER_QUADRANTS = [
  { key: "DO_FIRST" as const, title: "Urgent + Important" },
  { key: "SCHEDULE" as const, title: "Not Urgent + Important" },
  { key: "DELEGATE" as const, title: "Urgent + Not Important" },
  { key: "ELIMINATE" as const, title: "Not Urgent + Not Important" },
];

function draftKey(profileId: string, weekStart: string) {
  return `commando:weekly-review-draft:${profileId}:${weekStart}`;
}

function loadDraft(profileId: string, weekStart: string): DraftState | null {
  try {
    const raw = localStorage.getItem(draftKey(profileId, weekStart));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftState;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      performanceSummary: String(parsed.performanceSummary ?? ""),
      whatWentWell: String(parsed.whatWentWell ?? ""),
      improvement: String(parsed.improvement ?? ""),
      nextWeekActions: Array.isArray(parsed.nextWeekActions)
        ? parsed.nextWeekActions.map(String).filter(Boolean)
        : [],
    };
  } catch {
    return null;
  }
}

function saveDraft(profileId: string, weekStart: string, draft: DraftState) {
  localStorage.setItem(draftKey(profileId, weekStart), JSON.stringify(draft));
}

function clearDraft(profileId: string, weekStart: string) {
  localStorage.removeItem(draftKey(profileId, weekStart));
}

function defaultMeetingTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function todayYmd() {
  return toYmd(new Date());
}

function formatSavedTime(d: Date) {
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function compactDayLabel(ymdOrIso: string) {
  const d =
    ymdOrIso.length === 10 ? parseYmd(ymdOrIso) : new Date(ymdOrIso);
  return d
    .toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    })
    .toUpperCase()
    .replace(",", " ·");
}

function linesFromText(text: string): string[] {
  return text
    .split(/\n+/)
    .map((s) => s.replace(/^[-•*\d.)\s]+/, "").trim())
    .filter(Boolean);
}

function allActions(hub: WeeklyReviewHub): WeeklyReviewHubAction[] {
  return [
    ...hub.actions.overdue,
    ...hub.actions.active,
    ...hub.actions.completed,
    ...hub.actions.other,
  ];
}

function actionStatusLabel(a: WeeklyReviewHubAction, now = Date.now()) {
  if (a.status === "COMPLETED") return "Completed";
  if (a.status === "ACTIVE" && a.dueDate && new Date(a.dueDate).getTime() < now) {
    return "Overdue";
  }
  if (a.status === "ACTIVE") return "In Progress";
  if (a.status === "CANCELLED") return "Cancelled";
  return a.status;
}

export function WeeklyReviewHub({
  profileId,
  profileName,
  canCreate,
  isSe,
  history,
  onSign,
  signingReviewId,
}: {
  profileId: string;
  profileName: string;
  canCreate: boolean;
  isSe: boolean;
  history: WeeklyReview[];
  onSign?: (id: string) => void;
  signingReviewId?: string | null;
}) {
  const { token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialWeek = (() => {
    const current = currentWeekMondayYmd();
    const raw = searchParams.get("weekStart");
    if (!raw) return current;
    try {
      const monday = toYmd(mondayOfWeek(parseYmd(raw)));
      return monday > current ? current : monday;
    } catch {
      return current;
    }
  })();
  const [weekStart, setWeekStart] = useState(initialWeek);
  const [hub, setHub] = useState<WeeklyReviewHub | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<ContextSection>("overview");
  const [mobilePane, setMobilePane] = useState<MobilePane>("context");
  const [expandedLogEntry, setExpandedLogEntry] = useState<string | null>(null);
  const [expandedMonitoring, setExpandedMonitoring] = useState<string | null>(
    null,
  );
  const [expandedEisenhower, setExpandedEisenhower] = useState<string | null>(
    null,
  );
  const [expandedSwotId, setExpandedSwotId] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<ActionFilter>("all");
  const [logFilter, setLogFilter] = useState<LogFilter>("all");
  const [monitoringFilter, setMonitoringFilter] =
    useState<MonitoringFilter>("all");
  const [eisenhowerStatus, setEisenhowerStatus] =
    useState<EisenhowerStatusFilter>("all");
  const [overviewKind, setOverviewKind] = useState<OverviewKindFilter>("all");
  const [contextQuery, setContextQuery] = useState("");
  const [contextExpanded, setContextExpanded] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [addingAction, setAddingAction] = useState(false);
  const [newActionText, setNewActionText] = useState("");
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const [draft, setDraft] = useState<DraftState>({
    performanceSummary: "",
    whatWentWell: "",
    improvement: "",
    nextWeekActions: [],
  });
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [minutesFile, setMinutesFile] = useState<File | null>(null);
  const [doneChecks, setDoneChecks] = useState<Record<number, boolean>>({});
  const hydrateRef = useRef<string | null>(null);
  const addInputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.getWeeklyReviewHub(token, {
        profileId,
        weekStart,
      });
      setHub(res.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load week");
      setHub(null);
    } finally {
      setLoading(false);
    }
  }, [token, profileId, weekStart]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!hub) return;
    const key = `${hub.profile.id}:${hub.week.start}:${hub.review?.id ?? "none"}`;
    if (hydrateRef.current === key) return;
    hydrateRef.current = key;

    if (hub.review) {
      setDraft({
        performanceSummary: hub.review.performanceSummary,
        whatWentWell: hub.review.whatWentWell,
        improvement: hub.review.improvement,
        nextWeekActions: linesFromText(hub.review.nextWeekAction),
      });
      setSaveState("idle");
      setSavedAt(null);
      return;
    }

    const stored = loadDraft(profileId, hub.week.start);
    setDraft(
      stored ?? {
        performanceSummary: "",
        whatWentWell: "",
        improvement: "",
        nextWeekActions: [],
      },
    );
    setSaveState(stored ? "saved" : "idle");
    setSavedAt(stored ? new Date() : null);
  }, [hub, profileId]);

  useEffect(() => {
    if (!hub || hub.review || !canCreate) return;
    const hasContent =
      draft.performanceSummary.trim() ||
      draft.whatWentWell.trim() ||
      draft.improvement.trim() ||
      draft.nextWeekActions.some((a) => a.trim());
    if (!hasContent) return;

    setSaveState("saving");
    const t = window.setTimeout(() => {
      saveDraft(profileId, hub.week.start, {
        ...draft,
        nextWeekActions: draft.nextWeekActions.filter((a) => a.trim()),
      });
      const now = new Date();
      setSavedAt(now);
      setSaveState("saved");
    }, 500);
    return () => window.clearTimeout(t);
  }, [draft, hub, profileId, canCreate]);

  useEffect(() => {
    if (addingAction) addInputRef.current?.focus();
  }, [addingAction]);

  useEffect(() => {
    setContextQuery("");
    setExpandedLogEntry(null);
    setExpandedMonitoring(null);
    if (section !== "eisenhower") {
      setExpandedEisenhower(null);
    }
  }, [section, weekStart]);

  useEffect(() => {
    if (section !== "eisenhower" || !hub) return;
    setExpandedEisenhower((cur) => {
      if (cur) return cur;
      const first = EISENHOWER_QUADRANTS.find(
        (q) => hub.eisenhower[q.key].length > 0,
      );
      return first?.key ?? null;
    });
  }, [section, hub, weekStart]);

  const searchPlaceholder =
    section === "logs"
      ? "Search daily logs…"
      : section === "monitoring"
        ? "Search monitoring…"
        : section === "assignments"
          ? "Search assignments…"
          : section === "feedback"
            ? "Search feedback…"
            : section === "eisenhower"
              ? "Search priorities…"
              : section === "swot"
                ? "Search SWOT…"
                : "Search this week…";

  const canWrite = Boolean(canCreate && hub && !hub.review);
  const editorLocked = !canWrite;

  const navItems = useMemo(() => {
    if (!hub) return [];
    const feedbackCount = hub.feedback?.length ?? hub.glance.feedback ?? 0;
    const overdue = hub.glance.overdueActions ?? hub.actions.overdue.length;
    const drafts = hub.glance.draftLogs ?? 0;
    return [
      { id: "overview" as const, label: "Overview", count: null as number | null, attention: false },
      {
        id: "logs" as const,
        label: "Daily Logs",
        count: hub.glance.dailyLogs,
        attention: drafts > 0,
      },
      {
        id: "monitoring" as const,
        label: "Monitoring",
        count: hub.glance.monitoring,
        attention: false,
      },
      {
        id: "assignments" as const,
        label: "Assignments",
        count: hub.glance.actions,
        attention: overdue > 0,
        attentionCount: overdue > 0 ? overdue : undefined,
      },
      {
        id: "feedback" as const,
        label: "Feedback",
        count: feedbackCount,
        attention: false,
      },
      {
        id: "swot" as const,
        label: "SWOT",
        count: hub.swot?.length ?? hub.glance.swot ?? null,
        attention: false,
      },
      {
        id: "eisenhower" as const,
        label: "Eisenhower",
        count: hub.glance.priorities,
        attention: false,
      },
    ];
  }, [hub]);

  async function completeReview() {
    if (!token || !hub || !canWrite) return;
    const actions = draft.nextWeekActions.map((a) => a.trim()).filter(Boolean);
    if (!draft.performanceSummary.trim()) {
      setSubmitError("Add a performance summary.");
      return;
    }
    if (!draft.whatWentWell.trim()) {
      setSubmitError("Add what went well.");
      return;
    }
    if (!draft.improvement.trim()) {
      setSubmitError("Add what needs improvement.");
      return;
    }
    if (actions.length === 0) {
      setSubmitError("Add at least one next-week action.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      let meetingMinutes = null;
      if (minutesFile) {
        meetingMinutes = await uploadMeetingMinutes(token, minutesFile);
      }
      await api.createWeeklyReview(token, {
        salesExecutiveProfileId: profileId,
        weekLabel: hub.week.label,
        weekStartDate: hub.week.start,
        meetingDate: todayYmd(),
        roomName: "Weekly review",
        meetingTime: defaultMeetingTime(),
        meetingMinutes,
        performanceSummary: draft.performanceSummary.trim(),
        whatWentWell: draft.whatWentWell.trim(),
        improvement: draft.improvement.trim(),
        nextWeekActions: actions,
      });
      clearDraft(profileId, hub.week.start);
      setMinutesFile(null);
      hydrateRef.current = null;
      await load();
      setMobilePane("review");
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to complete review",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function changeWeek(next: string) {
    const current = currentWeekMondayYmd();
    // Only allow current week and past weeks — never future.
    const clamped = next > current ? current : next;
    setWeekStart(clamped);
    const url = new URL(window.location.href);
    url.searchParams.set("weekStart", clamped);
    router.replace(`${url.pathname}?${url.searchParams.toString()}`, {
      scroll: false,
    });
  }

  function goToCurrentWeek() {
    changeWeek(currentWeekMondayYmd());
  }

  function persistDraftNow() {
    if (!hub || !canWrite) return;
    saveDraft(profileId, hub.week.start, {
      ...draft,
      nextWeekActions: draft.nextWeekActions.filter((a) => a.trim()),
    });
    setSavedAt(new Date());
    setSaveState("saved");
  }

  function commitNewAction() {
    const text = newActionText.trim();
    if (!text) return;
    setDraft((d) => ({
      ...d,
      nextWeekActions: [...d.nextWeekActions, text],
    }));
    setNewActionText("");
    setAddingAction(false);
  }

  if (loading && !hub) return <LoadingState label="Loading week…" />;
  if (error && !hub) return <ErrorState message={error} />;
  if (!hub) return null;

  const displayName = hub.profile.displayName || profileName;
  const metaParts = [
    hub.profile.teamName,
    hub.profile.teamLead
      ? `Team Lead: ${personName(hub.profile.teamLead)}`
      : null,
    hub.profile.commando
      ? `Commando: ${personName(hub.profile.commando)}`
      : null,
  ].filter(Boolean);

  const weekRange = formatWeekRangeLabel(hub.week.start, hub.week.end);
  const currentMonday = currentWeekMondayYmd();
  const isCurrentWeek = weekStart >= currentMonday;
  const canGoNext = weekStart < currentMonday;

  const reviewStatus = hub.review
    ? hub.review.status === "SUBMITTED"
      ? "Completed"
      : "Draft"
    : canWrite
      ? saveState === "saved"
        ? "Draft"
        : "Not written yet"
      : "Not written yet";

  const statusClass =
    reviewStatus === "Completed"
      ? "is-done"
      : reviewStatus === "Draft"
        ? "is-draft"
        : "is-empty";

  const footerSaveLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "saved" && savedAt
        ? `Draft saved · ${formatSavedTime(savedAt)}`
        : saveState === "saved"
          ? "Draft saved"
          : "Unsaved changes stay on this device";

  return (
    <div className="wr-workspace h-full min-h-0">
      <header className="wr-header">
        <div className="min-w-0">
          <p className="wr-header-kicker">Weekly Review</p>
          <h2 className="wr-header-title">{displayName}</h2>
          {metaParts.length > 0 ? (
            <p className="wr-header-meta">{metaParts.join(" · ")}</p>
          ) : null}
        </div>

        <div className="wr-header-tools">
          {hub.profile.interventionActive ? (
            <span className="wr-active-pill">Active Intervention</span>
          ) : null}
          <div className="wr-week-nav">
            <button
              type="button"
              aria-label="Previous week"
              onClick={() => changeWeek(shiftWeek(weekStart, -1))}
            >
              ‹
            </button>
            <button
              type="button"
              className={`wr-week-nav-label${isCurrentWeek ? " is-current" : ""}`}
              aria-label={
                isCurrentWeek
                  ? "Current week"
                  : "Jump to current week"
              }
              title={
                isCurrentWeek
                  ? "Current week"
                  : "Click to jump to this week"
              }
              disabled={isCurrentWeek}
              onClick={goToCurrentWeek}
            >
              {weekRange}
            </button>
            <button
              type="button"
              aria-label="Next week"
              disabled={!canGoNext}
              title={
                canGoNext ? "Next week" : "Already on the current week"
              }
              onClick={() => changeWeek(shiftWeek(weekStart, 1))}
            >
              ›
            </button>
          </div>
        </div>
      </header>

      <div className="wr-mobile-switch">
        <SegmentedControl
          ariaLabel="Weekly review pane"
          value={mobilePane}
          onChange={setMobilePane}
          options={[
            { value: "context", label: "Context" },
            { value: "review", label: "Write Review" },
          ]}
        />
      </div>

      <div
        className={`wr-panes${contextExpanded ? " is-context-expanded" : ""}`}
      >
        <aside
          className={`wr-context${contextExpanded ? " is-expanded" : ""}${
            mobilePane === "review" ? " is-hidden-mobile" : ""
          }`}
        >
          <div className="wr-evidence-head">
            <h3 className="wr-evidence-title">Week Context</h3>
            <p className="wr-evidence-sub">Browse evidence for this week</p>
          </div>

          <div
            id="wr-context-body"
            className={`wr-context-chrome${contextExpanded ? " is-collapsed" : ""}`}
          >
            <div className="wr-context-chrome-inner">
              <EvidenceNavigator
                items={navItems}
                activeId={section}
                onSelect={setSection}
              />

              <div className="wr-evidence-tools">
                <EvidenceSearch
                  value={contextQuery}
                  onChange={setContextQuery}
                  placeholder={searchPlaceholder}
                />
              </div>
            </div>
          </div>

          <div className="wr-context-filters" data-kind={section}>
            <div className="wr-context-section-row">
              <p className="wr-context-section">
                <span className={`wr-kind-dot is-${section}`} aria-hidden />
                {sectionTitle(section)}
              </p>
              <button
                type="button"
                className={`wr-context-expand${contextExpanded ? " is-open" : ""}`}
                aria-expanded={contextExpanded}
                aria-controls="wr-context-body"
                title={
                  contextExpanded
                    ? "Collapse context panel"
                    : "Expand context for more space"
                }
                onClick={() => setContextExpanded((v) => !v)}
              >
                {contextExpanded ? (
                  <ChevronUp size={14} strokeWidth={2.25} aria-hidden />
                ) : (
                  <ChevronDown size={14} strokeWidth={2.25} aria-hidden />
                )}
                <span>{contextExpanded ? "Collapse" : "Expand"}</span>
              </button>
            </div>
            {section === "overview" ? (
              <div className="wr-filter-row">
                {(
                  [
                    { id: "all", label: "All" },
                    { id: "logs", label: "Logs" },
                    { id: "monitoring", label: "Monitoring" },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`wr-filter-pill${overviewKind === f.id ? " is-active" : ""}`}
                    onClick={() => setOverviewKind(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            ) : null}
            {section === "logs" ? (
              <div className="wr-filter-row">
                {(
                  [
                    { id: "all", label: "All" },
                    { id: "coaching", label: "Coaching" },
                    { id: "evidence", label: "Evidence" },
                    { id: "draft", label: "Draft" },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`wr-filter-pill${logFilter === f.id ? " is-active" : ""}`}
                    onClick={() => setLogFilter(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            ) : null}
            {section === "monitoring" ? (
              <div className="wr-filter-row">
                {(
                  [
                    { id: "all", label: "All" },
                    { id: "incomplete", label: "Gaps" },
                    { id: "complete", label: "Complete" },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`wr-filter-pill${monitoringFilter === f.id ? " is-active" : ""}`}
                    onClick={() => setMonitoringFilter(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            ) : null}
            {section === "eisenhower" ? (
              <div className="wr-filter-row">
                {(
                  [
                    { id: "all", label: "All" },
                    { id: "open", label: "Open" },
                    { id: "done", label: "Done" },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`wr-filter-pill${eisenhowerStatus === f.id ? " is-active" : ""}`}
                    onClick={() => setEisenhowerStatus(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="wr-scroll wr-context-scroll">
            {section === "overview" ? (
              <OverviewPane
                hub={hub}
                query={contextQuery}
                kind={overviewKind}
                expanded={contextExpanded}
                onGoSection={setSection}
              />
            ) : null}
            {section === "logs" ? (
              <DailyLogsPane
                hub={hub}
                query={contextQuery}
                filter={logFilter}
                expandedId={expandedLogEntry}
                onToggle={(id) =>
                  setExpandedLogEntry((cur) => (cur === id ? null : id))
                }
              />
            ) : null}
            {section === "monitoring" ? (
              <MonitoringPane
                hub={hub}
                query={contextQuery}
                filter={monitoringFilter}
                expandedId={expandedMonitoring}
                onToggle={(id) =>
                  setExpandedMonitoring((cur) => (cur === id ? null : id))
                }
              />
            ) : null}
            {section === "assignments" ? (
              <AssignmentsPane
                hub={hub}
                query={contextQuery}
                filter={actionFilter}
                onFilter={setActionFilter}
              />
            ) : null}
            {section === "feedback" ? (
              <FeedbackPane hub={hub} query={contextQuery} />
            ) : null}
            {section === "swot" ? (
              <SwotPane
                hub={hub}
                profileName={displayName}
                query={contextQuery}
                expandedId={expandedSwotId}
                onToggle={(id) =>
                  setExpandedSwotId((cur) => (cur === id ? null : id))
                }
              />
            ) : null}
            {section === "eisenhower" ? (
              <EisenhowerPane
                hub={hub}
                query={contextQuery}
                statusFilter={eisenhowerStatus}
                expanded={expandedEisenhower}
                onToggle={(key) =>
                  setExpandedEisenhower((cur) => (cur === key ? null : key))
                }
              />
            ) : null}
          </div>

          {history.length > 0 ? (
            <div className="wr-history">
              <button
                type="button"
                className="wr-history-toggle"
                aria-expanded={historyOpen}
                onClick={() => setHistoryOpen((v) => !v)}
              >
                <span>History · {history.length}</span>
                <span aria-hidden>{historyOpen ? "▾" : "▸"}</span>
              </button>
              {historyOpen ? (
                <div className="wr-history-panel">
                  <ul>
                    {history.map((r) => {
                      const canSign =
                        isSe &&
                        r.status === "SUBMITTED" &&
                        !(r.salesExecutiveSigned || r.signed);
                      return (
                        <li key={r.id} className="wr-history-row">
                          <div className="min-w-0">
                            <Link
                              href={`/weekly-reviews/${r.id}?returnTo=${encodeURIComponent(seWorkspaceHref(profileId, "reviews"))}`}
                              className="font-medium text-[var(--color-ink)] hover:text-[var(--color-brand)]"
                            >
                              {r.weekLabel}
                            </Link>
                            <p className="text-[var(--text-meta)] text-[var(--color-ink-subtle)]">
                              {formatDate(r.weekStartDate)}
                              {r.commando
                                ? ` · ${personName(r.commando)}`
                                : ""}
                            </p>
                          </div>
                          {canSign && onSign ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              disabled={signingReviewId === r.id}
                              onClick={() => onSign(r.id)}
                            >
                              {signingReviewId === r.id ? "Signing…" : "Sign"}
                            </Button>
                          ) : (
                            <Link
                              href={`/weekly-reviews/${r.id}?returnTo=${encodeURIComponent(seWorkspaceHref(profileId, "reviews"))}`}
                              className="shrink-0 text-[var(--text-meta)] font-medium text-[var(--color-brand)] hover:underline"
                            >
                              View
                            </Link>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </aside>

        <section
          className={`wr-review ${
            mobilePane === "context" ? "is-hidden-mobile" : ""
          }`}
        >
          <div className="wr-review-head">
            <div className="wr-review-head-row">
              <div>
                <h3 className="wr-review-title">Write Weekly Review</h3>
                <p className="wr-review-sub">
                  Summarize the evidence into a clear coaching review.
                </p>
              </div>
              <span className={`wr-status-chip ${statusClass}`}>
                {reviewStatus}
              </span>
            </div>
            {hub.review ? (
              <p className="wr-review-link">
                <Link
                  href={`/weekly-reviews/${hub.review.id}?returnTo=${encodeURIComponent(seWorkspaceHref(profileId, "reviews"))}`}
                >
                  Open full review →
                </Link>
              </p>
            ) : null}
          </div>

          <div className="wr-scroll">
            <div className="wr-review-body">
              {canWrite && !hub.review ? (
                <div className="wr-review-banner">
                  <strong>No review written yet</strong>
                  <span>
                    Use evidence on the left, then write your summary below.
                  </span>
                </div>
              ) : null}

              <EditorField
                label="Weekly summary"
                hint="What happened this week?"
                placeholder="Start writing…"
                value={draft.performanceSummary}
                readOnly={editorLocked}
                onChange={(v) =>
                  setDraft((d) => ({ ...d, performanceSummary: v }))
                }
              />
              <EditorField
                label="What went well"
                hint="Progress or positive changes observed"
                placeholder="Start writing…"
                value={draft.whatWentWell}
                readOnly={editorLocked}
                onChange={(v) => setDraft((d) => ({ ...d, whatWentWell: v }))}
              />
              <EditorField
                label="What needs improvement"
                hint="What should be addressed next?"
                placeholder="Start writing…"
                value={draft.improvement}
                readOnly={editorLocked}
                onChange={(v) => setDraft((d) => ({ ...d, improvement: v }))}
              />

              {canWrite && !hub.review ? (
                <div className="wr-review-section">
                  <MeetingMinutesUploader
                    file={minutesFile}
                    onChange={setMinutesFile}
                    disabled={submitting}
                    compact
                  />
                </div>
              ) : hub.review?.meetingMinutes ? (
                <div className="wr-review-section">
                  <div className="wr-minutes has-file is-compact">
                    <div className="wr-minutes-head">
                      <div className="wr-minutes-head-icon" aria-hidden>
                        <Paperclip size={14} strokeWidth={2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="wr-minutes-title-row">
                          <h3 className="wr-minutes-title">Meeting minutes</h3>
                          <span className="wr-status-chip is-done">Attached</span>
                        </div>
                        <p className="wr-minutes-sub">
                          {hub.review.meetingMinutes.fileName}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="wr-review-section">
                <div className="wr-review-section-head">
                  <p className="wr-review-section-title">Next week actions</p>
                  <p className="wr-review-section-hint">
                    Specific follow-ups for next week
                  </p>
                </div>

                {draft.nextWeekActions.length === 0 && editorLocked ? (
                  <p className="wr-muted">No next-week actions.</p>
                ) : null}

                <ul className="wr-next-list">
                  {draft.nextWeekActions.map((action, idx) => (
                    <li
                      key={idx}
                      className={`wr-next-row${doneChecks[idx] ? " is-done" : ""}`}
                    >
                      <input
                        type="checkbox"
                        className="wr-next-check"
                        checked={Boolean(doneChecks[idx])}
                        disabled={editorLocked}
                        onChange={(e) =>
                          setDoneChecks((c) => ({
                            ...c,
                            [idx]: e.target.checked,
                          }))
                        }
                        aria-label={`Mark action ${idx + 1}`}
                      />
                      {editorLocked ? (
                        <p className="wr-next-text">{action || "—"}</p>
                      ) : (
                        <input
                          type="text"
                          className="wr-next-input"
                          value={action}
                          placeholder="What needs to be done?"
                          onChange={(e) =>
                            setDraft((d) => {
                              const next = [...d.nextWeekActions];
                              next[idx] = e.target.value;
                              return { ...d, nextWeekActions: next };
                            })
                          }
                        />
                      )}
                      {canWrite ? (
                        <button
                          type="button"
                          className="wr-next-remove"
                          onClick={() =>
                            setDraft((d) => ({
                              ...d,
                              nextWeekActions: d.nextWeekActions.filter(
                                (_, i) => i !== idx,
                              ),
                            }))
                          }
                        >
                          Remove
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>

                {canWrite ? (
                  addingAction ? (
                    <div className="wr-add-composer">
                      <label htmlFor="wr-new-action">New action</label>
                      <div className="wr-add-composer-row">
                        <input
                          id="wr-new-action"
                          ref={addInputRef}
                          value={newActionText}
                          placeholder="What needs to be done?"
                          onChange={(e) => setNewActionText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              commitNewAction();
                            }
                            if (e.key === "Escape") {
                              setAddingAction(false);
                              setNewActionText("");
                            }
                          }}
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={commitNewAction}
                          disabled={!newActionText.trim()}
                        >
                          Add
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setAddingAction(false);
                            setNewActionText("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="wr-add-action"
                      onClick={() => setAddingAction(true)}
                    >
                      + Add next-week action
                    </button>
                  )
                ) : null}
              </div>
            </div>
          </div>

          {canWrite ? (
            <div className="wr-footer">
              <p className="wr-footer-status">{footerSaveLabel}</p>
              <div className="wr-footer-actions">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={persistDraftNow}
                >
                  Save Draft
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={submitting}
                  onClick={() => void completeReview()}
                >
                  {submitting
                    ? minutesFile
                      ? "Uploading…"
                      : "Completing…"
                    : "Complete Review"}
                </Button>
              </div>
              {submitError ? (
                <p className="wr-footer-error">{submitError}</p>
              ) : null}
            </div>
          ) : isSe && hub.review ? (
            <div className="wr-footer">
              <p className="wr-footer-status">
                Review for this week is ready
                {hub.review.salesExecutiveSigned || hub.review.signed
                  ? " and signed."
                  : "."}
              </p>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function EditorField({
  label,
  hint,
  placeholder,
  value,
  readOnly,
  onChange,
}: {
  label: string;
  hint: string;
  placeholder: string;
  value: string;
  readOnly: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className="wr-review-section">
      <label className="block">
        <div className="wr-review-section-head">
          <span className="wr-review-section-title">{label}</span>
          <span className="wr-review-section-hint">{hint}</span>
        </div>
        <textarea
          value={value}
          readOnly={readOnly}
          rows={4}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="wr-review-textarea"
        />
      </label>
    </div>
  );
}

function matchesQuery(haystack: string, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return haystack.toLowerCase().includes(q);
}

function OverviewPane({
  hub,
  query,
  kind,
  expanded,
  onGoSection,
}: {
  hub: WeeklyReviewHub;
  query: string;
  kind: OverviewKindFilter;
  expanded?: boolean;
  onGoSection: (s: ContextSection) => void;
}) {
  type TimelineItem = {
    at: string;
    kind: "logs" | "monitoring";
    kindLabel: string;
    title: string;
    preview?: string | null;
    meta?: string | null;
  };

  const items: TimelineItem[] = [];
  if (kind === "all" || kind === "logs") {
    for (const log of hub.dailyLogs) {
      for (const e of log.entries) {
        items.push({
          at: e.loggedAt || log.logDate,
          kind: "logs",
          kindLabel: "Log",
          title: e.sessionTitle || e.activityType.name,
          preview: e.observation,
          meta: e.activityType?.name ?? null,
        });
      }
    }
  }
  if (kind === "all" || kind === "monitoring") {
    for (const m of hub.monitoring) {
      items.push({
        at: m.observedAt,
        kind: "monitoring",
        kindLabel: "Monitor",
        title: m.category.name,
        preview: m.observation,
        meta:
          m.checklistTotal > 0
            ? `${m.checklistCompleted}/${m.checklistTotal}`
            : null,
      });
    }
  }
  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const filtered = items.filter((item) =>
    matchesQuery(
      `${item.kindLabel} ${item.title} ${item.preview ?? ""} ${item.meta ?? ""}`,
      query,
    ),
  );

  const attention: string[] = [];
  if ((hub.glance.draftLogs ?? 0) > 0) {
    attention.push(
      `${hub.glance.draftLogs} draft log${hub.glance.draftLogs === 1 ? "" : "s"}`,
    );
  }
  const overdue = hub.glance.overdueActions ?? hub.actions.overdue.length;
  if (overdue > 0) {
    attention.push(`${overdue} overdue assignment${overdue === 1 ? "" : "s"}`);
  }
  if (!hub.review) {
    attention.push("Weekly review not written");
  }

  return (
    <div className={`wr-overview${expanded ? " is-expanded" : ""}`}>
      {attention.length > 0 ? (
        <p className="wr-overview-attention">{attention.join(" · ")}</p>
      ) : null}

      <div className="wr-overview-feed-head">
        <p className="wr-overview-feed-title">Recent activity</p>
        {query.trim() || kind !== "all" ? (
          <p className="wr-overview-feed-count">{filtered.length} shown</p>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <EvidenceEmpty
          title="Nothing in this view"
          description={
            query.trim()
              ? "Try another search."
              : "Daily logs and monitoring will appear here as they are recorded."
          }
        />
      ) : (
        <ol className="wr-overview-feed">
          {filtered.map((item, i) => {
            const day = compactDayLabel(item.at);
            const prevDay =
              i > 0 ? compactDayLabel(filtered[i - 1]!.at) : null;
            const showDay = day !== prevDay;
            return (
              <li key={`${item.at}-${item.title}-${i}`}>
                {showDay ? <p className="wr-overview-day">{day}</p> : null}
                <button
                  type="button"
                  className={`wr-overview-event is-${item.kind}`}
                  onClick={() =>
                    onGoSection(item.kind === "logs" ? "logs" : "monitoring")
                  }
                >
                  <span className="wr-overview-event-rail">
                    <span className={`wr-overview-kind is-${item.kind}`}>
                      {item.kindLabel}
                    </span>
                    <span className="wr-overview-event-time">
                      {formatTime(item.at)}
                    </span>
                  </span>
                  <span className="wr-overview-event-body">
                    <span className="wr-overview-event-title">{item.title}</span>
                    {item.meta ? (
                      <span className="wr-overview-event-meta">{item.meta}</span>
                    ) : null}
                    {item.preview?.trim() ? (
                      <span className="wr-overview-event-preview">
                        {item.preview}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function DailyLogsPane({
  hub,
  query,
  filter,
  expandedId,
  onToggle,
}: {
  hub: WeeklyReviewHub;
  query: string;
  filter: LogFilter;
  expandedId: string | null;
  onToggle: (id: string) => void;
}) {
  if (hub.dailyLogs.length === 0) {
    return (
      <EvidenceEmpty
        title="No daily logs"
        description="Nothing logged for this week yet."
      />
    );
  }

  const logs = hub.dailyLogs
    .map((log) => {
      const entries = log.entries.filter((e) => {
        if (filter === "draft" && log.status !== "DRAFT") return false;
        if (filter === "coaching" && !e.hasCoaching) return false;
        if (filter === "evidence" && !e.hasEvidence) return false;
        return matchesQuery(
          `${e.sessionTitle} ${e.observation} ${e.activityType?.name ?? ""} ${e.coachingGiven ?? ""}`,
          query,
        );
      });
      return { ...log, entries };
    })
    .filter((log) => {
      if (filter === "draft") return log.status === "DRAFT";
      return log.entries.length > 0 || (!query.trim() && filter === "all");
    })
    .filter((log) => log.entries.length > 0 || filter === "draft");

  const visibleEntries = logs.reduce((n, l) => n + l.entries.length, 0);

  return (
    <div>
      <p className="wr-result-meta">
        {visibleEntries} activit{visibleEntries === 1 ? "y" : "ies"} shown
      </p>

      {logs.length === 0 ? (
        <EvidenceEmpty
          title="No matching logs"
          description="Adjust filters or search."
        />
      ) : (
        logs.map((log) => (
          <div key={log.id}>
            <p className="wr-timeline-day">
              {compactDayLabel(log.logDate)}
              {log.status === "DRAFT" ? " · DRAFT" : ""}
            </p>
            {log.entries.length === 0 ? (
              <p className="wr-section-meta">No matching activities</p>
            ) : (
              <ul className="wr-evidence-stack">
                {log.entries.map((e) => {
                  const open = expandedId === e.id;
                  return (
                    <li
                      key={e.id}
                      className={`wr-evidence-card is-logs${open ? " is-open" : ""}${
                        log.status === "DRAFT" ? " is-draft" : ""
                      }`}
                    >
                      <button type="button" onClick={() => onToggle(e.id)}>
                        <div className="wr-evidence-card-head">
                          <span className="wr-kind-chip is-logs">Log</span>
                          <span className="wr-timeline-time">
                            {formatTime(e.loggedAt)}
                          </span>
                        </div>
                        <p className="wr-timeline-title">{e.sessionTitle}</p>
                        {e.activityType?.name ? (
                          <p className="wr-evidence-card-meta">
                            {e.activityType.name}
                            {e.hasCoaching ? " · Coaching" : ""}
                            {e.hasEvidence ? " · Evidence" : ""}
                          </p>
                        ) : null}
                        {e.observation ? (
                          <p className="wr-timeline-preview">{e.observation}</p>
                        ) : null}
                      </button>
                      {open ? (
                        <div className="wr-expand">
                          <Detail label="Observation" value={e.observation} />
                          <Detail label="Evidence" value={e.evidence} />
                          <Detail label="SE response" value={e.seResponse} />
                          <Detail label="Coaching" value={e.coachingGiven} />
                          <Detail
                            label="Expected change"
                            value={e.expectedChange}
                          />
                          <Detail label="Follow-up" value={e.followUp} />
                          {e.eisenhowerCategory ? (
                            <Detail
                              label="Eisenhower"
                              value={e.eisenhowerCategory.replace(/_/g, " ")}
                            />
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function MonitoringPane({
  hub,
  query,
  filter,
  expandedId,
  onToggle,
}: {
  hub: WeeklyReviewHub;
  query: string;
  filter: MonitoringFilter;
  expandedId: string | null;
  onToggle: (id: string) => void;
}) {
  if (hub.monitoring.length === 0) {
    return (
      <EvidenceEmpty
        title="No monitoring"
        description="No monitoring sessions this week."
      />
    );
  }

  const rows = hub.monitoring.filter((m) => {
    const incomplete = m.checklistCompleted < m.checklistTotal;
    if (filter === "incomplete" && !incomplete) return false;
    if (filter === "complete" && incomplete) return false;
    return matchesQuery(
      `${m.category.name} ${m.observation ?? ""} ${m.responses.map((r) => r.label).join(" ")}`,
      query,
    );
  });

  return (
    <div>
      <p className="wr-result-meta">
        {rows.length} of {hub.monitoring.length} session
        {hub.monitoring.length === 1 ? "" : "s"}
      </p>
      {rows.length === 0 ? (
        <EvidenceEmpty
          title="No matching sessions"
          description="Adjust filters or search."
        />
      ) : (
        <ul className="wr-evidence-stack">
          {rows.map((m) => {
            const open = expandedId === m.id;
            const incomplete =
              m.checklistTotal > 0 &&
              m.checklistCompleted < m.checklistTotal;
            const obsCount = m.observation?.trim() ? 1 : 0;
            return (
              <li
                key={m.id}
                className={`wr-evidence-card is-monitoring${
                  incomplete ? " is-gap" : " is-complete"
                }${open ? " is-open" : ""}`}
              >
                <button type="button" onClick={() => onToggle(m.id)}>
                  <div className="wr-evidence-card-head">
                    <span className="wr-kind-chip is-monitoring">Monitor</span>
                    <span
                      className={`wr-status-chip ${
                        incomplete ? "is-draft" : "is-done"
                      }`}
                    >
                      {incomplete ? "Gaps" : "Complete"}
                    </span>
                  </div>
                  <p className="wr-timeline-title">{m.category.name}</p>
                  <p className="wr-evidence-card-meta">
                    {formatDate(m.observedAt)} · {m.checklistCompleted}/
                    {m.checklistTotal} checklist
                    {obsCount
                      ? ` · ${obsCount} observation${obsCount === 1 ? "" : "s"}`
                      : ""}
                  </p>
                  <p className="wr-evidence-card-cta">
                    {open ? "Hide details" : "View details →"}
                  </p>
                </button>
                {open ? (
                  <ul className="wr-expand">
                    {m.responses.map((r) => (
                      <li
                        key={r.id}
                        className={`wr-check-row ${
                          r.value === "YES" ? "is-yes" : "is-no"
                        }`}
                      >
                        <span aria-hidden>
                          {r.value === "YES" ? "✓" : "○"}
                        </span>
                        <span>
                          {r.label}
                          <span className="wr-check-row-state">
                            {r.value === "YES"
                              ? " · Completed"
                              : " · Not completed"}
                          </span>
                        </span>
                      </li>
                    ))}
                    {m.observation?.trim() ? (
                      <li className="wr-check-observation">
                        <span className="wr-check-observation-label">
                          Observation
                        </span>
                        <p>{m.observation}</p>
                      </li>
                    ) : null}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function AssignmentsPane({
  hub,
  query,
  filter,
  onFilter,
}: {
  hub: WeeklyReviewHub;
  query: string;
  filter: ActionFilter;
  onFilter: (f: ActionFilter) => void;
}) {
  const now = Date.now();
  const rows = allActions(hub).filter((a) => {
    const label = actionStatusLabel(a, now);
    if (filter === "completed" && label !== "Completed") return false;
    if (filter === "overdue" && label !== "Overdue") return false;
    if (filter === "active" && label !== "In Progress") return false;
    if (
      filter === "open" &&
      label !== "In Progress" &&
      label !== "Overdue"
    ) {
      return false;
    }
    return matchesQuery(`${a.title} ${a.description ?? ""}`, query);
  });

  const filters: { id: ActionFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "open", label: "Open" },
    { id: "active", label: "In Progress" },
    { id: "completed", label: "Completed" },
    { id: "overdue", label: "Overdue" },
  ];

  return (
    <div>
      <div className="wr-filter-row">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`wr-filter-pill${filter === f.id ? " is-active" : ""}`}
            onClick={() => onFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <p className="wr-result-meta">{rows.length} shown</p>

      {rows.length === 0 ? (
        <EvidenceEmpty
          title="No assignments"
          description="No matching assignments for this week."
        />
      ) : (
        <ul className="wr-assign-list">
          {rows.map((a) => {
            const label = actionStatusLabel(a, now);
            const when = a.completedAt || a.dueDate;
            const tone =
              label === "Completed"
                ? "is-done"
                : label === "Overdue"
                  ? "is-overdue"
                  : label === "In Progress"
                    ? "is-active"
                    : "is-other";
            return (
              <li key={a.id} className={`wr-assign-row ${tone}`}>
                <span className={`wr-assign-status ${tone}`} aria-hidden>
                  {label === "Completed"
                    ? "✓"
                    : label === "Overdue"
                      ? "!"
                      : "·"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="wr-evidence-card-head">
                    <span className={`wr-kind-chip is-assignments ${tone}`}>
                      {label}
                    </span>
                  </div>
                  <p className="wr-assign-title">{a.title}</p>
                  {a.description?.trim() ? (
                    <p className="wr-assign-desc">{a.description}</p>
                  ) : null}
                  <p className={`wr-assign-meta ${tone}`}>
                    {when ? formatDue(when) : "No due date"}
                    {a.weeklyReview?.weekLabel
                      ? ` · ${a.weeklyReview.weekLabel}`
                      : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function FeedbackPane({
  hub,
  query,
}: {
  hub: WeeklyReviewHub;
  query: string;
}) {
  const rows = (hub.feedback ?? []).filter((f) =>
    matchesQuery(`${f.body} ${personName(f.createdBy)}`, query),
  );
  if ((hub.feedback ?? []).length === 0) {
    return (
      <EvidenceEmpty
        title="Feedback"
        description="No feedback recorded this week. Feedback added during the week will appear here."
      />
    );
  }

  return (
    <div>
      <p className="wr-result-meta">
        {rows.length} of {hub.feedback?.length ?? 0}
      </p>
      {rows.length === 0 ? (
        <EvidenceEmpty
          title="No matching feedback"
          description="Try a different search."
        />
      ) : (
        <ul className="wr-evidence-stack">
          {rows.map((f) => (
            <li key={f.id} className="wr-evidence-card is-feedback">
              <div className="wr-evidence-card-head">
                <span className="wr-kind-chip is-feedback">Feedback</span>
                <span className="wr-timeline-time">
                  {formatDate(f.createdAt)}
                </span>
              </div>
              <p className="wr-evidence-card-meta">
                {personName(f.createdBy)}
              </p>
              <p className="wr-timeline-title font-normal leading-relaxed">
                {f.body}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SwotPane({
  hub,
  profileName,
  query,
  expandedId,
  onToggle,
}: {
  hub: WeeklyReviewHub;
  profileName: string;
  query: string;
  expandedId: string | null;
  onToggle: (id: string) => void;
}) {
  const rows = (hub.swot ?? []).filter((s) =>
    matchesQuery(
      `${s.strength} ${s.weakness} ${s.opportunity} ${s.threat} ${personName(s.createdBy)}`,
      query,
    ),
  );
  if ((hub.swot ?? []).length === 0) {
    return (
      <EvidenceEmpty
        title="No SWOT"
        description={`No SWOT on file for ${profileName} yet.`}
      />
    );
  }

  if (rows.length === 0) {
    return (
      <EvidenceEmpty
        title="No matching SWOT"
        description="Try a different search."
      />
    );
  }

  const [latest, ...older] = rows;

  return (
    <div>
      <div className="wr-swot-owner">
        <p className="wr-swot-owner-name">{profileName}</p>
        <p className="wr-swot-owner-meta">
          Sales Executive SWOT
          {latest
            ? ` · v${latest.versionNumber} · ${formatDate(latest.createdAt)}`
            : ""}
        </p>
        {latest?.createdBy ? (
          <p className="wr-swot-owner-meta">
            Recorded by {personName(latest.createdBy)}
            {latest.source ? ` · ${formatSwotSource(latest.source)}` : ""}
          </p>
        ) : null}
      </div>
      {latest ? <SwotGrid swot={latest} /> : null}
      {older.map((s) => {
        const open = expandedId === s.id;
        return (
          <div key={s.id} className="mt-4">
            <button
              type="button"
              className="wr-add-action"
              onClick={() => onToggle(s.id)}
            >
              {open ? "Hide" : "Show"} v{s.versionNumber}
              {s.createdBy ? ` · ${personName(s.createdBy)}` : ""}
              {` · ${formatDate(s.createdAt)}`}
            </button>
            {open ? (
              <div className="mt-3">
                <SwotGrid swot={s} />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function formatSwotSource(source: string): string {
  const map: Record<string, string> = {
    COMMANDO: "Commando",
    TEAM_LEAD: "Team Lead",
    SELF: "Self",
    SYSTEM: "System",
  };
  return map[source] ?? source.replace(/_/g, " ");
}

function SwotGrid({
  swot,
}: {
  swot: NonNullable<WeeklyReviewHub["swot"]>[number];
}) {
  const cells = [
    { label: "Strengths", value: swot.strength, tone: "strength" },
    { label: "Weaknesses", value: swot.weakness, tone: "weakness" },
    { label: "Opportunities", value: swot.opportunity, tone: "opportunity" },
    { label: "Threats", value: swot.threat, tone: "threat" },
  ];
  return (
    <div className="wr-swot-grid">
      {cells.map((c) => (
        <div key={c.label} className={`wr-swot-cell is-${c.tone}`}>
          <p className="wr-swot-label">{c.label}</p>
          <p className="wr-swot-body">{c.value || "—"}</p>
        </div>
      ))}
    </div>
  );
}

function EisenhowerPane({
  hub,
  query,
  statusFilter,
  expanded,
  onToggle,
}: {
  hub: WeeklyReviewHub;
  query: string;
  statusFilter: EisenhowerStatusFilter;
  expanded: string | null;
  onToggle: (key: string) => void;
}) {
  function filterItems(
    items: WeeklyReviewHub["eisenhower"]["DO_FIRST"],
  ) {
    return items.filter((t) => {
      const done = t.status === "COMPLETED" || t.status === "DONE";
      if (statusFilter === "open" && done) return false;
      if (statusFilter === "done" && !done) return false;
      return matchesQuery(`${t.title} ${t.notes ?? ""}`, query);
    });
  }

  const byQuad = EISENHOWER_QUADRANTS.map((q) => ({
    ...q,
    items: filterItems(hub.eisenhower[q.key]),
    total: hub.eisenhower[q.key].length,
  }));
  const total = byQuad.reduce((n, q) => n + q.items.length, 0);

  if (
    EISENHOWER_QUADRANTS.every((q) => hub.eisenhower[q.key].length === 0)
  ) {
    return (
      <EvidenceEmpty
        title="No priorities"
        description="Eisenhower items for this week will appear here."
      />
    );
  }

  const active = byQuad.find((q) => q.key === expanded) ?? null;

  return (
    <div>
      <p className="wr-result-meta">
        {total} matching · tap a quadrant to inspect
      </p>

      <div className="wr-eisen-grid">
        {byQuad.map((q) => (
          <button
            key={q.key}
            type="button"
            data-quad={q.key}
            className={`wr-eisen-tile${expanded === q.key ? " is-active" : ""}${
              q.items.length === 0 ? " is-empty" : ""
            }`}
            onClick={() => onToggle(q.key)}
          >
            <span className="wr-eisen-tile-count">{q.items.length}</span>
            <span className="wr-eisen-tile-label">{q.title}</span>
          </button>
        ))}
      </div>

      {active ? (
        <div className="wr-eisen-list">
          <div className="wr-eisen-list-head">
            <span>{active.title}</span>
            <span>
              {active.items.length} item
              {active.items.length === 1 ? "" : "s"}
            </span>
          </div>
          {active.items.length === 0 ? (
            <p className="wr-eisen-item text-[var(--color-ink-muted)]">
              No items in this quadrant for the current filters.
            </p>
          ) : (
            active.items.map((t) => (
              <div key={t.id} className="wr-eisen-item">
                <p className="font-medium text-[var(--color-ink)]">{t.title}</p>
                <p className="mt-0.5 text-[var(--text-meta)] text-[var(--color-ink-subtle)]">
                  {t.status}
                  {t.dueDate ? ` · ${formatDate(t.dueDate)}` : ""}
                </p>
                {t.notes?.trim() ? (
                  <p className="mt-1 text-[var(--text-label)] text-[var(--color-ink-muted)] line-clamp-2">
                    {t.notes}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </div>
      ) : (
        <p className="wr-section-meta">
          Select a quadrant above to browse its items without scrolling the
          whole page.
        </p>
      )}
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value?.trim()) return null;
  return (
    <div>
      <p className="text-[var(--text-micro)] font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">
        {label}
      </p>
      <p className="mt-0.5 whitespace-pre-wrap text-[var(--text-label)] text-[var(--color-ink)]">
        {value}
      </p>
    </div>
  );
}
