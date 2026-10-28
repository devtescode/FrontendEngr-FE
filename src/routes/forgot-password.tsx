import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useState, type SyntheticEvent } from "react";
import { ArrowLeft, KeyRound, Loader2, Mail, MailCheck, MailWarning } from "lucide-react";

import { Field } from "./login";
import { getApiErrorBody, getApiErrorCode, useForgotPassword } from "@/hooks/useAuthMutations";
import { toErrorMessage } from "@/lib/queryClient";
import { ApiError } from "@/lib/apiClient";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [{ title: "Forgot password" }],
  }),
  component: ForgotPasswordPage,
});

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ForgotPasswordPage() {
  const forgotPassword = useForgotPassword();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  // Set when the account exists but its email address hasn't been verified yet.
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  const loading = forgotPassword.isPending;

  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loading) return;

    setError(null);
    setUnverifiedEmail(null);

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setFieldError("Please enter your email address.");
      return;
    }

    if (!EMAIL_PATTERN.test(cleanEmail)) {
      setFieldError("Please enter a valid email address.");
      return;
    }

    setFieldError(null);

    try {
      await forgotPassword.mutateAsync({ email: cleanEmail });
      setSentTo(cleanEmail);
    } catch (mutationError) {
      if (mutationError instanceof ApiError && mutationError.status === 404) {
        setFieldError("No account found with that email address.");
        return;
      }
      if (
        mutationError instanceof ApiError &&
        mutationError.status === 403 &&
        getApiErrorCode(mutationError) === "EMAIL_NOT_VERIFIED"
      ) {
        setUnverifiedEmail(getApiErrorBody(mutationError)?.email ?? cleanEmail);
        return;
      }
      setError(
        toErrorMessage(
          mutationError,
          "We couldn't send the reset email right now. Please try again.",
        ),
      );
    }
  };

  const tryAgain = () => {
    forgotPassword.reset();
    setSentTo(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-slate-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-sm bg-white p-6 sm:p-8 shadow-sm"
      >
        <AnimatePresence mode="wait" initial={false}>
          {sentTo ? (
            <motion.div
              key="sent"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="text-center"
              role="status"
              aria-live="polite"
            >
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50">
                <MailCheck size={26} aria-hidden="true" />
              </div>

              <h1 className="mt-6 text-2xl sm:text-3xl font-bold text-brand-navy">
                Check your email
              </h1>

              <p className="mt-3 text-sm leading-relaxed text-slate-500">
                We've sent a password reset link to{" "}
                <span className="font-semibold text-brand-navy break-all">{sentTo}</span>. The link
                expires in 30 minutes.
              </p>

              <p className="mt-3 text-sm leading-relaxed text-slate-500">
                Don't see it? Check your spam or junk folder.
              </p>

              <Link
                to="/login"
                className="mt-8 w-full h-12 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 bg-brand-navy text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
              >
                Back to Login
              </Link>

              <p className="mt-5 text-sm text-slate-500">
                Didn't get an email?{" "}
                <button
                  type="button"
                  onClick={tryAgain}
                  className="rounded-sm font-semibold text-brand-accent transition hover:text-brand-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
                >
                  Try again
                </button>
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-brand-accent/10 text-brand-accent">
                <KeyRound size={22} aria-hidden="true" />
              </div>

              <h1 className="mt-5 text-2xl sm:text-3xl font-bold text-brand-navy">
                Forgotten password?
              </h1>

              <p className="text-slate-500 mt-2 text-sm leading-relaxed">
                Enter the email address you registered with and we'll send you a link to reset your
                password.
              </p>

              <form onSubmit={submit} noValidate className="mt-8 space-y-4">
                <div>
                  <Field
                    label="Email"
                    value={email}
                    onChange={(value) => {
                      setEmail(value);
                      if (fieldError) setFieldError(null);
                      if (unverifiedEmail) setUnverifiedEmail(null);
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

                {unverifiedEmail && (
                  <div
                    role="alert"
                    className="rounded-sm border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800"
                  >
                    <div className="flex gap-2.5">
                      <MailWarning
                        size={18}
                        className="mt-0.5 shrink-0 text-amber-600"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="font-semibold">Verify your email first</p>
                        <p className="mt-1 leading-relaxed">
                          You need to verify your email address before you can reset your password.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        navigate({
                          to: "/verify-email",
                          search: { email: unverifiedEmail, reason: "forgot-password" },
                        })
                      }
                      className="mt-3 w-full h-12 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 bg-brand-navy text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
                    >
                      Verify my email
                    </button>
                  </div>
                )}

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
                      <span>Sending link...</span>
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </button>
              </form>

              <Link
                to="/login"
                className="mt-6 mx-auto flex w-fit items-center gap-1.5 rounded-sm text-sm font-medium text-slate-500 transition hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
              >
                <ArrowLeft size={16} aria-hidden="true" />
                Back to Login
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
