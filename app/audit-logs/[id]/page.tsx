"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { api, type AuditLogItem } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  formatActorMeta,
  formatActorName,
  humanizeCode,
  metadataEntries,
  pickBeforeAfter,
} from "@/lib/admin-labels";
import { AdminBreadcrumb } from "@/components/admin/AdminPageShell";
import {
  DateTimeCell,
  ErrorState,
  LoadingState,
  PageHeader,
} from "@/components/ui";

function MetaPairs({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data);
  if (entries.length === 0) {
    return (
      <p className="text-sm text-[var(--color-ink-muted)]">No fields recorded.</p>
    );
  }
  return (
    <dl className="space-y-2 text-sm">
      {entries.map(([key, value]) => (
        <div key={key} className="grid gap-0.5 sm:grid-cols-[8rem_1fr]">
          <dt className="text-[var(--color-ink-subtle)]">{humanizeCode(key)}</dt>
          <dd className="break-words text-[var(--color-ink)]">
            {value === null || value === undefined
              ? "—"
              : typeof value === "object"
                ? JSON.stringify(value)
                : String(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default function AuditLogDetailPage() {
  const { token, user, hasPermission } = useAuth();
  const params = useParams();
  const id = String(params.id);
  const [item, setItem] = useState<AuditLogItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [techOpen, setTechOpen] = useState(false);

  const allowed =
    user?.roleCode === "SUPER_ADMIN" && hasPermission("AUDIT_VIEW");

  useEffect(() => {
    if (!token || !allowed || !id) return;
    void (async () => {
      try {
        const res = await api.getAuditLog(token, id);
        setItem(res.data.auditLog);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      }
    })();
  }, [token, allowed, id]);

  const parsed = useMemo(
    () => pickBeforeAfter(item?.metadata),
    [item?.metadata],
  );
  const restEntries = useMemo(
    () => metadataEntries(parsed.rest),
    [parsed.rest],
  );

  if (!allowed) {
    return <ErrorState message="Only Super Admin may view audit logs." />;
  }

  if (error) {
    return (
      <div className="space-y-3">
        <AdminBreadcrumb
          items={[
            { label: "Audit Log", href: "/audit-logs" },
            { label: "Event" },
          ]}
        />
        <ErrorState message={error} />
        <Link
          href="/audit-logs"
          className="text-sm font-medium text-[var(--color-brand)] hover:underline"
        >
          ← Back to Audit Log
        </Link>
      </div>
    );
  }

  if (!item) return <LoadingState label="Loading audit event…" />;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <AdminBreadcrumb
        items={[
          { label: "Audit Log", href: "/audit-logs" },
          { label: humanizeCode(item.action) },
        ]}
      />

      <div>
        <Link
          href="/audit-logs"
          className="text-sm font-medium text-[var(--color-brand)] hover:underline"
        >
          ← Back to Audit Log
        </Link>
        <PageHeader
          title={humanizeCode(item.action)}
          description="Immutable audit event — this record cannot be edited or deleted."
        />
      </div>

      <section className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-subtle)]">
          Summary
        </h2>
        <dl className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-[var(--color-ink-subtle)]">Timestamp</dt>
            <dd className="mt-1 text-sm">
              <DateTimeCell value={item.createdAt} />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-ink-subtle)]">User</dt>
            <dd className="mt-1 text-sm font-medium">
              {formatActorName(item.actor)}
            </dd>
            {item.actor ? (
              <dd className="text-xs text-[var(--color-ink-muted)]">
                {formatActorMeta(item.actor)}
              </dd>
            ) : null}
          </div>
          <div>
            <dt className="text-xs text-[var(--color-ink-subtle)]">Action</dt>
            <dd className="mt-1 text-sm">{humanizeCode(item.action)}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-ink-subtle)]">Resource</dt>
            <dd className="mt-1 text-sm">{humanizeCode(item.entityType)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-[var(--color-ink-subtle)]">Record ID</dt>
            <dd className="mt-1 font-mono text-sm text-[var(--color-ink-muted)]">
              {item.entityId ?? "—"}
            </dd>
          </div>
        </dl>
      </section>

      {(parsed.before || parsed.after) && (
        <section className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-subtle)]">
              Before
            </h2>
            <div className="mt-3">
              {parsed.before ? (
                <MetaPairs data={parsed.before} />
              ) : (
                <p className="text-sm text-[var(--color-ink-muted)]">
                  No prior values recorded.
                </p>
              )}
            </div>
          </div>
          <div className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-subtle)]">
              After
            </h2>
            <div className="mt-3">
              {parsed.after ? (
                <MetaPairs data={parsed.after} />
              ) : (
                <p className="text-sm text-[var(--color-ink-muted)]">
                  No new values recorded.
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {restEntries.length > 0 && (
        <section className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-subtle)]">
            Details
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            {restEntries.map((entry) => (
              <div
                key={entry.key}
                className="grid gap-0.5 sm:grid-cols-[10rem_1fr]"
              >
                <dt className="text-[var(--color-ink-subtle)]">{entry.key}</dt>
                <dd className="break-words">{entry.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)]">
        <button
          type="button"
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium"
          aria-expanded={techOpen}
          onClick={() => setTechOpen((v) => !v)}
        >
          Technical details
          <span className="text-[var(--color-ink-subtle)]">
            {techOpen ? "Hide" : "Show"}
          </span>
        </button>
        {techOpen ? (
          <pre className="overflow-x-auto border-t border-[var(--color-line)] bg-[var(--color-surface-2)] p-4 text-xs text-[var(--color-ink-muted)]">
            {item.metadata
              ? JSON.stringify(item.metadata, null, 2)
              : "No metadata"}
          </pre>
        ) : null}
      </section>
    </div>
  );
}
