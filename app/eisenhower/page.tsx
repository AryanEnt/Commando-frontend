"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  api,
  type EisenhowerCategory,
  type EisenhowerStatus,
  type EisenhowerTask,
  type ProfileListItem,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/dates";
import { StatusBadge } from "@/components/StatusBadge";
import { SearchableSelect } from "@/components/SearchableSelect";
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  FilterBar,
  LoadingState,
  PageHeader,
  Panel,
  SegmentedControl,
  SelectField,
  TableSkeleton,
} from "@/components/ui";

const CATEGORIES: {
  key: EisenhowerCategory;
  label: string;
  axis: string;
  tone: string;
}[] = [
  {
    key: "DO_FIRST",
    label: "Do now",
    axis: "Urgent · Important",
    tone: "border-[var(--status-danger-ring)] bg-[var(--status-danger-bg)]",
  },
  {
    key: "SCHEDULE",
    label: "Schedule",
    axis: "Not urgent · Important",
    tone: "border-[var(--status-info-ring)] bg-[var(--status-info-bg)]",
  },
  {
    key: "DELEGATE",
    label: "Delegate",
    axis: "Urgent · Not important",
    tone: "border-[var(--status-warn-ring)] bg-[var(--status-warn-bg)]",
  },
  {
    key: "ELIMINATE",
    label: "Eliminate",
    axis: "Not urgent · Not important",
    tone: "border-[var(--color-line)] bg-[var(--color-surface-2)]",
  },
];

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function EisenhowerPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading Eisenhower…" />}>
      <EisenhowerContent />
    </Suspense>
  );
}

