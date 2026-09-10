"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, type SyncSupportLink } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { ProfileSearchSelect } from "@/components/ProfileSearchSelect";
import { SearchableSelect } from "@/components/SearchableSelect";
import {
  Button,
  ErrorState,
  TextArea,
} from "@/components/ui";

export default function NewSyncEvaluationPage() {
  const { token, hasPermission } = useAuth();
  const { pushToast } = useToast();
  const router = useRouter();
  const [profileId, setProfileId] = useState("");
  const [links, setLinks] = useState<SyncSupportLink[]>([]);
  const [salesSupportUserId, setSalesSupportUserId] = useState("");
  const [issue, setIssue] = useState("");
  const [recommendedAction, setRecommendedAction] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!token || !profileId) {
        setLinks([]);
        setSalesSupportUserId("");
        return;
      }
      try {
        const res = await api.getSyncEvaluationSupportLinks(token, profileId);
        if (!cancelled) {
          setLinks(res.data.links);
          setSalesSupportUserId(res.data.links[0]?.salesSupportUserId ?? "");
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setLinks([]);
          setSalesSupportUserId("");
          setError(
            err instanceof Error ? err.message : "Failed to load support links",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, profileId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.createSyncEvaluation(token, {
        salesExecutiveProfileId: profileId,
        salesSupportUserId,
        issue,
        recommendedAction,
      });
      pushToast("Sync evaluation saved", "success");
      router.push(`/sync-evaluations/${res.data.evaluation.id}`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to create";
      setError(msg);
      pushToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!hasPermission("SYNC_EVAL_CREATE")) {
    return (
      <ErrorState message="You do not have permission to create sync evaluations." />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/sync-evaluations"
          className="text-sm text-slate-600 underline"
        >
          ← Sync Evaluations
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          New sync evaluation
        </h1>
        <p className="text-sm text-slate-600">
          Records a historical evaluation against an active Sales Executive ↔
          Sales Support relationship.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded border border-slate-200 bg-white p-4"
      >
        <ProfileSearchSelect value={profileId} onChange={setProfileId} />

        <SearchableSelect
          label="Sales Support Executive"
          value={salesSupportUserId}
          onChange={setSalesSupportUserId}
          placeholder={
            !profileId
              ? "Select a profile first…"
              : links.length === 0
                ? "No active support link"
                : "Select sales support…"
          }
          allowClear={false}
          disabled={!profileId || links.length === 0}
          options={links.map((link) => ({
            value: link.salesSupportUserId,
            label: `${link.supportUser.firstName} ${link.supportUser.lastName}`,
            hint: link.supportUser.email,
          }))}
        />

        <TextArea
          label="Issue"
          required
          rows={4}
          value={issue}
          onChange={(e) => setIssue(e.target.value)}
        />

        <TextArea
          label="Recommended action"
          required
          rows={4}
          value={recommendedAction}
          onChange={(e) => setRecommendedAction(e.target.value)}
        />

        {error && <ErrorState message={error} />}

        <Button type="submit" disabled={submitting || !salesSupportUserId}>
          {submitting ? "Saving…" : "Save evaluation"}
        </Button>
      </form>
    </div>
  );
}
