import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useState, type FormEvent } from "react";

import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { useCurrentUser } from "@/lib/store";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4500";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [{ title: "Settings — PulseLab" }],
  }),
  component: () => (
    <RequireAuth role="student">
      <AppShell>
        <SettingsPage />
      </AppShell>
    </RequireAuth>
  ),
});

function SettingsPage() {
  const user = useCurrentUser();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const passwordChecks = [
    { label: "At least 8 characters", valid: newPassword.length >= 8 },
    {
      label: "A mix of letters and numbers",
      valid: /[a-z]/i.test(newPassword) && /\d/.test(newPassword),
    },
  ];

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 8) {
      setError("Your new password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Your new password and confirmation do not match.");
      return;
    }

    const token = sessionStorage.getItem("pulselab_token");

    if (!token) {
      setError("Your session has expired. Please sign in again.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/engineering/changepassword`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data: { message?: string } | null = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.message || "Unable to update your password. Please try again.");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(data?.message || "Your password has been updated successfully.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to connect to the server. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/70">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-accent/15 bg-brand-accent/5 px-3 py-1.5 text-xs font-semibold text-brand-navy">
            <ShieldCheck className="size-4 text-brand-accent" />
            Account security
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
            Settings
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
            Manage your account details and keep your PulseLab account secure.
          </p>
        </motion.header>

        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="h-20 bg-gradient-to-br from-brand-navy via-slate-800 to-brand-accent" />
              <div className="-mt-8 px-5 pb-5">
                <div className="flex size-16 items-center justify-center rounded-2xl border-4 border-white bg-brand-gold text-xl font-bold text-brand-navy shadow-sm">
                  {user?.fullName?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <h2 className="mt-3 truncate text-base font-bold text-brand-navy">
                  {user?.fullName || "Your account"}
                </h2>
                <p className="mt-1 truncate text-sm text-slate-500">
                  {user?.email || "Account profile"}
                </p>
              </div>
            </section>

            <nav
              aria-label="Settings sections"
              className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"
            >
              <div className="flex items-center gap-3 rounded-xl bg-brand-accent/5 px-3 py-3 text-sm font-semibold text-brand-navy">
                <LockKeyhole className="size-4 text-brand-accent" />
                Password & security
                <span className="ml-auto size-2 rounded-full bg-brand-accent" />
              </div>
            </nav>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
              <div className="flex gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm">
                  <ShieldCheck className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-950">Keep your account safe</p>
                  <p className="mt-1 text-xs leading-5 text-emerald-800/80">
                    Use a unique password and never share it with anyone.
                  </p>
                </div>
              </div>
            </div>
          </aside>

          <main className="min-w-0 space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex items-start gap-4 border-b border-slate-100 pb-5">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-accent/10 text-brand-accent">
                  <UserRound className="size-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-brand-navy">Account information</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    These details are linked to your PulseLab account.
                  </p>
                </div>
              </div>

              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                <AccountDetail label="Full name" value={user?.fullName} />
                <AccountDetail label="Email address" value={user?.email} />
                <AccountDetail label="Matric number" value={user?.matric} />
                <AccountDetail label="Account type" value="Student" />
              </dl>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-start gap-4 border-b border-slate-100 px-5 py-5 sm:px-7">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                  <KeyRound className="size-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-brand-navy">Change password</h2>
                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    Choose a strong password you don’t use for another account.
                  </p>
                </div>
              </div>

              <form onSubmit={submit} className="space-y-5 px-5 py-6 sm:px-7">
                <PasswordField
                  id="current-password"
                  label="Current password"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  autoComplete="current-password"
                  placeholder="Enter your current password"
                />

                <div className="grid gap-5 sm:grid-cols-2">
                  <PasswordField
                    id="new-password"
                    label="New password"
                    value={newPassword}
                    onChange={setNewPassword}
                    autoComplete="new-password"
                    placeholder="Create a new password"
                  />
                  <PasswordField
                    id="confirm-password"
                    label="Confirm new password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    autoComplete="new-password"
                    placeholder="Enter it again"
                  />
                </div>

                <div className="rounded-xl bg-slate-50 px-4 py-3">
                  <p className="mb-2 text-xs font-semibold text-slate-600">
                    For a stronger password
                  </p>
                  <ul className="flex flex-wrap gap-x-5 gap-y-2">
                    {passwordChecks.map((check) => (
                      <li
                        key={check.label}
                        className={`flex items-center gap-1.5 text-xs ${
                          check.valid ? "text-emerald-700" : "text-slate-500"
                        }`}
                      >
                        <Check
                          className={`size-3.5 ${check.valid ? "opacity-100" : "opacity-40"}`}
                        />
                        {check.label}
                      </li>
                    ))}
                  </ul>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  >
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    {error}
                  </div>
                )}

                {success && (
                  <div
                    role="status"
                    className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
                  >
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                    {success}
                  </div>
                )}

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-5 text-slate-400">
                    You’ll need your current password to confirm this change.
                  </p>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-navy px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <LockKeyhole className="size-4" />
                    {loading ? "Updating password..." : "Update password"}
                  </button>
                </div>
              </form>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

function AccountDetail({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 truncate text-sm font-semibold text-slate-800">
        {value || "Not provided"}
      </dd>
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  placeholder: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          required
          minLength={id === "current-password" ? undefined : 8}
          placeholder={placeholder}
          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-accent focus:ring-4 focus:ring-brand-accent/10"
        />
        <button
          type="button"
          onClick={() => setVisible((isVisible) => !isVisible)}
          aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-400 transition hover:text-slate-700"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}
