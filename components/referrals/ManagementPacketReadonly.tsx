"use client";

import type { Referral } from "@/lib/api";

export function ManagementPacketReadonly({
  referral,
}: {
  referral: Referral;
}) {
  const swot = referral.teamLeadSwot;
  const priorities = [
    referral.priority1,
    referral.priority2,
    referral.priority3,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">
            Management Packet
          </h2>
          <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">
            Provided by Team Lead · Read-only
          </p>
        </div>
        <span className="rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-muted)] ring-1 ring-[var(--color-line)]">
          Read-only
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <ReadonlyBlock label="Why sales is down" value={referral.whySalesIsDown} />
        <ReadonlyBlock label="What is the gap" value={referral.whatIsTheGap} />
        <ReadonlyBlock
          label="Detailed summary of the gap"
          value={referral.detailedSummaryOfGap}
          className="lg:col-span-2"
        />
        <ReadonlyBlock
          label="Support already provided"
          value={referral.supportAlreadyProvided}
        />
        <ReadonlyBlock
          label="Support required from Commando"
          value={referral.supportRequiredFromCommando}
        />
        <ReadonlyBlock
          label="Recommended focus"
          value={referral.recommendationFocus}
          className="lg:col-span-2"
        />
      </div>

      {priorities.length > 0 && (
        <section className="surface p-4 sm:p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">
            Intervention Priorities
          </h3>
          <ol className="mt-3 space-y-3">
            {priorities.map((priority, index) => (
              <li key={`${index}-${priority}`} className="flex gap-3 text-sm">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-soft)] text-xs font-semibold text-[var(--color-brand)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="pt-1 font-medium text-[var(--color-ink)]">
                  {priority}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Profile SWOT</h3>
          <p className="text-xs text-[var(--color-ink-muted)]">
            Profile SWOT provided by Team Lead · Read-only
          </p>
        </div>
        {swot ? (
          <SwotGrid
            strength={swot.strength}
            weakness={swot.weakness}
            opportunity={swot.opportunity}
            threat={swot.threat}
          />
        ) : (
          <div className="surface border-dashed p-5 text-sm text-[var(--color-ink-muted)]">
            No Profile SWOT is attached to this intervention.
          </div>
        )}
      </section>

      {(referral.teamLeadSupportSwot?.length ?? 0) > 0 ||
      (referral.assignedSupport?.length ?? 0) > 0 ? (
        <section className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold">Sales Support SWOT</h3>
            <p className="text-xs text-[var(--color-ink-muted)]">
              Team Lead assessment of Sales Support assigned to this profile ·
              Read-only
            </p>
          </div>
          {(referral.teamLeadSupportSwot ?? []).length > 0 ? (
            (referral.teamLeadSupportSwot ?? []).map((item) => {
              const name =
                `${item.supportUser.firstName} ${item.supportUser.lastName}`.trim();
              return (
                <div key={item.id} className="space-y-3">
                  <p className="text-sm font-medium text-[var(--color-ink)]">
                    {name}
                  </p>
                  <SwotGrid
                    strength={item.strength}
                    weakness={item.weakness}
                    opportunity={item.opportunity}
                    threat={item.threat}
                  />
                </div>
              );
            })
          ) : (
            <div className="surface border-dashed p-5 text-sm text-[var(--color-ink-muted)]">
              No Sales Support SWOT is attached to this intervention.
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}

function ReadonlyBlock({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`surface p-4 sm:p-5 ${className}`}>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">
        {label}
      </h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-ink)]">
        {value || "—"}
      </p>
    </div>
  );
}

function SwotGrid({
  strength,
  weakness,
  opportunity,
  threat,
}: {
  strength: string;
  weakness: string;
  opportunity: string;
  threat: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <SwotBlock title="Strengths" value={strength} tone="strength" />
      <SwotBlock title="Weaknesses" value={weakness} tone="weakness" />
      <SwotBlock title="Opportunities" value={opportunity} tone="opportunity" />
      <SwotBlock title="Threats" value={threat} tone="threat" />
    </div>
  );
}

function SwotBlock({
  title,
  value,
  tone,
}: {
  title: string;
  value: string;
  tone: "strength" | "weakness" | "opportunity" | "threat";
}) {
  const accent =
    tone === "strength"
      ? "border-l-[var(--color-brand)]"
      : tone === "weakness"
        ? "border-l-[var(--status-danger)]"
        : tone === "opportunity"
          ? "border-l-[var(--color-accent)]"
          : "border-l-[var(--color-attention)]";

  return (
    <div className={`surface border-l-4 p-4 sm:p-5 ${accent}`}>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">
        {title}
      </h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-ink)]">
        {value}
      </p>
    </div>
  );
}
