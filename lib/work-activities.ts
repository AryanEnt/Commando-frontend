import type {
  CommitmentPlanItem,
  DailyWorkLog,
  WorkActivityInput,
  WorkActivityOption,
} from "@/lib/api";
import { combineLocalDateTime, toLocalTimeInput } from "@/lib/dates";
import { sanitizeAmountInput } from "@/lib/performance-snapshot";

/** Daily Log = completed activities; Commitment = planned activities with a target. */
export type WorkEntryVariant = "log" | "commitment";

export const MAX_COMMITMENT_LENGTH = 2000;

/** Subtle per-activity accent; unknown / older entries use the neutral tone. */
const ACCENTS: Record<string, string> = {
  FOLLOW_UP: "follow",
  KRISPCALL: "call",
  PORTAL_UPLOAD: "upload",
  COMMENT_HANDLING: "comment",
  SOCIAL_MEDIA_POST: "social",
  EMAIL_TO_AGENT: "email",
  BULK_SMS: "sms",
  DAILY_COLLECTION: "collection",
};

export function activityAccent(code: string | null | undefined): string {
  return (code && ACCENTS[code]) || "neutral";
}

export type BuilderDraft = {
  listItem: string | null;
  subItem: string | null;
  count: string;
  /** Local clock times from `<input type="time">` (HH:MM). */
  startTime: string;
  endTime: string;
  amount: string;
};

export const EMPTY_DRAFT: BuilderDraft = {
  listItem: null,
  subItem: null,
  count: "",
  startTime: "",
  endTime: "",
  amount: "",
};

export type BuilderAction =
  | { type: "activity"; code: string }
  | { type: "subItem"; code: string }
  | { type: "count"; value: string }
  | { type: "startTime"; value: string }
  | { type: "endTime"; value: string }
  | { type: "amount"; value: string }
  | { type: "reset"; draft: BuilderDraft };

export function sanitizeCount(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 6);
}

export function builderReducer(
  state: BuilderDraft,
  action: BuilderAction,
): BuilderDraft {
  switch (action.type) {
    case "activity":
      if (state.listItem === action.code) return state;
      // A different activity never keeps the previous sub item or amount.
      return { ...state, listItem: action.code, subItem: null, amount: "" };
    case "subItem":
      return { ...state, subItem: action.code };
    case "count":
      return { ...state, count: sanitizeCount(action.value) };
    case "startTime":
      return { ...state, startTime: action.value };
    case "endTime":
      return { ...state, endTime: action.value };
    case "amount":
      return { ...state, amount: sanitizeAmountInput(action.value) };
    case "reset":
      return action.draft;
  }
}

export function draftFromEntry(entry: DailyWorkLog): BuilderDraft {
  return {
    listItem: entry.listItem ?? null,
    subItem: entry.subItem ?? null,
    count: entry.count != null ? String(entry.count) : "",
    startTime: entry.startedAt ? toLocalTimeInput(entry.startedAt) : "",
    endTime: entry.endedAt ? toLocalTimeInput(entry.endedAt) : "",
    amount: entry.totalAmount != null ? String(entry.totalAmount) : "",
  };
}

