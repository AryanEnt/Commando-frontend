"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type ActionItem, type ProfileListItem } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { formatDue } from "@/lib/dates";
import { TeamLeadListRedirectGate } from "@/lib/team-lead-list-redirect";
import { StatusBadge } from "@/components/StatusBadge";
import { SearchableSelect } from "@/components/SearchableSelect";
import { PaginationControls } from "@/components/PaginationControls";
import {
  Button,
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
  return (
    <TeamLeadListRedirectGate listPath="/action-items">
      <ActionItemsContent />
    </TeamLeadListRedirectGate>
  );
}

function ActionItemsContent() {
  const { token, user, hasPermission } = useAuth();
  const { pushToast } = useToast();
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
  const [completingId, setCompletingId] = useState<string | null>(null);
  const canCreate = hasPermission("ACTION_ITEM_CREATE");
  const canComplete =
    hasPermission("ACTION_ITEM_UPDATE") ||
    user?.roleCode === "SALES_EXECUTIVE";

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

  async function completeAction(id: string) {
    if (!token || !canComplete) return;
    setCompletingId(id);
    try {
      await api.completeActionItem(token, id);
      pushToast("Action completed", "success");
      const res = await api.getActionItems(token, {
        view,
        profileId: profileId || undefined,
        search: search || undefined,
        page,
        pageSize,
      });
      setItems(res.data.actionItems);
      setTotal(res.data.total);
    } catch (err) {
      pushToast(
        err instanceof Error ? err.message : "Could not complete action",
        "error",
      );
    } finally {
      setCompletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assignment"
        description="Profile-specific coaching assignments. Completed, expired, and replaced items stay in History."
        actions={
          canCreate ? (
            <Link
              href="/action-items/new"
              className="inline-flex items-center rounded-[var(--radius-sm)] bg-[var(--color-brand)] px-3 py-2 text-sm font-medium text-[var(--color-brand-on)] hover:bg-[var(--color-brand-hover)]"
            >
              New assignment
            </Link>
          ) : null
        }
      />

      <FilterBar>
        <SegmentedControl
          ariaLabel="Assignment view"
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
              ? "No active assignments"
              : "No history yet"
          }
          description={
            view === "active"
              ? "Create an assignment or switch to History."
              : "Completed and replaced items will appear here."
          }
          actionHref={canCreate ? "/action-items/new" : undefined}
          actionLabel={canCreate ? "New assignment" : undefined}
        />
      )}

      {!loading && items.length > 0 && (
        <Panel
          title={
            view === "active"
              ? `Active assignments · ${total}`
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
                      {formatDue(item.dueDate)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canComplete &&
                        view === "active" &&
                        item.status === "ACTIVE" ? (
                          <Button
                            variant="success"
                            size="sm"
                            disabled={completingId === item.id}
                            onClick={() => void completeAction(item.id)}
                          >
                            {completingId === item.id
                              ? "Completing…"
                              : "Complete"}
                          </Button>
                        ) : null}
                        <Link
                          href={`/action-items/${item.id}`}
                          className="text-slate-700 underline underline-offset-2 hover:text-slate-900"
                        >
                          View
                        </Link>
                      </div>
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
              noun="assignments"
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
