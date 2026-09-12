"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  api,
  ApiError,
  type EligibleSupportUser,
  type SalesSupportLink,
  type SeSupportTeamContext,
  type SupportTask,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/dates";
import { personName, responsibilityTypeLabel } from "@/lib/labels";
import { useToast } from "@/lib/toast-context";
import { StatusBadge } from "@/components/StatusBadge";
import { AssignSupportTaskDrawer } from "@/components/support-team/AssignSupportTaskDrawer";
import {
  Button,
  ConfirmDialog,
  Drawer,
  EmptyState,
  SelectField,
  Skeleton,
  TextArea,
  TextInput,
} from "@/components/ui";

const RESPONSIBILITY_OPTIONS = [
  "GENERAL",
  "PRODUCT",
  "PRICING",
  "PROPOSAL",
  "CUSTOMER",
  "TECHNICAL",
  "PIPELINE",
  "OTHER",
] as const;

type Props = {
  profileId: string;
  profileName: string;
  teamLeadLocked: boolean;
  canAssign: boolean;
  canView: boolean;
  canCreateTask?: boolean;
  supportTeam: SeSupportTeamContext | null;
  supportTasks?: SupportTask[];
  currentAssignment?: {
    id: string;
    status: string;
    commando: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  } | null;
  onChanged: () => void | Promise<void>;
};

