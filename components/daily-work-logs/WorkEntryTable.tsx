"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Eye, Lock, Paperclip, Pencil, Trash2 } from "lucide-react";
import type { DailyWorkLog } from "@/lib/api";
import { toLocalDateInput } from "@/lib/dates";
import { IconButton } from "@/components/ui";
import {
  activityAccent,
  formatAmount,
  formatDuration,
  pluralize,
  type WorkEntryVariant,
} from "@/lib/work-activities";

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Time spent plus start–end clock time; older entries show their free-text range. */
export function entryTimeSpent(entry: DailyWorkLog): {
  spent: string;
  range: string | null;
} {
  if (entry.startedAt && entry.endedAt) {
    return {
      spent:
        entry.durationMinutes != null ? formatDuration(entry.durationMinutes) : "—",
      range: `${timeLabel(entry.startedAt)} – ${timeLabel(entry.endedAt)}`,
    };
  }
  return { spent: entry.timeRange || "—", range: null };
}

function dayLabel(key: string) {
  return new Date(`${key}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function groupByDay(entries: DailyWorkLog[]) {
  const map = new Map<string, DailyWorkLog[]>();
  for (const entry of entries) {
    const key = toLocalDateInput(entry.loggedAt);
    const list = map.get(key);
    if (list) list.push(entry);
    else map.set(key, [entry]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, items]) => ({ key, label: dayLabel(key), items }));
}

type RowAction = {
  key: "evidence" | "edit" | "delete";
  label: string;
  onSelect: () => void;
};

const ACTION_ICONS = { evidence: Eye, edit: Pencil, delete: Trash2 };

/** Always-visible row actions; a dropdown gets clipped by the scrolling table. */
function RowActions({ label, actions }: { label: string; actions: RowAction[] }) {
  return (
    <div className="wl-row-actions">
      {actions.map((action) => {
        const Icon = ACTION_ICONS[action.key];
        return (
          <IconButton
            key={action.key}
            size="sm"
            label={`${action.label} ${label}`}
            className={`wl-row-action is-${action.key}`}
            onClick={action.onSelect}
          >
            <Icon size={15} strokeWidth={2} aria-hidden />
          </IconButton>
        );
      })}
    </div>
  );
}

function NewBadge() {
  return <span className="wl-new-badge">Just added</span>;
}

function entryLabel(entry: DailyWorkLog) {
  if (!entry.listItemLabel) return entry.activity;
  return entry.subItemLabel
    ? `${entry.listItemLabel} · ${entry.subItemLabel}`
    : entry.listItemLabel;
}

function commitmentTarget(entry: DailyWorkLog): string | null {
  const parts: string[] = [];
  if (entry.count != null) parts.push(`Target ${entry.count}`);
  if (entry.totalAmount != null) parts.push(formatAmount(entry.totalAmount));
  return parts.length > 0 ? parts.join(" · ") : null;
}

function EvidenceCell({
  entry,
  onViewEvidence,
}: {
  entry: DailyWorkLog;
  onViewEvidence?: (entry: DailyWorkLog) => void;
}) {
  const files = entry.attachments?.length ?? 0;
  return (
    <td className="wl-cell-evidence" data-label="Evidence">
      {files > 0 ? (
        <button
          type="button"
          className="wl-evidence-link"
          onClick={() => onViewEvidence?.(entry)}
        >
          <Paperclip size={13} strokeWidth={2} aria-hidden />
          {pluralize(files, "file")}
        </button>
      ) : (
        <span className="wl-muted">—</span>
      )}
    </td>
  );
}

/**
 * Review table for Daily Log (completed activities) and Commitment (planned
 * activities). Rows are read-only here; Daily Log rows are created and edited in the
 * quick builder, commitments are locked once added.
 */
export function WorkEntryTable({
  variant = "log",
  entries,
  canEdit = false,
  groupDays = false,
  highlightId = null,
  editingId = null,
  empty,
  onEdit,
  onDelete,
  onViewEvidence,
}: {
  variant?: WorkEntryVariant;
  entries: DailyWorkLog[];
  /** Edit / Delete on Daily Log rows only. */
  canEdit?: boolean;
  groupDays?: boolean;
  highlightId?: string | null;
  /** Row currently open in the builder. */
  editingId?: string | null;
  empty: ReactNode;
  onEdit?: (entry: DailyWorkLog) => void;
  onDelete?: (entry: DailyWorkLog) => void;
  onViewEvidence?: (entry: DailyWorkLog) => void;
}) {
  const highlightRef = useRef<HTMLTableRowElement>(null);
  useEffect(() => {
    highlightRef.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, [highlightId]);

  if (entries.length === 0) return <div className="wl-empty">{empty}</div>;

  const isLog = variant === "log";
  const columns = isLog ? 7 : 4;
  const groups = groupDays
    ? groupByDay(entries)
    : [{ key: "all", label: "", items: entries }];

  return (
    <div className="wl-table-wrap">
      <table className={`wl-table is-${variant}`}>
        <thead>
          {isLog ? (
            <tr>
              <th scope="col">Activity</th>
              <th scope="col">Sub Item</th>
              <th scope="col" className="is-num">
                Count
              </th>
              <th scope="col">Time Spent</th>
              <th scope="col" className="is-num">
                Total Amount
              </th>
              <th scope="col">Evidence</th>
              <th scope="col" className="is-actions">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          ) : (
            <tr>
              <th scope="col">Commitment</th>
              <th scope="col">Added</th>
              <th scope="col">Evidence</th>
              <th scope="col" className="is-actions">
                <span className="sr-only">Status</span>
              </th>
            </tr>
          )}
        </thead>
        {groups.map((group) => (
          <tbody key={group.key}>
            {groupDays ? (
              <tr className="wl-day-row">
                <th scope="rowgroup" colSpan={columns}>
                  {group.label}
                </th>
              </tr>
            ) : null}
            {group.items.map((entry) => {
              const isNew = entry.id === highlightId;
              const rowProps = {
                ref: isNew ? highlightRef : undefined,
                className: `wl-row${isNew ? " is-new" : ""}${
                  entry.id === editingId ? " is-editing" : ""
                }`,
              };

              if (!isLog) {
                return (
                  <tr key={entry.id} {...rowProps}>
                    <td className="wl-cell-commitment" data-label="Commitment">
                      {entry.listItem ? (
                        <>
                          <div className="wl-activity-line">
                            <span className={`wl-pill accent-${activityAccent(entry.listItem)}`}>
                              {entry.listItemLabel}
                            </span>
                            {entry.subItemLabel ? (
                              <span className="wl-plan-sub">{entry.subItemLabel}</span>
                            ) : null}
                            {isNew ? <NewBadge /> : null}
                          </div>
                          {commitmentTarget(entry) ? (
                            <p className="wl-commit-detail">{commitmentTarget(entry)}</p>
                          ) : null}
                          {entry.notes ? <p className="wl-commit-detail">{entry.notes}</p> : null}
                        </>
                      ) : (
                        <>
                          {isNew ? <NewBadge /> : null}
                          <p className="wl-commit-text">{entry.notes ?? entry.activity}</p>
                        </>
                      )}
                    </td>
                    <td className="wl-cell-time" data-label="Added">
                      {timeLabel(entry.loggedAt)}
                    </td>
                    <EvidenceCell entry={entry} onViewEvidence={onViewEvidence} />
                    <td className="wl-cell-actions">
                      <span className="wl-locked" title="Locked once added">
                        <Lock size={12} strokeWidth={2.25} aria-hidden />
                        <span className="sr-only">Locked</span>
                      </span>
                    </td>
                  </tr>
                );
              }

              const files = entry.attachments?.length ?? 0;
              const label = entryLabel(entry);
              const time = entryTimeSpent(entry);
              const actions: RowAction[] = [];
              if (files > 0 && onViewEvidence) {
                actions.push({
                  key: "evidence",
                  label: "View evidence for",
                  onSelect: () => onViewEvidence(entry),
                });
              }
              if (canEdit && onEdit) {
                actions.push({ key: "edit", label: "Edit", onSelect: () => onEdit(entry) });
              }
              if (canEdit && onDelete) {
                actions.push({
                  key: "delete",
                  label: "Delete",
                  onSelect: () => onDelete(entry),
                });
              }
              return (
                <tr key={entry.id} {...rowProps}>
                  <td className="wl-cell-activity" data-label="Activity">
                    <div className="wl-activity-line">
                      {entry.listItem ? (
                        <span className={`wl-pill accent-${activityAccent(entry.listItem)}`}>
                          {entry.listItemLabel}
                        </span>
                      ) : (
                        <span className="wl-legacy-activity" title={entry.activity}>
                          {entry.activity}
                        </span>
                      )}
                      {entry.subItemLabel ? (
                        <span className="wl-mobile-sub"> · {entry.subItemLabel}</span>
                      ) : null}
                      {isNew ? <NewBadge /> : null}
                    </div>
                    <span className="wl-row-time">{timeLabel(entry.loggedAt)}</span>
                  </td>
                  <td className="wl-cell-sub" data-label="Sub Item">
                    {entry.subItemLabel ?? <span className="wl-muted">—</span>}
                  </td>
                  <td className="wl-cell-count is-num" data-label="Count">
                    {entry.count != null ? (
                      <>
                        <span className="wl-count">{entry.count}</span>
                        <span className="wl-mobile-unit"> done</span>
                      </>
                    ) : (
                      <span className="wl-muted">—</span>
                    )}
                  </td>
                  <td className="wl-cell-time" data-label="Time Spent">
                    {time.spent}
                    {time.range ? (
                      <span className="wl-time-range">{time.range}</span>
                    ) : null}
                  </td>
                  <td className="wl-cell-amount is-num" data-label="Total Amount">
                    {entry.totalAmount != null ? (
                      formatAmount(entry.totalAmount)
                    ) : (
                      <span className="wl-muted">—</span>
                    )}
                  </td>
                  <EvidenceCell entry={entry} onViewEvidence={onViewEvidence} />
                  <td className="wl-cell-actions">
                    {actions.length > 0 ? (
                      <RowActions label={label} actions={actions} />
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
    </div>
  );
}
