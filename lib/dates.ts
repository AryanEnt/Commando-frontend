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

/** Date on first line, time on second — for dense tables. */
export function formatDateTimeParts(value: string | Date | null | undefined): {
  date: string;
  time: string;
} {
  return { date: formatDate(value), time: formatTime(value) };
}
