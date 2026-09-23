"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  api,
  type EisenhowerCategory,
  type EisenhowerTask,
  type ProfileListItem,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { SearchableSelect } from "@/components/SearchableSelect";
import { PaginationControls } from "@/components/PaginationControls";
import {
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
  accent: string;
  tint: string;
  bar: string;
}[] = [
  {
    key: "DO_FIRST",
    label: "Do first",
    axis: "Important + Urgent",
    accent: "text-[var(--status-danger)]",
    tint: "bg-[var(--status-danger-bg)]/55",
    bar: "bg-[var(--status-danger)]",
  },
  {
    key: "SCHEDULE",
    label: "Schedule",
    axis: "Important + Not urgent",
    accent: "text-[var(--status-info)]",
    tint: "bg-[var(--status-info-bg)]/55",
    bar: "bg-[var(--status-info)]",
  },
  {
    key: "DELEGATE",
    label: "Delegate",
    axis: "Not important + Urgent",
    accent: "text-[var(--color-accent)]",
    tint: "bg-[var(--color-accent-soft)]",
    bar: "bg-[var(--color-accent)]",
  },
  {
    key: "ELIMINATE",
    label: "Eliminate",
    axis: "Not important + Not urgent",
    accent: "text-[var(--status-neutral)]",
    tint: "bg-[var(--status-neutral-bg)]",
    bar: "bg-[var(--status-neutral)]",
  },
];

function formatMonthHeading(monthKey: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) return monthKey;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!year || month < 1 || month > 12) return monthKey;
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

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
  const [profiles, setProfiles] = useState<ProfileListItem[]>([]);
  const [matrix, setMatrix] = useState<Record<
    EisenhowerCategory,
    EisenhowerTask[]
  > | null>(null);
  const [tasks, setTasks] = useState<EisenhowerTask[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canCreate = hasPermission("DAILY_LOG_CREATE");

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
            page,
            pageSize,
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
  }, [token, view, month, profileId, category, page, pageSize]);

  const isCurrentMonth = useMemo(
    () => month === currentMonthValue(),
    [month],
  );

  const matrixEmpty =
    view === "matrix" &&
    matrix &&
    CATEGORIES.every((c) => matrix[c.key].length === 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Eisenhower Matrix"
        description="Priorities from Daily Logs — urgency and importance place them so Sales Executives know what to focus on."
        actions={
          <>
            <SegmentedControl
              ariaLabel="Eisenhower view"
              value={view}
              onChange={(v) => {
                setPage(1);
                setView(v);
              }}
              options={[
                { value: "matrix", label: "Matrix" },
                { value: "list", label: "List / History" },
              ]}
            />
            {canCreate && (
              <Link
                href="/daily-logs/new"
                className="inline-flex items-center rounded-[var(--radius-sm)] bg-[var(--color-brand)] px-3 py-2 text-sm font-medium text-[var(--color-brand-on)] hover:bg-[var(--color-brand-hover)]"
              >
                Add Daily Log
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
            onChange={(e) => {
              setPage(1);
              setMonth(e.target.value);
            }}
          />
        </Field>
        <SearchableSelect
          label="Profile"
          value={profileId}
          onChange={(id) => {
            setPage(1);
            setProfileId(id);
          }}
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
              onChange={(e) => {
                setPage(1);
                setCategory(e.target.value);
              }}
            >
              <option value="">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </SelectField>
          </>
        )}
      </FilterBar>

      {error && <ErrorState message={error} />}
      {loading && view === "list" && <TableSkeleton />}
      {loading && view === "matrix" && <LoadingState label="Loading matrix…" />}

      {!loading && view === "matrix" && matrixEmpty && (
        <EmptyState
          title="No priorities this month"
          description="Add a Daily Log with urgency and importance to place priorities here."
          actionHref={canCreate ? "/daily-logs/new" : undefined}
          actionLabel={canCreate ? "Add Daily Log" : undefined}
        />
      )}

      {!loading && view === "matrix" && matrix && !matrixEmpty && (
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-line)] px-5 py-4 sm:px-6">
            <div>
              <p className="text-[1.0625rem] font-semibold tracking-[-0.02em] text-[var(--color-ink)] sm:text-lg">
                {formatMonthHeading(month)}
              </p>
              <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">
                Monthly priorities for Sales Executives
                {isCurrentMonth ? " · Current period" : " · Historical period"}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 auto-rows-[20rem] gap-3 p-4 sm:grid-cols-2 sm:auto-rows-[22rem] sm:gap-3.5 sm:p-5 lg:auto-rows-[24rem]">
            {CATEGORIES.map((cat) => (
              <Quadrant key={cat.key} cat={cat} tasks={matrix[cat.key]} />
            ))}
          </div>
        </div>
      )}

      {!loading && view === "list" && tasks.length === 0 && !error && (
        <EmptyState
          title="No priorities found"
          description="Adjust filters or add a Daily Log."
          actionHref={canCreate ? "/daily-logs/new" : undefined}
          actionLabel={canCreate ? "Add Daily Log" : undefined}
        />
      )}

      {!loading && view === "list" && tasks.length > 0 && (
        <Panel
          title={`Priorities · ${total}`}
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
        </Panel>
      )}
    </div>
  );
}

