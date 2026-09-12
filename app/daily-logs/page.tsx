"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type ActivityType, type DailyLog } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { SearchableSelect } from "@/components/SearchableSelect";
import { PaginationControls } from "@/components/PaginationControls";
import {
  EmptyState,
  ErrorState,
  FilterBar,
  PageHeader,
  TableSkeleton,
  TextInput,
} from "@/components/ui";

export default function DailyLogsPage() {
  const { token, user, hasPermission } = useAuth();
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [activityTypeId, setActivityTypeId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canCreate =
    hasPermission("DAILY_LOG_CREATE") && user?.roleCode !== "SUPER_ADMIN";

  useEffect(() => {
    if (!token) return;
    void api.getActivityTypes(token).then((res) => {
      setActivityTypes(res.data.activityTypes);
    });
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!token) return;
      setLoading(true);
      try {
        const res = await api.getDailyLogs(token, {
          search: search || undefined,
          activityTypeId: activityTypeId || undefined,
          page,
          pageSize,
        });
        if (!cancelled) {
          setLogs(res.data.logs);
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
  }, [token, search, activityTypeId, page, pageSize]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Coaching Logs"
        description="Recent and historical coaching sessions. Activity types come from configuration."
        actions={
          canCreate ? (
            <Link
              href="/daily-logs/new"
              className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              New log
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
            placeholder="Session title or notes…"
          />
        </div>
        <SearchableSelect
          label="Activity type"
          value={activityTypeId}
          onChange={(id) => {
            setPage(1);
            setActivityTypeId(id);
          }}
          placeholder="All activity types"
          options={activityTypes.map((t) => ({
            value: t.id,
            label: t.name,
          }))}
        />
      </FilterBar>

      {error && <ErrorState message={error} />}
      {loading && <TableSkeleton />}

      {!loading && !error && logs.length === 0 && (
        <EmptyState
          title="No daily logs found"
          description="Try adjusting filters or create a new coaching log."
          actionHref={canCreate ? "/daily-logs/new" : undefined}
          actionLabel={canCreate ? "New log" : undefined}
        />
      )}

      {!loading && logs.length > 0 && (
        <div className="space-y-6">
          {Object.entries(
            logs.reduce<Record<string, DailyLog[]>>((acc, log) => {
              const key = new Date(log.loggedAt).toISOString().slice(0, 10);
              (acc[key] ??= []).push(log);
              return acc;
            }, {}),
          ).map(([day, dayLogs]) => {
            const isToday = day === new Date().toISOString().slice(0, 10);
            return (
              <section key={day}>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">
                  {isToday ? "Today" : day} {isToday ? "· current work" : ""}
                </h2>
                <ol className="relative space-y-3 border-l border-[var(--color-line)] pl-4">
                  {dayLogs.map((log) => (
                    <li key={log.id} className="relative">
                      <span className="absolute -left-[1.15rem] mt-1.5 h-2 w-2 rounded-full bg-[var(--color-brand)]" />
                      <Link href={`/daily-logs/${log.id}`} className="surface block p-3">
                        <p className="text-sm font-medium">{log.sessionTitle}</p>
                        <p className="text-xs text-[var(--color-ink-muted)]">
                          {log.profile.displayName} · {log.activityType.name} ·{" "}
                          {log.createdBy.firstName} {log.createdBy.lastName}
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm text-[var(--color-ink-muted)]">
                          {log.observation}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ol>
              </section>
            );
          })}
          <PaginationControls
            page={page}
            pageSize={pageSize}
            total={total}
            disabled={loading}
            noun="logs"
            onPageChange={setPage}
            onPageSizeChange={(n) => {
              setPage(1);
              setPageSize(n);
            }}
          />
        </div>
      )}
    </div>
  );
}
