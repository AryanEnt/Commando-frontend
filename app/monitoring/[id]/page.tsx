"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, type MonitoringRecord } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { StatusBadge } from "@/components/StatusBadge";
import {
  DateTimeCell,
  ErrorState,
  LoadingState,
  ReadOnlyPanel,
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
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, params.id]);

  if (error) {
    return (
      <div className="space-y-2">
        <Link href="/monitoring" className="text-sm text-slate-600 underline">
          ← Monitoring
        </Link>
        <ErrorState message={error} />
      </div>
    );
  }
  if (!record) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/monitoring" className="text-sm text-slate-600 underline">
          ← Monitoring
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          {record.category.name}
        </h1>
        <p className="text-sm text-slate-600">{record.profile.displayName}</p>
      </div>

      <ReadOnlyPanel title="Monitoring session">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase text-slate-500">Observed</dt>
            <dd className="mt-1">
              <DateTimeCell value={record.observedAt} />
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Created by</dt>
            <dd className="mt-1">
              {record.createdBy.firstName} {record.createdBy.lastName}
            </dd>
          </div>
          {record.assignmentId && (
            <div>
              <dt className="text-xs uppercase text-slate-500">Assignment</dt>
              <dd className="mt-1 font-mono text-xs">
                {record.assignmentId.slice(0, 8)}…
              </dd>
            </div>
          )}
        </dl>

        <div>
          <h2 className="text-xs uppercase text-slate-500">Checklist</h2>
          {record.responses.length > 0 && (
            <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
              {record.responses.filter((r) => r.value === "YES" || r.value === "DONE").length} of{" "}
              {record.responses.length} items marked complete
            </p>
          )}
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
            <div
              className="h-full bg-[var(--color-brand)]"
              style={{
                width: `${
                  record.responses.length === 0
                    ? 0
                    : (100 *
                        record.responses.filter(
                          (r) => r.value === "YES" || r.value === "DONE",
                        ).length) /
                      record.responses.length
                }%`,
              }}
            />
          </div>
          <ul className="mt-3 divide-y divide-[var(--color-line)]">
            {record.responses.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
              >
                <span>{r.checklistItem.label}</span>
                <StatusBadge status={r.value} />
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-xs uppercase text-slate-500">
            Free-form observations
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-slate-900">
            {record.observation ?? "—"}
          </p>
        </div>
      </ReadOnlyPanel>
    </div>
  );
}
