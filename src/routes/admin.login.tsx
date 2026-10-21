  import {
    createFileRoute,
    useNavigate,
  } from "@tanstack/react-router";
  import { motion } from "framer-motion";
  import { useEffect, useState } from "react";
  import logoImg from "../components/Assets/image.webp";

  import {
    useAdminExists,
    useAdminLogin,
    useAdminRegister,
  } from "@/hooks/useAuthMutations";
  import { toErrorMessage } from "@/lib/queryClient";

  export const Route = createFileRoute("/admin/login")({
    head: () => ({
      meta: [{ title: "Admin sign in — EU Hardwarestore" }],
    }),
    component: AdminLogin,
  });

  function AdminLogin() {
    const navigate = useNavigate();

    const adminExistsMutation = useAdminExists();
    const adminLoginMutation = useAdminLogin();
    const adminRegisterMutation = useAdminRegister();

    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // ----------------------------------
    // CHECK IF ADMIN EXISTS
    // ----------------------------------
    useEffect(() => {
      let mounted = true;

      adminExistsMutation
        .mutateAsync()
        .then((exists) => {
          if (mounted) setHasAdmin(exists);
        })
        .catch(() => {
          if (mounted) {
            // If the endpoint fails, don't leave the page loading forever.
            setHasAdmin(true);
            setError(
              "Unable to check admin status. You can still try signing in."
            );
          }
        });

      return () => {
        mounted = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ----------------------------------
    // LOGIN
    // ----------------------------------
   const submit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  if (loading) return;

  setLoading(true);
  setError("");

  try {
    const isCreatingAdmin = hasAdmin === false;

    // ----------------------------------
    // CREATE ADMIN
    // ----------------------------------
    if (isCreatingAdmin) {
      await adminRegisterMutation.mutateAsync({
        username: username.trim(),
        email: email.trim(),
        password,
      });

      // ----------------------------------
      // ADMIN CREATED
      // NOW LOGIN AUTOMATICALLY
      // ----------------------------------
      // The login mutation stores the session and clears every cached
      // response left over from a previous admin.
      await adminLoginMutation.mutateAsync({
        email: email.trim(),
        password,
      });

      await navigate({
        to: "/admin",
        replace: true,
      });

      return;
    }

    // ----------------------------------
    // NORMAL ADMIN LOGIN
    // ----------------------------------
    await adminLoginMutation.mutateAsync({
      email: email.trim(),
      password,
    });

    await navigate({
      to: "/admin",
      replace: true,
    });
  } catch (error) {
    console.error("AUTH ERROR:", error);

    setError(toErrorMessage(error, "Unable to sign in. Please try again."));
  } finally {
    setLoading(false);
  }
};

    // ----------------------------------
    // LOADING ADMIN CHECK
    // ----------------------------------
    if (hasAdmin === null) {
      return (
        <div className="min-h-screen bg-slate-950 grid place-items-center text-white">
          <div className="text-center">
            <div className="animate-spin mx-auto mb-4 h-8 w-8 rounded-full border-2 border-white/20 border-t-white" />
            <p>Checking admin...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-950 grid place-items-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 p-8"
        >
          {/* LOGO */}
          <div className="flex items-center gap-2">
            <div className="size-8 rounded bg-brand-navy flex items-center justify-center overflow-hidden">
              <img
                src={logoImg}
                alt="EU Hardwarestore Logo"
                className="h-full w-full object-cover"
              />
            </div>

            <span className="text-xl font-bold tracking-tight">
              <span className="text-white">EU</span>{" "}
              <span className="font-semibold text-white">
                Hardwarestore
              </span>
            </span>
          </div>

          <h1 className="text-2xl font-bold text-slate-300 mt-6">
            Admin
          </h1>

          <p className="text-slate-300 text-sm mt-1">
            Restricted access for lab administrators.
          </p>

          <form
            onSubmit={submit}
            className="mt-8 space-y-4"
          >
            {hasAdmin === false && (
              <DarkField
                label="Username"
                value={username}
                onChange={setUsername}
              />
            )}

            <DarkField
              label="Email"
              value={email}
              onChange={setEmail}
              type="email"
            />

            <DarkField
              label="Password"
              value={password}
              onChange={setPassword}
              type="password"
            />

            {error && (
              <p className="text-sm text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full text-center h-12 rounded-lg bg-brand-gold text-white font-semibold hover:bg-amber-700 active:scale-[0.98] transition disabled:opacity-50"
            >
              {loading
                ? "Processing..."
                : hasAdmin === false
                ? "Create Admin"
                : "Sign in"}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  function DarkField({
    label,
    value,
    onChange,
    type = "text",
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    type?: string;
  }) {
    return (
      <label className="block">
        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-100">
          {label}
        </span>

        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          className="mt-1 w-full h-11 rounded-lg bg-slate-950 border border-white/10 px-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent transition"
        />
      </label>
    );
  }