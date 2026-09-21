"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  api,
  type EisenhowerCommandoOption,
  type EisenhowerTask,
  type EisenhowerWorkspace,
  type EisenhowerWorkspaceHistoryItem,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/dates";
import { personName } from "@/lib/labels";
import { seCreateHref } from "@/lib/se-workspace-nav";
import { EisenhowerMatrixBoard } from "@/components/eisenhower/EisenhowerMatrixBoard";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui";
import Link from "next/link";

type ViewMode = "latest" | "team_lead" | "commando" | "history";

function formatRange(start: string, end: string | null) {
  const from = formatDate(start);
  const to = end ? formatDate(end) : "Present";
  return `${from} – ${to}`;
}

function commandoDisplayName(option: {
  label?: string;
  commando: { firstName: string; lastName: string };
}) {
  if (option.label) return option.label;
  const name = personName(option.commando);
  return name ? `${name} (Commando)` : "Commando";
}

function OwnerBadge({
  owner,
}: {
  owner: "TEAM_LEAD" | "COMMANDO";
}) {
  const label =
    owner === "TEAM_LEAD" ? "TEAM LEAD PRIORITIES" : "COMMANDO PRIORITIES";
  return (
    <span className="inline-flex items-center rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] px-2 py-0.5 text-[0.6875rem] font-semibold tracking-[0.04em] text-[var(--color-ink-muted)]">
      {label}
    </span>
  );
}

function StatusPill({
  tone,
  children,
}: {
  tone: "ok" | "locked" | "neutral";
  children: ReactNode;
}) {
  const cls =
    tone === "ok"
      ? "bg-[var(--status-success-bg)] text-[var(--status-success)]"
      : tone === "locked"
        ? "bg-[var(--status-warning-bg,var(--color-accent-soft))] text-[var(--status-warning,var(--color-accent))]"
        : "bg-[var(--color-surface-2)] text-[var(--color-ink-muted)]";
  return (
    <span
      className={`inline-flex items-center rounded-[var(--radius-sm)] px-2 py-0.5 text-[0.75rem] font-semibold ${cls}`}
    >
      {children}
    </span>
  );
}

function UnderCommandoBanner({
  assignment,
}: {
  assignment: NonNullable<EisenhowerWorkspace["activeIntervention"]>;
}) {
  const name = personName(assignment.commando);
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-brand-soft)]/40 px-4 py-3.5 sm:px-5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill tone="locked">Under Commando</StatusPill>
        <p className="text-sm font-semibold text-[var(--color-ink)]">
          Active intervention with {name} (Commando)
        </p>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-ink-muted)]">
        Intervention #{assignment.interventionNumber} · {assignment.status} ·
        Started {formatDate(assignment.startedAt)}. {name}&apos;s priorities
        stay locked until this intervention ends.
      </p>
    </div>
  );
}

function MatrixSection({
  owner,
  title,
  subtitle,
  status,
  tasks,
  emptyTitle,
  emptyDescription,
  profileId,
  canCreate,
}: {
  owner: "TEAM_LEAD" | "COMMANDO";
  title: string;
  subtitle?: string;
  status?: ReactNode;
  tasks: EisenhowerTask[];
  emptyTitle: string;
  emptyDescription: string;
  profileId: string;
  canCreate: boolean;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <OwnerBadge owner={owner} />
          <h3 className="text-lg font-semibold tracking-[-0.02em] text-[var(--color-ink)]">
            {title}
          </h3>
          {subtitle ? (
            <p className="text-sm text-[var(--color-ink-muted)]">{subtitle}</p>
          ) : null}
        </div>
        {status}
      </div>
      {tasks.length === 0 && !canCreate ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <EisenhowerMatrixBoard
          tasks={tasks}
          profileId={profileId}
          canCreate={canCreate}
          emptyActionHref={
            canCreate ? seCreateHref(profileId, "daily-log") : undefined
          }
          emptyActionLabel={canCreate ? "Add Daily Log" : undefined}
        />
      )}
    </section>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function LockedMatrixPlaceholder() {
  const cells = [
    { title: "Do first", hint: "Important + Urgent" },
    { title: "Delegate", hint: "Not important + Urgent" },
    { title: "Schedule", hint: "Important + Not urgent" },
    { title: "Eliminate", hint: "Not important + Not urgent" },
  ];
  return (
    <div className="relative mt-5">
      <div
        className="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
        aria-hidden
      >
        {cells.map((cell) => (
          <div
            key={cell.title}
            className="min-h-[7.5rem] rounded-[var(--radius-md)] border border-dashed border-[var(--color-line)] bg-[var(--color-surface-2)]/60 px-3.5 py-3 opacity-60"
          >
            <p className="text-sm font-semibold text-[var(--color-ink-muted)]">
              {cell.title}
            </p>
            <p className="mt-0.5 text-[0.75rem] text-[var(--color-ink-subtle)]">
              {cell.hint}
            </p>
            <div className="mt-4 space-y-2">
              <div className="h-2.5 w-[80%] rounded bg-[var(--color-line)]" />
              <div className="h-2.5 w-[55%] rounded bg-[var(--color-line)]" />
            </div>
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-surface)]/55 backdrop-blur-[1px]">
        <div className="mx-4 flex max-w-sm flex-col items-center rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] px-5 py-4 text-center shadow-[var(--shadow-sm)]">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-surface-2)] text-[var(--color-ink-muted)]">
            <LockIcon />
          </span>
          <p className="mt-2.5 text-sm font-semibold text-[var(--color-ink)]">
            Matrix locked
          </p>
          <p className="mt-1 text-[0.8125rem] leading-relaxed text-[var(--color-ink-muted)]">
            Priorities stay private until the intervention is complete.
          </p>
        </div>
      </div>
    </div>
  );
}

