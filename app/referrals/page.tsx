"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, type Referral } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/dates";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Button,
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

const STATUSES = [
  "",
  "SUBMITTED",
  "ACKNOWLEDGED",
  "IN_PROGRESS",
  "COMPLETED",
  "REJECTED",
] as const;

export default function ReferralsPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading referrals…" />}>
      <ReferralsContent />
    </Suspense>
  );
}

function ReferralsContent() {
  const { token, user } = useAuth();
  const searchParams = useSearchParams();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 10;

  useEffect(() => {
    const fromUrl = searchParams.get("status") ?? "";
    setStatus(fromUrl);
    setPage(1);
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!token) return;
      setLoading(true);
      try {
        const res = await api.getReferrals(token, {
          search: search || undefined,
          status: status || undefined,
          page,
          pageSize,
        });
        if (!cancelled) {
          setReferrals(res.data.referrals);
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
  const canRequestSe = user?.roleCode === "COMMANDO_EXECUTIVE";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Interventions"
        description="Commando requests Team Lead approval. Closing a handoff does not end an active assignment."
        actions={
          canRequestSe ? (
            <Link
              href="/referrals/request"
              className="rounded-[var(--radius-sm)] bg-[var(--color-brand)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-hover)]"
            >
              Request Sales Executive
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
            placeholder="Search referrals…"
          />
        </div>
        <SelectField
          label="Status"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          <option value="">All statuses</option>
          {STATUSES.filter(Boolean).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </SelectField>
      </FilterBar>

      {error && <ErrorState message={error} />}
      {loading && <TableSkeleton />}
      {!loading && !error && referrals.length === 0 && (
        <EmptyState
          title="No requests found"
          description={
            status
              ? `No requests with status ${status}.`
              : "Commando requests and handoffs will appear here."
          }
          actionHref={canRequestSe ? "/referrals/request" : undefined}
          actionLabel={canRequestSe ? "Request Sales Executive" : undefined}
        />
      )}

      {!loading && referrals.length > 0 && (
        <>
          <Panel title={`Referrals · ${total}`}>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Profile</th>
                    <th className="px-3 py-2">Commando</th>
                    <th className="px-3 py-2">Team Lead</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Submitted</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">
                        <div className="font-medium">{r.profileName}</div>
                        <div className="text-xs text-slate-500">{r.team.name}</div>
                      </td>
                      <td className="px-3 py-2">
                        {r.commando.firstName} {r.commando.lastName}
                      </td>
                      <td className="px-3 py-2">
                        {r.teamLead.firstName} {r.teamLead.lastName}
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {formatDate(r.createdAt)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Link
                          href={`/referrals/${r.id}`}
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
