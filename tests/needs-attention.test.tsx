import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { Referral } from "@/lib/api";
import {
  attentionDetail,
  attentionExecutiveCount,
  buildAttentionItems,
  formatRelativeTime,
  sortAttentionItems,
  toTitleCase,
  type AttentionItem,
} from "@/lib/attention";
import { NeedsAttentionCard } from "@/components/dashboard/NeedsAttentionCard";

const NOW = new Date("2026-10-08T06:00:00.000Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

function request(overrides: Partial<AttentionItem> = {}): AttentionItem {
  return {
    id: "request-r1",
    profileId: "p1",
    name: "kapil Sapkota",
    href: "/referrals/r1",
    requestedAt: hoursAgo(48),
    requesterName: "chris commando",
    ...overrides,
  };
}

function text(html: string) {
  return html.replace(/<!-- -->/g, "");
}

function render(items: AttentionItem[], viewAllHref?: string) {
  return text(
    renderToStaticMarkup(
      <NeedsAttentionCard items={items} viewAllHref={viewAllHref} now={NOW} />,
    ),
  );
}

describe("attention helpers", () => {
  it("title-cases names for display", () => {
    expect(toTitleCase("nischal mahat")).toBe("Nischal Mahat");
    expect(toTitleCase("kapil Sapkota")).toBe("Kapil Sapkota");
    expect(toTitleCase("  RAM   bahadur-thapa ")).toBe("Ram Bahadur-Thapa");
  });

  it("formats relative time", () => {
    expect(formatRelativeTime(hoursAgo(0), NOW)).toBe("just now");
    expect(formatRelativeTime(hoursAgo(3), NOW)).toBe("3 hours ago");
    expect(formatRelativeTime(hoursAgo(24), NOW)).toBe("yesterday");
    expect(formatRelativeTime(hoursAgo(48), NOW)).toBe("2 days ago");
  });

  it("describes who requested and when", () => {
    expect(attentionDetail(request(), NOW)).toBe("Requested by Chris Commando, 2 days ago");
    expect(attentionDetail(request({ requesterName: null }), NOW)).toBe(
      "Commando requested an intervention, 2 days ago",
    );
  });

  it("sorts the oldest request first", () => {
    const sorted = sortAttentionItems([
      request({ id: "new", requestedAt: hoursAgo(0) }),
      request({ id: "old", requestedAt: hoursAgo(24 * 14) }),
      request({ id: "mid", requestedAt: hoursAgo(48) }),
    ]);
    expect(sorted.map((i) => i.id)).toEqual(["old", "mid", "new"]);
  });

  it("builds one row per pending request", () => {
    const referral = (id: string, profileId: string, createdAt: string) =>
      ({
        id,
        salesExecutiveProfileId: profileId,
        profile: { id: profileId, displayName: "nischal mahat", teamId: "t1" },
        profileName: "nischal mahat",
        commando: { id: "c1", firstName: "chris", lastName: "commando", email: "" },
        createdAt,
      }) as unknown as Referral;

    const items = buildAttentionItems([
      referral("r2", "p1", hoursAgo(1)),
      referral("r1", "p1", hoursAgo(90)),
    ]);
    expect(items.map((i) => i.id)).toEqual(["request-r1", "request-r2"]);
    expect(items[0]).toMatchObject({ href: "/referrals/r1", requesterName: "chris commando" });
    expect(attentionExecutiveCount(items)).toBe(1);
  });
});

describe("NeedsAttentionCard", () => {
  it("is a labelled section with list rows and a request chip", () => {
    const html = render([request(), request({ id: "request-r2", profileId: "p2" })]);
    expect(html).toContain('<section id="se-attention" aria-labelledby="se-attention-heading"');
    expect(html).toContain("Needs your attention");
    expect(html).toContain("2 sales executives waiting on you");
    expect(html).toContain("2 intervention requests");
    expect(html).not.toContain("overdue");
    expect(html.match(/<li /g)).toHaveLength(2);
  });

  it("normalizes names and gives each CTA a descriptive label", () => {
    const html = render([request({ name: "nischal mahat" })]);
    expect(html).toContain("Nischal Mahat");
    expect(html).not.toContain("nischal mahat");
    expect(html).toContain('aria-label="Review intervention request for Nischal Mahat"');
    expect(html).toContain("Commando intervention");
  });

  it("has exactly one primary button, on the first row", () => {
    const html = render([
      request(),
      request({ id: "request-r2", profileId: "p2" }),
      request({ id: "request-r3", profileId: "p3" }),
    ]);
    expect(html.match(/btn-primary/g)).toHaveLength(1);
    expect(html.match(/btn-outline/g)).toHaveLength(2);
    expect(html.indexOf("btn-primary")).toBeLessThan(html.indexOf("btn-outline"));
  });

  it("links to the full queue", () => {
    expect(render([request()], "#commando-requests")).toContain("View all intervention requests");
  });

  it("shows a calm empty state", () => {
    const html = render([], "#commando-requests");
    expect(html).toContain("You&#x27;re all caught up");
    expect(html).not.toContain("<ul");
    expect(html).not.toContain("View all");
    expect(html).not.toContain("!");
  });
});
