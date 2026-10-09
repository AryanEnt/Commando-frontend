import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ token: "t" }) }));

import {
  draftAchievement,
  emptySnapshotDraft,
  periodLabel,
  sanitizeAmountInput,
  snapshotMissing,
  toSnapshotFields,
  type SnapshotDraft,
} from "@/lib/performance-snapshot";
import {
  ManagementPacketWizard,
  emptyProvideForm,
  performanceSnapshotPayload,
  snapshotGaps,
  type ProvideForm,
} from "@/components/referrals/ManagementPacketWizard";
import {
  SnapshotSubjectCard,
  SnapshotSummaryCard,
  type SnapshotCardSubject,
} from "@/components/referrals/PerformanceSnapshot";

const se: SnapshotCardSubject = {
  userId: "u-se",
  name: "John Smith",
  role: "SALES_EXECUTIVE",
  period: {
    kind: "SIX_MONTHS",
    start: "2026-04-06T12:00:00.000Z",
    end: "2026-10-06T12:00:00.000Z",
  },
};
const sse: SnapshotCardSubject = {
  userId: "u-sse",
  name: "Jane Doe",
  role: "SALES_SUPPORT_EXECUTIVE",
  period: { kind: "ALL_HISTORY", start: "2026-08-01T00:00:00.000Z", end: "2026-10-06T00:00:00.000Z" },
};

const complete: SnapshotDraft = {
  ...emptySnapshotDraft(),
  overallPerformance: "AVERAGE",
  trend: "DECLINING",
  insights: ["MISSING_TARGETS", "NEEDS_SUPPORT"],
  note: "Performance has declined over the last two months.",
};

function formWith(drafts: Record<string, SnapshotDraft>): ProvideForm {
  const form = emptyProvideForm();
  return { ...form, snapshot: { drafts, evidence: [] } };
}

describe("snapshot validation", () => {
  it("lists the four required parts until each is filled", () => {
    expect(snapshotMissing(emptySnapshotDraft())).toEqual([
      "Performance",
      "Trend",
      "Insight",
      "TL's note",
    ]);
    expect(snapshotMissing({ ...complete, note: "  " })).toEqual(["TL's note"]);
    expect(snapshotMissing(complete)).toEqual([]);
  });

  it("requires a snapshot for every linked SSE, never for missing ones", () => {
    expect(snapshotGaps(formWith({ "u-se": complete }), [se])).toEqual([]);
    expect(snapshotGaps(formWith({ "u-se": complete }), [se, sse])).toEqual([
      "Jane Doe: Performance, Trend, Insight, TL's note",
    ]);
  });

  it("documents are never required", () => {
    const form = formWith({ "u-se": complete, "u-sse": complete });
    expect(form.snapshot.evidence).toHaveLength(0);
    expect(snapshotGaps(form, [se, sse])).toEqual([]);
  });
});

describe("snapshot numbers and period", () => {
  it("computes achievement from sales and target, else keeps the typed %", () => {
    expect(draftAchievement({ ...complete, salesAchieved: "84,200", salesTarget: "100000" })).toBe(84.2);
    expect(draftAchievement({ ...complete, achievementPct: "70" })).toBe(70);
    expect(draftAchievement(complete)).toBeNull();
  });

  it("labels the 6-month window by month and short history as all available", () => {
    expect(periodLabel(se.period)).toBe("Apr 2026 – Oct 2026");
    expect(periodLabel(sse.period)).toBe("All available history");
  });

  it("builds the API payload with the SE first and SSEs by user id", () => {
    const payload = performanceSnapshotPayload(
      formWith({ "u-se": { ...complete, salesAchieved: "50", salesTarget: "100" }, "u-sse": complete }),
      [se, sse],
    );
    expect(payload.salesExecutive).toMatchObject({
      overallPerformance: "AVERAGE",
      trend: "DECLINING",
      salesAchieved: 50,
      salesTarget: 100,
      achievementPct: 50,
    });
    expect(payload.salesSupport).toEqual([
      expect.objectContaining({ subjectUserId: "u-sse", note: complete.note }),
    ]);
    expect(payload.evidence).toEqual([]);
    expect(toSnapshotFields(complete).salesAchieved).toBeNull();
  });
});

describe("sales number input", () => {
  it("drops letters and symbols as you type", () => {
    expect(sanitizeAmountInput("abc")).toBe("");
    expect(sanitizeAmountInput("84,200abc")).toBe("84,200");
    expect(sanitizeAmountInput("Rs 1e5")).toBe("15");
    expect(sanitizeAmountInput("-500")).toBe("500");
  });

  it("allows one decimal point with up to two decimals", () => {
    expect(sanitizeAmountInput("84.2")).toBe("84.2");
    expect(sanitizeAmountInput("84.256")).toBe("84.25");
    expect(sanitizeAmountInput("1.2.3")).toBe("1.23");
    expect(sanitizeAmountInput("100.")).toBe("100.");
  });
});

