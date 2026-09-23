"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  api,
  ApiError,
  type EffectiveMonitoringChecklistItem,
  type MonitoringCategory,
  type SalesSupportLink,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { personName, responsibilityTypeLabel } from "@/lib/labels";
import { useToast } from "@/lib/toast-context";
import { seWorkspaceHref } from "@/lib/se-workspace-nav";
import { sseWorkspaceHref } from "@/lib/sse-workspace-nav";
import { SearchableSelect } from "@/components/SearchableSelect";
import {
  Button,
  ErrorState,
  Skeleton,
  TextArea,
} from "@/components/ui";
import { Settings2 } from "lucide-react";
import {
  allocationStatus,
  computeWeightedScore,
} from "@/lib/monitoring-scoring";

const RESPONSE_VALUES = [
  { value: "YES", label: "Done" },
  { value: "NO", label: "Not done" },
  { value: "NA", label: "N/A" },
] as const;

type ChecklistRow = EffectiveMonitoringChecklistItem & {
  clientKey: string;
};

type Props = {
  profileId?: string;
  executiveUserId?: string;
  profileName: string;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
  setError: (v: string | null) => void;
  onSuccess: (recordId: string) => void;
  activeSupport?: SalesSupportLink[] | null;
};

function itemKey(item: EffectiveMonitoringChecklistItem) {
  if (item.sourceType === "TEMPLATE" && item.checklistItemId) {
    return `t:${item.checklistItemId}`;
  }
  if (item.sourceType === "CUSTOM" && item.seChecklistItemId) {
    return `c:${item.seChecklistItemId}`;
  }
  return `s:${item.id}`;
}

/**
 * Record-only monitoring form. Checklist customization lives on Checklist page.
 */
