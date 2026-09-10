"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, type SwotItem } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { personName, roleLabel } from "@/lib/labels";
import { StatusBadge } from "@/components/StatusBadge";
import {
  DateTimeCell,
  ErrorState,
  LoadingState,
  PageHeader,
} from "@/components/ui";

const QUADRANTS = [
  {
    key: "strength" as const,
    title: "Strengths",
    explanation: "What is already working in this Sales Executive’s selling.",
  },
  {
    key: "weakness" as const,
    title: "Weaknesses",
    explanation: "Gaps that currently hold performance back.",
  },
  {
    key: "opportunity" as const,
    title: "Opportunities",
    explanation: "External or internal openings to improve results.",
  },
  {
    key: "threat" as const,
    title: "Threats",
    explanation: "Risks that could reverse progress if unaddressed.",
  },
];

export default function SwotDetailPage() {
  const params = useParams<{ id: string }>();
  const { token } = useAuth();
  const [swot, setSwot] = useState<SwotItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!token || !params.id) return;
      try {
        const res = await api.getSwot(token, params.id);
        if (!cancelled) {
          setSwot(res.data.swot);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "We couldn't load this SWOT.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, params.id]);

  if (error) return <ErrorState message={error} />;
  if (!swot) return <LoadingState label="Loading SWOT…" />;

  const sourceLabel =
    swot.source === "TEAM_LEAD"
      ? "Team Lead assessment"
      : swot.source === "COMMANDO"
        ? "Commando assessment"
        : "Sales Executive self-assessment";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`SWOT · ${swot.profile.displayName}`}
        description={`${swot.team.name} · ${sourceLabel}`}
        actions={<StatusBadge status={swot.source} />}
      />
      <p className="text-sm text-[var(--color-ink-muted)]">
        Authored by {personName(swot.createdBy)} ({roleLabel(swot.createdBy.role.code)}) ·{" "}
        <DateTimeCell value={swot.createdAt} />
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {QUADRANTS.map((q) => (
          <section key={q.key} className="surface p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">
              {q.title}
            </h2>
            <p className="mt-1 text-xs text-[var(--color-ink-muted)]">{q.explanation}</p>
            <p className="mt-3 whitespace-pre-wrap text-sm">{swot[q.key]}</p>
          </section>
        ))}
      </div>
      <p className="text-xs text-[var(--color-ink-muted)]">
        This SWOT is a single-source snapshot. Team Lead, Commando, and self-assessments stay as separate records.
      </p>
      <Link href="/swot" className="text-sm text-[var(--color-brand)]">
        Back to SWOT list
      </Link>
    </div>
  );
}
