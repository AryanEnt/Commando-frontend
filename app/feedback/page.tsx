"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type FeedbackItem, type ProfileListItem } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { TeamLeadListRedirectGate } from "@/lib/team-lead-list-redirect";
import { StatusBadge } from "@/components/StatusBadge";
import { SearchableSelect } from "@/components/SearchableSelect";
import { PaginationControls } from "@/components/PaginationControls";
import {
  DateTimeCell,
  EmptyState,
  ErrorState,
  FilterBar,
  PageHeader,
  Panel,
  SelectField,
  TableSkeleton,
  TextInput,
} from "@/components/ui";

export default function FeedbackPage() {
  return (
    <TeamLeadListRedirectGate listPath="/feedback">
      <FeedbackContent />
    </TeamLeadListRedirectGate>
  );
}

function FeedbackContent() {
  const { token, hasPermission } = useAuth();
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [profiles, setProfiles] = useState<ProfileListItem[]>([]);
  const [profileId, setProfileId] = useState("");
  const [source, setSource] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canCreate = hasPermission("FEEDBACK_CREATE");

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
        const res = await api.getFeedback(token, {
          profileId: profileId || undefined,
          source: (source as "TEAM_LEAD" | "COMMANDO") || undefined,
          search: search || undefined,
          page,
          pageSize,
        });
        if (!cancelled) {
          setItems(res.data.feedback);
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
        title="Feedback"
        description="Coaching feedback for this Sales Executive. Notes append over time and are never overwritten."
        actions={
          canCreate ? (
            <Link
              href="/feedback/new"
              className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              New feedback
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
            placeholder="Feedback content…"
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
          title="No feedback yet"
          description="Feedback records appear here as coaching notes are added."
          actionHref={canCreate ? "/feedback/new" : undefined}
          actionLabel={canCreate ? "New feedback" : undefined}
        />
      )}

      {!loading && items.length > 0 && (
        <Panel
          title={`Feedback history · ${total}`}
          tone="history"
          description="Append-only records — content is never overwritten."
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Sales Executive</th>
                  <th className="px-3 py-2">Source</th>
                  <th className="px-3 py-2">Creator</th>
                  <th className="px-3 py-2">Preview</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <DateTimeCell value={item.createdAt} />
                    </td>
                    <td className="px-3 py-2">{item.profile.displayName}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={item.source} />
                    </td>
                    <td className="px-3 py-2">
                      {item.createdBy.firstName} {item.createdBy.lastName}
                    </td>
                    <td className="max-w-xs truncate px-3 py-2 text-slate-600">
                      {item.body}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/feedback/${item.id}`}
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
              noun="feedback"
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
