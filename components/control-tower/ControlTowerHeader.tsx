"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui";
import { formatFreshness } from "./utils";

type Props = {
  generatedAt?: string;
  loadedAt: number;
  refreshing: boolean;
  loading: boolean;
  onRefresh: () => void;
};

export function ControlTowerHeader({
  generatedAt,
  loadedAt,
  refreshing,
  loading,
  onRefresh,
}: Props) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-subtle)]">
          Super Admin
        </p>
        <h1 className="mt-1 text-[1.85rem] font-semibold tracking-[-0.03em] text-[var(--color-ink)] sm:text-[2rem]">
          Control Tower
        </h1>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-[var(--color-ink-muted)]">
          Platform governance and operational oversight.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {!loading && (
          <p className="text-xs tabular-nums text-[var(--color-ink-subtle)]">
            {formatFreshness(generatedAt, loadedAt)}
          </p>
        )}
        <Button
          variant="secondary"
          size="sm"
          disabled={refreshing || loading}
          onClick={onRefresh}
          aria-label={refreshing ? "Refreshing control tower" : "Refresh control tower"}
        >
          <RefreshCw
            size={14}
            className={refreshing ? "animate-spin" : undefined}
            aria-hidden
          />
          {refreshing ? "Refreshing…" : "Refresh"}
        </Button>
      </div>
    </header>
  );
}
