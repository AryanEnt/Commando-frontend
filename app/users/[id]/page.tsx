"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type ManagedUserDetail } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { roleLabel } from "@/lib/labels";
import { formatDateTime } from "@/lib/dates";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Avatar,
  Button,
  ConfirmDialog,
  ErrorState,
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

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[10rem_1fr] sm:items-start sm:gap-4">
      <dt className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-subtle)]">
        {label}
      </dt>
      <dd className="text-sm text-[var(--color-ink)]">{children}</dd>
    </div>
  );
}

function Callout({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "warning" | "danger";
  title: string;
  children: ReactNode;
}) {
  const tones = {
    info: "border-[var(--status-info-ring)] bg-[var(--status-info-bg)] text-[var(--status-info)]",
    warning:
      "border-[var(--status-warn-ring)] bg-[var(--status-warn-bg)] text-[var(--status-warn)]",
    danger:
      "border-[var(--status-danger-ring)] bg-[var(--status-danger-bg)] text-[var(--status-danger)]",
  };
  return (
    <div
      className={`rounded-[var(--radius-sm)] border px-3 py-3 text-sm ${tones[tone]}`}
      role="status"
    >
      <p className="font-medium">{title}</p>
      <div className="mt-1 text-[var(--color-ink-muted)]">{children}</div>
    </div>
  );
}

