"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { api, ApiError, type ActivityType } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { StatusBadge } from "@/components/StatusBadge";
import { AdminActionMenu } from "@/components/admin/AdminActionMenu";
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

type Draft = {
  code: string;
  name: string;
  description: string;
};

const emptyDraft: Draft = { code: "", name: "", description: "" };

export default function ActivityTypesPage() {
  const { token, hasPermission } = useAuth();
  const { pushToast } = useToast();
  const [items, setItems] = useState<ActivityType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"active" | "all">("active");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<ActivityType | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pendingToggle, setPendingToggle] = useState<ActivityType | null>(null);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.getActivityTypes(token, {
        includeInactive: view === "all",
        search: search.trim() || undefined,
        page,
        pageSize,
      });
      setItems(res.data.activityTypes);
      setTotal(res.data.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load activity types");
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

  function openCreate() {
    setEditing(null);
    setDraft(emptyDraft);
    setFieldErrors({});
    setDrawerMode("create");
  }

  function openEdit(item: ActivityType) {
    setEditing(item);
    setDraft({
      code: item.code,
      name: item.name,
      description: item.description ?? "",
    });
    setFieldErrors({});
    setDrawerMode("edit");
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (drawerMode === "create" && !draft.code.trim()) {
      next.code = "Code is required";
    }
    if (!draft.name.trim()) next.name = "Name is required";
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!token || !validate()) return;
    setSaving(true);
    setError(null);
    try {
      if (drawerMode === "create") {
        await api.createActivityType(token, {
          code: draft.code.trim().toUpperCase(),
          name: draft.name.trim(),
          description: draft.description.trim() || undefined,
        });
        pushToast("Activity type created successfully", "success");
      } else if (editing) {
        await api.updateActivityType(token, editing.id, {
          name: draft.name.trim(),
          description: draft.description.trim() || null,
        });
        pushToast("Activity type updated successfully", "success");
      }
      setDrawerMode(null);
      await load();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Could not save this activity type";
      pushToast(msg, "error");
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function confirmToggle() {
    if (!token || !pendingToggle) return;
    setToggling(true);
    try {
      await api.updateActivityType(token, pendingToggle.id, {
        isActive: !pendingToggle.isActive,
        archivedAt: pendingToggle.isActive
          ? new Date().toISOString()
          : null,
      });
      pushToast(
        pendingToggle.isActive
          ? "Activity type deactivated"
          : "Activity type activated",
        "success",
      );
      setPendingToggle(null);
      await load();
    } catch (err) {
      pushToast(
        err instanceof Error ? err.message : "Update failed",
        "error",
      );
    } finally {
      setToggling(false);
    }
  }

  if (!hasPermission("ACTIVITY_TYPE_MANAGE")) {
    return (
      <ErrorState message="You do not have permission to manage activity types." />
    );
  }

  return (
    <AdminPageShell
      breadcrumb={[{ label: "Activity Types" }]}
      title="Activity Types"
      description="Define the activity options available in Daily Log forms across the platform. Changes apply immediately."
      actions={
        <Button onClick={openCreate}>+ Create activity type</Button>
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
              placeholder="Search by name, code, or description…"
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
              onClick={() => {
                setPage(1);
                setSearch("");
              }}
              className="mb-0.5"
            >
              Clear search
            </Button>
          ) : null}
        </AdminToolbar>
      }
    >
      {error && !drawerMode ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : null}

      {!loading && (
        <AdminResultCount
          filtered={total}
          total={total}
          noun="activity types"
        />
      )}

      {loading && <TableSkeleton rows={6} />}

      {!loading && items.length === 0 && (
        <EmptyState
          title={
            search
              ? "No matching activity types"
              : view === "active"
                ? "No active activity types"
                : "No activity types yet"
          }
          description={
            search
              ? "Try a different search term or clear filters."
              : "Create an activity type so Commandos and Team Leads can log coaching sessions."
          }
          action={
            !search ? (
              <div className="mt-4">
                <Button onClick={openCreate}>+ Create activity type</Button>
              </div>
            ) : undefined
          }
        />
      )}

      {!loading && items.length > 0 && (
        <>
          <AdminTable>
            <thead>
              <tr>
                <AdminTh>Activity type</AdminTh>
                <AdminTh>Code</AdminTh>
                <AdminTh>Status</AdminTh>
                <AdminTh className="text-right">Actions</AdminTh>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <AdminTd>
                    <div className="font-medium">{item.name}</div>
                    {item.description ? (
                      <p className="mt-0.5 line-clamp-2 text-xs text-[var(--color-ink-muted)]">
                        {item.description}
                      </p>
                    ) : null}
                  </AdminTd>
                  <AdminTd className="font-mono text-xs text-[var(--color-ink-muted)]">
                    {item.code}
                  </AdminTd>
                  <AdminTd>
                    <StatusBadge
                      status={item.isActive ? "ACTIVE" : "INACTIVE"}
                      label={item.isActive ? "Active" : "Inactive"}
                    />
                  </AdminTd>
                  <AdminTd className="text-right">
                    <AdminActionMenu
                      items={[
                        {
                          label: "Edit",
                          onSelect: () => openEdit(item),
                        },
                        {
                          label: item.isActive ? "Deactivate" : "Activate",
                          tone: item.isActive ? "danger" : "default",
                          onSelect: () => setPendingToggle(item),
                        },
                      ]}
                    />
                  </AdminTd>
                </tr>
              ))}
            </tbody>
          </AdminTable>
          <PaginationControls
            page={page}
            pageSize={pageSize}
            total={total}
            disabled={loading}
            noun="activity types"
            onPageChange={setPage}
            onPageSizeChange={(n) => {
              setPage(1);
              setPageSize(n);
            }}
          />
        </>
      )}

      <Drawer
        open={drawerMode !== null}
        title={
          drawerMode === "create"
            ? "Create activity type"
            : "Edit activity type"
        }
        description="Activity types appear in Daily Log selectors when active."
        onClose={() => !saving && setDrawerMode(null)}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              disabled={saving}
              onClick={() => setDrawerMode(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="activity-type-form"
              disabled={saving}
            >
              {saving
                ? "Saving…"
                : drawerMode === "create"
                  ? "Create"
                  : "Save changes"}
            </Button>
          </div>
        }
      >
        <form id="activity-type-form" onSubmit={onSave} className="space-y-5">
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-subtle)]">
              Basic information
            </h3>
            {drawerMode === "create" ? (
              <TextInput
                label="Code"
                hint="Unique identifier · UPPER_SNAKE"
                required
                value={draft.code}
                onChange={(e) =>
                  setDraft({ ...draft, code: e.target.value })
                }
                error={fieldErrors.code}
                placeholder="FIELD_COACHING"
              />
            ) : (
              <div>
                <p className="text-sm font-medium">Code</p>
                <p className="mt-1 font-mono text-sm text-[var(--color-ink-muted)]">
                  {draft.code}
                </p>
                <p className="mt-1 text-xs text-[var(--color-ink-subtle)]">
                  Codes cannot be changed after creation.
                </p>
              </div>
            )}
            <TextInput
              label="Display name"
              required
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              error={fieldErrors.name}
            />
            <TextArea
              label="Description"
              hint="Shown when selecting an activity in Daily Logs"
              rows={3}
              value={draft.description}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
            />
          </section>
          {error && drawerMode ? <ErrorState message={error} /> : null}
        </form>
      </Drawer>

      <ConfirmDialog
        open={Boolean(pendingToggle)}
        title={
          pendingToggle?.isActive
            ? "Deactivate activity type?"
            : "Activate activity type?"
        }
        message={
          pendingToggle?.isActive
            ? `"${pendingToggle?.name}" will no longer appear in new Daily Logs. Existing logs keep their historical type.`
            : `"${pendingToggle?.name}" will appear in Daily Log selectors again.`
        }
        confirmLabel={pendingToggle?.isActive ? "Deactivate" : "Activate"}
        danger={pendingToggle?.isActive}
        busy={toggling}
        onCancel={() => setPendingToggle(null)}
        onConfirm={() => void confirmToggle()}
      />
    </AdminPageShell>
  );
}
