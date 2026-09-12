"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui";
import { formatFreshness } from "@/components/control-tower/utils";

type Props = {
  loadedAt: number;
  refreshing: boolean;
  loading: boolean;
  onRefresh: () => void;
};

export function ReportsHeader({
  loadedAt,
  refreshing,
  loading,
  onRefresh,
}: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/profiles?q=${encodeURIComponent(q)}` : "/profiles");
  }

  return (
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-line)] pb-5">
      <div className="min-w-0 max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-subtle)]">
          Super Admin
        </p>
        <h1 className="mt-1 text-[1.85rem] font-semibold tracking-[-0.03em] text-[var(--color-ink)] sm:text-[2rem]">
          Reports & Oversight
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-ink-muted)]">
          Operational intelligence across interventions, workflows, and
          organizational coverage.
        </p>
      </div>

      <div className="flex w-full flex-col items-stretch gap-2.5 sm:w-auto sm:items-end">
        <div className="flex flex-wrap items-center justify-end gap-2">
          {!loading && (
            <p className="text-xs tabular-nums text-[var(--color-ink-subtle)]">
              {formatFreshness(undefined, loadedAt)}
            </p>
          )}
          <Button
            variant="secondary"
            size="sm"
            disabled={refreshing || loading}
            onClick={onRefresh}
            aria-label={refreshing ? "Refreshing reports" : "Refresh reports"}
          >
            <RefreshCw
              size={14}
              className={refreshing ? "animate-spin" : undefined}
              aria-hidden
            />
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
        </div>

        <form onSubmit={onSearch} className="relative w-full sm:w-[17.5rem]">
          <Search
            size={15}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--color-ink-subtle)]"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sales executives…"
            aria-label="Search sales executives"
            className="w-full rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)] py-2 pr-3 pl-9 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-subtle)] transition-[border-color,box-shadow] duration-150 focus:border-[var(--color-brand)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-soft)]"
          />
        </form>
      </div>
    </header>
  );
}
