"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type SupportTask } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/dates";
import { StatusBadge } from "@/components/StatusBadge";
import { PaginationControls } from "@/components/PaginationControls";
import {
  EmptyState,
  ErrorState,
  FilterBar,
  PageHeader,
  Panel,
  SegmentedControl,
  TableSkeleton,
  TextInput,
} from "@/components/ui";

type ViewMode = "active" | "dueSoon" | "overdue" | "completed" | "history";

function personName(u: {
  firstName: string;
  lastName: string;
} | null) {
  if (!u) return "—";
  return `${u.firstName} ${u.lastName}`;
}

export default function MyTasksPage() {
  const { token, hasPermission, user } = useAuth();
  const [view, setView] = useState<ViewMode>("active");
  const [tasks, setTasks] = useState<SupportTask[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canCreate = hasPermission("SALES_SUPPORT_TASK_CREATE");
  const isSupport = user?.roleCode === "SALES_SUPPORT_EXECUTIVE";

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!token) return;
      setLoading(true);
      try {
        const params =
          view === "overdue"
            ? {
                filter: "overdue" as const,
                search: search || undefined,
                page,
                pageSize,
              }
            : view === "completed"
              ? {
                  filter: "completed" as const,
                  search: search || undefined,
                  page,
                  pageSize,
                }
              : view === "dueSoon"
                ? {
                    view: "active" as const,
                    search: search || undefined,
                    page: 1,
                    pageSize: 50,
                  }
                : {
                    view:
                      view === "history"
                        ? ("history" as const)
                        : ("active" as const),
                    search: search || undefined,
                    page,
                    pageSize,
                  };
        const res = await api.getSupportTasks(token, params);
        if (!cancelled) {
          let next = res.data.tasks;
          if (view === "dueSoon") {
            const now = Date.now();
            const soon = now + 3 * 24 * 60 * 60 * 1000;
            next = next.filter((t) => {
              if (!t.dueDate || t.isOverdue) return false;
              const due = new Date(t.dueDate).getTime();
              return due >= now && due <= soon;
            });
          }
          setTasks(next);
          setTotal(view === "dueSoon" ? next.length : res.data.total);
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
  }, [token, view, search, page, pageSize]);

  if (!hasPermission("SALES_SUPPORT_TASK_VIEW")) {
    return (
      <ErrorState message="You do not have permission to view support tasks." />
    );
  }

  const title = isSupport ? "My Task" : "Support Tasks";
  const description = isSupport
    ? "Tasks assigned to you by Commando. Completed work stays in History."
    : "Create and assign support work to Sales Support Executives.";

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        actions={
          canCreate ? (
            <Link
              href="/my-tasks/new"
              className="rounded-[var(--radius-sm)] bg-[var(--color-brand)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-hover)]"
            >
              New support task
            </Link>
          ) : null
        }
      />

      <FilterBar>
        <SegmentedControl
          ariaLabel="Task view"
          value={view}
          onChange={(v) => {
            setPage(1);
            setView(v);
          }}
          options={[
            { value: "active", label: "Active" },
            { value: "dueSoon", label: "Due soon" },
            { value: "overdue", label: "Overdue" },
            { value: "completed", label: "Completed" },
            { value: "history", label: "History" },
          ]}
        />
        <div className="min-w-[12rem] flex-1">
          <TextInput
            label="Search"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Title or profile…"
          />
        </div>
      </FilterBar>

      {error && <ErrorState message={error} />}
      {loading && <TableSkeleton />}

      {!loading && !error && tasks.length === 0 && (
        <EmptyState
          title={
            view === "active"
              ? "No active tasks"
              : view === "dueSoon"
                ? "No tasks due soon"
              : view === "overdue"
                ? "No overdue tasks"
                : view === "completed"
                  ? "No completed tasks"
                : view === "history"
                  ? "No history yet"
                  : "No tasks"
          }
          description={
            canCreate
              ? "Create a task and assign it to a Sales Support Executive."
              : "When Commando assigns you work, it will appear here."
          }
          actionHref={canCreate ? "/my-tasks/new" : undefined}
          actionLabel={canCreate ? "New support task" : undefined}
        />
      )}

      {!loading && tasks.length > 0 && (
        <Panel
          title={
            view === "active"
              ? `Active tasks · ${total}`
              : view === "dueSoon"
                ? `Due soon · ${total}`
              : view === "overdue"
                ? `Overdue · ${total}`
                : view === "completed"
                  ? `Completed · ${total}`
                : view === "history"
                  ? `History · ${total}`
                  : `Tasks · ${total}`
          }
          tone={
            view === "active" || view === "overdue" ? "active" : "history"
          }
        >
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="px-3 py-2">Task</th>
                  <th className="px-3 py-2">Assigned By</th>
                  <th className="px-3 py-2">Related Profile</th>
                  <th className="px-3 py-2">Priority</th>
                  <th className="px-3 py-2">Due Date</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-900">
                        {task.title}
                      </div>
                      {task.description && (
                        <div className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                          {task.description}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {personName(task.assignedBy)}
                    </td>
                    <td className="px-3 py-2">{task.profile.displayName}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={task.priority} />
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          task.isOverdue
                            ? "font-medium text-amber-800"
                            : "tabular-nums text-slate-700"
                        }
                      >
                        {formatDate(task.dueDate)}
                      </span>
                      {task.isOverdue && (
                        <span className="mt-0.5 block text-xs text-amber-700">
                          Overdue
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/my-tasks/${task.id}`}
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
          {view !== "dueSoon" ? (
            <div className="mt-3 px-3 pb-3">
              <PaginationControls
                page={page}
                pageSize={pageSize}
                total={total}
                disabled={loading}
                noun="tasks"
                onPageChange={setPage}
                onPageSizeChange={(n) => {
                  setPage(1);
                  setPageSize(n);
                }}
              />
            </div>
          ) : null}
        </Panel>
      )}
    </div>
  );
}
