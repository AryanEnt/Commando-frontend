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
  ReadOnlyPanel,
  TextArea,
  TextInput,
} from "@/components/ui";

function toDateInput(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

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
    performanceSummary: "",
    whatWentWell: "",
    improvement: "",
    nextWeekAction: "",
  });

  async function load() {
    if (!token || !params.id) return;
    const res = await api.getWeeklyReview(token, params.id);
    setReview(res.data.review);
    const r = res.data.review;
    setForm({
      weekLabel: r.weekLabel,
      weekStartDate: toDateInput(r.weekStartDate),
      meetingDate: toDateInput(r.meetingDate),
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

  async function onSubmit() {
    if (!token || !review) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.submitWeeklyReview(token, review.id);
      setReview(res.data.review);
      pushToast("Weekly review submitted", "success");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to submit";
      setError(msg);
      pushToast(msg, "error");
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

  if (error && !review) {
    return (
      <div className="space-y-2">
        <Link href="/weekly-reviews" className="text-sm text-slate-600 underline">
          ← Weekly Reviews
        </Link>
        <ErrorState message={error} />
      </div>
    );
  }
  if (!review) return <LoadingState />;

  const canEdit =
    review.isEditable && hasPermission("WEEKLY_REVIEW_EDIT");
  const canSubmit =
    review.status === "DRAFT" && hasPermission("WEEKLY_REVIEW_SUBMIT");
  const canAcknowledge =
    review.status === "SUBMITTED" &&
    !review.signed &&
    review.attendees.some((a) => a.userId === user?.id);

  function personName(
    p: { firstName: string; lastName: string } | null | undefined,
  ) {
    if (!p) return "—";
    return `${p.firstName} ${p.lastName}`;
  }

  const textFields = [
    ["performanceSummary", "Performance summary"],
    ["whatWentWell", "What went well"],
    ["improvement", "Improvement"],
    ["nextWeekAction", "Next-week action"],
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/weekly-reviews"
            className="text-sm text-slate-600 underline"
          >
            ← Weekly Reviews
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            {review.weekLabel}
          </h1>
          <p className="text-sm text-slate-600">
            {review.profile.displayName} · Meeting{" "}
            {formatDate(review.meetingDate)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={review.status} />
            {review.myStatus && <StatusBadge status={review.myStatus} />}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canSubmit && (
            <Button disabled={busy} onClick={() => void onSubmit()}>
              Submit
            </Button>
          )}
          {canAcknowledge && (
            <Button variant="secondary" disabled={busy} onClick={() => void onAcknowledge()}>
              Acknowledge / Sign
            </Button>
          )}
        </div>
      </div>

      {error && <ErrorState message={error} />}

      {canEdit ? (
        <Panel title="Draft review" tone="active" description="Editable until submitted.">
          <form onSubmit={onSave} className="space-y-4 p-4">
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
            {textFields.map(([key, label]) => (
              <TextArea
                key={key}
                label={label}
                required
                rows={3}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            ))}
            <Button type="submit" variant="secondary" disabled={busy}>
              {busy ? "Saving…" : "Save changes"}
            </Button>
          </form>
        </Panel>
      ) : (
        <ReadOnlyPanel title="Review summary">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase text-slate-500">Commando</dt>
              <dd>{personName(review.commando)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-500">Team Lead</dt>
              <dd>{personName(review.teamLead)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-500">Week start</dt>
              <dd className="tabular-nums">{formatDate(review.weekStartDate)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-500">Submitted</dt>
              <dd>
                {review.submittedAt ? (
                  <DateTimeCell value={review.submittedAt} />
                ) : (
                  "—"
                )}
              </dd>
            </div>
          </dl>
          {(
            [
              ["Performance summary", review.performanceSummary],
              ["What went well", review.whatWentWell],
              ["Improvement", review.improvement],
              ["Next-week action", review.nextWeekAction],
            ] as const
          ).map(([label, value]) => (
            <div key={label}>
              <h2 className="text-xs uppercase text-slate-500">{label}</h2>
              <p className="mt-1 whitespace-pre-wrap">{value}</p>
            </div>
          ))}
        </ReadOnlyPanel>
      )}

      <Panel title="Attendees">
        <ul className="divide-y divide-[var(--color-line)] p-4 text-sm">
          {review.attendees.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-2 py-2"
            >
              <span className="flex items-center gap-2">
                <Avatar name={`${a.user.firstName} ${a.user.lastName}`} size="sm" />
                <span>
                  {a.user.firstName} {a.user.lastName}
                  <span className="ml-2 text-xs text-[var(--color-ink-muted)]">
                    {a.user.role.code.replaceAll("_", " ")}
                  </span>
                </span>
              </span>
              <span className="text-xs text-[var(--color-ink-muted)]">
                {a.signedAt ? (
                  <>
                    Signed <DateTimeCell value={a.signedAt} />
                  </>
                ) : (
                  "Not signed"
                )}
              </span>
            </li>
          ))}
        </ul>
        <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
          Created by {review.createdBy.firstName} {review.createdBy.lastName} ·{" "}
          <DateTimeCell value={review.createdAt} />
        </p>
      </Panel>
    </div>
  );
}
