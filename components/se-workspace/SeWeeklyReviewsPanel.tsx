"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  ClipboardList,
  FileText,
  Sparkles,
  X,
} from "lucide-react";
import {
  api,
  type ActionItem,
  type WeeklyReview,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/dates";
import { personName } from "@/lib/labels";
import { seWorkspaceHref } from "@/lib/se-workspace-nav";
import {
  currentWeekMondayYmd,
  formatWeekRangeLabel,
  parseYmd,
  toYmd,
} from "@/lib/week";
import { StatusBadge } from "@/components/StatusBadge";
import { Avatar, Button } from "@/components/ui";

type Props = {
  profileId: string;
  profileName: string;
  history: WeeklyReview[];
  onSign?: (id: string) => void;
  signingReviewId?: string | null;
  onRefresh?: () => void;
};

type SortOrder = "newest" | "oldest";

const HISTORY_PAGE_SIZE = 5;

function weekStartYmd(iso: string) {
  try {
    return toYmd(parseYmd(iso.slice(0, 10)));
  } catch {
    return iso.slice(0, 10);
  }
}

function sundayFromMonday(mondayYmd: string) {
  const d = parseYmd(mondayYmd);
  d.setUTCDate(d.getUTCDate() + 6);
  return toYmd(d);
}

function weekRangeForReview(review: WeeklyReview) {
  const start = weekStartYmd(review.weekStartDate);
  return formatWeekRangeLabel(start, sundayFromMonday(start));
}

function focusLine(review: WeeklyReview, max = 140) {
  const text = review.performanceSummary.trim();
  if (!text) return null;
  const first = text.split(/\n+/)[0]?.trim() ?? text;
  return first.length > max ? `${first.slice(0, max - 3)}…` : first;
}

function reviewSortKey(r: WeeklyReview) {
  return new Date(
    r.weekStartDate || r.meetingDate || r.submittedAt || r.createdAt,
  ).getTime();
}

function actionsForReview(all: ActionItem[], reviewId: string) {
  return all.filter((a) => a.weeklyReviewId === reviewId);
}

function actionProgress(items: ActionItem[]) {
  const tracked = items.filter((a) => a.status !== "CANCELLED");
  const done = tracked.filter((a) => a.status === "COMPLETED").length;
  return { done, total: tracked.length, items: tracked };
}

function ReviewStatusBadge({
  review,
  awaiting,
}: {
  review?: WeeklyReview | null;
  awaiting?: boolean;
}) {
  if (awaiting || !review) {
    return <StatusBadge status="PENDING" label="Awaiting Review" />;
  }
  if (review.salesExecutiveSigned || review.signed) {
    return <StatusBadge status="SIGNED" label="Signed" />;
  }
  if (review.status === "SUBMITTED") {
    return <StatusBadge status="COMPLETED" label="Completed" />;
  }
  return <StatusBadge status={review.status} />;
}

function ActionProgressBlock({
  items,
  expanded,
  hideLabel,
}: {
  items: ActionItem[];
  expanded?: boolean;
  hideLabel?: boolean;
}) {
  const { done, total, items: tracked } = actionProgress(items);
  if (total === 0) return null;
  const pct = Math.round((done / total) * 100);

  return (
    <div className="srv-actions">
      {!hideLabel ? (
        <div className="srv-actions-head">
          <p className="srv-section-label">Next-week actions</p>
          <p className="srv-actions-count">
            {done} / {total} completed
          </p>
        </div>
      ) : (
        <div className="srv-actions-head">
          <p className="srv-actions-count">
            {done} / {total} completed
          </p>
        </div>
      )}
      <div
        className="srv-progress"
        role="progressbar"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${done} of ${total} actions completed`}
      >
        <span style={{ width: `${pct}%` }} />
      </div>
      {expanded ? (
        <ul className="srv-action-list">
          {tracked.map((a) => {
            const doneItem = a.status === "COMPLETED";
            return (
              <li
                key={a.id}
                className={`srv-action-item${doneItem ? " is-done" : ""}`}
              >
                {doneItem ? (
                  <CheckCircle2 size={15} aria-hidden />
                ) : (
                  <Circle size={15} aria-hidden />
                )}
                <span>{a.title}</span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function DetailSection({
  label,
  tone,
  children,
}: {
  label: string;
  tone?: "focus" | "well" | "improve" | "neutral";
  children: ReactNode;
}) {
  return (
    <section className={`srv-detail-block${tone ? ` is-${tone}` : ""}`}>
      <h4 className="srv-section-label">{label}</h4>
      <div className="srv-detail-block-body">{children}</div>
    </section>
  );
}

function MinutesLink({
  reviewId,
  fileName,
}: {
  reviewId: string;
  fileName: string;
}) {
  const { token } = useAuth();
  const [busy, setBusy] = useState(false);

  async function openMinutes() {
    if (!token || busy) return;
    setBusy(true);
    try {
      const res = await api.getWeeklyReviewMinutesUrl(token, reviewId);
      window.open(res.data.url, "_blank", "noopener,noreferrer");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className="srv-minutes"
      onClick={() => void openMinutes()}
      disabled={busy}
    >
      <FileText size={15} aria-hidden />
      <span>{busy ? "Opening…" : "View meeting minutes"}</span>
      <span className="srv-minutes-name">{fileName}</span>
    </button>
  );
}

function ReviewDetailBody({
  review,
  actions,
  returnTo,
  onSign,
  signing,
  compact,
}: {
  review: WeeklyReview;
  actions: ActionItem[];
  returnTo: string;
  onSign?: (id: string) => void;
  signing?: boolean;
  compact?: boolean;
}) {
  const author = review.commando ?? review.createdBy;
  const summary = review.performanceSummary.trim();
  const well = review.whatWentWell.trim();
  const improve = review.improvement.trim();
  const needsSign =
    review.status === "SUBMITTED" &&
    !review.salesExecutiveSigned &&
    !review.signed;
  const meetingBits = [
    review.roomName?.trim(),
    review.meetingTime?.trim(),
  ].filter(Boolean);

  return (
    <div className={`srv-detail${compact ? " is-compact" : ""}`}>
      <div className="srv-detail-hero">
        <div className="srv-detail-hero-top">
          <div className="srv-detail-who">
            <Avatar name={personName(author)} size="md" />
            <div className="min-w-0">
              <p className="srv-detail-kicker">Commando review</p>
              <p className="srv-detail-name">{personName(author)}</p>
              <p className="srv-detail-sub">
                Reviewed {formatDate(review.meetingDate || review.submittedAt)}
              </p>
            </div>
          </div>
          <ReviewStatusBadge review={review} />
        </div>
        <dl className="srv-detail-facts">
          <div>
            <dt>Week</dt>
            <dd>{weekRangeForReview(review)}</dd>
          </div>
          <div>
            <dt>Review date</dt>
            <dd>{formatDate(review.meetingDate || review.submittedAt)}</dd>
          </div>
          {meetingBits.length > 0 ? (
            <div>
              <dt>Meeting</dt>
              <dd>{meetingBits.join(" · ")}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      {summary ? (
        <DetailSection label="Focus" tone="focus">
          <p className="srv-narrative-body">{summary}</p>
        </DetailSection>
      ) : null}

      {well ? (
        <DetailSection label="What went well" tone="well">
          <p className="srv-narrative-body">{well}</p>
        </DetailSection>
      ) : null}

      {improve ? (
        <DetailSection label="Areas to improve" tone="improve">
          <p className="srv-narrative-body">{improve}</p>
        </DetailSection>
      ) : null}

      <DetailSection label="Next-week actions" tone="neutral">
        <ActionProgressBlock items={actions} expanded hideLabel />
        {actionProgress(actions).total === 0 ? (
          <p className="srv-detail-empty">No actions linked to this review.</p>
        ) : null}
      </DetailSection>

      {review.meetingMinutes ? (
        <DetailSection label="Meeting minutes">
          <MinutesLink
            reviewId={review.id}
            fileName={review.meetingMinutes.fileName}
          />
        </DetailSection>
      ) : null}

      <div className="srv-detail-footer">
        <Link
          href={`/weekly-reviews/${review.id}?returnTo=${encodeURIComponent(returnTo)}`}
          className="srv-link"
        >
          Open full page
          <ChevronRight size={14} aria-hidden />
        </Link>
        {needsSign && onSign ? (
          <Button
            type="button"
            size="sm"
            disabled={signing}
            onClick={() => onSign(review.id)}
          >
            {signing ? "Signing…" : "Sign this review"}
          </Button>
        ) : review.salesExecutiveSigned || review.signed ? (
          <p className="srv-signed-note">You signed this review</p>
        ) : null}
      </div>
    </div>
  );
}

function ReviewDetailSheet({
  open,
  review,
  profileName,
  actions,
  returnTo,
  onClose,
  onSign,
  signing,
}: {
  open: boolean;
  review: WeeklyReview | null;
  profileName: string;
  actions: ActionItem[];
  returnTo: string;
  onClose: () => void;
  onSign?: (id: string) => void;
  signing?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !review) return null;

  return (
    <div className="srv-sheet">
      <button
        type="button"
        className="srv-sheet-backdrop"
        aria-label="Close review"
        onClick={onClose}
      />
      <aside
        className="srv-sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="srv-sheet-title"
      >
        <header className="srv-sheet-head">
          <div className="min-w-0">
            <p className="srv-sheet-eyebrow">Weekly review</p>
            <h2 id="srv-sheet-title" className="srv-sheet-title">
              {review.weekLabel || `Week of ${weekRangeForReview(review)}`}
            </h2>
            <p className="srv-sheet-desc">
              {profileName} · Week of {weekRangeForReview(review)}
            </p>
          </div>
          <button
            type="button"
            className="srv-sheet-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>
        <div className="srv-sheet-body">
          <ReviewDetailBody
            review={review}
            actions={actions}
            returnTo={returnTo}
            onSign={onSign}
            signing={signing}
          />
        </div>
      </aside>
    </div>
  );
}

export function SeWeeklyReviewsPanel({
  profileId,
  profileName,
  history,
  onSign,
  signingReviewId,
  onRefresh,
}: Props) {
  const { token } = useAuth();
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [actionsLoading, setActionsLoading] = useState(true);
  const [sheetReview, setSheetReview] = useState<WeeklyReview | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [page, setPage] = useState(1);

  const weekStart = currentWeekMondayYmd();
  const weekRangeLabel = formatWeekRangeLabel(
    weekStart,
    sundayFromMonday(weekStart),
  );
  const returnTo = seWorkspaceHref(profileId, "reviews");

  const reviews = useMemo(
    () => history.filter((r) => Boolean(r.commandoUserId)),
    [history],
  );

  const loadActions = useCallback(async () => {
    if (!token) return;
    setActionsLoading(true);
    try {
      const res = await api.getActionItems(token, {
        profileId,
        view: "all",
        pageSize: 100,
      });
      setActions(res.data.actionItems);
    } catch {
      setActions([]);
    } finally {
      setActionsLoading(false);
    }
  }, [token, profileId]);

  useEffect(() => {
    void loadActions();
  }, [loadActions]);

  const thisWeekReview = useMemo(
    () =>
      reviews.find((r) => weekStartYmd(r.weekStartDate) === weekStart) ?? null,
    [reviews, weekStart],
  );

  const previous = useMemo(() => {
    const list = reviews.filter(
      (r) => weekStartYmd(r.weekStartDate) !== weekStart,
    );
    list.sort((a, b) => {
      const diff = reviewSortKey(b) - reviewSortKey(a);
      return sortOrder === "newest" ? diff : -diff;
    });
    return list;
  }, [reviews, weekStart, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(previous.length / HISTORY_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * HISTORY_PAGE_SIZE;
  const pageItems = previous.slice(pageStart, pageStart + HISTORY_PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [sortOrder, previous.length]);

  const latestDate = useMemo(() => {
    if (reviews.length === 0) return null;
    const sorted = [...reviews].sort(
      (a, b) => reviewSortKey(b) - reviewSortKey(a),
    );
    return sorted[0]?.meetingDate || sorted[0]?.submittedAt || null;
  }, [reviews]);

  function openReview(review: WeeklyReview) {
    setSheetReview(review);
  }

  return (
    <div className="srv-page">
      <header className="srv-header">
        <div className="srv-title-badge" aria-hidden>
          <ClipboardList size={16} strokeWidth={2} />
        </div>
        <h1 className="srv-title">Weekly Reviews</h1>
        <p className="srv-subtitle">
          Your weekly performance reviews from Commando
        </p>
      </header>

      <div className="srv-summary" aria-label="Review summary">
        <div className="srv-metric">
          <span className="srv-metric-label">Current Week</span>
          <span className="srv-metric-value">Week of {weekRangeLabel}</span>
        </div>
        <div className="srv-metric">
          <span className="srv-metric-label">Reviews Completed</span>
          <span className="srv-metric-value">{reviews.length}</span>
        </div>
        <div className="srv-metric">
          <span className="srv-metric-label">Latest Review</span>
          <span className="srv-metric-value">
            {latestDate ? formatDate(latestDate) : "—"}
          </span>
        </div>
      </div>

      <section className="srv-section" aria-labelledby="srv-this-week">
        <div className="srv-section-head">
          <h2 id="srv-this-week" className="srv-section-title">
            This Week
          </h2>
          <p className="srv-section-meta">Week of {weekRangeLabel}</p>
        </div>

        {thisWeekReview ? (
          <article className="srv-card srv-card-featured">
            <div className="srv-card-top">
              <div>
                <p className="srv-card-kicker">Weekly Review</p>
                <p className="srv-card-date">
                  {formatDate(
                    thisWeekReview.meetingDate || thisWeekReview.submittedAt,
                  )}
                </p>
                <p className="srv-card-author">
                  {personName(
                    thisWeekReview.commando ?? thisWeekReview.createdBy,
                  )}
                </p>
              </div>
              <ReviewStatusBadge review={thisWeekReview} />
            </div>

            {focusLine(thisWeekReview) ? (
              <div className="srv-card-focus">
                <p className="srv-section-label">Focus</p>
                <p className="srv-card-focus-text">
                  {focusLine(thisWeekReview)}
                </p>
              </div>
            ) : null}

            <div className="srv-card-preview">
              {thisWeekReview.whatWentWell.trim() ? (
                <div>
                  <p className="srv-section-label">What went well</p>
                  <p className="srv-preview-text">
                    {focusLine(
                      {
                        ...thisWeekReview,
                        performanceSummary: thisWeekReview.whatWentWell,
                      },
                      160,
                    )}
                  </p>
                </div>
              ) : null}
              {thisWeekReview.improvement.trim() ? (
                <div>
                  <p className="srv-section-label">Areas to improve</p>
                  <p className="srv-preview-text">
                    {focusLine(
                      {
                        ...thisWeekReview,
                        performanceSummary: thisWeekReview.improvement,
                      },
                      160,
                    )}
                  </p>
                </div>
              ) : null}
              {!actionsLoading ? (
                <ActionProgressBlock
                  items={actionsForReview(actions, thisWeekReview.id)}
                />
              ) : null}
            </div>

            <div className="srv-card-actions">
              <button
                type="button"
                className="srv-view-btn"
                onClick={() => openReview(thisWeekReview)}
              >
                View full review
                <ChevronRight size={15} aria-hidden />
              </button>
            </div>
          </article>
        ) : (
          <div className="srv-awaiting">
            <div className="srv-awaiting-icon" aria-hidden>
              <Sparkles size={18} strokeWidth={2} />
            </div>
            <div className="srv-awaiting-copy">
              <p className="srv-awaiting-kicker">This week</p>
              <p className="srv-awaiting-week">Week of {weekRangeLabel}</p>
              <h3 className="srv-awaiting-title">No review this week yet</h3>
              <p className="srv-awaiting-desc">
                Your Commando has not submitted a weekly review for this week.
              </p>
            </div>
            <ReviewStatusBadge awaiting />
          </div>
        )}
      </section>

      <section className="srv-section" aria-labelledby="srv-previous">
        <div className="srv-section-head srv-section-head-tools">
          <div>
            <h2 id="srv-previous" className="srv-section-title">
              Previous Reviews
            </h2>
            <p className="srv-section-meta">
              {previous.length === 0
                ? "History appears here as reviews are completed"
                : `${previous.length} review${previous.length === 1 ? "" : "s"}`}
            </p>
          </div>

          {previous.length > 0 ? (
            <div
              className="srv-toolbar"
              role="group"
              aria-label="History filters"
            >
              <button
                type="button"
                className={`srv-sort${sortOrder === "newest" ? " is-active" : ""}`}
                onClick={() => setSortOrder("newest")}
              >
                <ArrowDownWideNarrow size={14} aria-hidden />
                Latest first
              </button>
              <button
                type="button"
                className={`srv-sort${sortOrder === "oldest" ? " is-active" : ""}`}
                onClick={() => setSortOrder("oldest")}
              >
                <ArrowUpWideNarrow size={14} aria-hidden />
                Oldest first
              </button>
            </div>
          ) : null}
        </div>

        {previous.length === 0 ? (
          <div className="srv-empty-history">
            <p className="srv-empty-title">No previous reviews</p>
            <p className="srv-empty-desc">
              Your previous Commando weekly reviews will appear here as they are
              completed.
            </p>
          </div>
        ) : (
          <>
            <ol className="srv-timeline">
              {pageItems.map((review, index) => {
                const author = review.commando ?? review.createdBy;
                const focus = focusLine(review);
                const prog = actionProgress(
                  actionsForReview(actions, review.id),
                );
                const isLast = index === pageItems.length - 1;
                return (
                  <li key={review.id} className="srv-timeline-item">
                    <div className="srv-timeline-rail" aria-hidden>
                      <span className="srv-timeline-dot" />
                      {!isLast ? <span className="srv-timeline-line" /> : null}
                    </div>
                    <article className="srv-card srv-card-compact">
                      <div className="srv-card-top">
                        <div>
                          <p className="srv-card-kicker">
                            {review.weekLabel ||
                              `Week of ${weekRangeForReview(review)}`}
                          </p>
                          <p className="srv-card-date">
                            {weekRangeForReview(review)}
                          </p>
                          <p className="srv-card-author">
                            {personName(author)}
                          </p>
                        </div>
                        <ReviewStatusBadge review={review} />
                      </div>
                      {focus ? (
                        <p className="srv-compact-focus">
                          <span>Focus:</span> {focus}
                        </p>
                      ) : null}
                      {prog.total > 0 ? (
                        <p className="srv-compact-actions">
                          {prog.done} of {prog.total} actions completed
                        </p>
                      ) : null}
                      <button
                        type="button"
                        className="srv-view-btn"
                        onClick={() => openReview(review)}
                      >
                        View review
                        <ChevronRight size={15} aria-hidden />
                      </button>
                    </article>
                  </li>
                );
              })}
            </ol>

            {totalPages > 1 ? (
              <div className="srv-pager" aria-label="History pagination">
                <button
                  type="button"
                  className="srv-pager-btn"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft size={15} aria-hidden />
                  Previous
                </button>
                <p className="srv-pager-status">
                  Page {safePage} of {totalPages}
                  <span>
                    · {pageStart + 1}–
                    {Math.min(pageStart + HISTORY_PAGE_SIZE, previous.length)} of{" "}
                    {previous.length}
                  </span>
                </p>
                <button
                  type="button"
                  className="srv-pager-btn"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                  <ChevronRight size={15} aria-hidden />
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>

      <ReviewDetailSheet
        open={Boolean(sheetReview)}
        review={sheetReview}
        profileName={profileName}
        actions={
          sheetReview ? actionsForReview(actions, sheetReview.id) : []
        }
        returnTo={returnTo}
        onClose={() => setSheetReview(null)}
        onSign={(id) => {
          onSign?.(id);
          onRefresh?.();
        }}
        signing={
          sheetReview ? signingReviewId === sheetReview.id : false
        }
      />
    </div>
  );
}
