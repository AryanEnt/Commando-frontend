"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ImagePlus, Trash2, Upload } from "lucide-react";
import { api, type ActionItemDetail } from "@/lib/api";
import { formatDateTime } from "@/lib/dates";

const IMAGE_ACCEPT =
  "image/png,image/jpeg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

type Attachment = ActionItemDetail["attachments"][number];

export async function uploadActionItemImage(
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
    purpose: "action-item-image",
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
  actionItemId,
  attachment,
}: {
  token: string;
  actionItemId: string;
  attachment: Attachment;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.getActionItemAttachmentUrl(
          token,
          actionItemId,
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
  }, [token, actionItemId, attachment.id]);

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

export function ActionItemScreenshots({
  token,
  item,
  canUpload,
  canRemove,
  currentUserId,
  onItemUpdated,
}: {
  token: string;
  item: ActionItemDetail;
  canUpload: boolean;
  canRemove: boolean;
  currentUserId?: string;
  onItemUpdated: (item: ActionItemDetail) => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      if (!file.type.startsWith("image/")) {
        throw new Error("Choose a PNG, JPEG, WebP, or GIF image.");
      }
      if (file.size > MAX_IMAGE_BYTES) {
        throw new Error("Image must be 10 MB or smaller.");
      }
      const uploaded = await uploadActionItemImage(token, file);
      const res = await api.addActionItemAttachment(token, item.id, {
        ...uploaded,
      });
      onItemUpdated(res.data.actionItem);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function onRemove(attachmentId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await api.removeActionItemAttachment(
        token,
        item.id,
        attachmentId,
      );
      onItemUpdated(res.data.actionItem);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove image");
    } finally {
      setBusy(false);
    }
  }

  const attachments = item.attachments ?? [];

  return (
    <section className="rounded border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex items-start gap-2">
        <div className="mt-0.5 text-[var(--color-brand)]" aria-hidden>
          <ImagePlus size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">Screenshots</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Images upload as soon as you pick them.
          </p>
        </div>
      </div>

      {attachments.length === 0 ? (
        <p className="text-sm text-slate-500">No screenshots yet.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {attachments.map((a) => {
            const showRemove =
              canRemove &&
              !!currentUserId &&
              a.uploadedBy.id === currentUserId;
            return (
              <li
                key={a.id}
                className="overflow-hidden rounded border border-slate-200 bg-white"
              >
                <AttachmentThumb
                  token={token}
                  actionItemId={item.id}
                  attachment={a}
                />
                <div className="space-y-1 p-2.5">
                  <p className="truncate text-xs font-medium text-slate-800">
                    {a.caption || a.fileName}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {formatDateTime(a.createdAt)} · {personName(a.uploadedBy)}
                  </p>
                  {showRemove ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void onRemove(a.id)}
                      className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline disabled:opacity-50"
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
        <div className="border-t border-slate-100 pt-3">
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={IMAGE_ACCEPT}
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              if (file) void uploadFile(file);
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            <Upload size={16} />
            {busy ? "Uploading…" : "Add screenshot / image"}
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
