"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api, type MonitoringRecord } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDateTime } from "@/lib/dates";
import { responsibilityTypeLabel } from "@/lib/labels";
import { computeWeightedScore } from "@/lib/monitoring-scoring";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Avatar,
  ErrorState,
  ReadOnlyPanel,
  Skeleton,
} from "@/components/ui";

export default function MonitoringDetailPage() {
  const params = useParams<{ id: string }>();
  const { token } = useAuth();
  const [record, setRecord] = useState<MonitoringRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!token || !params.id) return;
      try {
        const res = await api.getMonitoringRecord(token, params.id);
        if (!cancelled) {
          setRecord(res.data.record);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load this monitoring session.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, params.id]);

  const summary = useMemo(() => {
    if (!record) return null;
    const values = record.responses.map((r) => r.value);
    const scored =
      record.scorePercent != null
        ? { scorePercent: record.scorePercent }
        : computeWeightedScore(
            record.responses.map((r) => ({
              value: r.value,
              weight: r.weightSnapshot ?? 0,
            })),
          );
    return {
      total: values.length,
      yes: values.filter((v) => v === "YES").length,
      no: values.filter((v) => v === "NO").length,
      na: values.filter((v) => v === "NA").length,
      scorePercent: scored.scorePercent,
    };
  }, [record]);

  if (error && !record) {
    return (
      <div className="space-y-2">
        <Link href="/monitoring" className="text-sm text-slate-600 underline">
          ← Monitoring
        </Link>
        <ErrorState message={error} />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-16 w-full max-w-xl" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const subjectName = record.profile
    ? record.profile.displayName
    : record.executiveUser
      ? `${record.executiveUser.firstName} ${record.executiveUser.lastName}`.trim()
      : "Subject";
  const backHref = record.executiveUserId
    ? `/support/${record.executiveUserId}/monitoring`
    : `/profiles/${record.salesExecutiveProfileId}/monitoring`;
  const subjectHref = record.executiveUserId
    ? `/support/${record.executiveUserId}`
    : `/profiles/${record.salesExecutiveProfileId}`;
  const subjectNavLabel = record.executiveUserId
    ? "Sales Support"
    : "Sales Executives";
  const subjectListHref = record.executiveUserId ? "/support" : "/profiles";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-4">
        <nav className="text-xs text-[var(--color-ink-muted)]">
          <Link href={subjectListHref} className="hover:text-[var(--color-ink)]">
            {subjectNavLabel}
          </Link>
          <span className="mx-1.5">/</span>
          <Link
            href={subjectHref}
            className="hover:text-[var(--color-ink)]"
          >
            {subjectName}
          </Link>
          <span className="mx-1.5">/</span>
          <Link href={backHref} className="hover:text-[var(--color-ink)]">
            Monitoring
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-[var(--color-ink)]">{record.category.name}</span>
        </nav>

        <Link
          href={backHref}
          className="inline-flex text-sm font-medium text-[var(--color-brand)] hover:underline"
        >
          ← Back to {subjectName}
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Avatar name={subjectName} size="lg" />
            <div>
              <h1 className="text-[1.75rem] font-semibold tracking-tight text-[var(--color-ink)]">
                {record.category.name}
              </h1>
              <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">
                {subjectName} ·{" "}
                {formatDateTime(record.observedAt)}
              </p>
              <div className="mt-2">
                <StatusBadge status="COMPLETED" label="Completed" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <ReadOnlyPanel title="Checklist">
        {summary ? (
          <p className="mb-3 text-sm text-[var(--color-ink-muted)]">
            {summary.scorePercent != null ? (
              <>
                <span className="font-semibold text-[var(--color-ink)]">
                  Score {summary.scorePercent}%
                </span>
                {" · "}
              </>
            ) : null}
            {summary.yes} yes · {summary.no} needs attention · {summary.na} N/A
            · {summary.total} items
          </p>
        ) : null}
        <ul className="divide-y divide-[var(--color-line)]">
          {record.responses.map((r) => {
            const label =
              r.labelSnapshot ?? r.checklistItem?.label ?? "Checklist item";
            const isCustom =
              r.isCustom ||
              r.sourceType === "CUSTOM" ||
              r.sourceType === "SESSION";
            return (
              <li
                key={r.id}
                className="flex flex-wrap items-start justify-between gap-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <ResultMark value={r.value} />
                    <span className="text-sm font-medium text-[var(--color-ink)]">
                      {label}
                    </span>
                    {typeof r.weightSnapshot === "number" ? (
                      <span className="text-[11px] font-semibold tabular-nums text-[var(--color-ink-muted)]">
                        {r.weightSnapshot}%
                      </span>
                    ) : null}
                    {isCustom ? (
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--color-ink-muted)] ring-1 ring-[var(--color-line)]">
                        Custom
                      </span>
                    ) : null}
                  </div>
                  {r.descriptionSnapshot ? (
                    <p className="mt-1 pl-6 text-sm text-[var(--color-ink-muted)]">
                      {r.descriptionSnapshot}
                    </p>
                  ) : null}
                </div>
                <StatusBadge status={r.value} />
              </li>
            );
          })}
        </ul>
      </ReadOnlyPanel>

      <ReadOnlyPanel title="Support involved">
        {record.supportInvolvements && record.supportInvolvements.length > 0 ? (
          <ul className="space-y-2 text-sm text-[var(--color-ink)]">
            {record.supportInvolvements.map((s) => (
              <li key={s.id}>
                {s.displayNameSnapshot}
                {s.responsibilityTypeSnapshot
                  ? ` · ${responsibilityTypeLabel(s.responsibilityTypeSnapshot)}`
                  : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--color-ink-muted)]">None recorded</p>
        )}
      </ReadOnlyPanel>

      <ReadOnlyPanel title="Observations">
        <p className="whitespace-pre-wrap text-sm text-[var(--color-ink)]">
          {record.observation?.trim() ? record.observation : "—"}
        </p>
        <dl className="mt-4 grid gap-3 border-t border-[var(--color-line)] pt-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase text-[var(--color-ink-subtle)]">
              Observed
            </dt>
            <dd className="mt-1">{formatDateTime(record.observedAt)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-[var(--color-ink-subtle)]">
              Created by
            </dt>
            <dd className="mt-1">
              {record.createdBy.firstName} {record.createdBy.lastName}
            </dd>
          </div>
        </dl>
      </ReadOnlyPanel>
    </div>
  );
}

function ResultMark({ value }: { value: string }) {
  if (value === "YES") {
    return (
      <span
        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--status-success-bg)] text-xs font-semibold text-[var(--status-success)]"
        aria-label="Yes"
      >
        ✓
      </span>
    );
  }
  if (value === "NO") {
    return (
      <span
        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--status-danger-bg)] text-xs font-semibold text-[var(--status-danger)]"
        aria-label="No"
      >
        ✕
      </span>
    );
  }
  return (
    <span
      className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--status-neutral-bg)] text-xs font-semibold text-[var(--status-neutral)]"
      aria-label="N/A"
    >
      —
    </span>
  );
}
