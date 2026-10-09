import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ token: "t" }) }));

import type { ReferralSwotSummary, TeamLeadUserSwot } from "@/lib/api";
import {
  InterventionSwotPair,
  PersonSwotCard,
  ProfileSwotSection,
  TeamLeadUserSwotStack,
} from "@/components/swot/InterventionSwotPair";
import {
  ManagementPacketWizard,
  emptyProvideForm,
  missingInterventionSwots,
  wizardSteps,
} from "@/components/referrals/ManagementPacketWizard";

function swot(id: string, strength: string, source = "TEAM_LEAD"): ReferralSwotSummary {
  return {
    id,
    subjectType: "EXECUTIVE",
    source,
    versionNumber: 2,
    createdAt: "2026-10-01T09:00:00.000Z",
    createdBy: { id: "tl", firstName: "Tara", lastName: "Lead" },
    strengthPoints: [{ id: `${id}-s`, text: strength }],
    weaknessPoints: [],
    opportunityPoints: [],
    threatPoints: [],
  };
}

const sePerson: TeamLeadUserSwot = {
  subjectUserId: "u-se",
  role: "SALES_EXECUTIVE",
  name: "John Smith",
  swot: swot("sw-se", "Strong closer"),
};
const ssePerson: TeamLeadUserSwot = {
  subjectUserId: "u-sse",
  role: "SALES_SUPPORT_EXECUTIVE",
  name: "Jane Doe",
  swot: swot("sw-sse", "Reliable follow-up"),
};
const sseWithout: TeamLeadUserSwot = { ...ssePerson, swot: null };

describe("TeamLeadUserSwotStack", () => {
  it("shows the Sales Executive first, then each SSE, all at once without tabs", () => {
    const html = renderToStaticMarkup(
      <TeamLeadUserSwotStack people={[ssePerson, sePerson]} note="latest User SWOT from you" />,
    );
    expect(html).not.toContain('role="tab"');
    expect(html).toContain("John Smith · latest User SWOT from you");
    expect(html).toContain("Jane Doe · latest User SWOT from you");
    expect(html.indexOf("Sales Executive")).toBeLessThan(
      html.indexOf("Sales Support Executive"),
    );
    expect(html.indexOf("Strong closer")).toBeLessThan(
      html.indexOf("Reliable follow-up"),
    );
  });

  it("offers an add link in a new tab when the Team Lead has no SWOT yet", () => {
    const html = renderToStaticMarkup(
      <TeamLeadUserSwotStack
        people={[sseWithout]}
        createHref={(p) => `/swot/new?subjectUserId=${p.subjectUserId}`}
      />,
    );
    expect(html).toContain("No User SWOT from the Team Lead for Jane Doe yet.");
    expect(html).toContain('href="/swot/new?subjectUserId=u-sse"');
    expect(html).toContain('target="_blank"');
  });

  it("shows no add link when none is provided", () => {
    const html = renderToStaticMarkup(<TeamLeadUserSwotStack people={[sseWithout]} />);
    expect(html).not.toContain("Add User SWOT");
  });
});

describe("InterventionSwotPair with linked SSEs", () => {
  it("shows the SE User SWOT first and each SSE's below it, without person tabs", () => {
    const html = renderToStaticMarkup(
      <InterventionSwotPair
        userSwots={[swot("sw-se", "Strong closer")]}
        profileSwot={null}
        personSwots={[sePerson, ssePerson]}
      />,
    );
    expect(html).toContain("Sales Executive · John Smith");
    expect(html).toContain("Jane Doe · User SWOT by the Team Lead");
    expect(html).not.toContain('aria-label="Whose User SWOT"');
    expect(html.indexOf("Strong closer")).toBeLessThan(
      html.indexOf("Reliable follow-up"),
    );
  });

  it("hides linked SSE User SWOTs when showSupportSwots is off", () => {
    const html = renderToStaticMarkup(
      <InterventionSwotPair
        userSwots={[swot("sw-se", "Strong closer")]}
        profileSwot={null}
        personSwots={[sePerson, ssePerson]}
        showSupportSwots={false}
      />,
    );
    expect(html).not.toContain("Sales Support Executive");
    expect(html).not.toContain("Reliable follow-up");
    expect(html).toContain("about the person");
  });

  it("keeps the original layout without linked SSEs", () => {
    const html = renderToStaticMarkup(
      <InterventionSwotPair
        userSwots={[swot("sw-se", "Strong closer")]}
        profileSwot={null}
        personSwots={[sePerson]}
      />,
    );
    expect(html).not.toContain("Sales Support Executive");
    expect(html).toContain("about the person");
    expect(html).toContain("Strong closer");
  });
});

