"use client";

import Link from "next/link";
import { useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Briefcase, FileText, Lock, Plus, UserRound } from "lucide-react";
import type { SwotItem } from "@/lib/api";
import { formatDate } from "@/lib/dates";
import { personName } from "@/lib/labels";
import {
  isSelfSwotSource,
  swotDetailHref,
  swotKindLabel,
  swotNewestFirst,
  swotShareLabel,
  swotSourceLabel,
} from "@/lib/swot-display";
import { ButtonLink, TabPanel, Tabs } from "@/components/ui";
import { SwotQuadrantGrid } from "@/components/swot/SwotQuadrant";

type MetaSwot = {
  source: string;
  versionNumber?: number | null;
  createdAt: string;
  createdBy?: { firstName?: string; lastName?: string } | null;
};

/** "Current · v2 · Team Lead · 3 Oct 2026 · Asha Rao" */
export function SwotMetaRow({
  swot,
  current = true,
  extra,
}: {
  swot: MetaSwot;
  current?: boolean;
  extra?: ReactNode;
}) {
  const parts: ReactNode[] = [
    swotSourceLabel(swot.source),
    formatDate(swot.createdAt),
  ];
  if (swot.createdBy) parts.push(personName(swot.createdBy));
  if (extra) parts.push(extra);
  return (
    <div className="swot-meta-row">
      <span className="swot-version-pill">
        {current ? "Current · " : ""}v{swot.versionNumber ?? 1}
      </span>
      {parts.map((part, i) => (
        <span key={i} className="inline-flex items-center gap-2">
          {i > 0 ? (
            <span className="swot-meta-sep" aria-hidden>
              ·
            </span>
          ) : null}
          {part}
        </span>
      ))}
    </div>
  );
}

export function SwotSectionHeader({
  icon,
  title,
  description,
  aside,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  aside?: ReactNode;
}) {
  return (
    <header className="swot-section-head">
      <h2 className="swot-section-title">
        <span className="swot-section-icon" aria-hidden>
          {icon}
        </span>
        {title}
        <span className="swot-section-desc">— {description}</span>
      </h2>
      {aside ? <div className="flex flex-wrap items-center gap-2">{aside}</div> : null}
    </header>
  );
}

export function SwotQuietState({
  locked = false,
  children,
}: {
  locked?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="swot-locked" role="status">
      {locked ? (
        <Lock size={16} strokeWidth={2} aria-hidden />
      ) : (
        <FileText size={16} strokeWidth={2} aria-hidden />
      )}
      <p className="m-0">{children}</p>
    </div>
  );
}

export type UserSwotTab = "self" | "TEAM_LEAD" | "COMMANDO";

export const NOT_SHARED_COPY =
  "Not shared with you yet. Team Lead or Commando can make this SWOT visible.";

/**
 * User SWOT (about the person) as tabs: self / Team Lead / Commando. Data is
 * already filtered by the API, so a missing Team Lead / Commando version for
 * the subject executive means it hasn't been shared with them.
 */
