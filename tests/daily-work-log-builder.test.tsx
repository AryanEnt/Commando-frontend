import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ token: "t" }) }));

import type { DailyWorkLog, WorkActivityOption } from "@/lib/api";
import { WorkActivityBuilder } from "@/components/daily-work-logs/WorkActivityBuilder";
import { WorkEntryTable } from "@/components/daily-work-logs/WorkEntryTable";
import { CommitmentComposer } from "@/components/daily-work-logs/CommitmentComposer";
import {
  EMPTY_DRAFT,
  builderReducer,
  builderStage,
  draftDuration,
  draftToInput,
  formatAmount,
  formatDuration,
  hasPlanItem,
  planItemLabel,
  planToInput,
  recentCombos,
  togglePlanItem,
  validateDraft,
  validatePlan,
  type BuilderDraft,
  type PlanItem,
} from "@/lib/work-activities";

const ACTIVITIES: WorkActivityOption[] = [
  {
    code: "FOLLOW_UP",
    label: "Follow Up",
    subItems: [
      { code: "WHATSAPP", label: "WhatsApp" },
      { code: "FACEBOOK", label: "Facebook" },
    ],
  },
  {
    code: "KRISPCALL",
    label: "KrispCall",
    subItems: [
      { code: "OUTGOING", label: "Outgoing" },
      { code: "INCOMING", label: "Incoming" },
    ],
  },
  { code: "EMAIL_TO_AGENT", label: "Email to Agent", subItems: [] },
  {
    code: "DAILY_COLLECTION",
    label: "Daily Collection",
    subItems: [
      { code: "IP", label: "IP" },
      { code: "FP", label: "FP" },
    ],
    hasAmount: true,
  },
];

const byCode = (code: string) => ACTIVITIES.find((a) => a.code === code);

/** ISO timestamp for a local clock time on 2026-10-07. */
const localIso = (hours: number, minutes: number) =>
  new Date(2026, 9, 7, hours, minutes).toISOString();

function text(html: string) {
  return html.replace(/<!-- -->/g, "");
}

function renderBuilder(
  props: Partial<Parameters<typeof WorkActivityBuilder>[0]> = {},
) {
  return text(
    renderToStaticMarkup(
      <WorkActivityBuilder
        activities={ACTIVITIES}
        busy={false}
        onSubmit={() => {}}
        onCancel={() => {}}
        {...props}
      />,
    ),
  );
}

function entry(overrides: Partial<DailyWorkLog> = {}): DailyWorkLog {
  return {
    id: "w1",
    loggedAt: "2026-10-07T05:00:00.000Z",
    activity: "Follow Up · WhatsApp",
    kind: "LOG",
    listItem: "FOLLOW_UP",
    subItem: "WHATSAPP",
    listItemLabel: "Follow Up",
    subItemLabel: "WhatsApp",
    count: 15,
    timeRange: "2min - 5min",
    totalAmount: null,
    attachments: [],
    ...overrides,
  } as unknown as DailyWorkLog;
}

describe("WorkActivityBuilder", () => {
  it("starts with only the activity question", () => {
    const html = renderBuilder();
    expect(html).toContain("What did you work on?");
    expect(html).toContain("Follow Up");
    expect(html).not.toContain("Sub item");
    expect(html).not.toContain("Time Range");
    expect(html).not.toContain("Add evidence");
  });

  it("shows sub items once an activity is chosen, before the fields", () => {
    const html = renderBuilder({ preset: { listItem: "FOLLOW_UP", subItem: null } });
    expect(html).toContain("Sub item");
    expect(html).toContain("WhatsApp");
    expect(html).not.toContain("Time Range");
  });

  it("shows count, start / end time, time spent and optional evidence after the sub item", () => {
    const html = renderBuilder({
      preset: { listItem: "FOLLOW_UP", subItem: "WHATSAPP" },
    });
    expect(html).toContain("Count");
    expect(html).toContain("Start time");
    expect(html).toContain("End time");
    expect(html).toContain('type="time"');
    expect(html).toContain("Time spent");
    expect(html).not.toContain("Time Range");
    expect(html).toContain("Add evidence");
    expect(html).toContain("Optional");
    expect(html).not.toContain("Amount");
  });

  it("skips the sub item step for activities without sub items", () => {
    const html = renderBuilder({
      preset: { listItem: "EMAIL_TO_AGENT", subItem: null },
    });
    expect(html).not.toContain("Sub item");
    expect(html).toContain("Start time");
  });

  it("only asks for an amount on Daily Collection", () => {
    const html = renderBuilder({
      preset: { listItem: "DAILY_COLLECTION", subItem: "IP" },
    });
    expect(html).toContain("Amount");
    expect(html).toContain("Rs.");
  });

  it("prefills from an entry when editing", () => {
    const html = renderBuilder({
      editing: entry({ startedAt: localIso(9, 0), endedAt: localIso(9, 25) }),
    });
    expect(html).toContain("Edit activity");
    expect(html).toContain('value="15"');
    expect(html).toContain('value="09:00"');
    expect(html).toContain('value="09:25"');
    expect(html).toContain("25 min");
    expect(html).toContain("Save changes");
  });
});

