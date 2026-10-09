import type { Referral } from "@/lib/api";
import { personName } from "@/lib/labels";

/** One Commando intervention request in the Team Lead "Needs your attention" card. */
export type AttentionItem = {
  id: string;
  profileId: string;
  name: string;
  href: string;
  requestedAt: string;
  requesterName: string | null;
};

const DAY_MS = 86_400_000;

/** Display-only casing: "kapil Sapkota" → "Kapil Sapkota". */
export function toTitleCase(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase()
    .replace(/(^|[\s\-'])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toLocaleUpperCase());
}

const RELATIVE_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 365 * DAY_MS],
  ["month", 30 * DAY_MS],
  ["week", 7 * DAY_MS],
  ["day", DAY_MS],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

const relativeFormat = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "2 days ago", "yesterday", "3 hours ago"; under a minute is "just now". */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = then - now.getTime();
  for (const [unit, ms] of RELATIVE_UNITS) {
    if (Math.abs(diff) >= ms) {
      return relativeFormat.format(Math.round(diff / ms), unit);
    }
  }
  return "just now";
}

/** Second line of a row, in sentence case. */
export function attentionDetail(item: AttentionItem, now: Date = new Date()): string {
  const when = formatRelativeTime(item.requestedAt, now);
  return item.requesterName
    ? `Requested by ${toTitleCase(item.requesterName)}, ${when}`
    : `Commando requested an intervention, ${when}`;
}

export function attentionCtaAriaLabel(item: AttentionItem): string {
  return `Review intervention request for ${toTitleCase(item.name)}`;
}

/** Most urgent first: the oldest request leads. */
export function sortAttentionItems(items: AttentionItem[]): AttentionItem[] {
  const time = (iso: string) => new Date(iso).getTime() || 0;
  return [...items].sort(
    (a, b) => time(a.requestedAt) - time(b.requestedAt) || a.name.localeCompare(b.name),
  );
}

/** One row per pending request, oldest first. */
export function buildAttentionItems(pendingRequests: Referral[]): AttentionItem[] {
  return sortAttentionItems(
    pendingRequests.map((r) => {
      const requester = r.commando ? personName(r.commando) : "";
      return {
        id: `request-${r.id}`,
        profileId: r.salesExecutiveProfileId,
        name: r.profile?.displayName || r.profileName,
        href: `/referrals/${r.id}`,
        requestedAt: r.createdAt,
        requesterName: requester && requester !== "—" ? requester : null,
      };
    }),
  );
}

/** Distinct executives across rows (one executive can have several requests). */
export function attentionExecutiveCount(items: AttentionItem[]): number {
  return new Set(items.map((i) => i.profileId)).size;
}
