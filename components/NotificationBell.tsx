"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { formatWhen } from "@/lib/dates";
import { formatSeAlertCount, type SeNavAlertItem } from "@/lib/se-nav-alerts";
import { seSectionLabel } from "@/lib/se-workspace-nav";

export function NotificationBell({
  items,
  onMarkAllRead,
  onOpenItem,
}: {
  items: SeNavAlertItem[];
  onMarkAllRead: () => void;
  onOpenItem?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const count = items.length;
  const label = formatSeAlertCount(count);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-ink-muted)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
        aria-label={
          count > 0 ? `Notifications, ${count} unread` : "Notifications"
        }
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell size={18} strokeWidth={1.85} />
        {count > 0 ? (
          <span className="absolute right-1 top-1 inline-flex min-w-[1.05rem] items-center justify-center rounded-full bg-[var(--color-brand)] px-1 py-px text-[9px] font-bold leading-none text-[var(--color-brand-on)] ring-2 ring-[var(--color-surface)]">
            {label}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className="se-note-menu"
          role="menu"
          aria-label="Notifications"
        >
          <div className="se-note-head">
            <div>
              <p className="se-note-title">Notifications</p>
              <p className="se-note-sub">
                {count === 0
                  ? "You're caught up"
                  : `${count} new update${count === 1 ? "" : "s"}`}
              </p>
            </div>
            {count > 0 ? (
              <button
                type="button"
                className="se-note-clear"
                onClick={onMarkAllRead}
              >
                Mark all read
              </button>
            ) : null}
          </div>
          {count === 0 ? (
            <div className="se-note-empty">
              <Bell size={22} strokeWidth={1.6} aria-hidden />
              <p>No new notifications</p>
              <p>New work assigned to you will appear here.</p>
            </div>
          ) : (
            <ul className="se-note-list">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    role="menuitem"
                    className="se-note-item"
                    onClick={() => {
                      onOpenItem?.(item.id);
                      setOpen(false);
                    }}
                  >
                    <span className="se-note-dot" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="se-note-item-title">{item.title}</span>
                      <span className="se-note-item-meta">
                        {item.kind ?? seSectionLabel(item.section)} ·{" "}
                        {formatWhen(new Date(item.at).toISOString())}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