export function UserSwotSection({
  swots,
  viewerIsSubject,
  viewerRole,
  returnTo,
  error,
  onViewHistory,
  historyHref,
  initialTab,
  createLinks,
}: {
  swots: SwotItem[];
  viewerIsSubject: boolean;
  viewerRole?: string | null;
  returnTo: string;
  error?: string | null;
  onViewHistory?: () => void;
  /** Link target for "View version history" when the panel is on another page. */
  historyHref?: string;
  initialTab?: UserSwotTab;
  createLinks?: SwotCreateLinks | null;
}) {
  const idBase = useId();
  const latest = useMemo(() => {
    const bySource = new Map<string, SwotItem>();
    for (const s of [...swots].sort(swotNewestFirst)) {
      if ((s.subjectType ?? "EXECUTIVE") !== "EXECUTIVE") continue;
      const key = isSelfSwotSource(s.source) ? "self" : s.source;
      if (!bySource.has(key)) bySource.set(key, s);
    }
    return bySource;
  }, [swots]);

  const tabs: Array<{ value: UserSwotTab; label: string }> = [
    { value: "self", label: viewerIsSubject ? "My SWOT" : "Self Assessment" },
    { value: "TEAM_LEAD", label: "Team Lead Assessment" },
    { value: "COMMANDO", label: "Commando Assessment" },
  ];
  const ownTab: UserSwotTab =
    viewerRole === "TEAM_LEAD"
      ? "TEAM_LEAD"
      : viewerRole === "COMMANDO_EXECUTIVE"
        ? "COMMANDO"
        : "self";
  const [active, setActive] = useState<UserSwotTab>(initialTab ?? ownTab);

  const item = latest.get(active) ?? null;
  const isOtherAuthor = active !== "self";
  const locked = viewerIsSubject && isOtherAuthor && !item;
  const activeLabel = tabs.find((t) => t.value === active)!.label;

  return (
    <section className="swot-section" id="user-swot">
      <SwotSectionHeader
        icon={<UserRound size={14} strokeWidth={2.2} />}
        title="User SWOT"
        description={viewerIsSubject ? "about you as a person" : "about the person"}
        aside={
          createLinks ? (
            <SwotCreateActions links={createLinks} hasCurrent={latest.has(ownTab)} />
          ) : undefined
        }
      />
      <Tabs
        idBase={idBase}
        ariaLabel="User SWOT author"
        value={active}
        onChange={setActive}
        options={tabs.map((t) => ({
          value: t.value,
          label: t.label,
          icon:
            viewerIsSubject && t.value !== "self" && !latest.has(t.value) ? (
              <Lock size={12} strokeWidth={2.2} aria-label="Not shared" />
            ) : undefined,
        }))}
      />
      <TabPanel idBase={idBase} value={active} className="grid gap-3">
        {error ? (
          <p className="m-0 text-sm text-[var(--status-danger)]">{error}</p>
        ) : item ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SwotMetaRow
                swot={item}
                extra={
                  !viewerIsSubject && isOtherAuthor ? swotShareLabel(item) : undefined
                }
              />
              <Link href={swotDetailHref(item.id, returnTo)} className="swot-link">
                Open
              </Link>
            </div>
            <SwotQuadrantGrid
              swot={item}
              empty={
                viewerIsSubject && isOtherAuthor ? (
                  <>
                    <Lock size={12} strokeWidth={2.2} aria-hidden /> Not shared yet
                  </>
                ) : undefined
              }
            />
          </>
        ) : locked ? (
          <SwotQuietState locked>{NOT_SHARED_COPY}</SwotQuietState>
        ) : (
          <SwotQuietState>
            {active === "self" && viewerIsSubject
              ? "You haven't added your SWOT yet."
              : `No ${activeLabel.toLowerCase()} recorded yet.`}
          </SwotQuietState>
        )}
      </TabPanel>
      {onViewHistory ? (
        <div className="swot-section-foot">
          <button type="button" className="swot-link" onClick={onViewHistory}>
            View version history →
          </button>
        </div>
      ) : historyHref ? (
        <div className="swot-section-foot">
          <Link href={historyHref} className="swot-link">
            View version history →
          </Link>
        </div>
      ) : null}
    </section>
  );
}

function streamKey(s: SwotItem): string {
  if (s.subjectType === "PROFILE") {
    return isSelfSwotSource(s.source)
      ? `P:self:${s.createdById}:${s.salesExecutiveProfileId}`
      : `P:mgmt:${s.salesExecutiveProfileId}`;
  }
  const author = isSelfSwotSource(s.source) ? "self" : s.source;
  return `E:${author}:${s.executiveUserId ?? s.salesExecutiveProfileId}`;
}

/**
 * Compact version history: one row per stream's current version by default,
 * every version (still one compact row each) when expanded.
 */
