"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ProfileSearchSelect } from "@/components/ProfileSearchSelect";
import { Button, ErrorState, TextArea } from "@/components/ui";

type FormState = {
  salesExecutiveProfileId: string;
  strength: string;
  weakness: string;
  opportunity: string;
  threat: string;
};

export default function NewSwotPage() {
  const { token, hasPermission, user } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    salesExecutiveProfileId: "",
    strength: "",
    weakness: "",
    opportunity: "",
    threat: "",
  });
  const [ownProfileName, setOwnProfileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canCreate =
    hasPermission("SWOT_CREATE") && user?.roleCode !== "SUPER_ADMIN";

  useEffect(() => {
    if (!token || user?.roleCode !== "SALES_EXECUTIVE") return;
    void api.getProfiles(token).then((res) => {
      const own = res.data.profiles[0];
      if (own) {
        setForm((prev) => ({ ...prev, salesExecutiveProfileId: own.id }));
        setOwnProfileName(own.displayName);
      }
    });
  }, [token, user?.roleCode]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!form.salesExecutiveProfileId) {
      setError("Select a Sales Executive profile");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.createSwot(token, form);
      router.push(`/swot/${res.data.swot.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create");
    } finally {
      setSubmitting(false);
    }
  }

  if (!canCreate) {
    return (
      <ErrorState message="You do not have permission to create SWOT analyses." />
    );
  }

  const sourceHint =
    user?.roleCode === "TEAM_LEAD"
      ? "TEAM_LEAD"
      : user?.roleCode === "COMMANDO_EXECUTIVE"
        ? "COMMANDO"
        : "SALES_EXECUTIVE";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/swot" className="text-sm text-slate-600 underline">
          ← SWOT
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          Create SWOT
        </h1>
        <p className="text-sm text-slate-600">
          Source will be recorded as <strong>{sourceHint}</strong>. This creates
          a new historical record.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded border border-slate-200 bg-white p-4"
      >
        {user?.roleCode === "SALES_EXECUTIVE" ? (
          <p className="text-sm text-slate-600">
            Profile: {ownProfileName ?? "Loading…"}
          </p>
        ) : (
          <ProfileSearchSelect
            value={form.salesExecutiveProfileId}
            onChange={(id) =>
              setForm({ ...form, salesExecutiveProfileId: id })
            }
          />
        )}

        {(
          [
            ["strength", "Strength"],
            ["weakness", "Weakness"],
            ["opportunity", "Opportunity"],
            ["threat", "Threat"],
          ] as const
        ).map(([key, label]) => (
          <TextArea
            key={key}
            label={label}
            required
            rows={3}
            value={form[key]}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          />
        ))}

        {error && <ErrorState message={error} />}

        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Save SWOT"}
        </Button>
      </form>
    </div>
  );
}
