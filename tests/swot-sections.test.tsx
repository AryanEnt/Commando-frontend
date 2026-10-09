import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SwotItem } from "@/lib/api";
import { nextTabIndex } from "@/components/ui";
import { SWOT_CATEGORIES, SwotQuadrantGrid } from "@/components/swot/SwotQuadrant";
import {
  NOT_SHARED_COPY,
  SwotVersionHistory,
  SwotWorkspaceView,
  UserSwotSection,
} from "@/components/swot/SwotSections";
import {
  PROFILE_NOT_SHARED_COPY,
  ProfileSwotPanel,
  profileSwotNewHref,
} from "@/components/swot/ProfileSwotPanel";
import { seSwotCreateHref } from "@/lib/se-workspace-nav";
import { sseSwotCreateHref } from "@/lib/sse-workspace-nav";

function swot(overrides: Partial<SwotItem>): SwotItem {
  return {
    id: "s1",
    subjectType: "EXECUTIVE",
    salesExecutiveProfileId: "p1",
    executiveUserId: "u-se",
    profile: { id: "p1", displayName: "Sam Seller", teamId: "t1" },
    source: "SALES_EXECUTIVE",
    strength: null,
    weakness: null,
    opportunity: null,
    threat: null,
    strengthPoints: [{ id: "a", text: "Self strength", visible: true }],
    weaknessPoints: [{ id: "b", text: "Self weakness", visible: true }],
    opportunityPoints: [{ id: "c", text: "Self opportunity", visible: true }],
    threatPoints: [{ id: "d", text: "Self threat", visible: true }],
    versionNumber: 1,
    createdById: "u-se",
    createdBy: { id: "u-se", firstName: "Sam", lastName: "Seller" },
    createdAt: "2026-10-01T09:00:00.000Z",
    updatedAt: "2026-10-01T09:00:00.000Z",
    ...overrides,
  } as SwotItem;
}

const selfSwot = swot({});
const tlSwot = swot({
  id: "tl1",
  source: "TEAM_LEAD",
  createdById: "u-tl",
  createdBy: { id: "u-tl", firstName: "Tara", lastName: "Lead" } as SwotItem["createdBy"],
  strengthPoints: [{ id: "e", text: "TL strength", visible: true }],
  weaknessPoints: [],
  opportunityPoints: [{ id: "g", text: "TL opportunity", visible: true }],
  threatPoints: [{ id: "h", text: "TL threat", visible: false }],
});

function renderUser(props: Partial<Parameters<typeof UserSwotSection>[0]>) {
  return renderToStaticMarkup(
    <UserSwotSection
      swots={[selfSwot]}
      viewerIsSubject
      returnTo="/profiles/p1/swot"
      {...props}
    />,
  );
}

describe("UserSwotSection tabs", () => {
  it("renders an accessible tablist with one panel wired to the selected tab", () => {
    const html = renderUser({ initialTab: "TEAM_LEAD" });
    expect(html).toContain('role="tablist"');
    expect(html.match(/role="tab"/g)).toHaveLength(3);
    expect(html.match(/role="tabpanel"/g)).toHaveLength(1);
    const selected = html.match(
      /<button[^>]*aria-selected="true"[^>]*>(?:(?!<\/button>).)*<\/button>/,
    )?.[0];
    expect(selected).toBeDefined();
    expect(selected).toContain('tabindex="0"');
    expect(selected).toContain("Team Lead Assessment");
    const controls = selected!.match(/aria-controls="([^"]+)"/)![1];
    const tabId = selected!.match(/id="([^"]+)"/)![1];
    expect(html).toContain(`id="${controls}"`);
    expect(html).toContain(`aria-labelledby="${tabId}"`);
    expect(html.match(/tabindex="-1"/g)).toHaveLength(2);
  });

  it("shows only the selected tab's content when switching tabs", () => {
    const swots = [selfSwot, tlSwot];
    const self = renderUser({ swots, initialTab: "self", viewerIsSubject: false });
    expect(self).toContain("Self strength");
    expect(self).not.toContain("TL strength");

    const tl = renderUser({ swots, initialTab: "TEAM_LEAD", viewerIsSubject: false });
    expect(tl).toContain("TL strength");
    expect(tl).not.toContain("Self strength");

    const commando = renderUser({ swots, initialTab: "COMMANDO", viewerIsSubject: false });
    expect(commando).not.toContain("TL strength");
    expect(commando).not.toContain("Self strength");
    expect(commando).toContain("No commando assessment recorded yet.");
  });

  it("defaults managers to their own assessment tab", () => {
    const html = renderUser({
      swots: [selfSwot, tlSwot],
      viewerIsSubject: false,
      viewerRole: "TEAM_LEAD",
    });
    expect(html).toContain("TL strength");
    expect(html).toContain("2/3 points shared");
  });
});