function Quadrant({
  cat,
  tasks,
}: {
  cat: (typeof CATEGORIES)[number];
  tasks: EisenhowerTask[];
}) {
  const countLabel =
    tasks.length === 1 ? "1 priority" : `${tasks.length} priorities`;
  const scrollable = tasks.length > 3;
  const scrollClass =
    "min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable] [scrollbar-width:thin] [scrollbar-color:color-mix(in_srgb,var(--color-ink)_18%,transparent)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[var(--color-ink)]/15 hover:[&::-webkit-scrollbar-thumb]:bg-[var(--color-ink)]/25";

  return (
    <section
      aria-labelledby={`global-eisenhower-${cat.key}`}
      className={`relative flex h-full min-h-0 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] ${cat.tint} transition duration-150 ease-out hover:border-[var(--color-line-strong)] hover:shadow-[var(--shadow-sm)]`}
    >
      <div className={`absolute inset-y-0 left-0 w-[3px] ${cat.bar}`} aria-hidden />
      <header className="shrink-0 px-5 pb-3 pt-5">
        <h2
          id={`global-eisenhower-${cat.key}`}
          className="text-base font-semibold tracking-[-0.015em] text-[var(--color-ink)] sm:text-[1.0625rem]"
        >
          <span className={cat.accent}>{cat.label}</span>
        </h2>
        <p className="mt-1 text-[0.8125rem] text-[var(--color-ink-muted)]">
          {cat.axis}
        </p>
        <p className="mt-2 text-[0.75rem] font-medium tabular-nums text-[var(--color-ink-subtle)]">
          {countLabel}
          {scrollable ? " · scroll to see all" : ""}
        </p>
      </header>
      <div className="flex min-h-0 flex-1 flex-col px-5 pb-5">
        {tasks.length === 0 ? (
          <div className="flex flex-1 flex-col justify-center rounded-[var(--radius-md)] border border-dashed border-[var(--color-line)] bg-[var(--color-surface)]/55 px-4 py-6 text-center">
            <p className="text-sm font-medium text-[var(--color-ink-muted)]">
              Nothing in this quadrant
            </p>
            <p className="mt-1 text-[0.8125rem] text-[var(--color-ink-subtle)]">
              Priorities arrive here from Daily Logs.
            </p>
          </div>
        ) : (
          <ul className={scrollClass}>
            {tasks.map((task) => (
              <li
                key={task.id}
                className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-3 shadow-[var(--shadow-sm)]"
              >
                <Link
                  href={`/eisenhower/${task.id}`}
                  className="block min-w-0 text-[0.9375rem] font-semibold leading-snug tracking-[-0.01em] text-[var(--color-ink)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
                >
                  {task.title}
                </Link>
                <p className="mt-1.5 text-[0.8125rem] text-[var(--color-ink-muted)]">
                  {task.profile.displayName}
                  {task.isExpired ? " · expired" : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
