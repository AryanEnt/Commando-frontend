"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  History,
  Network,
  UserCheck,
} from "lucide-react";
import type { ReportsOverview } from "@/lib/api";

type Props = {
  modules: ReportsOverview["modules"];
};

const MODULE_META: Record<
  string,
  { icon: LucideIcon; cta: string; accent?: boolean }
> = {
  "commando-performance": {
    icon: UserCheck,
    cta: "Open report",
    accent: true,
  },
  "sales-executives": {
    icon: BriefcaseBusiness,
    cta: "View executives",
  },
  organization: {
    icon: Network,
    cta: "View organization",
  },
  audit: {
    icon: History,
    cta: "Open audit trail",
  },
};

export function InvestigationModules({ modules }: Props) {
  return (
    <section aria-labelledby="investigate-heading">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2
            id="investigate-heading"
            className="text-[15px] font-semibold tracking-tight text-[var(--color-ink)]"
          >
            Investigate
          </h2>
          <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
            Explore detailed operational records. Source records remain immutable.
          </p>
        </div>
      </div>

      {modules.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-8 text-center">
          <p className="text-sm font-medium text-[var(--color-ink)]">
            No report modules
          </p>
          <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
            Modules will appear here when configured.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {modules.map((mod) => {
            const meta = MODULE_META[mod.key] ?? {
              icon: ArrowUpRight,
              cta: "Open",
            };
            const Icon = meta.icon;
            return (
              <Link
                key={mod.key}
                href={mod.href}
                className={`group relative flex min-h-[9.5rem] flex-col justify-between rounded-[var(--radius-md)] border px-4 py-4 transition duration-200 hover:border-[var(--color-line-strong)] hover:bg-[var(--color-surface-2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] ${
                  meta.accent
                    ? "border-[var(--color-brand)]/25 bg-[var(--color-brand-soft)]/35"
                    : "border-[var(--color-line)] bg-[var(--color-surface)]"
                }`}
              >
                <div>
                  <span
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] transition duration-200 group-hover:-translate-y-0.5 ${
                      meta.accent
                        ? "bg-[var(--color-brand-soft)] text-[var(--color-brand)]"
                        : "bg-[var(--color-surface-2)] text-[var(--color-ink-muted)] group-hover:text-[var(--color-brand)]"
                    }`}
                    aria-hidden
                  >
                    <Icon size={16} strokeWidth={1.75} />
                  </span>
                  <p className="mt-3 text-sm font-semibold text-[var(--color-ink)]">
                    {mod.title}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-ink-muted)]">
                    {mod.description}
                  </p>
                </div>
                <p className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-[var(--color-brand)]">
                  {meta.cta}
                  <ArrowUpRight
                    size={12}
                    className="transition duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    aria-hidden
                  />
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
