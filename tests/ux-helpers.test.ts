import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDateTime,
  formatTime,
} from "../lib/dates";
import { navItemsForRole, pathMatches, profileIdFromPathname } from "../lib/navigation";
import {
  seNavForRole,
  seSectionFromPathname,
} from "../lib/se-workspace-nav";
import {
  isSeRelatedPathname,
  seSectionFromRelatedPathname,
} from "../lib/se-workspace-persist";
import { interventionStageFromAssignment, referralNextAction } from "../lib/lifecycle";
import { greeting, statusLabel } from "../lib/labels";
import {
  filterUnseenInboxItems,
  formatSeAlertCount,
  inboxSeenIdFromPathname,
  seNavAlertCounts,
  seSectionForWorkspaceEvent,
} from "../lib/se-nav-alerts";

describe("dates helpers", () => {
  it("returns em dash for empty values", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatTime(undefined)).toBe("—");
    expect(formatDateTime("")).toBe("—");
  });

  it("formats a stable UTC date", () => {
    const value = "2026-09-08T14:30:00.000Z";
    expect(formatDate(value)).toMatch(/2026/);
    expect(formatTime(value)).toMatch(/\d/);
    expect(formatDateTime(value)).toMatch(/2026/);
  });

  it("rejects invalid dates", () => {
    expect(formatDate("not-a-date")).toBe("—");
  });
});

describe("navigation helpers", () => {
  it("filters nav by permission", () => {
    const items = navItemsForRole("SALES_EXECUTIVE", (code) =>
      code === "DASHBOARD_VIEW" || code === "SWOT_VIEW",
    );
    expect(items.every((i) => ["DASHBOARD_VIEW", "SWOT_VIEW"].includes(i.permission))).toBe(
      true,
    );
    expect(items.some((i) => i.href === "/dashboard")).toBe(true);
    expect(items.some((i) => i.section === "My work")).toBe(true);
    expect(items.some((i) => i.label === "My workspace")).toBe(true);
  });

  it("pathMatches ignores query and /new children for list parents", () => {
    expect(pathMatches("/referrals", "/referrals?status=SUBMITTED")).toBe(true);
    expect(pathMatches("/referrals/new", "/referrals")).toBe(false);
    expect(pathMatches("/referrals/abc", "/referrals")).toBe(true);
  });

  it("pathMatches treats configuration children as active", () => {
    expect(pathMatches("/activity-types", "/configuration")).toBe(true);
    expect(pathMatches("/monitoring-checklists", "/configuration")).toBe(true);
  });

  it("extracts profile ids from SE workspace paths", () => {
    expect(profileIdFromPathname("/profiles/abc")).toBe("abc");
    expect(profileIdFromPathname("/profiles/abc/reviews")).toBe("abc");
    expect(profileIdFromPathname("/profiles")).toBeNull();
  });

  it("personalizes Sales Support primary nav", () => {
    const items = navItemsForRole("SALES_SUPPORT_EXECUTIVE", () => true);
    expect(items.map((i) => i.label)).toEqual([
      "Dashboard",
      "My Support Tasks",
      "Sync Evaluations",
    ]);
    expect(items.every((i) => i.href !== "/profiles")).toBe(true);
  });

  it("keeps Team Lead primary nav free of global performance lists", () => {
    const items = navItemsForRole("TEAM_LEAD", () => true);
    const hrefs = items.map((i) => i.href);
    expect(hrefs).not.toContain("/weekly-reviews");
    expect(hrefs).not.toContain("/action-items");
    expect(hrefs).not.toContain("/feedback");
    expect(hrefs).not.toContain("/performance");
    expect(items.some((i) => i.section === "Performance")).toBe(false);
    expect(hrefs).toContain("/profiles");
    expect(hrefs).toContain("/teams");
    expect(hrefs).toContain("/eisenhower");
  });

  it("groups Commando nav around interventions", () => {
    const items = navItemsForRole("COMMANDO_EXECUTIVE", () => true);
    expect(items.map((i) => i.label)).toContain("Requests & Interventions");
    expect(items.map((i) => i.label)).toContain("Eisenhower");
    expect(items.some((i) => i.section === "Interventions")).toBe(true);
  });
});

