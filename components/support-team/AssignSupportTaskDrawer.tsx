"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  api,
  ApiError,
  type SalesSupportLink,
  type SupportTask,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { personName, responsibilityTypeLabel } from "@/lib/labels";
import { useToast } from "@/lib/toast-context";
import {
  Button,
  Drawer,
  TextArea,
  TextInput,
} from "@/components/ui";
import { SearchableSelect } from "@/components/SearchableSelect";

function InstructionList({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-[var(--color-ink)]">{label}</p>
        <button
          type="button"
          className="text-xs font-medium text-[var(--color-brand)] hover:underline"
          onClick={() => onChange([...values, ""])}
        >
          + Add
        </button>
      </div>
      {values.map((value, index) => (
        <div key={index} className="flex gap-2">
          <input
            className="w-full rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-white px-3 py-2 text-sm"
            value={value}
            onChange={(e) => {
              const next = [...values];
              next[index] = e.target.value;
              onChange(next);
            }}
            placeholder={`${label} instruction…`}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onChange(values.filter((_, i) => i !== index))}
            disabled={values.length <= 1}
          >
            ×
          </Button>
        </div>
      ))}
    </div>
  );
}

type Props = {
  open: boolean;
  onClose: () => void;
  profileId: string;
  profileName: string;
  activeLinks: SalesSupportLink[];
  presetLinkId?: string | null;
  onCreated: (task: SupportTask) => void;
};

export function AssignSupportTaskDrawer({
  open,
  onClose,
  profileId,
  profileName,
  activeLinks,
  presetLinkId = null,
  onCreated,
}: Props) {
  const { token } = useAuth();
  const { pushToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [linkId, setLinkId] = useState(presetLinkId ?? "");
  const [shouldDo, setShouldDo] = useState<string[]>([""]);
  const [shouldNotDo, setShouldNotDo] = useState<string[]>([""]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setTitle("");
    setPurpose("");
    setDescription("");
    setDueDate("");
    setShouldDo([""]);
    setShouldNotDo([""]);
    setLinkId(
      presetLinkId ??
        activeLinks[0]?.id ??
        "",
    );
  }, [open, presetLinkId, activeLinks]);

  const selectedLink = activeLinks.find((l) => l.id === linkId) ?? null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token || !selectedLink) return;
    const doItems = shouldDo.map((s) => s.trim()).filter(Boolean);
    const dontItems = shouldNotDo.map((s) => s.trim()).filter(Boolean);
    if (!title.trim()) {
      setError("Task title is required");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api.createSupportTask(token, {
        title: title.trim(),
        purpose: purpose.trim() || null,
        description: description.trim() || null,
        salesExecutiveProfileId: profileId,
        salesSupportUserId: selectedLink.salesSupportUserId,
        dueDate: dueDate
          ? new Date(`${dueDate}T00:00:00.000Z`).toISOString()
          : null,
        shouldDo: doItems,
        shouldNotDo: dontItems,
      });
      pushToast("Support task assigned", "success");
      onCreated(res.data.task);
      onClose();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Could not assign task";
      setError(msg);
      pushToast(msg, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Assign task to Sales Support"
      description={`${profileName} — task-specific instructions for the assignee.`}
    >
      <form onSubmit={onSubmit} className="space-y-4 p-4">
        <TextInput
          label="Task"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Customer follow-up"
        />
        <TextArea
          label="What needs to be done / purpose"
          rows={3}
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          placeholder="Follow up with the customer regarding…"
        />
        <TextArea
          label="Additional details"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <SearchableSelect
          label="Assign to"
          value={linkId}
          onChange={setLinkId}
          allowClear={false}
          placeholder={
            activeLinks.length === 0
              ? "No active Support assigned"
              : "Select Support…"
          }
          disabled={activeLinks.length === 0}
          options={activeLinks.map((link) => ({
            value: link.id,
            label: `${personName(link.supportUser)}${
              link.responsibilityType
                ? ` · ${responsibilityTypeLabel(link.responsibilityType)}`
                : ""
            }`,
          }))}
        />

        <TextInput
          label="Due date"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />

        <InstructionList label="DO" values={shouldDo} onChange={setShouldDo} />
        <InstructionList
          label="DON'T"
          values={shouldNotDo}
          onChange={setShouldNotDo}
        />

        {error && (
          <p className="text-sm text-[var(--status-danger)]" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            type="submit"
            disabled={busy || !selectedLink || activeLinks.length === 0}
          >
            {busy ? "Assigning…" : "Assign task"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
