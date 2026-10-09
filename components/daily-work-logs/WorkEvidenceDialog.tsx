"use client";

import { useEffect } from "react";
import { ExternalLink, X } from "lucide-react";
import type { DailyWorkLog } from "@/lib/api";
import { IconButton } from "@/components/ui";

/** Lightweight viewer for a row's evidence files (signed storage URLs). */
export function WorkEvidenceDialog({
  entry,
  onClose,
}: {
  entry: DailyWorkLog | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!entry) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [entry, onClose]);

  if (!entry) return null;
  const title = entry.listItemLabel
    ? [entry.listItemLabel, entry.subItemLabel].filter(Boolean).join(" · ")
    : entry.activity;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-ink)]/40 p-4 overlay-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wl-evidence-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-panel wl-evidence-dialog">
        <header className="wl-evidence-dialog-head">
          <div className="min-w-0">
            <p className="wl-evidence-dialog-kicker">Evidence</p>
            <h2 id="wl-evidence-title" className="wl-evidence-dialog-title">
              {title}
            </h2>
          </div>
          <IconButton label="Close" size="sm" onClick={onClose}>
            <X size={16} strokeWidth={2} aria-hidden />
          </IconButton>
        </header>
        <ul className="wl-evidence-grid">
          {entry.attachments.map((a) => (
            <li key={a.id} className="wl-evidence-tile">
              {a.url ? (
                <a href={a.url} target="_blank" rel="noreferrer" title={`Open ${a.fileName}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.url} alt={a.fileName} />
                  <span className="wl-evidence-tile-name">
                    {a.fileName}
                    <ExternalLink size={12} strokeWidth={2} aria-hidden />
                  </span>
                </a>
              ) : (
                <span className="wl-evidence-missing">Preview unavailable</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
