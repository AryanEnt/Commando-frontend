"use client";

import Link from "next/link";
import type { EisenhowerCategory, EisenhowerTask } from "@/lib/api";
import { seCreateHref } from "@/lib/se-workspace-nav";
import { Icons } from "@/components/icons";

const QUADRANTS: {
  key: EisenhowerCategory;
  title: string;
  subtitle: string;
  accent: string;
  tint: string;
  bar: string;
  icon: "bolt" | "calendar" | "users" | "minus";
}[] = [
  {
    key: "DO_FIRST",
    title: "Do first",
    subtitle: "Important + Urgent",
    accent: "text-[var(--status-danger)]",
    tint: "bg-[var(--status-danger-bg)]/55",
    bar: "bg-[var(--status-danger)]",
    icon: "bolt",
  },
  {
    key: "SCHEDULE",
    title: "Schedule",
    subtitle: "Important + Not urgent",
    accent: "text-[var(--status-info)]",
    tint: "bg-[var(--status-info-bg)]/55",
    bar: "bg-[var(--status-info)]",
    icon: "calendar",
  },
  {
    key: "DELEGATE",
    title: "Delegate",
    subtitle: "Not important + Urgent",
    accent: "text-[var(--color-accent)]",
    tint: "bg-[var(--color-accent-soft)]",
    bar: "bg-[var(--color-accent)]",
    icon: "users",
  },
  {
    key: "ELIMINATE",
    title: "Eliminate",
    subtitle: "Not important + Not urgent",
    accent: "text-[var(--status-neutral)]",
    tint: "bg-[var(--status-neutral-bg)]",
    bar: "bg-[var(--status-neutral)]",
    icon: "minus",
  },
];

function formatMonthHeading(monthKey: string): string {
  const compact = /^(\d{4})-(\d{2})$/.exec(monthKey);
  const iso = /^(\d{4})-(\d{2})-\d{2}/.exec(monthKey);
  const match = compact ?? iso;
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

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function QuadrantIcon({
  name,
  className,
}: {
  name: (typeof QUADRANTS)[number]["icon"];
  className?: string;
}) {
  if (name === "calendar") return <Icons.calendar size={16} className={className} />;
  if (name === "users") return <Icons.users size={16} className={className} />;
  if (name === "bolt") {
    return (
      <svg
        width={16}
        height={16}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className={className}
      >
        <path d="M13 2 3 14h8l-1 8 10-12h-8l1-8z" />
      </svg>
    );
  }
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M5 12h14" />
    </svg>
  );
}

function TaskCard({
  task,
  href,
  showProfile,
}: {
  task: EisenhowerTask;
  href: string;
  showProfile?: boolean;
}) {
  const meta = [
    showProfile ? task.profile.displayName : null,
    task.isExpired ? "Expired" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-3 shadow-[var(--shadow-sm)]">
      <Link
        href={href}
        className="block min-w-0 text-[0.9375rem] font-semibold leading-snug tracking-[-0.01em] text-[var(--color-ink)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
      >
        {task.title}
      </Link>
      {meta ? (
        <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[var(--color-ink-muted)]">
          {meta}
        </p>
      ) : null}
      {task.notes ? (
        <p className="mt-1.5 line-clamp-2 text-[0.8125rem] leading-relaxed text-[var(--color-ink)]">
          {task.notes}
        </p>
      ) : null}
    </li>
  );
}

/** Thin scrollbar that blends into the quadrant tint (track = matrix bg). */
const QUAD_SCROLL =
  "overflow-y-auto overscroll-contain [scrollbar-gutter:stable] [scrollbar-width:thin] [scrollbar-color:color-mix(in_srgb,var(--color-ink)_18%,transparent)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[var(--color-ink)]/15 hover:[&::-webkit-scrollbar-thumb]:bg-[var(--color-ink)]/25";

