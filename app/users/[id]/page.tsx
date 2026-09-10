"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { api, type ManagedUserDetail } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { roleLabel } from "@/lib/labels";
import { formatDateTime } from "@/lib/dates";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Button,
  ConfirmDialog,
  ErrorState,
  PageHeader,
  Panel,
  SelectField,
  Skeleton,
  TextInput,
} from "@/components/ui";

const ROLE_OPTIONS = [
  "SUPER_ADMIN",
  "TEAM_LEAD",
  "COMMANDO_EXECUTIVE",
  "SALES_EXECUTIVE",
  "SALES_SUPPORT_EXECUTIVE",
] as const;

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { token, hasPermission, user: me } = useAuth();
  const { pushToast } = useToast();
  const [user, setUser] = useState<ManagedUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });
  const [roleCode, setRoleCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [statusConfirm, setStatusConfirm] = useState(false);
  const [roleConfirm, setRoleConfirm] = useState(false);

  const canUpdate = hasPermission("USER_UPDATE");
  const canStatus = hasPermission("USER_STATUS_UPDATE");
  const canRole = hasPermission("USER_ROLE_UPDATE");

  const load = useCallback(async () => {
    if (!token || !id) return;
    setLoading(true);
    try {
      const res = await api.getUser(token, id);
      setUser(res.data.user);
      setEditForm({
        firstName: res.data.user.firstName,
        lastName: res.data.user.lastName,
        email: res.data.user.email,
      });
      setRoleCode(res.data.user.role.code);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load user");
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSaveAccount(e: FormEvent) {
    e.preventDefault();
    if (!token || !user) return;
    setBusy(true);
    try {
      const res = await api.updateUser(token, user.id, {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        email: editForm.email.trim(),
      });
      setUser(res.data.user);
      setEditing(false);
      pushToast("User updated", "success");
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Update failed", "error");
    } finally {
      setBusy(false);
    }
  }

  async function onToggleStatus() {
    if (!token || !user) return;
    setBusy(true);
    try {
      const res = await api.updateUserStatus(token, user.id, !user.isActive);
      setUser(res.data.user);
      setStatusConfirm(false);
      pushToast(user.isActive ? "User deactivated" : "User activated", "success");
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Update failed", "error");
    } finally {
      setBusy(false);
    }
  }

  async function onChangeRole() {
    if (!token || !user) return;
    setBusy(true);
    try {
      const res = await api.updateUserRole(token, user.id, roleCode);
      setUser(res.data.user);
      setRoleConfirm(false);
      pushToast("Role updated", "success");
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Role change failed", "error");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !user) {
    return <ErrorState message={error ?? "User not found"} />;
  }

  const isSelf = me?.id === user.id;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${user.firstName} ${user.lastName}`}
        description={user.email}
        actions={
          <div className="flex flex-wrap gap-2">
            {user.profile?.id ? (
              <Link
                href={`/profiles/${user.profile.id}`}
                className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-[var(--color-line)] px-3.5 text-sm font-medium hover:bg-[var(--color-surface-2)]"
              >
                View profile
              </Link>
            ) : null}
            <Button variant="secondary" onClick={() => router.push("/users")}>
              Back to users
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Account">
          {!editing ? (
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="text-[var(--color-ink-muted)]">Name</dt>
                <dd className="font-medium">
                  {user.firstName} {user.lastName}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--color-ink-muted)]">Email</dt>
                <dd className="font-medium">{user.email}</dd>
              </div>
              <div>
                <dt className="text-[var(--color-ink-muted)]">Role</dt>
                <dd className="font-medium">{roleLabel(user.role.code)}</dd>
              </div>
              <div>
                <dt className="text-[var(--color-ink-muted)]">Status</dt>
                <dd>
                  <StatusBadge status={user.isActive ? "ACTIVE" : "INACTIVE"} />
                </dd>
              </div>
              <div>
                <dt className="text-[var(--color-ink-muted)]">Created</dt>
                <dd>{formatDateTime(user.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-[var(--color-ink-muted)]">Updated</dt>
                <dd>{formatDateTime(user.updatedAt)}</dd>
              </div>
            </dl>
          ) : (
            <form onSubmit={onSaveAccount} className="grid gap-3">
              <TextInput
                label="First name"
                required
                value={editForm.firstName}
                onChange={(e) =>
                  setEditForm({ ...editForm, firstName: e.target.value })
                }
              />
              <TextInput
                label="Last name"
                required
                value={editForm.lastName}
                onChange={(e) =>
                  setEditForm({ ...editForm, lastName: e.target.value })
                }
              />
              <TextInput
                label="Email"
                type="email"
                required
                value={editForm.email}
                onChange={(e) =>
                  setEditForm({ ...editForm, email: e.target.value })
                }
                hint="Email is used as the login identifier."
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={busy}>
                  Save
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setEditing(false)}
                  disabled={busy}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {!editing && (
            <div className="mt-4 flex flex-wrap gap-2">
              {canUpdate ? (
                <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                  Edit
                </Button>
              ) : null}
              {canStatus && !isSelf ? (
                <Button
                  variant={user.isActive ? "danger" : "secondary"}
                  size="sm"
                  onClick={() => setStatusConfirm(true)}
                >
                  {user.isActive ? "Deactivate" : "Activate"}
                </Button>
              ) : null}
            </div>
          )}
        </Panel>

        <Panel title="Organization">
          {user.team ? (
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="text-[var(--color-ink-muted)]">Team</dt>
                <dd className="font-medium">
                  <Link
                    href={`/teams/${user.team.id}`}
                    className="text-[var(--color-brand)] hover:underline"
                  >
                    {user.team.name}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-[var(--color-ink-muted)]">Role in team</dt>
                <dd>{roleLabel(user.team.roleInTeam)}</dd>
              </div>
              <div>
                <dt className="text-[var(--color-ink-muted)]">Membership</dt>
                <dd>Active</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-[var(--color-ink-muted)]">
              No active team membership.
            </p>
          )}
        </Panel>

        <Panel title="Business profile">
          {user.role.code !== "SALES_EXECUTIVE" ? (
            <p className="text-sm text-[var(--color-ink-muted)]">
              Not a Sales Executive account.
            </p>
          ) : user.profile ? (
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="text-[var(--color-ink-muted)]">Profile</dt>
                <dd className="font-medium">{user.profile.displayName}</dd>
              </div>
              <div>
                <dt className="text-[var(--color-ink-muted)]">Team</dt>
                <dd>{user.profile.team.name}</dd>
              </div>
              <div>
                <dt className="text-[var(--color-ink-muted)]">Current Commando</dt>
                <dd>
                  {user.profile.currentAssignment
                    ? `${user.profile.currentAssignment.commando.firstName} ${user.profile.currentAssignment.commando.lastName}`
                    : "None"}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--color-ink-muted)]">Assignment</dt>
                <dd>
                  {user.profile.currentAssignment ? (
                    <StatusBadge status={user.profile.currentAssignment.status} />
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div className="pt-2">
                <Link
                  href={`/profiles/${user.profile.id}`}
                  className="text-sm font-medium text-[var(--color-brand)] hover:underline"
                >
                  Open Sales Executive profile
                </Link>
              </div>
            </dl>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-[var(--status-warning)]">
                Sales Executive profile not created
              </p>
              {hasPermission("PROFILE_MANAGE") ? (
                <Link
                  href="/profiles"
                  className="inline-flex h-9 items-center rounded-[var(--radius-sm)] bg-[var(--color-brand)] px-3.5 text-sm font-medium text-white hover:bg-[var(--color-brand-hover)]"
                >
                  Create profile
                </Link>
              ) : null}
            </div>
          )}
        </Panel>

        {canRole && !isSelf ? (
          <Panel title="Change role">
            <SelectField
              label="System role"
              value={roleCode}
              onChange={(e) => setRoleCode(e.target.value)}
              hint="Role changes are blocked when active assignments or an SE profile still depend on the current role."
            >
              {ROLE_OPTIONS.map((code) => (
                <option key={code} value={code}>
                  {roleLabel(code)}
                </option>
              ))}
            </SelectField>
            <Button
              className="mt-3"
              variant="secondary"
              disabled={roleCode === user.role.code || busy}
              onClick={() => setRoleConfirm(true)}
            >
              Change role
            </Button>
          </Panel>
        ) : null}
      </div>

      <ConfirmDialog
        open={statusConfirm}
        title={user.isActive ? "Deactivate user?" : "Activate user?"}
        message={
          user.isActive
            ? `${user.firstName} ${user.lastName} will be unable to sign in. Historical records remain.`
            : `${user.firstName} ${user.lastName} will be able to sign in again.`
        }
        confirmLabel={user.isActive ? "Deactivate" : "Activate"}
        danger={user.isActive}
        busy={busy}
        onConfirm={() => void onToggleStatus()}
        onCancel={() => setStatusConfirm(false)}
      />

      <ConfirmDialog
        open={roleConfirm}
        title="Change role?"
        message={`Change ${user.firstName} ${user.lastName} from ${roleLabel(user.role.code)} to ${roleLabel(roleCode)}?`}
        confirmLabel="Change role"
        busy={busy}
        onConfirm={() => void onChangeRole()}
        onCancel={() => setRoleConfirm(false)}
      />
    </div>
  );
}
