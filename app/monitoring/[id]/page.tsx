"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api, errorMessage, type MonitoringRecord } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { toast } from "@/lib/toast";
import { formatDateTime } from "@/lib/dates";
import { responsibilityTypeLabel } from "@/lib/labels";
import { computeWeightedScore } from "@/lib/monitoring-scoring";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Avatar,
  Button,
  ErrorState,
  ReadOnlyPanel,
  Skeleton,
  TextArea,
  TextInput,
} from "@/components/ui";

const RESPONSE_VALUES = [
  { value: "YES", label: "Yes" },
  { value: "NO", label: "No" },
  { value: "NA", label: "N/A" },
] as const;

type SupportOption = {
  userId: string;
  name: string;
  responsibilityType: string | null;
};

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function MonitoringDetailPage() {
  const params = useParams<{ id: string }>();
  const { token, user, hasPermission } = useAuth();
  const [record, setRecord] = useState<MonitoringRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [observation, setObservation] = useState("");
  const [observedAt, setObservedAt] = useState("");
  const [supportIds, setSupportIds] = useState<string[]>([]);
  const [supportOptions, setSupportOptions] = useState<SupportOption[]>([]);

  const canEdit =
    (user?.roleCode === "TEAM_LEAD" ||
      user?.roleCode === "COMMANDO_EXECUTIVE") &&
    hasPermission("MONITORING_CREATE");

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

  const responses = useMemo(() => {
    if (!record) return [];
    return record.responses.map((r) => ({
      ...r,
      value: editing ? (values[r.id] ?? r.value) : r.value,
    }));
  }, [record, editing, values]);

  const summary = useMemo(() => {
    if (!record) return null;
    const vals = responses.map((r) => r.value);
    const scored =
      !editing && record.scorePercent != null
        ? { scorePercent: record.scorePercent }
        : computeWeightedScore(
            responses.map((r) => ({
              value: r.value,
              weight: r.weightSnapshot ?? 0,
            })),
          );
    return {
      total: vals.length,
      yes: vals.filter((v) => v === "YES").length,
      no: vals.filter((v) => v === "NO").length,
      na: vals.filter((v) => v === "NA").length,
      scorePercent: scored.scorePercent,
    };
  }, [record, responses, editing]);

  function startEdit() {
    if (!record) return;
    setValues(Object.fromEntries(record.responses.map((r) => [r.id, r.value])));
    setObservation(record.observation ?? "");
    setObservedAt(toLocalInput(record.observedAt));
    setSupportIds(
      (record.supportInvolvements ?? []).map((s) => s.salesSupportUserId),
    );
    const existing: SupportOption[] = (record.supportInvolvements ?? []).map(
      (s) => ({
        userId: s.salesSupportUserId,
        name: s.displayNameSnapshot,
        responsibilityType: s.responsibilityTypeSnapshot,
      }),
    );
    setSupportOptions(existing);
    setSaveError(null);
    setEditing(true);

    if (
      token &&
      record.salesExecutiveProfileId &&
      hasPermission("SALES_SUPPORT_LINK_VIEW")
    ) {
      void api
        .getSeSupportTeam(token, record.salesExecutiveProfileId)
        .then((res) => {
          const merged = new Map(existing.map((o) => [o.userId, o]));
          for (const link of res.data.activeSupport) {
            if (merged.has(link.salesSupportUserId)) continue;
            merged.set(link.salesSupportUserId, {
              userId: link.salesSupportUserId,
              name: `${link.supportUser.firstName} ${link.supportUser.lastName}`.trim(),
              responsibilityType: link.responsibilityType,
            });
          }
          setSupportOptions([...merged.values()]);
        })
        .catch(() => undefined);
    }
  }

  async function save() {
    if (!token || !record) return;
    setSaving(true);
    setSaveError(null);
    try {
      const changed = record.responses
        .filter((r) => values[r.id] && values[r.id] !== r.value)
        .map((r) => ({ id: r.id, value: values[r.id] as string }));
      const originalSupport = (record.supportInvolvements ?? [])
        .map((s) => s.salesSupportUserId)
        .sort()
        .join(",");
      const nextSupport = [...supportIds].sort().join(",");
      const nextObservedIso = observedAt
        ? new Date(observedAt).toISOString()
        : undefined;
      const observedChanged =
        nextObservedIso &&
        toLocalInput(nextObservedIso) !== toLocalInput(record.observedAt);

      const res = await api.updateMonitoringRecord(token, record.id, {
        ...(changed.length ? { responses: changed } : {}),
        ...(observation !== (record.observation ?? "")
          ? { observation: observation.trim() || null }
          : {}),
        ...(observedChanged ? { observedAt: nextObservedIso } : {}),
        ...(record.salesExecutiveProfileId && nextSupport !== originalSupport
          ? {
              supportInvolvement:
                supportIds.length === 0
                  ? { none: true }
                  : { salesSupportUserIds: supportIds },
            }
          : {}),
      });
      setRecord(res.data.record);
      setEditing(false);
      toast.success("Monitoring session updated");
    } catch (err) {
      setSaveError(errorMessage(err, "Unable to save changes. Please try again."));
    } finally {
      setSaving(false);
    }
  }

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

  const summaryLine = summary ? (
    <p className="mb-3 text-sm text-[var(--color-ink-muted)]">
      {summary.scorePercent != null ? (
        <>
          <span className="font-semibold text-[var(--color-ink)]">
            Score {summary.scorePercent}%
          </span>
          {" · "}
        </>
      ) : null}
      {summary.yes} yes · {summary.no} needs attention · {summary.na} N/A ·{" "}
      {summary.total} items
    </p>
  ) : null;

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
          {canEdit && !editing ? (
            <Button variant="secondary" onClick={startEdit}>
              Edit
            </Button>
          ) : null}
        </div>
      </div>

      {editing ? (
        <section className="surface space-y-6 p-4 sm:p-5">
          <div>
            <h2 className="text-base font-semibold">Edit session</h2>
            <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">
              Checklist items and weights stay as recorded; the score is
              recalculated from your answers.
            </p>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-[var(--color-ink)]">
              Checklist
            </p>
            {summaryLine}
            <ul className="divide-y divide-[var(--color-line)]">
              {responses.map((r) => {
                const label =
                  r.labelSnapshot ?? r.checklistItem?.label ?? "Checklist item";
                return (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium text-[var(--color-ink)]">
                        {label}
                      </span>
                      {typeof r.weightSnapshot === "number" ? (
                        <span className="ml-2 text-[11px] font-semibold tabular-nums text-[var(--color-ink-muted)]">
                          {r.weightSnapshot}%
                        </span>
                      ) : null}
                    </div>
                    <div className="flex gap-1.5" role="radiogroup" aria-label={label}>
                      {RESPONSE_VALUES.map((opt) => {
                        const selected = r.value === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            data-value={opt.value}
                            disabled={saving}
                            onClick={() =>
                              setValues((prev) => ({ ...prev, [r.id]: opt.value }))
                            }
                            className="response-pill focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] disabled:opacity-60"
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {record.salesExecutiveProfileId ? (
            <div>
              <p className="mb-2 text-sm font-medium text-[var(--color-ink)]">
                Support involved
              </p>
              {supportOptions.length === 0 ? (
                <p className="text-sm text-[var(--color-ink-muted)]">
                  No Sales Support is linked to this Sales Executive.
                </p>
              ) : (
                <ul className="space-y-2">
                  {supportOptions.map((opt) => (
                    <li key={opt.userId}>
                      <label className="flex items-center gap-2 text-sm text-[var(--color-ink)]">
                        <input
                          type="checkbox"
                          disabled={saving}
                          checked={supportIds.includes(opt.userId)}
                          onChange={(e) =>
                            setSupportIds((prev) =>
                              e.target.checked
                                ? [...prev, opt.userId]
                                : prev.filter((id) => id !== opt.userId),
                            )
                          }
                        />
                        {opt.name}
                        {opt.responsibilityType
                          ? ` · ${responsibilityTypeLabel(opt.responsibilityType)}`
                          : ""}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          <TextArea
            label="Observations"
            rows={5}
            value={observation}
            disabled={saving}
            onChange={(e) => setObservation(e.target.value)}
          />

          <TextInput
            label="Observed"
            type="datetime-local"
            value={observedAt}
            disabled={saving}
            onChange={(e) => setObservedAt(e.target.value)}
          />

          {saveError ? <ErrorState message={saveError} /> : null}

          <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--color-line)] pt-4">
            <Button
              variant="secondary"
              disabled={saving}
              onClick={() => {
                setEditing(false);
                setSaveError(null);
              }}
            >
              Cancel
            </Button>
            <Button disabled={saving} onClick={() => void save()}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </section>
      ) : (
        <>
          <ReadOnlyPanel title="Checklist">
            {summaryLine}
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
        </>
      )}
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
