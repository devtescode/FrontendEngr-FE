import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { CircleCheck, CircleX, Clock, Loader2, MailCheck } from "lucide-react";

import { getApiErrorBody, useVerifyEmail } from "@/hooks/useAuthMutations";
import { toErrorMessage } from "@/lib/queryClient";

export const Route = createFileRoute("/verify-email/$token")({
  head: () => ({
    meta: [{ title: "Verify email — EU hardwarestore" }],
  }),
  component: VerifyEmailTokenPage,
});

// Keeps the token in this URL out of Referer headers while the page is open.
function useNoReferrer() {
  useLayoutEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "referrer";
    meta.content = "no-referrer";
    document.head.appendChild(meta);

    return () => meta.remove();
  }, []);
}

function VerifyEmailTokenPage() {
  const { token } = Route.useParams();

  useNoReferrer();

  const navigate = useNavigate();
  const verifyEmail = useVerifyEmail(token);
  const secondsLeft = useRedirectCountdown(verifyEmail.isSuccess, () =>
    navigate({ to: "/login", search: { verified: true }, replace: true }),
  );

  const errorBody = getApiErrorBody(verifyEmail.error);
  const errorCode = errorBody?.code;

  let view: { key: string; content: ReactNode };

  if (verifyEmail.isSuccess) {
    const alreadyVerified = verifyEmail.data?.code === "ALREADY_VERIFIED";

    view = {
      key: alreadyVerified ? "already-verified" : "verified",
      content: (
        <StatusView
          tone="success"
          icon={
            alreadyVerified ? (
              <MailCheck size={26} aria-hidden="true" />
            ) : (
              <CircleCheck size={26} aria-hidden="true" />
            )
          }
          title={alreadyVerified ? "Email already verified" : "Your email is verified"}
          description={
            alreadyVerified
              ? "This email address has already been verified. You can log in to your account."
              : "Thanks for confirming your email address. You can now log in to your account."
          }
          action={
            <>
              <Link to="/login" search={{ verified: true }} replace className={primaryButtonClass}>
                Continue to Login
              </Link>
              <p className="mt-4 text-sm text-slate-500 tabular-nums">
                Taking you to login in {secondsLeft}s...
              </p>
            </>
          }
        />
      ),
    };
  } else if (errorCode === "TOKEN_EXPIRED") {
    view = {
      key: "expired",
      content: (
        <StatusView
          tone="warning"
          icon={<Clock size={26} aria-hidden="true" />}
          title="This link has expired"
          description="Verification links are valid for 24 hours. Request a new link to verify your email address."
          action={
            <Link
              to="/verify-email"
              search={{ email: errorBody?.email, reason: "expired" }}
              className={primaryButtonClass}
            >
              Request a new link
            </Link>
          }
        />
      ),
    };
  } else if (errorCode === "TOKEN_INVALID") {
    view = {
      key: "invalid",
      content: (
        <StatusView
          tone="error"
          icon={<CircleX size={26} aria-hidden="true" />}
          title="Invalid verification link"
          description="This verification link is invalid or has been replaced by a newer one. Request a new link to verify your email address."
          action={
            <Link to="/verify-email" className={primaryButtonClass}>
              Request a new link
            </Link>
          }
        />
      ),
    };
  } else if (verifyEmail.isError) {
    view = {
      key: "error",
      content: (
        <StatusView
          tone="error"
          icon={<CircleX size={26} aria-hidden="true" />}
          title="Something went wrong"
          description={toErrorMessage(
            verifyEmail.error,
            "We couldn't verify your email right now. Please try again.",
          )}
          action={
            <button
              type="button"
              onClick={() => verifyEmail.refetch()}
              disabled={verifyEmail.isFetching}
              className={primaryButtonClass}
            >
              Retry
            </button>
          }
        />
      ),
    };
  } else {
    view = {
      key: "verifying",
      content: (
        <div
          className="flex flex-col items-center py-10 text-center"
          role="status"
          aria-live="polite"
        >
          <Loader2 size={28} className="animate-spin text-brand-accent" aria-hidden="true" />
          <p className="mt-4 text-sm text-slate-500">Verifying your email...</p>
        </div>
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

const REDIRECT_SECONDS = 4;

// Counts down once `active` turns true, then calls `onDone`.
function useRedirectCountdown(active: boolean, onDone: () => void) {
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!active) return;
    if (secondsLeft <= 0) {
      onDoneRef.current();
      return;
    }
    const timer = window.setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [active, secondsLeft]);

  return secondsLeft;
}

// --------------------------------
// STATUS VIEWS
// --------------------------------

const primaryButtonClass =
  "mt-8 w-full h-12 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 bg-brand-navy text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2";

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
    <div
      className="text-center"
      role={tone === "success" ? "status" : "alert"}
      aria-live={tone === "success" ? "polite" : "assertive"}
    >
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
