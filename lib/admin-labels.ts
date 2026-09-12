import { roleLabel } from "@/lib/labels";

/** Human-readable labels for audit / admin surfaces. */
export function humanizeCode(value: string | null | undefined): string {
  if (!value) return "—";
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatActorName(actor: {
  firstName: string;
  lastName: string;
  email?: string;
  roleCode?: string;
} | null): string {
  if (!actor) return "System";
  return `${actor.firstName} ${actor.lastName}`.trim() || actor.email || "Unknown";
}

export function formatActorMeta(actor: {
  email: string;
  roleCode: string;
} | null): string | null {
  if (!actor) return null;
  return `${roleLabel(actor.roleCode)} · ${actor.email}`;
}

export function metadataEntries(
  metadata: unknown,
): Array<{ key: string; value: string }> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return [];
  }
  return Object.entries(metadata as Record<string, unknown>).map(
    ([key, value]) => ({
      key: humanizeCode(key),
      value:
        value === null || value === undefined
          ? "—"
          : typeof value === "object"
            ? JSON.stringify(value)
            : String(value),
    }),
  );
}

export function pickBeforeAfter(metadata: unknown): {
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  rest: Record<string, unknown>;
} {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return { before: null, after: null, rest: {} };
  }
  const obj = { ...(metadata as Record<string, unknown>) };
  const before =
    obj.before && typeof obj.before === "object" && !Array.isArray(obj.before)
      ? (obj.before as Record<string, unknown>)
      : null;
  const after =
    obj.after && typeof obj.after === "object" && !Array.isArray(obj.after)
      ? (obj.after as Record<string, unknown>)
      : null;
  delete obj.before;
  delete obj.after;
  return { before, after, rest: obj };
}
