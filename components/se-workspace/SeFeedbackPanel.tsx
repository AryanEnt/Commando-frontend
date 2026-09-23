"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { MessageSquareText, Plus, CheckCircle2 } from "lucide-react";
import {
  api,
  ApiError,
  type FeedbackItem,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/dates";
import { personName } from "@/lib/labels";
import { useToast } from "@/lib/toast-context";
import {
  Avatar,
  Button,
  Drawer,
  TextArea,
} from "@/components/ui";

type FilterPreset =
  | "all"
  | "TEAM_LEAD"
  | "COMMANDO"
  | "pending"
  | "week"
  | "month"
  | "custom";

type Props = {
  profileId?: string;
  executiveUserId?: string;
  profileName: string;
  feedback: FeedbackItem[];
  canCreate: boolean;
  teamName?: string;
  teamLeadName?: string | null;
  commandoName?: string | null;
  statusLabel?: string | null;
  activeIntervention?: boolean;
  onFeedbackChanged?: () => void;
  /** Base return path for feedback detail links */
  returnBaseHref?: string;
};

function startOfLocalDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfLocalDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function parseAt(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function matchesPreset(
  f: FeedbackItem,
  preset: FilterPreset,
  now = new Date(),
) {
  const created = parseAt(f.createdAt);
  const weekStart = startOfLocalDay(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6),
  );
  const monthStart = startOfLocalDay(
    new Date(now.getFullYear(), now.getMonth(), 1),
  );

  switch (preset) {
    case "all":
    case "custom":
      return true;
    case "TEAM_LEAD":
      return f.source === "TEAM_LEAD";
    case "COMMANDO":
      return f.source === "COMMANDO";
    case "pending":
      return !f.acknowledgedAt;
    case "week":
      return !!created && created.getTime() >= weekStart.getTime();
    case "month":
      return !!created && created.getTime() >= monthStart.getTime();
    default:
      return true;
  }
}

function matchesDateRange(f: FeedbackItem, from: string, to: string) {
  if (!from && !to) return true;
  const created = parseAt(f.createdAt);
  if (!created) return false;
  if (from) {
    const start = startOfLocalDay(new Date(`${from}T00:00:00`));
    if (created.getTime() < start.getTime()) return false;
  }
  if (to) {
    const end = endOfLocalDay(new Date(`${to}T00:00:00`));
    if (created.getTime() > end.getTime()) return false;
  }
  return true;
}

const PRESETS: Array<{ key: FilterPreset; label: string }> = [
  { key: "all", label: "All" },
  { key: "TEAM_LEAD", label: "Team Lead" },
  { key: "COMMANDO", label: "Commando" },
  { key: "pending", label: "Needs ack" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "custom", label: "Custom" },
];

const BODY_COLLAPSE_AT = 280;

function FeedbackBody({ body }: { body: string }) {
  const [expanded, setExpanded] = useState(false);
  const long = body.length > BODY_COLLAPSE_AT;
  const shown =
    !long || expanded ? body : `${body.slice(0, BODY_COLLAPSE_AT).trim()}…`;

  return (
    <div className="fb-body-wrap">
      <p className="fb-body">{shown}</p>
      {long ? (
        <button
          type="button"
          className="fb-expand"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}

export function SeFeedbackPanel({
  profileId,
  executiveUserId,
  profileName,
  feedback,
  canCreate,
  teamName,
  teamLeadName,
  commandoName,
  statusLabel,
  activeIntervention = false,
  onFeedbackChanged,
  returnBaseHref,
}: Props) {
  const { token, user } = useAuth();
  const { pushToast } = useToast();
  const isSe = user?.roleCode === "SALES_EXECUTIVE";
  const feedbackBase =
    returnBaseHref ??
    (profileId
      ? `/profiles/${profileId}/feedback`
      : executiveUserId
        ? `/support/${executiveUserId}/feedback`
        : "/feedback");

  const [preset, setPreset] = useState<FilterPreset>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ackingId, setAckingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return feedback
      .filter((f) => {
        if (!matchesPreset(f, preset)) return false;
        if (preset === "custom") return matchesDateRange(f, from, to);
        return true;
      })
      .slice()
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [feedback, preset, from, to]);

  const teamLeadCount = feedback.filter((f) => f.source === "TEAM_LEAD").length;
  const commandoCount = feedback.filter((f) => f.source === "COMMANDO").length;
  const pendingCount = feedback.filter((f) => !f.acknowledgedAt).length;
  const monthCount = feedback.filter((f) => matchesPreset(f, "month")).length;

  const hasFilters = preset !== "all" || !!from || !!to;

  const metaLine = [teamName, teamLeadName && `Team Lead: ${teamLeadName}`, commandoName && `Commando: ${commandoName}`]
    .filter(Boolean)
    .join(" · ");

  function clearFilters() {
    setPreset("all");
    setFrom("");
    setTo("");
  }

  function selectPreset(next: FilterPreset) {
    setPreset(next);
    if (next !== "custom") {
      setFrom("");
      setTo("");
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token || !draft.trim()) return;
    setSubmitting(true);
    try {
      await api.createFeedback(token, {
        ...(executiveUserId
          ? { executiveUserId }
          : { salesExecutiveProfileId: profileId! }),
        body: draft.trim(),
      });
      pushToast("Feedback added", "success");
      setDraft("");
      setDrawerOpen(false);
      onFeedbackChanged?.();
    } catch (err) {
      pushToast(
        err instanceof ApiError ? err.message : "Could not add feedback",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function acknowledge(id: string) {
    if (!token || !isSe) return;
    setAckingId(id);
    try {
      await api.acknowledgeFeedback(token, id);
      pushToast("Feedback acknowledged", "success");
      onFeedbackChanged?.();
    } catch (err) {
      pushToast(
        err instanceof ApiError
          ? err.message
          : "Could not acknowledge feedback",
        "error",
      );
    } finally {
      setAckingId(null);
    }
  }

  return (
    <div className="fb-page">
      <header className="fb-header">
        <div className="fb-header-copy">
          <p className="fb-profile-name">{profileName}</p>
          {metaLine ? <p className="fb-meta">{metaLine}</p> : null}
          {statusLabel ? (
            <p className="fb-status">
              <span
                className={`fb-status-dot${activeIntervention ? " is-active" : ""}`}
                aria-hidden
              />
              {statusLabel}
            </p>
          ) : null}
        </div>
      </header>

      <div className="fb-title-row">
        <div className="min-w-0">
          <div className="fb-title-badge" aria-hidden>
            <MessageSquareText size={15} strokeWidth={1.85} />
          </div>
          <h1 className="fb-title">Feedback</h1>
          <p className="fb-subtitle">
            Coaching notes from your Team Lead and Commando. Acknowledge each one once you have read it.
            {feedback.length > 0
              ? ` · ${feedback.length} entr${feedback.length === 1 ? "y" : "ies"}`
              : ""}
          </p>
        </div>
        {canCreate ? (
          <button
            type="button"
            className="btn btn-primary btn-sm fb-cta"
            onClick={() => setDrawerOpen(true)}
          >
            <Plus size={14} strokeWidth={2.25} aria-hidden />
            Add feedback
          </button>
        ) : null}
      </div>

      {feedback.length > 0 ? (
        <>
          <div className="fb-stats" aria-label="Feedback summary">
            <div className="fb-stat">
              <span className="fb-stat-value">{feedback.length}</span>
              <span className="fb-stat-label">Total</span>
            </div>
            <div className="fb-stat is-tl">
              <span className="fb-stat-value">{teamLeadCount}</span>
              <span className="fb-stat-label">Team Lead</span>
            </div>
            <div className="fb-stat is-co">
              <span className="fb-stat-value">{commandoCount}</span>
              <span className="fb-stat-label">Commando</span>
            </div>
            <div className={`fb-stat${pendingCount > 0 ? " is-pending" : ""}`}>
              <span className="fb-stat-value">{pendingCount}</span>
              <span className="fb-stat-label">Needs ack</span>
            </div>
            <div className="fb-stat">
              <span className="fb-stat-value">{monthCount}</span>
              <span className="fb-stat-label">This month</span>
            </div>
          </div>

          <div className="fb-toolbar">
            <div
              className="fb-filters"
              role="group"
              aria-label="Feedback filters"
            >
              {PRESETS.map((p) => {
                const active = preset === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    aria-pressed={active}
                    className={`fb-filter${active ? " is-active" : ""}`}
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
                className="fb-clear"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            ) : null}
          </div>

          {preset === "custom" ? (
            <div className="fb-custom-dates">
              <label className="fb-date-field">
                <span>From</span>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </label>
              <label className="fb-date-field">
                <span>To</span>
                <input
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={(e) => setTo(e.target.value)}
                />
              </label>
            </div>
          ) : null}
        </>
      ) : null}

      {feedback.length === 0 ? (
        <div className="fb-empty">
          <div className="fb-empty-icon" aria-hidden>
            <MessageSquareText size={22} strokeWidth={1.75} />
          </div>
          <p className="fb-empty-title">No feedback yet</p>
          <p className="fb-empty-desc">
            Feedback from the Team Lead and Commando will appear here. Acknowledge each note after you read it.
          </p>
          {canCreate ? (
            <button
              type="button"
              className="btn btn-primary btn-sm fb-cta"
              onClick={() => setDrawerOpen(true)}
            >
              <Plus size={14} strokeWidth={2.25} aria-hidden />
              Add feedback
            </button>
          ) : null}
        </div>
      ) : filtered.length === 0 ? (
        <div className="fb-empty">
          <p className="fb-empty-title">No feedback found</p>
          <p className="fb-empty-desc">
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
        <section className="fb-list-section" aria-label="Feedback entries">
          <div className="fb-list-head">
            <h2 className="fb-list-title">Feedback</h2>
            <span className="fb-list-count">
              {filtered.length}{" "}
              {filtered.length === 1 ? "entry" : "entries"}
            </span>
          </div>

          <ul className="fb-timeline">
            {filtered.map((f, index) => {
              const fromTl = f.source === "TEAM_LEAD";
              const roleLabel = fromTl ? "Team Lead" : "Commando";
              const detailHref = `/feedback/${f.id}?returnTo=${encodeURIComponent(feedbackBase)}`;
              const author = personName(f.createdBy);
              return (
                <li
                  key={f.id}
                  className={`fb-entry${fromTl ? " is-tl" : " is-co"}${!f.acknowledgedAt ? " is-pending" : ""}`}
                  style={{ "--fb-i": index } as CSSProperties}
                >
                  <div className="fb-entry-rail" aria-hidden>
                    <span className="fb-entry-dot" />
                  </div>
                  <article className="fb-entry-card">
                    <div className="fb-entry-top">
                      <Avatar name={author} size="sm" />
                      <div className="fb-entry-identity">
                        <div className="fb-entry-name-row">
                          <p className="fb-entry-author">{author}</p>
                          <span
                            className={`fb-role-pill${fromTl ? " is-tl" : " is-co"}`}
                          >
                            {roleLabel}
                          </span>
                        </div>
                        <p className="fb-entry-meta">
                          <time dateTime={f.createdAt}>
                            {formatDate(f.createdAt)}
                          </time>
                          {f.assignment ? (
                            <>
                              <span className="fb-meta-sep" aria-hidden>
                                ·
                              </span>
                              <span className="fb-intervention">
                                Under intervention
                              </span>
                            </>
                          ) : null}
                        </p>
                      </div>
                    </div>
                    <FeedbackBody body={f.body} />
                    <div className="fb-entry-actions">
                      {f.acknowledgedAt ? (
                        <span className="fb-ack-badge">
                          <CheckCircle2 size={13} strokeWidth={2.2} aria-hidden />
                          Acknowledged {formatDate(f.acknowledgedAt)}
                        </span>
                      ) : isSe ? (
                        <Button
                          variant="success"
                          size="sm"
                          disabled={ackingId === f.id}
                          onClick={() => void acknowledge(f.id)}
                        >
                          {ackingId === f.id ? "Acknowledging…" : "Acknowledge"}
                        </Button>
                      ) : (
                        <span className="fb-ack-wait">Awaiting acknowledgement</span>
                      )}
                      <Link href={detailHref} className="fb-action-link">
                        View details →
                      </Link>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => {
          if (!submitting) {
            setDrawerOpen(false);
            setDraft("");
          }
        }}
        title="Add feedback"
        description={`For ${profileName}. Source is set from your role.`}
        footer={
          <div className="fb-drawer-actions">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={submitting}
              onClick={() => {
                setDrawerOpen(false);
                setDraft("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="fb-add-form"
              size="sm"
              disabled={submitting || !draft.trim()}
            >
              {submitting ? "Adding…" : "Add feedback"}
            </Button>
          </div>
        }
      >
        <form id="fb-add-form" onSubmit={onSubmit} className="fb-add-form">
          {activeIntervention ? (
            <p className="fb-drawer-context">Under active intervention</p>
          ) : null}
          <TextArea
            label="Feedback"
            required
            rows={5}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write your feedback…"
            autoFocus
          />
        </form>
      </Drawer>
    </div>
  );
}
