"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  api,
  type EligibleSupportUser,
  type SalesSupportLink,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/dates";
import { personName, responsibilityTypeLabel } from "@/lib/labels";
import { sseWorkspaceHref } from "@/lib/sse-workspace";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  TextInput,
} from "@/components/ui";

type RosterRow = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  links: SalesSupportLink[];
};

export default function SupportRosterPage() {
  const { token, user, hasPermission } = useAuth();
  const [users, setUsers] = useState<EligibleSupportUser[]>([]);
  const [links, setLinks] = useState<SalesSupportLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const canView =
    hasPermission("SALES_SUPPORT_LINK_VIEW") ||
    hasPermission("SWOT_VIEW") ||
    hasPermission("DAILY_WORK_LOG_VIEW");
  const canListSupport =
    hasPermission("SALES_SUPPORT_LINK_VIEW") ||
    hasPermission("SALES_SUPPORT_LINK_ASSIGN");

  const isManager =
    user?.roleCode === "TEAM_LEAD" ||
    user?.roleCode === "COMMANDO_EXECUTIVE" ||
    user?.roleCode === "SUPER_ADMIN";

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [eligibleRes, linksRes] = await Promise.all([
        canListSupport
          ? api.getEligibleSupportUsers(token)
          : Promise.resolve(null),
        api.getSalesSupportLinks(token, {
          isActive: true,
          pageSize: 100,
        }),
      ]);
      setUsers(eligibleRes?.data.users ?? []);
      setLinks(linksRes.data.links);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load Sales Support",
      );
    } finally {
      setLoading(false);
    }
  }, [token, canListSupport]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => {
    const map = new Map<string, RosterRow>();

    for (const u of users) {
      map.set(u.id, {
        userId: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        links: [],
      });
    }

    for (const link of links) {
      const id = link.salesSupportUserId;
      const existing = map.get(id);
      if (existing) {
        existing.links.push(link);
      } else {
        map.set(id, {
          userId: id,
          firstName: link.supportUser.firstName,
          lastName: link.supportUser.lastName,
          email: link.supportUser.email,
          links: [link],
        });
      }
    }

    return [...map.values()].sort((a, b) =>
      personName(a).localeCompare(personName(b)),
    );
  }, [users, links]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = `${personName(r)} ${r.email} ${r.links
        .map((l) => l.profile.displayName)
        .join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search]);

  if (!isManager) {
    return (
      <ErrorState message="This roster is for Team Lead and Commando." />
    );
  }

  if (!canView) {
    return (
      <ErrorState message="You do not have permission to view Sales Support." />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sales Support"
        title="Sales Support"
        description="All Sales Support Executives in your scope — linked and unlinked. Open a workspace for SWOT, work log, and more."
      />

      <div className="max-w-sm">
        <TextInput
          label="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Name, email, or SE…"
        />
      </div>

      {loading ? <LoadingState label="Loading Sales Support…" /> : null}
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      {!loading && !error && filtered.length === 0 ? (
        <EmptyState
          title="No Sales Support in scope"
          description="Create Sales Support users on your team to see them here."
        />
      ) : null}

      {!loading && filtered.length > 0 ? (
        <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--color-surface-2)] text-xs uppercase text-[var(--color-ink-muted)]">
              <tr>
                <th className="px-4 py-2.5">Sales Support</th>
                <th className="px-4 py-2.5">Linked Sales Executives</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row.userId}
                  className="border-t border-[var(--color-line)]"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-[var(--color-ink)]">
                      {personName(row)}
                    </p>
                    <p className="text-meta">{row.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    {row.links.length === 0 ? (
                      <span className="text-[13px] text-[var(--color-ink-muted)]">
                        Not linked
                      </span>
                    ) : (
                      <ul className="space-y-1">
                        {row.links.map((link) => (
                          <li key={link.id} className="text-[13px]">
                            <Link
                              href={`/profiles/${link.salesExecutiveProfileId}`}
                              className="font-medium text-[var(--color-ink)] hover:underline"
                            >
                              {link.profile.displayName}
                            </Link>
                            <span className="text-meta">
                              {" · "}
                              {link.responsibilityType
                                ? responsibilityTypeLabel(
                                    link.responsibilityType,
                                  )
                                : "General"}
                              {" · since "}
                              {formatDate(link.startedAt)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={sseWorkspaceHref(row.userId)}
                      className="text-[13px] font-medium text-[var(--color-brand)] hover:underline"
                    >
                      Open workspace
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
