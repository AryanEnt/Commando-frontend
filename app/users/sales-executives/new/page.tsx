"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { api, type Team } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { SearchableSelect } from "@/components/SearchableSelect";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Button,
  ErrorState,
  SegmentedControl,
  TextInput,
} from "@/components/ui";

const STEPS = [
  {
    key: "account",
    label: "Account",
    title: "Login account",
    description: "Name, email, and a temporary password for first sign-in.",
  },
  {
    key: "organization",
    label: "Organization",
    title: "Team placement",
    description: "Assign the Sales Executive to the team they will work under.",
  },
  {
    key: "profile",
    label: "Sales profile",
    title: "Business profile",
    description: "How this person appears on intervention and coaching records.",
  },
  {
    key: "review",
    label: "Review",
    title: "Confirm and create",
    description: "Account, team, and profile are created together in one transaction.",
  },
] as const;

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  isActive: "true" | "false";
  teamId: string;
  displayName: string;
  employeeCode: string;
};

function Stepper({
  step,
  onJump,
}: {
  step: number;
  onJump: (index: number) => void;
}) {
  return (
    <ol className="flex w-full items-start gap-0">
      {STEPS.map((item, index) => {
        const active = index === step;
        const done = index < step;
        const clickable = index < step;
        return (
          <li key={item.key} className="relative flex flex-1 flex-col items-center">
            {index < STEPS.length - 1 && (
              <span
                aria-hidden
                className={`absolute left-[calc(50%+14px)] right-[calc(-50%+14px)] top-3.5 h-px ${
                  done ? "bg-[var(--color-brand)]" : "bg-[var(--color-line)]"
                }`}
              />
            )}
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onJump(index)}
              className={`relative z-[1] flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition ${
                active
                  ? "bg-[var(--color-brand)] text-white shadow-[var(--shadow-sm)]"
                  : done
                    ? "bg-[var(--color-brand-soft)] text-[var(--color-brand)] hover:ring-2 hover:ring-[var(--status-success-ring)]"
                    : "bg-[var(--color-surface-2)] text-[var(--color-ink-subtle)] ring-1 ring-[var(--color-line)]"
              } ${clickable ? "cursor-pointer" : "cursor-default"}`}
              aria-current={active ? "step" : undefined}
            >
              {done ? (
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
                  <path
                    d="M3.5 8.5 6.5 11.5 12.5 4.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                index + 1
              )}
            </button>
            <span
              className={`mt-2 hidden text-center text-[11px] font-medium sm:block ${
                active
                  ? "text-[var(--color-ink)]"
                  : done
                    ? "text-[var(--color-brand)]"
                    : "text-[var(--color-ink-subtle)]"
              }`}
            >
              {item.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function ReviewRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="grid gap-1 border-b border-[var(--color-line)] py-3 last:border-0 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-xs font-medium uppercase tracking-[0.06em] text-[var(--color-ink-subtle)]">
        {label}
      </dt>
      <dd className="text-sm font-medium text-[var(--color-ink)]">{value}</dd>
    </div>
  );
}

export default function CreateSalesExecutivePage() {
  const { token, user, hasPermission } = useAuth();
  const { pushToast } = useToast();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [teams, setTeams] = useState<Team[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<{
    userId: string;
    profileId: string;
    name: string;
    email: string;
    teamName: string;
    displayName: string;
  } | null>(null);
  const [form, setForm] = useState<FormState>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    isActive: "true",
    teamId: "",
    displayName: "",
    employeeCode: "",
  });

  const isTeamLead = user?.roleCode === "TEAM_LEAD";
  const canCreate =
    hasPermission("SALES_EXECUTIVE_CREATE") ||
    isTeamLead ||
    user?.roleCode === "SUPER_ADMIN";
  const canViewUsers = hasPermission("USER_VIEW");
  const exitHref = canViewUsers ? "/users" : "/profiles";
  const exitLabel = canViewUsers ? "Users" : "Sales Executives";
  const selectedTeam = useMemo(
    () => teams.find((t) => t.id === form.teamId) ?? null,
    [teams, form.teamId],
  );
  const current = STEPS[step]!;
  const fullName = `${form.firstName} ${form.lastName}`.trim();

  useEffect(() => {
    if (!token) return;
    void api.getTeams(token).then((res) => {
      setTeams(res.data.teams);
      if (res.data.teams.length === 1) {
        setForm((prev) =>
          prev.teamId ? prev : { ...prev, teamId: res.data.teams[0]!.id },
        );
      }
    });
  }, [token]);

  function validateStep(currentStep: number): boolean {
    const next: Record<string, string> = {};
    if (currentStep === 0) {
      if (!form.firstName.trim()) next.firstName = "First name is required";
      if (!form.lastName.trim()) next.lastName = "Last name is required";
      if (!form.email.trim()) next.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        next.email = "Enter a valid email address";
      }
      if (form.password.length < 8) {
        next.password = "Password must be at least 8 characters";
      } else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
        next.password = "Password must include a letter and a number";
      }
    }
    if (currentStep === 1) {
      if (!form.teamId) next.teamId = "Select a team";
    }
    if (currentStep === 2) {
      if (!form.displayName.trim()) {
        next.displayName = "Display name is required";
      }
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  function goNext() {
    if (!validateStep(step)) return;
    if (step === 0 && !form.displayName.trim()) {
      setForm((prev) => ({
        ...prev,
        displayName: `${prev.firstName} ${prev.lastName}`.trim(),
      }));
    }
    setError(null);
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  function goBack() {
    setError(null);
    setFieldErrors({});
    setStep((s) => Math.max(0, s - 1));
  }

  async function onCreate() {
    if (!token || !validateStep(2)) {
      setStep(2);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.createSalesExecutive(token, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        isActive: form.isActive === "true",
        teamId: form.teamId,
        displayName: form.displayName.trim(),
        employeeCode: form.employeeCode.trim() || null,
      });
      setSuccess({
        userId: res.data.user.id,
        profileId: res.data.profile.id,
        name: `${res.data.user.firstName} ${res.data.user.lastName}`,
        email: res.data.user.email,
        teamName: res.data.profile.team.name,
        displayName: res.data.profile.displayName,
      });
      pushToast("Sales Executive created successfully", "success");
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Unable to create the Sales Executive. No changes were saved.";
      setError(msg);
      pushToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!canCreate) {
    return (
      <ErrorState message="You don't have permission to create Sales Executives." />
    );
  }

  if (success) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--status-success-ring)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
          <div className="border-b border-[var(--status-success-ring)] bg-[var(--status-success-bg)] px-6 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-brand)]">
              Onboarding complete
            </p>
            <h1 className="mt-1 text-[1.65rem] font-semibold tracking-tight text-[var(--color-ink)]">
              Sales Executive created
            </h1>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
              Account, team membership, and profile are ready for supervision.
            </p>
          </div>
          <div className="space-y-4 px-6 py-5">
            <div>
              <p className="text-lg font-semibold text-[var(--color-ink)]">
                {success.name}
              </p>
              <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">
                {success.email}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status="SALES_EXECUTIVE" label="Sales Executive" />
              <StatusBadge
                status="ACTIVE"
                label={success.teamName}
              />
            </div>
            <dl className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-2)] px-4">
              <ReviewRow label="Display name" value={success.displayName} />
              <ReviewRow label="Team" value={success.teamName} />
              <ReviewRow
                label="Next"
                value="Share the temporary password securely — it is not stored in this screen."
              />
            </dl>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link
                href={`/profiles/${success.profileId}`}
                className="inline-flex h-10 items-center rounded-[var(--radius-sm)] bg-[var(--color-brand)] px-4 text-sm font-medium text-white hover:bg-[var(--color-brand-hover)]"
              >
                Open profile
              </Link>
              {canViewUsers ? (
                <Link
                  href={`/users/${success.userId}`}
                  className="inline-flex h-10 items-center rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)] px-4 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface-2)]"
                >
                  Open user
                </Link>
              ) : (
                <Link
                  href="/profiles"
                  className="inline-flex h-10 items-center rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)] px-4 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface-2)]"
                >
                  Back to team
                </Link>
              )}
              <Button
                variant="secondary"
                onClick={() => {
                  setSuccess(null);
                  setStep(0);
                  setShowPassword(false);
                  setError(null);
                  setFieldErrors({});
                  setForm({
                    firstName: "",
                    lastName: "",
                    email: "",
                    password: "",
                    isActive: "true",
                    teamId: teams.length === 1 ? teams[0]!.id : "",
                    displayName: "",
                    employeeCode: "",
                  });
                }}
              >
                Create another
              </Button>
            </div>
          </div>
        </div>
        <p className="text-center text-sm text-[var(--color-ink-muted)]">
          <Link href={exitHref} className="text-[var(--color-brand)] hover:underline">
            Back to {exitLabel}
          </Link>
          {canViewUsers ? (
            <>
              {" · "}
              <Link href="/profiles" className="text-[var(--color-brand)] hover:underline">
                Sales Executives
              </Link>
            </>
          ) : null}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-subtle)]">
            {isTeamLead ? "Team management" : "User management"}
          </p>
          <h1 className="mt-1 text-[1.75rem] font-semibold tracking-tight text-[var(--color-ink)]">
            {isTeamLead ? "Add Sales Executive" : "Create Sales Executive"}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-[var(--color-ink-muted)]">
            {isTeamLead
              ? "Create a login account and profile for someone on your team — in one guided flow."
              : "One guided flow: login account, team assignment, and Sales Executive profile — created together so nothing is left half-configured."}
          </p>
        </div>
        <Link
          href={exitHref}
          className="text-sm font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:underline"
        >
          Cancel to {exitLabel}
        </Link>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-4 shadow-[var(--shadow-sm)] sm:px-6">
        <Stepper step={step} onJump={setStep} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="min-w-0 space-y-4">
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
            <div className="border-b border-[var(--color-line)] bg-[var(--color-surface-2)] px-5 py-4 sm:px-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-subtle)]">
                Step {step + 1} of {STEPS.length}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-[var(--color-ink)]">
                {current.title}
              </h2>
              <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">
                {current.description}
              </p>
            </div>

            <div className="space-y-5 px-5 py-5 sm:px-6">
              {error && <ErrorState message={error} />}

              {step === 0 && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextInput
                      label="First name"
                      required
                      autoComplete="given-name"
                      value={form.firstName}
                      onChange={(e) =>
                        setForm({ ...form, firstName: e.target.value })
                      }
                      error={fieldErrors.firstName}
                    />
                    <TextInput
                      label="Last name"
                      required
                      autoComplete="family-name"
                      value={form.lastName}
                      onChange={(e) =>
                        setForm({ ...form, lastName: e.target.value })
                      }
                      error={fieldErrors.lastName}
                    />
                  </div>
                  <TextInput
                    label="Email"
                    type="email"
                    required
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    error={fieldErrors.email}
                    hint="Used for login. Must be unique across the platform."
                  />
                  <div className="space-y-2">
                    <TextInput
                      label="Temporary password"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      value={form.password}
                      onChange={(e) =>
                        setForm({ ...form, password: e.target.value })
                      }
                      error={fieldErrors.password}
                      hint="At least 8 characters with a letter and a number. Share securely — it is never shown again here."
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="text-xs font-medium text-[var(--color-brand)] hover:underline"
                    >
                      {showPassword ? "Hide password" : "Show password"}
                    </button>
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-medium text-[var(--color-ink)]">
                      Account status
                    </p>
                    <SegmentedControl
                      ariaLabel="Account status"
                      value={form.isActive}
                      onChange={(v) =>
                        setForm({ ...form, isActive: v as "true" | "false" })
                      }
                      options={[
                        { value: "true", label: "Active" },
                        { value: "false", label: "Inactive" },
                      ]}
                    />
                    <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
                      Inactive accounts cannot sign in until reactivated.
                    </p>
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  {isTeamLead ? (
                    <p className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-2)] px-4 py-3 text-sm text-[var(--color-ink-muted)]">
                      You can only add Sales Executives to teams you lead.
                    </p>
                  ) : null}
                  {teams.length === 1 ? (
                    <div className="rounded-[var(--radius-md)] border border-[var(--status-success-ring)] bg-[var(--status-success-bg)] px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-subtle)]">
                        Team
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[var(--color-ink)]">
                        {teams[0]!.name}
                      </p>
                      <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                        {teams[0]!.description ||
                          "The Sales Executive profile will be linked to this team."}
                      </p>
                    </div>
                  ) : (
                    <>
                      <SearchableSelect
                        label="Team"
                        value={form.teamId}
                        onChange={(id) => {
                          setForm({ ...form, teamId: id });
                          setFieldErrors((prev) => ({ ...prev, teamId: "" }));
                        }}
                        placeholder="Search or select team…"
                        allowClear={false}
                        options={teams.map((t) => ({
                          value: t.id,
                          label: t.name,
                          hint: t.description ?? undefined,
                        }))}
                      />
                      {fieldErrors.teamId && (
                        <p className="text-xs text-[var(--status-danger)]">
                          {fieldErrors.teamId}
                        </p>
                      )}
                      {selectedTeam ? (
                        <div className="rounded-[var(--radius-md)] border border-[var(--status-success-ring)] bg-[var(--status-success-bg)] px-4 py-3">
                          <p className="text-sm font-semibold text-[var(--color-ink)]">
                            {selectedTeam.name}
                          </p>
                          <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                            {selectedTeam.description ||
                              "The Sales Executive profile will be linked to this team."}
                          </p>
                          {(selectedTeam.memberCount != null ||
                            selectedTeam.profileCount != null) && (
                            <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
                              {selectedTeam.memberCount != null
                                ? `${selectedTeam.memberCount} members`
                                : null}
                              {selectedTeam.memberCount != null &&
                              selectedTeam.profileCount != null
                                ? " · "
                                : null}
                              {selectedTeam.profileCount != null
                                ? `${selectedTeam.profileCount} Sales Executives`
                                : null}
                            </p>
                          )}
                        </div>
                      ) : teams.length === 0 ? (
                        <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-line)] bg-[var(--color-surface-2)] px-4 py-3 text-sm text-[var(--color-ink-muted)]">
                          {isTeamLead
                            ? "You are not assigned to a team yet. Ask a Super Admin to place you on a team before onboarding Sales Executives."
                            : (
                              <>
                                No teams yet.{" "}
                                <Link
                                  href="/teams"
                                  className="font-medium text-[var(--color-brand)] hover:underline"
                                >
                                  Create a team
                                </Link>{" "}
                                before continuing.
                              </>
                            )}
                        </div>
                      ) : null}
                    </>
                  )}
                </>
              )}

              {step === 2 && (
                <>
                  <TextInput
                    label="Display name"
                    required
                    value={form.displayName}
                    onChange={(e) =>
                      setForm({ ...form, displayName: e.target.value })
                    }
                    error={fieldErrors.displayName}
                    hint="Shown on profiles, coaching records, and reports."
                  />
                  <TextInput
                    label="Employee code"
                    value={form.employeeCode}
                    onChange={(e) =>
                      setForm({ ...form, employeeCode: e.target.value })
                    }
                    hint="Optional HR or payroll identifier."
                  />
                  <div className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-2)] px-4 py-3 text-sm text-[var(--color-ink-muted)]">
                    Role is fixed as{" "}
                    <span className="font-medium text-[var(--color-ink)]">
                      Sales Executive
                    </span>
                    . Intervention assignment happens later through the Team Lead
                    → Commando workflow.
                  </div>
                </>
              )}

              {step === 3 && (
                <dl>
                  <ReviewRow label="Name" value={fullName || "—"} />
                  <ReviewRow label="Email" value={form.email || "—"} />
                  <ReviewRow
                    label="Role"
                    value={
                      <StatusBadge
                        status="SALES_EXECUTIVE"
                        label="Sales Executive"
                      />
                    }
                  />
                  <ReviewRow
                    label="Status"
                    value={
                      <StatusBadge
                        status={form.isActive === "true" ? "ACTIVE" : "INACTIVE"}
                      />
                    }
                  />
                  <ReviewRow
                    label="Team"
                    value={selectedTeam?.name ?? "—"}
                  />
                  <ReviewRow
                    label="Display name"
                    value={form.displayName || "—"}
                  />
                  <ReviewRow
                    label="Employee code"
                    value={form.employeeCode || "—"}
                  />
                  <ReviewRow
                    label="Password"
                    value="Temporary password set (not shown)"
                  />
                </dl>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-line)] bg-[var(--color-surface-2)] px-5 py-4 sm:px-6">
              <div>
                {step > 0 ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={goBack}
                    disabled={submitting}
                  >
                    Back
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => router.push(exitHref)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {step < STEPS.length - 1 ? (
                  <Button type="button" onClick={goNext}>
                    Continue
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => void onCreate()}
                    disabled={submitting}
                  >
                    {submitting ? "Creating…" : "Create Sales Executive"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-subtle)]">
              Preview
            </p>
            <p className="mt-2 text-base font-semibold text-[var(--color-ink)]">
              {fullName || "New Sales Executive"}
            </p>
            <p className="mt-0.5 truncate text-xs text-[var(--color-ink-muted)]">
              {form.email || "email@company.com"}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <StatusBadge status="SALES_EXECUTIVE" label="Sales Executive" />
              {form.isActive === "true" ? (
                <StatusBadge status="ACTIVE" />
              ) : (
                <StatusBadge status="INACTIVE" />
              )}
            </div>
            <dl className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--color-ink-subtle)]">Team</dt>
                <dd className="text-right font-medium text-[var(--color-ink)]">
                  {selectedTeam?.name ?? "Not selected"}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--color-ink-subtle)]">Display name</dt>
                <dd className="text-right font-medium text-[var(--color-ink)]">
                  {form.displayName || "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--color-ink-subtle)]">Employee code</dt>
                <dd className="text-right font-medium text-[var(--color-ink)]">
                  {form.employeeCode || "—"}
                </dd>
              </div>
            </dl>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface-2)] p-4 text-xs leading-relaxed text-[var(--color-ink-muted)]">
            <p className="font-medium text-[var(--color-ink)]">What gets created</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>User login with Sales Executive role</li>
              <li>Active team membership</li>
              <li>Sales Executive business profile</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
