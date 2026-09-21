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
    <header className="page-hero">
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-brand)]">
            Super Admin
          </p>
          <h1 className="mt-1.5 text-[1.625rem] font-semibold tracking-[-0.03em] text-[var(--color-ink)] sm:text-[1.75rem]">
            Control Tower
          </h1>
          <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-[var(--color-ink-muted)]">
            Here's what's happening across the platform today.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {!loading && (
            <p className="text-[12px] tabular-nums text-[var(--color-ink-muted)]">
              {formatFreshness(generatedAt, loadedAt)}
            </p>
          )}
          <Button
            variant="secondary"
            size="sm"
            disabled={refreshing || loading}
            onClick={onRefresh}
            aria-label={
              refreshing ? "Refreshing control tower" : "Refresh control tower"
            }
          >
            <RefreshCw
              size={14}
              className={refreshing ? "animate-spin" : undefined}
              aria-hidden
            />
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </div>
    </header>
  );
}
