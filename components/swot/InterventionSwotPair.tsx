"use client";

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { Briefcase, ClipboardCheck, UserRound } from "lucide-react";
import type { TeamLeadUserSwot } from "@/lib/api";
import { formatDate } from "@/lib/dates";
import { personName } from "@/lib/labels";
import { swotSourceLabel } from "@/lib/swot-display";
import { TabPanel, Tabs } from "@/components/ui";
import { SwotQuadrantGrid, type SwotLike } from "@/components/swot/SwotQuadrant";
import {
  SwotMetaRow,
  SwotQuietState,
  SwotSectionHeader,
} from "@/components/swot/SwotSections";

export type MiniSwot = SwotLike & {
  id: string;
  source: string;
  versionNumber?: number | null;
  createdAt: string;
  createdBy?: { firstName?: string; lastName?: string } | null;
};

export function UserSwotBadge() {
  return (
    <span className="iswot-kind is-user">
      <UserRound size={13} strokeWidth={2.2} aria-hidden />
      User SWOT
    </span>
  );
}

export function ProfileSwotBadge() {
  return (
    <span className="iswot-kind is-profile">
      <Briefcase size={13} strokeWidth={2.2} aria-hidden />
      Profile SWOT
    </span>
  );
}

const USER_SOURCE_ORDER = ["SALES_EXECUTIVE", "TEAM_LEAD", "COMMANDO"];

function personRoleTitle(person: Pick<TeamLeadUserSwot, "role">) {
  return person.role === "SALES_SUPPORT_EXECUTIVE"
    ? "Sales Support Executive"
    : "Sales Executive";
}

type CreateSwotHref = (person: TeamLeadUserSwot) => string | null;

function TeamLeadUserSwotBody({
  person,
  createHref,
}: {
  person: TeamLeadUserSwot;
  createHref?: CreateSwotHref;
}) {
  if (person.swot) {
    return (
      <>
        <SwotMetaRow swot={person.swot} />
        <SwotQuadrantGrid swot={person.swot} />
      </>
    );
  }
  const href = createHref?.(person);
  return (
    <SwotQuietState>
      No User SWOT from the Team Lead for {person.name} yet.
      {href ? (
        <>
          {" "}
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="swot-link"
          >
            Add User SWOT ↗
          </a>
        </>
      ) : null}
    </SwotQuietState>
  );
}

/** One person's latest Team Lead User SWOT, headed by role and name. */
export function TeamLeadUserSwotSection({
  person,
  note,
  createHref,
}: {
  person: TeamLeadUserSwot;
  note?: string;
  /** Opens in a new tab so an in-progress form is not lost. */
  createHref?: CreateSwotHref;
}) {
  return (
    <article className="swot-section">
      <SwotSectionHeader
        icon={<UserRound size={14} strokeWidth={2.2} />}
        title={personRoleTitle(person)}
        description={note ? `${person.name} · ${note}` : person.name}
      />
      <TeamLeadUserSwotBody person={person} createHref={createHref} />
    </article>
  );
}

/** Sales Executive first, then each linked SSE — all shown, one below the other. */
export function TeamLeadUserSwotStack({
  people,
  note,
  createHref,
}: {
  people: TeamLeadUserSwot[];
  note?: string;
  createHref?: CreateSwotHref;
}) {
  const ordered = [
    ...people.filter((p) => p.role === "SALES_EXECUTIVE"),
    ...people.filter((p) => p.role !== "SALES_EXECUTIVE"),
  ];
  return (
    <div className="grid gap-4">
      {ordered.map((p) => (
        <TeamLeadUserSwotSection
          key={p.subjectUserId}
          person={p}
          note={note}
          createHref={createHref}
        />
      ))}
    </div>
  );
}

/** "Updated 7 Oct 2026 by Tina Lead" */
function SwotUpdatedLine({ swot }: { swot: MiniSwot }) {
  const by = swot.createdBy ? personName(swot.createdBy) : null;
  return (
    <p className="m-0 text-xs text-[var(--color-ink-muted)]">
      Updated {formatDate(swot.createdAt)}
      {by && by !== "—" ? ` by ${by}` : ""}
    </p>
  );
}

function AddSwotLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <>
      {" "}
      <a href={href} target="_blank" rel="noreferrer" className="swot-link">
        {children}
      </a>
    </>
  );
}

/**
 * One person's User SWOTs for the Team Lead's packet: the one they wrote about
 * themselves and the Team Lead's, as two separate cards side by side.
 */
