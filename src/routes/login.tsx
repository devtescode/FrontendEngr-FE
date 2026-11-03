import {
  createFileRoute,
  Link,
  useNavigate,
  // Navigate,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode, type SyntheticEvent } from "react";
import { useStore } from "@/lib/store";
import { connectUserSocket, socket } from "@/lib/socket";
import { getApiErrorBody, getApiErrorCode, useUserLogin } from "@/hooks/useAuthMutations";
import { toErrorMessage } from "@/lib/queryClient";
import {
  AlertCircle,
  ArrowRight,
  Mail,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
  MailWarning,
} from "lucide-react";

import { AuthShell } from "@/components/auth/AuthShell";

type LoginSearch = {
  /** Set by the verify-email page after a successful verification. */
  verified?: boolean;
};

function isTruthyFlag(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — EU Hardwarestore" },
      {
        name: "description",
        content:
          "Sign in to your EU Hardwarestore student account to order lab components and track campus pickup.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): LoginSearch => {
    const { verified, ...rest } = search;

    return {
      ...rest,
      ...(isTruthyFlag(verified) ? { verified: true } : {}),
    };
  },
  component: LoginPage,
});

function LoginPage() {
  // const user = useCurrentUser();
  const navigate = useNavigate();
  const { verified } = Route.useSearch();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Email to hand to the verify-email page when the account is unverified.
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  const loginMutation = useUserLogin();

  // --------------------------------
  // RESTORE USER SESSION
  // --------------------------------
  useEffect(() => {
    const savedUser = sessionStorage.getItem("pulselab_user");
    const savedToken = sessionStorage.getItem("pulselab_token");

    if (!savedUser || !savedToken) {
      return;
    }

    try {
      const parsedUser = JSON.parse(savedUser);

      const userId = parsedUser?.id ?? parsedUser?._id ?? parsedUser?.userId;

      if (userId) {
        useStore.setState({
          currentUserId: userId,
        });
      }
    } catch (error) {
      console.error("Failed to restore session:", error);

      sessionStorage.removeItem("pulselab_user");
      sessionStorage.removeItem("pulselab_token");
    }
  }, []);

  // --------------------------------
  // REDIRECT IF ALREADY LOGGED IN
  // --------------------------------
  // if (user) {
  //   return (
  //     <Navigate
  //       to={user.role === "admin" ? "/admin" : "/dashboard"}
  //     />
  //   );
  // }

  // --------------------------------
  // LOGIN
  // --------------------------------
  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError(null);
    setUnverifiedEmail(null);

    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      // The mutation performs the request, clears every cached response
      // from the previous account and writes the new session.
      const response = await loginMutation.mutateAsync({
        email: cleanEmail,
        password,
      });

      const userData = response.user as {
        id?: string;
        role?: string;
      };

      const userId = String(userData?.id ?? "");

      // =================================================
      // CLEAR PREVIOUS USER'S CACHES
      // =================================================
      // A new login means we're switching users (or
      // re-authenticating the same user). The login mutation
      // already cleared every cached response; this tears down
      // the previous user's socket connection.
      //
      // If a socket is already connected as the previous
      // user, tear it down before joining the new room.
      // (connectUserSocket will reconnect below.)
      if (socket.connected) {
        socket.disconnect();
      }

      // --------------------------------
      // UPDATE ZUSTAND
      // --------------------------------
      useStore.setState({
        currentUserId: userId,
      });

      // --------------------------------
      // CONNECT SOCKET
      // --------------------------------
      // Reconnect and join the room under the new
      // user's ID. `connectUserSocket` reads the token
      // from sessionStorage, so it must run AFTER the
      // token was stored by the mutation.
      //
      socket.connect();
      connectUserSocket();

      // --------------------------------
      // REDIRECT
      // --------------------------------
      if (userData.role === "admin") {
        await navigate({
          to: "/admin",
          replace: true,
        });
      } else {
        await navigate({
          to: "/dashboard",
          replace: true,
        });
      }
    } catch (mutationError) {
      // Unverified accounts get a 403 without a token, so no session
      // was written — just explain and offer the verification flow.
      if (getApiErrorCode(mutationError) === "EMAIL_NOT_VERIFIED") {
        const body = getApiErrorBody(mutationError);
        setUnverifiedEmail(body?.email ?? cleanEmail);
        return;
      }

      console.error("Login error:", mutationError);

      setError(toErrorMessage(mutationError, "Unable to sign in. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Student account"
      title="Welcome back."
      description="Sign in to order components, follow live stock and collect your parts at the EU lab."
    >
      {verified && !unverifiedEmail && (
        <div
          role="status"
          aria-live="polite"
          className="mb-6 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800"
        >
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>Your email has been verified. You can now sign in.</span>
        </div>
      )}

      <form onSubmit={submit} className="space-y-5">
        <Field
          label="Email address"
          value={email}
          onChange={setEmail}
          type="email"
          placeholder="you@elizade.edu.ng"
          icon={<Mail size={18} />}
          autoComplete="email"
        />

        <div>
          <Field
            label="Password"
            value={password}
            onChange={setPassword}
            type="password"
            placeholder="Enter your password"
            icon={<Lock size={18} />}
            autoComplete="current-password"
            revealable
          />

          <div className="mt-2.5 flex justify-end">
            <Link
              to="/forgot-password"
              className="rounded-sm text-xs font-semibold text-brand-accent transition hover:text-brand-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700"
          >
            <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {unverifiedEmail && (
          <div
            role="alert"
            className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3.5 text-sm text-amber-800"
          >
            <div className="flex items-start gap-2.5">
              <MailWarning size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
              <p>
                Please verify your email address before signing in. Check your inbox for the
                verification link, or request a new one.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate({
                  to: "/verify-email",
                  search: { email: unverifiedEmail, reason: "login" },
                })
              }
              className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-lg border border-amber-300 bg-white text-sm font-semibold text-amber-900 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
            >
              Verify my email
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className={`group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 ${
            loading
              ? "cursor-not-allowed bg-slate-300 text-slate-600 shadow-none"
              : "bg-brand-gold text-brand-navy shadow-lg shadow-brand-gold/20 hover:bg-[#e88a0a] hover:shadow-xl"
          }`}
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" aria-hidden="true" />
              <span>Signing in…</span>
            </>
          ) : (
            <>
              <span>Sign in</span>
              <ArrowRight
                size={17}
                className="transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 border-t border-slate-100 pt-5 text-center">
        <p className="text-sm text-slate-500">
          New to EU Hardwarestore?{" "}
          <Link
            to="/register"
            className="rounded-sm font-semibold text-brand-accent transition hover:text-brand-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
          >
            Create an account
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

// --------------------------------
// FIELD COMPONENT
// --------------------------------

export function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  icon,
  autoComplete,
  autoFocus,
  disabled,
  invalid,
  describedBy,
  revealable,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  icon?: ReactNode;
  autoComplete?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  /** Adds a show/hide toggle to password fields. */
  revealable?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const canReveal = revealable && type === "password";

  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </span>

      <div className="relative mt-2">
        {icon && (
          <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </div>
        )}

        <input
          type={canReveal && visible ? "text" : type}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
          }}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          required
          className={`h-12 w-full rounded-xl border bg-slate-50/70 text-sm font-medium text-brand-navy outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:bg-white focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-100 ${
            invalid
              ? "border-red-300 focus:border-red-400 focus:ring-red-100"
              : "border-slate-200 focus:border-brand-accent focus:ring-brand-accent/10"
          } ${icon ? "pl-11" : "pl-3.5"} ${canReveal ? "pr-12" : "pr-3.5"}`}
        />

        {canReveal && (
          <button
            type="button"
            onClick={() => setVisible((isVisible) => !isVisible)}
            aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
            aria-pressed={visible}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-slate-400 transition hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-accent"
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </label>
  );
}