function LockedCommandoCard({
  message,
  assignment,
}: {
  message: string;
  assignment: EisenhowerWorkspace["commando"]["assignment"];
}) {
  const name = assignment ? personName(assignment.commando) : null;
  return (
    <section className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
      <div className="border-b border-[var(--color-line)] bg-[var(--color-surface-2)]/50 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <OwnerBadge owner="COMMANDO" />
            <h3 className="flex flex-wrap items-center gap-2 text-lg font-semibold tracking-[-0.02em] text-[var(--color-ink)]">
              <LockIcon className="shrink-0 text-[var(--color-ink-muted)]" />
              {name ? `${name} (Commando)` : "Commando Priorities"}
            </h3>
            <p className="text-sm text-[var(--color-ink-muted)]">
              Intervention priorities · currently locked
            </p>
          </div>
          <StatusPill tone="locked">Locked</StatusPill>
        </div>
      </div>

      <div className="px-5 py-5">
        <p className="max-w-2xl text-sm leading-relaxed text-[var(--color-ink-muted)]">
          {message}
        </p>

        {assignment ? (
          <dl className="mt-4 grid gap-3 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-2)]/40 px-4 py-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-wide text-[var(--color-ink-subtle)]">
                Intervention
              </dt>
              <dd className="mt-0.5 font-medium text-[var(--color-ink)]">
                #{assignment.interventionNumber}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-[var(--color-ink-subtle)]">
                Commando
              </dt>
              <dd className="mt-0.5 font-medium text-[var(--color-ink)]">
                {personName(assignment.commando)} (Commando)
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-[var(--color-ink-subtle)]">
                Status
              </dt>
              <dd className="mt-0.5 font-medium text-[var(--color-ink)]">
                {assignment.status}
              </dd>
            </div>
          </dl>
        ) : null}

        <LockedMatrixPlaceholder />
      </div>
    </section>
  );
}