describe("ManagementPacketWizard SWOT step", () => {
  it("lists the combined SWOT step", () => {
    const html = renderToStaticMarkup(
      <ManagementPacketWizard
        form={emptyProvideForm()}
        setForm={() => {}}
        busy={false}
        commandoName="Casey Commando"
        subjects={[]}
        profileId="p-1"
        teamLeadUserSwots={[sePerson, ssePerson]}
        onApprove={() => {}}
        onReject={() => {}}
      />,
    );
    expect(html).toContain("5. SWOT");
    expect(html).not.toContain("5. Profile SWOT");
  });

  it("adds an SSE SWOT step after the SE SWOT step only when an SSE is linked", () => {
    expect(wizardSteps(true).map((s) => s.title)).toEqual([
      "Performance Snapshot",
      "SSE Snapshot",
      "Performance Diagnosis",
      "Support & Recommendation",
      "Intervention Priorities",
      "SWOT",
      "SSE SWOT",
      "Ready to send?",
    ]);
    expect(wizardSteps(false).map((s) => s.title)).not.toContain("SSE SWOT");
    expect(wizardSteps(false, true).map((s) => s.title)).toContain("SSE SWOT");
  });

  it("lists the SSE SWOT step when SSE SWOTs exist", () => {
    const html = renderToStaticMarkup(
      <ManagementPacketWizard
        form={emptyProvideForm()}
        setForm={() => {}}
        busy={false}
        commandoName="Casey Commando"
        subjects={[]}
        profileId="p-1"
        teamLeadUserSwots={[sePerson, ssePerson]}
        onApprove={() => {}}
        onReject={() => {}}
      />,
    );
    expect(html).toContain("6. SSE SWOT");
  });

  it("lists missing User SWOTs and Profile SWOT as a warning, not a blocker", () => {
    expect(missingInterventionSwots([sePerson, sseWithout], null)).toEqual([
      "your SWOT for Jane Doe (SSE)",
      "Profile SWOT",
    ]);
    expect(
      missingInterventionSwots([sePerson, ssePerson], swot("ps", "Account", "TEAM_LEAD")),
    ).toEqual([]);
  });
});

describe("PersonSwotCard", () => {
  it("shows the person's own SWOT and the Team Lead's as two separate cards", () => {
    const html = renderToStaticMarkup(
      <PersonSwotCard
        person={{ ...sePerson, selfSwot: swot("self-se", "Self strength", "SALES_EXECUTIVE") }}
      />,
    );
    expect(html).toContain("John Smith");
    expect(html).toContain("Sales Executive");
    expect(html).not.toContain('role="tab"');
    expect(html.match(/<article class="swot-section"/g)).toHaveLength(2);
    expect(html.indexOf("By John")).toBeLessThan(html.indexOf("By you"));
    expect(html.indexOf("Self strength")).toBeLessThan(html.indexOf("Strong closer"));
    expect(html).toContain("Updated");
  });

  it("shows an empty self card next to the Team Lead's SWOT", () => {
    const html = renderToStaticMarkup(<PersonSwotCard person={ssePerson} />);
    expect(html).toContain("Jane hasn&#x27;t written their own SWOT yet.");
    expect(html).toContain("Reliable follow-up");
  });

  it("offers an add link when the Team Lead has not written one", () => {
    const html = renderToStaticMarkup(
      <PersonSwotCard
        person={{ ...sseWithout, selfSwot: null }}
        createHref={(p) => `/swot/new?subjectUserId=${p.subjectUserId}`}
      />,
    );
    expect(html).toContain("Jane hasn&#x27;t written their own SWOT yet.");
    expect(html).toContain("You haven&#x27;t written a SWOT for Jane yet.");
    expect(html).toContain('href="/swot/new?subjectUserId=u-sse"');
  });
});

describe("ProfileSwotSection", () => {
  it("is read-only and shows the Team Lead / Commando Profile SWOT", () => {
    const html = renderToStaticMarkup(
      <ProfileSwotSection swot={swot("ps", "Account strength")} />,
    );
    expect(html).toContain("Account strength");
    expect(html).not.toContain("<textarea");
    expect(html).not.toContain("<input");
  });

  it("offers an add link in a new tab when there is none yet", () => {
    const html = renderToStaticMarkup(
      <ProfileSwotSection swot={null} createHref="/swot/new?profileId=p-1&subject=profile" />,
    );
    expect(html).toContain("No Profile SWOT from the Team Lead or Commando yet.");
    expect(html).toContain("Add Profile SWOT");
    expect(html).toContain('target="_blank"');
  });
});
