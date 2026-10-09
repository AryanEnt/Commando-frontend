import { usePathname } from "next/navigation";
import type { SwotItem } from "@/lib/api";
import { personName } from "@/lib/labels";

export function swotDetailHref(id: string, returnTo?: string | null): string {
  return returnTo
    ? `/swot/${id}?returnTo=${encodeURIComponent(returnTo)}`
    : `/swot/${id}`;
}

/** Links to a SWOT that bring the reader back to the page they opened it from. */
export function useSwotDetailHref(): (id: string) => string {
  const pathname = usePathname();
  return (id) => swotDetailHref(id, pathname);
}

/** Accept only in-app paths so a crafted link can't redirect off-site. */
export function safeReturnTo(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return null;
  }
  return value;
}

export function swotSubjectName(item: SwotItem): string {
  if (item.subject?.name?.trim()) return item.subject.name.trim();
  if (item.profile?.displayName?.trim()) return item.profile.displayName.trim();
  if (item.executiveUser) return personName(item.executiveUser);
  if (item.subjectUser) return personName(item.subjectUser);
  return "Unknown";
}

export function swotSubjectRoleLabel(item: SwotItem): string {
  if (
    item.subject?.type === "SALES_SUPPORT_EXECUTIVE" ||
    item.subject?.type === "EXECUTIVE" ||
    item.subjectType === "EXECUTIVE" ||
    item.executiveUserId ||
    item.subjectUserId ||
    item.source === "SALES_SUPPORT_EXECUTIVE"
  ) {
    if (
      item.executiveUser?.role?.code === "SALES_SUPPORT_EXECUTIVE" ||
      item.subjectUser?.role?.code === "SALES_SUPPORT_EXECUTIVE" ||
      item.source === "SALES_SUPPORT_EXECUTIVE" ||
      item.subject?.type === "SALES_SUPPORT_EXECUTIVE"
    ) {
      return "Sales Support Executive";
    }
    if (item.executiveUser?.role?.code === "SALES_EXECUTIVE") {
      return "Sales Executive";
    }
    return "Sales Support Executive";
  }
  return "Sales Executive";
}

/** User SWOT = about the person; Profile SWOT = about the profile sent for intervention. */
export function swotKindLabel(item: { subjectType?: string | null }): string {
  return item.subjectType === "PROFILE" ? "Profile SWOT" : "User SWOT";
}

/** How much of a Team Lead / Commando User SWOT the subject executive can see. */
export function swotShareLabel(item: SwotItem): string {
  const groups = [
    item.strengthPoints,
    item.weaknessPoints,
    item.opportunityPoints,
    item.threatPoints,
  ];
  const hasPoints = groups.some((g) => g && g.length > 0);
  if (hasPoints) {
    const total = groups.reduce((n, g) => n + (g?.length ?? 0), 0);
    const shared = groups.reduce(
      (n, g) => n + (g?.filter((p) => p.visible).length ?? 0),
      0,
    );
    if (shared === 0) return "Hidden from SE";
    if (shared === total) return "All points shared";
    return `${shared}/${total} points shared`;
  }
  const n = [
    item.visibleStrength,
    item.visibleWeakness,
    item.visibleOpportunity,
    item.visibleThreat,
  ].filter(Boolean).length;
  if (n === 0) return "Hidden from SE";
  if (n === 4) return "All points shared";
  return `${n}/4 boxes shared`;
}

export function isSelfSwotSource(source: string): boolean {
  return source === "SALES_EXECUTIVE" || source === "SALES_SUPPORT_EXECUTIVE";
}

/** Newest version first (by version number, then creation time). */
export function swotNewestFirst(
  a: { versionNumber?: number | null; createdAt: string },
  b: { versionNumber?: number | null; createdAt: string },
): number {
  const av = a.versionNumber ?? 0;
  const bv = b.versionNumber ?? 0;
  if (bv !== av) return bv - av;
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export function swotSourceLabel(source: SwotItem["source"] | string): string {
  if (source === "TEAM_LEAD") return "Team Lead";
  if (source === "COMMANDO") return "Commando";
  if (source === "SALES_SUPPORT_EXECUTIVE") return "Self";
  if (source === "SALES_EXECUTIVE") return "Self";
  return source;
}
