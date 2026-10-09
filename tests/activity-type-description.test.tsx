import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ token: "t" }) }));

import type { DailyLogEntry } from "@/lib/api";
import { TimelineCard } from "@/components/daily-logs/DailyLogWorkspace";

function entry(description: string | null): DailyLogEntry {
  return {
    id: "e1",
    loggedAt: "2026-10-07T03:00:00.000Z",
    activityType: {
      id: "at1",
      code: "COACHING_SESSION",
      name: "Coaching Session",
      description,
    },
    sessionTitle: "Morning check-in",
    observation: "Reviewed pipeline together.",
    evidence: null,
    seResponse: null,
    coachingGiven: null,
    expectedChange: null,
    followUp: null,
    eisenhowerCategory: null,
  } as unknown as DailyLogEntry;
}

function render(description: string | null) {
  return renderToStaticMarkup(
    <TimelineCard
      entry={entry(description)}
      submitted={false}
      highlight={false}
      canEdit={false}
      onEdit={() => {}}
      onDelete={() => {}}
    />,
  );
}

describe("activity type description on daily log entries", () => {
  it("shows the Super Admin's description under the activity type name", () => {
    const html = render("One-to-one coaching conversation with the Sales Executive");
    expect(html).toContain("Coaching Session");
    expect(html).toContain("One-to-one coaching conversation with the Sales Executive");
    expect(html.indexOf("Coaching Session")).toBeLessThan(
      html.indexOf("One-to-one coaching conversation"),
    );
  });

  it("shows only the name when there is no description", () => {
    const html = render(null);
    expect(html).toContain("Coaching Session");
    expect(html.match(/text-\[var\(--color-ink-subtle\)\]">/g) ?? []).toHaveLength(1);
  });
});
