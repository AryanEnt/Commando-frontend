"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, type SwotItem, type Team } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { StatusBadge } from "@/components/StatusBadge";
import { ProfileSearchSelect } from "@/components/ProfileSearchSelect";
import { SearchableSelect } from "@/components/SearchableSelect";
import {
  swotSourceLabel,
  swotSubjectName,
  swotSubjectRoleLabel,
} from "@/lib/swot-display";
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

const SOURCES = [
  "",
  "TEAM_LEAD",
  "COMMANDO",
  "SALES_EXECUTIVE",
  "SALES_SUPPORT_EXECUTIVE",
] as const;

export default function SwotListPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading SWOT…" />}>
      <SwotListContent />
    </Suspense>
  );
}

function SwotListContent() {
  const { token, hasPermission, user } = useAuth();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<SwotItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [source, setSource] = useState(searchParams.get("source") ?? "");
  const [teamId, setTeamId] = useState(searchParams.get("teamId") ?? "");
  const [profileId, setProfileId] = useState(searchParams.get("profileId") ?? "");
  const [commandoUserId, setCommandoUserId] = useState(
    searchParams.get("commandoUserId") ?? "",
  );
  const [teams, setTeams] = useState<Team[]>([]);
  const [commandos, setCommandos] = useState<
    { id: string; firstName: string; lastName: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 10;
  const isAdmin = user?.roleCode === "SUPER_ADMIN";
  const isSse = user?.roleCode === "SALES_SUPPORT_EXECUTIVE";
  const canCreate =
    hasPermission("SWOT_CREATE") && user?.roleCode !== "SUPER_ADMIN";
  const createHref = isSse ? "/swot/new" : "/swot/new";
  const createLabel = isSse ? "Add my SWOT" : "New SWOT";

  useEffect(() => {
    if (!token || !isAdmin) return;
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
  }, [token, isAdmin]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!token) return;
      setLoading(true);
      try {
        const res = await api.getSwotList(token, {
          search: search || undefined,
          source: source || undefined,
          teamId: teamId || undefined,
          profileId: profileId || undefined,
          commandoUserId: commandoUserId || undefined,
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
  }, [token, search, source, teamId, profileId, commandoUserId, page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <PageHeader
        title="SWOT Analysis"
        description={
          isSse
            ? "Your Self, Team Lead, and Commando SWOT streams — kept separate by source."
            : isAdmin
              ? "Read-only Super Admin reporting. Filter by team, Commando, Sales Executive, and SWOT source."
              : "Source-aware historical SWOT records. New entries never overwrite prior ones."
        }
        actions={
          canCreate ? (
            <Link
              href={createHref}
              className="inline-flex items-center rounded-[var(--radius-sm)] bg-[var(--color-brand)] px-3 py-2 text-sm font-medium text-[var(--color-brand-on)] hover:bg-[var(--color-brand-hover)]"
            >
              {createLabel}
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
            placeholder="SWOT content…"
          />
        </div>
        <SelectField
          label="Source"
          value={source}
          onChange={(e) => {
            setPage(1);
            setSource(e.target.value);
          }}
        >
          <option value="">All sources</option>
          {SOURCES.filter((s): s is Exclude<(typeof SOURCES)[number], ""> =>
            Boolean(s),
          ).map((s) => (
            <option key={s} value={s}>
              {swotSourceLabel(s)}
              {s === "SALES_EXECUTIVE" || s === "SALES_SUPPORT_EXECUTIVE"
                ? ` (${s === "SALES_SUPPORT_EXECUTIVE" ? "SSE" : "SE"})`
                : ""}
            </option>
          ))}
        </SelectField>
        {isAdmin && (
          <>
            <SearchableSelect
              label="Team"
              value={teamId}
              onChange={(id) => {
                setPage(1);
                setTeamId(id);
              }}
              placeholder="All teams"
              options={teams.map((t) => ({
                value: t.id,
                label: t.name,
              }))}
            />
            <SearchableSelect
              label="Commando"
              value={commandoUserId}
              onChange={(id) => {
                setPage(1);
                setCommandoUserId(id);
              }}
              placeholder="All Commandos"
              options={commandos.map((c) => ({
                value: c.id,
                label: `${c.firstName} ${c.lastName}`,
              }))}
            />
            <div className="min-w-[14rem] flex-1">
              <ProfileSearchSelect
                value={profileId}
                onChange={(id) => {
                  setPage(1);
                  setProfileId(id);
                }}
                label="Sales Executive"
              />
            </div>
          </>
        )}
      </FilterBar>

      {error && <ErrorState message={error} />}
      {loading && <TableSkeleton />}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          title="No SWOT records visible"
          description="Try adjusting filters or create a new SWOT entry."
          actionHref={canCreate ? createHref : undefined}
          actionLabel={canCreate ? createLabel : undefined}
        />
      )}

      {!loading && items.length > 0 && (
        <Panel title={`SWOT history · ${total}`} tone="history">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Subject</th>
                  <th className="px-3 py-2">Team</th>
                  <th className="px-3 py-2">Source</th>
                  <th className="px-3 py-2">Creator</th>
                  <th className="px-3 py-2">Created</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <p className="font-medium">{swotSubjectName(item)}</p>
                      <p className="text-xs text-slate-500">
                        {swotSubjectRoleLabel(item)}
                      </p>
                    </td>
                    <td className="px-3 py-2">{item.team?.name ?? "—"}</td>
                    <td className="px-3 py-2">
                      <StatusBadge
                        status={item.source}
                        label={swotSourceLabel(item.source)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      {item.createdBy.firstName} {item.createdBy.lastName}
                    </td>
                    <td className="px-3 py-2">
                      <DateTimeCell value={item.createdAt} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/swot/${item.id}`}
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