function EisenhowerQuadrant({
  meta,
  tasks,
  taskHref,
  addHref,
  showProfile,
}: {
  meta: (typeof QUADRANTS)[number];
  tasks: EisenhowerTask[];
  taskHref: (task: EisenhowerTask) => string;
  addHref?: string;
  showProfile?: boolean;
}) {
  const countLabel =
    tasks.length === 1 ? "1 priority" : `${tasks.length} priorities`;
  const scrollable = tasks.length > 3;

  return (
    <section
      aria-labelledby={`eisenhower-quad-${meta.key}`}
      className={`group/quad relative flex h-full min-h-0 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] ${meta.tint} transition duration-150 ease-out hover:border-[var(--color-line-strong)] hover:shadow-[var(--shadow-sm)]`}
    >
      <div
        className={`absolute inset-y-0 left-0 w-[3px] ${meta.bar}`}
        aria-hidden
      />
      <header className="shrink-0 flex items-start justify-between gap-3 px-5 pb-3 pt-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-surface)]/80 ${meta.accent}`}
            >
              <QuadrantIcon name={meta.icon} />
            </span>
            <h3
              id={`eisenhower-quad-${meta.key}`}
              className="text-base font-semibold tracking-[-0.015em] text-[var(--color-ink)] sm:text-[1.0625rem]"
            >
              {meta.title}
            </h3>
          </div>
          <p className="mt-1.5 text-[0.8125rem] text-[var(--color-ink-muted)]">
            {meta.subtitle}
          </p>
          <p className="mt-2 text-[0.75rem] font-medium tabular-nums text-[var(--color-ink-subtle)]">
            {countLabel}
            {scrollable ? " · scroll to see all" : ""}
          </p>
        </div>
        {addHref ? (
          <Link
            href={addHref}
            className="btn btn-soft btn-sm shrink-0"
          >
            Daily Log
          </Link>
        ) : null}
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
            {addHref ? (
              <div className="mt-3 flex justify-center">
                <Link href={addHref} className="btn btn-primary btn-sm">
                  Add Daily Log
                </Link>
              </div>
            ) : null}
          </div>
        ) : (
          <ul className={`min-h-0 flex-1 space-y-2.5 pr-1 ${QUAD_SCROLL}`}>
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                href={taskHref(task)}
                showProfile={showProfile}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function EisenhowerMatrixBoard({
  tasks,
  profileId,
  canCreate,
  showProfile,
  emptyActionHref,
  emptyActionLabel,
}: {
  /** Tasks already scoped for display (typically current month). */
  tasks: EisenhowerTask[];
  profileId?: string;
  canCreate?: boolean;
  showProfile?: boolean;
  emptyActionHref?: string;
  emptyActionLabel?: string;
}) {
  const returnTo = profileId
    ? `/profiles/${profileId}/eisenhower`
    : "/eisenhower";

  const periodKey =
    tasks.find((t) => t.isCurrentMonth)?.monthLabel ??
    tasks[0]?.monthLabel ??
    currentMonthKey();
  const periodHeading = formatMonthHeading(periodKey);
  const isCurrent = periodKey === currentMonthKey();

  const groups: Record<EisenhowerCategory, EisenhowerTask[]> = {
    DO_FIRST: tasks.filter((t) => t.category === "DO_FIRST"),
    SCHEDULE: tasks.filter((t) => t.category === "SCHEDULE"),
    DELEGATE: tasks.filter((t) => t.category === "DELEGATE"),
    ELIMINATE: tasks.filter((t) => t.category === "ELIMINATE"),
  };

  const total = tasks.length;

  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-line)] px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-2)] text-[var(--color-ink-muted)]">
            <Icons.calendar size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-[1.0625rem] font-semibold tracking-[-0.02em] text-[var(--color-ink)] sm:text-lg">
              {periodHeading}
            </p>
            <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">
              Monthly priorities for the Sales Executive
              {isCurrent ? " · Current period" : " · Historical period"}
            </p>
          </div>
        </div>
        <p className="text-[0.8125rem] font-medium tabular-nums text-[var(--color-ink-subtle)]">
          {total === 1
            ? "1 priority this month"
            : `${total} priorities this month`}
        </p>
      </div>

      {total === 0 ? (
        <div className="px-5 py-12 text-center sm:px-6">
          <p className="text-base font-semibold text-[var(--color-ink)]">
            No Eisenhower priorities yet
          </p>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-[var(--color-ink-muted)]">
            Priorities are created from Daily Logs — urgency and importance
            place them on this board for the Sales Executive.
          </p>
          {emptyActionHref && emptyActionLabel ? (
            <Link
              href={emptyActionHref}
              className="btn btn-primary btn-sm mt-5 inline-flex"
            >
              {emptyActionLabel}
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 auto-rows-[20rem] gap-3 p-4 sm:grid-cols-2 sm:auto-rows-[22rem] sm:gap-3.5 sm:p-5 lg:auto-rows-[24rem]">
          {QUADRANTS.map((meta) => (
            <EisenhowerQuadrant
              key={meta.key}
              meta={meta}
              tasks={groups[meta.key]}
              showProfile={showProfile}
              addHref={
                canCreate && profileId
                  ? seCreateHref(profileId, "daily-log")
                  : undefined
              }
              taskHref={(task) =>
                `/eisenhower/${task.id}?returnTo=${encodeURIComponent(returnTo)}`
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
