"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  api,
  type SalesSupportLink,
  type SupportTask,
  type SwotItem,
} from "@/lib/api";
import { formatDate } from "@/lib/dates";
import { personName } from "@/lib/labels";
import { useSwotDetailHref } from "@/lib/swot-display";
import { StatusBadge } from "@/components/StatusBadge";
import { SearchableSelect } from "@/components/SearchableSelect";
import {
  Avatar,
  ButtonLink,
  EmptyState,
  ErrorState,
  PageHeader,
  TextInput,
} from "@/components/ui";
import {
  DashEmpty,
  DashHero,
  DashPanel,
  DashSkeleton,
  HealthSummary,
  KpiStat,
  type SignalTone,
} from "@/components/dashboard/DashboardKit";

type LoadState = "loading" | "ready" | "error";

type WorkBucket = "overdue" | "today" | "blocked" | "upcoming";

type WorkItem = {
  id: string;
  bucket: WorkBucket;
  task: SupportTask;
};

const BUCKET_BADGE: Record<WorkBucket, { status: string; label: string }> = {
  overdue: { status: "OVERDUE", label: "Overdue" },
  today: { status: "DUE_TODAY", label: "Due today" },
  blocked: { status: "BLOCKED", label: "Blocked" },
  upcoming: { status: "UPCOMING", label: "Upcoming" },
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

function needsAttention(task: SupportTask) {
  return task.isOverdue || task.status === "BLOCKED";
}

/** Map API status to Support-facing label (PENDING = assigned in UI). */
function supportStatusLabel(status: SupportTask["status"]) {
  if (status === "PENDING") return "Assigned";
  if (status === "IN_PROGRESS") return "In Progress";
  return status.replaceAll("_", " ");
}

/** "Assigned" is a neutral state here; amber is reserved for due-now signals. */
function statusBadgeStatus(task: SupportTask) {
  if (task.isOverdue && task.status !== "COMPLETED" && task.status !== "BLOCKED") {
    return "OVERDUE";
  }
  if (task.status === "PENDING") return "WATCH";
  return task.status;
}

function taskSignal(task: SupportTask): SignalTone {
  if (task.isOverdue && task.status !== "BLOCKED") return "critical";
  if (task.status === "BLOCKED" || isDueToday(task)) return "warning";
  return "positive";
}

export function SalesSupportDashboard({
  token,
  firstName,
}: {
  token: string;
  firstName: string;
  roleCode?: string;
}) {
  const swotHref = useSwotDetailHref();
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
              subjectType: "EXECUTIVE",
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

  const attentionCount = useMemo(
    () => activeTasks.filter(needsAttention).length,
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

  const kpis: {
    label: string;
    value: number;
    hint: string;
    href: string;
    tone: SignalTone;
  }[] = [
    {
      label: "Overdue",
      value: overdueTasks.length,
      hint: "Past due date",
      href: "#today-next",
      tone: overdueTasks.length > 0 ? "critical" : "neutral",
    },
    {
      label: "Due today",
      value: dueTodayTasks.length,
      hint: "Needs attention today",
      href: "#today-next",
      tone: dueTodayTasks.length > 0 ? "warning" : "neutral",
    },
    {
      label: "Blocked",
      value: blockedTasks.length,
      hint: "Waiting on a blocker",
      href: "#today-next",
      tone: blockedTasks.length > 0 ? "warning" : "neutral",
    },
    {
      label: "Supported SEs",
      value: links.length,
      hint: "Active support relationships",
      href: "#supported-ses",
      tone: "neutral",
    },
  ];

  const taskHref = (id: string) =>
    `/my-tasks/${id}?returnTo=${encodeURIComponent("/dashboard")}`;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sales Support"
        title="Sales Support Dashboard"
        description={`Here's your support workload and what needs attention today${firstName ? ` · ${firstName}` : ""}`}
        actions={
          <div className="flex flex-wrap gap-2">
            {selfSwot ? (
              <ButtonLink href={swotHref(selfSwot.id)} size="sm">
                View My SWOT
              </ButtonLink>
            ) : (
              <ButtonLink href="/swot/new" size="sm">
                Add My SWOT
              </ButtonLink>
            )}
            <ButtonLink href="/work-log" variant="outline" size="sm">
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

      {state === "loading" && (
        <DashSkeleton label="Loading Sales Support dashboard" />
      )}
      {state === "error" && error && (
        <ErrorState message={error} onRetry={() => void load()} />
      )}

      {state === "ready" && (
        <>
          <DashHero
            anchor={
              <HealthSummary
                title="Task health"
                healthy={activeTasks.length - attentionCount}
                attention={attentionCount}
                healthyLabel="On schedule"
                attentionLabel="Overdue or blocked"
                emptyText="No open support tasks"
              />
            }
          >
            {kpis.map((kpi) => (
              <KpiStat key={kpi.label} {...kpi} />
            ))}
          </DashHero>

          <div className="grid gap-5 lg:grid-cols-12 lg:items-start">
            <DashPanel
              id="today-next"
              tone="brand"
              title="Today / next work"
              description="Overdue, due today, blocked, then upcoming"
              className="lg:col-span-7"
            >
              {workQueue.length === 0 ? (
                <DashEmpty
                  tone="positive"
                  title="No urgent support work"
                  description="Overdue, due today, blocked, and upcoming tasks will appear here."
                />
              ) : (
                <ul className="dash-list">
                  {workQueue.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-start justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge {...BUCKET_BADGE[item.bucket]} />
                          <p className="text-[13px] font-semibold text-[var(--color-ink)]">
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
                        className="shrink-0 text-[13px] font-semibold text-[var(--color-brand)] hover:underline"
                      >
                        Open task
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </DashPanel>

            <DashPanel
              id="guidance"
              title="Task guidance"
              description="DO / DON'T from your highest-priority guided task"
              className="lg:col-span-5"
            >
              {!guidanceTask ? (
                <DashEmpty
                  title="No guidance on current tasks"
                  description="When a task includes DO / DON'T instructions, they will appear here."
                />
              ) : (
                <div className="space-y-4 px-6 pb-5">
                  <div>
                    <Link
                      href={taskHref(guidanceTask.id)}
                      className="text-[13px] font-semibold text-[var(--color-ink)] hover:underline"
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
                  <div className="rounded-[var(--radius-sm)] bg-[var(--status-success-bg)] px-4 py-3">
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
                  <div className="rounded-[var(--radius-sm)] bg-[var(--status-danger-bg)] px-4 py-3">
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
                    className="inline-flex text-[13px] font-semibold text-[var(--color-brand)] hover:underline"
                  >
                    Open full task detail
                  </Link>
                </div>
              )}
            </DashPanel>
          </div>

          <DashPanel
            id="my-tasks"
            title="My support tasks"
            description="Same task records Team Lead, Commando, and the SE see"
            aside={
              <Link
                href="/my-tasks"
                className="text-[13px] font-medium text-[var(--color-brand)] hover:underline"
              >
                Full task list
              </Link>
            }
          >
            {activeTasks.length > 0 ? (
              <div className="grid gap-3 px-6 pb-4 sm:grid-cols-3 xl:grid-cols-6">
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
                  options={[{ value: "", label: "All SEs" }, ...seOptions]}
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
            ) : null}

            {activeTasks.length === 0 ? (
              <div className="px-6 pb-6">
                <EmptyState
                  title="No assigned support tasks"
                  description="When Team Lead or Commando assigns you work, it will appear here."
                  actionHref="/my-tasks"
                  actionLabel="Open my tasks"
                  icon="tasks"
                />
              </div>
            ) : filteredTasks.length === 0 ? (
              <DashEmpty
                title="No tasks match these filters"
                description="Clear filters to see your full active queue."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="dash-table w-full min-w-[58rem] text-left text-[13px]">
                  <thead>
                    <tr>
                      <th className="min-w-[13rem]">Task</th>
                      <th>Sales Executive</th>
                      <th>Assigned by</th>
                      <th>Due</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>DO / DON&apos;T</th>
                      <th>
                        <span className="sr-only">Action</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.slice(0, 25).map((t) => {
                      const doText =
                        t.shouldDo?.map((d) => d.text).join("; ") || "";
                      const dontText =
                        t.shouldNotDo?.map((d) => d.text).join("; ") || "";
                      return (
                        <tr key={t.id} data-signal={taskSignal(t)}>
                          <td>
                            <Link
                              href={taskHref(t.id)}
                              className="font-semibold text-[var(--color-ink)] hover:underline"
                            >
                              {t.title}
                            </Link>
                            {t.purpose ? (
                              <p className="mt-0.5 line-clamp-1 text-meta">
                                {t.purpose}
                              </p>
                            ) : null}
                          </td>
                          <td>
                            <Link
                              href={`/profiles/${t.salesExecutiveProfileId}`}
                              className="font-medium text-[var(--color-ink)] hover:underline"
                            >
                              {t.profile.displayName}
                            </Link>
                          </td>
                          <td className="text-meta">
                            {personName(t.assignedBy)}
                          </td>
                          <td
                            className={`whitespace-nowrap tabular-nums ${
                              t.isOverdue
                                ? "font-semibold text-[var(--status-danger)]"
                                : "text-meta"
                            }`}
                          >
                            {formatDate(t.dueDate)}
                          </td>
                          <td>
                            <StatusBadge status={t.priority} />
                          </td>
                          <td>
                            <StatusBadge
                              status={statusBadgeStatus(t)}
                              label={
                                t.isOverdue && t.status !== "BLOCKED"
                                  ? "Overdue"
                                  : supportStatusLabel(t.status)
                              }
                            />
                          </td>
                          <td className="max-w-[12rem] text-meta">
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
                          <td className="text-right">
                            <ButtonLink
                              href={taskHref(t.id)}
                              variant="outline"
                              size="sm"
                            >
                              Open
                            </ButtonLink>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </DashPanel>

          <DashPanel
            id="supported-ses"
            tone="bare"
            title="Sales Executives I support"
            description="Active support relationships — Team Lead remains the SE owner"
          >
            {seRows.length === 0 ? (
              <DashEmpty
                title="No active support relationships"
                description="When a Team Lead assigns you to a Sales Executive, they will appear here."
              />
            ) : (
              <ul className="dash-list">
                {seRows.map(({ link, activeCount, overdueCount }) => (
                  <li
                    key={link.id}
                    className="flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar name={link.profile.displayName} size="sm" />
                      <div className="min-w-0">
                        <Link
                          href={`/profiles/${link.salesExecutiveProfileId}`}
                          className="text-[13px] font-semibold text-[var(--color-ink)] hover:underline"
                        >
                          {link.profile.displayName}
                        </Link>
                        <p className="text-meta">
                          {link.profile.team?.name ?? "—"} ·{" "}
                          {link.responsibilityType?.trim() || "Active support"}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-5 text-[12px] text-[var(--color-ink-muted)]">
                      <span>
                        <span className="mr-1 text-[15px] font-semibold tabular-nums text-[var(--color-ink)]">
                          {activeCount}
                        </span>
                        open
                      </span>
                      <span>
                        <span
                          className={`mr-1 text-[15px] font-semibold tabular-nums ${
                            overdueCount > 0
                              ? "text-[var(--status-danger)]"
                              : "text-[var(--color-ink)]"
                          }`}
                        >
                          {overdueCount}
                        </span>
                        overdue
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </DashPanel>
        </>
      )}
    </div>
  );
}
