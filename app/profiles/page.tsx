"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { api, type ProfileListItem, type Team } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { StatusBadge } from "@/components/StatusBadge";
import { SearchableSelect } from "@/components/SearchableSelect";
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

export default function ProfilesPage() {
  const { token, user, hasPermission } = useAuth();
  const { pushToast } = useToast();
  const [profiles, setProfiles] = useState<ProfileListItem[]>([]);
  const [search, setSearch] = useState("");
  const [includeHistory, setIncludeHistory] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<
    { id: string; email: string; firstName: string; lastName: string; role: { code: string } }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    userId: "",
    teamId: "",
    displayName: "",
    employeeCode: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isSuperAdmin = user?.roleCode === "SUPER_ADMIN";
  /** Super Admin onboards via Users wizard — not the operational create-profile form. */
  const canCreateProfile =
    hasPermission("PROFILE_MANAGE") && !isSuperAdmin;

  const availableUsers = users.filter(
    (u) =>
      u.role.code === "SALES_EXECUTIVE" &&
      !profiles.some((p) => p.user.id === u.id),
  );

  async function load(q?: string) {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.getProfiles(token, {
        search: q || undefined,
        includeHistory: user?.roleCode === "COMMANDO_EXECUTIVE" ? includeHistory : undefined,
      });
      setProfiles(res.data.profiles);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    const t = window.setTimeout(() => {
      void load(search);
    }, 200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, search, includeHistory]);

  useEffect(() => {
    if (!token || !canCreateProfile) return;
    Promise.all([api.getTeams(token), api.getUsers(token)]).then(
      ([teamsRes, usersRes]) => {
        setTeams(teamsRes.data.teams);
        setUsers(usersRes.data.users);
      },
    );
  }, [token, canCreateProfile]);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.userId) next.userId = "Select a Sales Executive user";
    if (!form.teamId) next.teamId = "Select a team";
    if (!form.displayName.trim()) next.displayName = "Display name is required";
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!token || !validate()) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.createProfile(token, {
        userId: form.userId,
        teamId: form.teamId,
        displayName: form.displayName.trim(),
        employeeCode: form.employeeCode.trim() || undefined,
      });
      pushToast("Profile created", "success");
      setForm({ userId: "", teamId: "", displayName: "", employeeCode: "" });
      setFieldErrors({});
      await load(search);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message === "Request validation failed"
            ? "Check the required fields and try again."
            : err.message
          : "Failed to create profile";
      setError(msg);
      pushToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Executives"
        description={
          isSuperAdmin
            ? "Supervise profiles, current Team Lead / Commando, and intervention history. Onboard new Sales Executives from Users."
            : "Open a Sales Executive to coach, review, and act from one workspace."
        }
        actions={
          isSuperAdmin && hasPermission("SALES_EXECUTIVE_CREATE") ? (
            <Link
              href="/users/sales-executives/new"
              className="text-sm font-medium text-[var(--color-brand)] hover:underline"
            >
              Onboard Sales Executive
            </Link>
          ) : undefined
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
        {user?.roleCode === "COMMANDO_EXECUTIVE" && (
          <label className="flex items-end gap-2 pb-2 text-sm text-[var(--color-ink-muted)]">
            <input
              type="checkbox"
              checked={includeHistory}
              onChange={(e) => setIncludeHistory(e.target.checked)}
            />
            Include completed
          </label>
        )}
      </FilterBar>

      {error && <ErrorState message={error} />}
      {loading && <TableSkeleton />}

      {canCreateProfile && (
        <form
          onSubmit={onCreate}
          className="grid max-w-xl gap-3 border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
        >
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">
            Create profile
          </h2>
          <p className="text-xs text-[var(--color-ink-muted)]">
            Only Sales Executive users without an existing profile can be linked.
          </p>
          <SearchableSelect
            label="Sales executive user"
            value={form.userId}
            onChange={(id) => {
              const selected = availableUsers.find((u) => u.id === id);
              setForm({
                ...form,
                userId: id,
                displayName: selected
                  ? `${selected.firstName} ${selected.lastName}`.trim()
                  : form.displayName,
              });
              setFieldErrors((prev) => ({ ...prev, userId: "" }));
            }}
            placeholder="Select user…"
            allowClear={false}
            options={availableUsers.map((u) => ({
              value: u.id,
              label: `${u.firstName} ${u.lastName}`,
              hint: u.email,
            }))}
          />
          {fieldErrors.userId && (
            <p className="text-xs text-[var(--status-danger)]">{fieldErrors.userId}</p>
          )}
          {availableUsers.length === 0 && (
            <div className="space-y-2 rounded-[var(--radius-sm)] border border-dashed border-[var(--color-line)] bg-[var(--color-surface-2)] p-3">
              <p className="text-sm font-medium text-[var(--color-ink)]">
                No Sales Executive accounts are available for a new profile.
              </p>
              <p className="text-xs text-[var(--color-ink-muted)]">
                Create a Sales Executive account first, or use an existing account
                that does not already have a profile.
              </p>
              {hasPermission("SALES_EXECUTIVE_CREATE") ? (
                <Link
                  href="/users/sales-executives/new"
                  className="inline-flex text-sm font-medium text-[var(--color-brand)] hover:underline"
                >
                  Create Sales Executive
                </Link>
              ) : (
                <Link
                  href="/users"
                  className="inline-flex text-sm font-medium text-[var(--color-brand)] hover:underline"
                >
                  Open Users
                </Link>
              )}
            </div>
          )}
          <SelectField
            label="Team"
            required
            value={form.teamId}
            onChange={(e) => {
              setForm({ ...form, teamId: e.target.value });
              setFieldErrors((prev) => ({ ...prev, teamId: "" }));
            }}
            error={fieldErrors.teamId}
          >
            <option value="">Select team…</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </SelectField>
          <TextInput
            label="Display name"
            required
            value={form.displayName}
            onChange={(e) => {
              setForm({ ...form, displayName: e.target.value });
              setFieldErrors((prev) => ({ ...prev, displayName: "" }));
            }}
            error={fieldErrors.displayName}
          />
          <TextInput
            label="Employee code"
            value={form.employeeCode}
            onChange={(e) => setForm({ ...form, employeeCode: e.target.value })}
          />
          <Button type="submit" disabled={submitting || availableUsers.length === 0}>
            {submitting ? "Creating…" : "Create profile"}
          </Button>
        </form>
      )}

      {!loading && profiles.length === 0 && !error && (
        <EmptyState
          title="No profiles in scope"
          description="Profiles appear here when Sales Executives are onboarded."
        />
      )}

      {!loading && profiles.length > 0 && (
        <Panel title={`Profiles · ${profiles.length}`}>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sales Executive</th>
                  <th>Team</th>
                  <th>Team Lead</th>
                  <th>Commando</th>
                  <th>Intervention</th>
                  <th>Days</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="font-medium">{p.displayName}</div>
                      <div className="text-xs text-[var(--color-ink-muted)]">
                        {p.user.email}
                      </div>
                    </td>
                    <td>{p.team.name}</td>
                    <td className="text-[var(--color-ink-muted)]">
                      {p.currentAssignment
                        ? `${p.currentAssignment.teamLead.firstName} ${p.currentAssignment.teamLead.lastName}`
                        : "—"}
                    </td>
                    <td className="text-[var(--color-ink-muted)]">
                      {p.currentAssignment
                        ? `${p.currentAssignment.commando.firstName} ${p.currentAssignment.commando.lastName}`
                        : "—"}
                    </td>
                    <td>
                      {p.currentAssignment ? (
                        <StatusBadge status={p.currentAssignment.status} />
                      ) : (
                        <span className="text-[var(--color-ink-subtle)]">None</span>
                      )}
                    </td>
                    <td className="tabular-nums">
                      {p.currentAssignment?.totalDaysUnderCommando ?? "—"}
                    </td>
                    <td className="text-right">
                      <Link
        href={`/profiles/${p.id}`}
                        className="text-sm text-[var(--color-brand)] hover:underline"
                      >
                        Open workspace
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}
