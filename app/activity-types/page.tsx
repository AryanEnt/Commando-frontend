"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { api, ApiError, type ActivityType } from "@/lib/api";
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

export default function ActivityTypesPage() {
  const { token, hasPermission } = useAuth();
  const { pushToast } = useToast();
  const [items, setItems] = useState<ActivityType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"active" | "all">("active");
  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
  });
  const [pendingToggle, setPendingToggle] = useState<ActivityType | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.getActivityTypes(token, true);
      setItems(res.data.activityTypes);
      setError(null);
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

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    try {
      await api.createActivityType(token, {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
      });
      setForm({ code: "", name: "", description: "" });
      pushToast("Activity type created", "success");
      await load();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Create failed";
      setError(msg);
      pushToast(msg, "error");
    } finally {
      setBusy(false);
    }
  }

  async function confirmToggle() {
    if (!token || !pendingToggle) return;
    setBusy(true);
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
      setBusy(false);
    }
  }

  if (!hasPermission("ACTIVITY_TYPE_MANAGE")) {
    return (
      <ErrorState message="Only administrators can manage activity types." />
    );
  }

  const visible =
    view === "active" ? items.filter((i) => i.isActive) : items;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity Types"
        description="Configuration catalog for Daily Log activity options. Changes apply immediately without redeploying the app."
      />

      <form
        onSubmit={onCreate}
        className="grid max-w-xl gap-3 rounded border border-slate-200 bg-white p-4"
      >
        <h2 className="text-sm font-semibold text-slate-900">Add activity type</h2>
        <TextInput
          label="Code"
          hint="UPPER_SNAKE, unique"
          required
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
          placeholder="FIELD_COACHING"
        />
        <TextInput
          label="Display name"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <TextArea
          label="Description"
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          hint="Shown to Commandos when selecting an activity"
        />
        <Button type="submit" disabled={busy} className="justify-self-start">
          {busy ? "Saving…" : "Create"}
        </Button>
      </form>

      {error && <ErrorState message={error} onRetry={() => void load()} />}

      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl
          ariaLabel="Activity type view"
          value={view}
          onChange={setView}
          options={[
            { value: "active", label: "Active" },
            { value: "all", label: "All (incl. inactive)" },
          ]}
        />
      </div>

      {loading && <TableSkeleton />}
      {!loading && visible.length === 0 && (
        <EmptyState
          title={view === "active" ? "No active activity types" : "No activity types"}
          description="Create a type above. Daily Log forms load options from this list."
        />
      )}

      {!loading && visible.length > 0 && (
        <Panel
          title={`${view === "active" ? "Active" : "All"} activity types · ${visible.length}`}
          tone={view === "active" ? "active" : "history"}
        >
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-mono text-xs">{item.code}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{item.name}</div>
                    {item.description && (
                      <div className="mt-0.5 whitespace-pre-wrap text-xs text-slate-500">
                        {item.description}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge
                      status={item.isActive ? "ACTIVE" : "INACTIVE"}
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPendingToggle(item)}
                    >
                      {item.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

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
        busy={busy}
        onCancel={() => setPendingToggle(null)}
        onConfirm={() => void confirmToggle()}
      />
    </div>
  );
}
