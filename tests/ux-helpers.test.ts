import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDateTime,
  formatTime,
} from "../lib/dates";
import { navItemsForRole, pathMatches } from "../lib/navigation";
import { interventionStageFromAssignment, referralNextAction } from "../lib/lifecycle";
import { greeting, statusLabel } from "../lib/labels";

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
    expect(items.some((i) => i.section === "Workspace")).toBe(true);
  });

  it("pathMatches ignores query and /new children for list parents", () => {
    expect(pathMatches("/referrals", "/referrals?status=SUBMITTED")).toBe(true);
    expect(pathMatches("/referrals/new", "/referrals")).toBe(false);
    expect(pathMatches("/referrals/abc", "/referrals")).toBe(true);
  });
});

describe("lifecycle copy", () => {
  it("maps assignment and referral status to a stage", () => {
    expect(interventionStageFromAssignment(null, "SUBMITTED")).toBe("REFER");
    expect(interventionStageFromAssignment(null)).toBe("REFER");
  });

  it("explains the next referral action", () => {
    expect(referralNextAction("SUBMITTED")).toMatch(/acknowledge/i);
    expect(referralNextAction("IN_PROGRESS")).toMatch(/does not end/i);
    expect(referralNextAction("COMPLETED")).toMatch(/handoff is closed/i);
  });

  it("labels statuses for people, not systems", () => {
    expect(statusLabel("IN_PROGRESS")).toBe("In progress");
    expect(greeting(new Date("2026-09-08T03:00:00"))).toMatch(/Good/);
  });
});
