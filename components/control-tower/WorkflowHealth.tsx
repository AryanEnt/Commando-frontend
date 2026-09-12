"use client";

import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  FileText,
  GitPullRequest,
  Headphones,
} from "lucide-react";
import { statusTone, type WorkflowRow } from "./utils";

const WORKFLOW_ICONS = {
  referrals: GitPullRequest,
  actions: ClipboardList,
  reviews: FileText,
  support: Headphones,
} as const;

type Props = {
  rows: WorkflowRow[];
};

export function WorkflowHealth({ rows }: Props) {
  return (
    <section
      aria-labelledby="workflow-health-heading"
      className="h-full rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)]"
    >
      <div className="border-b border-[var(--color-line)] px-4 py-4 sm:px-5">
        <h2
          id="workflow-health-heading"
          className="text-[15px] font-semibold tracking-tight text-[var(--color-ink)]"
        >
          Workflow health
        </h2>
        <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
          Current state across core workflows
        </p>
      </div>

      <ul className="divide-y divide-[var(--color-line)]">
        {rows.map((row) => {
          const tone = statusTone(row.status);
          const Icon =
            WORKFLOW_ICONS[row.key as keyof typeof WORKFLOW_ICONS] ??
            ClipboardList;
          return (
            <li key={row.key}>
              <Link
                href={row.href}
                className="group flex items-center gap-3 px-4 py-3.5 transition duration-200 hover:bg-[var(--color-surface-2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-focus)] sm:px-5"
              >
                <span
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-canvas-2)] text-[var(--color-ink-muted)] transition group-hover:text-[var(--color-ink)]"
                  aria-hidden
                >
                  <Icon size={16} strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <p className="text-sm font-medium text-[var(--color-ink)]">
                      {row.workflow}
                    </p>
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium ${tone.text}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${tone.dot}`}
                        aria-hidden
                      />
                      <span>{tone.label}</span>
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
                    {row.state}
                  </p>
                </div>
                <ArrowRight
                  size={14}
                  className="shrink-0 text-[var(--color-ink-subtle)] opacity-0 transition duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
                  aria-hidden
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
