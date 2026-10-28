import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useLayoutEffect, useState, type ReactNode, type SyntheticEvent } from "react";
import {
  CircleCheck,
  CircleX,
  Clock,
  Loader2,
  Lock,
  LockKeyhole,
  MailWarning,
  ShieldCheck,
} from "lucide-react";

import { Field } from "./login";
import {
  getApiErrorBody,
  getApiErrorCode,
  useResetPassword,
  useValidateResetToken,
} from "@/hooks/useAuthMutations";
import { toErrorMessage } from "@/lib/queryClient";

export const Route = createFileRoute("/reset-password/$token")({
  head: () => ({
    meta: [{ title: "Reset password — PulseLab" }],
  }),
  component: ResetPasswordPage,
});

/**
 * Keeps the token in this URL out of Referer headers while the page is
 * open. Production also sends `Referrer-Policy: no-referrer` (vercel.json).
 * A layout effect so it is in place before the validation request fires.
 */
function useNoReferrer() {
  useLayoutEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "referrer";
    meta.content = "no-referrer";
    document.head.appendChild(meta);

    return () => meta.remove();
  }, []);
}

// Mirrors the backend policy in Engr-BE (resetpassword controller).
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

type LinkProblem = "TOKEN_INVALID" | "TOKEN_EXPIRED" | "EMAIL_NOT_VERIFIED";

function linkProblemFrom(error: unknown): LinkProblem | null {
  const code = getApiErrorCode(error);

  return code === "TOKEN_INVALID" || code === "TOKEN_EXPIRED" || code === "EMAIL_NOT_VERIFIED"
    ? code
    : null;
}

