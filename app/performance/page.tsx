"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  api,
  type PerformanceEvaluation,
  type ProfileListItem,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/dates";
import { TeamLeadListRedirectGate } from "@/lib/team-lead-list-redirect";
import { SearchableSelect } from "@/components/SearchableSelect";
import { PaginationControls } from "@/components/PaginationControls";
import {
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingState,
  PageHeader,
  Panel,
  SelectField,
  TableSkeleton,
  TextInput,
} from "@/components/ui";

export default function PerformancePage() {
  return (
    <TeamLeadListRedirectGate listPath="/performance">
      <Suspense fallback={<LoadingState label="Loading performance…" />}>
        <PerformanceContent />
      </Suspense>
    </TeamLeadListRedirectGate>
  );
}

function PerformanceContent() {
  const { token, hasPermission } = useAuth();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<PerformanceEvaluation[]>([]);
  const [profiles, setProfiles] = useState<ProfileListItem[]>([]);
  const [profileId, setProfileId] = useState("");
  const [source, setSource] = useState(searchParams.get("source") ?? "");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canCreate = hasPermission("PERFORMANCE_CREATE");

  useEffect(() => {
    setSource(searchParams.get("source") ?? "");
    setPage(1);
  }, [searchParams]);

  useEffect(() => {
    if (!token) return;
    void api.getProfiles(token).then((res) => setProfiles(res.data.profiles));
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!token) return;
      setLoading(true);
      try {
        const res = await api.getPerformanceEvaluations(token, {
          profileId: profileId || undefined,
          source: (source as "TEAM_LEAD" | "COMMANDO") || undefined,
          search: search || undefined,
          page,
          pageSize,
        });
        if (!cancelled) {
          setItems(res.data.evaluations);
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
  }, [token, profileId, source, search, page, pageSize]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Performance"
        description="Historical evaluations with metric scores and source attribution."
        actions={
          canCreate ? (
            <Link
              href="/performance/new"
              className="inline-flex items-center rounded-[var(--radius-sm)] bg-[var(--color-brand)] px-3 py-2 text-sm font-medium text-[var(--color-brand-on)] hover:bg-[var(--color-brand-hover)]"
            >
              New evaluation
            </Link>
          ) : undefined
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
            placeholder="Search evaluations…"
          />
        </div>
        <SearchableSelect
          label="Profile"
          value={profileId}
          onChange={(id) => {
            setPage(1);
            setProfileId(id);
          }}
          placeholder="All profiles"
          options={profiles.map((p) => ({
            value: p.id,
            label: p.displayName,
            hint: p.team.name,
          }))}
        />
        <SelectField
          label="Source"
          value={source}
          onChange={(e) => {
            setPage(1);
            setSource(e.target.value);
          }}
        >
          <option value="">All sources</option>
          <option value="TEAM_LEAD">Team Lead</option>
          <option value="COMMANDO">Commando</option>
        </SelectField>
      </FilterBar>

      {error && <ErrorState message={error} />}
      {loading && <TableSkeleton />}
      {!loading && !error && items.length === 0 && (
        <EmptyState
          title="No evaluations yet"
          description={
            source
              ? `No ${source} evaluations in scope.`
              : "Performance evaluations will appear here."
          }
        />
      )}

      {!loading && items.length > 0 && (
        <Panel title={`Evaluations · ${total} total`} tone="history">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Evaluated</th>
                  <th className="px-3 py-2">Sales Executive</th>
                  <th className="px-3 py-2">Source</th>
                  <th className="px-3 py-2">Rating</th>
                  <th className="px-3 py-2">Avg metric</th>
                  <th className="px-3 py-2">Verdict</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                      {formatDate(item.evaluatedAt)}
                    </td>
                    <td className="px-3 py-2">{item.profile.displayName}</td>
                    <td className="px-3 py-2">{item.source}</td>
                    <td className="px-3 py-2">
                      {item.rating != null ? item.rating.toFixed(2) : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {item.averageMetricScore != null
                        ? item.averageMetricScore.toFixed(1)
                        : "—"}
                    </td>
                    <td className="max-w-xs truncate px-3 py-2">
                      {item.verdict ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/performance/${item.id}`}
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
          <div className="mt-3 px-3 pb-3">
            <PaginationControls
              page={page}
              pageSize={pageSize}
              total={total}
              disabled={loading}
              noun="evaluations"
              onPageChange={setPage}
              onPageSizeChange={(n) => {
                setPage(1);
                setPageSize(n);
              }}
            />
          </div>
        </Panel>
      )}
    </div>
  );
}