describe("builder draft helpers", () => {
  it("resets the sub item and amount when the activity changes", () => {
    let draft: BuilderDraft = builderReducer(EMPTY_DRAFT, {
      type: "activity",
      code: "DAILY_COLLECTION",
    });
    draft = builderReducer(draft, { type: "subItem", code: "IP" });
    draft = builderReducer(draft, { type: "amount", value: "50000" });
    draft = builderReducer(draft, { type: "activity", code: "FOLLOW_UP" });
    expect(draft).toMatchObject({ listItem: "FOLLOW_UP", subItem: null, amount: "" });
  });

  it("keeps the sub item when the same activity is picked again", () => {
    const draft = builderReducer(
      { ...EMPTY_DRAFT, listItem: "FOLLOW_UP", subItem: "WHATSAPP" },
      { type: "activity", code: "FOLLOW_UP" },
    );
    expect(draft.subItem).toBe("WHATSAPP");
  });

  it("only accepts digits for the count", () => {
    const draft = builderReducer(EMPTY_DRAFT, { type: "count", value: "-1.5a" });
    expect(draft.count).toBe("15");
  });

  it("walks the stages in order", () => {
    expect(builderStage(EMPTY_DRAFT, undefined)).toBe("activity");
    expect(
      builderStage({ ...EMPTY_DRAFT, listItem: "FOLLOW_UP" }, byCode("FOLLOW_UP")),
    ).toBe("subItem");
    expect(
      builderStage({ ...EMPTY_DRAFT, listItem: "EMAIL_TO_AGENT" }, byCode("EMAIL_TO_AGENT")),
    ).toBe("details");
  });

  it("validates every required field", () => {
    const base = { ...EMPTY_DRAFT, listItem: "FOLLOW_UP", subItem: "WHATSAPP" };
    const follow = byCode("FOLLOW_UP");
    expect(validateDraft(EMPTY_DRAFT, undefined)).toBe("Choose an activity");
    expect(validateDraft({ ...base, subItem: null }, follow)).toBe("Choose a sub item");
    expect(validateDraft({ ...base, subItem: "IP" }, follow)).toBe("Choose a sub item");
    expect(validateDraft({ ...base, count: "0" }, follow)).toBe(
      "Enter a count of at least 1",
    );
    const counted = { ...base, count: "15" };
    expect(validateDraft({ ...counted, endTime: "09:25" }, follow)).toBe(
      "Enter a start time",
    );
    expect(validateDraft({ ...counted, startTime: "09:00" }, follow)).toBe(
      "Enter an end time",
    );
    expect(
      validateDraft({ ...counted, startTime: "09:25", endTime: "09:25" }, follow),
    ).toBe("End time must be after start time");
    expect(
      validateDraft({ ...counted, startTime: "09:00", endTime: "09:25" }, follow),
    ).toBeNull();

    const collection = {
      ...EMPTY_DRAFT,
      listItem: "DAILY_COLLECTION",
      subItem: "IP",
      count: "2",
      startTime: "10:00",
      endTime: "11:00",
    };
    expect(validateDraft(collection, byCode("DAILY_COLLECTION"))).toBe(
      "Enter the total amount",
    );
    expect(
      validateDraft({ ...collection, amount: "50,000" }, byCode("DAILY_COLLECTION")),
    ).toBeNull();
  });

  it("builds API input without stale sub items or amounts", () => {
    expect(
      draftToInput(
        {
          listItem: "EMAIL_TO_AGENT",
          subItem: "X",
          count: "3",
          startTime: "09:00",
          endTime: "09:25",
          amount: "9",
        },
        byCode("EMAIL_TO_AGENT")!,
        "2026-10-07",
      ),
    ).toEqual({
      listItem: "EMAIL_TO_AGENT",
      subItem: null,
      count: 3,
      startedAt: localIso(9, 0),
      endedAt: localIso(9, 25),
      timeRange: null,
      totalAmount: null,
    });
    expect(
      draftToInput(
        {
          listItem: "DAILY_COLLECTION",
          subItem: "FP",
          count: "1",
          startTime: "10:00",
          endTime: "11:00",
          amount: "50,000",
        },
        byCode("DAILY_COLLECTION")!,
        "2026-10-07",
      ).totalAmount,
    ).toBe(50000);
  });

  it("calculates the time spent from start and end", () => {
    expect(draftDuration({ startTime: "09:00", endTime: "09:25" })).toBe(25);
    expect(draftDuration({ startTime: "09:00", endTime: "" })).toBeNull();
    expect(draftDuration({ startTime: "10:00", endTime: "09:00" })).toBeNull();
    expect(formatDuration(25)).toBe("25 min");
    expect(formatDuration(60)).toBe("1 hr");
    expect(formatDuration(95)).toBe("1 hr 35 min");
  });

  it("formats amounts in rupees", () => {
    expect(formatAmount(50000)).toBe("Rs. 50,000");
    expect(formatAmount(null)).toBe("—");
  });

  it("suggests the most used valid combos first", () => {
    const entries = [
      entry({ id: "a", listItem: "KRISPCALL", subItem: "OUTGOING" }),
      entry({ id: "b" }),
      entry({ id: "c" }),
      entry({ id: "d", listItem: "PORTAL_UPLOAD", subItem: "EA" }),
      entry({ id: "e", listItem: null, subItem: null }),
      entry({ id: "f", listItem: "EMAIL_TO_AGENT", subItem: null }),
    ];
    expect(recentCombos(entries, ACTIVITIES).map((c) => c.label)).toEqual([
      "Follow Up · WhatsApp",
      "KrispCall · Outgoing",
      "Email to Agent",
    ]);
  });
});

