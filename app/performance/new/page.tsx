"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ProfileSearchSelect } from "@/components/ProfileSearchSelect";
import {
  Button,
  ErrorState,
  TextArea,
  TextInput,
} from "@/components/ui";

type ScoreRow = {
  metricCode: string;
  metricLabel: string;
  scoreValue: string;
};

const DEFAULT_SCORES: ScoreRow[] = [
  { metricCode: "PIPELINE", metricLabel: "Pipeline quality", scoreValue: "" },
  { metricCode: "ACTIVITY", metricLabel: "Activity volume", scoreValue: "" },
];

export default function NewPerformancePage() {
  const { token, hasPermission } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    salesExecutiveProfileId: "",
    summary: "",
    verdict: "",
  });
  const [scores, setScores] = useState<ScoreRow[]>(DEFAULT_SCORES);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateScore(index: number, patch: Partial<ScoreRow>) {
    setScores((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      const parsed = scores
        .filter((s) => s.metricCode.trim() && s.scoreValue !== "")
        .map((s) => ({
          metricCode: s.metricCode.trim().toUpperCase(),
          metricLabel: s.metricLabel.trim() || s.metricCode.trim(),
          scoreValue: Number(s.scoreValue),
        }));
      if (parsed.length === 0) {
        setError("Add at least one metric score");
        setSubmitting(false);
        return;
      }
      const res = await api.createPerformanceEvaluation(token, {
        salesExecutiveProfileId: form.salesExecutiveProfileId,
        summary: form.summary.trim() || null,
        verdict: form.verdict.trim() || null,
        scores: parsed,
      });
      router.push(`/performance/${res.data.evaluation.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create");
    } finally {
      setSubmitting(false);
    }
  }

  if (!hasPermission("PERFORMANCE_CREATE")) {
    return (
      <ErrorState message="You do not have permission to create performance evaluations." />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/performance" className="text-sm text-slate-600 underline">
          ← Performance
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          New evaluation
        </h1>
        <p className="text-sm text-slate-600">
          Creates a new historical evaluation with metric scores. Source follows
          your role.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded border border-slate-200 bg-white p-4"
      >
        <ProfileSearchSelect
          value={form.salesExecutiveProfileId}
          onChange={(id) =>
            setForm({ ...form, salesExecutiveProfileId: id })
          }
        />
        <TextArea
          label="Summary"
          rows={3}
          value={form.summary}
          onChange={(e) => setForm({ ...form, summary: e.target.value })}
        />
        <TextInput
          label="Verdict"
          value={form.verdict}
          onChange={(e) => setForm({ ...form, verdict: e.target.value })}
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-800">
              Metric scores (0–100)
            </p>
            <button
              type="button"
              className="text-xs text-slate-700 underline"
              onClick={() =>
                setScores((prev) => [
                  ...prev,
                  { metricCode: "", metricLabel: "", scoreValue: "" },
                ])
              }
            >
              Add metric
            </button>
          </div>
          {scores.map((row, index) => (
            <div
              key={index}
              className="grid grid-cols-1 gap-2 sm:grid-cols-3"
            >
              <input
                className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="CODE"
                value={row.metricCode}
                onChange={(e) =>
                  updateScore(index, { metricCode: e.target.value })
                }
              />
              <input
                className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="Label"
                value={row.metricLabel}
                onChange={(e) =>
                  updateScore(index, { metricLabel: e.target.value })
                }
              />
              <input
                type="number"
                min={0}
                max={100}
                step={0.01}
                className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="Score"
                value={row.scoreValue}
                onChange={(e) =>
                  updateScore(index, { scoreValue: e.target.value })
                }
              />
            </div>
          ))}
        </div>

        {error && <ErrorState message={error} />}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Create"}
        </Button>
      </form>
    </div>
  );
}
