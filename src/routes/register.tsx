import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Field } from "./login";
import { getApiErrorBody, getApiErrorCode, useUserRegister } from "@/hooks/useAuthMutations";
import { toErrorMessage } from "@/lib/queryClient";
import { AuthShell } from "@/components/auth/AuthShell";

// icons
import {
  AlertCircle,
  ArrowRight,
  ChevronDown,
  User,
  Mail,
  Hash,
  Lock,
  Users,
  Phone,
  Loader2,
} from "lucide-react";
// import { API_URLS } from "@/utils/apiConfig";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create account — EU Hardwarestore" },
      {
        name: "description",
        content:
          "Create an EU Hardwarestore student account to order Elizade University lab components and track campus pickup.",
      },
    ],
  }),
  component: RegisterPage,
});
type ConflictField = "matric" | "phoneNumber";

function RegisterPage() {
  const navigate = useNavigate();
  const registerMutation = useUserRegister();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [matric, setMatric] = useState("");
  const [gender, setGender] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [accountExists, setAccountExists] = useState(false);
  // Server-reported conflicts tied to a specific field (409 ACCOUNT_EXISTS
  // with `field`), shown inline under that input.
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ConflictField, string>>>({});
  const [loading, setLoading] = useState(false);
  const clearFieldError = (field: ConflictField) =>
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });

  // Guards against double submits before the `loading` state re-renders.
  const submittingRef = useRef(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (submittingRef.current) {
      return;
    }

    setError(null);
    setAccountExists(false);
    setFieldErrors({});
    setLoading(true);

    const formattedMatric = matric.trim().toUpperCase();

    const matricRegex = /^EU\d{6}-\d{4}$/i;

    if (!matricRegex.test(formattedMatric)) {
      setLoading(false);
      return setError("Matric number must be in the format EU250102-4768");
    }

    const cleanPhone = phoneNumber.trim();

    if (!cleanPhone) {
      setLoading(false);
      return setError("Phone number is required.");
    }

    if (!gender) {
      setLoading(false);
      return setError("Please select your gender.");
    }

    if (password.length < 6) {
      setLoading(false);
      return setError("Password must be at least 6 characters.");
    }

    const cleanEmail = email.trim().toLowerCase();
    submittingRef.current = true;

    try {
      const res = await registerMutation.mutateAsync({
        fullName,
        email: cleanEmail,
        matric: formattedMatric,
        phoneNumber: cleanPhone,
        gender,
        password,
      });

      // The account is not usable until the email is verified, so send
      // the student to the "check your inbox" page rather than login.
      await navigate({
        to: "/verify-email",
        search: {
          email: res?.email ?? cleanEmail,
          reason: res?.code === "VERIFICATION_EMAIL_FAILED" ? "send-failed" : "sent",
        },
      });
    } catch (error) {
      const code = getApiErrorCode(error);
      const body = getApiErrorBody(error);

      if (code === "EMAIL_NOT_VERIFIED") {
        await navigate({
          to: "/verify-email",
          search: { email: body?.email ?? cleanEmail, reason: "unverified" },
        });
        return;
      }

      if (code === "ACCOUNT_EXISTS") {
        const field = (body as { field?: unknown } | undefined)?.field;

        if (field === "matric" || field === "phoneNumber") {
          setFieldErrors({
            [field]:
              body?.message ??
              (field === "matric"
                ? "This matric number is already registered."
                : "This phone number is already registered."),
          });
          return;
        }

        setAccountExists(true);
        setError(body?.message ?? "An account with this email already exists. Please log in.");
        return;
      }

      setError(toErrorMessage(error, "Unable to connect to server"));
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };
  return (
    <AuthShell
      eyebrow="Student registration"
      title="Create your account."
      description="Use your Elizade University details. We'll email a verification link before your first sign-in."
    >
      <form onSubmit={submit} className="space-y-4">
        <Field
          label="Full name"
          value={fullName}
          onChange={setFullName}
          placeholder="Your full name"
          icon={<User size={18} />}
          autoComplete="name"
        />

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
            label="Matric number"
            value={matric}
            onChange={(value) => {
              setMatric(value);
              clearFieldError("matric");
            }}
            placeholder="EU250102-4768"
            icon={<Hash size={18} />}
            autoComplete="off"
            invalid={Boolean(fieldErrors.matric)}
            describedBy={fieldErrors.matric ? "matric-error" : undefined}
          />
          {fieldErrors.matric && (
            <p id="matric-error" role="alert" className="mt-1.5 text-xs text-red-600">
              {fieldErrors.matric}
            </p>
          )}
        </div>

        <div>
          <Field
            label="Phone number"
            value={phoneNumber}
            onChange={(value) => {
              setPhoneNumber(value);
              clearFieldError("phoneNumber");
            }}
            placeholder="080 0000 0000"
            icon={<Phone size={18} />}
            autoComplete="tel"
            invalid={Boolean(fieldErrors.phoneNumber)}
            describedBy={fieldErrors.phoneNumber ? "phoneNumber-error" : undefined}
          />
          {fieldErrors.phoneNumber && (
            <p id="phoneNumber-error" role="alert" className="mt-1.5 text-xs text-red-600">
              {fieldErrors.phoneNumber}
            </p>
          )}
        </div>

        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Gender
          </span>

          <div className="relative mt-2">
            <Users
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />

            <select
              value={gender}
              onChange={(event) => setGender(event.target.value)}
              required
              className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/70 pl-11 pr-10 text-sm font-medium text-brand-navy outline-none transition focus:border-brand-accent focus:bg-white focus:ring-4 focus:ring-brand-accent/10"
            >
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>

            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
          </div>
        </label>

        <Field
          label="Password"
          value={password}
          onChange={setPassword}
          type="password"
          placeholder="At least 6 characters"
          icon={<Lock size={18} />}
          autoComplete="new-password"
          revealable
        />

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700"
          >
            <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              {error}
              {accountExists && (
                <>
                  {" "}
                  <Link
                    to="/login"
                    className="rounded-sm font-semibold text-brand-accent underline-offset-4 transition hover:text-brand-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
                  >
                    Sign in instead
                  </Link>
                </>
              )}
            </span>
          </div>
        )}

        <p className="text-xs leading-relaxed text-slate-500">
          We'll email you a verification link. Verify your email before signing in. By creating an
          account you agree to our{" "}
          <Link
            to="/"
            hash="policy-terms"
            className="font-semibold text-brand-accent underline-offset-2 hover:underline"
          >
            Terms
          </Link>{" "}
          and{" "}
          <Link
            to="/"
            hash="policy-privacy"
            className="font-semibold text-brand-accent underline-offset-2 hover:underline"
          >
            Privacy Policy
          </Link>
          .
        </p>

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
              <span>Creating account…</span>
            </>
          ) : (
            <>
              <span>Create account</span>
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
          Already registered?{" "}
          <Link
            to="/login"
            className="rounded-sm font-semibold text-brand-accent transition hover:text-brand-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
