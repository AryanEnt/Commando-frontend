"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type ProfileListItem } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { inputClass } from "@/components/ui";

type Props = {
  value: string;
  onChange: (profileId: string, profile?: ProfileListItem) => void;
  teamId?: string;
  label?: string;
};

export function ProfileSearchSelect({
  value,
  onChange,
  teamId,
  label = "Sales Executive Profile",
}: Props) {
  const { token } = useAuth();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [profiles, setProfiles] = useState<ProfileListItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    const handle = window.setTimeout(() => {
      setLoading(true);
      api
        .getProfiles(token, {
          search: search || undefined,
          teamId,
          pageSize: 25,
        })
        .then((res) => setProfiles(res.data.profiles))
        .finally(() => setLoading(false));
    }, 200);
    return () => window.clearTimeout(handle);
  }, [token, search, teamId]);

  const selected = useMemo(
    () => profiles.find((p) => p.id === value),
    [profiles, value],
  );

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-[var(--color-ink)]">
        {label}
        <input
          className={`${inputClass} h-10`}
          placeholder="Search by name, email, or code…"
          value={open ? search : selected?.displayName ?? search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
      </label>
      {open && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-md)]">
          {loading && (
            <div className="px-3 py-2 text-xs text-[var(--color-ink-muted)]">Searching…</div>
          )}
          {!loading && profiles.length === 0 && (
            <div className="px-3 py-2 text-xs text-[var(--color-ink-muted)]">No profiles</div>
          )}
          {profiles.map((p) => (
            <button
              key={p.id}
              type="button"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-brand-soft)]"
              onClick={() => {
                onChange(p.id, p);
                setSearch(p.displayName);
                setOpen(false);
              }}
            >
              <div className="font-medium">{p.displayName}</div>
              <div className="text-xs text-[var(--color-ink-muted)]">
                {p.team.name} · {p.user.email}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
