"use client";

import Link from "next/link";
import type { ControlTowerData } from "@/lib/api";

type Props = {
  metrics: ControlTowerData["metrics"];
};

const CELLS: Array<{
  key: string;
  label: string;
  href: string;
  value: (m: ControlTowerData["metrics"]) => number;
  hint: (m: ControlTowerData["metrics"]) => string;
}> = [
  {
    key: "users",
    label: "Users",
    href: "/users",
    value: (m) => m.users.total,
    hint: (m) => `${m.users.active} active · ${m.users.inactive} inactive`,
  },
  {
    key: "teams",
    label: "Teams",
    href: "/teams",
    value: (m) => m.teams,
    hint: () => "Active teams",
  },
  {
    key: "ses",
    label: "Sales Executives",
    href: "/profiles",
    value: (m) => m.salesExecutives,
    hint: () => "Active profiles",
  },
  {
    key: "interventions",
    label: "Active Interventions",
    href: "/reports/commando-performance?status=ACTIVE",
    value: (m) => m.interventions.active,
    hint: (m) =>
      `${m.interventions.completed} completed · ${m.interventions.exited} exited`,
  },
];

/** Compact platform footprint — equal weight, no hero cards. */
export function PlatformPulse({ metrics }: Props) {
  return (
    <section aria-labelledby="platform-pulse-heading">
      <div className="mb-2.5">
        <h2
          id="platform-pulse-heading"
          className="text-section-title"
        >
          Platform pulse
        </h2>
        <p className="mt-0.5 text-meta">
          People, organization, and active interventions
        </p>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
        <dl className="grid grid-cols-2 divide-y divide-[var(--color-line)] sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          {CELLS.map((cell) => (
            <div key={cell.key} className="px-4 py-3.5 sm:px-5">
              <dt className="text-eyebrow">{cell.label}</dt>
              <dd className="mt-1.5">
                <Link
                  href={cell.href}
                  className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] rounded-[var(--radius-sm)]"
                >
                  <span className="block text-[1.375rem] font-semibold tabular-nums tracking-tight text-[var(--color-ink)] transition group-hover:text-[var(--color-brand)]">
                    {cell.value(metrics)}
                  </span>
                  <span className="mt-1 block text-meta">{cell.hint(metrics)}</span>
                </Link>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
