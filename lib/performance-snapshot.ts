import type {
  PerformanceSnapshot,
  SnapshotFields,
  SnapshotPerformanceLevel,
  SnapshotMonthlySale,
  SnapshotPeriod,
  SnapshotSubjectRole,
  SnapshotTrend,
} from "@/lib/api";

export type SnapshotTone = "success" | "warn" | "danger" | "neutral";

export type SnapshotInsightOption = { key: string; emoji: string; label: string };

export const SE_INSIGHTS: SnapshotInsightOption[] = [
  { key: "IMPROVING_SALES", emoji: "📈", label: "Improving Sales" },
  { key: "DECLINING_SALES", emoji: "📉", label: "Declining Sales" },
  { key: "MISSING_TARGETS", emoji: "🎯", label: "Missing Targets" },
  { key: "STRONG_PERFORMANCE", emoji: "🏆", label: "Strong Performance" },
  { key: "CUSTOMER_ISSUES", emoji: "👥", label: "Customer Issues" },
  { key: "ACTIVITY_ISSUES", emoji: "📞", label: "Activity Issues" },
  { key: "NEEDS_SUPPORT", emoji: "💡", label: "Needs Support" },
  { key: "PERFORMANCE_CONCERN", emoji: "⚠️", label: "Performance Concern" },
  { key: "INCONSISTENT_RESULTS", emoji: "🔄", label: "Inconsistent Results" },
  { key: "EXCEPTIONAL_PERFORMANCE", emoji: "🌟", label: "Exceptional Performance" },
];

export const SSE_INSIGHTS: SnapshotInsightOption[] = [
  { key: "STRONG_SUPPORT", emoji: "🤝", label: "Strong Support" },
  { key: "ACTIVITY_ISSUES", emoji: "📞", label: "Activity Issues" },
  { key: "NEEDS_SUPPORT", emoji: "💡", label: "Needs Support" },
  { key: "INCONSISTENT_RESULTS", emoji: "🔄", label: "Inconsistent Results" },
  { key: "CUSTOMER_ISSUES", emoji: "👥", label: "Customer Issues" },
  { key: "PERFORMANCE_CONCERN", emoji: "⚠️", label: "Performance Concern" },
];

export function insightsFor(role: SnapshotSubjectRole) {
  return role === "SALES_SUPPORT_EXECUTIVE" ? SSE_INSIGHTS : SE_INSIGHTS;
}

export function insightOption(key: string): SnapshotInsightOption {
  return (
    [...SE_INSIGHTS, ...SSE_INSIGHTS].find((o) => o.key === key) ?? {
      key,
      emoji: "•",
      label: key.replaceAll("_", " ").toLowerCase(),
    }
  );
}

export const PERFORMANCE_LEVELS: Array<{
  value: SnapshotPerformanceLevel;
  label: string;
  tone: SnapshotTone;
  /** Plain-language meaning shown to the Commando. */
  meaning: string;
}> = [
  {
    value: "STRONG",
    label: "Strong",
    tone: "success",
    meaning: "Consistently meeting or beating expectations",
  },
  {
    value: "AVERAGE",
    label: "Average",
    tone: "warn",
    meaning: "Meeting some expectations, with clear gaps",
  },
  {
    value: "NEEDS_ATTENTION",
    label: "Needs Attention",
    tone: "danger",
    meaning: "Below expectations — needs focused support",
  },
];

export const TRENDS: Array<{
  value: SnapshotTrend;
  label: string;
  tone: SnapshotTone;
  meaning: string;
}> = [
  {
    value: "IMPROVING",
    label: "Improving",
    tone: "success",
    meaning: "Results have been getting better recently",
  },
  {
    value: "STABLE",
    label: "Stable",
    tone: "neutral",
    meaning: "No major change in results recently",
  },
  {
    value: "DECLINING",
    label: "Declining",
    tone: "danger",
    meaning: "Results have been getting worse recently",
  },
];

