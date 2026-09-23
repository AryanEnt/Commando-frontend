"use client";

import { Button } from "@/components/ui";
import {
  pageWindow,
  visiblePages,
  type PaginationMeta,
} from "@/lib/pagination";

type Props = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
  disabled?: boolean;
  noun?: string;
};

export function PaginationControls({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  disabled,
  noun = "results",
}: Props) {
  const meta: PaginationMeta = {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize) || 1),
    hasNextPage: page * pageSize < total,
    hasPreviousPage: page > 1,
  };
  const { from, to } = pageWindow(page, pageSize, total);
  const pages = visiblePages(page, meta.totalPages);

  if (total === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-line)] pt-3 text-sm">
      <p className="text-[var(--color-ink-muted)]" aria-live="polite">
        Showing{" "}
        <span className="font-medium text-[var(--color-ink)]">
          {from}–{to}
        </span>{" "}
        of <span className="font-medium text-[var(--color-ink)]">{total}</span>{" "}
        {noun}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        {onPageSizeChange ? (
          <div className="flex items-center gap-2">
            <label
              htmlFor="page-size"
              className="text-xs text-[var(--color-ink-muted)]"
            >
              Rows
            </label>
            <select
              id="page-size"
              className="h-8 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)] px-2 text-sm"
              value={pageSize}
              disabled={disabled}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <nav
          aria-label="Pagination"
          className="flex flex-wrap items-center gap-1"
        >
          <Button
            variant="secondary"
            size="sm"
            disabled={disabled || !meta.hasPreviousPage}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
          >
            Previous
          </Button>
          {pages.map((p, idx) =>
            p === "ellipsis" ? (
              <span
                key={`e-${idx}`}
                className="px-1 text-[var(--color-ink-subtle)]"
                aria-hidden
              >
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                disabled={disabled}
                aria-label={`Page ${p}`}
                aria-current={p === page ? "page" : undefined}
                className={`inline-flex h-8 min-w-8 items-center justify-center rounded-[var(--radius-sm)] px-2 text-xs font-medium ${
                  p === page
                    ? "bg-[var(--color-brand)] text-[var(--color-brand-on)]"
                    : "border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-[var(--color-surface-2)]"
                }`}
                onClick={() => onPageChange(p)}
              >
                {p}
              </button>
            ),
          )}
          <Button
            variant="secondary"
            size="sm"
            disabled={disabled || !meta.hasNextPage}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
          >
            Next
          </Button>
        </nav>
      </div>
    </div>
  );
}