function minutesOfDay(time: string): number | null {
  const match = /^(\d{2}):(\d{2})/.exec(time);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Minutes from start to end, or null until both are set and end is after start. */
export function draftDuration(
  draft: Pick<BuilderDraft, "startTime" | "endTime">,
): number | null {
  const start = minutesOfDay(draft.startTime);
  const end = minutesOfDay(draft.endTime);
  if (start === null || end === null || end <= start) return null;
  return end - start;
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

export function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/,/g, "").trim();
  if (!cleaned) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

/** Which builder step is visible: sub items only after an activity, fields only after the sub item. */
export function builderStage(
  draft: BuilderDraft,
  activity: WorkActivityOption | undefined,
): "activity" | "subItem" | "details" {
  if (!activity) return "activity";
  if (activity.subItems.length > 0 && !draft.subItem) return "subItem";
  return "details";
}

/** First problem with the draft, or null when it can be saved. */
export function validateDraft(
  draft: BuilderDraft,
  activity: WorkActivityOption | undefined,
): string | null {
  if (!activity) return "Choose an activity";
  if (activity.subItems.length > 0) {
    if (!draft.subItem) return "Choose a sub item";
    if (!activity.subItems.some((s) => s.code === draft.subItem)) {
      return "Choose a sub item";
    }
  }
  const count = Number(draft.count);
  if (!draft.count || !Number.isInteger(count) || count < 1) {
    return "Enter a count of at least 1";
  }
  if (!draft.startTime) return "Enter a start time";
  if (!draft.endTime) return "Enter an end time";
  if (draftDuration(draft) === null) return "End time must be after start time";
  if (activity.hasAmount && parseAmount(draft.amount) === null) {
    return "Enter the total amount";
  }
  return null;
}

/** `day` is the local calendar day (YYYY-MM-DD) the start / end times fall on. */
export function draftToInput(
  draft: BuilderDraft,
  activity: WorkActivityOption,
  day: string,
): WorkActivityInput {
  return {
    listItem: activity.code,
    subItem: activity.subItems.length > 0 ? draft.subItem : null,
    count: Number(draft.count),
    startedAt: combineLocalDateTime(day, draft.startTime),
    endedAt: combineLocalDateTime(day, draft.endTime),
    timeRange: null,
    totalAmount: activity.hasAmount ? parseAmount(draft.amount) : null,
  };
}

/** One planned activity in the commitment form; count / amount are raw input. */
export type PlanItem = {
  listItem: string;
  subItem: string | null;
  count: string;
  amount: string;
};

function samePlanItem(item: PlanItem, listItem: string, subItem: string | null) {
  return item.listItem === listItem && item.subItem === subItem;
}

export function hasPlanItem(
  items: PlanItem[],
  listItem: string,
  subItem: string | null,
): boolean {
  return items.some((i) => samePlanItem(i, listItem, subItem));
}

/** Adds the activity / sub item to the plan, or removes it when already there. */
export function togglePlanItem(
  items: PlanItem[],
  listItem: string,
  subItem: string | null,
): PlanItem[] {
  return hasPlanItem(items, listItem, subItem)
    ? items.filter((i) => !samePlanItem(i, listItem, subItem))
    : [...items, { listItem, subItem, count: "", amount: "" }];
}

export function planItemLabel(
  item: Pick<PlanItem, "listItem" | "subItem">,
  activities: WorkActivityOption[],
): string {
  const activity = activities.find((a) => a.code === item.listItem);
  const sub = activity?.subItems.find((s) => s.code === item.subItem);
  const name = activity?.label ?? item.listItem;
  return sub ? `${name} · ${sub.label}` : name;
}

/** First problem with the plan, or null when it can be saved. */
export function validatePlan(
  items: PlanItem[],
  activities: WorkActivityOption[],
): string | null {
  if (items.length === 0) return "Pick what you plan to work on";
  for (const item of items) {
    const count = Number(item.count);
    if (!item.count || !Number.isInteger(count) || count < 1) {
      return `Enter a target for ${planItemLabel(item, activities)}`;
    }
    const activity = activities.find((a) => a.code === item.listItem);
    if (activity?.hasAmount && parseAmount(item.amount) === null) {
      return `Enter the amount for ${planItemLabel(item, activities)}`;
    }
  }
  return null;
}

export function planToInput(
  items: PlanItem[],
  activities: WorkActivityOption[],
): CommitmentPlanItem[] {
  return items.map((item) => {
    const activity = activities.find((a) => a.code === item.listItem);
    return {
      listItem: item.listItem,
      subItem: item.subItem,
      count: Number(item.count),
      totalAmount: activity?.hasAmount ? parseAmount(item.amount) : null,
    };
  });
}

const amountFormat = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});

export function formatAmount(value: number | null | undefined): string {
  return value == null ? "—" : `Rs. ${amountFormat.format(value)}`;
}

export function entrySummary(entries: DailyWorkLog[]): {
  activities: number;
  tasks: number;
} {
  return {
    activities: entries.length,
    tasks: entries.reduce((sum, e) => sum + (e.count ?? 0), 0),
  };
}

export function pluralize(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

export type QuickCombo = {
  key: string;
  listItem: string;
  subItem: string | null;
  label: string;
};

/** Most-used activity + sub item pairs (still valid in the config), most frequent first. */
export function recentCombos(
  entries: DailyWorkLog[],
  activities: WorkActivityOption[],
  limit = 3,
): QuickCombo[] {
  const counts = new Map<string, { combo: QuickCombo; uses: number; last: number }>();
  entries.forEach((entry, index) => {
    if (!entry.listItem) return;
    const activity = activities.find((a) => a.code === entry.listItem);
    if (!activity) return;
    const sub = entry.subItem
      ? activity.subItems.find((s) => s.code === entry.subItem)
      : undefined;
    if (activity.subItems.length > 0 && !sub) return;
    const key = `${activity.code}:${sub?.code ?? ""}`;
    const current = counts.get(key);
    if (current) {
      current.uses += 1;
      return;
    }
    counts.set(key, {
      combo: {
        key,
        listItem: activity.code,
        subItem: sub?.code ?? null,
        label: sub ? `${activity.label} · ${sub.label}` : activity.label,
      },
      uses: 1,
      last: index,
    });
  });
  return [...counts.values()]
    .sort((a, b) => b.uses - a.uses || a.last - b.last)
    .slice(0, limit)
    .map((c) => c.combo);
}
