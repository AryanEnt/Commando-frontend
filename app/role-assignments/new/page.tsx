"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, type SyncSupportLink } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ProfileSearchSelect } from "@/components/ProfileSearchSelect";
import { SearchableSelect } from "@/components/SearchableSelect";
import {
  Button,
  ErrorState,
  TextArea,
} from "@/components/ui";

function DynamicListEditor({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-800">{label}</h2>
        <button
          type="button"
          className="text-xs text-slate-700 underline"
          onClick={() => onChange([...values, ""])}
        >
          Add item
        </button>
      </div>
      {values.map((value, index) => (
        <div key={index} className="flex gap-2">
          <input
            className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            required
            value={value}
            onChange={(e) => {
              const next = [...values];
              next[index] = e.target.value;
              onChange(next);
            }}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onChange(values.filter((_, i) => i !== index))}
            disabled={values.length <= 1}
          >
            Remove
          </Button>
        </div>
      ))}
    </div>
  );
}

export default function NewRoleAssignmentPage() {
  const { token, hasPermission } = useAuth();
  const router = useRouter();
  const [profileId, setProfileId] = useState("");
  const [links, setLinks] = useState<SyncSupportLink[]>([]);
  const [salesSupportUserId, setSalesSupportUserId] = useState("");
  const [primaryResponsibility, setPrimaryResponsibility] = useState("");
  const [shouldDo, setShouldDo] = useState<string[]>([""]);
  const [shouldNotDo, setShouldNotDo] = useState<string[]>([""]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    void api.getRoleAssignmentTemplates(token).then((res) => {
      setPrimaryResponsibility(res.data.templates.primaryResponsibility);
      setShouldDo([...res.data.templates.shouldDo]);
      setShouldNotDo([...res.data.templates.shouldNotDo]);
    });
  }, [token]);

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
        }
      } catch (err) {
        if (!cancelled) {
          setLinks([]);
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
      const res = await api.createRoleAssignment(token, {
        salesExecutiveProfileId: profileId,
        salesSupportUserId,
        primaryResponsibility,
        shouldDo: shouldDo.map((s) => s.trim()).filter(Boolean),
        shouldNotDo: shouldNotDo.map((s) => s.trim()).filter(Boolean),
      });
      router.push(`/role-assignments/${res.data.roleAssignment.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create");
    } finally {
      setSubmitting(false);
    }
  }

  if (!hasPermission("ROLE_ASSIGNMENT_CREATE")) {
    return (
      <ErrorState message="You do not have permission to create role assignments." />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/role-assignments"
          className="text-sm text-slate-600 underline"
        >
          ← Role Assignments
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          New role assignment
        </h1>
        <p className="text-sm text-slate-600">
          Define support instructions and boundaries for a synced Sales Support
          Executive. Template defaults load from the API and can be customized
          per Sales Executive.
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
          allowClear={false}
          disabled={!profileId || links.length === 0}
          placeholder={
            !profileId
              ? "Select a profile first…"
              : links.length === 0
                ? "No active support link"
                : "Select sales support…"
          }
          options={links.map((link) => ({
            value: link.salesSupportUserId,
            label: `${link.supportUser.firstName} ${link.supportUser.lastName}`,
          }))}
        />

        <TextArea
          label="Primary responsibility"
          required
          rows={3}
          value={primaryResponsibility}
          onChange={(e) => setPrimaryResponsibility(e.target.value)}
        />

        <DynamicListEditor
          label="What should be done *"
          values={shouldDo}
          onChange={setShouldDo}
        />
        <DynamicListEditor
          label="What should not be done *"
          values={shouldNotDo}
          onChange={setShouldNotDo}
        />

        {error && <ErrorState message={error} />}

        <Button type="submit" disabled={submitting || !salesSupportUserId}>
          {submitting ? "Saving…" : "Create assignment"}
        </Button>
      </form>
    </div>
  );
}
