"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  api,
  type SalesSupportLink,
  type SupportTask,
  type SwotItem,
} from "@/lib/api";
import { formatDate } from "@/lib/dates";
import { personName } from "@/lib/labels";
import { StatusBadge } from "@/components/StatusBadge";
import { SearchableSelect } from "@/components/SearchableSelect";
import {
  ButtonLink,
  EmptyState,
  ErrorState,
  PageHeader,
  PulseGrid,
  PulseStat,
  Skeleton,
  TableFrame,
  TextInput,
} from "@/components/ui";

type LoadState = "loading" | "ready" | "error";

type WorkBucket = "overdue" | "today" | "blocked" | "upcoming";

type WorkItem = {
  id: string;
  bucket: WorkBucket;
  task: SupportTask;
};

function startOfDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function isDueToday(task: SupportTask) {
  if (!task.dueDate || task.isOverdue || task.status === "COMPLETED") {
    return false;
  }
  const due = new Date(task.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  return startOfDay(due) === startOfDay();
}

function isUpcoming(task: SupportTask) {
  if (!task.dueDate || task.isOverdue || task.status === "COMPLETED") {
    return false;
  }
  if (task.status === "BLOCKED") return false;
  const due = startOfDay(new Date(task.dueDate));
  const today = startOfDay();
  const inWeek = today + 7 * 86_400_000;
  return due > today && due <= inWeek;
}

/** Map API status to Support-facing label (PENDING = assigned in UI). */
function supportStatusLabel(status: SupportTask["status"]) {
  if (status === "PENDING") return "Assigned";
  if (status === "IN_PROGRESS") return "In Progress";
  return status.replaceAll("_", " ");
}

function statusBadgeStatus(task: SupportTask) {
  if (task.isOverdue && task.status !== "COMPLETED" && task.status !== "BLOCKED") {
    return "OVERDUE";
  }
  return task.status;
}

function SupportSkeleton() {
  return (
    <div
      className="space-y-6"
      aria-busy="true"
      aria-label="Loading Sales Support dashboard"
    >
      <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)]">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="border-r border-b border-[var(--color-line)] px-4 py-3.5 last:border-r-0"
            >
              <Skeleton className="h-3 w-16" />
              <Skeleton className="mt-2 h-7 w-10" />
            </div>
          ))}
        </div>
      </div>
      <Skeleton className="h-56 w-full rounded-[var(--radius-md)]" />
    </div>
  );
}

