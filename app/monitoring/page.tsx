"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  api,
  type MonitoringCategory,
  type MonitoringRecord,
  type ProfileListItem,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { SearchableSelect } from "@/components/SearchableSelect";
import {
  Button,
  DateTimeCell,
  EmptyState,
  ErrorState,
  Field,
  FilterBar,
  PageHeader,
  Panel,
  TableSkeleton,
  TextInput,
} from "@/components/ui";

export default function MonitoringPage() {
  const { token, hasPermission } = useAuth();
  const [records, setRecords] = useState<MonitoringRecord[]>([]);
  const [categories, setCategories] = useState<MonitoringCategory[]>([]);
  const [profiles, setProfiles] = useState<ProfileListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [profileId, setProfileId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 10;
  const canCreate = hasPermission("MONITORING_CREATE");

  useEffect(() => {
    if (!token) return;
    void api.getMonitoringCategories(token).then((res) => {
      setCategories(res.data.categories);
    });
    if (canCreate || hasPermission("PROFILE_VIEW")) {
      void api.getProfiles(token).then((res) => {
        setProfiles(res.data.profiles);
      });
    }
  }, [token, canCreate, hasPermission]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!token) return;
      setLoading(true);
      try {
        const res = await api.getMonitoringRecords(token, {
          search: search || undefined,
          profileId: profileId || undefined,
          categoryId: categoryId || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo ? `${dateTo}T23:59:59.000Z` : undefined,
          page,
          pageSize,
        });
        if (!cancelled) {
          setRecords(res.data.records);
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
  }, [token, search, profileId, categoryId, dateFrom, dateTo, page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Monitoring"
        description="Historical Commando monitoring sessions. Each save is a new record."
        actions={
          canCreate ? (
            <Link
              href="/monitoring/new"
              className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              New session
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
            placeholder="Observation text…"
          />
        </div>
        <SearchableSelect
          label="Category"
          value={categoryId}
          onChange={(id) => {
            setPage(1);
            setCategoryId(id);
          }}
          placeholder="All categories"
          options={categories.map((c) => ({
            value: c.id,
            label: c.name,
          }))}
        />
        {profiles.length > 0 && (
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
            }))}
          />
        )}
        <Field label="From date">
          <input
            type="date"
            className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
            value={dateFrom}
            onChange={(e) => {
              setPage(1);
              setDateFrom(e.target.value);
            }}
          />
        </Field>
        <Field label="To date">
          <input
            type="date"
            className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
            value={dateTo}
            onChange={(e) => {
              setPage(1);
              setDateTo(e.target.value);
            }}
          />
        </Field>
      </FilterBar>

      {error && <ErrorState message={error} />}
      {loading && <TableSkeleton />}

      {!loading && !error && records.length === 0 && (
        <EmptyState
          title="No monitoring records found"
          description="Try adjusting filters or record a new session."
          actionHref={canCreate ? "/monitoring/new" : undefined}
          actionLabel={canCreate ? "New session" : undefined}
        />
      )}

      {!loading && records.length > 0 && (
        <Panel
          title={`Monitoring history · ${total}`}
          tone="history"
          description="Each session is an immutable historical record."
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Observed</th>
                  <th className="px-3 py-2">Profile</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Creator</th>
                  <th className="px-3 py-2">Observation</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <DateTimeCell value={record.observedAt} />
                    </td>
                    <td className="px-3 py-2 font-medium">
                      {record.profile.displayName}
                    </td>
                    <td className="px-3 py-2">{record.category.name}</td>
                    <td className="px-3 py-2">
                      {record.createdBy.firstName} {record.createdBy.lastName}
                    </td>
                    <td className="max-w-xs truncate px-3 py-2">
                      {record.observation ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/monitoring/${record.id}`}
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
