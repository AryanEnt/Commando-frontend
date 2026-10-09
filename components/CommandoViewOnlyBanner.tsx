"use client";

import { Eye, Lock } from "lucide-react";
import type { CommandoAccess } from "@/lib/api";
import { formatDate } from "@/lib/dates";
import { personName } from "@/lib/labels";

type ReadOnlyAccess = Extract<CommandoAccess, { mode: "READ_ONLY" }>;

function windowProgress(access: ReadOnlyAccess): number {
  const start = new Date(access.handedOffAt).getTime();
  const end = new Date(access.until).getTime();
  if (!(end > start)) return 0;
  const left = (end - Date.now()) / (end - start);
  return Math.min(1, Math.max(0, left));
}

/** Explains post-handoff view-only access: what the Commando can see, until when, and that edits are off. */
export function CommandoViewOnlyBanner({
  access,
  seName,
  compact = false,
}: {
  access: ReadOnlyAccess;
  seName: string;
  compact?: boolean;
}) {
  const lead = access.teamLead ? personName(access.teamLead) : "the Team Lead";
  const daysLabel = `${access.daysLeft} ${access.daysLeft === 1 ? "day" : "days"} left`;
  const urgent = access.daysLeft <= 5;

  return (
    <section
      role="status"
      aria-label="View-only access"
      className={`viewonly-banner${compact ? " is-compact" : ""}${urgent ? " is-urgent" : ""}`}
    >
      <span className="viewonly-banner-icon" aria-hidden>
        <Eye size={16} strokeWidth={2} />
      </span>
      <div className="viewonly-banner-body">
        <div className="viewonly-banner-head">
          <p className="viewonly-banner-title">View-only access</p>
          <span className="viewonly-banner-days">{daysLabel}</span>
        </div>
        <p className="viewonly-banner-text">
          {seName} was handed off to <strong>{lead}</strong> on{" "}
          {formatDate(access.handedOffAt)}. You can still see all records —
          including anything new from the Sales Executive or Team Lead — until{" "}
          <strong>{formatDate(access.until)}</strong>.
        </p>
        {!compact ? (
          <p className="viewonly-banner-lock">
            <Lock size={12} strokeWidth={2.25} aria-hidden />
            Adding, editing and deleting are turned off.
          </p>
        ) : null}
        <div
          className="viewonly-banner-meter"
          role="progressbar"
          aria-label="Time remaining"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(windowProgress(access) * 100)}
        >
          <span style={{ width: `${windowProgress(access) * 100}%` }} />
        </div>
      </div>
    </section>
  );
}

/** Small pill for lists: "View-only · 12 days left". */
export function ViewOnlyPill({ access }: { access: ReadOnlyAccess }) {
  return (
    <span
      className={`viewonly-pill${access.daysLeft <= 5 ? " is-urgent" : ""}`}
      title={`Handed off ${formatDate(access.handedOffAt)} · view-only until ${formatDate(access.until)}`}
    >
      <Eye size={12} strokeWidth={2.25} aria-hidden />
      View-only · {access.daysLeft}d left
    </span>
  );
}
