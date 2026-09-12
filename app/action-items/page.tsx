"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type ActionItem, type ProfileListItem } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/dates";
import { StatusBadge } from "@/components/StatusBadge";
import { SearchableSelect } from "@/components/SearchableSelect";
import { PaginationControls } from "@/components/PaginationControls";
import {
  EmptyState,
  ErrorState,
  FilterBar,
  PageHeader,
  Panel,
  SegmentedControl,
  TableSkeleton,
  TextInput,
} from "@/components/ui";

export default function ActionItemsPage() {
  const { token, hasPermission } = useAuth();
  const [view, setView] = useState<"active" | "history">("active");
  const [items, setItems] = useState<ActionItem[]>([]);
  const [profiles, setProfiles] = useState<ProfileListItem[]>([]);
  const [profileId, setProfileId] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canCreate = hasPermission("ACTION_ITEM_CREATE");

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
        const res = await api.getActionItems(token, {
          view,
          profileId: profileId || undefined,
          search: search || undefined,
          page,
          pageSize,
        });
        if (!cancelled) {
          setItems(res.data.actionItems);
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
  }, [token, view, profileId, search, page, pageSize]);

  function personName(p: { firstName: string; lastName: string } | null) {
    if (!p) return "—";
    return `${p.firstName} ${p.lastName}`;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Action Items"
        description="Profile-specific coaching actions. Completed, expired, and replaced items stay in History."
        actions={
          canCreate ? (
            <Link
              href="/action-items/new"
              className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              New action item
            </Link>
          ) : null
        }
      />

      <FilterBar>
        <SegmentedControl
          ariaLabel="Action items view"
          value={view}
          onChange={(v) => {
            setPage(1);
            setView(v);
          }}
          options={[
            { value: "active", label: "Active" },
            { value: "history", label: "History" },
          ]}
        />
        <div className="min-w-[12rem] flex-1">
          <TextInput
            label="Search"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Title or notes…"
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
          }))}
        />
      </FilterBar>

      {error && <ErrorState message={error} />}
      {loading && <TableSkeleton />}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          title={
            view === "active"
              ? "No active action items"
              : "No history yet"
          }
          description={
            view === "active"
              ? "Create an action item or switch to History."
              : "Completed and replaced items will appear here."
          }
          actionHref={canCreate ? "/action-items/new" : undefined}
          actionLabel={canCreate ? "New action item" : undefined}
        />
      )}

      {!loading && items.length > 0 && (
        <Panel
          title={
            view === "active"
              ? `Active action items · ${total}`
              : `History · ${total}`
          }
          tone={view === "active" ? "active" : "history"}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Profile</th>
                  <th className="px-3 py-2">Commando</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Due</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium text-slate-900">
                      {item.title}
                    </td>
                    <td className="px-3 py-2">{item.profile.displayName}</td>
                    <td className="px-3 py-2">{personName(item.commando)}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-3 py-2 tabular-nums text-slate-700">
                      {formatDate(item.dueDate)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/action-items/${item.id}`}
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
              noun="action items"
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
