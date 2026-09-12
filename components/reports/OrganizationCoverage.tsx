"use client";

import Link from "next/link";
import {
  BriefcaseBusiness,
  ChevronDown,
  UserCheck,
  UsersRound,
} from "lucide-react";
import type { ReportsOverview } from "@/lib/api";

type Props = {
  counts: ReportsOverview["counts"];
};

export function OrganizationCoverage({ counts }: Props) {
  const layers = [
    {
      key: "teams",
      label: "Teams",
      value: counts.teams,
      detail: counts.teams === 1 ? "active" : "active",
      href: "/teams",
      icon: UsersRound,
    },
    {
      key: "ses",
      label: "Sales Executives",
      value: counts.salesExecutives,
      detail: "monitored",
      href: "/profiles",
      icon: BriefcaseBusiness,
    },
    {
      key: "commandos",
      label: "Commandos",
      value: counts.commandos,
      detail: "active",
      href: "/users?roleCode=COMMANDO_EXECUTIVE",
      icon: UserCheck,
    },
  ];

  return (
    <section
      aria-labelledby="coverage-heading"
      className="flex h-full flex-col rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)]"
    >
      <div className="border-b border-[var(--color-line)] px-4 py-3.5">
        <h2
          id="coverage-heading"
          className="text-[15px] font-semibold tracking-tight text-[var(--color-ink)]"
        >
          Organizational coverage
        </h2>
        <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
          Headcount footprint — relationships live in Organization
        </p>
      </div>

      <div className="flex flex-1 flex-col justify-between gap-5 px-4 py-4">
        <ul className="space-y-2">
          {layers.map((layer, index) => {
            const Icon = layer.icon;
            return (
              <li key={layer.key} className="flex flex-col items-stretch">
                <Link
                  href={layer.href}
                  className="group flex items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-3 transition duration-150 hover:border-[var(--color-line-strong)] hover:bg-[var(--color-surface-2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
                >
                  <span
                    className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] text-[var(--color-ink-muted)] transition group-hover:bg-[var(--color-brand-soft)] group-hover:text-[var(--color-brand)]"
                    aria-hidden
                  >
                    <Icon size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--color-ink)]">
                      {layer.label}
                    </p>
                    <p className="text-xs text-[var(--color-ink-muted)]">
                      {layer.detail}
                    </p>
                  </div>
                  <span className="text-[1.35rem] font-semibold tabular-nums leading-none text-[var(--color-ink)]">
                    {layer.value}
                  </span>
                </Link>
                {index < layers.length - 1 && (
                  <div
                    className="flex justify-center py-1 text-[var(--color-ink-subtle)]"
                    aria-hidden
                  >
                    <ChevronDown size={14} strokeWidth={1.5} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <Link
          href="/organization"
          className="text-xs font-medium text-[var(--color-brand)] transition hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
        >
          View Team Lead → Commando → SE structure
        </Link>
      </div>
    </section>
  );
}
