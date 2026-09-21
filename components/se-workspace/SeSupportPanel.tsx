"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, UserPlus } from "lucide-react";
import {
  api,
  ApiError,
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
import { AssignSupportPersonDrawer } from "@/components/support-team/SupportTeamPanel";
import {
  Button,
  ConfirmDialog,
  EmptyState,
} from "@/components/ui";

type TaskFilter = "all" | "open" | "completed";

type Props = {
  profileId: string;
  profileName: string;
  teamLeadLocked: boolean;
  canAssign: boolean;
  canView: boolean;
  canCreateTask: boolean;
  supportTeam: SeSupportTeamContext | null;
  supportTasks: SupportTask[];
  onChanged: () => void | Promise<void>;
};

export function SeSupportPanel({
  profileId,
  profileName,
  teamLeadLocked,
  canAssign,
  canView,
  canCreateTask,
  supportTeam,
  supportTasks,
  onChanged,
}: Props) {
  const { token } = useAuth();
  const { pushToast } = useToast();
  const [assignOpen, setAssignOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskLinkId, setTaskLinkId] = useState<string | null>(null);
  const [endTarget, setEndTarget] = useState<SalesSupportLink | null>(null);
  const [endBusy, setEndBusy] = useState(false);
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("all");

  const active = supportTeam?.activeSupport ?? [];
  const history = supportTeam?.history ?? [];

  const filteredTasks = useMemo(() => {
    if (taskFilter === "open") {
      return supportTasks.filter((t) => t.status !== "COMPLETED");
    }
    if (taskFilter === "completed") {
      return supportTasks.filter((t) => t.status === "COMPLETED");
    }
    return supportTasks;
  }, [supportTasks, taskFilter]);

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

  if (!canView) {
    return (
      <EmptyState
        title="Support unavailable"
        description="You do not have permission to view Sales Support for this person."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header + primary actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[1.2rem] font-semibold tracking-tight text-[var(--color-ink)]">
            Support
          </h2>
          <p className="mt-0.5 text-meta">
            Who helps {profileName}, and what they need to do
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canCreateTask && active.length > 0 ? (
            <Button
              size="sm"
              variant="secondary"
              disabled={teamLeadLocked}
              onClick={() => {
                setTaskLinkId(null);
                setTaskOpen(true);
              }}
            >
              <Plus size={14} aria-hidden />
              Add task
            </Button>
          ) : null}
          {canAssign ? (
            <Button
              size="sm"
              disabled={teamLeadLocked}
              onClick={() => setAssignOpen(true)}
            >
              <UserPlus size={14} aria-hidden />
              Assign Support
            </Button>
          ) : null}
        </div>
      </div>

      {/* Assigned people */}
      <section className="surface overflow-hidden">
        <div className="border-b border-[var(--color-line)] px-4 py-3">
          <h3 className="text-section-title">
            Assigned ({active.length})
          </h3>
        </div>

        {active.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No one assigned yet"
              description={`Assign a Sales Support Executive to help ${profileName}.`}
              icon="emptyUsers"
              action={
                canAssign ? (
                  <Button
                    size="sm"
                    disabled={teamLeadLocked}
                    onClick={() => setAssignOpen(true)}
                  >
                    <UserPlus size={14} aria-hidden />
                    Assign Support
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <ul className="divide-y divide-[var(--color-line)]">
            {active.map((link) => (
              <li
                key={link.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--color-ink)]">
                    {personName(link.supportUser)}
                  </p>
                  <p className="mt-0.5 text-meta">
                    {link.responsibilityType
                      ? responsibilityTypeLabel(link.responsibilityType)
                      : "General"}
                    {" · "}
                    since {formatDate(link.startedAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canCreateTask ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={teamLeadLocked}
                      onClick={() => {
                        setTaskLinkId(link.id);
                        setTaskOpen(true);
                      }}
                    >
                      Add task
                    </Button>
                  ) : null}
                  {canAssign ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={teamLeadLocked}
                      onClick={() => setEndTarget(link)}
                    >
                      End
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}

        {history.length > 0 ? (
          <details className="border-t border-[var(--color-line)]">
            <summary className="cursor-pointer px-4 py-2.5 text-[12px] font-semibold text-[var(--color-brand)]">
              Past assignments ({history.length})
            </summary>
            <ul className="max-h-40 divide-y divide-[var(--color-line)] overflow-y-auto border-t border-[var(--color-line)]">
              {history.map((link) => (
                <li key={link.id} className="px-4 py-2.5">
                  <p className="text-sm font-medium text-[var(--color-ink)]">
                    {personName(link.supportUser)}
                  </p>
                  <p className="text-meta">
                    {formatDate(link.startedAt)}
                    {link.endedAt ? ` → ${formatDate(link.endedAt)}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </section>

      {/* Tasks */}
      <section className="surface overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-line)] px-4 py-3">
          <h3 className="text-section-title">Tasks ({filteredTasks.length})</h3>
          <div className="flex gap-1" role="group" aria-label="Task filter">
            {(
              [
                { key: "all", label: "All" },
                { key: "open", label: "Open" },
                { key: "completed", label: "Done" },
              ] as const
            ).map((f) => (
              <button
                key={f.key}
                type="button"
                aria-pressed={taskFilter === f.key}
                onClick={() => setTaskFilter(f.key)}
                className={`rounded-[var(--radius-btn)] px-2.5 py-1 text-[12px] font-semibold transition ${
                  taskFilter === f.key
                    ? "bg-[var(--color-brand)] text-white"
                    : "bg-[var(--color-mint)] text-[var(--color-brand-dark)] ring-1 ring-inset ring-[var(--color-brand-ring)]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {supportTasks.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No tasks yet"
              description={
                active.length > 0
                  ? "Create a task for the assigned Sales Support."
                  : "Assign Sales Support first, then add a task."
              }
              icon="emptySupport"
              action={
                canCreateTask && active.length > 0 ? (
                  <Button
                    size="sm"
                    disabled={teamLeadLocked}
                    onClick={() => {
                      setTaskLinkId(null);
                      setTaskOpen(true);
                    }}
                  >
                    <Plus size={14} aria-hidden />
                    Add task
                  </Button>
                ) : canAssign && active.length === 0 ? (
                  <Button
                    size="sm"
                    disabled={teamLeadLocked}
                    onClick={() => setAssignOpen(true)}
                  >
                    <UserPlus size={14} aria-hidden />
                    Assign Support
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : filteredTasks.length === 0 ? (
          <p className="px-4 py-8 text-center text-meta">
            No tasks in this filter.
          </p>
        ) : (
          <div className="max-h-[min(24rem,50vh)] overflow-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th>Due</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((t) => {
                  const overdue =
                    t.isOverdue ||
                    (t.status !== "COMPLETED" &&
                      !!t.dueDate &&
                      new Date(t.dueDate).getTime() < Date.now());
                  return (
                    <tr key={t.id}>
                      <td>
                        <Link
                          href={`/my-tasks/${t.id}?returnTo=${encodeURIComponent(`/profiles/${profileId}/support`)}`}
                          className="font-semibold text-[var(--color-ink)] hover:text-[var(--color-brand-dark)] hover:underline"
                        >
                          {t.title}
                        </Link>
                      </td>
                      <td className="text-[var(--color-ink-muted)]">
                        {personName(t.salesSupportUser)}
                      </td>
                      <td>
                        <StatusBadge
                          status={
                            overdue && t.status !== "COMPLETED"
                              ? "OVERDUE"
                              : t.status
                          }
                        />
                      </td>
                      <td
                        className={`tabular-nums ${
                          overdue
                            ? "font-medium text-[var(--status-danger)]"
                            : "text-[var(--color-ink-muted)]"
                        }`}
                      >
                        {formatDate(t.dueDate)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <AssignSupportPersonDrawer
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
        open={taskOpen}
        onClose={() => setTaskOpen(false)}
        profileId={profileId}
        profileName={profileName}
        activeLinks={active}
        presetLinkId={taskLinkId}
        onCreated={async () => {
          await onChanged();
        }}
      />

      <ConfirmDialog
        open={Boolean(endTarget)}
        title="End assignment?"
        message="This ends the Sales Support assignment. Open tasks must be finished or reassigned first."
        confirmLabel="End assignment"
        danger
        busy={endBusy}
        onConfirm={() => void confirmEnd()}
        onCancel={() => setEndTarget(null)}
      />
    </div>
  );
}
