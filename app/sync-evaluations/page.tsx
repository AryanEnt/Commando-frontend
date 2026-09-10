"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type SyncEvaluation } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  Button,
  DateTimeCell,
  EmptyState,
  ErrorState,
  FilterBar,
  PageHeader,
  Panel,
  TableSkeleton,
  TextInput,
} from "@/components/ui";

export default function SyncEvaluationsPage() {
  const { token, hasPermission } = useAuth();
  const [evaluations, setEvaluations] = useState<SyncEvaluation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 10;
  const canCreate = hasPermission("SYNC_EVAL_CREATE");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!token) return;
      setLoading(true);
      try {
        const res = await api.getSyncEvaluations(token, {
          search: search || undefined,
          page,
          pageSize,
        });
        if (!cancelled) {
          setEvaluations(res.data.evaluations);
          setTotal(res.data.total);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, search, page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function personName(p: { firstName: string; lastName: string } | null) {
    if (!p) return "—";
    return `${p.firstName} ${p.lastName}`;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Support Sync"
        description="Historical evaluations of Sales Executive ↔ Sales Support sync."
        actions={
          canCreate ? (
            <Link
              href="/sync-evaluations/new"
              className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              New evaluation
            </Link>
          ) : null
        }
      />

      <FilterBar>
        <div className="min-w-[12rem] flex-1">
          <TextInput
            label="Search"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Issue or action…"
          />
        </div>
      </FilterBar>

      {error && <ErrorState message={error} />}
      {loading && <TableSkeleton />}

      {!loading && !error && evaluations.length === 0 && (
        <EmptyState
          title="No sync evaluations found"
          description="Evaluations appear here when sync issues are recorded."
          actionHref={canCreate ? "/sync-evaluations/new" : undefined}
          actionLabel={canCreate ? "New evaluation" : undefined}
        />
      )}

      {!loading && evaluations.length > 0 && (
        <Panel
          title={`Sync evaluations · ${total}`}
          tone="history"
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Recorded</th>
                  <th className="px-3 py-2">Sales Executive</th>
                  <th className="px-3 py-2">Sales Support</th>
                  <th className="px-3 py-2">Commando</th>
                  <th className="px-3 py-2">Issue</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {evaluations.map((evaluation) => (
                  <tr key={evaluation.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <DateTimeCell value={evaluation.createdAt} />
                    </td>
                    <td className="px-3 py-2 font-medium">
                      {evaluation.profile.displayName}
                    </td>
                    <td className="px-3 py-2">
                      {personName(evaluation.salesSupportUser)}
                    </td>
                    <td className="px-3 py-2">
                      {personName(evaluation.commando)}
                    </td>
                    <td className="max-w-xs truncate px-3 py-2">
                      {evaluation.issue}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/sync-evaluations/${evaluation.id}`}
                        className="text-slate-700 underline underline-offset-2 hover:text-slate-900"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">
            Page {page} of {totalPages} · {total} total
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
