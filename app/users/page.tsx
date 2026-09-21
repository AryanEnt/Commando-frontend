"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, type ManagedUser, type Team } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { roleLabel } from "@/lib/labels";
import { formatDate } from "@/lib/dates";
import { StatusBadge } from "@/components/StatusBadge";
import { PaginationControls } from "@/components/PaginationControls";
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  FilterBar,
  PageHeader,
  Panel,
  SelectField,
  TableSkeleton,
  TextInput,
} from "@/components/ui";

const ROLE_OPTIONS = [
  "",
  "SUPER_ADMIN",
  "TEAM_LEAD",
  "COMMANDO_EXECUTIVE",
  "SALES_EXECUTIVE",
  "SALES_SUPPORT_EXECUTIVE",
] as const;

export default function UsersPage() {
  const { token, hasPermission, user: me } = useAuth();
  const { pushToast } = useToast();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [search, setSearch] = useState("");
  const [roleCode, setRoleCode] = useState("");
  const [teamId, setTeamId] = useState("");
  const [isActive, setIsActive] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<ManagedUser | null>(null);
  const [busy, setBusy] = useState(false);

  const canCreate = hasPermission("USER_CREATE");
  const canCreateSe =
    hasPermission("SALES_EXECUTIVE_CREATE") ||
    me?.roleCode === "TEAM_LEAD" ||
    me?.roleCode === "SUPER_ADMIN";
  const canCreateSupport =
    hasPermission("SALES_SUPPORT_CREATE") || me?.roleCode === "TEAM_LEAD";
  const canStatus = hasPermission("USER_STATUS_UPDATE");

  const filtersKey = useMemo(
    () => [search, roleCode, teamId, isActive].join("|"),
    [search, roleCode, teamId, isActive],
  );

  async function load(nextPage = page, nextPageSize = pageSize) {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.getUsers(token, {
        search: search || undefined,
        roleCode: roleCode || undefined,
        teamId: teamId || undefined,
        isActive: isActive === "" ? undefined : isActive === "true",
        page: nextPage,
        pageSize: nextPageSize,
        sort: "createdAt",
        order: "desc",
      });
      setUsers(res.data.users);
      setTotal(res.data.total);
      setPage(res.data.page);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    void api.getTeams(token).then((res) => setTeams(res.data.teams));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const t = window.setTimeout(() => {
      void load(1);
    }, 200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, filtersKey]);

  async function confirmStatusChange() {
    if (!token || !statusTarget) return;
    setBusy(true);
    try {
      await api.updateUserStatus(token, statusTarget.id, !statusTarget.isActive);
      pushToast(
        statusTarget.isActive ? "User deactivated" : "User activated",
        "success",
      );
      setStatusTarget(null);
      await load(page);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Update failed", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="People"
        title="Users"
        description="Manage accounts, roles, teams, and Sales Executive profiles."
        actions={
          <div className="flex flex-wrap gap-2">
            {canCreateSe ? (
              <Link
                href="/users/sales-executives/new"
                className="btn btn-primary btn-sm"
              >
                Create Sales Executive
              </Link>
            ) : null}
            {canCreate || canCreateSupport ? (
              <Link
                href="/users/new"
                className="btn btn-secondary btn-sm"
              >
                {canCreate ? "Create User" : "Add Sales Support"}
              </Link>
            ) : null}
          </div>
        }
      />

      <FilterBar>
        <div className="min-w-[12rem] flex-1">
          <TextInput
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name or email…"
          />
        </div>
        <SelectField
          label="Role"
          value={roleCode}
          onChange={(e) => setRoleCode(e.target.value)}
        >
          <option value="">All roles</option>
          {ROLE_OPTIONS.filter(Boolean).map((code) => (
            <option key={code} value={code}>
              {roleLabel(code)}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Team"
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
        >
          <option value="">All teams</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Status"
          value={isActive}
          onChange={(e) => setIsActive(e.target.value)}
        >
          <option value="">All</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </SelectField>
      </FilterBar>

      {error && <ErrorState message={error} />}
      {loading && <TableSkeleton />}

      {!loading && users.length === 0 && !error && (
        <EmptyState
          title="No users yet"
          description="Create your first user account to get started."
          actionHref={canCreate ? "/users/new" : undefined}
          actionLabel={canCreate ? "Create User" : undefined}
        />
      )}

      {!loading && users.length > 0 && (
        <>
          <Panel title={`Users · ${total}`}>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Team</th>
                    <th>Profile</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className="font-medium text-[var(--color-ink)]">
                          {u.firstName} {u.lastName}
                        </div>
                        <div className="text-xs text-[var(--color-ink-muted)]">
                          {u.email}
                        </div>
                      </td>
                      <td>{roleLabel(u.role.code)}</td>
                      <td>{u.team?.name ?? "—"}</td>
                      <td>
                        {u.profileStatus === "created" ? (
                          <span className="text-sm text-[var(--status-success)]">
                            Profile ✓
                          </span>
                        ) : u.profileStatus === "missing" ? (
                          <span className="text-sm text-[var(--status-warn)]">
                            Not created
                          </span>
                        ) : (
                          <span className="text-[var(--color-ink-subtle)]">—</span>
                        )}
                      </td>
                      <td>
                        <StatusBadge
                          status={u.isActive ? "ACTIVE" : "INACTIVE"}
                        />
                      </td>
                      <td className="tabular-nums text-sm">
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="text-right">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <Link
                            href={`/users/${u.id}`}
                            className="btn btn-secondary btn-sm"
                          >
                            View
                          </Link>
                          {u.profileStatus === "created" && u.profile ? (
                            <Link
                              href={`/profiles/${u.profile.id}`}
                              className="btn btn-ghost btn-sm"
                            >
                              Profile
                            </Link>
                          ) : null}
                          {u.profileStatus === "missing" &&
                          hasPermission("PROFILE_MANAGE") ? (
                            <Link
                              href="/profiles"
                              className="btn btn-ghost btn-sm"
                            >
                              Create profile
                            </Link>
                          ) : null}
                          {canStatus && me?.id !== u.id ? (
                            <button
                              type="button"
                              className={
                                u.isActive
                                  ? "btn btn-danger btn-sm"
                                  : "btn btn-secondary btn-sm"
                              }
                              onClick={() => setStatusTarget(u)}
                            >
                              {u.isActive ? "Deactivate" : "Activate"}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <PaginationControls
            page={page}
            pageSize={pageSize}
            total={total}
            disabled={loading}
            noun="users"
            onPageChange={(p) => void load(p)}
            onPageSizeChange={(n) => {
              setPageSize(n);
              void load(1, n);
            }}
          />
        </>
      )}

      <ConfirmDialog
        open={Boolean(statusTarget)}
        title={statusTarget?.isActive ? "Deactivate user?" : "Activate user?"}
        message={
          statusTarget?.isActive
            ? `${statusTarget.firstName} ${statusTarget.lastName} will be unable to sign in. Historical records stay intact.`
            : `${statusTarget?.firstName ?? ""} ${statusTarget?.lastName ?? ""} will be able to sign in again.`
        }
        confirmLabel={statusTarget?.isActive ? "Deactivate" : "Activate"}
        danger={Boolean(statusTarget?.isActive)}
        busy={busy}
        onConfirm={() => void confirmStatusChange()}
        onCancel={() => setStatusTarget(null)}
      />
    </div>
  );
}
