"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  api,
  type DailyLogAttachmentUpload,
  type DailyLogEntryAttachment,
} from "@/lib/api";

export const DAILY_LOG_IMAGE_ACCEPT =
  "image/png,image/jpeg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif";
export const MAX_DAILY_LOG_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_DAILY_LOG_SCREENSHOTS = 5;

export async function uploadDailyLogImage(
  token: string,
  file: File,
): Promise<DailyLogAttachmentUpload> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose a PNG, JPEG, WebP, or GIF image.");
  }
  if (file.size > MAX_DAILY_LOG_IMAGE_BYTES) {
    throw new Error("Image must be 10 MB or smaller.");
  }
  const res = await api.uploadObject(token, {
    purpose: "daily-log-image",
    fileName: file.name,
    contentType: file.type || "image/png",
    file,
  });
  return {
    key: res.data.key,
    fileName: res.data.fileName,
    contentType: res.data.contentType,
    size: res.data.size,
  };
}

function SavedThumb({
  token,
  logId,
  entryId,
  attachment,
}: {
  token: string;
  logId: string;
  entryId: string;
  attachment: DailyLogEntryAttachment;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void api
      .getDailyLogAttachmentUrl(token, logId, entryId, attachment.id)
      .then((res) => {
        if (!cancelled) setUrl(res.data.url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [token, logId, entryId, attachment.id]);

  if (failed || !url) {
    return (
      <div className="flex h-24 items-center justify-center bg-[var(--color-surface-2)] text-[11px] text-[var(--color-ink-subtle)]">
        {failed ? "Preview unavailable" : "Loading…"}
      </div>
    );
  }

  return (
    <a href={url} target="_blank" rel="noreferrer" className="block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={attachment.caption || attachment.fileName}
        className="h-24 w-full object-cover"
      />
    </a>
  );
}

export function DailyLogAttachmentGrid({
  token,
  logId,
  entryId,
  attachments,
  currentUserId,
  canRemove,
  busy,
  onRemove,
}: {
  token: string;
  logId: string;
  entryId: string;
  attachments: DailyLogEntryAttachment[];
  currentUserId?: string;
  canRemove: boolean;
  busy?: boolean;
  onRemove?: (attachmentId: string) => void;
}) {
  if (attachments.length === 0) return null;

  return (
    <div className="mt-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-subtle)]">
        Screenshots
      </p>
      <ul className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {attachments.map((a) => (
          <li
            key={a.id}
            className="overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)]"
          >
            <SavedThumb
              token={token}
              logId={logId}
              entryId={entryId}
              attachment={a}
            />
            <div className="flex items-center justify-between gap-2 px-2 py-1.5">
              <span className="truncate text-[11px] text-[var(--color-ink-muted)]">
                {a.caption || a.fileName}
              </span>
              {canRemove && onRemove && a.uploadedBy.id === currentUserId ? (
                <button
                  type="button"
                  disabled={busy}
                  aria-label={`Remove ${a.fileName}`}
                  onClick={() => onRemove(a.id)}
                  className="shrink-0 text-[var(--color-ink-subtle)] hover:text-[var(--status-danger)] disabled:opacity-50"
                >
                  <Trash2 size={13} />
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
