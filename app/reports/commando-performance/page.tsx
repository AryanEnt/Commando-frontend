"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  api,
  type CommandoPerformanceReportRow,
  type Team,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ProfileSearchSelect } from "@/components/ProfileSearchSelect";
import { StarRating } from "@/components/StarRating";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";

export default function CommandoPerformanceReportPage() {
  const { token, user, hasPermission } = useAuth();
  const [rows, setRows] = useState<CommandoPerformanceReportRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [teamId, setTeamId] = useState("");
  const [profileId, setProfileId] = useState("");
  const [commandoUserId, setCommandoUserId] = useState("");
  const [status, setStatus] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [commandos, setCommandos] = useState<
    { id: string; firstName: string; lastName: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 20;

  const allowed =
    user?.roleCode === "SUPER_ADMIN" && hasPermission("REPORT_VIEW");

  useEffect(() => {
    if (!token || !allowed) return;
    void api.getTeams(token).then((res) => setTeams(res.data.teams));
    void api.getUsers(token).then((res) =>
      setCommandos(
        res.data.users
          .filter((u) => u.role.code === "COMMANDO_EXECUTIVE")
          .map((u) => ({
            id: u.id,
            firstName: u.firstName,
            lastName: u.lastName,
          })),
      ),
    );
  }, [token, allowed]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!token || !allowed) return;
      setLoading(true);
      try {
        const res = await api.getCommandoPerformanceReport(token, {
          search: search || undefined,
          teamId: teamId || undefined,
          profileId: profileId || undefined,
          commandoUserId: commandoUserId || undefined,
          status: (status as "ACTIVE" | "COMPLETED" | "EXITED") || undefined,
          page,
          pageSize,
        });
        if (!cancelled) {
          setRows(res.data.rows);
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
  }, [
    token,
    allowed,
    search,
    teamId,
    profileId,
    commandoUserId,
    status,
    page,
  ]);

  if (!allowed) {
    return (
      <ErrorState message="Only Super Admin can view the Commando Performance Report." />
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Commando Performance Report"
        description="Assignment-level report with values traced to performance evaluations, SWOT, and Eisenhower records. Avg. Score is only shown when metric score records exist."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <input
          className="rounded border border-slate-300 bg-white px-3 py-2 text-sm"
          placeholder="Search Commando, profile, team…"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
        />
        <select
          className="rounded border border-slate-300 bg-white px-3 py-2 text-sm"
          value={teamId}
          onChange={(e) => {
            setPage(1);
            setTeamId(e.target.value);
          }}
        >
          <option value="">All teams</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          className="rounded border border-slate-300 bg-white px-3 py-2 text-sm"
          value={commandoUserId}
          onChange={(e) => {
            setPage(1);
            setCommandoUserId(e.target.value);
          }}
        >
          <option value="">All Commandos</option>
          {commandos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.firstName} {c.lastName}
            </option>
          ))}
        </select>
        <ProfileSearchSelect
          value={profileId}
          onChange={(id) => {
            setPage(1);
            setProfileId(id);
          }}
          label="Sales Executive / Profile"
        />
        {profileId && (
          <button
            type="button"
            className="justify-self-start text-xs text-slate-600 underline"
            onClick={() => {
              setPage(1);
              setProfileId("");
            }}
          >
            Clear profile filter
          </button>
        )}
        <select
          className="rounded border border-slate-300 bg-white px-3 py-2 text-sm"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="EXITED">EXITED</option>
        </select>
      </div>

      {error && <ErrorState message={error} />}
      {loading && <LoadingState label="Loading report…" />}
      {!loading && !error && rows.length === 0 && (
        <EmptyState
          title="No assignments match"
          description="Adjust filters or create Commando assignments to populate this report."
        />
      )}

      {!loading && rows.length > 0 && (
        <>
          <div className="overflow-x-auto rounded border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Commando Name</th>
                  <th className="px-3 py-2">Profile</th>
                  <th className="px-3 py-2">Assigned</th>
                  <th className="px-3 py-2">Avg. Score</th>
                  <th className="px-3 py-2">TL Verdict</th>
                  <th className="px-3 py-2">SWOT</th>
                  <th className="px-3 py-2">Eisenhower</th>
                  <th className="px-3 py-2">Rating</th>
                  <th className="px-3 py-2">Star rating</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.assignmentId} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium">{row.commando.name}</td>
                    <td className="px-3 py-2">
                      <div>{row.profile.displayName}</div>
                      <div className="text-xs text-slate-500">{row.team.name}</div>
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={row.status} />
                      <div className="mt-1 text-xs text-slate-500">
                        {row.daysAssigned} days
                      </div>
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {row.avgScore != null ? (
                        <Link
                          href={`/performance/${row.avgScoreSource!.evaluationId}`}
                          className="underline"
                          title="From Commando performance scores"
                        >
                          {row.avgScore.toFixed(1)}
                        </Link>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="max-w-[10rem] truncate px-3 py-2">
                      {row.tlVerdict ? (
                        <Link
                          href={`/performance/${row.tlVerdictSource!.evaluationId}`}
                          className="underline"
                          title="From Team Lead evaluation"
                        >
                          {row.tlVerdict}
                        </Link>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {row.swot.count > 0 ? (
                        <Link
                          href={`/swot?profileId=${row.profile.id}`}
                          className="underline"
                          title={`TL ${row.swot.bySource.TEAM_LEAD} · C ${row.swot.bySource.COMMANDO} · SE ${row.swot.bySource.SALES_EXECUTIVE}`}
                        >
                          {row.swot.count}
                        </Link>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {row.eisenhower.count > 0 ? (
                        <Link
                          href={`/eisenhower?profileId=${row.profile.id}`}
                          className="underline"
                        >
                          {row.eisenhower.count}
                        </Link>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {row.rating != null ? (
                        <Link
                          href={`/performance/${row.ratingSource!.evaluationId}`}
                          className="underline"
                        >
                          {row.rating.toFixed(2)}
                        </Link>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <StarRating value={row.starRating} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/reports/commando-performance/${row.assignmentId}`}
                        className="text-slate-700 underline"
                      >
                        Detail
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">
              Page {page} of {totalPages} · {total} total
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                className="rounded border border-slate-300 bg-white px-3 py-1 disabled:opacity-40"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                className="rounded border border-slate-300 bg-white px-3 py-1 disabled:opacity-40"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