function ResetPasswordPage() {
  const { token } = Route.useParams();

  useNoReferrer();

  const validation = useValidateResetToken(token);
  const resetPassword = useResetPassword();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const loading = resetPassword.isPending;

  const passwordError =
    password.length === 0
      ? "Please enter a new password."
      : password.length < PASSWORD_MIN_LENGTH
        ? `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`
        : password.length > PASSWORD_MAX_LENGTH
          ? `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`
          : null;

  const confirmError =
    confirmPassword.length === 0
      ? "Please confirm your new password."
      : confirmPassword !== password
        ? "Passwords do not match."
        : null;

  const showPasswordError = submitted && passwordError;
  const showConfirmError =
    (submitted || (confirmPassword.length > 0 && confirmPassword.length >= password.length)) &&
    confirmError;

  const linkProblemError = linkProblemFrom(resetPassword.error)
    ? resetPassword.error
    : linkProblemFrom(validation.error)
      ? validation.error
      : null;
  const linkProblem = linkProblemFrom(linkProblemError);
  const unverifiedEmail =
    linkProblem === "EMAIL_NOT_VERIFIED" ? getApiErrorBody(linkProblemError)?.email : undefined;

  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loading) return;

    setSubmitted(true);
    setError(null);

    if (passwordError || confirmError) return;

    try {
      await resetPassword.mutateAsync({ token, password, confirmPassword });
      setPassword("");
      setConfirmPassword("");
      setDone(true);
    } catch (mutationError) {
      if (!linkProblemFrom(mutationError)) {
        setError(toErrorMessage(mutationError, "Unable to reset your password. Please try again."));
      }
    }
  };

  let view: { key: string; content: ReactNode };

  if (done) {
    view = {
      key: "done",
      content: (
        <StatusView
          tone="success"
          icon={<CircleCheck size={26} aria-hidden="true" />}
          title="Password reset"
          description="Your password has been updated and you've been signed out of other sessions. You can now sign in with your new password."
          action={<PrimaryLink to="/login">Back to Login</PrimaryLink>}
        />
      ),
    };
  } else if (linkProblem === "EMAIL_NOT_VERIFIED") {
    view = {
      key: "email-not-verified",
      content: (
        <StatusView
          tone="warning"
          icon={<MailWarning size={26} aria-hidden="true" />}
          title="Verify your email first"
          description="You need to verify your email address before you can reset your password. Verify your email, then request a new reset link."
          action={
            <Link
              to="/verify-email"
              search={{ email: unverifiedEmail, reason: "forgot-password" }}
              className={primaryButtonClass}
            >
              Verify my email
            </Link>
          }
        />
      ),
    };
  } else if (linkProblem === "TOKEN_EXPIRED") {
    view = {
      key: "expired",
      content: (
        <StatusView
          tone="warning"
          icon={<Clock size={26} aria-hidden="true" />}
          title="This link has expired"
          description="Password reset links are valid for 30 minutes. Request a new link to continue."
          action={<PrimaryLink to="/forgot-password">Request a new link</PrimaryLink>}
        />
      ),
    };
  } else if (linkProblem === "TOKEN_INVALID") {
    view = {
      key: "invalid",
      content: (
        <StatusView
          tone="error"
          icon={<CircleX size={26} aria-hidden="true" />}
          title="Invalid reset link"
          description="This password reset link is invalid or has already been used. Request a new link to reset your password."
          action={<PrimaryLink to="/forgot-password">Request a new link</PrimaryLink>}
        />
      ),
    };
  } else if (validation.isPending) {
    view = {
      key: "checking",
      content: (
        <div className="flex flex-col items-center py-10 text-center" role="status">
          <Loader2 size={28} className="animate-spin text-brand-accent" aria-hidden="true" />
          <p className="mt-4 text-sm text-slate-500">Checking your reset link...</p>
        </div>
      ),
    };
  } else if (validation.isError) {
    view = {
      key: "check-failed",
      content: (
        <StatusView
          tone="error"
          icon={<CircleX size={26} aria-hidden="true" />}
          title="Something went wrong"
          description={toErrorMessage(
            validation.error,
            "We couldn't verify your reset link. Please try again.",
          )}
          action={
            <button
              type="button"
              onClick={() => validation.refetch()}
              className={primaryButtonClass}
            >
              Try again
            </button>
          }
        />
      ),
    };
  } else {
    view = {
      key: "form",
      content: (
        <>
          <div className="flex size-12 items-center justify-center rounded-full bg-brand-accent/10 text-brand-accent">
            <LockKeyhole size={22} aria-hidden="true" />
          </div>

          <h1 className="mt-5 text-2xl sm:text-3xl font-bold text-brand-navy">
            Set a new password
          </h1>

          <p className="text-slate-500 mt-2 text-sm leading-relaxed">
            Choose a strong password you haven't used before. It must be at least{" "}
            {PASSWORD_MIN_LENGTH} characters long.
          </p>

          <form onSubmit={submit} noValidate className="mt-8 space-y-4">
            <div>
              <Field
                label="New password"
                value={password}
                onChange={setPassword}
                type="password"
                placeholder="••••••••"
                icon={<Lock size={18} />}
                autoComplete="new-password"
                autoFocus
                disabled={loading}
                revealable
                invalid={Boolean(showPasswordError)}
                describedBy="password-hint"
              />

              <p
                id="password-hint"
                className={`mt-2 flex items-center gap-1.5 text-sm ${
                  showPasswordError
                    ? "text-red-600"
                    : password.length >= PASSWORD_MIN_LENGTH
                      ? "text-emerald-600"
                      : "text-slate-500"
                }`}
              >
                {!showPasswordError && password.length >= PASSWORD_MIN_LENGTH && (
                  <ShieldCheck size={16} aria-hidden="true" />
                )}
                {showPasswordError || `At least ${PASSWORD_MIN_LENGTH} characters`}
              </p>
            </div>

            <div>
              <Field
                label="Confirm password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                type="password"
                placeholder="••••••••"
                icon={<Lock size={18} />}
                autoComplete="new-password"
                disabled={loading}
                revealable
                invalid={Boolean(showConfirmError)}
                describedBy={showConfirmError ? "confirm-error" : undefined}
              />

              {showConfirmError ? (
                <p id="confirm-error" className="mt-2 text-sm text-red-600">
                  {showConfirmError}
                </p>
              ) : (
                confirmPassword.length > 0 &&
                !confirmError && (
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-emerald-600">
                    <ShieldCheck size={16} aria-hidden="true" />
                    Passwords match
                  </p>
                )
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
              disabled={loading}
              className={`w-full h-12 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 ${
                loading
                  ? "bg-slate-400 text-white cursor-not-allowed"
                  : "bg-brand-navy text-white hover:bg-slate-800"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Resetting password...</span>
                </>
              ) : (
                "Reset Password"
              )}
            </button>
          </form>

          <p className="text-sm text-slate-500 text-center mt-6">
            Remembered it?{" "}
            <Link
              to="/login"
              className="rounded-sm text-brand-accent font-semibold transition hover:text-brand-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
            >
              Back to Login
            </Link>
          </p>
        </>
      ),
    };
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-slate-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-sm bg-white p-6 sm:p-8 shadow-sm"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={view.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {view.content}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// --------------------------------
// STATUS VIEWS
// --------------------------------

const primaryButtonClass =
  "mt-8 w-full h-12 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 bg-brand-navy text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2";

function PrimaryLink({ to, children }: { to: "/login" | "/forgot-password"; children: ReactNode }) {
  return (
    <Link to={to} className={primaryButtonClass}>
      {children}
    </Link>
  );
}

const toneClasses = {
  success: "bg-emerald-50 text-emerald-600 ring-emerald-50/50",
  warning: "bg-amber-50 text-amber-600 ring-amber-50/50",
  error: "bg-red-50 text-red-600 ring-red-50/50",
} as const;

function StatusView({
  tone,
  icon,
  title,
  description,
  action,
}: {
  tone: keyof typeof toneClasses;
  icon: ReactNode;
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <div className="text-center" role={tone === "success" ? "status" : "alert"}>
      <div
        className={`mx-auto flex size-14 items-center justify-center rounded-full ring-8 ${toneClasses[tone]}`}
      >
        {icon}
      </div>

      <h1 className="mt-6 text-2xl sm:text-3xl font-bold text-brand-navy">{title}</h1>

      <p className="mt-3 text-sm leading-relaxed text-slate-500">{description}</p>

      {action}

      {tone !== "success" && (
        <Link
          to="/login"
          className="mt-5 mx-auto flex w-fit rounded-sm text-sm font-medium text-slate-500 transition hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
        >
          Back to Login
        </Link>
      )}
    </div>
  );
}