describe("UserSwotSection not-shared state", () => {
  it("replaces the grid with a lock empty state when a version isn't shared with the SE", () => {
    const html = renderUser({ initialTab: "TEAM_LEAD" });
    expect(html).toContain(NOT_SHARED_COPY);
    expect(html).toContain("lucide-lock");
    expect(html).not.toContain("swotq-grid");
    expect(html).not.toContain("swotq-letter");
  });

  it("marks unshared tabs with a lock but keeps them selectable", () => {
    const html = renderUser({ initialTab: "self" });
    const tlTab = html.match(/<button[^>]*role="tab"[^>]*>(?:(?!<\/button>).)*Team Lead Assessment<\/button>/)?.[0];
    expect(tlTab).toBeDefined();
    expect(tlTab).toContain("lucide-lock");
    expect(tlTab).not.toContain("disabled");
  });

  it("shows the grid for a shared version and quietly marks held-back boxes", () => {
    const sharedForSe = swot({
      ...tlSwot,
      threatPoints: [],
      weaknessPoints: [],
    });
    const html = renderUser({ swots: [selfSwot, sharedForSe], initialTab: "TEAM_LEAD" });
    expect(html).not.toContain(NOT_SHARED_COPY);
    expect(html).toContain("TL strength");
    expect(html.match(/Not shared yet/g)).toHaveLength(2);
    expect(html).toContain("Current · v1");
  });
});

