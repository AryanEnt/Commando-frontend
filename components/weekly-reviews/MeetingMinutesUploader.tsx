"use client";

import { useId, useRef, useState } from "react";
import { FileText, Paperclip, Upload, X } from "lucide-react";
import { api } from "@/lib/api";

export type MeetingMinutesPayload = {
  key: string;
  fileName: string;
  contentType: string;
  size?: number;
};

const MINUTES_ACCEPT =
  ".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp,application/pdf,image/*";
const MAX_MINUTES_BYTES = 10 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileKindLabel(file: File): string {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") return "PDF";
  if (name.endsWith(".doc") || name.endsWith(".docx")) return "Word";
  if (name.endsWith(".txt") || file.type.startsWith("text/")) return "Text";
  if (file.type.startsWith("image/")) return "Image";
  return "File";
}

export async function uploadMeetingMinutes(
  token: string,
  file: File,
): Promise<MeetingMinutesPayload> {
  const contentType = file.type || "application/octet-stream";
  const presign = await api.presignUpload(token, {
    purpose: "weekly-review-minutes",
    fileName: file.name,
    contentType,
    contentLength: file.size,
  });
  const put = await fetch(presign.data.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type":
        presign.data.headers["Content-Type"] ?? contentType,
    },
    body: file,
  });
  if (!put.ok) {
    throw new Error("Failed to upload meeting minutes to storage");
  }
  return {
    key: presign.data.key,
    fileName: file.name,
    contentType,
    size: file.size,
  };
}

export function MeetingMinutesUploader({
  file,
  onChange,
  disabled,
  compact,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  /** Tighter layout for the hub review column */
  compact?: boolean;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openPicker() {
    if (disabled) return;
    /* Programmatic click avoids label-focus scroll jumps on the hidden input. */
    inputRef.current?.click();
  }

  function pickFile(next: File | null) {
    setError(null);
    if (!next) {
      onChange(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (next.size > MAX_MINUTES_BYTES) {
      setError("File must be 10 MB or smaller.");
      return;
    }
    onChange(next);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    pickFile(e.target.files?.[0] ?? null);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    pickFile(e.dataTransfer.files?.[0] ?? null);
  }

  return (
    <section
      className={`wr-minutes${compact ? " is-compact" : ""}${
        file ? " has-file" : ""
      }${dragging ? " is-dragging" : ""}`}
    >
      <div className="wr-minutes-head">
        <div className="wr-minutes-head-icon" aria-hidden>
          <Paperclip size={compact ? 14 : 16} strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="wr-minutes-title-row">
            <h3 className="wr-minutes-title">Meeting minutes</h3>
            <span className="wr-minutes-optional">Optional</span>
          </div>
          <p className="wr-minutes-sub">
            Attach the signed PDF or notes for this week&apos;s review.
          </p>
        </div>
      </div>

      <div className="wr-minutes-body">
        {/*
          Keep the native input off-document-flow. Focusing a clipped in-flow
          input (e.g. Tailwind sr-only) makes the browser scroll it into view
          and leaves a large empty gap under the weekly review footer.
        */}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={MINUTES_ACCEPT}
          className="wr-minutes-input"
          tabIndex={-1}
          disabled={disabled}
          onChange={onInputChange}
        />

        {file ? (
          <div className="wr-minutes-file">
            <span className="wr-minutes-file-icon" aria-hidden>
              <FileText size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="wr-minutes-file-name">{file.name}</p>
              <p className="wr-minutes-file-meta">
                {fileKindLabel(file)} · {formatFileSize(file.size)} · Ready to
                upload on complete
              </p>
            </div>
            <div className="wr-minutes-file-actions">
              <button
                type="button"
                disabled={disabled}
                className="wr-minutes-btn"
                onClick={openPicker}
              >
                Replace
              </button>
              <button
                type="button"
                disabled={disabled}
                aria-label="Remove meeting minutes"
                className="wr-minutes-btn is-icon"
                onClick={() => pickFile(null)}
              >
                <X size={15} />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={openPicker}
            onDragEnter={(e) => {
              e.preventDefault();
              if (!disabled) setDragging(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (!disabled) setDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragging(false);
            }}
            onDrop={onDrop}
            className={`wr-minutes-drop${disabled ? " is-disabled" : ""}`}
          >
            <span className="wr-minutes-drop-icon" aria-hidden>
              <Upload size={18} />
            </span>
            <span className="wr-minutes-drop-title">
              Drop PDF here, or <em>browse</em>
            </span>
            <span className="wr-minutes-drop-hint">
              PDF, Word, text, or image · up to 10 MB
            </span>
          </button>
        )}

        {error ? (
          <p className="wr-minutes-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
