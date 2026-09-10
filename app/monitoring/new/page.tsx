"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, type MonitoringCategory } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { ProfileSearchSelect } from "@/components/ProfileSearchSelect";
import { SearchableSelect } from "@/components/SearchableSelect";
import {
  Button,
  ErrorState,
  SelectField,
  TextArea,
} from "@/components/ui";

const RESPONSE_VALUES = ["YES", "NO", "NA"] as const;

export default function NewMonitoringPage() {
  const { token, hasPermission } = useAuth();
  const { pushToast } = useToast();
  const router = useRouter();
  const [categories, setCategories] = useState<MonitoringCategory[]>([]);
  const [profileId, setProfileId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [observation, setObservation] = useState("");
  const [responseOverrides, setResponseOverrides] = useState<
    Record<string, string>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    void api.getMonitoringCategories(token).then((res) => {
      setCategories(res.data.categories.filter((c) => c.isActive));
    });
  }, [token]);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId) ?? null,
    [categories, categoryId],
  );

  const responses = useMemo(() => {
    if (!selectedCategory) return {} as Record<string, string>;
    const next: Record<string, string> = {};
    for (const item of selectedCategory.checklistItems) {
      next[item.id] = responseOverrides[item.id] ?? "YES";
    }
    return next;
  }, [selectedCategory, responseOverrides]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token || !selectedCategory) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.createMonitoringRecord(token, {
        salesExecutiveProfileId: profileId,
        categoryId,
        observation: observation.trim() || null,
        responses: selectedCategory.checklistItems.map((item) => ({
          checklistItemId: item.id,
          value: responses[item.id] ?? "NA",
        })),
      });
      pushToast("Monitoring session saved", "success");
      router.push(`/monitoring/${res.data.record.id}`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to create";
      setError(msg);
      pushToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!hasPermission("MONITORING_CREATE")) {
    return (
      <ErrorState message="You do not have permission to create monitoring sessions." />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/monitoring" className="text-sm text-slate-600 underline">
          ← Monitoring
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          New monitoring session
        </h1>
        <p className="text-sm text-slate-600">
          Saves as a new historical record — previous sessions are never
          overwritten.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded border border-slate-200 bg-white p-4"
      >
        <ProfileSearchSelect value={profileId} onChange={setProfileId} />

        <SearchableSelect
          label="Category"
          value={categoryId}
          onChange={(id) => {
            setCategoryId(id);
            setResponseOverrides({});
          }}
          placeholder="Select category…"
          allowClear={false}
          options={categories.map((c) => ({
            value: c.id,
            label: c.name,
          }))}
        />

        {selectedCategory && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-slate-800">Checklist</h2>
            {selectedCategory.checklistItems.length === 0 && (
              <p className="text-sm text-amber-800">
                No active checklist items for this category.
              </p>
            )}
            {selectedCategory.checklistItems.map((item) => (
              <SelectField
                key={item.id}
                label={item.label}
                value={responses[item.id] ?? "YES"}
                onChange={(e) =>
                  setResponseOverrides({
                    ...responseOverrides,
                    [item.id]: e.target.value,
                  })
                }
              >
                {RESPONSE_VALUES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </SelectField>
            ))}
          </div>
        )}

        <TextArea
          label="Free-form observations"
          rows={4}
          value={observation}
          onChange={(e) => setObservation(e.target.value)}
        />

        {error && <ErrorState message={error} />}

        <Button
          type="submit"
          disabled={
            submitting ||
            !selectedCategory ||
            selectedCategory.checklistItems.length === 0
          }
        >
          {submitting ? "Saving…" : "Save session"}
        </Button>
      </form>
    </div>
  );
}
