"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
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
import { SearchableSelect } from "@/components/SearchableSelect";
import {
  Button,
  ConfirmDialog,
  Drawer,
  ErrorState,
  Skeleton,
  TextArea,
  TextInput,
} from "@/components/ui";

const RESPONSE_VALUES = [
  { value: "YES", label: "Yes" },
  { value: "NO", label: "No" },
  { value: "NA", label: "N/A" },
] as const;

type ChecklistRow = EffectiveMonitoringChecklistItem & {
  clientKey: string;
};

type Props = {
  profileId: string;
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

export function MonitoringSessionForm({
  profileId,
  profileName,
  submitting,
  setSubmitting,
  setError,
  onSuccess,
  activeSupport: activeSupportProp = null,
}: Props) {
  const { token, hasPermission } = useAuth();
  const { pushToast } = useToast();
  const [categories, setCategories] = useState<MonitoringCategory[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [items, setItems] = useState<ChecklistRow[]>([]);
  const [canCustomize, setCanCustomize] = useState(false);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [checklistError, setChecklistError] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [observation, setObservation] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addLabel, setAddLabel] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addScope, setAddScope] = useState<"SE" | "SESSION">("SE");
  const [addBusy, setAddBusy] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<ChecklistRow | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [fetchedSupport, setFetchedSupport] = useState<SalesSupportLink[]>([]);
  const [supportNone, setSupportNone] = useState(false);
  const [selectedSupportIds, setSelectedSupportIds] = useState<string[]>([]);

  const activeSupport = activeSupportProp ?? fetchedSupport;
  const showSupportSection = activeSupport.length > 0;
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
    if (!token || !profileId || !hasPermission("SALES_SUPPORT_LINK_VIEW")) {
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
  }, [token, profileId, activeSupportProp, hasPermission]);

  useEffect(() => {
    setSupportNone(false);
    setSelectedSupportIds([]);
  }, [profileId, activeSupportKey]);

  useEffect(() => {
    if (!token || !categoryId || !profileId) {
      setItems([]);
      setCanCustomize(false);
      return;
    }
    let cancelled = false;
    setChecklistLoading(true);
    setChecklistError(null);
    void api
      .getEffectiveMonitoringChecklist(token, profileId, categoryId)
      .then((res) => {
        if (cancelled) return;
        const next = res.data.items.map((item) => ({
          ...item,
          clientKey: itemKey(item),
        }));
        setItems(next);
        setCanCustomize(res.data.canCustomize);
        setResponses((prev) => {
          const mapped: Record<string, string> = {};
          for (const item of next) {
            mapped[item.clientKey] = prev[item.clientKey] ?? "YES";
          }
          return mapped;
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setChecklistError(
          err instanceof Error
            ? err.message
            : "Unable to load the monitoring checklist.",
        );
        setItems([]);
      })
      .finally(() => {
        if (!cancelled) setChecklistLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, profileId, categoryId]);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId) ?? null,
    [categories, categoryId],
  );

  const standardItems = items.filter((i) => i.sourceType === "TEMPLATE");
  const customItems = items.filter((i) => i.sourceType !== "TEMPLATE");

  const summary = useMemo(() => {
    const values = items.map((i) => responses[i.clientKey] ?? "YES");
    return {
      total: items.length,
      yes: values.filter((v) => v === "YES").length,
      no: values.filter((v) => v === "NO").length,
      na: values.filter((v) => v === "NA").length,
      hasObservation: Boolean(observation.trim()),
    };
  }, [items, responses, observation]);

  async function reloadChecklist() {
    if (!token || !categoryId) return;
    const res = await api.getEffectiveMonitoringChecklist(
      token,
      profileId,
      categoryId,
    );
    const next = res.data.items.map((item) => ({
      ...item,
      clientKey: itemKey(item),
    }));
    setItems(next);
    setCanCustomize(res.data.canCustomize);
    setResponses((prev) => {
      const mapped: Record<string, string> = {};
      for (const item of next) {
        mapped[item.clientKey] = prev[item.clientKey] ?? "YES";
      }
      return mapped;
    });
  }

  async function onAddItem() {
    if (!token || !categoryId || !addLabel.trim()) return;
    setAddBusy(true);
    try {
      const res = await api.addSeMonitoringChecklistItem(token, profileId, {
        categoryId,
        label: addLabel.trim(),
        description: addDescription.trim() || null,
        scope: addScope,
      });
      if (res.data.persisted) {
        await reloadChecklist();
      } else {
        const ephemeral: ChecklistRow = {
          ...res.data.item,
          clientKey: itemKey(res.data.item),
        };
        setItems((prev) => [...prev, ephemeral]);
        setResponses((prev) => ({
          ...prev,
          [ephemeral.clientKey]: "YES",
        }));
      }
      setAddOpen(false);
      setAddLabel("");
      setAddDescription("");
      setAddScope("SE");
      pushToast(
        addScope === "SE"
          ? "Checklist item added for this Sales Executive"
          : "Checklist item added for this session",
        "success",
      );
    } catch (err) {
      pushToast(
        err instanceof ApiError ? err.message : "Could not add checklist item",
        "error",
      );
    } finally {
      setAddBusy(false);
    }
  }

  async function onConfirmRemove() {
    if (!token || !removeTarget || !categoryId) return;
    setRemoveBusy(true);
    try {
      if (removeTarget.sourceType === "CUSTOM" && removeTarget.seChecklistItemId) {
        await api.removeSeMonitoringChecklistItem(
          token,
          profileId,
          removeTarget.seChecklistItemId,
        );
      } else if (
        removeTarget.sourceType === "TEMPLATE" &&
        removeTarget.checklistItemId
      ) {
        await api.removeMonitoringTemplateItemFromSe(token, profileId, {
          categoryId,
          templateItemId: removeTarget.checklistItemId,
        });
      } else if (removeTarget.sourceType === "SESSION") {
        setItems((prev) =>
          prev.filter((i) => i.clientKey !== removeTarget.clientKey),
        );
        setResponses((prev) => {
          const next = { ...prev };
          delete next[removeTarget.clientKey];
          return next;
        });
        setRemoveTarget(null);
        pushToast("Item removed from this session", "success");
        return;
      }
      await reloadChecklist();
      setRemoveTarget(null);
      pushToast(`Removed from ${profileName}'s checklist`, "success");
    } catch (err) {
      pushToast(
        err instanceof ApiError ? err.message : "Could not remove item",
        "error",
      );
    } finally {
      setRemoveBusy(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token || !selectedCategory || items.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.createMonitoringRecord(token, {
        salesExecutiveProfileId: profileId,
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
    <>
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="rounded border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
          <SearchableSelect
            label="Category"
            value={categoryId}
            onChange={(id) => {
              setCategoryId(id);
              setResponses({});
              setChecklistError(null);
            }}
            placeholder="Select checklist category…"
            allowClear={false}
            options={categories.map((c) => ({
              value: c.id,
              label: c.name,
            }))}
          />
        </div>

        {!categoryId ? (
          <div className="rounded border border-dashed border-[var(--color-line-strong)] px-4 py-10 text-center">
            <p className="text-sm font-medium text-[var(--color-ink)]">
              Select a checklist category
            </p>
            <p className="mx-auto mt-1 max-w-md text-sm text-[var(--color-ink-muted)]">
              Choose a category to load the monitoring checklist for{" "}
              {profileName}.
            </p>
          </div>
        ) : checklistLoading ? (
          <ChecklistSkeleton />
        ) : checklistError ? (
          <ErrorState
            message={checklistError}
            onRetry={() => {
              setChecklistError(null);
              void reloadChecklist().catch(() =>
                setChecklistError("Unable to load the monitoring checklist."),
              );
            }}
          />
        ) : items.length === 0 ? (
          <div className="rounded border border-dashed border-[var(--color-line-strong)] px-4 py-10 text-center">
            <p className="text-sm font-medium text-[var(--color-ink)]">
              No monitoring checklist configured
            </p>
            <p className="mx-auto mt-1 max-w-md text-sm text-[var(--color-ink-muted)]">
              There is currently no checklist configured for {profileName} in
              this category.
            </p>
            {canCustomize ? (
              <Button className="mt-4" onClick={() => setAddOpen(true)}>
                Add checklist item
              </Button>
            ) : null}
          </div>
        ) : (
          <section className="overflow-hidden rounded border border-[var(--color-line)] bg-[var(--color-surface)]">
            <div className="border-b border-[var(--color-line)] px-4 py-3">
              <h2 className="text-sm font-semibold text-[var(--color-ink)]">
                {selectedCategory?.name ?? "Checklist"}
              </h2>
              {selectedCategory?.description ? (
                <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
                  {selectedCategory.description}
                </p>
              ) : null}
            </div>

            <ChecklistGroup
              title="Standard"
              items={standardItems}
              startIndex={1}
              responses={responses}
              onChange={(key, value) =>
                setResponses((prev) => ({ ...prev, [key]: value }))
              }
              canCustomize={canCustomize}
              onRemove={setRemoveTarget}
            />

            {customItems.length > 0 ? (
              <ChecklistGroup
                title={`Custom for ${profileName}`}
                items={customItems}
                startIndex={standardItems.length + 1}
                responses={responses}
                onChange={(key, value) =>
                  setResponses((prev) => ({ ...prev, [key]: value }))
                }
                canCustomize={canCustomize}
                onRemove={setRemoveTarget}
                showCustomBadge
              />
            ) : null}

            {canCustomize ? (
              <div className="border-t border-[var(--color-line)] px-4 py-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setAddOpen(true)}
                >
                  + Add checklist item
                </Button>
              </div>
            ) : null}
          </section>
        )}

        {showSupportSection ? (
          <section className="rounded border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
            <h2 className="text-sm font-semibold text-[var(--color-ink)]">
              Support involved
            </h2>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
              Record which Sales Support people were involved in this session.
            </p>
            <ul className="mt-3 space-y-2">
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

        <section className="rounded border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">
            Observations
          </h2>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            Capture anything important that was not covered by the checklist.
          </p>
          <div className="mt-3">
            <TextArea
              label="Notes"
              rows={5}
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              hint={`${observation.length} / 10000`}
            />
          </div>
        </section>

        {items.length > 0 ? (
          <section className="rounded border border-[var(--color-line)] bg-[var(--color-surface-2)] p-4">
            <h2 className="text-sm font-semibold text-[var(--color-ink)]">
              Monitoring summary
            </h2>
            <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryStat label="Checklist items" value={summary.total} />
              <SummaryStat label="Yes" value={summary.yes} />
              <SummaryStat label="Needs attention" value={summary.no} />
              <SummaryStat label="N/A" value={summary.na} />
            </dl>
            <p className="mt-3 text-xs text-[var(--color-ink-muted)]">
              Observations: {summary.hasObservation ? "Added" : "None"}
            </p>
          </section>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="submit"
            disabled={submitting || !categoryId || items.length === 0}
          >
            {submitting ? "Saving…" : "Complete Session"}
          </Button>
        </div>
      </form>

      <Drawer
        open={addOpen}
        title="Add checklist item"
        description={`Customize the monitoring checklist for ${profileName}. This does not change the global template.`}
        onClose={() => !addBusy && setAddOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              disabled={addBusy}
              onClick={() => setAddOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={addBusy || !addLabel.trim()}
              onClick={() => void onAddItem()}
            >
              {addBusy ? "Adding…" : "Add item"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <TextInput
            label="Item name"
            required
            value={addLabel}
            onChange={(e) => setAddLabel(e.target.value)}
          />
          <TextArea
            label="Optional description"
            rows={3}
            value={addDescription}
            onChange={(e) => setAddDescription(e.target.value)}
          />
          <fieldset>
            <legend className="text-sm font-medium text-[var(--color-ink)]">
              Scope
            </legend>
            <div className="mt-2 space-y-2">
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="scope"
                  className="mt-1"
                  checked={addScope === "SE"}
                  onChange={() => setAddScope("SE")}
                />
                <span>
                  <span className="font-medium">This Sales Executive</span>
                  <span className="mt-0.5 block text-[var(--color-ink-muted)]">
                    Appears on future monitoring sessions for {profileName}.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="scope"
                  className="mt-1"
                  checked={addScope === "SESSION"}
                  onChange={() => setAddScope("SESSION")}
                />
                <span>
                  <span className="font-medium">This monitoring session only</span>
                  <span className="mt-0.5 block text-[var(--color-ink-muted)]">
                    Captured in this session snapshot only.
                  </span>
                </span>
              </label>
            </div>
          </fieldset>
        </div>
      </Drawer>

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title={`Remove from ${profileName}'s checklist?`}
        message={`This removes the item from ${profileName}'s future monitoring checklist. Existing monitoring history will not be changed.`}
        confirmLabel="Remove"
        busy={removeBusy}
        onConfirm={() => void onConfirmRemove()}
        onCancel={() => setRemoveTarget(null)}
      />
    </>
  );
}

function ChecklistGroup({
  title,
  items,
  startIndex,
  responses,
  onChange,
  canCustomize,
  onRemove,
  showCustomBadge,
}: {
  title: string;
  items: ChecklistRow[];
  startIndex: number;
  responses: Record<string, string>;
  onChange: (key: string, value: string) => void;
  canCustomize: boolean;
  onRemove: (item: ChecklistRow) => void;
  showCustomBadge?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="border-t border-[var(--color-line)] bg-[var(--color-surface-2)] px-4 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-subtle)]">
          {title}
        </p>
      </div>
      <ul>
        {items.map((item, idx) => {
          const number = String(startIndex + idx).padStart(2, "0");
          const value = responses[item.clientKey] ?? "YES";
          return (
            <li
              key={item.clientKey}
              className="border-t border-[var(--color-line)] px-4 py-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-[var(--color-ink-subtle)]">
                      {number}
                    </span>
                    {showCustomBadge || item.sourceType !== "TEMPLATE" ? (
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--color-ink-muted)] ring-1 ring-[var(--color-line)]">
                        Custom
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm font-medium text-[var(--color-ink)]">
                    {item.label}
                  </p>
                  {item.description ? (
                    <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                      {item.description}
                    </p>
                  ) : null}
                </div>
                {canCustomize ? (
                  <button
                    type="button"
                    className="rounded px-2 py-1 text-xs text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
                    onClick={() => onRemove(item)}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <div className="mt-3">
                <ResponseControl
                  name={`response-${item.clientKey}`}
                  value={value}
                  onChange={(next) => onChange(item.clientKey, next)}
                  label={item.label}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ResponseControl({
  name,
  value,
  onChange,
  label,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <fieldset>
      <legend className="sr-only">{label} response</legend>
      <div
        role="radiogroup"
        aria-label={`${label} response`}
        className="inline-flex rounded border border-[var(--color-line)] bg-[var(--color-surface)] p-0.5"
      >
        {RESPONSE_VALUES.map((opt) => {
          const selected = value === opt.value;
          return (
            <label
              key={opt.value}
              className={`relative cursor-pointer rounded-[var(--radius-sm)] px-3.5 py-1.5 text-sm font-medium transition ${
                selected
                  ? "bg-[var(--color-brand)] text-white"
                  : "text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-2)]"
              }`}
            >
              <input
                type="radio"
                className="sr-only"
                name={name}
                value={opt.value}
                checked={selected}
                onChange={() => onChange(opt.value)}
              />
              <span aria-hidden={false}>
                {opt.label}
                {selected ? (
                  <span className="sr-only"> (selected)</span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">
        {label}
      </dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums text-[var(--color-ink)]">
        {value}
      </dd>
    </div>
  );
}

function ChecklistSkeleton() {
  return (
    <div className="space-y-3 rounded border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}
