"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, type DailyLog } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/dates";
import { seCreateHref, seDailyLogHref } from "@/lib/se-workspace-nav";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/ui";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function logDateKey(logDate: string) {
  return new Date(logDate).toISOString().slice(0, 10);
}

export function CoachingDailyLogsSection({
  profileId,
  executiveUserId,
  profileName,
  logs,
  canCreate,
  createHref: createHrefProp,
  logHref: logHrefProp,
}: {
  /** SE workspace subject */
  profileId?: string;
  /** Support workspace subject */
  executiveUserId?: string;
  profileName: string;
  logs: DailyLog[];
  canCreate: boolean;
  createHref?: string;
  logHref?: (logId: string) => string;
}) {
  const { token } = useAuth();
  const [attention, setAttention] = useState<DailyLog[]>([]);
  const today = todayKey();

  const createHref =
    createHrefProp ??
    (profileId ? seCreateHref(profileId, "daily-log") : "#");
  const logHref =
    logHrefProp ??
    ((logId: string) =>
      profileId ? seDailyLogHref(profileId, logId) : `#${logId}`);

  useEffect(() => {
    if (!token) return;
    const subject = executiveUserId
      ? { executiveUserId }
      : profileId
        ? { profileId }
        : null;
    if (!subject) return;
    void api
      .getDailyLogAttention(token, subject)
      .then((r) => setAttention(r.data.logs))
      .catch(() => setAttention([]));
  }, [token, profileId, executiveUserId]);

  const todayLog = useMemo(
    () => logs.find((l) => logDateKey(l.logDate) === today) ?? null,
    [logs, today],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[var(--color-ink)]">
            Daily Logs
          </h2>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            Capture coaching moments for {profileName} throughout the day.
            Prioritize when you submit.
          </p>
        </div>
        {canCreate && !todayLog ? (
          <Link href={createHref} className="action-chip">
            Open today&apos;s log
          </Link>
        ) : null}
      </div>

      {attention.length > 0 ? (
        <section className="rounded-[var(--radius-md)] border border-amber-300/60 bg-amber-50/80 px-4 py-4">
          <h3 className="text-sm font-semibold text-[var(--color-ink)]">
            Needs attention
          </h3>
          <p className="mt-1 text-[13px] text-[var(--color-ink-muted)]">
            {attention.length === 1
              ? "This Daily Log hasn't been submitted yet."
              : "Previous Daily Logs are still in draft — submit when ready."}
          </p>
          <ul className="mt-3 space-y-2">
            {attention.map((log) => (
              <li
                key={log.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--color-ink)]">
                    {formatDate(log.logDate)}
                  </p>
                  <p className="text-[12px] text-[var(--color-ink-muted)]">
                    {log.entryCount}{" "}
                    {log.entryCount === 1 ? "activity" : "activities"} · Draft
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={logHref(log.id)}
                    className="text-[13px] font-semibold text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                  >
                    Continue
                  </Link>
                  <Link
                    href={logHref(log.id)}
                    className="text-[13px] font-semibold text-[var(--color-brand)] hover:underline"
                  >
                    Review & Submit
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {todayLog ? (
        <section className="rounded-[var(--radius-md)] border border-[var(--color-brand-ring)] bg-[var(--color-brand-soft)]/30 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">
            Today&apos;s Daily Log
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-semibold text-[var(--color-ink)]">
                {formatDate(todayLog.logDate)}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <StatusBadge status={todayLog.status} />
                <span className="text-[13px] text-[var(--color-ink-muted)]">
                  {todayLog.entryCount}{" "}
                  {todayLog.entryCount === 1 ? "activity" : "activities"}
                </span>
              </div>
            </div>
            <Link href={logHref(todayLog.id)} className="btn btn-secondary btn-sm">
              {todayLog.status === "DRAFT" ? "Continue" : "View"}
            </Link>
          </div>
        </section>
      ) : null}

      <section className="surface overflow-hidden">
        <div className="border-b border-[var(--color-line)] px-4 py-3">
          <h3 className="text-sm font-semibold">History</h3>
        </div>
        {logs.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="No Daily Logs yet"
              description="Open today's log to start recording activities."
            />
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Activities</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="tabular-nums">{formatDate(log.logDate)}</td>
                  <td className="tabular-nums">{log.entryCount}</td>
                  <td>
                    <StatusBadge status={log.status} />
                  </td>
                  <td className="text-right">
                    <Link
                      href={logHref(log.id)}
                      className="text-sm font-medium text-[var(--color-brand)] hover:underline"
                    >
                      {log.status === "DRAFT" ? "Continue" : "View"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