describe("SnapshotSubjectCard", () => {
  it("uses segmented radio groups and multi-select chips with obvious selected state", () => {
    const html = renderToStaticMarkup(
      <SnapshotSubjectCard subject={se} draft={complete} onChange={() => {}} />,
    );
    expect(html.match(/role="radiogroup"/g)).toHaveLength(2);
    expect(html).toMatch(/aria-checked="true"[^>]*>(?:(?!<\/button>).)*Average/);
    expect(html).toMatch(/aria-checked="true"[^>]*>(?:(?!<\/button>).)*Declining/);
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(2);
    expect(html).toContain("Missing Targets");
    expect(html).toContain("Exceptional Performance");
    expect(html).toContain("Sales numbers");
    expect(html).toContain("Apr 2026 – Oct 2026");
    expect(html).toContain("TL&#x27;s Note");
    expect(html).not.toContain("<select");
  });

  it("shows the sales number fields straight away, without a toggle", () => {
    const html = renderToStaticMarkup(
      <SnapshotSubjectCard subject={se} draft={emptySnapshotDraft()} onChange={() => {}} />,
    );
    expect(html).toContain("Sales achieved");
    expect(html).toContain("Target");
    expect(html).toContain("Achievement %");
    expect(html).not.toContain("aria-expanded");
  });

  it("gives the SSE card its own insights and no sales numbers", () => {
    const html = renderToStaticMarkup(
      <SnapshotSubjectCard subject={sse} draft={emptySnapshotDraft()} onChange={() => {}} />,
    );
    expect(html).toContain("Sales Support Executive");
    expect(html).toContain("Strong Support");
    expect(html).not.toContain("Missing Targets");
    expect(html).not.toContain("Sales numbers");
    expect(html).toContain("All available history");
  });
});

describe("Ready to send review", () => {
  it("summarises level, trend, insights and note", () => {
    const html = renderToStaticMarkup(
      <SnapshotSummaryCard
        summary={{
          ...se,
          overallPerformance: "AVERAGE",
          trend: "DECLINING",
          insights: ["MISSING_TARGETS", "INCONSISTENT_RESULTS"],
          note: "Performance has declined over the last two months.",
          salesAchieved: 84200,
          salesTarget: 100000,
          achievementPct: 84.2,
        }}
      />,
    );
    expect(html).toContain("Average");
    expect(html).toContain("Declining");
    expect(html).toContain("Inconsistent Results");
    expect(html).toContain("84,200");
    expect(html).toContain("84.2%");
    expect(html).toContain("Performance has declined");
  });

  it("labels each rating and explains what it means", () => {
    const html = renderToStaticMarkup(
      <SnapshotSummaryCard
        summary={{
          ...se,
          overallPerformance: "NEEDS_ATTENTION",
          trend: "IMPROVING",
          insights: ["CUSTOMER_ISSUES"],
          note: "das",
          salesAchieved: null,
          salesTarget: null,
          achievementPct: null,
        }}
      />,
    );
    expect(html.indexOf("Overall performance")).toBeLessThan(html.indexOf("Needs Attention"));
    expect(html).toContain("Below expectations — needs focused support");
    expect(html.indexOf(">Trend<")).toBeLessThan(html.indexOf("Improving"));
    expect(html).toContain("Results have been getting better recently");
  });

  it("calls the SSE rating plain Performance", () => {
    const html = renderToStaticMarkup(
      <SnapshotSummaryCard
        summary={{
          ...sse,
          overallPerformance: "NEEDS_ATTENTION",
          trend: "STABLE",
          insights: ["INCONSISTENT_RESULTS"],
          note: "das",
          salesAchieved: null,
          salesTarget: null,
          achievementPct: null,
        }}
      />,
    );
    expect(html).not.toContain("Overall performance");
    expect(html).toContain(">Performance<");
    expect(html).toContain("No major change in results recently");
  });
});

describe("ManagementPacketWizard", () => {
  it("opens on the Sales Executive's snapshot and files, with the SSE as step 2", () => {
    const html = renderToStaticMarkup(
      <ManagementPacketWizard
        form={emptyProvideForm()}
        setForm={() => {}}
        busy={false}
        commandoName="Casey Commando"
        subjects={[se, sse]}
        onApprove={() => {}}
        onReject={() => {}}
      />,
    );
    expect(html.replace(/<!-- -->/g, "")).toContain("Step 1 of 8");
    expect(html).toContain("1. Performance Snapshot");
    expect(html).toContain("2. SSE Snapshot");
    expect(html).toContain("Past 6 months");
    expect(html).toContain("John Smith");
    expect(html).not.toContain("Jane Doe");
    expect(html.match(/class="snap-card( is-complete)?"/g)).toHaveLength(1);
    expect(html).toContain("Supporting Evidence");
    expect(html).toContain("Optional");
    expect(html).toContain("4 required fields left on this step");
    expect(html).toMatch(/John Smith: <\/span><button[^>]*>Performance<\/button>/);
    expect(html.match(/<span class="text-\[var\(--status-danger\)\]" aria-hidden="true"> \*<\/span>/g)?.length).toBeGreaterThanOrEqual(4);
    expect(html).not.toMatch(/<button[^>]*disabled=""[^>]*>Continue<\/button>/);
  });

  it("asks only for the Sales Executive on step 1", () => {
    expect(snapshotGaps(formWith({ "u-se": complete }), [se])).toEqual([]);
    expect(snapshotGaps(formWith({ "u-se": complete }), [sse])).toHaveLength(1);
  });

  it("shows no SSE card when no SSE is linked", () => {
    const html = renderToStaticMarkup(
      <ManagementPacketWizard
        form={emptyProvideForm()}
        setForm={() => {}}
        busy={false}
        commandoName="Casey Commando"
        subjects={[se]}
        onApprove={() => {}}
        onReject={() => {}}
      />,
    );
    expect(html).not.toContain("Sales Support Executive");
    expect(html).not.toContain("SSE Snapshot");
    expect(html.replace(/<!-- -->/g, "")).toContain("Step 1 of 6");
    expect(html.match(/class="snap-card( is-complete)?"/g)).toHaveLength(1);
  });
});
