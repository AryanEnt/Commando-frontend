import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ token: "t" }) }));

import type { SwotItem } from "@/lib/api";
import { SwotQuadrantBoard } from "@/components/swot/SwotQuadrantBoard";
import {
  SwotCorrectionNote,
  SwotCorrectionNotice,
  SwotPointCorrectionForm,
} from "@/components/swot/SwotPointCorrection";

const person = {
  id: "c1",
  firstName: "Cara",
  lastName: "Mando",
  email: "c@example.com",
  role: { code: "COMMANDO_EXECUTIVE" },
};

function commandoSwot(overrides: Partial<SwotItem> = {}): SwotItem {
  return {
    id: "sw-1",
    subjectType: "PROFILE",
    salesExecutiveProfileId: "p1",
    profile: { id: "p1", displayName: "AT aayush thapa", teamId: "t1" },
    teamId: "t1",
    team: { id: "t1", name: "Team" },
    assignmentId: "a1",
    source: "COMMANDO",
    strength: "Strong closer\nGood follow-up",
    weakness: "Late reports",
    opportunity: "New territory",
    threat: "Competitor pricing",
    strengthPoints: [
      { id: "s1", text: "Strong closer", visible: true },
      { id: "s2", text: "Good follow-up", visible: false },
    ],
    weaknessPoints: [{ id: "w1", text: "Late reports", visible: false }],
    opportunityPoints: [{ id: "o1", text: "New territory", visible: true }],
    threatPoints: [{ id: "t1", text: "Competitor pricing", visible: false }],
    versionNumber: 3,
    createdById: "c1",
    createdBy: person,
    createdAt: "2026-10-01T09:00:00.000Z",
    updatedAt: "2026-10-01T09:00:00.000Z",
    ...overrides,
  };
}

describe("SwotQuadrantBoard corrections", () => {
  it("shows no correction controls without onCorrect", () => {
    const html = renderToStaticMarkup(
      <SwotQuadrantBoard swot={commandoSwot()} canShare={false} isSe={false} isProfile />,
    );
    expect(html).not.toContain("Edit Strengths point");
    expect(html).not.toContain("swot-correct-add");
  });

  it("shows Edit / Delete per point and an Add button per quadrant for Super Admin", () => {
    const html = renderToStaticMarkup(
      <SwotQuadrantBoard
        swot={commandoSwot()}
        canShare={false}
        isSe={false}
        isProfile
        onCorrect={async () => true}
      />,
    );
    expect(html).toContain('aria-label="Edit Strengths point 1"');
    expect(html).toContain('aria-label="Delete Strengths point 2"');
    expect(html).toContain('aria-label="Edit Threats point 1"');
    for (const q of ["strength", "weakness", "opportunity", "threat"]) {
      expect(html.replace(/<!-- -->/g, "")).toContain(`Add ${q}`);
    }
    expect(html).not.toContain('role="switch"');
    expect(html).toContain("Held back");
  });

  it("can hide the sharing summary bar", () => {
    const props = { swot: commandoSwot(), canShare: false, isSe: false, isProfile: true };
    expect(renderToStaticMarkup(<SwotQuadrantBoard {...props} />)).toContain(
      "Only the author of this assessment can change sharing",
    );
    const hidden = renderToStaticMarkup(
      <SwotQuadrantBoard {...props} showShareSummary={false} />,
    );
    expect(hidden).not.toContain("swot-share-bar");
    expect(hidden).not.toContain("Only the author of this assessment");
  });
});

describe("SwotPointCorrectionForm", () => {
  const noop = () => {};

  it("asks for confirmation before deleting, with an optional reason", () => {
    const html = renderToStaticMarkup(
      <SwotPointCorrectionForm
        draft={{ kind: "delete", quadrant: "strength", pointId: "s1", text: "Strong closer" }}
        busy={false}
        onSubmit={noop}
        onCancel={noop}
      />,
    ).replace(/<!-- -->/g, "");
    expect(html).toContain("Strong closer");
    expect(html).toContain("Delete this strength point?");
    expect(html).toContain("Reason (optional)");
    expect(html).toContain("Delete point");
  });

  it("prefills the point text when editing", () => {
    const html = renderToStaticMarkup(
      <SwotPointCorrectionForm
        draft={{ kind: "edit", quadrant: "weakness", pointId: "w1", text: "Late reports" }}
        busy={false}
        onSubmit={noop}
        onCancel={noop}
      />,
    );
    expect(html).toContain("Late reports</textarea>");
    expect(html).toContain("Save correction");
  });

  it("labels the add action with the quadrant", () => {
    const html = renderToStaticMarkup(
      <SwotPointCorrectionForm
        draft={{ kind: "add", quadrant: "opportunity" }}
        busy={false}
        onSubmit={noop}
        onCancel={noop}
      />,
    ).replace(/<!-- -->/g, "");
    expect(html).toContain("Add opportunity");
    expect(html).toContain("Describe the opportunity");
  });
});

describe("SwotCorrectionNote", () => {
  it("renders nothing for an uncorrected version", () => {
    expect(renderToStaticMarkup(<SwotCorrectionNote swot={commandoSwot()} />)).toBe("");
  });

  it("marks a corrected version and shows the reason", () => {
    const html = renderToStaticMarkup(
      <SwotCorrectionNote
        swot={commandoSwot({
          correctedAt: "2026-10-06T10:00:00.000Z",
          correctedBy: { ...person, id: "sa", firstName: "Sam", lastName: "Admin" },
          correctionReason: "Typo",
        })}
      />,
    ).replace(/<!-- -->/g, "");
    expect(html).toContain("Corrected by Super Admin");
    expect(html).toContain("Sam Admin");
    expect(html).toContain("Reason: Typo");
  });
});

describe("SwotCorrectionNotice", () => {
  it("explains that only the latest version can be corrected", () => {
    expect(renderToStaticMarkup(<SwotCorrectionNotice canCorrect={false} />)).toContain(
      "Only the latest version of a SWOT can be corrected.",
    );
  });
});
