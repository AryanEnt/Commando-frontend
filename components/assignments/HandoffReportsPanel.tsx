"use client";

import { useEffect, useState, type ReactNode } from "react";
import { api, errorMessage, type HandoffReport } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatAmount, roleLabelFor } from "@/lib/performance-snapshot";
import { EvidenceList } from "@/components/referrals/PerformanceSnapshot";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function salesLine(r: HandoffReport) {
  const parts: string[] = [];
  if (r.salesAchieved != null) parts.push(`Sales ${formatAmount(r.salesAchieved)}`);
  if (r.salesTarget != null) parts.push(`Target ${formatAmount(r.salesTarget)}`);
  if (r.achievementPct != null) parts.push(`${formatAmount(r.achievementPct)}% achieved`);
  return parts.join(" · ");
}

export function HandoffReportArticle({
  report,
  onOpenAttachment,
  context,
}: {
  report: HandoffReport;
  onOpenAttachment: (attachmentId: string) => void;
  context?: ReactNode;
}) {
  return (
    <article className="snap-summary" aria-label={`${report.subjectName} handoff report`}>
      <div>
        <p className="snap-name">{report.subjectName}</p>
        <p className="snap-role">{roleLabelFor(report.subjectRole)}</p>
        {context ? (
          <p className="mt-1 text-xs text-[var(--color-ink-muted)]">{context}</p>
        ) : null}
      </div>
      {salesLine(report) ? (
        <p className="m-0 text-sm font-medium tabular-nums">{salesLine(report)}</p>
      ) : null}
      <blockquote className="snap-quote whitespace-pre-wrap">{report.description}</blockquote>
      <EvidenceList
        files={report.attachments.map((a) => ({
          id: a.id,
          fileName: a.fileName,
          size: a.sizeBytes,
        }))}
        onOpen={onOpenAttachment}
      />
    </article>
  );
}

/** Commando's handoff reports for one assignment — Team Lead / Super Admin only. */
export function HandoffReportsPanel({ assignmentId }: { assignmentId: string }) {
  const { token } = useAuth();
  const [reports, setReports] = useState<HandoffReport[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api
      .getHandoffReports(token, assignmentId)
      .then((res) => {
        if (!cancelled) setReports(res.data.reports);
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, "Couldn't load the handoff report"));
      });
    return () => {
      cancelled = true;
    };
  }, [token, assignmentId]);

  async function open(attachmentId: string) {
    setError(null);
    try {
      const res = await api.getHandoffAttachmentUrl(token ?? "", assignmentId, attachmentId);
      window.open(res.data.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(errorMessage(err, "Couldn't open this document"));
    }
  }

  if (reports && reports.length === 0) return null;
  const author = reports?.[0]?.createdBy;

  return (
    <section className="surface space-y-4 p-4 sm:p-5" aria-labelledby="handoff-reports-title">
      <div>
        <h2 id="handoff-reports-title" className="text-base font-semibold tracking-tight">
          Commando handoff report
        </h2>
        <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">
          {author ? `From ${author.firstName} ${author.lastName}` : "From the Commando"}
          {reports?.[0]
            ? ` · ${formatDate(reports[0].period.start)} – ${formatDate(reports[0].period.end)}`
            : ""}
        </p>
      </div>
      {!reports && !error ? (
        <p className="m-0 text-sm text-[var(--color-ink-muted)]">Loading…</p>
      ) : null}
      {reports?.map((r) => (
        <HandoffReportArticle
          key={r.id}
          report={r}
          onOpenAttachment={(id) => void open(id)}
        />
      ))}
      {error ? (
        <p className="m-0 text-sm text-[var(--status-danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
