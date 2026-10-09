"use client";

import { useEffect, useRef, useState } from "react";
import { Paperclip, RefreshCw, X } from "lucide-react";
import {
  api,
  type DailyWorkLogAttachment,
  type DailyWorkLogAttachmentUpload,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { IconButton } from "@/components/ui";

const IMAGE_ACCEPT =
  "image/png,image/jpeg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif";
const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_EVIDENCE_FILES = 5;

type PendingEvidence = DailyWorkLogAttachmentUpload & { previewUrl: string };
type ReplaceTarget = { existingId: string } | { pendingKey: string } | null;

async function uploadEvidence(
  token: string,
  file: File,
): Promise<DailyWorkLogAttachmentUpload> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Choose a PNG, JPEG, WebP, or GIF image.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image must be 10 MB or smaller.");
  }
  const res = await api.uploadObject(token, {
    purpose: "daily-work-log-image",
    fileName: file.name || "screenshot.png",
    contentType: file.type,
    file,
  });
  return {
    key: res.data.key,
    fileName: res.data.fileName,
    contentType: res.data.contentType,
    size: res.data.size,
  };
}

/** Screenshot evidence state for a work log form (saved files + new uploads). */
export function useWorkEvidence(initial: DailyWorkLogAttachment[] = []) {
  const { token } = useAuth();
  const [existing, setExisting] = useState<DailyWorkLogAttachment[]>(initial);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [pending, setPending] = useState<PendingEvidence[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<ReplaceTarget>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const pendingRef = useRef(pending);
  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);
  useEffect(
    () => () => pendingRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl)),
    [],
  );

  function removeExisting(id: string) {
    setExisting((prev) => prev.filter((a) => a.id !== id));
    setRemovedIds((prev) => [...prev, id]);
  }

  function removePending(key: string) {
    setPending((prev) => {
      const target = prev.find((p) => p.key === key);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.key !== key);
    });
  }

  function pickFile(target: ReplaceTarget) {
    setReplaceTarget(target);
    fileRef.current?.click();
  }

  async function onFileChosen(file: File | undefined) {
    if (!token || !file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const uploaded = await uploadEvidence(token, file);
      if (replaceTarget && "existingId" in replaceTarget) {
        removeExisting(replaceTarget.existingId);
      } else if (replaceTarget && "pendingKey" in replaceTarget) {
        removePending(replaceTarget.pendingKey);
      }
      setPending((prev) => [
        ...prev,
        { ...uploaded, previewUrl: URL.createObjectURL(file) },
      ]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setReplaceTarget(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const uploads: DailyWorkLogAttachmentUpload[] = pending.map(
    ({ key, fileName, contentType, size }) => ({ key, fileName, contentType, size }),
  );

  return {
    existing,
    pending,
    removedIds,
    uploads,
    uploading,
    uploadError,
    fileRef,
    removeExisting,
    removePending,
    pickFile,
    onFileChosen,
  };
}

export type WorkEvidence = ReturnType<typeof useWorkEvidence>;

export function WorkEvidenceField({ evidence }: { evidence: WorkEvidence }) {
  const { existing, pending, uploading, uploadError, fileRef } = evidence;
  const fileCount = existing.length + pending.length;

  return (
    <div className="wl-evidence">
      <input
        ref={fileRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => void evidence.onFileChosen(e.target.files?.[0])}
      />
      {existing.map((a) => (
        <EvidenceFile
          key={a.id}
          name={a.fileName}
          url={a.url}
          busy={uploading}
          onReplace={() => evidence.pickFile({ existingId: a.id })}
          onRemove={() => evidence.removeExisting(a.id)}
        />
      ))}
      {pending.map((p) => (
        <EvidenceFile
          key={p.key}
          name={p.fileName}
          url={p.previewUrl}
          busy={uploading}
          onReplace={() => evidence.pickFile({ pendingKey: p.key })}
          onRemove={() => evidence.removePending(p.key)}
        />
      ))}
      {fileCount < MAX_EVIDENCE_FILES ? (
        <button
          type="button"
          className="wl-evidence-add"
          disabled={uploading}
          onClick={() => evidence.pickFile(null)}
        >
          <Paperclip size={14} strokeWidth={2} aria-hidden />
          {uploading ? "Uploading…" : fileCount === 0 ? "Add evidence" : "Add another"}
          {fileCount === 0 && !uploading ? (
            <span className="wl-evidence-optional">Optional</span>
          ) : null}
        </button>
      ) : null}
      {uploadError ? (
        <p className="wl-evidence-error" role="alert">
          {uploadError}
        </p>
      ) : null}
    </div>
  );
}

function EvidenceFile({
  name,
  url,
  busy,
  onReplace,
  onRemove,
}: {
  name: string;
  url: string | null;
  busy: boolean;
  onReplace: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="wl-evidence-file">
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="wl-evidence-thumb">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" />
        </a>
      ) : (
        <Paperclip size={14} strokeWidth={2} aria-hidden />
      )}
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="wl-evidence-name" title={name}>
          {name}
        </a>
      ) : (
        <span className="wl-evidence-name" title={name}>
          {name}
        </span>
      )}
      <IconButton label={`Replace ${name}`} size="sm" disabled={busy} onClick={onReplace}>
        <RefreshCw size={13} strokeWidth={2} aria-hidden />
      </IconButton>
      <IconButton label={`Remove ${name}`} size="sm" disabled={busy} onClick={onRemove}>
        <X size={14} strokeWidth={2} aria-hidden />
      </IconButton>
    </div>
  );
}
