import { ArrowUpRight } from "lucide-react";

export function Brand() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="auth-brand-mark" aria-hidden>
        C
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-[var(--color-ink)]">
        Commando
      </span>
    </span>
  );
}

function TeamPerformanceWidget() {
  return (
    <div className="auth-widget" data-slot="team">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="auth-widget-label">Team performance</p>
          <p className="auth-widget-value mt-1.5">+18.4%</p>
        </div>
        <span className="auth-widget-chip">90 days</span>
      </div>
      <svg
        className="mt-3 block h-14 w-full"
        viewBox="0 0 220 56"
        preserveAspectRatio="none"
        fill="none"
        aria-hidden
        focusable="false"
      >
        <defs>
          <linearGradient id="auth-spark-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-brand)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0 46 C 18 44, 30 40, 46 41 S 74 34, 90 35 S 116 26, 132 28 S 160 18, 176 16 S 204 8, 220 6 L 220 56 L 0 56 Z"
          fill="url(#auth-spark-fill)"
        />
        <path
          d="M0 46 C 18 44, 30 40, 46 41 S 74 34, 90 35 S 116 26, 132 28 S 160 18, 176 16 S 204 8, 220 6"
          stroke="var(--color-brand)"
          strokeWidth="1.75"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

const HEALTH = [
  { label: "Performance", value: 84 },
  { label: "Activity", value: 72 },
  { label: "Pipeline", value: 91 },
];

function ExecutiveHealthWidget() {
  return (
    <div className="auth-widget" data-slot="health">
      <div className="flex items-center justify-between gap-3">
        <p className="auth-widget-label">Executive health</p>
        <span className="auth-widget-chip">This week</span>
      </div>
      <ul className="mt-4 space-y-3.5">
        {HEALTH.map((row) => (
          <li key={row.label}>
            <div className="flex items-baseline justify-between text-[12.5px]">
              <span className="text-[var(--color-ink)]">{row.label}</span>
              <span className="font-semibold tabular-nums text-[var(--color-ink)]">
                {row.value}%
              </span>
            </div>
            <div className="auth-bar mt-1.5">
              <span style={{ width: `${row.value}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CoachingImpactWidget() {
  return (
    <div className="auth-widget" data-slot="impact">
      <p className="auth-widget-label">Coaching impact</p>
      <div className="mt-1.5 flex items-center gap-2">
        <p className="auth-widget-value">+24%</p>
        <span className="auth-trend-badge" aria-hidden>
          <ArrowUpRight size={14} strokeWidth={2} />
        </span>
      </div>
      <p className="mt-1 text-[12px] text-[var(--color-ink-muted)]">
        Performance improvement
      </p>
    </div>
  );
}

/** Decorative product preview for the sign-in page; not real data. */
export function PerformanceVisual() {
  return (
    <div className="auth-visual" aria-hidden>
      <TeamPerformanceWidget />
      <ExecutiveHealthWidget />
      <CoachingImpactWidget />
    </div>
  );
}
