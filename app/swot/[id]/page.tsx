"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, type SwotItem } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { personName, roleLabel } from "@/lib/labels";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Button,
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
  const { token, user, hasPermission } = useAuth();
  const { pushToast } = useToast();
  const [swot, setSwot] = useState<SwotItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visibilityBusy, setVisibilityBusy] = useState(false);

  const canToggleVisibility =
    Boolean(user) &&
    hasPermission("SWOT_CREATE") &&
    Boolean(swot) &&
    ((user!.roleCode === "TEAM_LEAD" && swot!.source === "TEAM_LEAD") ||
      (user!.roleCode === "COMMANDO_EXECUTIVE" && swot!.source === "COMMANDO"));

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
          setError(
            err instanceof Error
              ? err.message
              : "We couldn't load this SWOT.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, params.id]);

  async function toggleVisibility() {
    if (!token || !swot || !canToggleVisibility) return;
    setVisibilityBusy(true);
    try {
      const next = !swot.visibleToSalesExecutive;
      const res = await api.setSwotVisibility(token, swot.id, next);
      setSwot(res.data.swot);
      pushToast(
        next
          ? "SWOT is now visible to the Sales Executive"
          : "SWOT hidden from the Sales Executive",
        "success",
      );
    } catch (err) {
      pushToast(
        err instanceof Error ? err.message : "Could not update visibility",
        "error",
      );
    } finally {
      setVisibilityBusy(false);
    }
  }

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
        description={`${swot.team.name} · ${sourceLabel}${
          swot.versionNumber ? ` · Version ${swot.versionNumber}` : ""
        }`}
        actions={<StatusBadge status={swot.source} />}
      />
      <p className="text-sm text-[var(--color-ink-muted)]">
        Authored by {personName(swot.createdBy)} (
        {roleLabel(swot.createdBy.role.code)}) ·{" "}
        <DateTimeCell value={swot.createdAt} />
      </p>
      <p className="text-xs text-[var(--color-ink-muted)]">
        This version is read-only. Updating SWOT creates a new version and keeps
        this one in history. Team Lead and Commando can always see each
        other’s SWOT.
      </p>

      {canToggleVisibility ? (
        <section className="surface flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-semibold text-[var(--color-ink)]">
              Sales Executive visibility
            </p>
            <p className="mt-0.5 text-[13px] text-[var(--color-ink-muted)]">
              {swot.visibleToSalesExecutive
                ? "This version is visible to the Sales Executive."
                : "This version is hidden from the Sales Executive."}{" "}
              You can only share your own assessment stream.
            </p>
          </div>
          <Button
            variant={swot.visibleToSalesExecutive ? "secondary" : "primary"}
            size="sm"
            disabled={visibilityBusy}
            onClick={() => void toggleVisibility()}
          >
            {visibilityBusy
              ? "Saving…"
              : swot.visibleToSalesExecutive
                ? "Hide from SE"
                : "Make visible to SE"}
          </Button>
        </section>
      ) : swot.source !== "SALES_EXECUTIVE" &&
        user?.roleCode !== "SALES_EXECUTIVE" ? (
        <p className="text-xs text-[var(--color-ink-muted)]">
          SE visibility:{" "}
          {swot.visibleToSalesExecutive ? "Shared with SE" : "Not shared with SE"}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {QUADRANTS.map((q) => (
          <section key={q.key} className="surface p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">
              {q.title}
            </h2>
            <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
              {q.explanation}
            </p>
            <p className="mt-3 whitespace-pre-wrap text-sm">{swot[q.key]}</p>
          </section>
        ))}
      </div>
      <p className="text-xs text-[var(--color-ink-muted)]">
        Team Lead, Commando, and self-assessments stay as separate version
        streams. Historical versions are never overwritten.
      </p>
      <Link
        href={`/profiles/${swot.salesExecutiveProfileId}/swot`}
        className="text-sm text-[var(--color-brand)]"
      >
        Back to SWOT
      </Link>
    </div>
  );
}
