"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, type PerformanceEvaluation } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  DateTimeCell,
  ErrorState,
  LoadingState,
  ReadOnlyPanel,
} from "@/components/ui";

export default function PerformanceDetailPage() {
  const { token } = useAuth();
  const params = useParams();
  const id = String(params.id);
  const [item, setItem] = useState<PerformanceEvaluation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !id) return;
    void (async () => {
      try {
        const res = await api.getPerformanceEvaluation(token, id);
        setItem(res.data.evaluation);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      }
    })();
  }, [token, id]);

  if (error) {
    return (
      <div className="space-y-2">
        <Link href="/performance" className="text-sm text-slate-600 underline">
          ← Performance
        </Link>
        <ErrorState message={error} />
      </div>
    );
  }

  if (!item) {
    return <LoadingState label="Loading evaluation…" />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/performance" className="text-sm text-slate-600 underline">
          ← Performance
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          Evaluation detail
        </h1>
        <p className="text-sm text-slate-600">
          Source-traced historical evaluation — scores are preserved as recorded.
        </p>
      </div>

      <ReadOnlyPanel title="Performance evaluation">
        <dl className="space-y-3">
          <div>
            <dt className="text-xs uppercase text-slate-500">Sales Executive</dt>
            <dd className="font-medium">{item.profile.displayName}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Source</dt>
            <dd>{item.source}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Creator</dt>
            <dd>
              {item.createdBy.firstName} {item.createdBy.lastName} (
              {item.createdBy.role.code})
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Evaluated at</dt>
            <dd>
              <DateTimeCell value={item.evaluatedAt} />
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Rating / avg metric</dt>
            <dd>
              {item.rating != null ? item.rating.toFixed(2) : "—"} /{" "}
              {item.averageMetricScore != null
                ? item.averageMetricScore.toFixed(1)
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Verdict</dt>
            <dd>{item.verdict ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Summary</dt>
            <dd className="mt-1 whitespace-pre-wrap rounded bg-white/60 p-3">
              {item.summary ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="mb-2 text-xs uppercase text-slate-500">Scores</dt>
            <dd>
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-1 pr-3">Code</th>
                    <th className="py-1 pr-3">Label</th>
                    <th className="py-1">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {item.scores.map((s) => (
                    <tr key={s.id} className="border-t border-slate-100">
                      <td className="py-1.5 pr-3 font-mono text-xs">
                        {s.metricCode}
                      </td>
                      <td className="py-1.5 pr-3">{s.metricLabel}</td>
                      <td className="py-1.5">{s.scoreValue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </dd>
          </div>
        </dl>
      </ReadOnlyPanel>
    </div>
  );
}
