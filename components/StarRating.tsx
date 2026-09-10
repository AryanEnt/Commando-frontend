"use client";

function StarRating({ value }: { value: number | null }) {
  if (value == null) {
    return <span className="text-slate-400">—</span>;
  }
  const filled = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <span
      className="inline-flex items-center gap-0.5 text-amber-500"
      title={`${value.toFixed(2)} / 5`}
      aria-label={`${value.toFixed(2)} out of 5`}
    >
      {"★★★★★".slice(0, filled)}
      <span className="text-slate-300">{"★★★★★".slice(filled)}</span>
      <span className="ml-1 text-xs text-slate-600">{value.toFixed(1)}</span>
    </span>
  );
}

export { StarRating };
