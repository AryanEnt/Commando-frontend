/** Monday–Sunday week helpers (UTC date-only, matches backend hub). */

export function parseYmd(ymd: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return new Date(NaN);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

export function toYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function mondayOfWeek(d: Date): Date {
  const utc = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  const day = utc.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  utc.setUTCDate(utc.getUTCDate() + diff);
  return utc;
}

export function shiftWeek(mondayYmd: string, weeks: number): string {
  const d = parseYmd(mondayYmd);
  d.setUTCDate(d.getUTCDate() + weeks * 7);
  return toYmd(mondayOfWeek(d));
}

export function currentWeekMondayYmd(): string {
  return toYmd(mondayOfWeek(new Date()));
}

export function formatWeekRangeLabel(startYmd: string, endYmd: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  };
  const yOpts: Intl.DateTimeFormatOptions = { ...opts, year: "numeric" };
  const a = parseYmd(startYmd).toLocaleDateString(undefined, opts);
  const b = parseYmd(endYmd).toLocaleDateString(undefined, yOpts);
  return `${a} – ${b}`;
}
