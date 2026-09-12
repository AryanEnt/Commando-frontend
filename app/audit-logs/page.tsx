"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, type AuditLogItem } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  formatActorMeta,
  formatActorName,
  humanizeCode,
} from "@/lib/admin-labels";
import { SearchableSelect } from "@/components/SearchableSelect";
import { PaginationControls } from "@/components/PaginationControls";
import {
  AdminPageShell,
  AdminToolbar,
} from "@/components/admin/AdminPageShell";
import { AdminTable, AdminTd, AdminTh } from "@/components/admin/AdminTable";
import {
  Button,
  DateTimeCell,
  EmptyState,
  ErrorState,
  TableSkeleton,
  TextInput,
} from "@/components/ui";

export default function AuditLogsPage() {
  const { token, user, hasPermission } = useAuth();
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [actions, setActions] = useState<string[]>([]);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const allowed =
    user?.roleCode === "SUPER_ADMIN" && hasPermission("AUDIT_VIEW");

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (action) n += 1;
    if (entityType) n += 1;
    if (from) n += 1;
    if (to) n += 1;
    return n;
  }, [action, entityType, from, to]);

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
          from: from ? new Date(from).toISOString() : undefined,
          to: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
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
          setError(err instanceof Error ? err.message : "Failed to load audit log");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, allowed, search, action, entityType, from, to, page, pageSize, reloadKey]);

  if (!allowed) {
    return (
      <ErrorState message="Only Super Admin may view the audit log." />
    );
  }

  function clearFilters() {
    setAction("");
    setEntityType("");
    setFrom("");
    setTo("");
    setPage(1);
  }

  return (
    <AdminPageShell
      breadcrumb={[{ label: "Audit Log" }]}
      title="Audit Log"
      description="Track important changes and administrative activity across the platform. Records are immutable."
      toolbar={
        <div className="space-y-3">
          <AdminToolbar>
            <div className="min-w-[14rem] flex-1">
              <TextInput
                label="Search"
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
                placeholder="Search actions, resources, or IDs…"
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="mb-0.5"
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen((v) => !v)}
            >
              Filters{activeFilterCount ? ` · ${activeFilterCount}` : ""}
            </Button>
            {(search || activeFilterCount > 0) && (
              <Button
                variant="ghost"
                size="sm"
                className="mb-0.5"
                onClick={() => {
                  setSearch("");
                  clearFilters();
                }}
              >
                Clear all
              </Button>
            )}
          </AdminToolbar>

          {filtersOpen ? (
            <div className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-3 sm:grid-cols-2 lg:grid-cols-4">
              <SearchableSelect
                label="Action"
                value={action}
                onChange={(id) => {
                  setPage(1);
                  setAction(id);
                }}
                placeholder="All actions"
                options={actions.map((a) => ({
                  value: a,
                  label: humanizeCode(a),
                }))}
              />
              <SearchableSelect
                label="Resource"
                value={entityType}
                onChange={(id) => {
                  setPage(1);
                  setEntityType(id);
                }}
                placeholder="All resources"
                options={entityTypes.map((t) => ({
                  value: t,
                  label: humanizeCode(t),
                }))}
              />
              <TextInput
                label="From"
                type="date"
                value={from}
                onChange={(e) => {
                  setPage(1);
                  setFrom(e.target.value);
                }}
              />
              <TextInput
                label="To"
                type="date"
                value={to}
                onChange={(e) => {
                  setPage(1);
                  setTo(e.target.value);
                }}
              />
            </div>
          ) : null}
        </div>
      }
    >
      {error && (
        <ErrorState
          message={error}
          onRetry={() => setReloadKey((k) => k + 1)}
        />
      )}

      {!loading && !error && (
        <p className="text-sm text-[var(--color-ink-muted)]">
          {total} event{total === 1 ? "" : "s"}
          {activeFilterCount || search ? " matching filters" : ""}
        </p>
      )}

      {loading && <TableSkeleton rows={8} />}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          title="No audit events"
          description="Mutating actions across the platform appear here as an immutable history."
        />
      )}

      {!loading && items.length > 0 && (
        <>
          <AdminTable>
            <thead>
              <tr>
                <AdminTh>Timestamp</AdminTh>
                <AdminTh>User</AdminTh>
                <AdminTh>Action</AdminTh>
                <AdminTh>Resource</AdminTh>
                <AdminTh>Record</AdminTh>
                <AdminTh className="text-right"> </AdminTh>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="group">
                  <AdminTd className="whitespace-nowrap text-[var(--color-ink-muted)]">
                    <DateTimeCell value={item.createdAt} />
                  </AdminTd>
                  <AdminTd>
                    <div className="font-medium">
                      {formatActorName(item.actor)}
                    </div>
                    {item.actor ? (
                      <div className="text-xs text-[var(--color-ink-muted)]">
                        {formatActorMeta(item.actor)}
                      </div>
                    ) : null}
                  </AdminTd>
                  <AdminTd>{humanizeCode(item.action)}</AdminTd>
                  <AdminTd>{humanizeCode(item.entityType)}</AdminTd>
                  <AdminTd className="max-w-[10rem] truncate font-mono text-xs text-[var(--color-ink-muted)]">
                    {item.entityId ?? "—"}
                  </AdminTd>
                  <AdminTd className="text-right">
                    <Link
                      href={`/audit-logs/${item.id}`}
                      className="text-sm font-medium text-[var(--color-brand)] hover:underline"
                    >
                      View
                    </Link>
                  </AdminTd>
                </tr>
              ))}
            </tbody>
          </AdminTable>

          <PaginationControls
            page={page}
            pageSize={pageSize}
            total={total}
            disabled={loading}
            noun="events"
            pageSizeOptions={[25, 50, 100]}
            onPageChange={setPage}
            onPageSizeChange={(n) => {
              setPage(1);
              setPageSize(n);
            }}
          />
        </>
      )}
    </AdminPageShell>
  );
}