export function MonitoringSessionForm({
  profileId,
  executiveUserId,
  profileName,
  submitting,
  setSubmitting,
  setError,
  onSuccess,
  activeSupport: activeSupportProp = null,
}: Props) {
  const checklistSubject = useMemo(
    () =>
      executiveUserId
        ? ({ executiveUserId } as const)
        : ({ profileId: profileId! } as const),
    [executiveUserId, profileId],
  );
  const checklistHref = executiveUserId
    ? sseWorkspaceHref(executiveUserId, "checklist")
    : seWorkspaceHref(profileId!, "checklist");
  const isSupportSubject = Boolean(executiveUserId);
  const { token, hasPermission } = useAuth();
  const { pushToast } = useToast();
  const [categories, setCategories] = useState<MonitoringCategory[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [items, setItems] = useState<ChecklistRow[]>([]);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [checklistError, setChecklistError] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [observation, setObservation] = useState("");
  const [showObservation, setShowObservation] = useState(false);
  const [fetchedSupport, setFetchedSupport] = useState<SalesSupportLink[]>([]);
  const [supportNone, setSupportNone] = useState(false);
  const [selectedSupportIds, setSelectedSupportIds] = useState<string[]>([]);

  const activeSupport = activeSupportProp ?? fetchedSupport;
  const showSupportSection = !isSupportSubject && activeSupport.length > 0;
  const activeSupportKey = activeSupport.map((l) => l.id).join(",");

  useEffect(() => {
    if (!token) return;
    void api.getMonitoringCategories(token).then((res) => {
      setCategories(res.data.categories.filter((c) => c.isActive));
    });
  }, [token]);

  useEffect(() => {
    if (activeSupportProp !== null && activeSupportProp !== undefined) {
      setFetchedSupport([]);
      return;
    }
    if (
      isSupportSubject ||
      !token ||
      !profileId ||
      !hasPermission("SALES_SUPPORT_LINK_VIEW")
    ) {
      setFetchedSupport([]);
      return;
    }
    let cancelled = false;
    void api
      .getSeSupportTeam(token, profileId)
      .then((res) => {
        if (!cancelled) setFetchedSupport(res.data.activeSupport);
      })
      .catch(() => {
        if (!cancelled) setFetchedSupport([]);
      });
    return () => {
      cancelled = true;
    };
  }, [token, profileId, isSupportSubject, activeSupportProp, hasPermission]);

  useEffect(() => {
    setSupportNone(false);
    setSelectedSupportIds([]);
  }, [profileId, executiveUserId, activeSupportKey]);

  useEffect(() => {
    if (!token || !categoryId) {
      setItems([]);
      return;
    }
    let cancelled = false;
    setChecklistLoading(true);
    setChecklistError(null);
    void api
      .getEffectiveMonitoringChecklist(token, checklistSubject, categoryId)
      .then((res) => {
        if (cancelled) return;
        const next = res.data.items.map((item) => ({
          ...item,
          clientKey: itemKey(item),
        }));
        setItems(next);
        setResponses((prev) => {
          const mapped: Record<string, string> = {};
          for (const item of next) {
            mapped[item.clientKey] = prev[item.clientKey] ?? "";
          }
          return mapped;
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setChecklistError(
          err instanceof Error
            ? err.message
            : "Couldn't load the monitoring checklist.",
        );
        setItems([]);
      })
      .finally(() => {
        if (!cancelled) setChecklistLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, checklistSubject, categoryId]);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId) ?? null,
    [categories, categoryId],
  );

  const unanswered = items.filter((i) => !responses[i.clientKey]).length;
  const yesCount = items.filter((i) => responses[i.clientKey] === "YES").length;
  const weightAlloc = useMemo(
    () => allocationStatus(items.reduce((s, i) => s + (i.weight ?? 0), 0)),
    [items],
  );
  const liveScore = useMemo(() => {
    if (unanswered > 0) return null;
    return computeWeightedScore(
      items.map((i) => ({
        value: responses[i.clientKey] ?? "NA",
        weight: i.weight ?? 0,
      })),
    );
  }, [items, responses, unanswered]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token || !selectedCategory || items.length === 0) return;
    if (!weightAlloc.isComplete) {
      pushToast(
        weightAlloc.remaining > 0
          ? `Checklist weights must total 100% before monitoring (${weightAlloc.remaining}% remaining). Customize the checklist first.`
          : `Checklist weights must total 100% before monitoring (${weightAlloc.over}% over). Customize the checklist first.`,
        "error",
      );
      return;
    }
    if (unanswered > 0) {
      pushToast("Mark every checklist item before saving", "error");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.createMonitoringRecord(token, {
        ...(executiveUserId
          ? { executiveUserId }
          : { salesExecutiveProfileId: profileId! }),
        categoryId,
        observation: observation.trim() || null,
        responses: items.map((item) => {
          const value = responses[item.clientKey] ?? "NA";
          if (item.sourceType === "TEMPLATE" && item.checklistItemId) {
            return {
              checklistItemId: item.checklistItemId,
              sourceType: "TEMPLATE" as const,
              value,
            };
          }
          if (item.sourceType === "CUSTOM" && item.seChecklistItemId) {
            return {
              seChecklistItemId: item.seChecklistItemId,
              sourceType: "CUSTOM" as const,
              value,
            };
          }
          return {
            label: item.label,
            description: item.description,
            sourceType: "SESSION" as const,
            sortOrder: item.sortOrder,
            value,
          };
        }),
        ...(showSupportSection
          ? {
              supportInvolvement:
                supportNone || selectedSupportIds.length === 0
                  ? { none: true }
                  : { salesSupportUserIds: selectedSupportIds },
            }
          : {}),
      });
      pushToast("Monitoring session saved", "success");
      onSuccess(res.data.record.id);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Unable to save the monitoring session.";
      setError(msg);
      pushToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm text-[var(--color-ink-muted)]">
            Use the current checklist to record today&apos;s observation for{" "}
            {profileName}.
          </p>
        </div>
        <Link
          href={checklistHref}
          className="ck-entry-link"
        >
          <Settings2 size={14} strokeWidth={2} aria-hidden />
          Customize Checklist
        </Link>
      </div>

      <SearchableSelect
        label="Category"
        value={categoryId}
        onChange={(id) => {
          setCategoryId(id);
          setResponses({});
          setChecklistError(null);
          setShowObservation(false);
          setObservation("");
        }}
        placeholder="Select checklist category…"
        allowClear={false}
        options={categories.map((c) => ({
          value: c.id,
          label: c.name,
        }))}
      />

      {!categoryId ? (
        <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-line)] px-4 py-8 text-center text-sm text-[var(--color-ink-muted)]">
          Select a category to load today&apos;s checklist.
        </p>
      ) : checklistLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-3/4" />
        </div>
      ) : checklistError ? (
        <ErrorState message={checklistError} />
      ) : items.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-line)] px-4 py-8 text-center">
          <p className="text-sm font-medium text-[var(--color-ink)]">
            No checklist items for this category
          </p>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            Customize the checklist first, then come back to monitor.
          </p>
          <Link
            href={checklistHref}
            className="mt-3 inline-block text-[13px] font-semibold text-[var(--color-brand)] hover:underline"
          >
            Open Checklist →
          </Link>
        </div>
      ) : (
        <section className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-[var(--color-ink)]">
              {selectedCategory?.name ?? "Checklist"}
            </h2>
            <p className="text-[12px] tabular-nums text-[var(--color-ink-subtle)]">
              {liveScore?.scorePercent != null
                ? `Score ${liveScore.scorePercent}% · `
                : ""}
              {yesCount} / {items.length} done
            </p>
          </div>
          {!weightAlloc.isComplete ? (
            <div className="rounded-[var(--radius-sm)] border border-dashed border-[var(--status-warning)] bg-[color-mix(in_srgb,var(--status-warning)_10%,transparent)] px-3 py-2 text-sm text-[var(--color-ink)]">
              Weights total {weightAlloc.total}% — must equal 100% before
              saving.{" "}
              <Link
                href={checklistHref}
                className="font-semibold text-[var(--color-brand)] hover:underline"
              >
                Fix weights
              </Link>
            </div>
          ) : null}
          <ul className="space-y-2">
            {items.map((item) => {
              const value = responses[item.clientKey] ?? "";
              return (
                <li
                  key={item.clientKey}
                  className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-sm font-medium text-[var(--color-ink)]">
                      {item.label}
                    </p>
                    <span className="shrink-0 text-[11px] font-semibold tabular-nums text-[var(--color-ink-muted)]">
                      {item.weight ?? 0}%
                    </span>
                  </div>
                  <div
                    className="mt-2 flex flex-wrap gap-1.5"
                    role="radiogroup"
                    aria-label={item.label}
                  >
                    {RESPONSE_VALUES.map((opt) => {
                      const selected = value === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() =>
                            setResponses((prev) => ({
                              ...prev,
                              [item.clientKey]: opt.value,
                            }))
                          }
                          className={`rounded-full px-3 py-1 text-[12px] font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] ${
                            selected
                              ? opt.value === "YES"
                                ? "bg-[var(--color-brand)] text-[var(--color-brand-on)]"
                                : opt.value === "NO"
                                  ? "bg-[var(--status-danger)] text-white"
                                  : "bg-[var(--color-ink-subtle)] text-white"
                              : "bg-[var(--color-surface-2)] text-[var(--color-ink-muted)] hover:bg-[var(--color-brand-soft)]"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {showSupportSection && categoryId && items.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">
            Support involved
          </h2>
          <ul className="space-y-2">
            {activeSupport.map((link) => {
              const checked =
                !supportNone &&
                selectedSupportIds.includes(link.salesSupportUserId);
              return (
                <li key={link.id}>
                  <label className="flex cursor-pointer items-start gap-3 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={checked}
                      onChange={(e) => {
                        const id = link.salesSupportUserId;
                        setSupportNone(false);
                        setSelectedSupportIds((prev) => {
                          if (e.target.checked) {
                            return prev.includes(id) ? prev : [...prev, id];
                          }
                          return prev.filter((x) => x !== id);
                        });
                      }}
                    />
                    <span>
                      <span className="font-medium text-[var(--color-ink)]">
                        {personName(link.supportUser)}
                      </span>
                      {link.responsibilityType ? (
                        <span className="ml-2 text-xs text-[var(--color-ink-muted)]">
                          {responsibilityTypeLabel(link.responsibilityType)}
                        </span>
                      ) : null}
                    </span>
                  </label>
                </li>
              );
            })}
            <li>
              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={supportNone}
                  onChange={(e) => {
                    setSupportNone(e.target.checked);
                    if (e.target.checked) setSelectedSupportIds([]);
                  }}
                />
                <span className="font-medium text-[var(--color-ink)]">
                  No support involved
                </span>
              </label>
            </li>
          </ul>
        </section>
      ) : null}

      {categoryId && items.length > 0 ? (
        <section>
          {showObservation || observation.trim() ? (
            <TextArea
              label="Observation"
              rows={3}
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="What did you notice?"
            />
          ) : (
            <button
              type="button"
              className="text-[13px] font-medium text-[var(--color-brand)] hover:underline"
              onClick={() => setShowObservation(true)}
            >
              + Add observation
            </button>
          )}
        </section>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-line)] pt-4">
        <p className="text-[13px] text-[var(--color-ink-muted)]">
          {items.length > 0
            ? unanswered > 0
              ? `${unanswered} left to mark`
              : "Ready to save"
            : null}
        </p>
        <Button
          type="submit"
          disabled={submitting || !categoryId || items.length === 0}
        >
          {submitting ? "Saving…" : "Save monitoring"}
        </Button>
      </div>
    </form>
  );
}