export function SwotVersionHistory({
  swots,
  returnTo,
  expanded,
  onToggle,
  showShare = false,
  id = "swot-history",
  title = "Version history",
}: {
  swots: SwotItem[];
  returnTo: string;
  expanded: boolean;
  onToggle: () => void;
  showShare?: boolean;
  id?: string;
  title?: string;
}) {
  const sorted = useMemo(() => [...swots].sort(swotNewestFirst), [swots]);
  const currentIds = useMemo(() => {
    const seen = new Set<string>();
    const ids = new Set<string>();
    for (const s of sorted) {
      const key = streamKey(s);
      if (seen.has(key)) continue;
      seen.add(key);
      ids.add(s.id);
    }
    return ids;
  }, [sorted]);
  const rows = expanded ? sorted : sorted.filter((s) => currentIds.has(s.id));
  const hasOlder = sorted.length > currentIds.size;

  return (
    <section className="swot-history" id={id} aria-label={title}>
      <div className="swot-history-head">
        <h2 className="swot-history-title">{title}</h2>
        {hasOlder ? (
          <button
            type="button"
            className="swot-link"
            aria-expanded={expanded}
            aria-controls={`${id}-list`}
            onClick={onToggle}
          >
            {expanded ? "Show current only" : `View all versions (${sorted.length})`}
          </button>
        ) : null}
      </div>
      {rows.length === 0 ? (
        <p className="swot-history-empty">No versions yet.</p>
      ) : (
        <ul className="swot-history-list" id={`${id}-list`}>
          {rows.map((s) => (
            <li key={s.id} className="swot-history-row">
              <span className="swot-version-pill">
                {currentIds.has(s.id) ? "Current · " : ""}v{s.versionNumber ?? 1}
              </span>
              <strong>{swotKindLabel(s)}</strong>
              <span>{swotSourceLabel(s.source)}</span>
              <span>{formatDate(s.createdAt)}</span>
              {s.createdBy ? <span>{personName(s.createdBy)}</span> : null}
              {showShare && !isSelfSwotSource(s.source) ? (
                <span>{swotShareLabel(s)}</span>
              ) : null}
              <Link href={swotDetailHref(s.id, returnTo)} className="swot-link">
                View
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export type SwotKind = "user" | "profile";

function isProfileSwot(s: SwotItem) {
  return s.subjectType === "PROFILE";
}

function userSwotSummary(swots: SwotItem[], viewerIsSubject: boolean): string {
  const authors = new Set<string>();
  for (const s of swots) {
    if (isProfileSwot(s)) continue;
    authors.add(isSelfSwotSource(s.source) ? "self" : s.source);
  }
  if (authors.size === 0) {
    return viewerIsSubject ? "Not added yet" : "Nothing recorded yet";
  }
  return `${authors.size} of 3 assessments available`;
}

function profileSwotSummary(swots: SwotItem[]): string {
  const profile = swots.filter(isProfileSwot).sort(swotNewestFirst);
  const current = profile[0];
  if (!current) return "Not added yet";
  const accounts = new Set(profile.map((s) => s.salesExecutiveProfileId));
  if (accounts.size > 1) return `${accounts.size} accounts`;
  return `Current · v${current.versionNumber ?? 1} · ${formatDate(current.createdAt)}`;
}

/** Two cards that choose which SWOT is shown below. */
export function SwotKindPicker({
  value,
  onChange,
  viewerIsSubject,
  userStatus,
  profileStatus,
}: {
  value: SwotKind;
  onChange: (kind: SwotKind) => void;
  viewerIsSubject: boolean;
  userStatus: string;
  profileStatus: string;
}) {
  const cards: Array<{
    kind: SwotKind;
    icon: ReactNode;
    title: string;
    desc: string;
    status: string;
  }> = [
    {
      kind: "user",
      icon: <UserRound size={16} strokeWidth={2.2} />,
      title: "User SWOT",
      desc: viewerIsSubject
        ? "About you as a person — skills, habits, growth."
        : "About the person — skills, habits, growth.",
      status: userStatus,
    },
    {
      kind: "profile",
      icon: <Briefcase size={16} strokeWidth={2.2} />,
      title: "Profile SWOT",
      desc: "About the account — pipeline, territory, results.",
      status: profileStatus,
    },
  ];
  return (
    <div className="swot-kind-picker" role="group" aria-label="Which SWOT to show">
      {cards.map((c) => (
        <button
          key={c.kind}
          type="button"
          className={`swot-kind-card${value === c.kind ? " is-active" : ""}`}
          aria-pressed={value === c.kind}
          onClick={() => onChange(c.kind)}
        >
          <span className="swot-kind-card-icon" aria-hidden>
            {c.icon}
          </span>
          <span className="swot-kind-card-body">
            <span className="swot-kind-card-title">{c.title}</span>
            <span className="swot-kind-card-desc">{c.desc}</span>
            <span className="swot-kind-card-status">{c.status}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

export type SwotCreateLinks = { updateHref: string; newHref: string };

/** "Update current SWOT" (pre-filled) + "Add new SWOT" (blank). */
export function SwotCreateActions({
  links,
  hasCurrent,
}: {
  links: SwotCreateLinks;
  hasCurrent: boolean;
}) {
  return (
    <>
      {hasCurrent ? (
        <ButtonLink href={links.updateHref} variant="outline" size="sm">
          Update current SWOT
        </ButtonLink>
      ) : null}
      <ButtonLink href={links.newHref} size="sm">
        <Plus size={14} strokeWidth={2.2} aria-hidden />
        Add new SWOT
      </ButtonLink>
    </>
  );
}

/**
 * Picker (User SWOT / Profile SWOT), the chosen SWOT, and a version history
 * limited to that kind.
 */
export function SwotWorkspaceView({
  swots,
  historySwots,
  viewerIsSubject,
  viewerRole,
  returnTo,
  error,
  userSwotLinks,
  profileSection,
  initialKind = "user",
}: {
  swots: SwotItem[];
  /** Versions listed in the history panel (defaults to `swots`). */
  historySwots?: SwotItem[];
  viewerIsSubject: boolean;
  viewerRole?: string | null;
  returnTo: string;
  error?: string | null;
  /** Create links for the viewer's own User SWOT stream; omit when they can't create. */
  userSwotLinks?: SwotCreateLinks | null;
  profileSection?: ReactNode;
  initialKind?: SwotKind;
}) {
  const [kind, setKind] = useState<SwotKind>(initialKind);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);
  const allVersions = historySwots ?? swots;

  function openHistory() {
    setHistoryExpanded(true);
    historyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="space-y-4">
      <SwotKindPicker
        value={kind}
        onChange={(next) => {
          setKind(next);
          setHistoryExpanded(false);
        }}
        viewerIsSubject={viewerIsSubject}
        userStatus={userSwotSummary(swots, viewerIsSubject)}
        profileStatus={profileSwotSummary(allVersions)}
      />
      {kind === "user" ? (
        <UserSwotSection
          swots={swots}
          viewerIsSubject={viewerIsSubject}
          viewerRole={viewerRole}
          returnTo={returnTo}
          error={error}
          onViewHistory={openHistory}
          createLinks={userSwotLinks}
        />
      ) : (
        profileSection
      )}
      <div ref={historyRef}>
        <SwotVersionHistory
          swots={allVersions.filter((s) =>
            kind === "profile" ? isProfileSwot(s) : !isProfileSwot(s),
          )}
          title={kind === "profile" ? "Profile SWOT history" : "User SWOT history"}
          returnTo={returnTo}
          expanded={historyExpanded}
          onToggle={() => setHistoryExpanded((v) => !v)}
          showShare={!viewerIsSubject}
        />
      </div>
    </div>
  );
}