describe("WorkEntryTable", () => {
  function renderTable(props: Partial<Parameters<typeof WorkEntryTable>[0]> = {}) {
    return text(
      renderToStaticMarkup(
        <WorkEntryTable
          entries={[entry()]}
          canEdit
          empty={<p>No activities logged yet</p>}
          onEdit={() => {}}
          onDelete={() => {}}
          onViewEvidence={() => {}}
          {...props}
        />,
      ),
    );
  }

  it("renders the Daily Log columns and row values", () => {
    const html = renderTable();
    for (const col of ["Activity", "Sub Item", "Count", "Time Spent", "Total Amount", "Evidence"]) {
      expect(html).toContain(`>${col}</th>`);
    }
    expect(html).toContain("Follow Up");
    expect(html).toContain("WhatsApp");
    expect(html).toContain(">15<");
    expect(html).toContain("2min - 5min");
    expect(html).toContain('aria-label="Edit Follow Up · WhatsApp"');
    expect(html).toContain('aria-label="Delete Follow Up · WhatsApp"');
    expect(html).not.toContain("View evidence for");
    expect(html).not.toContain("Just added");
  });

  it("shows time spent with the start–end clock time", () => {
    const html = renderTable({
      entries: [
        entry({
          timeRange: null,
          startedAt: localIso(9, 0),
          endedAt: localIso(10, 35),
          durationMinutes: 95,
        }),
      ],
    });
    expect(html).toContain("1 hr 35 min");
    expect(html).toContain("wl-time-range");
  });

  it("marks the just-added row and the row being edited", () => {
    const html = renderTable({
      entries: [entry({ id: "a" }), entry({ id: "b" })],
      highlightId: "a",
      editingId: "b",
    });
    expect(html).toContain("Just added");
    expect(html).toContain("wl-row is-new");
    expect(html).toContain("wl-row is-editing");
  });

  it("shows the amount and evidence count when present", () => {
    const html = renderTable({
      entries: [
        entry({
          listItem: "DAILY_COLLECTION",
          subItem: "IP",
          listItemLabel: "Daily Collection",
          subItemLabel: "IP",
          totalAmount: 50000,
          attachments: [
            { id: "f1", fileName: "a.png", url: null } as never,
          ],
        }),
      ],
    });
    expect(html).toContain("Rs. 50,000");
    expect(html).toContain("1 file");
    expect(html).toContain('aria-label="View evidence for Daily Collection · IP"');
  });

  it("falls back to the free-text activity on older entries", () => {
    const html = renderTable({
      entries: [
        entry({
          activity: "Called three leads",
          listItem: null,
          subItem: null,
          listItemLabel: null,
          subItemLabel: null,
          count: null,
          timeRange: null,
        }),
      ],
    });
    expect(html).toContain("Called three leads");
    expect(html).toContain("wl-legacy-activity");
  });

  it("renders the empty state when there are no rows", () => {
    const html = renderTable({ entries: [] });
    expect(html).toContain("No activities logged yet");
    expect(html).not.toContain("<table");
  });
});

