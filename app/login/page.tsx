"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { resolveOwnSalesProfileId } from "@/lib/own-profile";
import { consumeLogoutReason } from "@/lib/session";
import { Button, PasswordInput, TextInput } from "@/components/ui";
import { Icons } from "@/components/icons";
import { Brand, PerformanceVisual } from "@/components/auth/PerformanceVisual";

type Phase = "idle" | "submitting" | "success";
type FieldName = "email" | "password";
type FieldErrors = Partial<Record<FieldName, string>>;

const EMAIL_ID = "login-email";
const PASSWORD_ID = "login-password";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUCCESS_DELAY_MS = 450;

function validateField(name: FieldName, value: string): string | undefined {
  if (name === "email") {
    const email = value.trim();
    if (!email) return "Enter your email address";
    if (!EMAIL_PATTERN.test(email)) return "Enter a valid email address";
    return undefined;
  }
  return value ? undefined : "Enter your password";
}

/** Never distinguish unknown email from wrong password. */
function submitErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 400 || err.status === 401) return "Incorrect email or password.";
    if (err.status === 429) return "Too many attempts. Try again shortly.";
  }
  return "Something went wrong. Try again.";
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function LoginPage() {
  const { login, user, token } = useAuth();
  const router = useRouter();
  const [values, setValues] = useState<Record<FieldName, string>>({ email: "", password: "" });
  const [touched, setTouched] = useState<Record<FieldName, boolean>>({
    email: false,
    password: false,
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const submittingRef = useRef(false);
  const navigatedRef = useRef(false);

  useEffect(() => {
    if (consumeLogoutReason() === "SESSION_REPLACED") {
      setSessionNotice(
        "You were signed out because your account was signed in on another device.",
      );
    }
  }, []);

  const goHome = useCallback(
    async (roleCode: string, accessToken: string) => {
      if (navigatedRef.current) return;
      navigatedRef.current = true;
      if (roleCode === "SALES_EXECUTIVE") {
        try {
          const profileId = await resolveOwnSalesProfileId(accessToken);
          if (profileId) {
            router.replace(`/profiles/${profileId}`);
            return;
          }
        } catch {
          /* fall through */
        }
      }
      router.replace("/dashboard");
    },
    [router],
  );

  // Already signed in when landing here; a fresh sign-in navigates from onSubmit.
  useEffect(() => {
    if (phase === "idle" && user && token) void goHome(user.roleCode, token);
  }, [phase, user, token, goHome]);

  function onChange(name: FieldName, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
    if (touched[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    }
    if (submitError) setSubmitError(null);
  }

  function onBlur(name: FieldName) {
    setTouched((prev) => ({ ...prev, [name]: true }));
    setFieldErrors((prev) => ({ ...prev, [name]: validateField(name, values[name]) }));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submittingRef.current || phase === "success") return;

    const errors: FieldErrors = {
      email: validateField("email", values.email),
      password: validateField("password", values.password),
    };
    setTouched({ email: true, password: true });
    setFieldErrors(errors);
    if (errors.email || errors.password) {
      document.getElementById(errors.email ? EMAIL_ID : PASSWORD_ID)?.focus();
      return;
    }

    submittingRef.current = true;
    setSubmitError(null);
    setSessionNotice(null);
    setPhase("submitting");
    try {
      const data = await login(values.email.trim(), values.password);
      setPhase("success");
      window.setTimeout(
        () => void goHome(data.user.roleCode, data.accessToken),
        prefersReducedMotion() ? 0 : SUCCESS_DELAY_MS,
      );
    } catch (err) {
      setPhase("idle");
      setSubmitError(submitErrorMessage(err));
      if (err instanceof ApiError && err.status === 401) {
        const password = document.getElementById(PASSWORD_ID) as HTMLInputElement | null;
        password?.focus();
        password?.select();
      }
    } finally {
      submittingRef.current = false;
    }
  }

  const busy = phase !== "idle";
  const redirecting = phase === "idle" && Boolean(user);

  return (
    <div className="auth-page">
      <aside className="auth-brand">
        <Brand />
        <div className="auth-hero">
          <div className="auth-hero-copy">
            <p className="auth-headline">
              Build a stronger
              <br />
              sales team.
            </p>
            <p className="mt-5 max-w-[470px] text-[17px] leading-relaxed text-[var(--color-ink-muted)]">
              See performance clearly, identify where executives need support, and turn coaching
              into measurable growth.
            </p>
          </div>
          <PerformanceVisual />
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-form-wrap" data-state={phase}>
          {redirecting ? (
            <p role="status" className="text-sm text-[var(--color-ink-muted)]">
              Opening your workspace…
            </p>
          ) : (
            <>
              <p className="text-[14px] font-medium text-[var(--color-ink-muted)]">Welcome back</p>
              <h1 className="mt-2 text-[clamp(30px,2.5vw,36px)] font-semibold leading-[1.15] tracking-[-0.025em] text-[var(--color-ink)]">
                Sign in to Commando
              </h1>
              <p className="mt-3 text-[15.5px] leading-relaxed text-[var(--color-ink-muted)]">
                Access your workspace and keep your team moving forward.
              </p>

              <form onSubmit={onSubmit} noValidate className="mt-5">
                <div className="auth-alert mb-1" role="alert" aria-atomic="true">
                  {submitError ? (
                    <div className="flex items-start gap-2 rounded-[var(--radius-sm)] border border-[var(--status-danger-ring)] bg-[var(--status-danger-bg)] px-3 py-2.5 text-sm text-[var(--color-ink)]">
                      <Icons.alert
                        size={16}
                        className="mt-0.5 shrink-0 text-[var(--status-danger)]"
                      />
                      <span>{submitError}</span>
                    </div>
                  ) : sessionNotice ? (
                    <div className="flex items-start gap-2 rounded-[var(--radius-sm)] border border-[var(--color-brand-ring)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-ink)]">
                      <Icons.alert
                        size={16}
                        className="mt-0.5 shrink-0 text-[var(--color-brand)]"
                      />
                      <span>{sessionNotice}</span>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <TextInput
                    id={EMAIL_ID}
                    label="Email"
                    type="email"
                    name="email"
                    inputMode="email"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    aria-required="true"
                    value={values.email}
                    onChange={(e) => onChange("email", e.target.value)}
                    onBlur={() => onBlur("email")}
                    readOnly={busy}
                    error={touched.email ? fieldErrors.email : undefined}
                    reserveMessageSpace
                  />
                  <PasswordInput
                    id={PASSWORD_ID}
                    label="Password"
                    name="password"
                    autoComplete="current-password"
                    aria-required="true"
                    value={values.password}
                    onChange={(e) => onChange("password", e.target.value)}
                    onBlur={() => onBlur("password")}
                    readOnly={busy}
                    error={touched.password ? fieldErrors.password : undefined}
                    reserveMessageSpace
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className={`auth-submit mt-5 w-full ${busy ? "cursor-progress" : ""}`}
                  aria-busy={phase === "submitting" || undefined}
                >
                  {phase === "submitting" ? (
                    <>
                      <span
                        className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
                        aria-hidden
                      />
                      Signing in…
                    </>
                  ) : phase === "success" ? (
                    <>
                      <Icons.check size={16} />
                      Signed in
                    </>
                  ) : (
                    <>
                      Sign in
                      <ArrowRight size={16} strokeWidth={2} className="auth-arrow" aria-hidden />
                    </>
                  )}
                </Button>
                <p role="status" className="sr-only">
                  {phase === "success" ? "Signed in. Opening your workspace…" : ""}
                </p>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
