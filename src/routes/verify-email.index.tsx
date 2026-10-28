import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from "react";
import { ArrowLeft, CheckCircle2, Loader2, Mail, MailCheck, UserPlus } from "lucide-react";

import { Field } from "./login";
import { getApiErrorBody, getApiErrorCode, useResendVerification } from "@/hooks/useAuthMutations";
import { toErrorMessage } from "@/lib/queryClient";
import { ApiError } from "@/lib/apiClient";

const REASONS = [
  "sent",
  "send-failed",
  "unverified",
  "login",
  "forgot-password",
  "expired",
] as const;

type VerifyReason = (typeof REASONS)[number];

type VerifyEmailSearch = {
  email?: string;
  reason?: VerifyReason;
};

const MAX_EMAIL_LENGTH = 254;
const DEFAULT_COOLDOWN_SECONDS = 60;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseEmail(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_EMAIL_LENGTH) return undefined;
  return trimmed;
}

function parseReason(value: unknown): VerifyReason | undefined {
  return typeof value === "string" && (REASONS as readonly string[]).includes(value)
    ? (value as VerifyReason)
    : undefined;
}

export const Route = createFileRoute("/verify-email/")({
  head: () => ({
    meta: [{ title: "Verify your email" }],
  }),
  validateSearch: (search: Record<string, unknown>): VerifyEmailSearch => {
    const result: VerifyEmailSearch = {};
    const email = parseEmail(search.email);
    const reason = parseReason(search.reason);
    if (email) result.email = email;
    if (reason) result.reason = reason;
    return result;
  },
  component: VerifyEmailPage,
});

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function normalizeSeconds(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.min(Math.ceil(value), 60 * 60)
    : DEFAULT_COOLDOWN_SECONDS;
}

