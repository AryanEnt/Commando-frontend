"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, type SyncEvaluation } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/dates";
import { personName } from "@/lib/labels";
import {
  DateTimeCell,
  ErrorState,
  LoadingState,
  PageHeader,
} from "@/components/ui";

export default function SyncEvaluationDetailPage() {
  const params = useParams<{ id: string }>();
  const { token } = useAuth();
  const [evaluation, setEvaluation] = useState<SyncEvaluation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!token || !params.id) return;
      try {
        const res = await api.getSyncEvaluation(token, params.id);
        if (!cancelled) {
          setEvaluation(res.data.evaluation);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "You don't have permission to view this evaluation.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, params.id]);

  if (error) return <ErrorState message={error} />;
  if (!evaluation) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Evaluation summary · ${evaluation.profile.displayName}`}
        description="Read only. Commando observation shared with Sales Support."
        actions={
          <span className="rounded-full bg-[var(--status-info-bg)] px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-[var(--status-info)]">
            Read only
          </span>
        }
      />

      <dl className="grid gap-3 surface p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-[var(--color-ink-subtle)]">Sales Support</dt>
          <dd>{personName(evaluation.salesSupportUser)}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--color-ink-subtle)]">Commando</dt>
          <dd>{personName(evaluation.commando)}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--color-ink-subtle)]">Team Lead</dt>
          <dd>{personName(evaluation.teamLead)}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--color-ink-subtle)]">Sync date</dt>
          <dd>
            <DateTimeCell value={evaluation.createdAt} />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--color-ink-subtle)]">Assignment</dt>
          <dd>
            {evaluation.assignment
              ? `${evaluation.assignment.status} · ${formatDate(evaluation.assignment.startedAt)}`
              : "—"}
          </dd>
        </div>
      </dl>

      <section className="surface p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">
          Issue
        </h2>
        <p className="mt-2 whitespace-pre-wrap text-sm">{evaluation.issue}</p>
      </section>
      <section className="surface p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">
          Recommended action
        </h2>
        <p className="mt-2 whitespace-pre-wrap text-sm">
          {evaluation.recommendedAction}
        </p>
      </section>
      <Link href="/sync-evaluations" className="text-sm text-[var(--color-brand)]">
        Back to evaluations
      </Link>
    </div>
  );
}
