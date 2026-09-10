"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, type AuditLogItem } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  DateTimeCell,
  ErrorState,
  LoadingState,
  PageHeader,
  ReadOnlyPanel,
} from "@/components/ui";

export default function AuditLogDetailPage() {
  const { token, user, hasPermission } = useAuth();
  const params = useParams();
  const id = String(params.id);
  const [item, setItem] = useState<AuditLogItem | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  if (!allowed) {
    return <ErrorState message="Only Super Admin may view audit logs." />;
  }

  if (error) {
    return (
      <div className="space-y-2">
        <Link href="/audit-logs" className="text-sm text-slate-600 underline">
          ← Audit Trail
        </Link>
        <ErrorState message={error} />
      </div>
    );
  }

  if (!item) return <LoadingState label="Loading audit event…" />;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/audit-logs" className="text-sm text-slate-600 underline">
          ← Audit Trail
        </Link>
        <PageHeader
          title={item.action}
          description="Immutable audit event — records are never overwritten."
        />
      </div>

      <ReadOnlyPanel title="Audit event">
        <dl className="space-y-3">
          <div>
            <dt className="text-xs uppercase text-slate-500">Timestamp</dt>
            <dd>
              <DateTimeCell value={item.createdAt} />
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Actor</dt>
            <dd>
              {item.actor
                ? `${item.actor.firstName} ${item.actor.lastName} (${item.actor.email}) · ${item.actor.roleCode}`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Entity</dt>
            <dd>
              {item.entityType}
              {item.entityId ? ` · ${item.entityId}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Metadata</dt>
            <dd>
              <pre className="mt-1 overflow-x-auto rounded bg-white/60 p-3 text-xs">
                {item.metadata
                  ? JSON.stringify(item.metadata, null, 2)
                  : "—"}
              </pre>
            </dd>
          </div>
        </dl>
      </ReadOnlyPanel>
    </div>
  );
}
