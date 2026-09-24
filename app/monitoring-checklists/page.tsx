"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  api,
  ApiError,
  type MonitoringCategory,
  type MonitoringChecklistItem,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { StatusBadge } from "@/components/StatusBadge";
import {
  AdminPageShell,
  AdminResultCount,
  AdminToolbar,
} from "@/components/admin/AdminPageShell";
import { AdminTable, AdminTd, AdminTh } from "@/components/admin/AdminTable";
import { PaginationControls } from "@/components/PaginationControls";
import {
  Button,
  ConfirmDialog,
  Drawer,
  EmptyState,
  ErrorState,
  SegmentedControl,
  TableSkeleton,
  TextArea,
  TextInput,
} from "@/components/ui";

type PendingToggle =
  | { kind: "category"; item: MonitoringCategory }
  | { kind: "item"; item: MonitoringChecklistItem }
  | null;

type PendingDelete = MonitoringCategory | null;

type CategoryDraft = { code: string; name: string; description: string };
type ItemDraft = { code: string; label: string; defaultWeight: string };

export default function MonitoringChecklistsPage() {
  const { token, hasPermission } = useAuth();
  const { pushToast } = useToast();
  const [categories, setCategories] = useState<MonitoringCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"active" | "all">("active");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [selectedId, setSelectedId] = useState("");
  const [categoryDrawer, setCategoryDrawer] = useState<
    "create" | "edit" | null
  >(null);
  const [itemDrawerOpen, setItemDrawerOpen] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<MonitoringCategory | null>(null);
  const [categoryDraft, setCategoryDraft] = useState<CategoryDraft>({
    code: "",
    name: "",
    description: "",
  });
  const [itemDraft, setItemDraft] = useState<ItemDraft>({
    code: "",
    label: "",
    defaultWeight: "0",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<PendingToggle>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [weightSavingId, setWeightSavingId] = useState<string | null>(null);

  async function load(overrides?: { page?: number }) {
    if (!token) return;
    const pageToLoad = overrides?.page ?? page;
    setLoading(true);
    try {
      const res = await api.getMonitoringCategories(token, {
        includeInactive: view === "all",
        search: search.trim() || undefined,
        page: pageToLoad,
        pageSize,
      });
      const next = res.data.categories;
      setCategories(next);
      setTotal(res.data.total);
      setError(null);
      setSelectedId((prev) =>
        next.some((c) => c.id === prev) ? prev : (next[0]?.id ?? ""),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load checklists");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    const t = window.setTimeout(() => {
      void load();
    }, 200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, search, view, page, pageSize]);

  const selected =
    categories.find((c) => c.id === selectedId) ?? categories[0] ?? null;

  const sortedItems = useMemo(() => {
    if (!selected) return [];
    return [...selected.checklistItems].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label),
    );
  }, [selected]);

  const activeWeightTotal = useMemo(() => {
    return sortedItems
      .filter((i) => i.isActive)
      .reduce((sum, i) => sum + (i.defaultWeight ?? 0), 0);
  }, [sortedItems]);

  const weightComplete = activeWeightTotal === 100;

  function openCreateCategory() {
    setEditingCategory(null);
    setCategoryDraft({ code: "", name: "", description: "" });
    setFieldErrors({});
    setCategoryDrawer("create");
  }

  function openEditCategory(cat: MonitoringCategory) {
    setEditingCategory(cat);
    setCategoryDraft({
      code: cat.code,
      name: cat.name,
      description: cat.description ?? "",
    });
    setFieldErrors({});
    setCategoryDrawer("edit");
  }

  function validateCategory(): boolean {
    const next: Record<string, string> = {};
    if (categoryDrawer === "create" && !categoryDraft.code.trim()) {
      next.code = "Code is required";
    }
    if (!categoryDraft.name.trim()) next.name = "Name is required";
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSaveCategory(e: FormEvent) {
    e.preventDefault();
    if (!token || !validateCategory()) return;
    setSaving(true);
    try {
      if (categoryDrawer === "create") {
        const res = await api.createMonitoringCategory(token, {
          code: categoryDraft.code.trim().toUpperCase(),
          name: categoryDraft.name.trim(),
          description: categoryDraft.description.trim() || undefined,
        });
        pushToast("Checklist created successfully", "success");
        setSelectedId(res.data.category.id);
        setPage(1);
        setCategoryDrawer(null);
        await load({ page: 1 });
        return;
      } else if (editingCategory) {
        await api.updateMonitoringCategory(token, editingCategory.id, {
          name: categoryDraft.name.trim(),
          description: categoryDraft.description.trim() || null,
        });
        pushToast("Checklist updated successfully", "success");
      }
      setCategoryDrawer(null);
      await load();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Could not save checklist";
      pushToast(msg, "error");
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function onCreateItem(e: FormEvent) {
    e.preventDefault();
    if (!token || !selected) return;
    const next: Record<string, string> = {};
    if (!itemDraft.code.trim()) next.code = "Code is required";
    if (!itemDraft.label.trim()) next.label = "Label is required";
    setFieldErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      const weight = Number.parseInt(itemDraft.defaultWeight, 10);
      await api.createMonitoringChecklistItem(token, selected.id, {
        code: itemDraft.code.trim().toUpperCase(),
        label: itemDraft.label.trim(),
        sortOrder: selected.checklistItems.length + 1,
        defaultWeight: Number.isFinite(weight) ? Math.min(100, Math.max(0, weight)) : 0,
      });
      setItemDraft({ code: "", label: "", defaultWeight: "0" });
      setItemDrawerOpen(false);
      pushToast("Checklist item added", "success");
      await load();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Could not add checklist item";
      pushToast(msg, "error");
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function saveItemWeight(item: MonitoringChecklistItem, raw: string) {
    if (!token) return;
    const weight = Number.parseInt(raw, 10);
    if (!Number.isFinite(weight) || weight < 0 || weight > 100) {
      pushToast("Weight must be an integer from 0 to 100", "error");
      return;
    }
    if (weight === item.defaultWeight) return;
    setWeightSavingId(item.id);
    try {
      await api.updateMonitoringChecklistItem(token, item.id, {
        defaultWeight: weight,
      });
      pushToast("Default weight updated", "success");
      await load();
    } catch (err) {
      pushToast(
        err instanceof ApiError ? err.message : "Could not update weight",
        "error",
      );
    } finally {
      setWeightSavingId(null);
    }
  }

  async function confirmToggle() {
    if (!token || !pending) return;
    setToggling(true);
    try {
      if (pending.kind === "category") {
        const cat = pending.item;
        await api.updateMonitoringCategory(token, cat.id, {
          isActive: !cat.isActive,
          archivedAt: cat.isActive ? new Date().toISOString() : null,
        });
        pushToast(
          cat.isActive ? "Checklist deactivated" : "Checklist activated",
          "success",
        );
      } else {
        const item = pending.item;
        await api.updateMonitoringChecklistItem(token, item.id, {
          isActive: !item.isActive,
          archivedAt: item.isActive ? new Date().toISOString() : null,
        });
        pushToast(
          item.isActive ? "Item deactivated" : "Item activated",
          "success",
        );
      }
      setPending(null);
      await load();
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Update failed", "error");
    } finally {
      setToggling(false);
    }
  }

  async function confirmDelete() {
    if (!token || !pendingDelete) return;
    const id = pendingDelete.id;
    setDeleting(true);
    try {
      const res = await api.deleteMonitoringCategory(token, id);
      pushToast(res.data.message, "success");
      setPendingDelete(null);
      if (selectedId === id) setSelectedId("");
      await load();
    } catch (err) {
      pushToast(
        err instanceof ApiError ? err.message : "Could not delete checklist",
        "error",
      );
    } finally {
      setDeleting(false);
    }
  }

  if (!hasPermission("MONITORING_CHECKLIST_MANAGE")) {
    return (
      <ErrorState message="You do not have permission to manage monitoring checklists." />
    );
  }

  const pendingActive =
    pending?.kind === "category"
      ? pending.item.isActive
      : pending?.item.isActive;

  return (
    <AdminPageShell
      breadcrumb={[{ label: "Checklists" }]}
      title="Checklist templates"
      description="Baseline categories and items. Team Leads and Commandos customize per SE on the Checklist page — historical monitoring never changes."
      actions={
        <Button onClick={openCreateCategory}>+ Create checklist</Button>
      }
      toolbar={
        <AdminToolbar>
          <div className="min-w-[14rem] flex-1">
            <TextInput
              label="Search"
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              placeholder="Search checklists…"
            />
          </div>
          <SegmentedControl
            ariaLabel="Status filter"
            value={view}
            onChange={(v) => {
              setPage(1);
              setView(v);
            }}
            options={[
              { value: "active", label: "Active" },
              { value: "all", label: "All" },
            ]}
          />
          {search ? (
            <Button
              variant="ghost"
              size="sm"
              className="mb-0.5"
              onClick={() => {
                setPage(1);
                setSearch("");
              }}
            >
              Clear search
            </Button>
          ) : null}
        </AdminToolbar>
      }
    >
      {error && !categoryDrawer && !itemDrawerOpen ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : null}

      {!loading && (
        <AdminResultCount
          filtered={total}
          total={total}
          noun="checklists"
        />
      )}

      {loading && <TableSkeleton rows={5} />}

      {!loading && categories.length === 0 && (
        <EmptyState
          title={
            search
              ? "No matching checklists"
              : view === "active"
                ? "No active checklists"
                : "No checklists yet"
          }
          description={
            search
              ? "Try a different search term."
              : "Create a checklist category, then add the observation items used in live monitoring."
          }
          action={
            !search ? (
              <div className="mt-4">
                <Button onClick={openCreateCategory}>+ Create checklist</Button>
              </div>
            ) : undefined
          }
        />
      )}

      {!loading && categories.length > 0 && (
        <div className="space-y-3">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <div className="space-y-3">
              <AdminTable caption="All checklists">
                <thead>
                  <tr>
                    <AdminTh>Checklist</AdminTh>
                    <AdminTh>Items</AdminTh>
                    <AdminTh>Status</AdminTh>
                    <AdminTh className="w-[1%] whitespace-nowrap text-right">
                      Actions
                    </AdminTh>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => {
                    const activeItems = c.checklistItems.filter((i) => i.isActive)
                      .length;
                    const selectedRow = selected?.id === c.id;
                    return (
                      <tr
                        key={c.id}
                        className={
                          selectedRow
                            ? "bg-[var(--color-brand-soft)]/40"
                            : undefined
                        }
                      >
                        <AdminTd>
                          <button
                            type="button"
                            className="w-full text-left"
                            onClick={() => setSelectedId(c.id)}
                          >
                            <span className="block font-medium">{c.name}</span>
                            <span className="mt-0.5 block font-mono text-xs text-[var(--color-ink-muted)]">
                              {c.code}
                            </span>
                          </button>
                        </AdminTd>
                        <AdminTd className="tabular-nums text-[var(--color-ink-muted)]">
                          {activeItems}
                          {c.checklistItems.length !== activeItems
                            ? ` / ${c.checklistItems.length}`
                            : ""}
                        </AdminTd>
                        <AdminTd>
                          <StatusBadge
                            status={c.isActive ? "ACTIVE" : "INACTIVE"}
                            label={c.isActive ? "Active" : "Inactive"}
                          />
                        </AdminTd>
                        <AdminTd className="text-right">
                          <div className="flex flex-wrap items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPending({ kind: "category", item: c });
                              }}
                            >
                              {c.isActive ? "Deactivate" : "Activate"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-[var(--status-danger)] hover:text-[var(--status-danger)]"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPendingDelete(c);
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </AdminTd>
                      </tr>
                    );
                  })}
                </tbody>
              </AdminTable>
              <PaginationControls
                page={page}
                pageSize={pageSize}
                total={total}
                disabled={loading}
                noun="checklists"
                onPageChange={setPage}
                onPageSizeChange={(n) => {
                  setPage(1);
                  setPageSize(n);
                }}
              />
            </div>

            {selected ? (
              <section className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)]">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-line)] px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold tracking-tight">
                        {selected.name}
                      </h2>
                      <StatusBadge
                        status={selected.isActive ? "ACTIVE" : "INACTIVE"}
                        label={selected.isActive ? "Active" : "Inactive"}
                      />
                    </div>
                    <p className="mt-1 font-mono text-xs text-[var(--color-ink-muted)]">
                      {selected.code}
                    </p>
                    {selected.description ? (
                      <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
                        {selected.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openEditCategory(selected)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        setPending({ kind: "category", item: selected })
                      }
                    >
                      {selected.isActive ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-[var(--status-danger)]"
                      onClick={() => setPendingDelete(selected)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="space-y-4 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold">Checklist items</h3>
                      <p className="text-xs text-[var(--color-ink-muted)]">
                        Default weights apply when customizing an SE checklist.
                      </p>
                    </div>
                    {selected.isActive ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          setItemDraft({
                            code: "",
                            label: "",
                            defaultWeight: "0",
                          });
                          setFieldErrors({});
                          setItemDrawerOpen(true);
                        }}
                      >
                        + Add item
                      </Button>
                    ) : null}
                  </div>

                  {sortedItems.some((i) => i.isActive) ? (
                    <div
                      className={`rounded-[var(--radius-sm)] px-3 py-2.5 ${
                        weightComplete
                          ? "bg-[color-mix(in_srgb,var(--status-success)_8%,var(--color-surface-2))]"
                          : activeWeightTotal > 100
                            ? "bg-[color-mix(in_srgb,var(--status-danger)_10%,var(--color-surface-2))]"
                            : "bg-[var(--color-surface-2)]"
                      }`}
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p
                          className={`text-sm font-semibold tabular-nums ${
                            weightComplete
                              ? "text-[var(--status-success)]"
                              : activeWeightTotal > 100
                                ? "text-[var(--status-danger)]"
                                : activeWeightTotal >= 50
                                  ? "text-[var(--status-warn)]"
                                  : "text-[var(--color-ink-subtle)]"
                          }`}
                        >
                          {activeWeightTotal}%
                          <span className="ml-1.5 text-xs font-normal text-[var(--color-ink-muted)]">
                            / 100% default allocation
                          </span>
                          {weightComplete ? (
                            <span className="ml-2 text-xs font-medium text-[var(--status-success)]">
                              ✓
                            </span>
                          ) : null}
                        </p>
                        {!weightComplete ? (
                          <p className="text-xs text-[var(--color-ink-muted)]">
                            {activeWeightTotal < 100
                              ? `${100 - activeWeightTotal}% remaining`
                              : `${activeWeightTotal - 100}% over allocation`}
                          </p>
                        ) : (
                          <p className="text-xs text-[var(--color-ink-muted)]">
                            Active item defaults total 100%
                          </p>
                        )}
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--color-ink-subtle)_22%,var(--color-line))]">
                        <div
                          className={`h-full rounded-full transition-all ${
                            weightComplete
                              ? "bg-[var(--status-success)]"
                              : activeWeightTotal > 100
                                ? "bg-[var(--status-danger)]"
                                : activeWeightTotal >= 50
                                  ? "bg-[var(--status-warn)]"
                                  : "bg-[var(--color-ink-subtle)]"
                          }`}
                          style={{
                            width: `${Math.min(100, activeWeightTotal)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ) : null}

                  {!selected.isActive ? (
                    <p className="rounded-[var(--radius-sm)] border border-dashed border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-ink-muted)]">
                      Activate this checklist to add or manage items.
                    </p>
                  ) : null}

                  {sortedItems.length === 0 ? (
                    <EmptyState
                      title="No checklist items yet"
                      description="Add the first item to define this monitoring workflow."
                      action={
                        selected.isActive ? (
                          <div className="mt-4">
                            <Button
                              onClick={() => {
                                setItemDraft({
                                  code: "",
                                  label: "",
                                  defaultWeight: "0",
                                });
                                setFieldErrors({});
                                setItemDrawerOpen(true);
                              }}
                            >
                              + Add item
                            </Button>
                          </div>
                        ) : undefined
                      }
                    />
                  ) : (
                    <ol className="divide-y divide-[var(--color-line)] border border-[var(--color-line)] rounded-[var(--radius-sm)]">
                      {sortedItems.map((item, index) => (
                        <li
                          key={item.id}
                          className="flex flex-wrap items-center gap-3 px-3 py-3"
                        >
                          <span className="w-8 shrink-0 text-xs font-semibold tabular-nums text-[var(--color-ink-subtle)]">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p
                              className={
                                item.isActive
                                  ? "text-sm font-medium"
                                  : "text-sm text-[var(--color-ink-muted)] line-through"
                              }
                            >
                              {item.label}
                            </p>
                            <p className="font-mono text-xs text-[var(--color-ink-subtle)]">
                              {item.code}
                            </p>
                          </div>
                          <label className="flex items-center gap-1.5">
                            <span className="sr-only">Default weight</span>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              defaultValue={item.defaultWeight ?? 0}
                              key={`${item.id}-${item.defaultWeight}`}
                              disabled={
                                !item.isActive || weightSavingId === item.id
                              }
                              onBlur={(e) =>
                                void saveItemWeight(item, e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.currentTarget.blur();
                                }
                              }}
                              className="w-14 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1 text-right text-sm tabular-nums outline-none focus:border-[var(--color-brand)] disabled:opacity-50"
                            />
                            <span className="text-xs text-[var(--color-ink-muted)]">
                              %
                            </span>
                          </label>
                          <StatusBadge
                            status={item.isActive ? "ACTIVE" : "INACTIVE"}
                            label={item.isActive ? "Active" : "Inactive"}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPending({ kind: "item", item })}
                          >
                            {item.isActive ? "Deactivate" : "Activate"}
                          </Button>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </section>
            ) : null}
          </div>
        </div>
      )}

      <Drawer
        open={categoryDrawer !== null}
        title={
          categoryDrawer === "create" ? "Create checklist" : "Edit checklist"
        }
        description="Categories group checklist items used in live monitoring sessions."
        onClose={() => !saving && setCategoryDrawer(null)}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              disabled={saving}
              onClick={() => setCategoryDrawer(null)}
            >
              Cancel
            </Button>
            <Button type="submit" form="checklist-form" disabled={saving}>
              {saving
                ? "Saving…"
                : categoryDrawer === "create"
                  ? "Create"
                  : "Save changes"}
            </Button>
          </div>
        }
      >
        <form
          id="checklist-form"
          onSubmit={onSaveCategory}
          className="space-y-5"
        >
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-subtle)]">
              Basic information
            </h3>
            {categoryDrawer === "create" ? (
              <TextInput
                label="Code"
                hint="Unique identifier · UPPER_SNAKE"
                required
                value={categoryDraft.code}
                onChange={(e) =>
                  setCategoryDraft({ ...categoryDraft, code: e.target.value })
                }
                error={fieldErrors.code}
                placeholder="CALL_QUALITY"
              />
            ) : (
              <div>
                <p className="text-sm font-medium">Code</p>
                <p className="mt-1 font-mono text-sm text-[var(--color-ink-muted)]">
                  {categoryDraft.code}
                </p>
              </div>
            )}
            <TextInput
              label="Display name"
              required
              value={categoryDraft.name}
              onChange={(e) =>
                setCategoryDraft({ ...categoryDraft, name: e.target.value })
              }
              error={fieldErrors.name}
            />
            <TextArea
              label="Description"
              hint="Optional purpose for this monitoring checklist"
              rows={3}
              value={categoryDraft.description}
              onChange={(e) =>
                setCategoryDraft({
                  ...categoryDraft,
                  description: e.target.value,
                })
              }
            />
          </section>
        </form>
      </Drawer>

      <Drawer
        open={itemDrawerOpen}
        title="Add checklist item"
        description={
          selected
            ? `Adding to ${selected.name}`
            : "Observation prompt for monitoring"
        }
        onClose={() => !saving && setItemDrawerOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              disabled={saving}
              onClick={() => setItemDrawerOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" form="checklist-item-form" disabled={saving}>
              {saving ? "Saving…" : "Add item"}
            </Button>
          </div>
        }
      >
        <form
          id="checklist-item-form"
          onSubmit={onCreateItem}
          className="space-y-4"
        >
          <TextInput
            label="Item code"
            hint="UPPER_SNAKE"
            required
            value={itemDraft.code}
            onChange={(e) =>
              setItemDraft({ ...itemDraft, code: e.target.value })
            }
            error={fieldErrors.code}
            placeholder="GREETING"
          />
          <TextInput
            label="Label"
            hint="Shown to the Commando during monitoring"
            required
            value={itemDraft.label}
            onChange={(e) =>
              setItemDraft({ ...itemDraft, label: e.target.value })
            }
            error={fieldErrors.label}
            placeholder="Used proper greeting"
          />
          <TextInput
            label="Default weight (%)"
            hint="Starts at 0 — redistribute so active items total 100%"
            type="number"
            value={itemDraft.defaultWeight}
            onChange={(e) =>
              setItemDraft({ ...itemDraft, defaultWeight: e.target.value })
            }
            placeholder="0"
          />
        </form>
      </Drawer>

      <ConfirmDialog
        open={Boolean(pending)}
        title={
          pendingActive
            ? pending?.kind === "category"
              ? "Deactivate checklist?"
              : "Deactivate checklist item?"
            : pending?.kind === "category"
              ? "Activate checklist?"
              : "Activate checklist item?"
        }
        message={
          pendingActive
            ? "Inactive options no longer appear in new monitoring sessions. Existing session answers stay unchanged."
            : "This option will appear again in new monitoring sessions."
        }
        confirmLabel={pendingActive ? "Deactivate" : "Activate"}
        danger={Boolean(pendingActive)}
        busy={toggling}
        onCancel={() => setPending(null)}
        onConfirm={() => void confirmToggle()}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete checklist?"
        message={
          pendingDelete
            ? `"${pendingDelete.name}" (${pendingDelete.code}) will be permanently removed if it has never been used in a monitoring session. If it has history, it will be deactivated instead.`
            : ""
        }
        confirmLabel="Delete"
        danger
        busy={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </AdminPageShell>
  );
}