describe("SwotQuadrant colour mapping", () => {
  it("maps S/W/O/T to the fixed SWOT tokens in order", () => {
    expect(SWOT_CATEGORIES.map((c) => [c.letter, c.color])).toEqual([
      ["S", "var(--swot-s)"],
      ["W", "var(--swot-w)"],
      ["O", "var(--swot-o)"],
      ["T", "var(--swot-t)"],
    ]);
  });

  it("renders four quadrants with bullet items and the category colours", () => {
    const html = renderToStaticMarkup(<SwotQuadrantGrid swot={selfSwot} />);
    expect(html.match(/class="swotq"/g)).toHaveLength(4);
    for (const token of ["--swot-s", "--swot-w", "--swot-o", "--swot-t"]) {
      expect(html).toContain(`--q-color:var(${token})`);
    }
    expect(html).toContain("Self opportunity");
  });

  it("uses the same quadrant component for the Profile SWOT section", () => {
    const profile = swot({
      id: "ps1",
      subjectType: "PROFILE",
      source: "TEAM_LEAD",
      createdById: "u-tl",
      strengthPoints: [{ id: "p", text: "Account strength", visible: false }],
    });
    const html = renderToStaticMarkup(
      <ProfileSwotPanel
        profileId="p1"
        swots={[profile]}
        canUpdate={false}
        returnTo="/profiles/p1/swot"
        showHistory={false}
      />,
    );
    expect(html).toContain("Profile SWOT");
    expect(html).toContain("about the account sent for intervention");
    expect(html.match(/class="swotq"/g)).toHaveLength(4);
    expect(html).toContain("Account strength");
  });

  it("defines SWOT tokens from existing status tokens (only O is the SWOT slate-blue)", () => {
    const css = readFileSync(path.resolve(__dirname, "../app/globals.css"), "utf8");
    expect(css).toContain("--swot-s: var(--status-success);");
    expect(css).toContain("--swot-w: var(--status-danger);");
    expect(css).toContain("--swot-t: var(--status-warn);");
    expect(css).toContain("--swot-o: #56679e;");
    const block = css.slice(
      css.indexOf("/* Shared SWOT quadrant"),
      css.indexOf(".profile-swot-note {"),
    );
    expect(block.length).toBeGreaterThan(0);
    expect(block).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
});

describe("SwotVersionHistory", () => {
  const v1 = swot({ id: "tl-v1", source: "TEAM_LEAD", versionNumber: 1, createdAt: "2026-09-01T00:00:00.000Z" });
  const v2 = swot({ id: "tl-v2", source: "TEAM_LEAD", versionNumber: 2, createdAt: "2026-09-10T00:00:00.000Z" });
  const swots = [selfSwot, v1, v2];

  it("shows one compact row per stream's current version by default", () => {
    const html = renderToStaticMarkup(
      <SwotVersionHistory swots={swots} returnTo="/x" expanded={false} onToggle={() => {}} />,
    );
    expect(html.match(/class="swot-history-row"/g)).toHaveLength(2);
    expect(html).toContain("/swot/tl-v2");
    expect(html).not.toContain("/swot/tl-v1");
    expect(html).toContain("View all versions (3)");
  });

  it("lists every version as compact rows when expanded", () => {
    const html = renderToStaticMarkup(
      <SwotVersionHistory swots={swots} returnTo="/x" expanded onToggle={() => {}} />,
    );
    expect(html.match(/class="swot-history-row"/g)).toHaveLength(3);
    expect(html).toContain("/swot/tl-v1");
    expect(html).toContain("Show current only");
  });

  it("hides the toggle when every stream has a single version", () => {
    const html = renderToStaticMarkup(
      <SwotVersionHistory swots={[selfSwot]} returnTo="/x" expanded={false} onToggle={() => {}} />,
    );
    expect(html).not.toContain("View all versions");
  });
});

describe("SwotWorkspaceView picker", () => {
  const profileSwot = swot({
    id: "ps1",
    subjectType: "PROFILE",
    strengthPoints: [{ id: "p", text: "Account strength", visible: true }],
    versionNumber: 2,
  });
  const links = { updateHref: "/swot/new?profileId=p1", newHref: "/swot/new?profileId=p1&fresh=1" };

  function renderView(props: Partial<Parameters<typeof SwotWorkspaceView>[0]>) {
    return renderToStaticMarkup(
      <SwotWorkspaceView
        swots={[selfSwot, profileSwot]}
        viewerIsSubject
        returnTo="/profiles/p1/swot"
        userSwotLinks={links}
        profileSection={<div id="profile-slot">Profile slot</div>}
        {...props}
      />,
    );
  }

  it("shows two choice cards and only the User SWOT by default", () => {
    const html = renderView({});
    expect(html.match(/class="swot-kind-card( is-active)?"/g)).toHaveLength(2);
    expect(html).toMatch(/aria-pressed="true"[^>]*>(?:(?!<\/button>).)*User SWOT/);
    expect(html).toContain("Self strength");
    expect(html).not.toContain("Profile slot");
    expect(html).toContain("User SWOT history");
    expect(html).not.toContain("/swot/ps1");
    expect(html).toContain("Current · v2");
  });

  it("shows only the Profile SWOT and its history when that card is chosen", () => {
    const html = renderView({ initialKind: "profile" });
    expect(html).toContain("Profile slot");
    expect(html).not.toContain("Self strength");
    expect(html).toContain("Profile SWOT history");
    expect(html).toContain("/swot/ps1");
    expect(html).not.toContain(`/swot/${selfSwot.id}?`);
  });

  it("offers Update (pre-filled) and Add new SWOT (blank) for the viewer's own stream", () => {
    const html = renderView({});
    expect(html).toContain("Update current SWOT");
    expect(html).toContain("Add new SWOT");
    expect(html).toContain('href="/swot/new?profileId=p1&amp;fresh=1"');
  });

  it("only offers Add new SWOT when the viewer has no version yet", () => {
    const html = renderView({ swots: [profileSwot] });
    expect(html).not.toContain("Update current SWOT");
    expect(html).toContain("Add new SWOT");
  });

  it("shows the SE only Team Lead / Commando Profile SWOT points, ignoring self-written versions", () => {
    const shared = swot({
      id: "pm1",
      subjectType: "PROFILE",
      source: "TEAM_LEAD",
      createdById: "u-tl",
      strengthPoints: [{ id: "s", text: "Shared account strength", visible: true }],
      weaknessPoints: [],
      opportunityPoints: [],
      threatPoints: [],
    });
    const html = renderToStaticMarkup(
      <ProfileSwotPanel
        profileId="p1"
        swots={[profileSwot, shared]}
        canUpdate={false}
        returnTo="/profiles/p1/swot"
        viewerIsSelf
        showHistory={false}
      />,
    );
    expect(html).toContain("shared by your Team Lead / Commando");
    expect(html).toContain("Shared account strength");
    expect(html).not.toContain("Account strength<");
    expect(html).not.toContain('role="tab"');
    expect(html.match(/Not shared yet/g)).toHaveLength(3);
  });

  it("locks the Profile SWOT for the SE until the Team Lead / Commando shares something", () => {
    const html = renderToStaticMarkup(
      <ProfileSwotPanel
        profileId="p1"
        swots={[profileSwot]}
        canUpdate={false}
        returnTo="/profiles/p1/swot"
        viewerIsSelf
        showHistory={false}
      />,
    );
    expect(html).toContain(PROFILE_NOT_SHARED_COPY);
    expect(html).not.toContain("swotq-grid");
  });

  it("never offers Profile SWOT create actions to the SE / SSE", () => {
    const html = renderToStaticMarkup(
      <ProfileSwotPanel
        profileId="p1"
        swots={[profileSwot]}
        canUpdate
        returnTo="/profiles/p1/swot"
        viewerIsSelf
        showHistory={false}
      />,
    );
    expect(html).not.toContain("Update current SWOT");
    expect(html).not.toContain("Add new SWOT");
  });

  it("gives managers the same two actions with a blank-form link", () => {
    const tlProfile = { ...profileSwot, source: "TEAM_LEAD" as const, createdById: "u-tl" };
    const html = renderToStaticMarkup(
      <ProfileSwotPanel
        profileId="p1"
        swots={[tlProfile]}
        canUpdate
        returnTo="/profiles/p1/swot"
        showHistory={false}
      />,
    );
    expect(html).toContain("Update current SWOT");
    expect(html).toContain("Add new SWOT");
    expect(html).toContain("subject=profile&amp;fresh=1");
  });

  it("builds blank-form links for SE and SSE User SWOTs", () => {
    expect(seSwotCreateHref("p1", true)).toMatch(/[?&]fresh=1$/);
    expect(seSwotCreateHref("p1")).not.toContain("fresh");
    expect(sseSwotCreateHref("u1", true)).toMatch(/[?&]fresh=1$/);
    expect(profileSwotNewHref("p1", "/x", true)).toContain("fresh=1");
  });

  it("can pass a display name and return path for intervention Add links", () => {
    const se = seSwotCreateHref("p1", {
      name: "smarika sitaula",
      subjectUserId: "u-se",
      returnTo: "/referrals/r1",
    });
    expect(se).toContain("profileId=p1");
    expect(se).toContain("subjectUserId=u-se");
    expect(se).toContain("name=smarika+sitaula");
    expect(se).toContain(encodeURIComponent("/referrals/r1"));

    const sse = sseSwotCreateHref("u-sse", {
      name: "Jane Doe",
      returnTo: "/referrals/r1",
    });
    expect(sse).toContain("subjectUserId=u-sse");
    expect(sse).toContain("name=Jane+Doe");
    expect(sse).toContain(encodeURIComponent("/referrals/r1"));

    expect(profileSwotNewHref("p1", "/referrals/r1", true, "smarika sitaula")).toContain(
      "name=smarika+sitaula",
    );
  });
});

describe("nextTabIndex", () => {
  it("follows the arrow / Home / End keyboard model", () => {
    expect(nextTabIndex("ArrowRight", 0, 3)).toBe(1);
    expect(nextTabIndex("ArrowRight", 2, 3)).toBe(0);
    expect(nextTabIndex("ArrowLeft", 0, 3)).toBe(2);
    expect(nextTabIndex("Home", 2, 3)).toBe(0);
    expect(nextTabIndex("End", 0, 3)).toBe(2);
    expect(nextTabIndex("Enter", 0, 3)).toBeNull();
  });
});