export function performanceLevel(value: SnapshotPerformanceLevel) {
  return PERFORMANCE_LEVELS.find((l) => l.value === value)!;
}

export function trendOption(value: SnapshotTrend) {
  return TRENDS.find((t) => t.value === value)!;
}

export function roleLabelFor(role: SnapshotSubjectRole) {
  return role === "SALES_SUPPORT_EXECUTIVE" ? "Sales Support Executive" : "Sales Executive";
}

/** "Apr 2026 – Oct 2026" for the 6-month window, otherwise "All available history". */
export function periodLabel(period: SnapshotPeriod | null | undefined): string {
  if (!period || period.kind === "ALL_HISTORY") return "All available history";
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  return `${fmt(period.start)} – ${fmt(period.end)}`;
}

export function periodHeadline(period: SnapshotPeriod | null | undefined): string {
  return !period || period.kind === "ALL_HISTORY" ? "All available history" : "Past 6 months";
}

export type SnapshotDraft = {
  overallPerformance: SnapshotPerformanceLevel | null;
  trend: SnapshotTrend | null;
  insights: string[];
  note: string;
  monthlySales: Array<{ month: string; salesAchieved: string }>;
  salesTarget: string;
  achievementPct: string;
};

export function emptySnapshotDraft(): SnapshotDraft {
  return {
    overallPerformance: null,
    trend: null,
    insights: [],
    note: "",
    monthlySales: Array.from({ length: 3 }, () => ({ month: "", salesAchieved: "" })),
    salesTarget: "",
    achievementPct: "",
  };
}

export type SnapshotPart = "performance" | "trend" | "insight" | "note" | "monthlySales";

/** Required parts still missing, in display order. */
export function snapshotMissingParts(
  draft: SnapshotDraft,
): Array<{ part: SnapshotPart; label: string }> {
  const missing: Array<{ part: SnapshotPart; label: string }> = [];
  if (!draft.overallPerformance) missing.push({ part: "performance", label: "Performance" });
  if (!draft.trend) missing.push({ part: "trend", label: "Trend" });
  if (draft.insights.length === 0) missing.push({ part: "insight", label: "Insight" });
  if (!draft.note.trim()) missing.push({ part: "note", label: "TL's note" });
  const monthlySales = draft.monthlySales.filter((entry) => entry.month || entry.salesAchieved);
  if (
    monthlySales.some((entry) => !entry.month || parseAmount(entry.salesAchieved) == null) ||
    new Set(monthlySales.map((entry) => entry.month)).size !== monthlySales.length
  ) {
    missing.push({ part: "monthlySales", label: "Monthly sales entry" });
  }
  return missing;
}

/** Labels of the required parts still missing, in display order. */
export function snapshotMissing(draft: SnapshotDraft): string[] {
  return snapshotMissingParts(draft).map((m) => m.label);
}

/** DOM id of one person's snapshot field, so a "missing" link can jump to it. */
export function snapshotFieldId(userId: string, part: SnapshotPart): string {
  return `snap-${userId}-${part}`;
}

/** Keeps only digits, commas and one decimal point (up to 2 decimals) while typing. */
export function sanitizeAmountInput(raw: string): string {
  const [whole = "", ...rest] = raw.replace(/[^0-9.,]/g, "").split(".");
  if (rest.length === 0) return whole;
  return `${whole}.${rest.join("").replace(/,/g, "").slice(0, 2)}`;
}

function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function draftMonthlySales(draft: SnapshotDraft): SnapshotMonthlySale[] {
  return draft.monthlySales.flatMap((entry) => {
    const salesAchieved = parseAmount(entry.salesAchieved);
    return entry.month && salesAchieved != null ? [{ month: entry.month, salesAchieved }] : [];
  });
}

function totalMonthlySales(draft: SnapshotDraft): number | null {
  const entries = draftMonthlySales(draft);
  return entries.length > 0
    ? Math.round(
        entries.reduce((total, entry) => total + entry.salesAchieved, 0) * 100,
      ) / 100
    : null;
}

