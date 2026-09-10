"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, type CommandoPerformanceReportDetail } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { StarRating } from "@/components/StarRating";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/dates";
import {
  ErrorState,
  LoadingState,
  PageHeader,
} from "@/components/ui";

export default function CommandoPerformanceReportDetailPage() {
  const { token, user, hasPermission } = useAuth();
  const params = useParams();
  const assignmentId = String(params.assignmentId);
  const [report, setReport] = useState<CommandoPerformanceReportDetail | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const allowed =
    user?.roleCode === "SUPER_ADMIN" && hasPermission("REPORT_VIEW");

  useEffect(() => {
    if (!token || !allowed || !assignmentId) return;
    void (async () => {
      try {
        const res = await api.getCommandoPerformanceReportDetail(
          token,
          assignmentId,
        );
        setReport(res.data.report);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      }
    })();
  }, [token, allowed, assignmentId]);

  if (!allowed) {
    return (
      <ErrorState message="Only Super Admin can view report details." />
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <Link
          href="/reports/commando-performance"
          className="text-sm text-slate-600 underline"
        >
          ← Commando Performance Report
        </Link>
        <ErrorState message={error} />
      </div>
    );
  }

  if (!report) {
    return <LoadingState label="Loading report detail…" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/reports/commando-performance"
          className="text-sm text-slate-600 underline"
        >
          ← Commando Performance Report
        </Link>
        <PageHeader
          title={`${report.commando.name} · ${report.profile.displayName}`}
          description="All values below are sourced from linked evaluations, SWOT analyses, and Eisenhower tasks."
        />
      </div>

      <dl className="grid gap-4 rounded border border-slate-200 bg-white p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <dt className="text-xs uppercase text-slate-500">Assigned</dt>
          <dd className="mt-1">
            <StatusBadge status={report.status} /> · {report.daysAssigned} days
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Avg. Score</dt>
          <dd className="mt-1 tabular-nums">
            {report.avgScore != null ? report.avgScore.toFixed(1) : "—"}
            {report.avgScoreSource && (
              <Link
                href={`/performance/${report.avgScoreSource.evaluationId}`}
                className="ml-2 text-xs underline"
              >
                source eval
              </Link>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Rating / Stars</dt>
          <dd className="mt-1 flex items-center gap-2">
            {report.rating != null ? report.rating.toFixed(2) : "—"}
            <StarRating value={report.starRating} />
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">TL Verdict</dt>
          <dd className="mt-1">
            {report.tlVerdict ?? "—"}
            {report.tlVerdictSource && (
              <Link
                href={`/performance/${report.tlVerdictSource.evaluationId}`}
                className="ml-2 text-xs underline"
              >
                source eval
              </Link>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">SWOT count</dt>
          <dd className="mt-1">{report.swot.count}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Eisenhower count</dt>
          <dd className="mt-1">{report.eisenhower.count}</dd>
        </div>
      </dl>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Source performance evaluations</h2>
        {report.sourceRecords.performanceEvaluations.length === 0 ? (
          <p className="text-sm text-slate-500">No linked evaluations.</p>
        ) : (
          <ul className="space-y-3">
            {report.sourceRecords.performanceEvaluations.map((e) => (
              <li
                key={e.id}
                className="rounded border border-slate-200 bg-white p-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{e.source}</span>
                  <Link href={`/performance/${e.id}`} className="underline">
                    Open evaluation
                  </Link>
                </div>
                <p className="mt-1 text-slate-600">
                  Verdict: {e.verdict ?? "—"} · Rating:{" "}
                  {e.rating != null ? e.rating.toFixed(2) : "—"} · Avg metric:{" "}
                  {e.averageMetricScore != null
                    ? e.averageMetricScore.toFixed(1)
                    : "—"}
                </p>
                {e.scores.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs text-slate-600">
                    {e.scores.map((s) => (
                      <li key={s.id}>
                        {s.metricLabel} ({s.metricCode}): {s.scoreValue}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Source SWOT analyses</h2>
        {report.sourceRecords.swotAnalyses.length === 0 ? (
          <p className="text-sm text-slate-500">No linked SWOT records.</p>
        ) : (
          <ul className="space-y-2">
            {report.sourceRecords.swotAnalyses.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <span>
                  {s.source} · {formatDate(s.createdAt)}
                </span>
                <Link href={`/swot/${s.id}`} className="underline">
                  View
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Source Eisenhower tasks</h2>
        {report.sourceRecords.eisenhowerTasks.length === 0 ? (
          <p className="text-sm text-slate-500">No linked Eisenhower tasks.</p>
        ) : (
          <ul className="space-y-2">
            {report.sourceRecords.eisenhowerTasks.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <span>
                  {t.title} · {t.category} · {t.status}
                </span>
                <Link href={`/eisenhower/${t.id}`} className="underline">
                  View
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
