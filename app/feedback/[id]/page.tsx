"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Flag, MessageSquareText, UserRound } from "lucide-react";
import { api, type FeedbackItem } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate, formatDateTime } from "@/lib/dates";
import { personName } from "@/lib/labels";
import { useToast } from "@/lib/toast-context";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Avatar,
  Button,
  ErrorState,
  LoadingState,
} from "@/components/ui";

export default function FeedbackDetailPage() {
  const { token, user } = useAuth();
  const { pushToast } = useToast();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = String(params.id);
  const [item, setItem] = useState<FeedbackItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acking, setAcking] = useState(false);

  useEffect(() => {
    if (!token || !id) return;
    void (async () => {
      try {
        const res = await api.getFeedbackItem(token, id);
        setItem(res.data.feedback);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      }
    })();
  }, [token, id]);

  if (error) {
    return (
      <div className="mx-auto max-w-2xl space-y-3">
        <Link
          href="/profiles"
          className="text-sm font-medium text-[var(--color-brand)] hover:underline"
        >
          ← Sales Executives
        </Link>
        <ErrorState message={error} />
      </div>
    );
  }

  if (!item) return <LoadingState label="Loading feedback…" />;

  const fromTl = item.source === "TEAM_LEAD";
  const authorName = personName(item.createdBy);
  const isSe = user?.roleCode === "SALES_EXECUTIVE";
  const canAcknowledge =
    isSe && !item.acknowledgedAt && item.createdById !== user?.id;

  async function onAcknowledge() {
    if (!token || !item) return;
    setAcking(true);
    try {
      const res = await api.acknowledgeFeedback(token, item.id);
      setItem(res.data.feedback);
      pushToast("Feedback acknowledged", "success");
    } catch (err) {
      pushToast(
        err instanceof Error ? err.message : "Could not acknowledge feedback",
        "error",
      );
    } finally {
      setAcking(false);
    }
  }
  const subjectName =
    item.profile?.displayName ??
    (item.executiveUser
      ? `${item.executiveUser.firstName} ${item.executiveUser.lastName}`
      : "Sales Support");
  const returnTo = searchParams.get("returnTo");
  const backHref =
    returnTo ||
    (item.salesExecutiveProfileId
      ? `/profiles/${item.salesExecutiveProfileId}/feedback`
      : item.executiveUserId
        ? `/support/${item.executiveUserId}/feedback`
        : "/feedback");
  const backLabel = returnTo
    ? `← Back to ${subjectName}`
    : `← Back to ${subjectName}'s feedback`;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link
        href={backHref}
        className="inline-flex text-sm font-semibold text-[var(--color-brand)] hover:underline"
      >
        {backLabel}
      </Link>

      <header className="page-hero">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-eyebrow">Feedback record</p>
            <h1 className="mt-1 text-page-title text-[1.4rem]">
              Coaching feedback
            </h1>
            <p className="mt-1.5 text-secondary">
              For{" "}
              {item.salesExecutiveProfileId ? (
                <Link
                  href={`/profiles/${item.salesExecutiveProfileId}`}
                  className="font-semibold text-[var(--color-brand-dark)] hover:underline"
                >
                  {subjectName}
                </Link>
              ) : item.executiveUserId ? (
                <Link
                  href={`/support/${item.executiveUserId}`}
                  className="font-semibold text-[var(--color-brand-dark)] hover:underline"
                >
                  {subjectName}
                </Link>
              ) : (
                <span className="font-semibold text-[var(--color-brand-dark)]">
                  {subjectName}
                </span>
              )}
            </p>
          </div>
          <span
            className={`icon-well h-11 w-11 shrink-0 ${
              fromTl ? "icon-well-info" : "icon-well-brand"
            }`}
            aria-hidden
          >
            <MessageSquareText size={18} strokeWidth={1.85} />
          </span>
        </div>
      </header>

      <section className={`kpi-card ${fromTl ? "kpi-blue" : "kpi-mint"} !p-4`}>
        <p className="text-eyebrow">Written by</p>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <Avatar name={authorName} size="md" />
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-[var(--color-ink)]">
                {authorName}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <StatusBadge
                  status={item.source}
                  label={fromTl ? "Team Lead" : "Commando"}
                />
                <span
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-[8px] ring-1 ring-inset ${
                    fromTl
                      ? "bg-[var(--status-info-bg)] text-[var(--status-info)] ring-[var(--status-info-ring)]"
                      : "bg-[var(--color-brand-soft)] text-[var(--color-brand)] ring-[var(--color-brand-ring)]"
                  }`}
                  aria-hidden
                >
                  {fromTl ? (
                    <UserRound size={13} strokeWidth={1.85} />
                  ) : (
                    <Flag size={13} strokeWidth={1.85} />
                  )}
                </span>
              </div>
              <p className="mt-2 text-meta">
                Submitted {formatDateTime(item.createdAt)}
              </p>
            </div>
          </div>
        </div>
        {item.assignment ? (
          <p className="mt-3 rounded-[var(--radius-sm)] bg-[var(--color-surface)]/80 px-3 py-2 text-meta ring-1 ring-inset ring-[var(--color-line)]">
            Linked to an active Commando intervention (started{" "}
            {formatDate(item.assignment.startedAt)})
          </p>
        ) : null}
      </section>

      <section className="surface overflow-hidden">
        <div className="border-b border-[var(--color-line)] bg-[var(--color-mint)] px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <span className="icon-well icon-well-brand h-8 w-8" aria-hidden>
              <MessageSquareText size={14} strokeWidth={1.85} />
            </span>
            <div>
              <h2 className="text-section-title">Feedback note</h2>
              <p className="text-meta">The coaching message for this Sales Executive</p>
            </div>
          </div>
        </div>
        <article className="px-4 py-5 text-[15px] leading-relaxed whitespace-pre-wrap text-[var(--color-ink)] sm:px-5">
          {item.body}
        </article>
      </section>

      {canAcknowledge || item.acknowledgedAt ? (
        <section className="surface flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          {item.acknowledgedAt ? (
            <p className="text-sm font-medium text-[var(--color-brand-dark)]">
              Acknowledged {formatDateTime(item.acknowledgedAt)}
            </p>
          ) : (
            <p className="text-sm text-[var(--color-ink-muted)]">
              Confirm you have read this coaching note.
            </p>
          )}
          {canAcknowledge ? (
            <Button
              variant="success"
              size="sm"
              disabled={acking}
              onClick={() => void onAcknowledge()}
            >
              {acking ? "Acknowledging…" : "Acknowledge"}
            </Button>
          ) : null}
        </section>
      ) : null}

      <p className="px-1 text-meta">
        This is an append-only feedback entry — past notes stay as written and
        are not edited over.
      </p>
    </div>
  );
}
