"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError, type SyncSupportLink } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ProfileSearchSelect } from "@/components/ProfileSearchSelect";
import { SearchableSelect } from "@/components/SearchableSelect";
import {
  Button,
  ErrorState,
  LoadingState,
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
  return (
    <Suspense fallback={<LoadingState label="Loading form…" />}>
      <NewRoleAssignmentForm />
    </Suspense>
  );
}

function NewRoleAssignmentForm() {
  const { token, hasPermission } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const lockedProfileId = searchParams.get("profileId") ?? "";
  const returnTo = searchParams.get("returnTo");

  const [profileId, setProfileId] = useState(lockedProfileId);
  const [lockedProfileName, setLockedProfileName] = useState<string | null>(
    null,
  );
  const [links, setLinks] = useState<SyncSupportLink[]>([]);
  const [salesSupportUserId, setSalesSupportUserId] = useState("");
  const [primaryResponsibility, setPrimaryResponsibility] = useState("");
  const [shouldDo, setShouldDo] = useState<string[]>([""]);
  const [shouldNotDo, setShouldNotDo] = useState<string[]>([""]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (lockedProfileId) setProfileId(lockedProfileId);
  }, [lockedProfileId]);

  useEffect(() => {
    if (!token || !lockedProfileId) {
      setLockedProfileName(null);
      return;
    }
    void api
      .getProfile(token, lockedProfileId)
      .then((res) => setLockedProfileName(res.data.profile.displayName))
      .catch(() => setLockedProfileName(null));
  }, [token, lockedProfileId]);

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
        // Prefer Support Team context so Team Leads (and Commandos) can load
        // linked Support people without needing SYNC_EVAL_CREATE.
        const res = await api.getSeSupportTeam(token, profileId);
        if (cancelled) return;
        const mapped = res.data.activeSupport.map((link) => ({
          id: link.id,
          salesExecutiveProfileId: link.salesExecutiveProfileId,
          salesSupportUserId: link.salesSupportUserId,
          supportUser: {
            id: link.supportUser.id,
            firstName: link.supportUser.firstName,
            lastName: link.supportUser.lastName,
            email: link.supportUser.email,
            role: { code: "SALES_SUPPORT_EXECUTIVE" },
          },
          startedAt: link.startedAt,
          isActive: link.isActive,
        }));
        setLinks(mapped);
        setSalesSupportUserId(mapped[0]?.salesSupportUserId ?? "");
        setError(null);
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
      if (returnTo) {
        router.push(returnTo);
      } else if (lockedProfileId) {
        router.push(`/profiles/${lockedProfileId}/support`);
      } else {
        router.push(`/role-assignments/${res.data.roleAssignment.id}`);
      }
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

  const backHref =
    returnTo ||
    (lockedProfileId
      ? `/profiles/${lockedProfileId}/support`
      : "/role-assignments");
  const backLabel = lockedProfileId
    ? `← Back to ${lockedProfileName ?? "Sales Executive"}`
    : "← Role Assignments";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={backHref}
          className="text-sm font-medium text-[var(--color-brand)] hover:underline"
        >
          {backLabel}
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
        {lockedProfileId ? (
          <p className="text-sm text-[var(--color-ink-muted)]">
            Sales Executive:{" "}
            <span className="font-medium text-[var(--color-ink)]">
              {lockedProfileName ?? "Loading…"}
            </span>
          </p>
        ) : (
          <ProfileSearchSelect value={profileId} onChange={setProfileId} />
        )}

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
