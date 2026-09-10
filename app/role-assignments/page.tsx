"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, type RoleAssignment } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Button,
  DateTimeCell,
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

export default function RoleAssignmentsPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading role assignments…" />}>
      <RoleAssignmentsContent />
    </Suspense>
  );
}

function RoleAssignmentsContent() {
  const { token, hasPermission } = useAuth();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<RoleAssignment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<
    "" | "ACTIVE" | "SUPERSEDED" | "ARCHIVED"
  >("");
  const [includeHistory, setIncludeHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 10;
  const canCreate = hasPermission("ROLE_ASSIGNMENT_CREATE");

  useEffect(() => {
    const raw = searchParams.get("status");
    if (raw === "ACTIVE" || raw === "SUPERSEDED" || raw === "ARCHIVED") {
      setStatus(raw);
      setPage(1);
    } else if (!raw) {
      setStatus("");
    }
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!token) return;
      setLoading(true);
      try {
        const res = await api.getRoleAssignments(token, {
          search: search || undefined,
          status: status || undefined,
          includeHistory: includeHistory || Boolean(status && status !== "ACTIVE"),
          page,
          pageSize,
        });
        if (!cancelled) {
          setItems(res.data.roleAssignments);
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
  }, [token, search, includeHistory, page, status]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function personName(p: { firstName: string; lastName: string } | null) {
    if (!p) return "—";
    return `${p.firstName} ${p.lastName}`;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Role Assignments"
        description="Instructions and boundaries for Sales Support Executives synced to specific Sales Executives."
        actions={
          canCreate ? (
            <Link
              href="/role-assignments/new"
              className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              New assignment
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
            placeholder="Search assignments…"
          />
        </div>
        <SelectField
          label="Status"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value as typeof status);
          }}
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="SUPERSEDED">SUPERSEDED</option>
          <option value="ARCHIVED">ARCHIVED</option>
        </SelectField>
        <label className="flex items-center gap-2 pb-1 text-sm text-slate-700">
          <input
            type="checkbox"
            className="rounded border-slate-300"
            checked={includeHistory}
            onChange={(e) => {
              setPage(1);
              setIncludeHistory(e.target.checked);
            }}
          />
          Include history
        </label>
      </FilterBar>

      {error && <ErrorState message={error} />}
      {loading && <TableSkeleton />}
      {!loading && !error && items.length === 0 && (
        <EmptyState
          title="No role assignments"
          description="Active instructions for Sales Support will appear here."
        />
      )}

      {!loading && items.length > 0 && (
        <>
          <Panel title={`Role assignments · ${total}`}>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Sales Executive</th>
                    <th className="px-3 py-2">Team</th>
                    <th className="px-3 py-2">Support</th>
                    <th className="px-3 py-2">Commando</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Updated</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-medium">
                        {item.profile.displayName}
                      </td>
                      <td className="px-3 py-2">{item.team.name}</td>
                      <td className="px-3 py-2">
                        {personName(item.salesSupportUser)}
                      </td>
                      <td className="px-3 py-2">{personName(item.commando)}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-3 py-2">
                        <DateTimeCell value={item.updatedAt} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Link
                          href={`/role-assignments/${item.id}`}
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
        </>
      )}
    </div>
  );
}