describe("SE workspace navigation", () => {
  it("orders contextual sections for Team Lead", () => {
    const labels = seNavForRole("TEAM_LEAD").map((i) => i.label);
    expect(labels[0]).toBe("Overview");
    expect(labels[1]).toBe("Intervention");
    expect(labels).toContain("Eisenhower");
    expect(labels).toContain("Monitoring");
    expect(labels).toContain("Goals");
    expect(labels).toContain("Reviews");
  });

  it("orders contextual sections for Commando", () => {
    const labels = seNavForRole("COMMANDO_EXECUTIVE").map((i) => i.label);
    expect(labels[0]).toBe("Overview");
    expect(labels[1]).toBe("Intervention");
    expect(labels).toContain("Coaching");
    expect(labels).toContain("Monitoring");
  });

  it("personalizes Sales Executive workspace nav", () => {
    const labels = seNavForRole("SALES_EXECUTIVE").map((i) => i.label);
    expect(labels[0]).toBe("My workspace");
    expect(labels).toContain("My Assignment");
    expect(labels).toContain("My Reviews");
    expect(labels).toContain("Performance");
    expect(labels).toContain("Feedback");
    expect(labels).toContain("History");
    expect(labels).not.toContain("Coaching");
    expect(labels).not.toContain("Monitoring");
  });

  it("personalizes Sales Support contextual SE nav", () => {
    const labels = seNavForRole("SALES_SUPPORT_EXECUTIVE").map((i) => i.label);
    expect(labels).toEqual([
      "Overview",
      "My support",
      "Related assignment",
      "History",
    ]);
  });

  it("resolves deep-link sections including Eisenhower", () => {
    expect(seSectionFromPathname("/profiles/x")).toBe("overview");
    expect(seSectionFromPathname("/profiles/x/eisenhower")).toBe("eisenhower");
    expect(seSectionFromPathname("/profiles/x/reviews")).toBe("reviews");
    expect(seSectionFromPathname("/profiles/x/interventions")).toBe(
      "interventions",
    );
    expect(seSectionFromPathname("/profiles/x/daily-logs/abc")).toBe("coaching");
    expect(seSectionFromPathname("/profiles/x/checklist")).toBe("checklist");
  });

  it("keeps related entity routes mapped to SE sections", () => {
    expect(isSeRelatedPathname("/action-items/abc")).toBe(true);
    expect(isSeRelatedPathname("/daily-logs/abc")).toBe(true);
    expect(isSeRelatedPathname("/dashboard")).toBe(false);
    expect(seSectionFromRelatedPathname("/action-items/abc")).toBe("actions");
    expect(seSectionFromRelatedPathname("/daily-logs/abc")).toBe("coaching");
    expect(seSectionFromRelatedPathname("/weekly-reviews/abc")).toBe("reviews");
  });
});

describe("lifecycle copy", () => {
  it("maps assignment and referral status to a stage", () => {
    expect(interventionStageFromAssignment(null, "SUBMITTED")).toBe("REFER");
    expect(interventionStageFromAssignment(null)).toBe("REFER");
  });

  it("explains the next referral action", () => {
    expect(referralNextAction("SUBMITTED")).toMatch(/Team Lead review/i);
    expect(referralNextAction("IN_PROGRESS")).toMatch(/does not end/i);
    expect(referralNextAction("COMPLETED")).toMatch(/handoff is closed/i);
  });

  it("labels statuses for people, not systems", () => {
    expect(statusLabel("IN_PROGRESS")).toBe("In progress");
    expect(greeting(new Date("2026-09-08T03:00:00"))).toMatch(/Good/);
  });
});

describe("SE sidebar alerts", () => {
  it("maps workspace activity onto the SE nav item", () => {
    expect(seSectionForWorkspaceEvent("ACTION")).toBe("actions");
    expect(seSectionForWorkspaceEvent("REVIEW")).toBe("reviews");
    expect(seSectionForWorkspaceEvent("FEEDBACK")).toBe("feedback");
    expect(seSectionForWorkspaceEvent("SUPPORT")).toBe("support");
    expect(seSectionForWorkspaceEvent("INTERVENTION")).toBe("overview");
    expect(seSectionForWorkspaceEvent("DAILY_LOG")).toBe("timeline");
  });

  it("counts only unseen items created by someone else", () => {
    const counts = seNavAlertCounts({
      viewerId: "se-1",
      seen: { actions: Date.parse("2026-09-01T00:00:00.000Z") },
      events: [
        {
          type: "ACTION",
          occurredAt: "2026-09-20T00:00:00.000Z",
          createdAt: "2026-09-20T00:00:00.000Z",
          createdById: "tl-1",
        },
        {
          type: "ACTION",
          occurredAt: "2026-08-01T00:00:00.000Z",
          createdAt: "2026-08-01T00:00:00.000Z",
          createdById: "tl-1",
        },
        {
          type: "ACTION",
          occurredAt: "2026-09-21T00:00:00.000Z",
          createdAt: "2026-09-21T00:00:00.000Z",
          createdById: "se-1",
        },
      ] as never,
    });
    expect(counts.actions).toBe(1);
    expect(formatSeAlertCount(1)).toBe("1");
    expect(formatSeAlertCount(12)).toBe("9+");
  });

  it("maps record pages to inbox item ids", () => {
    expect(inboxSeenIdFromPathname("/action-items/abc")).toBe("action-abc");
    expect(inboxSeenIdFromPathname("/referrals/abc")).toBe("referral-abc");
    expect(inboxSeenIdFromPathname("/weekly-reviews/abc")).toBe("review-abc");
    expect(inboxSeenIdFromPathname("/my-tasks/abc")).toBe("task-abc");
    expect(inboxSeenIdFromPathname("/action-items/new")).toBeNull();
  });

  it("hides inbox items after they are marked seen", () => {
    const items = filterUnseenInboxItems(
      [
        {
          id: "action-1",
          section: "actions",
          title: "Follow up",
          at: 200,
          href: "/action-items/1",
        },
        {
          id: "referral-1",
          section: "overview",
          title: "Referral",
          at: 100,
          href: "/referrals/1",
        },
      ],
      { "action-1": 200 },
    );
    expect(items.map((item) => item.id)).toEqual(["referral-1"]);
  });
});
