"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, type DailyLog } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  DateTimeCell,
  ErrorState,
  LoadingState,
  ReadOnlyPanel,
} from "@/components/ui";

export default function DailyLogDetailPage() {
  const params = useParams<{ id: string }>();
  const { token } = useAuth();
  const [log, setLog] = useState<DailyLog | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!token || !params.id) return;
      try {
        const res = await api.getDailyLog(token, params.id);
        if (!cancelled) {
          setLog(res.data.log);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, params.id]);

  if (error) {
    return (
      <div className="space-y-2">
        <Link href="/daily-logs" className="text-sm text-slate-600 underline">
          ← Daily Logs
        </Link>
        <ErrorState message={error} />
      </div>
    );
  }
  if (!log) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/daily-logs" className="text-sm text-slate-600 underline">
          ← Daily Logs
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          {log.sessionTitle}
        </h1>
        <p className="text-sm text-slate-600">
          {log.profile.displayName} · {log.activityType.name}
        </p>
      </div>

      <ReadOnlyPanel title="Daily coaching log">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase text-slate-500">Logged</dt>
            <dd className="mt-1">
              <DateTimeCell value={log.loggedAt} />
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Created by</dt>
            <dd className="mt-1">
              {log.createdBy.firstName} {log.createdBy.lastName}
            </dd>
          </div>
          {log.assignmentId && (
            <div>
              <dt className="text-xs uppercase text-slate-500">Assignment</dt>
              <dd className="mt-1 font-mono text-xs">{log.assignmentId}</dd>
            </div>
          )}
        </dl>
        <div>
          <h2 className="text-xs uppercase text-slate-500">Observation</h2>
          <p className="mt-2 whitespace-pre-wrap text-slate-900">
            {log.observation}
          </p>
        </div>
      </ReadOnlyPanel>
    </div>
  );
}
