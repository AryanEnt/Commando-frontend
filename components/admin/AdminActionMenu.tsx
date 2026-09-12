"use client";

import { useEffect, useId, useRef, useState } from "react";

export type AdminMenuItem = {
  label: string;
  onSelect: () => void;
  tone?: "default" | "danger";
  disabled?: boolean;
};

export function AdminActionMenu({
  label = "Actions",
  items,
}: {
  label?: string;
  items: AdminMenuItem[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative inline-flex" ref={rootRef}>
      <button
        type="button"
        className="inline-flex h-8 items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 text-xs font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface-2)]"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
        <span aria-hidden className="text-[var(--color-ink-subtle)]">
          ▾
        </span>
      </button>
      {open ? (
        <ul
          id={menuId}
          role="menu"
          className="absolute right-0 z-20 mt-1 min-w-[10rem] overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)] py-1 shadow-[var(--shadow-md)]"
        >
          {items.map((item) => (
            <li key={item.label} role="none">
              <button
                type="button"
                role="menuitem"
                disabled={item.disabled}
                className={`flex w-full px-3 py-2 text-left text-sm disabled:opacity-50 ${
                  item.tone === "danger"
                    ? "text-[var(--status-danger)] hover:bg-[var(--status-danger-bg)]"
                    : "text-[var(--color-ink)] hover:bg-[var(--color-surface-2)]"
                }`}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
