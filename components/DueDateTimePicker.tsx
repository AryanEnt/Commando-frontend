"use client";

import { useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import { CalendarDays, Clock3, X } from "lucide-react";
import "react-day-picker/style.css";

type Props = {
  date: string;
  time: string;
  onChange: (next: { date: string; time: string }) => void;
  disabled?: boolean;
  label?: string;
  hint?: string;
};

const QUICK_TIMES: Array<{ label: string; value: string; hint: string }> = [
  { label: "9:00 AM", value: "09:00", hint: "Morning" },
  { label: "12:00 PM", value: "12:00", hint: "Noon" },
  { label: "1:00 PM", value: "13:00", hint: "Afternoon" },
  { label: "5:00 PM", value: "17:00", hint: "EOD" },
  { label: "11:59 PM", value: "23:59", hint: "End of day" },
];

function parseYmdLocal(ymd: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return undefined;
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y!, m! - 1, d!, 12, 0, 0, 0);
}

function toYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatTimeLabel(hhmm: string): string {
  if (!/^\d{2}:\d{2}$/.test(hhmm)) return hhmm;
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function buildSlots(): string[] {
  const slots: string[] = [];
  for (let h = 6; h <= 22; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
    slots.push(`${String(h).padStart(2, "0")}:30`);
  }
  slots.push("23:59");
  return slots;
}

const TIME_SLOTS = buildSlots();

export function DueDateTimePicker({
  date,
  time,
  onChange,
  disabled,
  label = "Due by",
  hint = "Pick a day and time — great for deadlines like “by 1:00 PM”.",
}: Props) {
  const selected = useMemo(() => parseYmdLocal(date), [date]);
  const [month, setMonth] = useState<Date>(() => selected ?? new Date());

  function ensureDate(): string {
    if (date) return date;
    return toYmdLocal(new Date());
  }

  function setDate(next: Date | undefined) {
    if (!next) {
      onChange({ date: "", time: "" });
      return;
    }
    onChange({ date: toYmdLocal(next), time });
  }

  function setTime(next: string) {
    onChange({ date: ensureDate(), time: next });
  }

  function clear() {
    onChange({ date: "", time: "" });
  }

  const summary =
    date && time
      ? `${format(parseYmdLocal(date)!, "EEE, MMM d")} · ${formatTimeLabel(time)}`
      : date
        ? `${format(parseYmdLocal(date)!, "EEE, MMM d")} · end of day`
        : "No due date";

  return (
    <section
      className={`due-picker${disabled ? " is-disabled" : ""}${
        date ? " has-value" : ""
      }`}
      aria-disabled={disabled || undefined}
    >
      <div className="due-picker-head">
        <div className="due-picker-head-copy">
          <p className="due-picker-label">
            <CalendarDays size={14} strokeWidth={2} aria-hidden />
            {label}
          </p>
          <p className="due-picker-hint">{hint}</p>
        </div>
        <div className="due-picker-summary-row">
          <span className={`due-picker-summary${date ? " is-set" : ""}`}>
            {summary}
          </span>
          {date || time ? (
            <button
              type="button"
              className="due-picker-clear"
              disabled={disabled}
              onClick={clear}
            >
              <X size={14} aria-hidden />
              Clear
            </button>
          ) : null}
        </div>
      </div>

      <div className="due-picker-body">
        <div className="due-picker-cal">
          <DayPicker
            mode="single"
            month={month}
            onMonthChange={setMonth}
            selected={selected}
            onSelect={setDate}
            disabled={disabled || undefined}
            showOutsideDays
            className="due-rdp"
          />
        </div>

        <div className="due-picker-time">
          <p className="due-picker-time-label">
            <Clock3 size={13} strokeWidth={2} aria-hidden />
            Time
          </p>

          <div className="due-picker-quicks" role="group" aria-label="Quick times">
            {QUICK_TIMES.map((q) => {
              const active = time === q.value;
              return (
                <button
                  key={q.value}
                  type="button"
                  disabled={disabled}
                  className={`due-picker-quick${active ? " is-active" : ""}`}
                  onClick={() => setTime(q.value)}
                >
                  <span className="due-picker-quick-label">{q.label}</span>
                  <span className="due-picker-quick-hint">{q.hint}</span>
                </button>
              );
            })}
          </div>

          <div className="due-picker-slots" role="listbox" aria-label="All times">
            {TIME_SLOTS.map((slot) => {
              const active = time === slot;
              return (
                <button
                  key={slot}
                  type="button"
                  role="option"
                  aria-selected={active}
                  disabled={disabled}
                  className={`due-picker-slot${active ? " is-active" : ""}`}
                  onClick={() => setTime(slot)}
                >
                  {formatTimeLabel(slot)}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
