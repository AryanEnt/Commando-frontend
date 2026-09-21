/** Display dates and times distinctly for coaching records. */

const dateOpts: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
};

const timeOpts: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
};

const dateTimeOpts: Intl.DateTimeFormatOptions = {
  ...dateOpts,
  ...timeOpts,
};

/** Local calendar date for date inputs (YYYY-MM-DD). */
export function toLocalDateInput(value?: string | Date | null): string {
  const d = value
    ? typeof value === "string"
      ? new Date(value)
      : value
    : new Date();
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Local time for time inputs (HH:mm). */
export function toLocalTimeInput(value?: string | Date | null): string {
  const d = value
    ? typeof value === "string"
      ? new Date(value)
      : value
    : new Date();
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Combine local date + time inputs into an ISO timestamp. */
export function combineLocalDateTime(date: string, time: string): string {
  const isoLocal = `${date}T${time.length === 5 ? `${time}:00` : time}`;
  const d = new Date(isoLocal);
  if (Number.isNaN(d.getTime())) {
    throw new Error("Invalid date or time");
  }
  return d.toISOString();
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, dateOpts);
}

export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(undefined, timeOpts);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, dateTimeOpts);
}

/**
 * Minimalist timestamp for assignments and events: "Sep 17, 2026 · 14:30"
 * Uses the viewer's local timezone.
 */
export function formatWhen(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  const date = d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const time = d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} · ${time}`;
}

/**
 * Assignment due label. Always includes time when a due timestamp exists
 * (e.g. "Sep 18, 2026 · 1:00 PM") so timed deadlines are clear.
 */
export function formatDue(value: string | Date | null | undefined): string {
  return formatWhen(value);
}

/** Build ISO due from date (+ optional time). Date-only defaults to 23:59 local. */
export function dueIsoFromInputs(
  date: string,
  time?: string | null,
): string | null {
  const d = date.trim();
  if (!d) return null;
  const t = (time ?? "").trim();
  return combineLocalDateTime(d, t || "23:59");
}

/** Date on first line, time on second — for dense tables. */
export function formatDateTimeParts(value: string | Date | null | undefined): {
  date: string;
  time: string;
} {
  if (!value) return { date: "—", time: "" };
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return { date: "—", time: "" };
  return {
    date: d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    time: d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}
