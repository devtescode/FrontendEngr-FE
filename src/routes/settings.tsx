import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Check,
  Camera,
  CheckCircle2,
  KeyRound,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";

import { AppShell } from "@/components/AppShell";
import { pushToast } from "@/components/ComponentCard";
import { FormInput } from "@/components/FormInput";
import { RequireAuth } from "@/components/RequireAuth";
import { useChangePassword } from "@/hooks/useAuthMutations";
import {
  PROFILE_IMAGE_ACCEPT,
  profileImageErrorMessage,
  useProfile,
  useUploadProfileImage,
  validateProfileImage,
} from "@/hooks/useProfile";
import { toErrorMessage } from "@/lib/queryClient";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [{ title: "Settings — EU Hardwarestore" }],
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
  // The signed-in student: seeded from the session, then confirmed by
  // GET /engineering/profile.
  const { data: user } = useProfile();

  const changePasswordMutation = useChangePassword();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const showError = (message: string) => {
    setError(message);
    pushToast("error", message);
  };

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
      showError("Your new password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      showError("Your new password and confirmation do not match.");
      return;
    }

    const token = sessionStorage.getItem("pulselab_token");

    if (!token) {
      showError("Your session has expired. Please sign in again.");
      return;
    }

    setLoading(true);

    try {
      const data = await changePasswordMutation.mutateAsync({
        currentPassword,
        newPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      const message =
        (data as { message?: string })?.message ||
        "Your password has been updated successfully.";
      setSuccess(message);
      pushToast("success", message);
    } catch (requestError) {
      showError(
        toErrorMessage(
          requestError,
          "Unable to connect to the server. Please try again."
        )
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
            Manage your account details and keep your account secure.
          </p>
        </motion.header>

        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="h-20 bg-gradient-to-br from-brand-navy via-slate-800 to-brand-accent" />
              <div className="-mt-8 px-5 pb-5">
                <ProfilePhoto fullName={user?.fullName} imageUrl={user?.profileImageUrl} />
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
                    These details are linked to your EU Hardwarestore account.
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
                <FormInput
                  id="current-password"
                  label="Current password"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your current password"
                />

                <div className="grid gap-5 sm:grid-cols-2">
                  <FormInput
                    id="new-password"
                    label="New password"
                    value={newPassword}
                    onChange={setNewPassword}
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    placeholder="Create a new password"
                  />
                  <FormInput
                    id="confirm-password"
                    label="Confirm new password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
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

function ProfilePhoto({ fullName, imageUrl }: { fullName?: string; imageUrl?: string }) {
  const uploadMutation = useUploadProfileImage();
  const inputRef = useRef<HTMLInputElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);

  const uploading = uploadMutation.isPending;
  const initial = fullName?.charAt(0)?.toUpperCase() || "U";
  const displayUrl = previewUrl ?? (imageUrl && imageUrl !== brokenUrl ? imageUrl : null);

  // Release the local preview whenever it is replaced or the card unmounts.
  useEffect(() => {
    if (!previewUrl) return;

    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    // Reset so picking the same file again still fires a change event.
    event.target.value = "";

    if (!file || uploading) return;

    setPhotoError(null);

    const invalid = validateProfileImage(file);

    if (invalid) {
      setPhotoError(invalid);
      pushToast("error", invalid);
      return;
    }

    setPreviewUrl(URL.createObjectURL(file));

    try {
      const data = await uploadMutation.mutateAsync(file);
      setBrokenUrl(null);
      pushToast("success", data.message || "Your profile photo has been updated.");
    } catch (uploadError) {
      const message = profileImageErrorMessage(uploadError);
      setPhotoError(message);
      pushToast("error", message);
    } finally {
      setPreviewUrl(null);
    }
  };

  return (
    <div>
      <div className="relative size-16 overflow-hidden rounded-2xl border-4 border-white bg-brand-gold shadow-sm">
        {displayUrl ? (
          <img
            src={displayUrl}
            alt={fullName ? `${fullName}'s profile picture` : "Your profile picture"}
            className="size-full rounded-xl object-cover"
            onError={() => {
              if (displayUrl === imageUrl) setBrokenUrl(imageUrl);
            }}
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex size-full items-center justify-center text-xl font-bold text-brand-navy"
          >
            {initial}
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-brand-navy/50">
            <Loader2 className="size-5 animate-spin text-white" aria-hidden="true" />
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        id="profile-photo-input"
        type="file"
        accept={PROFILE_IMAGE_ACCEPT}
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={onFileChange}
        disabled={uploading}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-describedby={photoError ? "profile-photo-error" : "profile-photo-hint"}
        className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-brand-navy shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {uploading ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Camera className="size-4" aria-hidden="true" />
        )}
        {uploading ? "Uploading photo..." : imageUrl ? "Change photo" : "Upload photo"}
      </button>

      <span role="status" className="sr-only">
        {uploading ? "Uploading your profile photo" : ""}
      </span>

      {photoError ? (
        <p
          id="profile-photo-error"
          role="alert"
          className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-red-700"
        >
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {photoError}
        </p>
      ) : (
        <p id="profile-photo-hint" className="mt-2 text-xs leading-5 text-slate-400">
          JPEG, PNG or WebP, up to 5 MB.
        </p>
      )}
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
