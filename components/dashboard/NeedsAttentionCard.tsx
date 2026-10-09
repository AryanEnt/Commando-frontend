import Link from "next/link";
import { ArrowRight, CircleCheck, Target } from "lucide-react";
import { Avatar, ButtonLink, StatusPill } from "@/components/ui";
import {
  attentionCtaAriaLabel,
  attentionDetail,
  attentionExecutiveCount,
  toTitleCase,
  type AttentionItem,
} from "@/lib/attention";

function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * Team Lead triage card for Commando intervention requests. Expects `items`
 * already sorted most urgent first (see `buildAttentionItems`); only the first
 * row gets the primary CTA.
 */
export function NeedsAttentionCard({
  id = "se-attention",
  items,
  viewAllHref,
  now,
}: {
  id?: string;
  items: AttentionItem[];
  /** Link to the full request queue. */
  viewAllHref?: string;
  now?: Date;
}) {
  const headingId = `${id}-heading`;
  const executives = attentionExecutiveCount(items);

  return (
    <section id={id} aria-labelledby={headingId} className="attn-card">
      <header className="attn-head">
        <div className="min-w-0">
          <h2 id={headingId} className="attn-title">
            Needs your attention
          </h2>
          <p className="attn-subtitle">
            {items.length > 0
              ? `${plural(executives, "sales executive")} waiting on you`
              : "Nothing is waiting on you"}
          </p>
        </div>
        {items.length > 0 ? (
          <div className="attn-chips">
            <StatusPill tone="info" icon={<Target size={12} strokeWidth={2.25} aria-hidden />}>
              {plural(items.length, "intervention request")}
            </StatusPill>
          </div>
        ) : null}
      </header>

      {items.length === 0 ? (
        <div className="attn-empty">
          <CircleCheck size={18} strokeWidth={2} className="attn-empty-icon" aria-hidden />
          <div>
            <p className="attn-empty-title">You&apos;re all caught up</p>
            <p className="attn-empty-text">No intervention requests need your review right now.</p>
          </div>
        </div>
      ) : (
        <ul className="attn-list">
          {items.map((item, index) => {
            const name = toTitleCase(item.name);
            return (
              <li key={item.id} className="attn-row">
                <Avatar name={name} tone="neutral" />
                <div className="attn-main">
                  <p className="attn-line">
                    <Link href={`/profiles/${item.profileId}`} className="attn-name" title={name}>
                      {name}
                    </Link>
                    <span className="attn-tag">
                      <Target size={11} strokeWidth={2.25} aria-hidden />
                      Commando intervention
                    </span>
                  </p>
                  <p className="attn-detail">{attentionDetail(item, now)}</p>
                </div>
                <ButtonLink
                  href={item.href}
                  variant={index === 0 ? "primary" : "outline"}
                  size="sm"
                  className="attn-cta"
                  aria-label={attentionCtaAriaLabel(item)}
                >
                  Review
                  <ArrowRight size={14} aria-hidden />
                </ButtonLink>
              </li>
            );
          })}
        </ul>
      )}

      {viewAllHref && items.length > 0 ? (
        <footer className="attn-foot">
          <Link href={viewAllHref} className="attn-view-all">
            View all intervention requests
            <ArrowRight size={13} aria-hidden />
          </Link>
        </footer>
      ) : null}
    </section>
  );
}
