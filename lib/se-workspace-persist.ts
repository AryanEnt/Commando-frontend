/**
 * Keeps the active Sales Executive workspace sticky across related
 * entity routes (action items, daily logs, etc.) so contextual nav
 * does not dissolve when leaving /profiles/[id]/… briefly.
 */

const PROFILE_KEY = "seWorkspaceProfileId";
const SECTION_KEY = "seWorkspaceSection";

const RELATED_PREFIXES = [
  "/action-items",
  "/daily-logs",
  "/weekly-reviews",
  "/feedback",
  "/monitoring",
  "/eisenhower",
  "/swot",
  "/sync-evaluations",
  "/role-assignments",
  "/my-tasks",
] as const;

export function isSeRelatedPathname(pathname: string): boolean {
  return RELATED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function rememberSeWorkspace(
  profileId: string,
  section?: string | null,
) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PROFILE_KEY, profileId);
  if (section) sessionStorage.setItem(SECTION_KEY, section);
}

export function clearSeWorkspaceMemory() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PROFILE_KEY);
  sessionStorage.removeItem(SECTION_KEY);
}

export function readRememberedSeProfileId(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(PROFILE_KEY);
}

export function readRememberedSeSection(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(SECTION_KEY);
}

/** Map global entity routes back to an SE workspace section. */
export function seSectionFromRelatedPathname(
  pathname: string,
): string | null {
  if (pathname.startsWith("/action-items")) return "actions";
  if (pathname.startsWith("/daily-logs")) return "coaching";
  if (pathname.startsWith("/weekly-reviews")) return "reviews";
  if (pathname.startsWith("/feedback")) return "feedback";
  if (pathname.startsWith("/monitoring")) return "monitoring";
  if (pathname.startsWith("/eisenhower")) return "eisenhower";
  if (pathname.startsWith("/swot")) return "overview";
  if (
    pathname.startsWith("/sync-evaluations") ||
    pathname.startsWith("/role-assignments") ||
    pathname.startsWith("/my-tasks")
  ) {
    return "support";
  }
  return null;
}
