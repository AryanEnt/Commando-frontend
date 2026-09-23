"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { api, type ActionItem } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/dates";
import {
  currentWeekMondayYmd,
  formatWeekRangeLabel,
  parseYmd,
  toYmd,
} from "@/lib/week";
import { Button, TextArea, TextInput, inputClass, labelClass } from "@/components/ui";
import {
  MeetingMinutesUploader,
  uploadMeetingMinutes,
  type MeetingMinutesPayload,
} from "@/components/weekly-reviews/MeetingMinutesUploader";

export type FollowUpDraft = {
  actionItemId: string;
  title: string;
  status: "COMPLETED" | "ACTIVE" | "CANCELLED";
  originLabel: string | null;
};

export type WeeklyReviewCreatePayload = {
  weekLabel: string;
  weekStartDate: string;
  meetingDate: string;
  roomName: string;
  meetingTime: string;
  meetingMinutes?: MeetingMinutesPayload | null;
  performanceSummary: string;
  whatWentWell: string;
  improvement: string;
  nextWeekActions: string[];
  followUpActions: Array<{
    actionItemId: string;
    status: "COMPLETED" | "ACTIVE" | "CANCELLED";
  }>;
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function sundayFromMonday(mondayYmd: string): string {
  const d = parseYmd(mondayYmd);
  d.setUTCDate(d.getUTCDate() + 6);
  return toYmd(d);
}

function defaultWeekLabel(mondayYmd: string): string {
  return `Week of ${formatWeekRangeLabel(mondayYmd, sundayFromMonday(mondayYmd))}`;
}

function defaultMeetingTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

type Props = {
  profileId?: string;
  submitting: boolean;
  /** YYYY-MM-DD Monday (or any day in week) from hub. */
  initialWeekStart?: string;
  onSubmit: (payload: WeeklyReviewCreatePayload) => void | Promise<void>;
};

export function WeeklyReviewCreateForm({
  profileId,
  submitting,
  initialWeekStart,
  onSubmit,
}: Props) {
  const { token } = useAuth();
  const monday =
    initialWeekStart && /^\d{4}-\d{2}-\d{2}$/.test(initialWeekStart)
      ? initialWeekStart
      : currentWeekMondayYmd();
  const [weekLabel, setWeekLabel] = useState(() => defaultWeekLabel(monday));
  const [weekStartDate, setWeekStartDate] = useState(monday);
  const [meetingDate, setMeetingDate] = useState(todayIsoDate());
  const [roomName, setRoomName] = useState("");
  const [meetingTime, setMeetingTime] = useState(defaultMeetingTime);
  const [minutesFile, setMinutesFile] = useState<File | null>(null);
  const [performanceSummary, setPerformanceSummary] = useState("");
  const [whatWentWell, setWhatWentWell] = useState("");
  const [improvement, setImprovement] = useState("");
  const [newActions, setNewActions] = useState<string[]>([""]);
  const [followUps, setFollowUps] = useState<FollowUpDraft[]>([]);
  const [loadingFollowUps, setLoadingFollowUps] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!token || !profileId) {
      setLoadingFollowUps(false);
      setFollowUps([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoadingFollowUps(true);
      try {
        const res = await api.getActionItems(token, {
          profileId,
          view: "active",
          pageSize: 50,
        });
        if (cancelled) return;
        const items = res.data.actionItems.filter(
          (a: ActionItem) => a.status === "ACTIVE",
        );
        setFollowUps(
          items.map((a) => ({
            actionItemId: a.id,
            title: a.title,
            status: "ACTIVE" as const,
            originLabel: a.weeklyReview?.weekLabel
              ? `Weekly Review — ${a.weeklyReview.weekLabel}`
              : a.createdAt
                ? `Created ${formatDate(a.createdAt)}`
                : null,
          })),
        );
      } catch {
        if (!cancelled) setFollowUps([]);
      } finally {
        if (!cancelled) setLoadingFollowUps(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, profileId]);

  function setFollowUpStatus(
    id: string,
    status: FollowUpDraft["status"],
  ) {
    setFollowUps((prev) =>
      prev.map((f) => (f.actionItemId === id ? { ...f, status } : f)),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    const nextWeekActions = newActions.map((s) => s.trim()).filter(Boolean);
    let meetingMinutes: WeeklyReviewCreatePayload["meetingMinutes"] = null;
    if (minutesFile) {
      setUploading(true);
      try {
        meetingMinutes = await uploadMeetingMinutes(token, minutesFile);
      } finally {
        setUploading(false);
      }
    }
    await onSubmit({
      weekLabel: weekLabel.trim(),
      weekStartDate,
      meetingDate,
      roomName: roomName.trim(),
      meetingTime,
      meetingMinutes,
      performanceSummary: performanceSummary.trim(),
      whatWentWell: whatWentWell.trim(),
      improvement: improvement.trim(),
      nextWeekActions,
      followUpActions: followUps.map((f) => ({
        actionItemId: f.actionItemId,
        status: f.status,
      })),
    });
  }

  const busy = submitting || uploading;

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="space-y-5 border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
    >
      <TextInput
        label="Week label"
        required
        value={weekLabel}
        onChange={(e) => setWeekLabel(e.target.value)}
        placeholder="e.g. Week of Sep 8"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput
          label="Week start date"
          type="date"
          required
          value={weekStartDate}
          onChange={(e) => setWeekStartDate(e.target.value)}
        />
        <TextInput
          label="Meeting date"
          type="date"
          required
          value={meetingDate}
          onChange={(e) => setMeetingDate(e.target.value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput
          label="Room name"
          required
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          placeholder="e.g. Conference Room A"
        />
        <TextInput
          label="Meeting time"
          type="time"
          required
          value={meetingTime}
          onChange={(e) => setMeetingTime(e.target.value)}
        />
      </div>

      <MeetingMinutesUploader
        file={minutesFile}
        onChange={setMinutesFile}
        disabled={busy}
      />

      <TextArea
        label="Performance summary"
        required
        rows={3}
        value={performanceSummary}
        onChange={(e) => setPerformanceSummary(e.target.value)}
      />
      <TextArea
        label="What went well"
        required
        rows={3}
        value={whatWentWell}
        onChange={(e) => setWhatWentWell(e.target.value)}
      />
      <TextArea
        label="Needs improvement"
        required
        rows={3}
        value={improvement}
        onChange={(e) => setImprovement(e.target.value)}
      />

      <section className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-2)]/50 p-4">
        <h3 className="text-sm font-semibold text-[var(--color-ink)]">
          Follow-up from previous review
        </h3>
        <p className="mt-1 text-[13px] text-[var(--color-ink-muted)]">
          Outstanding commitments carry forward. Tick to mark completed — they
          stay open until you do.
        </p>
        {loadingFollowUps ? (
          <p className="mt-3 text-meta">Loading previous actions…</p>
        ) : followUps.length === 0 ? (
          <p className="mt-3 text-[13px] text-[var(--color-ink-subtle)]">
            No open actions to carry forward.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {followUps.map((f) => {
              const done = f.status === "COMPLETED";
              const cancelled = f.status === "CANCELLED";
              return (
                <li
                  key={f.actionItemId}
                  className="rounded-[10px] border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2.5"
                >
                  <label className="flex cursor-pointer items-start gap-2.5">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-[var(--color-line-strong)] text-[var(--color-brand)] focus:ring-[var(--color-brand)]"
                      checked={done}
                      disabled={cancelled}
                      onChange={(e) =>
                        setFollowUpStatus(
                          f.actionItemId,
                          e.target.checked ? "COMPLETED" : "ACTIVE",
                        )
                      }
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block text-[14px] font-medium ${
                          done || cancelled
                            ? "text-[var(--color-ink-muted)] line-through"
                            : "text-[var(--color-ink)]"
                        }`}
                      >
                        {f.title}
                      </span>
                      <span className="mt-0.5 block text-[12px] text-[var(--color-ink-subtle)]">
                        {cancelled
                          ? "Cancelled"
                          : done
                            ? "Completed"
                            : "Not completed"}
                        {f.originLabel ? ` · ${f.originLabel}` : ""}
                      </span>
                    </span>
                  </label>
                  {!done ? (
                    <button
                      type="button"
                      className="mt-2 text-[12px] font-medium text-[var(--color-ink-muted)] hover:text-[var(--status-danger)]"
                      onClick={() =>
                        setFollowUpStatus(
                          f.actionItemId,
                          cancelled ? "ACTIVE" : "CANCELLED",
                        )
                      }
                    >
                      {cancelled ? "Keep pending" : "Cancel action"}
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-[var(--radius-md)] border border-[var(--color-line)] p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-ink)]">
              New next-week actions
            </h3>
            <p className="mt-1 text-[13px] text-[var(--color-ink-muted)]">
              Each line becomes a tracked Action Item.
            </p>
          </div>
          <Button
            type="button"
            variant="soft"
            size="sm"
            onClick={() => setNewActions((prev) => [...prev, ""])}
          >
            <Plus size={14} aria-hidden />
            Add action
          </Button>
        </div>
        <ul className="mt-3 space-y-2">
          {newActions.map((value, index) => (
            <li key={index} className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <label className={labelClass} htmlFor={`new-action-${index}`}>
                  Action {index + 1}
                </label>
                <input
                  id={`new-action-${index}`}
                  className={inputClass}
                  value={value}
                  required={index === 0}
                  onChange={(e) =>
                    setNewActions((prev) =>
                      prev.map((v, i) => (i === index ? e.target.value : v)),
                    )
                  }
                  placeholder="e.g. Increase daily follow-up calls"
                />
              </div>
              {newActions.length > 1 ? (
                <button
                  type="button"
                  className="mt-7 inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
                  aria-label={`Remove action ${index + 1}`}
                  onClick={() =>
                    setNewActions((prev) => prev.filter((_, i) => i !== index))
                  }
                >
                  <X size={16} />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <Button type="submit" disabled={busy}>
        {uploading
          ? "Uploading minutes…"
          : submitting
            ? "Creating…"
            : "Create weekly review"}
      </Button>
    </form>
  );
}
