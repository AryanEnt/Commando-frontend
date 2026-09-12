"use client";

import Link from "next/link";
import type { ReportsOverview } from "@/lib/api";

type Props = {
  counts: ReportsOverview["counts"];
};

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

export function OperationalSummary({ counts }: Props) {
  const { interventions, overdueActions, weeklyReviews, teams, salesExecutives, commandos } =
    counts;

  return (
    <section
      aria-labelledby="org-status-heading"
      className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] bg-[var(--color-surface-2)] px-4 py-2.5">
        <h2
          id="org-status-heading"
          className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-subtle)]"
        >
          Organization status
        </h2>
        <p className="text-[11px] text-[var(--color-ink-subtle)]">
          Live counts · no derived KPIs
        </p>
      </div>

      <div className="grid divide-y divide-[var(--color-line)] lg:grid-cols-3 lg:divide-x lg:divide-y-0">
        <SummaryBlock
          label="Interventions"
          href="/reports/commando-performance"
          primary={{
            value: interventions.active,
            unit: interventions.active === 1 ? "active" : "active",
          }}
          secondary={[
            { label: "completed", value: interventions.completed },
            { label: "exited", value: interventions.exited },
          ]}
          weight="hero"
        />
        <SummaryBlock
          label="Activity"
          href="/reports/commando-performance"
          primary={{
            value: overdueActions,
            unit: overdueActions === 1 ? "overdue" : "overdue",
            tone: overdueActions > 0 ? "critical" : "neutral",
          }}
          secondary={[
            { label: "draft reviews", value: weeklyReviews.draft },
            { label: "submitted", value: weeklyReviews.submitted },
          ]}
          weight="standard"
        />
        <SummaryBlock
          label="Coverage"
          href="/organization"
          primary={{
            value: teams,
            unit: teams === 1 ? "team" : "teams",
          }}
          secondary={[
            {
              label: plural(salesExecutives, "sales executive", "sales executives"),
              value: null,
            },
            {
              label: plural(commandos, "Commando", "Commandos"),
              value: null,
            },
          ]}
          weight="compact"
        />
      </div>
    </section>
  );
}

function SummaryBlock({
  label,
  href,
  primary,
  secondary,
  weight,
}: {
  label: string;
  href: string;
  primary: {
    value: number;
    unit: string;
    tone?: "neutral" | "critical";
  };
  secondary: Array<{ label: string; value: number | null }>;
  weight: "hero" | "standard" | "compact";
}) {
  const valueSize =
    weight === "hero"
      ? "text-[2.35rem] sm:text-[2.6rem]"
      : weight === "standard"
        ? "text-[2rem]"
        : "text-[1.75rem]";

  return (
    <Link
      href={href}
      className="group flex flex-col justify-between gap-4 px-4 py-4 transition duration-200 hover:bg-[var(--color-surface-2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-focus)]"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-subtle)]">
        {label}
      </p>
      <div>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span
            className={`font-semibold tabular-nums leading-none tracking-tight ${valueSize} ${
              primary.tone === "critical"
                ? "text-[var(--status-danger)]"
                : "text-[var(--color-ink)]"
            }`}
          >
            {primary.value}
          </span>
          <span className="text-sm text-[var(--color-ink-muted)]">
            {primary.unit}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          {secondary.map((item) => (
            <p
              key={item.label}
              className="text-xs text-[var(--color-ink-muted)]"
            >
              {item.value !== null ? (
                <>
                  <span className="font-medium tabular-nums text-[var(--color-ink)]">
                    {item.value}
                  </span>{" "}
                  {item.label}
                </>
              ) : (
                item.label
              )}
            </p>
          ))}
        </div>
      </div>
    </Link>
  );
}