function HistoryList({
  items,
  onView,
}: {
  items: EisenhowerWorkspaceHistoryItem[];
  onView: (assignmentId: string) => void;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No intervention history"
        description="Completed Commando interventions and their Eisenhower records will appear here."
      />
    );
  }

  return (
    <ul className="divide-y divide-[var(--color-line)] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
      {items.map((item) => (
        <li
          key={item.assignmentId}
          className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--color-ink)]">
              Intervention #{item.interventionNumber}
            </p>
            <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">
              {personName(item.commando)} (Commando)
            </p>
            <p className="mt-1 text-[0.8125rem] text-[var(--color-ink-subtle)]">
              {formatRange(item.startedAt, item.endedAt)} · {item.status}
              {item.hasEisenhower
                ? ` · ${item.taskCount} priorit${item.taskCount === 1 ? "y" : "ies"}`
                : " · No Eisenhower record"}
            </p>
          </div>
          {item.canViewMatrix && item.hasEisenhower ? (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onView(item.assignmentId)}
            >
              View Eisenhower
            </button>
          ) : (
            <span className="text-[0.8125rem] text-[var(--color-ink-subtle)]">
              No matrix
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

type Props = {
  profileId: string;
  profileName: string;
  canCreate: boolean;
};

export function SeEisenhowerPanel({
  profileId,
  profileName,
  canCreate,
}: Props) {
  const { token } = useAuth();
  const [view, setView] = useState<ViewMode>("latest");
  const [assignmentId, setAssignmentId] = useState<string | undefined>();
  const [data, setData] = useState<EisenhowerWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.getEisenhowerWorkspace(token, {
        profileId,
        assignmentId: view === "commando" ? assignmentId : undefined,
      });
      setData(res.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Eisenhower");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [token, profileId, view, assignmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filterValue = useMemo(() => {
    if (view === "commando") {
      const id = assignmentId ?? data?.commando.assignment?.id;
      return id ? `commando:${id}` : "commando:";
    }
    return view;
  }, [view, assignmentId, data?.commando.assignment?.id]);

  const commandoOptions: EisenhowerCommandoOption[] =
    data?.commandoOptions ?? [];

  function onFilterChange(raw: string) {
    if (raw === "latest" || raw === "team_lead" || raw === "history") {
      setView(raw);
      setAssignmentId(undefined);
      return;
    }
    if (raw.startsWith("commando:")) {
      const id = raw.slice("commando:".length);
      setAssignmentId(id || undefined);
      setView("commando");
    }
  }

  function onViewHistory(id: string) {
    setAssignmentId(id);
    setView("commando");
  }

  const tlSubtitle = data?.teamLead.updatedBy
    ? `Updated by ${personName(data.teamLead.updatedBy)}${
        data.teamLead.updatedAt
          ? ` · ${formatDate(data.teamLead.updatedAt)}`
          : ""
      }`
    : "Current management priorities";

  const selectedOption = assignmentId
    ? commandoOptions.find((o) => o.assignmentId === assignmentId)
    : undefined;

  const commandoSubtitle = (() => {
    if (!data?.commando.assignment) return undefined;
    const a = data.commando.assignment;
    const name = `${personName(a.commando)} (Commando)`;
    const parts = [`Intervention #${a.interventionNumber}`, name];
    if (a.endedAt) parts.push(`Ended ${formatDate(a.endedAt)}`);
    else if (data.commando.updatedBy) {
      parts.push(`Updated by ${personName(data.commando.updatedBy)}`);
    }
    return parts.join(" · ");
  })();

  const underCommando =
    Boolean(data?.lifecycle.isDuringCommando && data.activeIntervention);
  /** Lock UI is SE-only; Commandos and Team Leads can view active matrices. */
  const seSeesLockedCommando =
    data?.latestFocus === "TEAM_LEAD_WITH_LOCKED_COMMANDO" ||
    data?.commando.state === "LOCKED";
  const canCreateCommandoMatrix =
    canCreate && data?.commando.assignment?.status === "ACTIVE";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-2xl">
          <h2 className="text-[1.625rem] font-semibold tracking-[-0.03em] text-[var(--color-ink)] sm:text-[1.75rem]">
            Eisenhower
          </h2>
          <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-[var(--color-ink-muted)]">
            Latest priorities for {profileName}. Team Lead and Commando matrices
            stay separate — history is never overwritten.
          </p>
        </div>
        {canCreate ? (
          <Link
            href={seCreateHref(profileId, "daily-log")}
            className="btn btn-secondary btn-sm"
          >
            Add Daily Log
          </Link>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label
          htmlFor="eisenhower-view"
          className="text-sm font-medium text-[var(--color-ink-muted)]"
        >
          View
        </label>
        <select
          id="eisenhower-view"
          className="min-w-[14rem] max-w-full rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm font-medium text-[var(--color-ink)] shadow-[var(--shadow-sm)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
          value={filterValue}
          onChange={(e) => onFilterChange(e.target.value)}
        >
          <option value="latest">Latest</option>
          <option value="team_lead">Team Lead</option>
          {commandoOptions.length > 0 ? (
            <optgroup label="Commando interventions">
              {commandoOptions.map((opt) => {
                const suffix =
                  opt.status === "ACTIVE"
                    ? " · Active"
                    : ` · #${opt.interventionNumber}`;
                return (
                  <option
                    key={opt.assignmentId}
                    value={`commando:${opt.assignmentId}`}
                  >
                    {commandoDisplayName(opt)}
                    {suffix}
                  </option>
                );
              })}
            </optgroup>
          ) : (
            <option value="commando:" disabled>
              Commando (none yet)
            </option>
          )}
          <option value="history">Intervention History</option>
        </select>
      </div>

      {loading ? <LoadingState label="Loading Eisenhower…" /> : null}
      {error ? <ErrorState message={error} /> : null}

      {!loading && !error && data ? (
        <>
          {view === "latest" ? (
            <div className="space-y-6">
              {underCommando && data.activeIntervention && !seSeesLockedCommando ? (
                <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-brand-soft)]/40 px-4 py-3.5 sm:px-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone="ok">Active intervention</StatusPill>
                    <p className="text-sm font-semibold text-[var(--color-ink)]">
                      Managing with{" "}
                      {personName(data.activeIntervention.commando)} (Commando)
                    </p>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-ink-muted)]">
                    Intervention #{data.activeIntervention.interventionNumber} ·
                    Started {formatDate(data.activeIntervention.startedAt)}.
                    Commando priorities are visible to managers during the
                    intervention.
                  </p>
                </div>
              ) : null}

              {seSeesLockedCommando && data.activeIntervention ? (
                <>
                  <UnderCommandoBanner assignment={data.activeIntervention} />
                  <LockedCommandoCard
                    message={
                      data.commando.lockedMessage ??
                      "Your Commando is currently managing your intervention priorities. These priorities will become visible after the intervention ends."
                    }
                    assignment={
                      data.commando.assignment ?? data.activeIntervention
                    }
                  />
                  <MatrixSection
                    owner="TEAM_LEAD"
                    title="Team Lead Priorities"
                    subtitle={tlSubtitle}
                    status={<StatusPill tone="ok">Available</StatusPill>}
                    tasks={data.teamLead.tasks}
                    emptyTitle="No Team Lead priorities have been added yet."
                    emptyDescription="Team Lead priorities appear here once Daily Logs place them on the board."
                    profileId={profileId}
                    canCreate={false}
                  />
                </>
              ) : data.latestFocus === "COMMANDO" ? (
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.06em] text-[var(--color-ink-subtle)]">
                    Latest Priorities
                  </p>
                  <MatrixSection
                    owner="COMMANDO"
                    title={
                      data.commando.assignment
                        ? `${personName(data.commando.assignment.commando)} (Commando)`
                        : "Commando Priorities"
                    }
                    subtitle={
                      data.commando.assignment?.status === "ACTIVE"
                        ? commandoSubtitle
                          ? `Active · ${commandoSubtitle}`
                          : "Active Commando priorities"
                        : commandoSubtitle
                          ? `Finalized · ${commandoSubtitle}`
                          : "Finalized Commando priorities"
                    }
                    status={
                      <StatusPill
                        tone={
                          data.commando.assignment?.status === "ACTIVE"
                            ? "ok"
                            : "neutral"
                        }
                      >
                        {data.commando.assignment?.status === "ACTIVE"
                          ? "Active"
                          : "Available"}
                      </StatusPill>
                    }
                    tasks={data.commando.tasks ?? []}
                    emptyTitle="No Commando priorities yet"
                    emptyDescription="Add a Daily Log with urgency and importance to place priorities on this board."
                    profileId={profileId}
                    canCreate={canCreateCommandoMatrix}
                  />
                </div>
              ) : (
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.06em] text-[var(--color-ink-subtle)]">
                    Latest Priorities
                  </p>
                  <MatrixSection
                    owner="TEAM_LEAD"
                    title="Team Lead Priorities"
                    subtitle={tlSubtitle}
                    status={<StatusPill tone="ok">Available</StatusPill>}
                    tasks={data.teamLead.tasks}
                    emptyTitle="No Team Lead priorities have been added yet."
                    emptyDescription="Team Lead priorities appear here once Daily Logs place them on the board."
                    profileId={profileId}
                    canCreate={canCreate}
                  />
                </div>
              )}
            </div>
          ) : null}

          {view === "team_lead" ? (
            <MatrixSection
              owner="TEAM_LEAD"
              title="Team Lead Priorities"
              subtitle={tlSubtitle}
              status={<StatusPill tone="ok">Available</StatusPill>}
              tasks={data.teamLead.tasks}
              emptyTitle="No Team Lead priorities have been added yet."
              emptyDescription="Team Lead priorities appear here once they are added for this Sales Executive."
              profileId={profileId}
              canCreate={canCreate}
            />
          ) : null}

          {view === "commando" ? (
            data.commando.state === "LOCKED" ||
            selectedOption?.lockedForViewer ? (
              <LockedCommandoCard
                message={
                  data.commando.lockedMessage ??
                  "Your Commando is currently managing your intervention priorities."
                }
                assignment={
                  data.commando.assignment ?? data.activeIntervention
                }
              />
            ) : (
              <MatrixSection
                owner="COMMANDO"
                title={
                  data.commando.assignment
                    ? `${personName(data.commando.assignment.commando)} (Commando)`
                    : "Commando Priorities"
                }
                subtitle={commandoSubtitle}
                status={
                  <StatusPill
                    tone={
                      data.commando.assignment?.status === "ACTIVE"
                        ? "ok"
                        : "neutral"
                    }
                  >
                    {data.commando.assignment?.status === "ACTIVE"
                      ? "Active"
                      : data.commando.state === "AVAILABLE"
                        ? "Available"
                        : "Empty"}
                  </StatusPill>
                }
                tasks={data.commando.tasks ?? []}
                emptyTitle="No Commando priorities yet"
                emptyDescription={
                  data.commando.assignment?.status === "ACTIVE"
                    ? "Add a Daily Log with urgency and importance to place priorities on this board."
                    : "Completed interventions keep their own Eisenhower records."
                }
                profileId={profileId}
                canCreate={canCreateCommandoMatrix}
              />
            )
          ) : null}

          {view === "history" ? (
            <HistoryList
              items={data.interventionHistory}
              onView={onViewHistory}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
