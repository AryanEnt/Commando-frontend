"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { api, type Team } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { roleLabel } from "@/lib/labels";
import {
  Button,
  ErrorState,
  PageHeader,
  SegmentedControl,
  SelectField,
  TextInput,
} from "@/components/ui";

const ROLE_OPTIONS = [
  {
    code: "TEAM_LEAD",
    description: "Owns a team, refers Sales Executives, and tracks interventions.",
  },
  {
    code: "COMMANDO_EXECUTIVE",
    description: "Coaches assigned Sales Executives through active interventions.",
  },
  {
    code: "SALES_SUPPORT_EXECUTIVE",
    description: "Supports Commando work with tasks and sync evaluations.",
  },
  {
    code: "SUPER_ADMIN",
    description: "Full governance access — users, teams, reports, and audit.",
  },
] as const;

type RoleCode = (typeof ROLE_OPTIONS)[number]["code"];

function passwordChecks(password: string) {
  return {
    length: password.length >= 8,
    letter: /[A-Za-z]/.test(password),
    number: /\d/.test(password),
  };
}

export default function CreateUserPage() {
  const { token, hasPermission } = useAuth();
  const { pushToast } = useToast();
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    roleCode: "TEAM_LEAD" as RoleCode,
    isActive: "true" as "true" | "false",
    teamId: "",
  });

  const canCreate = hasPermission("USER_CREATE");
  const canCreateSe = hasPermission("SALES_EXECUTIVE_CREATE");
  const checks = useMemo(() => passwordChecks(form.password), [form.password]);
  const selectedTeam = useMemo(
    () => teams.find((t) => t.id === form.teamId) ?? null,
    [teams, form.teamId],
  );
  const selectedRole = ROLE_OPTIONS.find((r) => r.code === form.roleCode);

  useEffect(() => {
    if (!token) return;
    void api.getTeams(token).then((res) => setTeams(res.data.teams));
  }, [token]);

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.firstName.trim()) next.firstName = "First name is required";
    if (!form.lastName.trim()) next.lastName = "Last name is required";
    if (!form.email.trim()) {
      next.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = "Enter a valid email address";
    }
    if (!checks.length || !checks.letter || !checks.number) {
      next.password = "Password must be at least 8 characters with a letter and a number";
    }
    if (!form.roleCode) next.roleCode = "Role is required";
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token || !validate()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.createUser(token, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        roleCode: form.roleCode,
        isActive: form.isActive === "true",
        teamId: form.teamId || null,
      });
      pushToast("User created", "success");
      router.push(`/users/${res.data.user.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create user";
      setError(msg);
      pushToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!canCreate) {
    return (
      <ErrorState message="You don't have permission to create users." />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Create user"
        description="Add a login account, assign a system role, and optionally place them on a team."
        actions={
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/users")}
          >
            Back to users
          </Button>
        }
      />

      {canCreateSe ? (
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--color-ink)]">
              Onboarding a Sales Executive?
            </p>
            <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">
              Use the dedicated flow to create the account, team link, and sales
              profile together.
            </p>
          </div>
          <Link
            href="/users/sales-executives/new"
            className="inline-flex h-9 shrink-0 items-center rounded-[var(--radius-sm)] border border-[var(--color-line)] px-3.5 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface-2)]"
          >
            Sales Executive wizard
          </Link>
        </div>
      ) : null}

      {error && <ErrorState message={error} />}

      <form
        onSubmit={onSubmit}
        className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)]"
        noValidate
      >
        <section className="space-y-4 border-b border-[var(--color-line)] p-5">
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-ink)]">
              Personal details
            </h2>
            <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
              Name and email used for login and display across the system.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="First name"
              required
              autoComplete="given-name"
              value={form.firstName}
              onChange={(e) => setField("firstName", e.target.value)}
              error={fieldErrors.firstName}
              placeholder="Jane"
            />
            <TextInput
              label="Last name"
              required
              autoComplete="family-name"
              value={form.lastName}
              onChange={(e) => setField("lastName", e.target.value)}
              error={fieldErrors.lastName}
              placeholder="Doe"
            />
            <div className="sm:col-span-2">
              <TextInput
                label="Email"
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                error={fieldErrors.email}
                placeholder="jane.doe@company.com"
                hint="This becomes the sign-in username."
              />
            </div>
          </div>
        </section>

        <section className="space-y-4 border-b border-[var(--color-line)] p-5">
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-ink)]">
              Temporary password
            </h2>
            <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
              Share it securely. It is not shown again after the account is
              created.
            </p>
          </div>
          <div className="relative">
            <TextInput
              label="Password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setField("password", e.target.value)}
              error={fieldErrors.password}
              placeholder="At least 8 characters"
            />
            <button
              type="button"
              className="absolute right-2 top-[2.05rem] rounded px-2 py-1 text-xs font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          <ul className="grid gap-1.5 text-xs sm:grid-cols-3">
            {(
              [
                ["length", "8+ characters", checks.length],
                ["letter", "Includes a letter", checks.letter],
                ["number", "Includes a number", checks.number],
              ] as const
            ).map(([key, label, ok]) => (
              <li
                key={key}
                className={`flex items-center gap-1.5 ${
                  form.password.length === 0
                    ? "text-[var(--color-ink-subtle)]"
                    : ok
                      ? "text-[var(--status-success)]"
                      : "text-[var(--status-danger)]"
                }`}
              >
                <span aria-hidden="true">{ok && form.password.length > 0 ? "✓" : "○"}</span>
                {label}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-4 border-b border-[var(--color-line)] p-5">
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-ink)]">
              Role & access
            </h2>
            <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
              Role controls what the person can see and do after they sign in.
            </p>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-[var(--color-ink)]">
              System role <span className="text-red-600">*</span>
            </legend>
            <div className="grid gap-2">
              {ROLE_OPTIONS.map((role) => {
                const active = form.roleCode === role.code;
                return (
                  <label
                    key={role.code}
                    className={`flex cursor-pointer gap-3 rounded-[var(--radius-sm)] border px-3 py-3 transition ${
                      active
                        ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)]"
                        : "border-[var(--color-line)] hover:border-[var(--color-line-strong)] hover:bg-[var(--color-surface-2)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="roleCode"
                      className="mt-1"
                      checked={active}
                      onChange={() => setField("roleCode", role.code)}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-[var(--color-ink)]">
                        {roleLabel(role.code)}
                      </span>
                      <span className="mt-0.5 block text-xs text-[var(--color-ink-muted)]">
                        {role.description}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
            {fieldErrors.roleCode ? (
              <p className="mt-2 text-xs text-red-600" role="alert">
                {fieldErrors.roleCode}
              </p>
            ) : null}
          </fieldset>

          <div>
            <p className="mb-2 text-sm font-medium text-[var(--color-ink)]">
              Account status
            </p>
            <SegmentedControl
              ariaLabel="Account status"
              value={form.isActive}
              onChange={(value) => setField("isActive", value)}
              options={[
                { value: "true", label: "Active" },
                { value: "false", label: "Inactive" },
              ]}
            />
            <p className="mt-1.5 text-xs text-[var(--color-ink-muted)]">
              {form.isActive === "true"
                ? "Can sign in immediately after creation."
                : "Account is created but cannot sign in until activated."}
            </p>
          </div>
        </section>

        <section className="space-y-4 border-b border-[var(--color-line)] p-5">
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-ink)]">
              Organization
            </h2>
            <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
              Optional. Membership uses a team role matching the system role
              selected above.
            </p>
          </div>
          <SelectField
            label="Team"
            value={form.teamId}
            onChange={(e) => setField("teamId", e.target.value)}
            hint={
              selectedTeam
                ? `Will join ${selectedTeam.name}${
                    selectedRole ? ` as ${roleLabel(selectedRole.code)}` : ""
                  }.`
                : "You can assign a team later from the user or team page."
            }
          >
            <option value="">No team yet</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </SelectField>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--color-surface-2)] px-5 py-4">
          <p className="text-xs text-[var(--color-ink-muted)]">
            Required fields are marked with{" "}
            <span className="text-red-600">*</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push("/users")}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create user"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
