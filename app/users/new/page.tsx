"use client";

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
  TextArea,
  TextInput,
} from "@/components/ui";

const ALL_ROLE_OPTIONS = [
  {
    code: "TEAM_LEAD",
    description: "Owns a team, refers Sales Executives, and tracks interventions.",
  },
  {
    code: "COMMANDO_EXECUTIVE",
    description: "Coaches assigned Sales Executives through active interventions.",
  },
  {
    code: "SALES_EXECUTIVE",
    description:
      "Salesperson under Commando intervention — creates login account and sales profile together.",
  },
  {
    code: "SALES_SUPPORT_EXECUTIVE",
    description: "Supports Commando work with tasks and sync evaluations.",
  },
] as const;

type RoleCode = (typeof ALL_ROLE_OPTIONS)[number]["code"];
type TeamChoice = "existing" | "new" | "none";

function passwordChecks(password: string) {
  return {
    length: password.length >= 8,
    letter: /[A-Za-z]/.test(password),
    number: /\d/.test(password),
  };
}

function defaultTeamChoice(
  roleCode: RoleCode,
  teamCount: number,
): TeamChoice {
  if (roleCode === "TEAM_LEAD" || roleCode === "SALES_EXECUTIVE") {
    return teamCount === 0 ? "new" : "existing";
  }
  return teamCount === 0 ? "new" : "none";
}