export function SalesSupportDashboard({
  token,
  firstName,
}: {
  token: string;
  firstName: string;
  roleCode?: string;
}) {
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [links, setLinks] = useState<SalesSupportLink[]>([]);
  const [activeTasks, setActiveTasks] = useState<SupportTask[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<SupportTask[]>([]);
  const [blockedTasks, setBlockedTasks] = useState<SupportTask[]>([]);
  const [selfSwot, setSelfSwot] = useState<SwotItem | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [seFilter, setSeFilter] = useState("");
  const [assignedByFilter, setAssignedByFilter] = useState("");
  const [dueFilter, setDueFilter] = useState<"" | "today" | "overdue" | "upcoming">(
    "",
  );

  const load = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const [linksRes, activeRes, overdueRes, blockedRes, swotRes] =
        await Promise.all([
          api.getSalesSupportLinks(token, { isActive: true, pageSize: 100 }),
          api.getSupportTasks(token, { view: "active", pageSize: 100 }),
          api.getSupportTasks(token, { filter: "overdue", pageSize: 50 }),
          api.getSupportTasks(token, {
            filter: "blocked",
            pageSize: 50,
          }),
          api
            .getSwotList(token, {
              source: "SALES_SUPPORT_EXECUTIVE",
              pageSize: 1,
            })
            .catch(() => null),
        ]);
      setLinks(linksRes.data.links);
      setActiveTasks(activeRes.data.tasks);
      setOverdueTasks(overdueRes.data.tasks);
      setBlockedTasks(blockedRes.data.tasks);
      setSelfSwot(swotRes?.data.items[0] ?? null);
      setState("ready");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't load this dashboard. Please try again.",
      );
      setState("error");
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const dueTodayTasks = useMemo(
    () => activeTasks.filter(isDueToday),
    [activeTasks],
  );

  const inProgressCount = useMemo(
    () => activeTasks.filter((t) => t.status === "IN_PROGRESS").length,
    [activeTasks],
  );

  const assignedByOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of activeTasks) {
      map.set(t.assignedById, personName(t.assignedBy));
    }
    return [...map.entries()]
      .map(([id, label]) => ({ value: id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [activeTasks]);

  const seOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const link of links) {
      map.set(link.salesExecutiveProfileId, link.profile.displayName);
    }
    for (const t of activeTasks) {
      map.set(t.salesExecutiveProfileId, t.profile.displayName);
    }
    return [...map.entries()]
      .map(([id, label]) => ({ value: id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [links, activeTasks]);

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activeTasks.filter((t) => {
      if (statusFilter && t.status !== statusFilter) return false;
      if (priorityFilter && t.priority !== priorityFilter) return false;
      if (seFilter && t.salesExecutiveProfileId !== seFilter) return false;
      if (assignedByFilter && t.assignedById !== assignedByFilter) return false;
      if (dueFilter === "today" && !isDueToday(t)) return false;
      if (dueFilter === "overdue" && !t.isOverdue) return false;
      if (dueFilter === "upcoming" && !isUpcoming(t)) return false;
      if (q) {
        const hay = [
          t.title,
          t.profile.displayName,
          personName(t.assignedBy),
          t.purpose ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    activeTasks,
    search,
    statusFilter,
    priorityFilter,
    seFilter,
    assignedByFilter,
    dueFilter,
  ]);

  const workQueue = useMemo((): WorkItem[] => {
    const items: WorkItem[] = [];
    const seen = new Set<string>();

    for (const t of overdueTasks) {
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      items.push({ id: t.id, bucket: "overdue", task: t });
    }
    for (const t of dueTodayTasks) {
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      items.push({ id: t.id, bucket: "today", task: t });
    }
    for (const t of blockedTasks) {
      if (seen.has(t.id) || t.status === "COMPLETED") continue;
      seen.add(t.id);
      items.push({ id: t.id, bucket: "blocked", task: t });
    }
    for (const t of activeTasks.filter(isUpcoming)) {
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      items.push({ id: t.id, bucket: "upcoming", task: t });
    }
    return items.slice(0, 10);
  }, [overdueTasks, dueTodayTasks, blockedTasks, activeTasks]);

  const seRows = useMemo(() => {
    return links.map((link) => {
      const seTasks = activeTasks.filter(
        (t) => t.salesExecutiveProfileId === link.salesExecutiveProfileId,
      );
      const overdue = seTasks.filter((t) => t.isOverdue).length;
      return {
        link,
        activeCount: seTasks.length,
        overdueCount: overdue,
      };
    });
  }, [links, activeTasks]);

  const guidanceTask = useMemo(() => {
    const candidates = [
      ...overdueTasks,
      ...dueTodayTasks,
      ...activeTasks.filter((t) => t.status === "IN_PROGRESS"),
      ...activeTasks,
    ];
    return (
      candidates.find(
        (t) =>
          (t.shouldDo?.length ?? 0) > 0 || (t.shouldNotDo?.length ?? 0) > 0,
      ) ?? null
    );
  }, [overdueTasks, dueTodayTasks, activeTasks]);

  const pulse = [
    {
      label: "Active relationships",
      value: links.length,
      hint: "SEs you support",
      href: "#supported-ses",
      warn: false,
      tone: "brand" as const,
    },
    {
      label: "Assigned tasks",
      value: activeTasks.length,
      hint: "Open support work",
      href: "#my-tasks",
      warn: false,
      tone: "accent" as const,
    },
    {
      label: "In progress",
      value: inProgressCount,
      hint: "Currently working",
      href: "#my-tasks",
      warn: false,
      tone: "info" as const,
    },
    {
      label: "Due today",
      value: dueTodayTasks.length,
      hint: "Needs attention today",
      href: "#today-next",
      warn: dueTodayTasks.length > 0,
      tone: dueTodayTasks.length > 0 ? ("warn" as const) : ("success" as const),
    },
    {
      label: "Overdue",
      value: overdueTasks.length,
      hint: "Past due date",
      href: "#today-next",
      warn: overdueTasks.length > 0,
      tone: overdueTasks.length > 0 ? ("danger" as const) : ("success" as const),
    },
    {
      label: "Blocked",
      value: blockedTasks.length,
      hint: "Waiting on a blocker",
      href: "#today-next",
      warn: blockedTasks.length > 0,
      tone: blockedTasks.length > 0 ? ("warn" as const) : ("brand" as const),
    },
  ];

  const bucketLabel = (b: WorkBucket) => {
    if (b === "overdue") return "Overdue";
    if (b === "today") return "Due today";
    if (b === "blocked") return "Blocked";
    return "Upcoming";
  };

  const taskHref = (id: string) =>
    `/my-tasks/${id}?returnTo=${encodeURIComponent("/dashboard")}`;

  return (
    <div className="space-y-6 lg:space-y-7">
      <PageHeader
        eyebrow="Sales Support"
        title="Sales Support Dashboard"
        description={`Here's your support workload and what needs attention today${firstName ? ` · ${firstName}` : ""}`}
        actions={
          <div className="flex flex-wrap gap-2">
            {selfSwot ? (
              <ButtonLink href={`/swot/${selfSwot.id}`} size="sm">
                View My SWOT
              </ButtonLink>
            ) : (
              <ButtonLink href="/swot/new" size="sm">
                Add My SWOT
              </ButtonLink>
            )}
            <ButtonLink href="/work-log" variant="secondary" size="sm">
              + Add Work Log
            </ButtonLink>
            <ButtonLink href="/my-tasks" variant="ghost" size="sm">
              All my tasks
            </ButtonLink>
            <ButtonLink href="/sync-evaluations" variant="ghost" size="sm">
              Sync evaluations
            </ButtonLink>
          </div>
        }
      />

      {state === "loading" && <SupportSkeleton />}
      {state === "error" && error && (
        <ErrorState message={error} onRetry={() => void load()} />
      )}

      {state === "ready" && (
        <>
          {/* Support pulse */}
          <section aria-labelledby="support-pulse-heading">
            <div className="mb-2.5">
              <h2 id="support-pulse-heading" className="text-section-title">
                Support pulse
              </h2>
              <p className="mt-0.5 text-meta">
                Relationships and task load — Team Lead remains SE owner
              </p>
            </div>
            <PulseGrid columns={6}>
                {pulse.map((cell) => (
                  <PulseStat key={cell.label} {...cell} />
                ))}
            </PulseGrid>
          </section>

          {/* Today / next */}
          <section
            id="today-next"
            aria-labelledby="today-next-heading"
            className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]"
          >
            <div className="border-b border-[var(--color-line)] bg-[var(--color-surface-2)] px-4 py-3.5 sm:px-5">
              <h2 id="today-next-heading" className="text-section-title">
                Today / next work
              </h2>
              <p className="mt-0.5 text-meta">
                Overdue → due today → blocked → upcoming
              </p>
            </div>
            {workQueue.length === 0 ? (
              <div className="flex items-start gap-3 px-4 py-6 sm:px-5">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--status-success-bg)] text-[var(--status-success)]">
                  <CheckCircle2 size={16} aria-hidden />
                </span>
                <div>
                  <p className="text-[13px] font-medium text-[var(--status-success)]">
                    No urgent support work
                  </p>
                  <p className="mt-1 text-meta">
                    Overdue, due today, blocked, and upcoming tasks will appear
                    here.
                  </p>
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--color-line)]">
                {workQueue.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 sm:px-5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge
                          status={
                            item.bucket === "overdue"
                              ? "OVERDUE"
                              : item.bucket === "blocked"
                                ? "BLOCKED"
                                : item.bucket === "today"
                                  ? "NEEDS_ATTENTION"
                                  : "PENDING"
                          }
                          label={bucketLabel(item.bucket)}
                        />
                        <p className="text-[13px] font-medium text-[var(--color-ink)]">
                          {item.task.title}
                        </p>
                      </div>
                      <p className="mt-1 text-meta">
                        <Link
                          href={`/profiles/${item.task.salesExecutiveProfileId}`}
                          className="font-medium text-[var(--color-ink)] hover:underline"
                        >
                          {item.task.profile.displayName}
                        </Link>
                        {" · "}
                        {item.task.priority}
                        {item.task.dueDate
                          ? ` · Due ${formatDate(item.task.dueDate)}`
                          : ""}
                        {" · "}
                        {supportStatusLabel(item.task.status)}
                      </p>
                    </div>
                    <Link
                      href={taskHref(item.task.id)}
                      className="shrink-0 text-[13px] font-medium text-[var(--color-brand)] hover:underline"
                    >
                      Open task
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* My support tasks (primary) */}
          <section
            id="my-tasks"
            aria-labelledby="my-tasks-heading"
            className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-line)] bg-[var(--color-surface-2)] px-4 py-3.5 sm:px-5">
              <div>
                <p className="text-eyebrow">Primary</p>
                <h2
                  id="my-tasks-heading"
                  className="mt-1 text-section-title text-[1.05rem]"
                >
                  My support tasks
                </h2>
                <p className="mt-0.5 text-meta">
                  Shared task model — same records across Team Lead, Commando,
                  and SE views
                </p>
              </div>
              <Link
                href="/my-tasks"
                className="text-[13px] font-medium text-[var(--color-brand)] hover:underline"
              >
                Full task list
              </Link>
            </div>

            <div className="border-b border-[var(--color-line)] px-4 py-3 sm:px-5">
              <div className="flex flex-wrap items-end gap-3">
                <TextInput
                  label="Search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Task, SE, assigned by…"
                />
                <SearchableSelect
                  label="Status"
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { value: "", label: "All statuses" },
                    { value: "PENDING", label: "Assigned" },
                    { value: "ACCEPTED", label: "Accepted" },
                    { value: "IN_PROGRESS", label: "In Progress" },
                    { value: "BLOCKED", label: "Blocked" },
                  ]}
                />
                <SearchableSelect
                  label="Priority"
                  value={priorityFilter}
                  onChange={setPriorityFilter}
                  options={[
                    { value: "", label: "All priorities" },
                    { value: "HIGH", label: "High" },
                    { value: "MEDIUM", label: "Medium" },
                    { value: "LOW", label: "Low" },
                  ]}
                />
                <SearchableSelect
                  label="Due"
                  value={dueFilter}
                  onChange={(v) =>
                    setDueFilter(v as "" | "today" | "overdue" | "upcoming")
                  }
                  options={[
                    { value: "", label: "Any due date" },
                    { value: "overdue", label: "Overdue" },
                    { value: "today", label: "Due today" },
                    { value: "upcoming", label: "Upcoming (7d)" },
                  ]}
                />
                <SearchableSelect
                  label="Sales Executive"
                  value={seFilter}
                  onChange={setSeFilter}
                  options={[
                    { value: "", label: "All SEs" },
                    ...seOptions,
                  ]}
                />
                <SearchableSelect
                  label="Assigned by"
                  value={assignedByFilter}
                  onChange={setAssignedByFilter}
                  options={[
                    { value: "", label: "Anyone" },
                    ...assignedByOptions,
                  ]}
                />
              </div>
            </div>

            {activeTasks.length === 0 ? (
              <div className="px-4 py-6 sm:px-5">
                <EmptyState
                  title="No assigned support tasks"
                  description="When Team Lead or Commando assigns you work, it will appear here."
                  actionHref="/my-tasks"
                  actionLabel="Open my tasks"
                  icon="tasks"
                />
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="px-4 py-6 sm:px-5">
                <p className="text-[13px] font-medium text-[var(--color-ink)]">
                  No tasks match these filters
                </p>
                <p className="mt-1 text-meta">
                  Clear filters to see your full active queue.
                </p>
              </div>
            ) : (
              <TableFrame>
                <table className="w-full min-w-[56rem] text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-[var(--color-line)] bg-[var(--color-surface-2)]/60 text-eyebrow">
                      <th className="px-4 py-2.5 font-semibold sm:px-5">
                        Task
                      </th>
                      <th className="px-3 py-2.5 font-semibold">
                        Sales Executive
                      </th>
                      <th className="px-3 py-2.5 font-semibold">Assigned by</th>
                      <th className="px-3 py-2.5 font-semibold">Due</th>
                      <th className="px-3 py-2.5 font-semibold">Priority</th>
                      <th className="px-3 py-2.5 font-semibold">Status</th>
                      <th className="px-3 py-2.5 font-semibold">DO / DON&apos;T</th>
                      <th className="px-4 py-2.5 font-semibold sm:px-5">
                        <span className="sr-only">Action</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-line)]">
                    {filteredTasks.slice(0, 25).map((t) => {
                      const doText =
                        t.shouldDo?.map((d) => d.text).join("; ") || "";
                      const dontText =
                        t.shouldNotDo?.map((d) => d.text).join("; ") || "";
                      return (
                        <tr
                          key={t.id}
                          className="transition hover:bg-[var(--color-surface-2)]/50"
                        >
                          <td className="px-4 py-3 align-top sm:px-5">
                            <Link
                              href={taskHref(t.id)}
                              className="font-medium text-[var(--color-ink)] hover:underline"
                            >
                              {t.title}
                            </Link>
                            {t.purpose ? (
                              <p className="mt-0.5 line-clamp-1 text-meta">
                                {t.purpose}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-3 py-3 align-top">
                            <Link
                              href={`/profiles/${t.salesExecutiveProfileId}`}
                              className="font-medium text-[var(--color-ink)] hover:underline"
                            >
                              {t.profile.displayName}
                            </Link>
                          </td>
                          <td className="px-3 py-3 align-top text-meta">
                            {personName(t.assignedBy)}
                          </td>
                          <td
                            className={`px-3 py-3 align-top tabular-nums ${
                              t.isOverdue
                                ? "font-medium text-[var(--status-danger)]"
                                : "text-meta"
                            }`}
                          >
                            {formatDate(t.dueDate)}
                            {t.isOverdue ? " · Overdue" : ""}
                          </td>
                          <td className="px-3 py-3 align-top">
                            <StatusBadge status={t.priority} />
                          </td>
                          <td className="px-3 py-3 align-top">
                            <StatusBadge
                              status={statusBadgeStatus(t)}
                              label={
                                t.isOverdue && t.status !== "BLOCKED"
                                  ? "Overdue"
                                  : supportStatusLabel(t.status)
                              }
                            />
                          </td>
                          <td className="max-w-[12rem] px-3 py-3 align-top text-meta">
                            {doText || dontText ? (
                              <span className="line-clamp-2">
                                {doText ? `DO: ${doText}` : ""}
                                {doText && dontText ? " · " : ""}
                                {dontText ? `DON'T: ${dontText}` : ""}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-4 py-3 align-top text-right sm:px-5">
                            <Link
                              href={taskHref(t.id)}
                              className="text-[13px] font-medium text-[var(--color-brand)] hover:underline"
                            >
                              Open
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </TableFrame>
            )}
          </section>

          {/* SEs I support + Task guidance */}
          <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
            <section
              id="supported-ses"
              aria-labelledby="supported-ses-heading"
              className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] lg:col-span-7"
            >
              <div className="border-b border-[var(--color-line)] bg-[var(--color-surface-2)] px-4 py-3.5 sm:px-5">
                <h2 id="supported-ses-heading" className="text-section-title">
                  Sales Executives I support
                </h2>
                <p className="mt-0.5 text-meta">
                  Active support relationships — open the SE workspace with
                  context preserved
                </p>
              </div>
              {seRows.length === 0 ? (
                <div className="px-4 py-6 sm:px-5">
                  <p className="text-[13px] font-medium text-[var(--color-ink)]">
                    No active support relationships
                  </p>
                  <p className="mt-1 text-meta">
                    When a Team Lead assigns you to a Sales Executive, they will
                    appear here.
                  </p>
                </div>
              ) : (
                <TableFrame>
                  <table className="w-full min-w-[32rem] text-left text-[13px]">
                    <thead>
                      <tr className="border-b border-[var(--color-line)] text-eyebrow">
                        <th className="px-4 py-2.5 font-semibold sm:px-5">
                          Sales Executive
                        </th>
                        <th className="px-3 py-2.5 font-semibold">Team</th>
                        <th className="px-3 py-2.5 font-semibold">
                          Relationship
                        </th>
                        <th className="px-3 py-2.5 font-semibold">Tasks</th>
                        <th className="px-4 py-2.5 font-semibold sm:px-5">
                          Overdue
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-line)]">
                      {seRows.map(({ link, activeCount, overdueCount }) => (
                        <tr
                          key={link.id}
                          className="transition hover:bg-[var(--color-surface-2)]/50"
                        >
                          <td className="px-4 py-3 align-top sm:px-5">
                            <Link
                              href={`/profiles/${link.salesExecutiveProfileId}`}
                              className="font-medium text-[var(--color-ink)] hover:underline"
                            >
                              {link.profile.displayName}
                            </Link>
                          </td>
                          <td className="px-3 py-3 align-top text-meta">
                            {link.profile.team?.name ?? "—"}
                          </td>
                          <td className="px-3 py-3 align-top">
                            <StatusBadge
                              status="ACTIVE"
                              label={
                                link.responsibilityType?.trim() || "Active"
                              }
                            />
                          </td>
                          <td className="px-3 py-3 align-top tabular-nums text-meta">
                            {activeCount}
                          </td>
                          <td
                            className={`px-4 py-3 align-top tabular-nums sm:px-5 ${
                              overdueCount > 0
                                ? "font-medium text-[var(--status-danger)]"
                                : "text-meta"
                            }`}
                          >
                            {overdueCount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableFrame>
              )}
            </section>

            <section
              aria-labelledby="guidance-heading"
              className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] lg:col-span-5"
            >
              <div className="border-b border-[var(--color-line)] bg-[var(--color-surface-2)] px-4 py-3.5 sm:px-5">
                <h2 id="guidance-heading" className="text-section-title">
                  Task guidance
                </h2>
                <p className="mt-0.5 text-meta">
                  DO / DON&apos;T from your highest-priority guided task
                </p>
              </div>
              {!guidanceTask ? (
                <div className="px-4 py-6 sm:px-5">
                  <p className="text-[13px] font-medium text-[var(--color-ink)]">
                    No guidance on current tasks
                  </p>
                  <p className="mt-1 text-meta">
                    When a task includes DO / DON&apos;T instructions, they will
                    appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 px-4 py-4 sm:px-5">
                  <div>
                    <Link
                      href={taskHref(guidanceTask.id)}
                      className="text-[13px] font-medium text-[var(--color-ink)] hover:underline"
                    >
                      {guidanceTask.title}
                    </Link>
                    <p className="mt-0.5 text-meta">
                      {guidanceTask.profile.displayName}
                      {guidanceTask.dueDate
                        ? ` · Due ${formatDate(guidanceTask.dueDate)}`
                        : ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-eyebrow text-[var(--status-success)]">
                      DO
                    </p>
                    {guidanceTask.shouldDo?.length ? (
                      <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[13px] text-[var(--color-ink)]">
                        {guidanceTask.shouldDo.map((d) => (
                          <li key={d.id}>{d.text}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-meta">No DO guidance stored.</p>
                    )}
                  </div>
                  <div>
                    <p className="text-eyebrow text-[var(--status-danger)]">
                      DON&apos;T
                    </p>
                    {guidanceTask.shouldNotDo?.length ? (
                      <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[13px] text-[var(--color-ink)]">
                        {guidanceTask.shouldNotDo.map((d) => (
                          <li key={d.id}>{d.text}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-meta">
                        No DON&apos;T guidance stored.
                      </p>
                    )}
                  </div>
                  <Link
                    href={taskHref(guidanceTask.id)}
                    className="inline-flex text-[13px] font-medium text-[var(--color-brand)] hover:underline"
                  >
                    Open full task detail
                  </Link>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
