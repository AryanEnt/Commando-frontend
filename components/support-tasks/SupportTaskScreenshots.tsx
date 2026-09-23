"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ImagePlus, Trash2, Upload, X } from "lucide-react";
import { api, type SupportTask } from "@/lib/api";
import { formatDateTime } from "@/lib/dates";
import { Button } from "@/components/ui";

const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export type SupportTaskAttachment = SupportTask["attachments"][number];

export async function uploadSupportTaskImage(
  token: string,
  file: File,
): Promise<{
  key: string;
  fileName: string;
  contentType: string;
  size: number;
}> {
  const contentType = file.type || "image/png";
  const res = await api.uploadObject(token, {
    purpose: "support-task-image",
    fileName: file.name,
    contentType,
    file,
  });
  return {
    key: res.data.key,
    fileName: res.data.fileName,
    contentType: res.data.contentType,
    size: res.data.size,
  };
}

function personName(u: { firstName: string; lastName: string } | null) {
  if (!u) return "—";
  return `${u.firstName} ${u.lastName}`;
}

function AttachmentThumb({
  token,
  taskId,
  attachment,
}: {
  token: string;
  taskId: string;
  attachment: SupportTaskAttachment;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.getSupportTaskAttachmentUrl(
          token,
          taskId,
          attachment.id,
        );
        if (!cancelled) setUrl(res.data.url);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, taskId, attachment.id]);

  if (failed) {
    return (
      <div className="flex h-28 items-center justify-center bg-slate-100 text-xs text-slate-500">
        Preview unavailable
      </div>
    );
  }

  if (!url) {
    return (
      <div className="flex h-28 items-center justify-center bg-slate-50 text-xs text-slate-400">
        Loading…
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <a href={url} target="_blank" rel="noreferrer" className="block">
      <img
        src={url}
        alt={attachment.caption || attachment.fileName}
        className="h-28 w-full object-cover"
      />
    </a>
  );
}

export function SupportTaskScreenshots({
  token,
  task,
  canUpload,
  currentUserId,
  onTaskUpdated,
}: {
  token: string;
  task: SupportTask;
  canUpload: boolean;
  currentUserId?: string;
  onTaskUpdated: (task: SupportTask) => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [pending, setPending] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pending) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(pending);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pending]);

  function pickFile(file: File | null) {
    setError(null);
    if (!file) {
      setPending(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Choose a PNG, JPEG, WebP, or GIF image.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("Image must be 10 MB or smaller.");
      return;
    }
    setPending(file);
  }

  async function onUpload() {
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      const uploaded = await uploadSupportTaskImage(token, pending);
      const res = await api.addSupportTaskAttachment(token, task.id, {
        ...uploaded,
        caption: caption.trim() || null,
      });
      onTaskUpdated(res.data.task);
      setPending(null);
      setCaption("");
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(attachmentId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await api.removeSupportTaskAttachment(
        token,
        task.id,
        attachmentId,
      );
      onTaskUpdated(res.data.task);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove image");
    } finally {
      setBusy(false);
    }
  }

  const attachments = task.attachments ?? [];

  return (
    <section className="surface space-y-3 p-4">
      <div className="flex items-start gap-2">
        <div className="mt-0.5 text-[var(--color-brand)]" aria-hidden>
          <ImagePlus size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">Screenshots</h2>
          <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
            Evidence images are stored in Cloudflare R2.
          </p>
        </div>
      </div>

      {attachments.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-muted)]">
          No screenshots yet.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {attachments.map((a) => {
            const canRemove =
              !!currentUserId && a.uploadedBy.id === currentUserId;
            return (
              <li
                key={a.id}
                className="overflow-hidden rounded border border-[var(--color-line)] bg-white"
              >
                <AttachmentThumb
                  token={token}
                  taskId={task.id}
                  attachment={a}
                />
                <div className="space-y-1 p-2.5">
                  <p className="truncate text-xs font-medium text-slate-800">
                    {a.caption || a.fileName}
                  </p>
                  <p className="text-[11px] text-[var(--color-ink-subtle)]">
                    {formatDateTime(a.createdAt)} · {personName(a.uploadedBy)}
                  </p>
                  {canRemove ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void onRemove(a.id)}
                      className="inline-flex items-center gap-1 text-xs text-[var(--status-danger)] hover:underline disabled:opacity-50"
                    >
                      <Trash2 size={12} />
                      Remove
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {canUpload ? (
        <div className="space-y-2 border-t border-[var(--color-line)] pt-3">
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={IMAGE_ACCEPT}
            className="sr-only"
            disabled={busy}
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />

          {pending && previewUrl ? (
            <div className="flex gap-3 rounded border border-[var(--color-line)] p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Selected screenshot preview"
                className="h-20 w-28 rounded object-cover"
              />
              <div className="min-w-0 flex-1 space-y-2">
                <p className="truncate text-sm font-medium">{pending.name}</p>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Optional caption"
                  maxLength={500}
                  className="w-full rounded border border-[var(--color-line)] px-2 py-1.5 text-sm"
                  disabled={busy}
                />
                <div className="flex flex-wrap gap-2">
                  <Button type="button" disabled={busy} onClick={() => void onUpload()}>
                    {busy ? "Uploading…" : "Upload screenshot"}
                  </Button>
                  <button
                    type="button"
                    disabled={busy}
                    aria-label="Clear selected image"
                    className="inline-flex items-center gap-1 text-sm text-slate-600 hover:underline"
                    onClick={() => pickFile(null)}
                  >
                    <X size={14} />
                    Clear
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded border border-dashed border-[var(--color-line)] bg-slate-50 px-3 py-4 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              <Upload size={16} />
              Add screenshot / image
            </button>
          )}
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-[var(--status-danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
