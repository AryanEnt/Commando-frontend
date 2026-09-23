"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type SearchableOption = {
  value: string;
  label: string;
  hint?: string;
};

type Props = {
  value: string;
  onChange: (value: string, option?: SearchableOption) => void;
  options: SearchableOption[];
  label?: string;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
};

/**
 * Client-side searchable selector for static option lists (users, categories, etc.).
 * For Sales Executive profiles, prefer ProfileSearchSelect (API search).
 */
export function SearchableSelect({
  value,
  onChange,
  options,
  label = "Select",
  placeholder = "Search…",
  allowClear = true,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.hint?.toLowerCase().includes(q) ?? false),
    );
  }, [options, query]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={rootRef} className="relative w-full min-w-[12rem]">
      <label className="block text-sm font-medium text-[var(--color-ink)]">
        {label}
        <button
          type="button"
          disabled={disabled}
          className="mt-1 flex h-10 w-full items-center justify-between rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)] px-3 text-left text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-soft)] disabled:bg-[var(--color-surface-2)]"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className={selected ? "text-[var(--color-ink)]" : "text-[var(--color-ink-subtle)]"}>
            {selected?.label ?? placeholder}
          </span>
          <span className="text-xs text-[var(--color-ink-subtle)]">▾</span>
        </button>
      </label>
      {allowClear && value && (
        <button
          type="button"
          className="mt-1 text-xs text-[var(--color-brand-dark)] underline"
          onClick={() => onChange("")}
        >
          Clear
        </button>
      )}
      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-md)]">
          <input
            autoFocus
            className="w-full border-b border-[var(--color-line)] px-3 py-2 text-sm focus:outline-none"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={`Search ${label}`}
          />
          <ul
            role="listbox"
            className="max-h-56 overflow-y-auto py-1 text-sm"
          >
            {filtered.map((opt) => (
              <li key={opt.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={opt.value === value}
                  className={`block w-full px-3 py-2 text-left hover:bg-[var(--color-brand-soft)] ${
                    opt.value === value ? "bg-[var(--color-brand-soft)]" : ""
                  }`}
                  onClick={() => {
                    onChange(opt.value, opt);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <span className="font-medium text-[var(--color-ink)]">{opt.label}</span>
                  {opt.hint && (
                    <span className="mt-0.5 block text-xs text-[var(--color-ink-muted)]">
                      {opt.hint}
                    </span>
                  )}
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-3 text-[var(--color-ink-muted)]">No matches</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
