export type SwotPointDraft = {
  key: string;
  text: string;
  visible: boolean;
};

export type SwotPointView = {
  id: string;
  text: string;
  visible: boolean;
};

export function newSwotPointKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `p-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function emptySwotPoints(): SwotPointDraft[] {
  return [{ key: newSwotPointKey(), text: "", visible: false }];
}

export function pointsFromSwotField(
  points: SwotPointView[] | undefined,
  fallback: string | null | undefined,
): SwotPointDraft[] {
  if (points && points.length > 0) {
    return points.map((p) => ({
      key: p.id || newSwotPointKey(),
      text: p.text,
      visible: Boolean(p.visible),
    }));
  }
  const lines = String(fallback ?? "")
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/^\s*\d+[.)]\s*/, "")
        .replace(/^\s*[-*•]\s*/, "")
        .trim(),
    )
    .filter(Boolean);
  if (lines.length === 0) return emptySwotPoints();
  return lines.map((text) => ({
    key: newSwotPointKey(),
    text,
    visible: false,
  }));
}

export function formatSwotField(
  points: Array<{ text: string }> | undefined,
  fallback: string | null | undefined,
): string | null {
  if (points && points.length > 0) {
    return points.map((p, i) => `${i + 1}. ${p.text}`).join("\n");
  }
  if (fallback == null) return null;
  return fallback;
}