/** Computed from sales ÷ target when both exist, otherwise the typed percentage. */
export function draftAchievement(draft: SnapshotDraft): number | null {
  const sales = totalMonthlySales(draft);
  const target = parseAmount(draft.salesTarget);
  if (sales != null && target) return Math.round((sales / target) * 10000) / 100;
  return parseAmount(draft.achievementPct);
}

export function isAchievementComputed(draft: SnapshotDraft): boolean {
  return totalMonthlySales(draft) != null && Boolean(parseAmount(draft.salesTarget));
}

export function toSnapshotFields(draft: SnapshotDraft): SnapshotFields {
  return {
    overallPerformance: draft.overallPerformance!,
    trend: draft.trend!,
    insights: draft.insights,
    note: draft.note.trim(),
    salesAchieved: totalMonthlySales(draft),
    salesTarget: parseAmount(draft.salesTarget),
    achievementPct: draftAchievement(draft),
    monthlySales: draftMonthlySales(draft),
  };
}

/** Shape shared by the review step and the Commando's read-only view. */
export type SnapshotSummary = {
  name: string;
  role: SnapshotSubjectRole;
  period: SnapshotPeriod | null;
  overallPerformance: SnapshotPerformanceLevel | null;
  trend: SnapshotTrend | null;
  insights: string[];
  note: string;
  salesAchieved: number | null;
  salesTarget: number | null;
  achievementPct: number | null;
  monthlySales: SnapshotMonthlySale[];
};

export function summaryFromDraft(
  subject: { name: string; role: SnapshotSubjectRole; period: SnapshotPeriod | null },
  draft: SnapshotDraft,
): SnapshotSummary {
  const fields = toSnapshotFields(draft);
  return {
    ...subject,
    overallPerformance: draft.overallPerformance,
    trend: draft.trend,
    insights: draft.insights,
    note: fields.note,
    salesAchieved: fields.salesAchieved ?? null,
    salesTarget: fields.salesTarget ?? null,
    achievementPct: fields.achievementPct ?? null,
    monthlySales: fields.monthlySales ?? [],
  };
}

export function summaryFromSnapshot(s: PerformanceSnapshot): SnapshotSummary {
  return {
    name: s.subjectName,
    role: s.subjectRole,
    period: s.period,
    overallPerformance: s.overallPerformance,
    trend: s.trend,
    insights: s.insights,
    note: s.note,
    salesAchieved: s.salesAchieved,
    salesTarget: s.salesTarget,
    achievementPct: s.achievementPct,
    monthlySales: s.monthlySales ?? [],
  };
}

export function monthLabel(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year!, monthNumber! - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export function snapshotMonths(period: SnapshotPeriod | null | undefined): string[] {
  const now = new Date();
  const start = period ? new Date(period.start) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
  const end = period ? new Date(period.end) : now;
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), 0, 1));
  const last = new Date(Date.UTC(end.getUTCFullYear(), 11, 1));
  const months: string[] = [];
  while (cursor <= last) {
    months.push(
      `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`,
    );
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
}

export function formatAmount(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const EVIDENCE_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  csv: "text/csv",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

export const EVIDENCE_ACCEPT = Object.keys(EVIDENCE_TYPES)
  .map((ext) => `.${ext}`)
  .join(",");

export const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;
export const MAX_EVIDENCE_FILES = 10;

/** Content type from the extension (browsers report CSV / Office types inconsistently). */
export function evidenceContentType(fileName: string): string | null {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return EVIDENCE_TYPES[ext] ?? null;
}

export function evidenceKind(fileName: string): "sheet" | "image" | "doc" {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "xlsx" || ext === "xls" || ext === "csv") return "sheet";
  if (ext === "jpg" || ext === "jpeg" || ext === "png") return "image";
  return "doc";
}
