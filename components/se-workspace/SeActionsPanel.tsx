"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CircleDot,
  Clock3,
  ListChecks,
  Plus,
} from "lucide-react";
import { api, type ActionItem } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { formatDue } from "@/lib/dates";
import { personName } from "@/lib/labels";
import { seCreateHref, seWorkspaceHref } from "@/lib/se-workspace-nav";
import { Button, ButtonLink } from "@/components/ui";

type ListView = "active" | "history";

type DuePreset =
  | "all"
  | "overdue"
  | "open"
  | "today"
  | "week"
  | "no_due"
  | "completed"
  | "custom";

function isHistoryStatus(a: ActionItem) {
  return ["COMPLETED", "EXPIRED", "REPLACED", "CANCELLED"].includes(a.status);
}

type Props = {
  profileId: string;
  profileName: string;
  actions: ActionItem[];
  canCreate: boolean;
  canComplete?: boolean;
  onChanged?: () => void | Promise<void>;
  teamName?: string;
  teamLeadName?: string | null;
  commandoName?: string | null;
  statusLabel?: string | null;
  activeIntervention?: boolean;
};

function startOfLocalDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfLocalDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function parseDue(value: string | null) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isOverdue(a: ActionItem, now = Date.now()) {
  return (
    a.status === "ACTIVE" &&
    !!a.dueDate &&
    (parseDue(a.dueDate)?.getTime() ?? Infinity) < now
  );
}

function matchesPreset(a: ActionItem, preset: DuePreset, now = new Date()) {
  const due = parseDue(a.dueDate);
  const todayStart = startOfLocalDay(now);
  const todayEnd = endOfLocalDay(now);
  const weekEnd = endOfLocalDay(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7),
  );

  switch (preset) {
    case "all":
    case "custom":
      return true;
    case "overdue":
      return isOverdue(a, now.getTime());
    case "open":
      return a.status === "ACTIVE" && !isOverdue(a, now.getTime());
    case "today":
      return (
        a.status === "ACTIVE" &&
        !!due &&
        due.getTime() >= todayStart.getTime() &&
        due.getTime() <= todayEnd.getTime()
      );
    case "week":
      return (
        a.status === "ACTIVE" &&
        !!due &&
        due.getTime() >= todayStart.getTime() &&
        due.getTime() <= weekEnd.getTime()
      );
    case "no_due":
      return a.status === "ACTIVE" && !a.dueDate;
    case "completed":
      return a.status === "COMPLETED";
    default:
      return true;
  }
}

function matchesDateRange(a: ActionItem, dueFrom: string, dueTo: string) {
  if (!dueFrom && !dueTo) return true;
  const due = parseDue(a.dueDate);
  if (!due) return false;
  if (dueFrom) {
    const from = startOfLocalDay(new Date(`${dueFrom}T00:00:00`));
    if (due.getTime() < from.getTime()) return false;
  }
  if (dueTo) {
    const to = endOfLocalDay(new Date(`${dueTo}T00:00:00`));
    if (due.getTime() > to.getTime()) return false;
  }
  return true;
}

const PRESETS: Array<{ key: DuePreset; label: string }> = [
  { key: "all", label: "All" },
  { key: "overdue", label: "Overdue" },
  { key: "open", label: "Open" },
  { key: "today", label: "Due today" },
  { key: "week", label: "This week" },
  { key: "no_due", label: "No due date" },
  { key: "completed", label: "Completed" },
  { key: "custom", label: "Custom" },
];

type StatKey = "overdue" | "open" | "completed" | "history";

function statusTone(a: ActionItem): "overdue" | "open" | "done" | "other" {
  if (isOverdue(a)) return "overdue";
  if (a.status === "ACTIVE") return "open";
  if (a.status === "COMPLETED") return "done";
  return "other";
}

function assignmentStatusLabel(a: ActionItem): string {
  if (isOverdue(a)) return "Overdue";
  if (a.status === "ACTIVE") return "Open";
  if (a.status === "COMPLETED") return "Completed";
  if (a.status === "EXPIRED") return "Expired";
  if (a.status === "REPLACED") return "Replaced";
  if (a.status === "CANCELLED") return "Cancelled";
  return a.status;
}