export function SupportTeamPanel({
  profileId,
  profileName,
  teamLeadLocked,
  canAssign,
  canView,
  canCreateTask = false,
  supportTeam,
  supportTasks = [],
  currentAssignment = null,
  onChanged,
}: Props) {
  const { token } = useAuth();
  const { pushToast } = useToast();
  const [assignOpen, setAssignOpen] = useState(false);
  const [taskAssignOpen, setTaskAssignOpen] = useState(false);
  const [taskPresetLinkId, setTaskPresetLinkId] = useState<string | null>(null);
  const [endTarget, setEndTarget] = useState<SalesSupportLink | null>(null);
  const [endBusy, setEndBusy] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  if (!canView) {
    return (
      <EmptyState
        title="Support team unavailable"
        description="You do not have permission to view Sales Support assignments for this person."
      />
    );
  }

  const active = supportTeam?.activeSupport ?? [];
  const history = supportTeam?.history ?? [];
  const commando =
    supportTeam?.commando ??
    (currentAssignment
      ? {
          id: currentAssignment.commando.id,
          firstName: currentAssignment.commando.firstName,
          lastName: currentAssignment.commando.lastName,
          email: currentAssignment.commando.email,
          assignmentId: currentAssignment.id,
          status: currentAssignment.status,
        }
      : null);

  async function confirmEnd() {
    if (!token || !endTarget) return;
    setEndBusy(true);
    try {
      await api.endSalesSupportLink(token, endTarget.id);
      pushToast("Support assignment ended", "success");
      setEndTarget(null);
      await onChanged();
    } catch (err) {
      pushToast(
        err instanceof ApiError ? err.message : "Could not end assignment",
        "error",
      );
    } finally {
      setEndBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="surface p-4">
        <h2 className="text-sm font-semibold">Commando</h2>
        <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
          Active intervention owner for {profileName}.
        </p>
        {commando ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[var(--color-ink)]">
                {personName(commando)}
              </p>
              <p className="text-xs text-[var(--color-ink-muted)]">
                {commando.email}
              </p>
            </div>
            <StatusBadge status={commando.status} label="Active" />
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
            No active Commando intervention.
          </p>
        )}
      </section>

      <section className="surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Active Support</h2>
            <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
              Sales Support Executives currently assigned to this person.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canCreateTask && active.length > 0 ? (
              <Button
                size="sm"
                variant="secondary"
                disabled={teamLeadLocked}
                onClick={() => {
                  setTaskPresetLinkId(null);
                  setTaskAssignOpen(true);
                }}
              >
                Assign task
              </Button>
            ) : null}
            {canAssign ? (
              <Button
                size="sm"
                disabled={teamLeadLocked}
                onClick={() => setAssignOpen(true)}
              >
                Assign Support
              </Button>
            ) : null}
          </div>
        </div>

        {active.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title="No Support assigned"
              description={`No Sales Support Executive is currently assigned to ${profileName}.`}
              action={
                canAssign ? (
                  <Button
                    className="mt-4"
                    size="sm"
                    disabled={teamLeadLocked}
                    onClick={() => setAssignOpen(true)}
                  >
                    Assign Support
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--color-line)]">
            {active.map((link) => {
              const linkTasks = supportTasks.filter(
                (t) =>
                  t.salesSupportLinkId === link.id ||
                  t.salesSupportUserId === link.salesSupportUserId,
              );
              return (
                <li key={link.id} className="space-y-3 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--color-ink)]">
                        {personName(link.supportUser)}
                        {link.responsibilityType
                          ? ` · ${responsibilityTypeLabel(link.responsibilityType)}`
                          : ""}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <StatusBadge status="ACTIVE" label="Active" />
                        <span className="text-xs text-[var(--color-ink-muted)]">
                          Assigned {formatDate(link.startedAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {canCreateTask ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={teamLeadLocked}
                          onClick={() => {
                            setTaskPresetLinkId(link.id);
                            setTaskAssignOpen(true);
                          }}
                        >
                          Assign task
                        </Button>
                      ) : null}
                      {canAssign ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={teamLeadLocked}
                          onClick={() => setEndTarget(link)}
                        >
                          End Assignment
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-subtle)]">
                      Assigned tasks · {linkTasks.length}
                    </p>
                    {linkTasks.length === 0 ? (
                      <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                        No specific tasks assigned yet.
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-1.5">
                        {linkTasks.slice(0, 5).map((task) => (
                          <li key={task.id}>
                            <Link
                              href={`/my-tasks/${task.id}?returnTo=${encodeURIComponent(`/profiles/${profileId}/support`)}`}
                              className="flex items-center justify-between gap-3 text-sm hover:underline"
                            >
                              <span className="min-w-0 truncate font-medium">
                                {task.title}
                              </span>
                              <StatusBadge status={task.status} />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {history.length > 0 ? (
        <section className="surface p-4">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 text-left"
            onClick={() => setHistoryOpen((v) => !v)}
            aria-expanded={historyOpen}
          >
            <div>
              <h2 className="text-sm font-semibold">History</h2>
              <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                {history.length} ended assignment
                {history.length === 1 ? "" : "s"}
              </p>
            </div>
            <span className="text-xs font-medium text-[var(--color-brand)]">
              {historyOpen ? "Hide" : "Show"}
            </span>
          </button>
          {historyOpen ? (
            <ul className="mt-3 divide-y divide-[var(--color-line)]">
              {history.map((link) => (
                <li key={link.id} className="py-3">
                  <p className="text-sm font-medium text-[var(--color-ink)]">
                    {personName(link.supportUser)}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                    {link.responsibilityType
                      ? `${responsibilityTypeLabel(link.responsibilityType)} · `
                      : ""}
                    {formatDate(link.startedAt)}
                    {link.endedAt ? ` → ${formatDate(link.endedAt)}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <AssignSupportDrawer
        open={assignOpen}
        profileId={profileId}
        profileName={profileName}
        onClose={() => setAssignOpen(false)}
        onAssigned={async () => {
          setAssignOpen(false);
          await onChanged();
        }}
      />

      <AssignSupportTaskDrawer
        open={taskAssignOpen}
        onClose={() => setTaskAssignOpen(false)}
        profileId={profileId}
        profileName={profileName}
        activeLinks={active}
        presetLinkId={taskPresetLinkId}
        onCreated={async () => {
          await onChanged();
        }}
      />

      <ConfirmDialog
        open={Boolean(endTarget)}
        title="End Assignment"
        message="This ends the active Sales Support assignment and preserves it in history. Active support tasks must be reassigned or completed first."
        confirmLabel="End Assignment"
        danger
        busy={endBusy}
        onConfirm={() => void confirmEnd()}
        onCancel={() => setEndTarget(null)}
      />
    </div>
  );
}

function AssignSupportDrawer({
  open,
  profileId,
  profileName,
  onClose,
  onAssigned,
}: {
  open: boolean;
  profileId: string;
  profileName: string;
  onClose: () => void;
  onAssigned: () => void | Promise<void>;
}) {
  const { token } = useAuth();
  const { pushToast } = useToast();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [users, setUsers] = useState<EligibleSupportUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [responsibilityType, setResponsibilityType] = useState("GENERAL");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setDebouncedSearch("");
      setSelectedUserId("");
      setResponsibilityType("GENERAL");
      setNote("");
      setUsers([]);
      setLoadError(null);
      return;
    }
  }, [open]);

  useEffect(() => {
    if (!open || !token) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void api
      .getEligibleSupportUsers(token, {
        profileId,
        search: debouncedSearch || undefined,
      })
      .then((res) => {
        if (cancelled) return;
        setUsers(res.data.users);
        setSelectedUserId((prev) =>
          res.data.users.some((u) => u.id === prev) ? prev : "",
        );
      })
      .catch((err) => {
        if (cancelled) return;
        setUsers([]);
        setLoadError(
          err instanceof ApiError
            ? err.message
            : "Unable to load eligible support users.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, token, profileId, debouncedSearch]);

  const selected = useMemo(
    () => users.find((u) => u.id === selectedUserId) ?? null,
    [users, selectedUserId],
  );

  async function submit() {
    if (!token || !selectedUserId) return;
    setSubmitting(true);
    try {
      await api.assignSalesSupportLink(token, {
        salesExecutiveProfileId: profileId,
        salesSupportUserId: selectedUserId,
        responsibilityType: responsibilityType || null,
        note: note.trim() || null,
      });
      pushToast(
        `${personName(selected)} assigned to ${profileName}`,
        "success",
      );
      await onAssigned();
    } catch (err) {
      pushToast(
        err instanceof ApiError ? err.message : "Could not assign support",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Drawer
      open={open}
      title="Assign Support Sales"
      description={`Select a Sales Support Executive for ${profileName}.`}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={submitting || !selectedUserId}
          >
            {submitting ? "Assigning…" : "Assign"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <TextInput
          label="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Name or email…"
        />

        <div>
          <p className="mb-2 text-sm font-medium text-[var(--color-ink)]">
            Eligible users
          </p>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : loadError ? (
            <p className="text-sm text-[var(--status-danger)]">{loadError}</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-[var(--color-ink-muted)]">
              No eligible Sales Support users found.
            </p>
          ) : (
            <ul className="max-h-56 space-y-1 overflow-y-auto rounded border border-[var(--color-line)]">
              {users.map((user) => {
                const checked = selectedUserId === user.id;
                return (
                  <li key={user.id}>
                    <label
                      className={`flex cursor-pointer items-start gap-3 px-3 py-2.5 text-sm hover:bg-[var(--color-surface-2)] ${
                        checked ? "bg-[var(--color-brand-soft)]" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="support-user"
                        className="mt-1"
                        checked={checked}
                        onChange={() => setSelectedUserId(user.id)}
                      />
                      <span className="min-w-0">
                        <span className="block font-medium text-[var(--color-ink)]">
                          {personName(user)}
                        </span>
                        <span className="block text-xs text-[var(--color-ink-muted)]">
                          {user.email}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <SelectField
          label="Responsibility"
          value={responsibilityType}
          onChange={(e) => setResponsibilityType(e.target.value)}
        >
          {RESPONSIBILITY_OPTIONS.map((code) => (
            <option key={code} value={code}>
              {responsibilityTypeLabel(code)}
            </option>
          ))}
        </SelectField>

        <TextArea
          label="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Context for this assignment…"
        />
      </div>
    </Drawer>
  );
}
