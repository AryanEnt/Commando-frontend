"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type DailyLog } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { PaginationControls } from "@/components/PaginationControls";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/dates";
import {
  EmptyState,
  ErrorState,
  FilterBar,
  PageHeader,
  SegmentedControl,
  TableSkeleton,
  TextInput,
} from "@/components/ui";

export default function DailyLogsPage() {
  const { token, user, hasPermission } = useAuth();
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "DRAFT" | "SUBMITTED">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canCreate =
    hasPermission("DAILY_LOG_CREATE") && user?.roleCode !== "SUPER_ADMIN";

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!token) return;
      setLoading(true);
      try {
        const res = await api.getDailyLogs(token, {
          search: search || undefined,
          status: status === "all" ? undefined : status,
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
  }, [token, search, status, page, pageSize]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Logs"
        description="One log per Sales Executive per day. Add activities throughout the day, then prioritize on submit."
        actions={
          canCreate ? (
            <Link
              href="/daily-logs/new"
              className="inline-flex items-center rounded-[var(--radius-sm)] bg-[var(--color-brand)] px-3 py-2 text-sm font-medium text-[var(--color-brand-on)] hover:bg-[var(--color-brand-hover)]"
            >
              Continue today&apos;s log
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
            placeholder="Profile or activity…"
          />
        </div>
        <SegmentedControl
          ariaLabel="Status filter"
          value={status}
          onChange={(v) => {
            setPage(1);
            setStatus(v as "all" | "DRAFT" | "SUBMITTED");
          }}
          options={[
            { value: "all", label: "All" },
            { value: "DRAFT", label: "Draft" },
            { value: "SUBMITTED", label: "Submitted" },
          ]}
        />
      </FilterBar>

      {error && <ErrorState message={error} />}
      {loading && <TableSkeleton />}

      {!loading && !error && logs.length === 0 && (
        <EmptyState
          title="No daily logs found"
          description="Try adjusting filters or open today's log."
          actionHref={canCreate ? "/daily-logs/new" : undefined}
          actionLabel={canCreate ? "Continue today's log" : undefined}
        />
      )}

      {!loading && logs.length > 0 && (
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--color-surface-2)]/50 text-xs uppercase text-[var(--color-ink-subtle)]">
              <tr>
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5">Sales Executive</th>
                <th className="px-4 py-2.5">Activities</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-[var(--color-line)]">
                  <td className="px-4 py-3 tabular-nums">
                    {formatDate(log.logDate)}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {log.profile?.displayName ??
                      (log.executiveUser
                        ? `${log.executiveUser.firstName} ${log.executiveUser.lastName}`
                        : "—")}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{log.entryCount}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={log.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/profiles/${log.salesExecutiveProfileId}/daily-logs/${log.id}`}
                      className="font-medium text-[var(--color-brand)] hover:underline"
                    >
                      {log.status === "DRAFT" ? "Continue" : "View"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-[var(--color-line)] px-4 py-3">
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
        </div>
      )}
    </div>
  );
}
