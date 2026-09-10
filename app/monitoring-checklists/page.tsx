"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
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
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  PageHeader,
  Panel,
  SegmentedControl,
  TableSkeleton,
  TextArea,
  TextInput,
} from "@/components/ui";

type PendingToggle =
  | { kind: "category"; item: MonitoringCategory }
  | { kind: "item"; item: MonitoringChecklistItem }
  | null;

export default function MonitoringChecklistsPage() {
  const { token, hasPermission } = useAuth();
  const { pushToast } = useToast();
  const [categories, setCategories] = useState<MonitoringCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [view, setView] = useState<"active" | "all">("active");
  const [categoryForm, setCategoryForm] = useState({
    code: "",
    name: "",
    description: "",
  });
  const [itemForm, setItemForm] = useState({ code: "", label: "" });
  const [pending, setPending] = useState<PendingToggle>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.getMonitoringCategories(token, true);
      setCategories(res.data.categories);
      setError(null);
      if (
        !selectedId ||
        !res.data.categories.some((c) => c.id === selectedId)
      ) {
        const first =
          res.data.categories.find((c) => c.isActive) ??
          res.data.categories[0];
        if (first) setSelectedId(first.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const visibleCategories =
    view === "active"
      ? categories.filter((c) => c.isActive)
      : categories;
  const selected =
    categories.find((c) => c.id === selectedId) ??
    visibleCategories[0] ??
    null;

  async function onCreateCategory(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    try {
      await api.createMonitoringCategory(token, {
        code: categoryForm.code.trim().toUpperCase(),
        name: categoryForm.name.trim(),
        description: categoryForm.description.trim() || undefined,
      });
      setCategoryForm({ code: "", name: "", description: "" });
      pushToast("Category created", "success");
      await load();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Create failed";
      setError(msg);
      pushToast(msg, "error");
    } finally {
      setBusy(false);
    }
  }

  async function onCreateItem(e: FormEvent) {
    e.preventDefault();
    if (!token || !selected) return;
    setBusy(true);
    try {
      await api.createMonitoringChecklistItem(token, selected.id, {
        code: itemForm.code.trim().toUpperCase(),
        label: itemForm.label.trim(),
      });
      setItemForm({ code: "", label: "" });
      pushToast("Checklist item created", "success");
      await load();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Create item failed";
      setError(msg);
      pushToast(msg, "error");
    } finally {
      setBusy(false);
    }
  }

  async function confirmToggle() {
    if (!token || !pending) return;
    setBusy(true);
    try {
      if (pending.kind === "category") {
        const cat = pending.item;
        await api.updateMonitoringCategory(token, cat.id, {
          isActive: !cat.isActive,
          archivedAt: cat.isActive ? new Date().toISOString() : null,
        });
        pushToast(
          cat.isActive ? "Category deactivated" : "Category activated",
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
      setBusy(false);
    }
  }

  if (!hasPermission("MONITORING_CHECKLIST_MANAGE")) {
    return (
      <ErrorState message="Only administrators can manage monitoring checklists." />
    );
  }

  const pendingActive =
    pending?.kind === "category"
      ? pending.item.isActive
      : pending?.item.isActive;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monitoring Checklists"
        description="Configuration for live monitoring categories and checklist items. Add or deactivate options without changing application code."
      />

      <form
        onSubmit={onCreateCategory}
        className="grid max-w-3xl gap-3 rounded border border-slate-200 bg-white p-4 sm:grid-cols-2"
      >
        <h2 className="text-sm font-semibold text-slate-900 sm:col-span-2">
          Add category
        </h2>
        <TextInput
          label="Code"
          hint="UPPER_SNAKE, unique"
          required
          value={categoryForm.code}
          onChange={(e) =>
            setCategoryForm({ ...categoryForm, code: e.target.value })
          }
          placeholder="CALL_QUALITY"
        />
        <TextInput
          label="Display name"
          required
          value={categoryForm.name}
          onChange={(e) =>
            setCategoryForm({ ...categoryForm, name: e.target.value })
          }
        />
        <div className="sm:col-span-2">
          <TextArea
            label="Description"
            rows={2}
            value={categoryForm.description}
            onChange={(e) =>
              setCategoryForm({
                ...categoryForm,
                description: e.target.value,
              })
            }
          />
        </div>
        <Button type="submit" disabled={busy} className="justify-self-start">
          {busy ? "Saving…" : "Add category"}
        </Button>
      </form>

      {error && <ErrorState message={error} onRetry={() => void load()} />}

      <SegmentedControl
        ariaLabel="Category view"
        value={view}
        onChange={setView}
        options={[
          { value: "active", label: "Active" },
          { value: "all", label: "All (incl. inactive)" },
        ]}
      />

      {loading && <TableSkeleton rows={4} />}

      {!loading && visibleCategories.length === 0 && (
        <EmptyState
          title={
            view === "active" ? "No active categories" : "No categories yet"
          }
          description="Create a category above. Monitoring sessions load checklists from this configuration."
        />
      )}

      {!loading && visibleCategories.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <Panel
            title="Categories"
            tone={view === "active" ? "active" : "history"}
          >
            <ul className="divide-y divide-slate-100 text-sm">
              {visibleCategories.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-400 ${
                      selected?.id === c.id
                        ? "bg-slate-100 font-medium text-slate-900"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                    onClick={() => setSelectedId(c.id)}
                    aria-current={selected?.id === c.id ? "true" : undefined}
                  >
                    <span className="truncate">{c.name}</span>
                    <StatusBadge
                      status={c.isActive ? "ACTIVE" : "INACTIVE"}
                    />
                  </button>
                </li>
              ))}
            </ul>
          </Panel>

          {selected && (
            <Panel
              title={selected.name}
              description={`${selected.code}${selected.description ? ` · ${selected.description}` : ""}`}
              tone={selected.isActive ? "active" : "history"}
              actions={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setPending({ kind: "category", item: selected })
                  }
                >
                  {selected.isActive ? "Deactivate" : "Activate"}
                </Button>
              }
            >
              <div className="space-y-4 p-1">
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Checklist items
                  </h3>
                  {selected.checklistItems.length === 0 ? (
                    <EmptyState
                      title="No checklist items"
                      description="Add items below. They appear when Commandos run monitoring in this category."
                    />
                  ) : (
                    <ul className="divide-y divide-slate-100 text-sm">
                      {selected.checklistItems.map((item) => (
                        <li
                          key={item.id}
                          className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                        >
                          <div className="min-w-0">
                            <p
                              className={
                                item.isActive
                                  ? "font-medium text-slate-900"
                                  : "text-slate-400 line-through"
                              }
                            >
                              {item.label}
                            </p>
                            <p className="font-mono text-xs text-slate-500">
                              {item.code}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusBadge
                              status={item.isActive ? "ACTIVE" : "INACTIVE"}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setPending({ kind: "item", item })
                              }
                            >
                              {item.isActive ? "Deactivate" : "Activate"}
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {selected.isActive && (
                  <form
                    onSubmit={onCreateItem}
                    className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-[1fr_2fr_auto]"
                  >
                    <TextInput
                      label="Item code"
                      required
                      value={itemForm.code}
                      onChange={(e) =>
                        setItemForm({ ...itemForm, code: e.target.value })
                      }
                      placeholder="GREETING"
                    />
                    <TextInput
                      label="Label"
                      required
                      value={itemForm.label}
                      onChange={(e) =>
                        setItemForm({ ...itemForm, label: e.target.value })
                      }
                      placeholder="Used proper greeting"
                    />
                    <div className="flex items-end">
                      <Button type="submit" disabled={busy}>
                        Add item
                      </Button>
                    </div>
                  </form>
                )}
                {!selected.isActive && (
                  <p className="rounded border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    Activate this category to add checklist items.
                  </p>
                )}
              </div>
            </Panel>
          )}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pending)}
        title={
          pendingActive
            ? pending?.kind === "category"
              ? "Deactivate category?"
              : "Deactivate checklist item?"
            : pending?.kind === "category"
              ? "Activate category?"
              : "Activate checklist item?"
        }
        message={
          pendingActive
            ? "Inactive options no longer appear in new monitoring sessions. Existing session answers stay unchanged."
            : "This option will appear again in new monitoring sessions."
        }
        confirmLabel={pendingActive ? "Deactivate" : "Activate"}
        danger={Boolean(pendingActive)}
        busy={busy}
        onCancel={() => setPending(null)}
        onConfirm={() => void confirmToggle()}
      />
    </div>
  );
}