function ReasonMessage({ reason, email }: { reason?: VerifyReason; email?: string }) {
  const emailNode = email ? (
    <span className="font-semibold text-brand-navy break-all">{email}</span>
  ) : (
    "your email address"
  );

  switch (reason) {
    case "sent":
      return (
        <>
          We've sent a verification link to {emailNode}. Click the link in that email to activate
          your account.
        </>
      );
    case "send-failed":
      return (
        <>
          Your account was created, but we couldn't send the verification email to {emailNode}. Use
          the button below to resend it.
        </>
      );
    case "unverified":
      return (
        <>
          {email ? <>The email {emailNode} is</> : "This email is"} already registered but hasn't
          been verified yet. Check your inbox or resend the verification email.
        </>
      );
    case "login":
      return <>Please verify {emailNode} before logging in.</>;
    case "forgot-password":
      return <>Please verify {emailNode} before resetting your password.</>;
    case "expired":
      return (
        <>
          Your verification link has expired. Request a new one below
          {email ? <> and we'll send it to {emailNode}</> : null}.
        </>
      );
    default:
      return email ? (
        <>
          Verify {emailNode} to activate your account. Request a new verification link below if you
          need one.
        </>
      ) : (
        <>Enter the email address you registered with and we'll send you a new verification link.</>
      );
  }
}

function VerifyEmailPage() {
  const { email: searchEmail, reason } = Route.useSearch();
  const resend = useResendVerification();

  const [emailInput, setEmailInput] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const inFlight = useRef(false);

  const startCooldown = useCallback((seconds: number) => {
    const current = Date.now();
    setNow(current);
    setCooldownUntil(current + seconds * 1000);
  }, []);

  // Start the countdown on mount when an email was just sent (client-only to avoid SSR mismatch).
  useEffect(() => {
    if (reason === "sent") startCooldown(DEFAULT_COOLDOWN_SECONDS);
  }, [reason, startCooldown]);

  useEffect(() => {
    if (cooldownUntil === null) return;
    const tick = () => {
      const current = Date.now();
      setNow(current);
      if (current >= cooldownUntil) setCooldownUntil(null);
    };
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [cooldownUntil]);

  const remainingSeconds =
    cooldownUntil !== null ? Math.max(0, Math.ceil((cooldownUntil - now) / 1000)) : 0;
  const coolingDown = remainingSeconds > 0;
  const loading = resend.isPending;
  const disabled = loading || coolingDown;

  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current || disabled) return;

    setError(null);
    setSuccessMessage(null);

    const targetEmail = searchEmail ?? emailInput.trim();

    if (!searchEmail) {
      if (!targetEmail) {
        setFieldError("Please enter your email address.");
        return;
      }
      if (targetEmail.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(targetEmail)) {
        setFieldError("Please enter a valid email address.");
        return;
      }
      setFieldError(null);
    }

    inFlight.current = true;
    try {
      const response = await resend.mutateAsync({ email: targetEmail });
      setSuccessMessage(
        response?.message ||
          "If an unverified account exists for that email, a new verification link has been sent.",
      );
      startCooldown(normalizeSeconds(response?.retryAfterSeconds));
    } catch (mutationError) {
      const code = getApiErrorCode(mutationError);
      const body = getApiErrorBody(mutationError);

      if (code === "RESEND_COOLDOWN") {
        startCooldown(normalizeSeconds(body?.retryAfterSeconds));
        setError("Please wait a moment before requesting another verification email.");
      } else if (code === "RATE_LIMITED") {
        setError(
          toErrorMessage(
            mutationError,
            "Too many requests. Please wait a few minutes and try again.",
          ),
        );
      } else if (
        !searchEmail &&
        mutationError instanceof ApiError &&
        mutationError.status === 400
      ) {
        setFieldError("Please enter a valid email address.");
      } else {
        setError(
          toErrorMessage(
            mutationError,
            "We couldn't send the verification email right now. Please try again in a few minutes.",
          ),
        );
      }
    } finally {
      inFlight.current = false;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-slate-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-sm bg-white p-6 sm:p-8 shadow-sm"
      >
        <div className="flex size-12 items-center justify-center rounded-full bg-brand-accent/10 text-brand-accent">
          <MailCheck size={22} aria-hidden="true" />
        </div>

        <h1 className="mt-5 text-2xl sm:text-3xl font-bold text-brand-navy">
          Verify Your Email Address
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          <ReasonMessage reason={reason} email={searchEmail} />
        </p>

        <p className="mt-3 text-sm leading-relaxed text-slate-500">
          You need to verify your email before you can log in or reset your password. Verification
          links expire after 24 hours.
        </p>

        <form onSubmit={submit} noValidate className="mt-6 space-y-4">
          {searchEmail ? (
            <div className="flex items-start gap-3 rounded-sm border border-slate-200 bg-slate-50 px-3 py-3">
              <Mail size={18} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Email address
                </p>
                <p className="text-sm font-semibold text-brand-navy break-all">{searchEmail}</p>
              </div>
            </div>
          ) : (
            <div>
              <Field
                label="Email"
                value={emailInput}
                onChange={(value) => {
                  setEmailInput(value);
                  if (fieldError) setFieldError(null);
                }}
                type="email"
                placeholder="you@example.com"
                icon={<Mail size={18} />}
                autoComplete="email"
                autoFocus
                disabled={loading}
                invalid={Boolean(fieldError)}
                describedBy={fieldError ? "email-error" : undefined}
              />
              {fieldError && (
                <p id="email-error" className="mt-2 text-sm text-red-600">
                  {fieldError}
                </p>
              )}
            </div>
          )}

          <div role="status" aria-live="polite">
            {successMessage && (
              <div className="flex items-start gap-2 rounded-sm border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>{successMessage}</span>
              </div>
            )}
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-sm border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={disabled}
            aria-disabled={disabled}
            aria-describedby={coolingDown ? "resend-countdown" : undefined}
            className={`w-full min-h-12 rounded-lg px-4 py-3 font-semibold transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 ${
              disabled
                ? "bg-slate-400 text-white cursor-not-allowed"
                : "bg-brand-navy text-white hover:bg-slate-800"
            }`}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                <span>Sending...</span>
              </>
            ) : (
              "Resend Verification Email"
            )}
          </button>

          {coolingDown && (
            <p id="resend-countdown" className="text-center text-sm text-slate-500 tabular-nums">
              Resend available in {formatCountdown(remainingSeconds)}
            </p>
          )}
        </form>

        <p className="mt-5 text-sm leading-relaxed text-slate-500">
          Don't see the email? Check your spam or junk folder, or wait a minute before requesting
          another link.
        </p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/login"
            className="flex min-h-12 items-center justify-center gap-1.5 rounded-sm px-2 text-sm font-medium text-slate-500 transition hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back to Login
          </Link>
          <Link
            to="/register"
            className="flex min-h-12 items-center justify-center gap-1.5 rounded-sm px-2 text-sm font-semibold text-brand-accent transition hover:text-brand-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
          >
            <UserPlus size={16} aria-hidden="true" />
            Use a different email
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
