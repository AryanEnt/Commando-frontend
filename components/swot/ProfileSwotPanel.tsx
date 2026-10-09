"use client";

import { useState } from "react";
import { Briefcase, Lock } from "lucide-react";
import type { SwotItem } from "@/lib/api";
import {
  isSelfSwotSource,
  swotNewestFirst,
  swotShareLabel,
} from "@/lib/swot-display";
import { SwotQuadrantGrid } from "@/components/swot/SwotQuadrant";
import {
  SwotCreateActions,
  SwotMetaRow,
  SwotQuietState,
  SwotSectionHeader,
  SwotVersionHistory,
} from "@/components/swot/SwotSections";

export function profileSwotNewHref(
  profileId: string | null,
  returnTo: string,
  fresh = false,
  name?: string | null,
) {
  const params = new URLSearchParams();
  if (profileId) params.set("profileId", profileId);
  params.set("subject", "profile");
  if (fresh) params.set("fresh", "1");
  if (name?.trim()) params.set("name", name.trim());
  params.set("returnTo", returnTo);
  return `/swot/new?${params.toString()}`;
}

export const PROFILE_NOT_SHARED_COPY =
  "Not shared with you yet. Team Lead or Commando can share points from their Profile SWOT.";

/**
 * Team Lead / Commando Profile SWOT for one SE profile. Only Team Leads and
 * Commandos write it; a subject SE / SSE (`viewerIsSelf`) reads the points
 * shared with them (the API already removes held-back points).
 */
export function ProfileSwotPanel({
  profileId,
  swots,
  canUpdate,
  returnTo,
  viewerIsSelf = false,
  title,
  showHistory = true,
}: {
  profileId: string | null;
  swots: SwotItem[];
  canUpdate: boolean;
  returnTo: string;
  viewerIsSelf?: boolean;
  title?: string;
  /** Off when the page already shows a combined version history panel. */
  showHistory?: boolean;
}) {
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const versions = swots
    .filter((s) => s.subjectType === "PROFILE" && !isSelfSwotSource(s.source))
    .sort(swotNewestFirst);
  const current = versions[0] ?? null;

  const subject = title ? `${title}, ` : "";
  const description = viewerIsSelf
    ? `about the account — ${subject}shared by your Team Lead / Commando`
    : "about the account sent for intervention";

  const body = current ? (
    <>
      <SwotMetaRow
        swot={current}
        extra={viewerIsSelf ? undefined : swotShareLabel(current)}
      />
      <SwotQuadrantGrid
        swot={current}
        empty={
          viewerIsSelf ? (
            <>
              <Lock size={12} strokeWidth={2.2} aria-hidden /> Not shared yet
            </>
          ) : undefined
        }
      />
    </>
  ) : viewerIsSelf ? (
    <SwotQuietState locked>{PROFILE_NOT_SHARED_COPY}</SwotQuietState>
  ) : (
    <SwotQuietState>No Team Lead / Commando Profile SWOT yet.</SwotQuietState>
  );

  return (
    <section className="swot-section" id="profile-swot">
      <SwotSectionHeader
        icon={<Briefcase size={14} strokeWidth={2.2} />}
        title="Profile SWOT"
        description={description}
        aside={
          canUpdate && !viewerIsSelf ? (
            <SwotCreateActions
              hasCurrent={Boolean(current)}
              links={{
                updateHref: profileSwotNewHref(profileId, returnTo),
                newHref: profileSwotNewHref(profileId, returnTo, true),
              }}
            />
          ) : undefined
        }
      />

      {body}

      {showHistory && versions.length > 0 ? (
        <SwotVersionHistory
          id={`profile-swot-history-${profileId ?? "self"}`}
          swots={versions}
          returnTo={returnTo}
          expanded={historyExpanded}
          onToggle={() => setHistoryExpanded((v) => !v)}
          showShare={!viewerIsSelf}
        />
      ) : null}
    </section>
  );
}