export default function CreateUserPage() {
  const { token, hasPermission, user } = useAuth();
  const { pushToast } = useToast();
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  const canCreateAny = hasPermission("USER_CREATE");
  const canCreateSupport =
    hasPermission("SALES_SUPPORT_CREATE") || user?.roleCode === "TEAM_LEAD";
  const canCreate = canCreateAny || canCreateSupport;
  const canCreateSe =
    hasPermission("SALES_EXECUTIVE_CREATE") ||
    user?.roleCode === "TEAM_LEAD" ||
    user?.roleCode === "SUPER_ADMIN";
  const supportOnly = !canCreateAny && canCreateSupport;

  const roleOptions = useMemo(() => {
    if (supportOnly) {
      return ALL_ROLE_OPTIONS.filter((r) => r.code === "SALES_SUPPORT_EXECUTIVE");
    }
    return ALL_ROLE_OPTIONS.filter(
      (r) => r.code !== "SALES_EXECUTIVE" || canCreateSe,
    );
  }, [supportOnly, canCreateSe]);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    roleCode: (supportOnly
      ? "SALES_SUPPORT_EXECUTIVE"
      : "TEAM_LEAD") as RoleCode,
    isActive: "true" as "true" | "false",
    teamId: "",
    teamChoice: "new" as TeamChoice,
    newTeamName: "",
    newTeamDescription: "",
    displayName: "",
    employeeCode: "",
  });
  const [teamsLoaded, setTeamsLoaded] = useState(false);

  const checks = useMemo(() => passwordChecks(form.password), [form.password]);
  const selectedTeam = useMemo(
    () => teams.find((t) => t.id === form.teamId) ?? null,
    [teams, form.teamId],
  );
  const selectedRole = roleOptions.find((r) => r.code === form.roleCode);
  const exitHref = canCreateAny ? "/users" : "/teams";
  const exitLabel = canCreateAny ? "Users" : "Teams";
  const isTeamLeadRole = form.roleCode === "TEAM_LEAD";
  const isSalesExecutiveRole = form.roleCode === "SALES_EXECUTIVE";
  const teamRequired = isTeamLeadRole || isSalesExecutiveRole;

  useEffect(() => {
    if (!token) return;
    void api.getTeams(token).then((res) => {
      const loaded = res.data.teams;
      setTeams(loaded);
      setTeamsLoaded(true);
      setForm((prev) => {
        const next = { ...prev };
        if (supportOnly && loaded[0] && !prev.teamId) {
          next.teamId = loaded[0].id;
        }
        if (!supportOnly) {
          next.teamChoice = defaultTeamChoice(prev.roleCode, loaded.length);
          if (
            next.teamChoice === "existing" &&
            !prev.teamId &&
            loaded.length === 1 &&
            loaded[0]
          ) {
            next.teamId = loaded[0].id;
          }
        }
        return next;
      });
    });
  }, [token, supportOnly]);

  useEffect(() => {
    if (!supportOnly) return;
    setForm((prev) =>
      prev.roleCode === "SALES_SUPPORT_EXECUTIVE"
        ? prev
        : { ...prev, roleCode: "SALES_SUPPORT_EXECUTIVE" },
    );
  }, [supportOnly]);

  function clearFieldError(key: string) {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "roleCode" && teamsLoaded && !supportOnly) {
        next.teamChoice = defaultTeamChoice(
          value as RoleCode,
          teams.length,
        );
        if (
          next.teamChoice === "existing" &&
          !prev.teamId &&
          teams.length === 1 &&
          teams[0]
        ) {
          next.teamId = teams[0].id;
        }
      }
      return next;
    });
    clearFieldError(String(key));
  }

  function setTeamChoice(choice: TeamChoice) {
    setForm((prev) => {
      const next = { ...prev, teamChoice: choice };
      if (
        choice === "existing" &&
        !prev.teamId &&
        teams.length === 1 &&
        teams[0]
      ) {
        next.teamId = teams[0].id;
      }
      return next;
    });
    clearFieldError("teamId");
    clearFieldError("newTeamName");
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
      next.password =
        "Password must be at least 8 characters with a letter and a number";
    }
    if (!form.roleCode) next.roleCode = "Role is required";
    if (supportOnly && !form.teamId && teams.length === 0) {
      next.teamId = "You must lead a team to create Sales Support";
    }
    if (!supportOnly) {
      if (form.teamChoice === "none" && teamRequired) {
        next.teamId =
          form.roleCode === "SALES_EXECUTIVE"
            ? "Sales Executives must be placed on a team"
            : "Team Leads need a team";
      }
      if (form.teamChoice === "existing" && !form.teamId) {
        next.teamId = "Select a team, or create a new one";
      }
      if (form.teamChoice === "new" && !form.newTeamName.trim()) {
        next.newTeamName = "Team name is required";
      }
    }
    if (form.roleCode === "SALES_EXECUTIVE") {
      const display =
        form.displayName.trim() ||
        `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
      if (!display) {
        next.displayName = "Display name is required";
      }
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token || !validate()) return;
    setSubmitting(true);
    setError(null);
    try {
      let resolvedTeamId: string | null =
        form.teamId || (supportOnly ? teams[0]?.id : undefined) || null;

      if (!supportOnly) {
        if (form.teamChoice === "new") {
          const teamRes = await api.createTeam(token, {
            name: form.newTeamName.trim(),
            description: form.newTeamDescription.trim() || undefined,
          });
          resolvedTeamId = teamRes.data.team.id;
          setTeams((prev) => [...prev, teamRes.data.team]);
        } else if (form.teamChoice === "existing") {
          resolvedTeamId = form.teamId || null;
        } else {
          resolvedTeamId = null;
        }
      }

      if (form.roleCode === "SALES_EXECUTIVE") {
        if (!resolvedTeamId) {
          setError("Sales Executives must be placed on a team");
          setSubmitting(false);
          return;
        }
        const displayName =
          form.displayName.trim() ||
          `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
        const res = await api.createSalesExecutive(token, {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          password: form.password,
          isActive: form.isActive === "true",
          teamId: resolvedTeamId,
          displayName,
          employeeCode: form.employeeCode.trim() || null,
        });
        pushToast(
          form.teamChoice === "new"
            ? "Sales Executive and team created"
            : "Sales Executive created",
          "success",
        );
        if (canCreateAny) {
          router.push(`/users/${res.data.user.id}`);
        } else {
          router.push(`/profiles/${res.data.profile.id}`);
        }
        return;
      }

      const res = await api.createUser(token, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        roleCode: form.roleCode,
        isActive: form.isActive === "true",
        teamId: resolvedTeamId,
      });
      pushToast(
        supportOnly
          ? "Sales Support Executive created"
          : form.teamChoice === "new"
            ? "User and team created"
            : "User created",
        "success",
      );
      if (canCreateAny) {
        router.push(`/users/${res.data.user.id}`);
      } else if (resolvedTeamId) {
        router.push(`/teams/${resolvedTeamId}`);
      } else {
        router.push("/teams");
      }
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
        title={supportOnly ? "Add Sales Support" : "Create user"}
        description={
          supportOnly
            ? "Create a Sales Support Executive account for your team."
            : "Add a login account, assign a system role, and place them on a team — create one here if needed."
        }
        actions={
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push(exitHref)}
          >
            Back to {exitLabel}
          </Button>
        }
      />

      {error && <ErrorState message={error} />}
      {supportOnly && fieldErrors.teamId ? (
        <ErrorState message={fieldErrors.teamId} />
      ) : null}

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
                <span aria-hidden="true">
                  {ok && form.password.length > 0 ? "✓" : "○"}
                </span>
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
              {supportOnly
                ? "They will join your team as Sales Support."
                : "Role controls what the person can see and do after they sign in."}
            </p>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-[var(--color-ink)]">
              System role <span className="text-red-600">*</span>
            </legend>
            <div className="grid gap-2">
              {roleOptions.map((role) => {
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
                      disabled={supportOnly}
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

        {!supportOnly ? (
          <section className="space-y-4 border-b border-[var(--color-line)] p-5">
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-ink)]">
                Organization
              </h2>
              <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
                {isSalesExecutiveRole
                  ? "Sales Executives need a team. Their sales profile is created with the account."
                  : isTeamLeadRole
                    ? "Team Leads need a team. Create one here or pick an existing team."
                    : "Place them on a team now, create one here, or skip and assign later."}
              </p>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-[var(--color-ink)]">
                Team
              </p>
              <SegmentedControl
                ariaLabel="Team assignment"
                value={form.teamChoice === "none" && teamRequired ? "existing" : form.teamChoice}
                onChange={setTeamChoice}
                options={[
                  ...(teams.length > 0
                    ? [{ value: "existing" as const, label: "Existing" }]
                    : []),
                  { value: "new", label: "Create new" },
                  ...(!teamRequired
                    ? [{ value: "none" as const, label: "Skip" }]
                    : []),
                ]}
              />
            </div>

            {form.teamChoice === "existing" ? (
              <SelectField
                label="Select team"
                value={form.teamId}
                onChange={(e) => setField("teamId", e.target.value)}
                error={fieldErrors.teamId}
                hint={
                  selectedTeam
                    ? `Will join ${selectedTeam.name}${
                        selectedRole
                          ? ` as ${roleLabel(selectedRole.code)}`
                          : ""
                      }.`
                    : "Choose which team they join."
                }
              >
                <option value="">Select a team…</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </SelectField>
            ) : null}

            {form.teamChoice === "new" ? (
              <div className="space-y-4">
                <TextInput
                  label="Team name"
                  required
                  value={form.newTeamName}
                  onChange={(e) => setField("newTeamName", e.target.value)}
                  error={fieldErrors.newTeamName}
                  placeholder={
                    isTeamLeadRole && form.firstName.trim()
                      ? `${form.firstName.trim()}'s team`
                      : "Alpha Sales Team"
                  }
                  hint={
                    selectedRole
                      ? `Creates the team and adds this person as ${roleLabel(selectedRole.code)}.`
                      : "Creates the team and adds this person as a member."
                  }
                />
                <TextArea
                  label="Description"
                  rows={2}
                  value={form.newTeamDescription}
                  onChange={(e) =>
                    setField("newTeamDescription", e.target.value)
                  }
                  placeholder="Optional context for this team"
                />
              </div>
            ) : null}

            {form.teamChoice === "none" ? (
              <p className="text-xs text-[var(--color-ink-muted)]">
                {isTeamLeadRole
                  ? "You can create or assign their team later from the Teams page."
                  : "You can assign a team later from the user or team page."}
              </p>
            ) : null}
          </section>
        ) : null}

        {isSalesExecutiveRole && !supportOnly ? (
          <section className="space-y-4 border-b border-[var(--color-line)] p-5">
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-ink)]">
                Sales profile
              </h2>
              <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
                How this person appears on intervention and coaching records.
              </p>
            </div>
            <TextInput
              label="Display name"
              value={form.displayName}
              onChange={(e) => setField("displayName", e.target.value)}
              error={fieldErrors.displayName}
              placeholder={
                form.firstName.trim() || form.lastName.trim()
                  ? `${form.firstName.trim()} ${form.lastName.trim()}`.trim()
                  : "As shown on the sales profile"
              }
              hint="Defaults to first and last name if left blank."
            />
            <TextInput
              label="Employee code"
              value={form.employeeCode}
              onChange={(e) => setField("employeeCode", e.target.value)}
              placeholder="Optional"
              hint="Optional HR or payroll identifier."
            />
          </section>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--color-surface-2)] px-5 py-4">
          <p className="text-xs text-[var(--color-ink-muted)]">
            {user?.roleCode === "TEAM_LEAD" ? (
              "Added to your team automatically."
            ) : (
              <>
                Required fields are marked with{" "}
                <span className="text-red-600">*</span>
              </>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push(exitHref)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? form.teamChoice === "new" && !supportOnly
                  ? isSalesExecutiveRole
                    ? "Creating Sales Executive & team…"
                    : "Creating user & team…"
                  : isSalesExecutiveRole
                    ? "Creating Sales Executive…"
                    : "Creating…"
                : supportOnly
                  ? "Create Sales Support"
                  : isSalesExecutiveRole
                    ? form.teamChoice === "new"
                      ? "Create Sales Executive & team"
                      : "Create Sales Executive"
                    : form.teamChoice === "new"
                      ? "Create user & team"
                      : "Create user"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