export function SeActionsPanel({
  profileId,
  profileName,
  actions,
  canCreate,
  canComplete = false,
  onChanged,
  teamName,
  teamLeadName,
  commandoName,
  statusLabel,
  activeIntervention = false,
}: Props) {
  const { token } = useAuth();
  const { pushToast } = useToast();
  const [preset, setPreset] = useState<DuePreset>("all");
  const [listView, setListView] = useState<ListView>("active");
  const [dueFrom, setDueFrom] = useState("");
  const [dueTo, setDueTo] = useState("");
  const [completingId, setCompletingId] = useState<string | null>(null);

  const scoped = useMemo(
    () =>
      actions.filter((a) =>
        listView === "history" ? isHistoryStatus(a) : a.status === "ACTIVE",
      ),
    [actions, listView],
  );

  const filtered = useMemo(() => {
    return scoped
      .filter((a) => {
        if (!matchesPreset(a, preset)) return false;
        if (preset === "custom") return matchesDateRange(a, dueFrom, dueTo);
        return true;
      })
      .slice()
      .sort((a, b) => {
        const toneRank = (x: ActionItem) => {
          const t = statusTone(x);
          return t === "overdue" ? 0 : t === "open" ? 1 : t === "done" ? 2 : 3;
        };
        const r = toneRank(a) - toneRank(b);
        if (r !== 0) return r;
        const ad = parseDue(a.dueDate)?.getTime() ?? Number.POSITIVE_INFINITY;
        const bd = parseDue(b.dueDate)?.getTime() ?? Number.POSITIVE_INFINITY;
        if (listView === "history") {
          return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
        }
        return ad - bd;
      });
  }, [scoped, preset, dueFrom, dueTo, listView]);

  const overdueCount = actions.filter((a) => isOverdue(a)).length;
  const openCount = actions.filter(
    (a) => a.status === "ACTIVE" && !isOverdue(a),
  ).length;
  const completedCount = actions.filter((a) => a.status === "COMPLETED").length;
  const historyCount = actions.filter((a) => isHistoryStatus(a)).length;

  const presets =
    listView === "history"
      ? PRESETS.filter((p) => ["all", "completed", "custom"].includes(p.key))
      : PRESETS.filter((p) => p.key !== "completed");

  const hasFilters = preset !== "all" || !!dueFrom || !!dueTo;
  const metaLine = [
    teamName,
    teamLeadName && `Team Lead: ${teamLeadName}`,
    commandoName && `Commando: ${commandoName}`,
  ]
    .filter(Boolean)
    .join(" · ");

  function selectListView(next: ListView) {
    setListView(next);
    setPreset("all");
    setDueFrom("");
    setDueTo("");
  }

  function clearFilters() {
    setPreset("all");
    setDueFrom("");
    setDueTo("");
  }

  function selectPreset(next: DuePreset) {
    setPreset(next);
    if (next !== "custom") {
      setDueFrom("");
      setDueTo("");
    }
  }

  const activeStat: StatKey | null =
    listView === "history" && preset === "completed"
      ? "completed"
      : listView === "history" && preset === "all"
        ? "history"
        : listView === "active" && preset === "overdue"
          ? "overdue"
          : listView === "active" && preset === "open"
            ? "open"
            : null;

  function selectStat(stat: StatKey) {
    // Clicking the active stat again clears back to Active / All
    if (activeStat === stat) {
      setListView("active");
      setPreset("all");
      setDueFrom("");
      setDueTo("");
      return;
    }
    setDueFrom("");
    setDueTo("");
    if (stat === "overdue") {
      setListView("active");
      setPreset("overdue");
    } else if (stat === "open") {
      setListView("active");
      setPreset("open");
    } else if (stat === "completed") {
      setListView("history");
      setPreset("completed");
    } else {
      setListView("history");
      setPreset("all");
    }
    window.requestAnimationFrame(() => {
      document
        .getElementById("as-assignment-list")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function completeAction(id: string) {
    if (!token || !canComplete) return;
    setCompletingId(id);
    try {
      await api.completeActionItem(token, id);
      pushToast("Assignment completed", "success");
      await onChanged?.();
      setListView("history");
    } catch (err) {
      pushToast(
        err instanceof Error ? err.message : "Could not complete assignment",
        "error",
      );
    } finally {
      setCompletingId(null);
    }
  }

  const overdueItems = filtered.filter((a) => isOverdue(a));
  const openItems = filtered.filter(
    (a) => a.status === "ACTIVE" && !isOverdue(a),
  );
  const completedItems = filtered.filter((a) => a.status === "COMPLETED");
  const otherItems = filtered.filter((a) =>
    ["EXPIRED", "REPLACED", "CANCELLED"].includes(a.status),
  );

  const groups = (
    [
      {
        key: "overdue" as const,
        title: "Overdue",
        hint: "Past due — needs follow-up",
        items: overdueItems,
        Icon: AlertCircle,
      },
      {
        key: "open" as const,
        title: "Open",
        hint: "Active follow-ups in progress",
        items: openItems,
        Icon: CircleDot,
      },
      {
        key: "done" as const,
        title: "Completed",
        hint: "Finished and closed out",
        items: completedItems,
        Icon: CheckCircle2,
      },
      {
        key: "other" as const,
        title: "Closed / other",
        hint: "Expired, replaced, or cancelled",
        items: otherItems,
        Icon: Clock3,
      },
    ] as const
  ).filter((g) => g.items.length > 0);

  return (
    <div className="as-page">
      <header className="as-header">
        <div className="as-header-copy">
          <p className="as-profile-name">{profileName}</p>
          {metaLine ? <p className="as-meta">{metaLine}</p> : null}
          {statusLabel ? (
            <p className="as-status">
              <span
                className={`as-status-dot${activeIntervention ? " is-active" : ""}`}
                aria-hidden
              />
              {statusLabel}
            </p>
          ) : null}
        </div>
      </header>

      <div className="as-title-row">
        <div className="min-w-0">
          <div className="as-title-badge" aria-hidden>
            <ListChecks size={15} strokeWidth={1.85} />
          </div>
          <h1 className="as-title">Assignments</h1>
          <p className="as-subtitle">
            {listView === "history"
              ? "Completed, expired, replaced, and cancelled items"
              : "Ownership, due dates, and follow-ups"}
            {scoped.length > 0
              ? ` · ${scoped.length} item${scoped.length === 1 ? "" : "s"}`
              : ""}
          </p>
        </div>
        <div className="as-title-actions">
          <div
            className="as-filters"
            role="group"
            aria-label="Assignment view"
          >
            <button
              type="button"
              aria-pressed={listView === "active"}
              className={`as-filter${listView === "active" ? " is-active" : ""}`}
              onClick={() => selectListView("active")}
            >
              Active
            </button>
            <button
              type="button"
              aria-pressed={listView === "history"}
              className={`as-filter${listView === "history" ? " is-active" : ""}`}
              onClick={() => selectListView("history")}
            >
              History{historyCount > 0 ? ` (${historyCount})` : ""}
            </button>
          </div>
          {canCreate ? (
            <ButtonLink
              href={seCreateHref(profileId, "action")}
              size="sm"
              className="as-cta"
            >
              <Plus size={14} aria-hidden />
              Create assignment
            </ButtonLink>
          ) : null}
        </div>
      </div>

      {actions.length > 0 ? (
        <>
          <div
            className="as-stats"
            role="group"
            aria-label="Assignment summary — click to filter"
          >
            <button
              type="button"
              className={`as-stat${overdueCount > 0 ? " is-overdue" : ""}${activeStat === "overdue" ? " is-selected" : ""}`}
              aria-pressed={activeStat === "overdue"}
              onClick={() => selectStat("overdue")}
            >
              <span className="as-stat-value">{overdueCount}</span>
              <span className="as-stat-label">Overdue</span>
            </button>
            <button
              type="button"
              className={`as-stat is-open${activeStat === "open" ? " is-selected" : ""}`}
              aria-pressed={activeStat === "open"}
              onClick={() => selectStat("open")}
            >
              <span className="as-stat-value">{openCount}</span>
              <span className="as-stat-label">Open</span>
            </button>
            <button
              type="button"
              className={`as-stat is-done${activeStat === "completed" ? " is-selected" : ""}`}
              aria-pressed={activeStat === "completed"}
              onClick={() => selectStat("completed")}
            >
              <span className="as-stat-value">{completedCount}</span>
              <span className="as-stat-label">Completed</span>
            </button>
            <button
              type="button"
              className={`as-stat${activeStat === "history" ? " is-selected" : ""}`}
              aria-pressed={activeStat === "history"}
              onClick={() => selectStat("history")}
            >
              <span className="as-stat-value">{historyCount}</span>
              <span className="as-stat-label">History</span>
            </button>
          </div>

          <div className="as-toolbar">
            <div
              className="as-filters"
              role="group"
              aria-label="Assignment filters"
            >
              {presets.map((p) => {
                const active = preset === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    aria-pressed={active}
                    className={`as-filter${active ? " is-active" : ""}${p.key === "overdue" ? " is-warn" : ""}`}
                    onClick={() => selectPreset(p.key)}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
            {hasFilters ? (
              <button
                type="button"
                className="as-clear"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            ) : null}
          </div>

          {preset === "custom" ? (
            <div className="as-custom-dates">
              <label className="as-date-field">
                <span>Due from</span>
                <input
                  type="date"
                  value={dueFrom}
                  onChange={(e) => setDueFrom(e.target.value)}
                />
              </label>
              <label className="as-date-field">
                <span>Due to</span>
                <input
                  type="date"
                  value={dueTo}
                  min={dueFrom || undefined}
                  onChange={(e) => setDueTo(e.target.value)}
                />
              </label>
            </div>
          ) : null}
        </>
      ) : null}

      {scoped.length === 0 ? (
        <div className="as-empty">
          <div className="as-empty-icon" aria-hidden>
            <ListChecks size={22} strokeWidth={1.75} />
          </div>
          <p className="as-empty-title">
            {listView === "history"
              ? "No assignment history"
              : "No assignments yet"}
          </p>
          <p className="as-empty-desc">
            {listView === "history"
              ? "Completed, expired, replaced, and cancelled assignments will appear here."
              : "Ownership, due dates, and status for follow-ups will appear here."}
          </p>
          {canCreate && listView === "active" ? (
            <ButtonLink
              href={seCreateHref(profileId, "action")}
              size="sm"
              className="as-cta"
            >
              <Plus size={14} aria-hidden />
              Create assignment
            </ButtonLink>
          ) : null}
        </div>
      ) : filtered.length === 0 ? (
        <div className="as-empty">
          <p className="as-empty-title">No assignments found</p>
          <p className="as-empty-desc">
            Try another filter or date range.
          </p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={clearFilters}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="as-groups" id="as-assignment-list">
          {groups.map((group) => {
            const GroupIcon = group.Icon;
            return (
              <section
                key={group.key}
                className={`as-group is-${group.key}`}
                aria-label={group.title}
              >
                <div className="as-group-head">
                  <span className="as-group-icon" aria-hidden>
                    <GroupIcon size={15} strokeWidth={1.85} />
                  </span>
                  <div className="min-w-0">
                    <div className="as-group-title-row">
                      <h2 className="as-group-title">{group.title}</h2>
                      <span className="as-group-count">{group.items.length}</span>
                    </div>
                    <p className="as-group-hint">{group.hint}</p>
                  </div>
                </div>

                <ul className="as-list">
                  {group.items.map((a, index) => {
                    const creator = personName(a.createdBy);
                    const dueLabel = a.dueDate
                      ? formatDue(a.dueDate)
                      : "No due date";
                    const detailHref = `/action-items/${a.id}?returnTo=${encodeURIComponent(seWorkspaceHref(profileId, "actions"))}`;
                    const showComplete =
                      canComplete && a.status === "ACTIVE";
                    const tone = statusTone(a);
                    const isOpenAssignment = a.status === "ACTIVE";
                    return (
                      <li
                        key={a.id}
                        className={`as-item is-${tone}`}
                        style={{ "--as-i": index } as CSSProperties}
                      >
                        <Link
                          href={detailHref}
                          className="as-item-main"
                          aria-label={`Open assignment ${a.title}`}
                        >
                          <p className="as-item-title">{a.title}</p>
                          <p className="as-item-meta">
                            <span
                              className={
                                tone === "overdue" ? "as-due is-late" : "as-due"
                              }
                            >
                              Due {dueLabel}
                            </span>
                            {creator ? (
                              <>
                                <span className="as-meta-sep" aria-hidden>
                                  ·
                                </span>
                                <span>{creator}</span>
                              </>
                            ) : null}
                            {a.assignment ? (
                              <>
                                <span className="as-meta-sep" aria-hidden>
                                  ·
                                </span>
                                <span className="as-intervention">
                                  Under intervention
                                </span>
                              </>
                            ) : null}
                          </p>
                          {a.description ? (
                            <p className="as-item-desc">{a.description}</p>
                          ) : null}
                          {isOpenAssignment ? (
                            <p className="as-item-cue">
                              Tap to add screenshot &amp; summary
                            </p>
                          ) : null}
                        </Link>
                        <div className="as-item-side">
                          <span className={`as-pill is-${tone}`}>
                            {assignmentStatusLabel(a)}
                          </span>
                          {showComplete ? (
                            <Button
                              variant="success"
                              size="sm"
                              disabled={completingId === a.id}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                void completeAction(a.id);
                              }}
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
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
