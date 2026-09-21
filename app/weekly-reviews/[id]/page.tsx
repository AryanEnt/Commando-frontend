"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError, type WeeklyReview } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { formatDate } from "@/lib/dates";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Avatar,
  Button,
  DateTimeCell,
  ErrorState,
  LoadingState,
  Panel,
  TextArea,
  TextInput,
} from "@/components/ui";

function toDateInput(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

const NARRATIVE_SECTIONS = [
  {
    key: "performanceSummary" as const,
    label: "Performance summary",
    hint: "How the week looked overall",
    accent: "var(--status-info)",
    soft: "var(--status-info-bg)",
    ring: "var(--status-info-ring)",
  },
  {
    key: "whatWentWell" as const,
    label: "What went well",
    hint: "Wins and strengths to keep",
    accent: "var(--status-success)",
    soft: "var(--status-success-bg)",
    ring: "var(--status-success-ring)",
  },
  {
    key: "improvement" as const,
    label: "Improvement",
    hint: "Gaps and coaching focus",
    accent: "var(--status-warn)",
    soft: "var(--status-warn-bg)",
    ring: "var(--status-warn-ring)",
  },
  {
    key: "nextWeekAction" as const,
    label: "Next-week action",
    hint: "Concrete commitments for next week",
    accent: "var(--color-accent)",
    soft: "var(--color-accent-soft)",
    ring: "var(--color-accent-ring)",
  },
] as const;

export default function WeeklyReviewDetailPage() {
  const params = useParams<{ id: string }>();
  const { token, user, hasPermission } = useAuth();
  const { pushToast } = useToast();
  const [review, setReview] = useState<WeeklyReview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    weekLabel: "",
    weekStartDate: "",
    meetingDate: "",
    roomName: "",
    meetingTime: "",
    performanceSummary: "",
    whatWentWell: "",
    improvement: "",
    nextWeekAction: "",
  });
  const [minutesBusy, setMinutesBusy] = useState(false);

  async function load() {
    if (!token || !params.id) return;
    const res = await api.getWeeklyReview(token, params.id);
    setReview(res.data.review);
    const r = res.data.review;
    setForm({
      weekLabel: r.weekLabel,
      weekStartDate: toDateInput(r.weekStartDate),
      meetingDate: toDateInput(r.meetingDate),
      roomName: r.roomName ?? "",
      meetingTime: r.meetingTime ?? "",
      performanceSummary: r.performanceSummary,
      whatWentWell: r.whatWentWell,
      improvement: r.improvement,
      nextWeekAction: r.nextWeekAction,
    });
    setError(null);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await load();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, params.id]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!token || !review) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.updateWeeklyReview(token, review.id, {
        ...form,
        meetingDate: new Date(form.meetingDate).toISOString(),
      });
      setReview(res.data.review);
      pushToast("Weekly review saved.", "success");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to save";
      setError(msg);
      pushToast("Unable to save weekly review.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function onAcknowledge() {
    if (!token || !review) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.acknowledgeWeeklyReview(token, review.id);
      setReview(res.data.review);
      pushToast("Review acknowledged", "success");
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Failed to acknowledge";
      setError(msg);
      pushToast(msg, "error");
    } finally {
      setBusy(false);
    }
  }

  async function onDownloadMinutes() {
    if (!token || !review?.meetingMinutes) return;
    setMinutesBusy(true);
    try {
      const res = await api.getWeeklyReviewMinutesUrl(token, review.id);
      window.open(res.data.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Failed to download minutes";
      pushToast(msg, "error");
    } finally {
      setMinutesBusy(false);
    }
  }

  if (error && !review) {
    return (
      <div className="space-y-2">
        <Link href="/profiles" className="text-sm text-slate-600 underline">
          ← Sales Executives
        </Link>
        <ErrorState message={error} />
      </div>
    );
  }
  if (!review) return <LoadingState />;

  const canEdit =
    review.isEditable &&
    hasPermission("WEEKLY_REVIEW_EDIT") &&
    user?.roleCode !== "SUPER_ADMIN";
  const canAcknowledge =
    review.status === "SUBMITTED" &&
    !review.signed &&
    (review.attendees.some((a) => a.userId === user?.id) ||
      review.profile.userId === user?.id);

  function personName(
    p: { firstName: string; lastName: string } | null | undefined,
  ) {
    if (!p) return "—";
    return `${p.firstName} ${p.lastName}`;
  }

  const backHref = `/profiles/${review.salesExecutiveProfileId}/reviews`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href={backHref}
            className="text-sm font-medium text-[var(--color-brand)] hover:underline"
          >
            ← Back to {review.profile.displayName}
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
            {review.weekLabel}
          </h1>
          <p className="text-sm text-[var(--color-ink-muted)]">
            {review.profile.displayName} · Meeting{" "}
            {formatDate(review.meetingDate)}
            {review.meetingTime ? ` · ${review.meetingTime}` : ""}
            {review.roomName ? ` · ${review.roomName}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={review.status} />
            {review.myStatus && <StatusBadge status={review.myStatus} />}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canAcknowledge && (
            <Button disabled={busy} onClick={() => void onAcknowledge()}>
              Sign this review
            </Button>
          )}
        </div>
      </div>

      {error && <ErrorState message={error} />}

      {canAcknowledge ? (
        <div
          role="status"
          className="rounded-[var(--radius-md)] border border-[var(--color-brand)]/30 bg-[var(--color-brand-soft)] px-4 py-3 text-sm"
        >
          <p className="font-medium text-[var(--color-ink)]">
            Ready for your signature
          </p>
          <p className="mt-1 text-[var(--color-ink-muted)]">
            Review the notes below, then click <strong>Sign this review</strong>.
          </p>
        </div>
      ) : null}

      {review.status === "SUBMITTED" &&
      !canAcknowledge &&
      !review.salesExecutiveSigned ? (
        <div
          role="status"
          className="rounded-[var(--radius-md)] border border-[var(--status-warn-ring)] bg-[var(--status-warn-bg)] px-4 py-3 text-sm text-[var(--status-warn)]"
        >
          Waiting for {review.profile.displayName} to sign.
        </div>
      ) : null}

      {canEdit ? (
        <Panel
          title="Draft review"
          tone="active"
          description="Editable until submitted."
        >
          <form onSubmit={onSave} className="space-y-5 p-4">
            <div className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">
                Meeting details
              </p>
              <div className="space-y-4">
                <TextInput
                  label="Week"
                  required
                  value={form.weekLabel}
                  onChange={(e) =>
                    setForm({ ...form, weekLabel: e.target.value })
                  }
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextInput
                    label="Week start"
                    type="date"
                    required
                    value={form.weekStartDate}
                    onChange={(e) =>
                      setForm({ ...form, weekStartDate: e.target.value })
                    }
                  />
                  <TextInput
                    label="Meeting date"
                    type="date"
                    required
                    value={form.meetingDate}
                    onChange={(e) =>
                      setForm({ ...form, meetingDate: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextInput
                    label="Room name"
                    required
                    value={form.roomName}
                    onChange={(e) =>
                      setForm({ ...form, roomName: e.target.value })
                    }
                  />
                  <TextInput
                    label="Meeting time"
                    type="time"
                    required
                    value={form.meetingTime}
                    onChange={(e) =>
                      setForm({ ...form, meetingTime: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {NARRATIVE_SECTIONS.map((section) => (
                <div
                  key={section.key}
                  className="rounded-[var(--radius-md)] border p-4"
                  style={{
                    background: section.soft,
                    borderColor: section.ring,
                    borderLeftWidth: 4,
                    borderLeftColor: section.accent,
                  }}
                >
                  <TextArea
                    label={section.label}
                    required
                    rows={4}
                    value={form[section.key]}
                    onChange={(e) =>
                      setForm({ ...form, [section.key]: e.target.value })
                    }
                  />
                  <p className="mt-1.5 text-[11px] text-[var(--color-ink-subtle)]">
                    {section.hint}
                  </p>
                </div>
              ))}
            </div>

            <Button type="submit" variant="secondary" disabled={busy}>
              {busy ? "Saving…" : "Save changes"}
            </Button>
          </form>
        </Panel>
      ) : (
        <div className="space-y-4">
          <section className="surface overflow-hidden rounded-[var(--radius-md)]">
            <div className="border-b border-[var(--color-line)] bg-[var(--color-mint)] px-4 py-3">
              <h2 className="text-sm font-semibold text-[var(--color-ink)]">
                Meeting snapshot
              </h2>
              <p className="text-[12px] text-[var(--color-ink-muted)]">
                Who ran it and when
              </p>
            </div>
            <dl className="grid gap-px bg-[var(--color-line)] sm:grid-cols-2 lg:grid-cols-3">
              {(
                [
                  ["Commando", personName(review.commando)],
                  ["Team Lead", personName(review.teamLead)],
                  ["Week start", formatDate(review.weekStartDate)],
                  [
                    "Meeting",
                    `${formatDate(review.meetingDate)}${
                      review.meetingTime ? ` · ${review.meetingTime}` : ""
                    }`,
                  ],
                  ["Room", review.roomName || "—"],
                  [
                    "Submitted",
                    review.submittedAt ? (
                      <DateTimeCell
                        key="submitted"
                        value={review.submittedAt}
                      />
                    ) : (
                      "—"
                    ),
                  ],
                ] as const
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="bg-[var(--color-surface)] px-4 py-3"
                >
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">
                    {label}
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-[var(--color-ink)] tabular-nums">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            {review.meetingMinutes ? (
              <div className="border-t border-[var(--color-line)] bg-[var(--color-surface-2)] px-4 py-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">
                  Meeting minutes
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={minutesBusy}
                  onClick={() => void onDownloadMinutes()}
                >
                  {minutesBusy
                    ? "Preparing…"
                    : `Download ${review.meetingMinutes.fileName}`}
                </Button>
              </div>
            ) : null}
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            {NARRATIVE_SECTIONS.map((section) => (
              <section
                key={section.key}
                className="rounded-[var(--radius-md)] border p-4 shadow-[0_1px_0_rgba(12,31,23,0.04)]"
                style={{
                  background: section.soft,
                  borderColor: section.ring,
                  borderLeftWidth: 4,
                  borderLeftColor: section.accent,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2
                      className="text-sm font-semibold"
                      style={{ color: section.accent }}
                    >
                      {section.label}
                    </h2>
                    <p className="mt-0.5 text-[11px] text-[var(--color-ink-subtle)]">
                      {section.hint}
                    </p>
                  </div>
                  <span
                    className="mt-0.5 size-2.5 shrink-0 rounded-full"
                    style={{ background: section.accent }}
                    aria-hidden
                  />
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-ink)]">
                  {review[section.key] || "—"}
                </p>
              </section>
            ))}
          </div>
        </div>
      )}

      <Panel title="Attendees & signatures">
        <ul className="grid gap-3 p-4 sm:grid-cols-2">
          {review.attendees.map((a) => {
            const signed = Boolean(a.signedAt);
            return (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border px-3 py-3"
                style={{
                  background: signed
                    ? "var(--status-success-bg)"
                    : "var(--status-neutral-bg)",
                  borderColor: signed
                    ? "var(--status-success-ring)"
                    : "var(--status-neutral-ring)",
                }}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Avatar
                    name={`${a.user.firstName} ${a.user.lastName}`}
                    size="sm"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-[var(--color-ink)]">
                      {a.user.firstName} {a.user.lastName}
                    </span>
                    <span className="text-[11px] text-[var(--color-ink-muted)]">
                      {a.user.role.code.replaceAll("_", " ")}
                    </span>
                  </span>
                </span>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  style={{
                    color: signed
                      ? "var(--status-success)"
                      : "var(--color-ink-subtle)",
                    background: signed
                      ? "var(--color-surface)"
                      : "var(--color-surface)",
                  }}
                >
                  {signed ? (
                    <>
                      Signed · <DateTimeCell value={a.signedAt!} />
                    </>
                  ) : (
                    "Awaiting signature"
                  )}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="border-t border-[var(--color-line)] px-4 py-3 text-xs text-[var(--color-ink-muted)]">
          Created by {review.createdBy.firstName} {review.createdBy.lastName} ·{" "}
          <DateTimeCell value={review.createdAt} />
        </p>
      </Panel>
    </div>
  );
}
