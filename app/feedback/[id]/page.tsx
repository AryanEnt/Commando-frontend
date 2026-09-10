"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, type FeedbackItem } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Avatar,
  DateTimeCell,
  ErrorState,
  LoadingState,
  PageHeader,
} from "@/components/ui";

export default function FeedbackDetailPage() {
  const { token } = useAuth();
  const params = useParams();
  const id = String(params.id);
  const [item, setItem] = useState<FeedbackItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !id) return;
    void (async () => {
      try {
        const res = await api.getFeedbackItem(token, id);
        setItem(res.data.feedback);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      }
    })();
  }, [token, id]);

  if (error) {
    return (
      <div className="space-y-2">
        <Link href="/feedback" className="text-sm text-slate-600 underline">
          ← Feedback
        </Link>
        <ErrorState message={error} />
      </div>
    );
  }

  if (!item) return <LoadingState />;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title={item.profile.displayName}
        description="Coaching feedback. This record is never overwritten."
      />
      <div className="flex items-start gap-3">
        <Avatar
          name={`${item.createdBy.firstName} ${item.createdBy.lastName}`}
          size="md"
        />
        <div>
          <p className="text-sm font-medium">
            {item.createdBy.firstName} {item.createdBy.lastName}
          </p>
          <p className="text-xs text-[var(--color-ink-muted)]">
            {item.createdBy.role.code.replaceAll("_", " ")} ·{" "}
            <DateTimeCell value={item.createdAt} />
          </p>
        </div>
        <StatusBadge status={item.source} />
      </div>
      <article className="surface p-4 text-sm leading-relaxed whitespace-pre-wrap">
        {item.body}
      </article>
    </div>
  );
}