function EisenhowerContent() {
  const { token, hasPermission } = useAuth();
  const searchParams = useSearchParams();
  const [view, setView] = useState<"matrix" | "list">("matrix");
  const [month, setMonth] = useState(currentMonthValue());
  const [profileId, setProfileId] = useState(searchParams.get("profileId") ?? "");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [profiles, setProfiles] = useState<ProfileListItem[]>([]);
  const [matrix, setMatrix] = useState<Record<
    EisenhowerCategory,
    EisenhowerTask[]
  > | null>(null);
  const [tasks, setTasks] = useState<EisenhowerTask[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canCreate = hasPermission("EISENHOWER_CREATE");
  const canUpdate = hasPermission("EISENHOWER_UPDATE");

  useEffect(() => {
    if (!token) return;
    void api.getProfiles(token).then((res) => setProfiles(res.data.profiles));
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!token) return;
      setLoading(true);
      try {
        if (view === "matrix") {
          const res = await api.getEisenhowerMatrix(token, {
            profileId: profileId || undefined,
            month,
          });
          if (!cancelled) {
            setMatrix(res.data.byCategory);
            setError(null);
          }
        } else {
          const res = await api.getEisenhowerTasks(token, {
            profileId: profileId || undefined,
            month: month || undefined,
            category: (category as EisenhowerCategory) || undefined,
            status: (status as EisenhowerStatus) || undefined,
            pageSize: 50,
          });
          if (!cancelled) {
            setTasks(res.data.tasks);
            setTotal(res.data.total);
            setError(null);
          }
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
  }, [token, view, month, profileId, category, status]);

  const isCurrentMonth = useMemo(
    () => month === currentMonthValue(),
    [month],
  );

  async function setTaskStatus(id: string, next: EisenhowerStatus) {
    if (!token || !canUpdate) return;
    await api.updateEisenhowerTaskStatus(token, id, next);
    const res = await api.getEisenhowerMatrix(token, {
      profileId: profileId || undefined,
      month,
    });
    setMatrix(res.data.byCategory);
  }

  const matrixEmpty =
    view === "matrix" &&
    matrix &&
    CATEGORIES.every((c) => matrix[c.key].length === 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Eisenhower Matrix"
        description="Urgent vs important. Place work in the quadrant that matches how it should be handled."
        actions={
          <>
            <SegmentedControl
              ariaLabel="Eisenhower view"
              value={view}
              onChange={setView}
              options={[
                { value: "matrix", label: "Matrix" },
                { value: "list", label: "List / History" },
              ]}
            />
            {canCreate && (
              <Link
                href="/eisenhower/new"
                className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                New task
              </Link>
            )}
          </>
        }
      />

      <FilterBar>
        <Field label="Month">
          <input
            type="month"
            className="mt-1 rounded border border-slate-300 bg-white px-3 py-2 text-sm"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </Field>
        <SearchableSelect
          label="Profile"
          value={profileId}
          onChange={setProfileId}
          placeholder="All profiles"
          options={profiles.map((p) => ({
            value: p.id,
            label: p.displayName,
          }))}
        />
        {view === "list" && (
          <>
            <SelectField
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="OPEN">OPEN</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="DONE">DONE</option>
              <option value="CANCELLED">CANCELLED</option>
            </SelectField>
          </>
        )}
      </FilterBar>

      {error && <ErrorState message={error} />}
      {loading && view === "list" && <TableSkeleton />}
      {loading && view === "matrix" && <LoadingState label="Loading matrix…" />}

      {!loading && view === "matrix" && matrixEmpty && (
        <EmptyState
          title="No tasks this month"
          description="Create a task or switch to another month."
          actionHref={canCreate ? "/eisenhower/new" : undefined}
          actionLabel={canCreate ? "New task" : undefined}
        />
      )}

      {!loading && view === "matrix" && matrix && !matrixEmpty && (
        <div className="space-y-2">
          <div className="hidden grid-cols-[7rem_1fr_1fr] text-center text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)] md:grid">
            <span />
            <span>Urgent</span>
            <span>Not urgent</span>
          </div>
          <div className="grid gap-3 md:grid-cols-[7rem_1fr_1fr]">
            <p className="hidden items-center justify-center text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)] md:flex">
              Important
            </p>
            <Quadrant
              cat={CATEGORIES[0]!}
              tasks={matrix.DO_FIRST}
              canUpdate={canUpdate}
              onStatus={setTaskStatus}
            />
            <Quadrant
              cat={CATEGORIES[1]!}
              tasks={matrix.SCHEDULE}
              canUpdate={canUpdate}
              onStatus={setTaskStatus}
            />
            <p className="hidden items-center justify-center text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)] md:flex">
              Not important
            </p>
            <Quadrant
              cat={CATEGORIES[2]!}
              tasks={matrix.DELEGATE}
              canUpdate={canUpdate}
              onStatus={setTaskStatus}
            />
            <Quadrant
              cat={CATEGORIES[3]!}
              tasks={matrix.ELIMINATE}
              canUpdate={canUpdate}
              onStatus={setTaskStatus}
            />
          </div>
        </div>
      )}

      {!loading && view === "list" && tasks.length === 0 && !error && (
        <EmptyState
          title="No tasks found"
          description="Adjust filters or create a new task."
          actionHref={canCreate ? "/eisenhower/new" : undefined}
          actionLabel={canCreate ? "New task" : undefined}
        />
      )}

      {!loading && view === "list" && tasks.length > 0 && (
        <Panel
          title={`Tasks · ${total}`}
          tone={isCurrentMonth ? "active" : "history"}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Month</th>
                  <th className="px-3 py-2">Profile</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Due</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      {task.monthLabel}
                      {task.isHistory && (
                        <span className="ml-1 text-xs text-slate-500">
                          history
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">{task.profile.displayName}</td>
                    <td className="px-3 py-2">{task.category}</td>
                    <td className="px-3 py-2 font-medium">{task.title}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="px-3 py-2 tabular-nums text-slate-700">
                      {formatDate(task.dueDate)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/eisenhower/${task.id}`}
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
        </Panel>
      )}
    </div>
  );
}

function Quadrant({
  cat,
  tasks,
  canUpdate,
  onStatus,
}: {
  cat: (typeof CATEGORIES)[number];
  tasks: EisenhowerTask[];
  canUpdate: boolean;
  onStatus: (id: string, status: EisenhowerStatus) => Promise<void>;
}) {
  return (
    <section className={`min-h-[12rem] rounded-[var(--radius-md)] border p-3 ${cat.tone}`}>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">{cat.label}</h2>
          <p className="text-[10px] uppercase tracking-wide text-[var(--color-ink-subtle)]">
            {cat.axis}
          </p>
        </div>
        <span className="text-xs">{tasks.length}</span>
      </div>
      <ul className="space-y-2">
        {tasks.map((task) => (
          <li
            key={task.id}
            className="rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)] p-2 text-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <Link href={`/eisenhower/${task.id}`} className="font-medium">
                {task.title}
              </Link>
              <StatusBadge status={task.status} />
            </div>
            <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
              {task.profile.displayName}
              {task.dueDate ? ` · due ${formatDate(task.dueDate)}` : ""}
              {task.isExpired ? " · expired" : ""}
            </p>
            {canUpdate && task.status !== "DONE" && (
              <div className="mt-2 flex gap-1">
                {task.status === "OPEN" && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void onStatus(task.id, "IN_PROGRESS")}
                  >
                    Start
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void onStatus(task.id, "DONE")}
                >
                  Complete
                </Button>
              </div>
            )}
          </li>
        ))}
        {tasks.length === 0 && (
          <li className="text-xs text-[var(--color-ink-muted)]">No tasks in this quadrant.</li>
        )}
      </ul>
    </section>
  );
}
