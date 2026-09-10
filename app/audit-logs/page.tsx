"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type AuditLogItem } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { SearchableSelect } from "@/components/SearchableSelect";
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

export default function AuditLogsPage() {
  const { token, user, hasPermission } = useAuth();
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [actions, setActions] = useState<string[]>([]);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 25;

  const allowed =
    user?.roleCode === "SUPER_ADMIN" && hasPermission("AUDIT_VIEW");

  useEffect(() => {
    if (!token || !allowed) return;
    void api.getAuditLogFacets(token).then((res) => {
      setActions(res.data.facets.actions);
      setEntityTypes(res.data.facets.entityTypes);
    });
  }, [token, allowed]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!token || !allowed) return;
      setLoading(true);
      try {
        const res = await api.getAuditLogs(token, {
          search: search || undefined,
          action: action || undefined,
          entityType: entityType || undefined,
          page,
          pageSize,
        });
        if (!cancelled) {
          setItems(res.data.items);
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
  }, [token, allowed, search, action, entityType, page]);

  if (!allowed) {
    return (
      <ErrorState message="Only Super Admin may view the audit trail." />
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Trail"
        description="Who did what, and when. Governance history for the organization."
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
            placeholder="Search action / entity…"
          />
        </div>
        <SearchableSelect
          label="Action"
          value={action}
          onChange={(id) => {
            setPage(1);
            setAction(id);
          }}
          placeholder="All actions"
          options={actions.map((a) => ({ value: a, label: a }))}
        />
        <SearchableSelect
          label="Entity type"
          value={entityType}
          onChange={(id) => {
            setPage(1);
            setEntityType(id);
          }}
          placeholder="All entities"
          options={entityTypes.map((t) => ({ value: t, label: t }))}
        />
      </FilterBar>

      {error && <ErrorState message={error} />}
      {loading && <TableSkeleton rows={8} />}
      {!loading && !error && items.length === 0 && (
        <EmptyState
          title="No audit events"
          description="Mutating actions across the platform will appear here."
        />
      )}

      {!loading && items.length > 0 && (
        <>
          <Panel title={`Audit events · ${total}`} tone="history">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">When</th>
                    <th className="px-3 py-2">Actor</th>
                    <th className="px-3 py-2">Action</th>
                    <th className="px-3 py-2">Entity</th>
                    <th className="px-3 py-2">Entity ID</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="whitespace-nowrap px-3 py-2">
                        <DateTimeCell value={item.createdAt} />
                      </td>
                      <td className="px-3 py-2">
                        {item.actor
                          ? `${item.actor.firstName} ${item.actor.lastName}`
                          : "—"}
                        {item.actor && (
                          <div className="text-xs text-slate-500">
                            {item.actor.roleCode}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm">
                        {item.action.replaceAll("_", " ").toLowerCase()}
                      </td>
                      <td className="px-3 py-2">{item.entityType.replaceAll("_", " ")}</td>
                      <td className="max-w-[8rem] truncate px-3 py-2 font-mono text-xs">
                        {item.entityId ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Link
                          href={`/audit-logs/${item.id}`}
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