export function PersonSwotCard({
  person,
  createHref,
}: {
  person: TeamLeadUserSwot;
  /** Opens in a new tab so an in-progress form is not lost. */
  createHref?: CreateSwotHref;
}) {
  const headingId = useId();
  const selfSwot = person.selfSwot ?? null;
  const firstName = person.name.split(" ")[0] || person.name;
  const href = createHref?.(person) ?? null;

  return (
    <section className="grid gap-3" aria-labelledby={headingId}>
      <h3 id={headingId} className="swot-section-title">
        <span className="swot-section-icon" aria-hidden>
          <UserRound size={14} strokeWidth={2.2} />
        </span>
        {person.name}
        <span className="swot-section-desc">— {personRoleTitle(person)}</span>
      </h3>
      <div className="grid gap-4 xl:grid-cols-2">
        <article className="swot-section">
          <SwotSectionHeader
            icon={<UserRound size={14} strokeWidth={2.2} />}
            title={`By ${firstName}`}
            description="their own SWOT"
          />
          {selfSwot ? (
            <>
              <SwotUpdatedLine swot={selfSwot} />
              <SwotQuadrantGrid swot={selfSwot} />
            </>
          ) : (
            <SwotQuietState>{`${firstName} hasn't written their own SWOT yet.`}</SwotQuietState>
          )}
        </article>
        <article className="swot-section">
          <SwotSectionHeader
            icon={<ClipboardCheck size={14} strokeWidth={2.2} />}
            title="By you"
            description="Team Lead"
          />
          {person.swot ? (
            <>
              <SwotUpdatedLine swot={person.swot} />
              <SwotQuadrantGrid swot={person.swot} />
            </>
          ) : (
            <SwotQuietState>
              {`You haven't written a SWOT for ${firstName} yet.`}
              {href ? <AddSwotLink href={href}>Add one ↗</AddSwotLink> : null}
            </SwotQuietState>
          )}
        </article>
      </div>
    </section>
  );
}

/** Latest Team Lead / Commando Profile SWOT, read-only. */
export function ProfileSwotSection({
  swot,
  createHref,
  compact = false,
}: {
  swot: MiniSwot | null;
  /** Opens in a new tab so an in-progress form is not lost. */
  createHref?: string | null;
  /** Short "Updated … by …" line instead of the full version row. */
  compact?: boolean;
}) {
  return (
    <article className="swot-section">
      <SwotSectionHeader
        icon={<Briefcase size={14} strokeWidth={2.2} />}
        title="Profile SWOT"
        description="about the account sent for intervention"
      />
      {swot ? (
        <>
          {compact ? <SwotUpdatedLine swot={swot} /> : <SwotMetaRow swot={swot} />}
          <SwotQuadrantGrid swot={swot} />
        </>
      ) : (
        <SwotQuietState>
          No Profile SWOT from the Team Lead or Commando yet.
          {createHref ? (
            <>
              {" "}
              <a
                href={createHref}
                target="_blank"
                rel="noreferrer"
                className="swot-link"
              >
                Add Profile SWOT ↗
              </a>
            </>
          ) : null}
        </SwotQuietState>
      )}
    </article>
  );
}

/**
 * User SWOT (about the person) and Profile SWOT (about the profile sent for
 * intervention), each clearly labelled, for the referral page. Linked SSEs'
 * User SWOTs follow underneath.
 */
export function InterventionSwotPair({
  userSwots,
  profileSwot,
  personSwots = [],
  workspaceHref,
  showSupportSwots = true,
}: {
  userSwots: MiniSwot[];
  profileSwot: MiniSwot | null;
  /** Latest Team Lead User SWOT for the SE, then each linked SSE. */
  personSwots?: TeamLeadUserSwot[];
  workspaceHref?: string;
  /** Off while the Team Lead fills the packet — its SWOT step already lists linked SSEs. */
  showSupportSwots?: boolean;
}) {
  const userIdBase = useId();
  const supportSwots = showSupportSwots
    ? personSwots.filter((p) => p.role === "SALES_SUPPORT_EXECUTIVE")
    : [];
  const sePerson = personSwots.find((p) => p.role === "SALES_EXECUTIVE");
  const ordered = [...userSwots].sort(
    (a, b) =>
      USER_SOURCE_ORDER.indexOf(a.source) - USER_SOURCE_ORDER.indexOf(b.source),
  );
  const [activeSource, setActiveSource] = useState<string>(
    ordered[0]?.source ?? "",
  );
  const userSwot =
    ordered.find((s) => s.source === activeSource) ?? ordered[0] ?? null;

  const seUserSwot =
    userSwot ? (
      <>
        {ordered.length > 1 ? (
          <Tabs
            idBase={userIdBase}
            ariaLabel="User SWOT author"
            value={userSwot.source}
            onChange={setActiveSource}
            options={ordered.map((s) => ({
              value: s.source,
              label: swotSourceLabel(s.source),
            }))}
          />
        ) : null}
        <TabPanel
          idBase={userIdBase}
          value={userSwot.source}
          className="grid gap-3"
        >
          <SwotMetaRow swot={userSwot} />
          <SwotQuadrantGrid swot={userSwot} />
        </TabPanel>
      </>
    ) : (
      <SwotQuietState>No User SWOT recorded yet.</SwotQuietState>
    );

  return (
    <section className="surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">
            SWOT for this intervention
          </h2>
          <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">
            Two separate assessments — updating one never changes the other.
          </p>
        </div>
        {workspaceHref ? (
          <Link href={workspaceHref} className="swot-link">
            Open SWOT history →
          </Link>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <article className="swot-section">
          <SwotSectionHeader
            icon={<UserRound size={14} strokeWidth={2.2} />}
            title="User SWOT"
            description={
              supportSwots.length > 0 && sePerson
                ? `Sales Executive · ${sePerson.name}`
                : "about the person"
            }
          />
          {seUserSwot}
        </article>

        <ProfileSwotSection swot={profileSwot} />
      </div>

      {supportSwots.length > 0 ? (
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {supportSwots.map((p) => (
            <TeamLeadUserSwotSection
              key={p.subjectUserId}
              person={p}
              note="User SWOT by the Team Lead"
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
