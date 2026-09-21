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
  SwotQuadrantBoard,
  type SwotQuadrantKey,
  SWOT_QUADRANTS,
} from "@/components/swot/SwotQuadrantBoard";
import {
  DateTimeCell,
  ErrorState,
  LoadingState,
  PageHeader,
} from "@/components/ui";

export default function SwotDetailPage() {
  const params = useParams<{ id: string }>();
  const { token, user, hasPermission } = useAuth();
  const { pushToast } = useToast();
  const [swot, setSwot] = useState<SwotItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyFlag, setBusyFlag] = useState<SwotQuadrantKey | "all" | string | null>(
    null,
  );

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

  async function patchVisibility(
    body: Parameters<typeof api.setSwotVisibility>[2],
    flag: SwotQuadrantKey | "all" | string,
    okMessage: string,
  ) {
    if (!token || !swot || !canToggleVisibility) return;
    setBusyFlag(flag);
    try {
      const res = await api.setSwotVisibility(token, swot.id, body);
      setSwot(res.data.swot);
      pushToast(okMessage, "success");
    } catch (err) {
      pushToast(
        err instanceof Error ? err.message : "Could not update sharing",
        "error",
      );
    } finally {
      setBusyFlag(null);
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
        this one in history. Team Lead and Commando can always see every point.
        The Sales Executive only sees checked points.
      </p>

      <SwotQuadrantBoard
        swot={swot}
        canShare={canToggleVisibility}
        isSe={user?.roleCode === "SALES_EXECUTIVE"}
        busyFlag={busyFlag}
        onTogglePoint={(quadrant, pointId, next) => {
          const q = SWOT_QUADRANTS.find((item) => item.key === quadrant);
          void patchVisibility(
            { point: { quadrant, id: pointId, visible: next } },
            pointId,
            next
              ? `${q?.title ?? "Point"} shared with the Sales Executive`
              : `${q?.title ?? "Point"} held back from the Sales Executive`,
          );
        }}
        onShareAll={(share) => {
          void patchVisibility(
            { visibleToSalesExecutive: share },
            "all",
            share
              ? "All points shared with the Sales Executive"
              : "SWOT held back from the Sales Executive",
          );
        }}
      />

      <p>
        <Link
          href={`/profiles/${swot.salesExecutiveProfileId}/swot`}
          className="text-sm font-medium text-[var(--color-brand)] hover:underline"
        >
          ← Back to SWOT
        </Link>
      </p>
    </div>
  );
}
