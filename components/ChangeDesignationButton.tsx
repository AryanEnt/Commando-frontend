"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Link2,
  Lock,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import {
  api,
  errorMessage,
  type DesignationEligibility,
  type ManagedUserDetail,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { toast } from "@/lib/toast";
import { formatDate } from "@/lib/dates";
import { personName } from "@/lib/labels";
import { Button } from "@/components/ui";

type Designation = "SALES_EXECUTIVE" | "SALES_SUPPORT_EXECUTIVE";

const DESIGNATIONS: { code: Designation; label: string; hint: string }[] = [
  {
    code: "SALES_EXECUTIVE",
    label: "Sales Executive",
    hint: "Owns a profile, clients and targets",
  },
  {
    code: "SALES_SUPPORT_EXECUTIVE",
    label: "Sales Support Executive",
    hint: "Supports linked Sales Executives",
  },
];

const PRESERVED = [
  "Profile and employee details",
  "Clients, leads and assigned tasks",
  "Activities, logs, notes and reviews",
  "Targets and performance history",
];

const MENU_WIDTH = 272;

function isDesignation(code: string | undefined): code is Designation {
  return code === "SALES_EXECUTIVE" || code === "SALES_SUPPORT_EXECUTIVE";
}

function designationLabel(code: Designation) {
  return DESIGNATIONS.find((d) => d.code === code)!.label;
}

/**
 * Team Lead / Super Admin control to switch an employee between
 * Sales Executive and Sales Support Executive: pick from a menu,
 * confirm in a final dialog, then switch. Renders nothing for other
 * viewers, for self, or for employees outside those two roles.
 */
export function ChangeDesignationButton({
  userId,
  name,
  currentRole,
  onChanged,
  redirectToWorkspace = false,
  className = "",
}: {
  userId: string;
  name: string;
  currentRole: string | undefined;
  onChanged?: (user: ManagedUserDetail) => void | Promise<void>;
  /** Open the employee's new workspace after a successful switch. */
  redirectToWorkspace?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const { token, user: me } = useAuth();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; left: number }>({ left: 0 });
  const [target, setTarget] = useState<Designation | null>(null);
  const [busy, setBusy] = useState(false);
  const [eligibility, setEligibility] = useState<DesignationEligibility | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  useEffect(() => {
    if (!menuOpen || !token) return;
    let cancelled = false;
    setChecking(true);
    setCheckError(null);
    api
      .getUserDesignation(token, userId)
      .then((res) => {
        if (!cancelled) setEligibility(res.data);
      })
      .catch((err) => {
        if (!cancelled) {
          setEligibility(null);
          setCheckError(errorMessage(err, "Unable to check eligibility"));
        }
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [menuOpen, token, userId]);

  useLayoutEffect(() => {
    if (!menuOpen || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const left = Math.min(
      Math.max(8, rect.right - MENU_WIDTH),
      window.innerWidth - MENU_WIDTH - 8,
    );
    const openUp =
      rect.bottom + 340 > window.innerHeight && rect.top > 340;
    setMenuPos(
      openUp
        ? { bottom: window.innerHeight - rect.top + 6, left }
        : { top: rect.bottom + 6, left },
    );
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointer(e: MouseEvent) {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    function onDismiss() {
      setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onDismiss, true);
    window.addEventListener("resize", onDismiss);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onDismiss, true);
      window.removeEventListener("resize", onDismiss);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!target) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) setTarget(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [target, busy]);

  const canChange =
    (me?.roleCode === "SUPER_ADMIN" || me?.roleCode === "TEAM_LEAD") &&
    me.id !== userId &&
    isDesignation(currentRole);
  if (!canChange) return null;

  const from = eligibility?.currentRole ?? (currentRole as Designation);
  const blocker = eligibility?.blocker ?? null;
  const optionsLocked = checking || Boolean(checkError) || Boolean(blocker);

  async function onConfirm() {
    if (!token || !target) return;
    const to = target;
    setBusy(true);
    try {
      const res = await api.updateUserDesignation(token, userId, to);
      setTarget(null);
      toast.success(`${name} is now a ${designationLabel(to)}`);
      await onChanged?.(res.data.user);
      if (redirectToWorkspace) {
        if (to === "SALES_SUPPORT_EXECUTIVE") {
          router.push(`/support/${userId}`);
        } else if (res.data.user.profile?.id) {
          router.push(`/profiles/${res.data.user.profile.id}`);
        }
      }
    } catch (err) {
      toast.error(errorMessage(err, "Unable to change designation"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((v) => !v)}
        className={`designation-trigger ${className}`.trim()}
      >
        <UserCog size={14} aria-hidden />
        <span>Designation</span>
        <ChevronDown
          size={13}
          aria-hidden
          className={`designation-trigger-chevron${menuOpen ? " is-open" : ""}`}
        />
      </button>

      {menuOpen
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              aria-label={`Change designation for ${name}`}
              className="designation-menu"
              style={{ ...menuPos, width: MENU_WIDTH }}
            >
              <p className="designation-menu-title">Change designation</p>

              {checking ? (
                <div className="designation-checking" role="status">
                  <span className="designation-spinner" aria-hidden />
                  Checking eligibility…
                </div>
              ) : null}

              {!checking && blocker?.code === "COMMANDO_INTERVENTION" ? (
                <div className="designation-notice" role="note">
                  <p className="designation-notice-title">
                    <Lock size={13} aria-hidden />
                    Under Commando intervention
                  </p>
                  <p className="designation-notice-body">
                    Designation can&apos;t be changed while an intervention is
                    active.
                  </p>
                  <dl className="designation-notice-meta">
                    <div>
                      <dt>Commando</dt>
                      <dd>{personName(blocker.commando)}</dd>
                    </div>
                    <div>
                      <dt>Since</dt>
                      <dd>{formatDate(blocker.startedAt)}</dd>
                    </div>
                  </dl>
                  <p className="designation-notice-foot">
                    Available once the intervention ends.
                  </p>
                </div>
              ) : null}

              {!checking && blocker?.code === "SUPPORT_LINKS" ? (
                <div className="designation-notice" role="note">
                  <p className="designation-notice-title">
                    <Link2 size={13} aria-hidden />
                    Active support links
                  </p>
                  <p className="designation-notice-body">{blocker.message}</p>
                </div>
              ) : null}

              {!checking && checkError ? (
                <div className="designation-notice" role="alert">
                  <p className="designation-notice-title">
                    <Lock size={13} aria-hidden />
                    Can&apos;t change designation
                  </p>
                  <p className="designation-notice-body">{checkError}</p>
                </div>
              ) : null}

              {DESIGNATIONS.map((d) => {
                const isCurrent = d.code === from;
                return (
                  <button
                    key={d.code}
                    type="button"
                    role="menuitemradio"
                    aria-checked={isCurrent}
                    disabled={isCurrent || optionsLocked}
                    onClick={() => {
                      setMenuOpen(false);
                      setTarget(d.code);
                    }}
                    className={`designation-option${isCurrent ? " is-current" : ""}${
                      !isCurrent && optionsLocked ? " is-locked" : ""
                    }`}
                  >
                    <span className="min-w-0 flex-1 text-left">
                      <span className="designation-option-label">{d.label}</span>
                      <span className="designation-option-hint">{d.hint}</span>
                    </span>
                    {isCurrent ? (
                      <span className="designation-option-current">
                        <Check size={12} aria-hidden />
                        Current
                      </span>
                    ) : optionsLocked && !checking ? (
                      <Lock size={13} aria-hidden className="designation-option-arrow" />
                    ) : (
                      <ArrowRight size={14} aria-hidden className="designation-option-arrow" />
                    )}
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}

      {target
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-ink)]/40 p-4 overlay-backdrop"
              role="dialog"
              aria-modal="true"
              aria-labelledby="designation-confirm-title"
              onClick={(e) => {
                if (e.target === e.currentTarget && !busy) setTarget(null);
              }}
            >
              <div className="dialog-panel w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-md)]">
                <h2
                  id="designation-confirm-title"
                  className="text-base font-semibold text-[var(--color-ink)]"
                >
                  Confirm designation change
                </h2>
                <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                  {name}
                </p>

                <div className="designation-change-row">
                  <span className="designation-chip">{designationLabel(from)}</span>
                  <ArrowRight size={15} aria-hidden className="shrink-0 text-[var(--color-ink-subtle)]" />
                  <span className="designation-chip is-next">{designationLabel(target)}</span>
                </div>

                <div className="designation-preserved">
                  <p className="designation-preserved-title">
                    <ShieldCheck size={14} aria-hidden />
                    Nothing is deleted or reset
                  </p>
                  <ul>
                    {PRESERVED.map((item) => (
                      <li key={item}>
                        <Check size={12} aria-hidden />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <p className="mt-3 text-xs text-[var(--color-ink-subtle)]">
                  {name.split(" ")[0]} will be asked to sign in again to load the
                  new workspace.
                </p>

                <div className="mt-5 flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    onClick={() => setTarget(null)}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" disabled={busy} onClick={() => void onConfirm()}>
                    {busy ? "Switching…" : "Confirm switch"}
                  </Button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