function detectRoleChangeBlock(user: ManagedUserDetail): string | null {
  if (user.role.code !== "SALES_EXECUTIVE") return null;
  if (user.profile?.currentAssignment) {
    return "This user has an active Sales Executive assignment. Resolve the active assignment before changing their role.";
  }
  if (user.profile && !user.profile.archivedAt) {
    return "This user has a Sales Executive profile. Archive or resolve the profile before changing their role.";
  }
  return null;
}

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
  const [roleBlockReason, setRoleBlockReason] = useState<string | null>(null);

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
      setRoleBlockReason(detectRoleChangeBlock(res.data.user));
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
      setRoleCode(res.data.user.role.code);
      setRoleBlockReason(detectRoleChangeBlock(res.data.user));
      setRoleConfirm(false);
      pushToast("Role updated", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Role change failed";
      setRoleBlockReason(msg);
      setRoleConfirm(false);
      pushToast(msg, "error");
    } finally {
      setBusy(false);
    }
  }

  const fullName = user ? `${user.firstName} ${user.lastName}` : "";
  const roleUnchanged = Boolean(user && roleCode === user.role.code);
  const roleChangeBlocked = Boolean(roleBlockReason);
  const canSubmitRoleChange =
    Boolean(user) && !roleUnchanged && !roleChangeBlocked && !busy;

  const roleConfirmMessage = useMemo(() => {
    if (!user) return "";
    return `Change ${fullName} from ${roleLabel(user.role.code)} to ${roleLabel(roleCode)}?`;
  }, [user, fullName, roleCode]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-16 w-full max-w-xl" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      </div>
    );
  }

  if (error || !user) {
    return <ErrorState message={error ?? "User not found"} onRetry={() => void load()} />;
  }

  const isSelf = me?.id === user.id;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Link
          href="/users"
          className="inline-flex text-sm font-medium text-[var(--color-brand)] hover:underline"
        >
          ← Back to Users
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <Avatar name={fullName} size="lg" />
            <div className="min-w-0">
              <h1 className="truncate text-[1.75rem] font-semibold tracking-tight text-[var(--color-ink)]">
                {fullName}
              </h1>
              <p className="mt-0.5 truncate text-sm text-[var(--color-ink-muted)]">
                {user.email}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge
                  status={user.role.code}
                  label={roleLabel(user.role.code)}
                />
                <StatusBadge status={user.isActive ? "ACTIVE" : "INACTIVE"} />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {user.profile?.id ? (
              <Button
                variant="secondary"
                onClick={() => router.push(`/profiles/${user.profile!.id}`)}
              >
                View profile
              </Button>
            ) : null}
            {canUpdate && !editing ? (
              <Button variant="secondary" onClick={() => setEditing(true)}>
                Edit
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Account">
          <div className="p-4">
            {!editing ? (
              <dl className="space-y-3">
                <InfoRow label="Name">{fullName}</InfoRow>
                <InfoRow label="Email">{user.email}</InfoRow>
                <InfoRow label="System Role">
                  {roleLabel(user.role.code)}
                </InfoRow>
                <InfoRow label="Status">
                  <StatusBadge status={user.isActive ? "ACTIVE" : "INACTIVE"} />
                </InfoRow>
                <InfoRow label="Created">
                  {formatDateTime(user.createdAt)}
                </InfoRow>
                <InfoRow label="Updated">
                  {formatDateTime(user.updatedAt)}
                </InfoRow>
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
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button type="submit" disabled={busy}>
                    {busy ? "Saving…" : "Save"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setEditing(false);
                      setEditForm({
                        firstName: user.firstName,
                        lastName: user.lastName,
                        email: user.email,
                      });
                    }}
                    disabled={busy}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>
        </Panel>

        <Panel title="Organization">
          <div className="p-4">
            {user.team ? (
              <dl className="space-y-3">
                <InfoRow label="Team">
                  <Link
                    href={`/teams/${user.team.id}`}
                    className="font-medium text-[var(--color-brand)] hover:underline"
                  >
                    {user.team.name}
                  </Link>
                </InfoRow>
                <InfoRow label="Role in team">
                  {roleLabel(user.team.roleInTeam)}
                </InfoRow>
                <InfoRow label="Membership">
                  <StatusBadge status="ACTIVE" />
                </InfoRow>
              </dl>
            ) : (
              <div className="rounded-[var(--radius-sm)] border border-dashed border-[var(--color-line-strong)] px-4 py-8 text-center">
                <p className="text-sm font-medium text-[var(--color-ink)]">
                  No team membership
                </p>
                <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--color-ink-muted)]">
                  This account is not currently assigned to a team.
                </p>
              </div>
            )}
          </div>
        </Panel>

        <Panel title="Business Profile">
          <div className="p-4">
            {user.role.code !== "SALES_EXECUTIVE" ? (
              <div className="flex gap-3 rounded-[var(--radius-sm)] border border-dashed border-[var(--color-line-strong)] bg-[var(--color-surface-2)] px-4 py-5">
                <span
                  className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface)] text-[var(--color-ink-muted)] ring-1 ring-[var(--color-line)]"
                  aria-hidden
                >
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    className="h-4 w-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                    <path d="M3.5 16.5c1.6-2.4 4-3.5 6.5-3.5s4.9 1.1 6.5 3.5" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--color-ink)]">
                    No Sales Executive Profile
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                    This account is currently a {roleLabel(user.role.code)}{" "}
                    account and therefore does not have a Sales Executive
                    profile.
                  </p>
                </div>
              </div>
            ) : user.profile ? (
              <dl className="space-y-3">
                <InfoRow label="Profile">
                  <span className="font-medium">{user.profile.displayName}</span>
                </InfoRow>
                <InfoRow label="Team">{user.profile.team.name}</InfoRow>
                <InfoRow label="Current Commando">
                  {user.profile.currentAssignment
                    ? `${user.profile.currentAssignment.commando.firstName} ${user.profile.currentAssignment.commando.lastName}`
                    : "None"}
                </InfoRow>
                <InfoRow label="Assignment">
                  {user.profile.currentAssignment ? (
                    <StatusBadge
                      status={user.profile.currentAssignment.status}
                    />
                  ) : (
                    "—"
                  )}
                </InfoRow>
                <div className="pt-1">
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
                <Callout tone="warning" title="Sales Executive profile missing">
                  This Sales Executive account does not have a business profile
                  yet.
                </Callout>
                {hasPermission("PROFILE_MANAGE") ? (
                  <Button
                    onClick={() => router.push("/profiles")}
                  >
                    Create profile
                  </Button>
                ) : null}
              </div>
            )}
          </div>
        </Panel>

        {canRole && !isSelf ? (
          <Panel title="Change Role">
            <div className="space-y-4 p-4">
              <InfoRow label="Current role">
                <StatusBadge
                  status={user.role.code}
                  label={roleLabel(user.role.code)}
                />
              </InfoRow>

              <SelectField
                label="New role"
                value={roleCode}
                onChange={(e) => {
                  setRoleCode(e.target.value);
                  if (roleBlockReason && !detectRoleChangeBlock(user)) {
                    setRoleBlockReason(null);
                  }
                }}
                disabled={busy}
              >
                {ROLE_OPTIONS.map((code) => (
                  <option key={code} value={code}>
                    {roleLabel(code)}
                  </option>
                ))}
              </SelectField>

              <p className="text-sm text-[var(--color-ink-muted)]">
                Choose the system role this user should have. Permissions and
                available workspaces update immediately after a successful
                change.
              </p>

              {roleChangeBlocked ? (
                <Callout tone="warning" title="Role change blocked">
                  {roleBlockReason}
                </Callout>
              ) : (
                <Callout tone="info" title="Safety check">
                  Role changes are blocked when active assignments or an SE
                  profile still depend on the current role. The server enforces
                  this rule even if the UI allows submission.
                </Callout>
              )}

              <Button
                disabled={!canSubmitRoleChange}
                onClick={() => setRoleConfirm(true)}
              >
                Change Role
              </Button>
            </div>
          </Panel>
        ) : null}
      </div>

      {canStatus && !isSelf ? (
        <Panel title="Danger zone" tone="history">
          <div className="space-y-3 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 max-w-xl">
                <p className="text-sm font-medium text-[var(--color-ink)]">
                  {user.isActive ? "Deactivate account" : "Activate account"}
                </p>
                <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                  {user.isActive
                    ? "Deactivated users cannot sign in. Historical records and audit history are preserved."
                    : "Re-enable sign-in for this account. Existing role and team membership stay as configured."}
                </p>
              </div>
              <Button
                variant={user.isActive ? "danger" : "secondary"}
                onClick={() => setStatusConfirm(true)}
                disabled={busy}
              >
                {user.isActive ? "Deactivate" : "Activate"}
              </Button>
            </div>
          </div>
        </Panel>
      ) : null}

      <ConfirmDialog
        open={statusConfirm}
        title={user.isActive ? "Deactivate user?" : "Activate user?"}
        message={
          user.isActive
            ? `${fullName} will be unable to sign in. Historical records remain.`
            : `${fullName} will be able to sign in again.`
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
        message={roleConfirmMessage}
        confirmLabel="Change Role"
        busy={busy}
        onConfirm={() => void onChangeRole()}
        onCancel={() => setRoleConfirm(false)}
      />
    </div>
  );
}
