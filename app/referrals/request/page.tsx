"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { personName } from "@/lib/labels";
import { SearchableSelect } from "@/components/SearchableSelect";
import {
  Button,
  ErrorState,
  LoadingState,
  PageHeader,
  TextArea,
  TextInput,
} from "@/components/ui";

type RequestableProfile = {
  id: string;
  displayName: string;
  employeeCode: string | null;
  team: { id: string; name: string };
  teamLead: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
};

export default function CommandoRequestPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const { pushToast } = useToast();
  const [profiles, setProfiles] = useState<RequestableProfile[]>([]);
  const [search, setSearch] = useState("");
  const [profileId, setProfileId] = useState("");
  const [requestReason, setRequestReason] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.roleCode !== "COMMANDO_EXECUTIVE") {
      router.replace("/referrals");
    }
  }, [user, router]);

  useEffect(() => {
    let cancelled = false;
    const handle = window.setTimeout(() => {
      void (async () => {
        if (!token) return;
        setLoading(true);
        try {
          const res = await api.getRequestableProfiles(
            token,
            search || undefined,
          );
          if (!cancelled) {
            setProfiles(res.data.profiles);
            setError(null);
          }
        } catch (err) {
          if (!cancelled) {
            setError(
              err instanceof Error ? err.message : "Failed to load profiles",
            );
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [token, search]);

  const selected = profiles.find((p) => p.id === profileId);

  async function submit() {
    if (!token || !profileId || !requestReason.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.createCommandoRequest(token, {
        salesExecutiveProfileId: profileId,
        requestReason: requestReason.trim(),
        note: note.trim() || null,
      });
      pushToast("Request sent to the Team Lead", "success");
      router.push(`/referrals/${res.data.referral.id}`);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not submit the request",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (user && user.roleCode !== "COMMANDO_EXECUTIVE") {
    return <LoadingState label="Redirecting…" />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Request Sales Executive"
        description="Ask the Team Lead for temporary intervention access. You do not take ownership — the Team Lead remains the permanent manager."
      />

      {error && <ErrorState message={error} />}

      <section className="surface space-y-4 p-4 sm:p-5">
        <TextInput
          label="Search Sales Executives"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Name or team…"
        />

        <div>
          <p className="text-sm font-medium text-[var(--color-ink)]">
            Sales Executive
          </p>
          <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
            Only executives without an active intervention are listed.
          </p>
          <div className="mt-2">
            {loading ? (
              <LoadingState label="Loading…" />
            ) : (
              <SearchableSelect
                value={profileId}
                onChange={setProfileId}
                options={profiles.map((p) => ({
                  value: p.id,
                  label: `${p.displayName} · ${p.team.name}`,
                  hint: p.teamLead ? personName(p.teamLead) : "No Team Lead",
                }))}
                placeholder="Select Sales Executive"
              />
            )}
          </div>
        </div>

        {selected && (
          <dl className="grid gap-3 rounded-md border border-[var(--color-line)] bg-[var(--color-surface-2)] p-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-[var(--color-ink-subtle)]">
                Team
              </dt>
              <dd className="mt-0.5 font-medium">{selected.team.name}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-[var(--color-ink-subtle)]">
                Team Lead
              </dt>
              <dd className="mt-0.5 font-medium">
                {selected.teamLead
                  ? personName(selected.teamLead)
                  : "No Team Lead on team"}
              </dd>
            </div>
          </dl>
        )}

        <TextArea
          label="Why do you want to intervene?"
          value={requestReason}
          onChange={(e) => setRequestReason(e.target.value)}
          rows={4}
          required
        />

        <TextArea
          label="Note to Team Lead (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
        />

        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            disabled={
              submitting ||
              !profileId ||
              !requestReason.trim() ||
              !selected?.teamLead
            }
            onClick={() => void submit()}
          >
            {submitting ? "Sending…" : "Send request to Team Lead"}
          </Button>
          <Button
            variant="secondary"
            disabled={submitting}
            onClick={() => router.push("/referrals")}
          >
            Cancel
          </Button>
        </div>
      </section>
    </div>
  );
}