describe("Commitments", () => {
  it("picks from the activity list without a time range", () => {
    const html = text(
      renderToStaticMarkup(
        <CommitmentComposer
          activities={ACTIVITIES}
          busy={false}
          onSubmit={() => {}}
          onCancel={() => {}}
        />,
      ),
    );
    expect(html).toContain(">Add commitment</p>");
    expect(html).toContain('aria-label="Close"');
    expect(html).toContain("What do you plan to work on today? Pick all that apply.");
    for (const a of ACTIVITIES) expect(html).toContain(`>${a.label}</button>`);
    expect(html).toContain("Add a note");
    expect(html).toContain("One per day · locked once added");
    expect(html).toContain("Add Commitment");
    expect(html).not.toContain("Time Range");
    expect(html).not.toContain("<textarea");
    expect(html).toMatch(/type="submit"[^>]*disabled/);
  });

  it("toggles several activities and sub items into one plan", () => {
    let items: PlanItem[] = [];
    items = togglePlanItem(items, "FOLLOW_UP", "WHATSAPP");
    items = togglePlanItem(items, "FOLLOW_UP", "FACEBOOK");
    items = togglePlanItem(items, "EMAIL_TO_AGENT", null);
    expect(items.map((i) => planItemLabel(i, ACTIVITIES))).toEqual([
      "Follow Up · WhatsApp",
      "Follow Up · Facebook",
      "Email to Agent",
    ]);
    expect(hasPlanItem(items, "FOLLOW_UP", "FACEBOOK")).toBe(true);

    items = togglePlanItem(items, "FOLLOW_UP", "FACEBOOK");
    expect(hasPlanItem(items, "FOLLOW_UP", "FACEBOOK")).toBe(false);
    expect(items).toHaveLength(2);
  });

  it("needs a target for every planned item, and an amount for collections", () => {
    expect(validatePlan([], ACTIVITIES)).toBe("Pick what you plan to work on");

    const plan: PlanItem[] = [
      { listItem: "FOLLOW_UP", subItem: "WHATSAPP", count: "15", amount: "" },
      { listItem: "DAILY_COLLECTION", subItem: "IP", count: "", amount: "" },
    ];
    expect(validatePlan(plan, ACTIVITIES)).toBe("Enter a target for Daily Collection · IP");

    plan[1] = { ...plan[1]!, count: "2" };
    expect(validatePlan(plan, ACTIVITIES)).toBe("Enter the amount for Daily Collection · IP");

    plan[1] = { ...plan[1]!, amount: "50,000" };
    expect(validatePlan(plan, ACTIVITIES)).toBeNull();
    expect(planToInput(plan, ACTIVITIES)).toEqual([
      { listItem: "FOLLOW_UP", subItem: "WHATSAPP", count: 15, totalAmount: null },
      { listItem: "DAILY_COLLECTION", subItem: "IP", count: 2, totalAmount: 50000 },
    ]);
  });

  function renderCommitments(entries: DailyWorkLog[]) {
    return text(
      renderToStaticMarkup(
        <WorkEntryTable
          variant="commitment"
          entries={entries}
          canEdit
          empty={<p>No commitments yet</p>}
          onEdit={() => {}}
          onDelete={() => {}}
        />,
      ),
    );
  }

  it("reviews commitments in a locked table", () => {
    const html = renderCommitments([
      entry({
        kind: "COMMITMENT",
        activity: "Chase seminar leads",
        notes: "Chase seminar leads",
        listItem: null,
        subItem: null,
        listItemLabel: null,
        subItemLabel: null,
        count: null,
        timeRange: null,
      }),
    ]);
    for (const col of ["Commitment", "Added", "Evidence"]) {
      expect(html).toContain(`>${col}</th>`);
    }
    expect(html).toContain("Chase seminar leads");
    expect(html).toContain("Locked");
    expect(html).not.toContain('aria-label="Edit');
    expect(html).not.toContain('aria-label="Delete');
    expect(html).not.toContain("Total Amount");
    expect(html).not.toContain(">Target</th>");
  });

  it("shows planned activities with their target", () => {
    const html = renderCommitments([entry({ kind: "COMMITMENT", notes: null })]);
    expect(html).toContain(">Follow Up</span>");
    expect(html).toContain(">WhatsApp</span>");
    expect(html).toContain("Target 15");
    expect(html).not.toContain("2min - 5min");
  });

  it("renders the empty state", () => {
    expect(renderCommitments([])).toContain("No commitments yet");
  });
});
