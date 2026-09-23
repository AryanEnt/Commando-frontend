"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type WeeklyReview } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/dates";
import { weeklyReviewSubjectName } from "@/lib/weekly-review-display";
import { TeamLeadListRedirectGate } from "@/lib/team-lead-list-redirect";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Button,
  EmptyState,
  ErrorState,
  FilterBar,
  PageHeader,
  Panel,
  SelectField,
  TableSkeleton,
  TextInput,
} from "@/components/ui";

export default function WeeklyReviewsPage() {
  return (
    <TeamLeadListRedirectGate listPath="/weekly-reviews">
      <WeeklyReviewsContent />
    </TeamLeadListRedirectGate>
  );
}

function WeeklyReviewsContent() {
  const { token, user, hasPermission } = useAuth();
  const [reviews, setReviews] = useState<WeeklyReview[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 10;

  const role = user?.roleCode;
  const isSalesExec = role === "SALES_EXECUTIVE";
  const isSuperAdmin = role === "SUPER_ADMIN";
  const canCreate =
    hasPermission("WEEKLY_REVIEW_CREATE") && !isSuperAdmin;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!token) return;
      setLoading(true);
      try {
        const res = await api.getWeeklyReviews(token, {
          search: search || undefined,
          status: (status as "DRAFT" | "SUBMITTED") || undefined,
          page,
          pageSize,
        });
        if (!cancelled) {
          setReviews(res.data.reviews);
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
  }, [token, search, status, page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function personName(
    p: { firstName: string; lastName: string } | null | undefined,
  ) {
    if (!p) return "—";
    return `${p.firstName} ${p.lastName}`;
  }

  const description = isSalesExec
    ? "Weekly reviews sent to you — open one to sign."
    : isSuperAdmin
      ? "View weekly coaching reviews across the organization (read-only)."
      : "Create a weekly review to send it to the Sales Executive for signature.";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Weekly Review Meetings"
        description={description}
        actions={
          canCreate ? (
            <Link
              href="/weekly-reviews/new"
              className="inline-flex items-center rounded-[var(--radius-sm)] bg-[var(--color-brand)] px-3 py-2 text-sm font-medium text-[var(--color-brand-on)] hover:bg-[var(--color-brand-hover)]"
            >
              New review
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
            placeholder="Week label or notes…"
          />
        </div>
        {canCreate && (
          <SelectField
            label="Status"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
          >
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted</option>
          </SelectField>
        )}
      </FilterBar>

      {error && <ErrorState message={error} />}
      {loading && <TableSkeleton />}

      {!loading && !error && reviews.length === 0 && (
        <EmptyState
          title="No weekly reviews found"
          description="Create a draft review or adjust your filters."
          actionHref={canCreate ? "/weekly-reviews/new" : undefined}
          actionLabel={canCreate ? "New review" : undefined}
        />
      )}

      {!loading && reviews.length > 0 && (
        <Panel title={`Weekly reviews · ${total}`}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Week</th>
                  {isSalesExec ? (
                    <>
                      <th className="px-3 py-2">Commando</th>
                      <th className="px-3 py-2">Team Lead</th>
                      <th className="px-3 py-2">My Status</th>
                      <th className="px-3 py-2">Key Actions</th>
                      <th className="px-3 py-2">Signed</th>
                    </>
                  ) : (
                    <>
                      <th className="px-3 py-2">Profile</th>
                      <th className="px-3 py-2">Commando Name</th>
                      <th className="px-3 py-2">Meeting Date</th>
                      <th className="px-3 py-2">Status</th>
                    </>
                  )}
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => (
                  <tr key={review.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium">{review.weekLabel}</td>
                    {isSalesExec ? (
                      <>
                        <td className="px-3 py-2">
                          {personName(review.commando)}
                        </td>
                        <td className="px-3 py-2">
                          {personName(review.teamLead)}
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge status={review.myStatus ?? "—"} />
                        </td>
                        <td className="max-w-xs truncate px-3 py-2">
                          {review.nextWeekAction}
                        </td>
                        <td className="px-3 py-2">
                          {review.signed ? "Yes" : "No"}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2">{weeklyReviewSubjectName(review)}</td>
                        <td className="px-3 py-2">
                          {personName(review.commando)}
                        </td>
                        <td className="px-3 py-2 tabular-nums text-slate-700">
                          {formatDate(review.meetingDate)}
                          {review.meetingTime ? (
                            <span className="block text-xs text-slate-500">
                              {review.meetingTime}
                              {review.roomName ? ` · ${review.roomName}` : ""}
                            </span>
                          ) : review.roomName ? (
                            <span className="block text-xs text-slate-500">
                              {review.roomName}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge status={review.status} />
                        </td>
                      </>
                    )}
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/weekly-reviews/${review.id}`}
                        className="text-slate-700 underline underline-offset-2 hover:text-slate-900"
                      >
                        {review.isEditable && canCreate ? "Edit" : "View"}
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
