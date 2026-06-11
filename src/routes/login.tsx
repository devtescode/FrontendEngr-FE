import {
  createFileRoute,
  Link,
  useNavigate,
  Navigate,
} from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { useCurrentUser, useStore } from "@/lib/store";

// icons
import { Mail, Lock } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Sign in — PulseLab" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const user = useCurrentUser();
  const login = useStore((s) => s.login);
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (user) {
    return (
      <Navigate
        to={user.role === "admin" ? "/admin" : "/dashboard"}
      />
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    const res = login(email, password);

    if (!res.ok) {
      return setError(res.error ?? "Login failed");
    }

    navigate({
      to: res.role === "admin" ? "/admin" : "/dashboard",
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-2 bg-slate-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-sm border-none border-slate-200 bg-white p-6 shadow-sm"
      >
        {/* HEADER */}
        <h1 className="text-3xl font-bold text-brand-navy">
          Welcome back
        </h1>

        <p className="text-slate-500 mt-1 text-sm">
          Sign in with your details
        </p>

        {/* FORM */}
        <form onSubmit={submit} className="mt-8 space-y-4">
          <Field
            label="Email"
            value={email}
            onChange={setEmail}
            type="email"
            placeholder="you@elizade.edu.ng"
            icon={<Mail size={18} />}
          />

          <Field
            label="Password"
            value={password}
            onChange={setPassword}
            type="password"
            placeholder="••••••••"
            icon={<Lock size={18} />}
          />

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            className="w-full h-12 rounded-lg bg-brand-navy text-white font-semibold hover:bg-slate-800 transition-colors active:scale-[0.98]"
          >
            Sign in
          </button>
        </form>

        {/* LINKS */}
        <p className="text-sm text-slate-500 text-center mt-6">
          No account?{" "}
          <Link
            to="/register"
            className="text-brand-accent font-semibold"
          >
            Register
          </Link>
        </p>

        <p className="text-xs text-slate-400 text-center mt-3">
          Admin?{" "}
          <Link
            to="/admin/login"
            className="text-brand-gold font-semibold"
          >
            Sign in here
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

/* ---------------- FIELD COMPONENT ---------------- */

import { ReactNode } from "react";

export function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  icon?: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-mono uppercase tracking-widest text-slate-500">
        {label}
      </span>

      <div className="relative mt-1">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </div>
        )}

        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required
          className={`w-full h-11 rounded-sm border border-slate-200 bg-white text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-accent/10 focus:border-brand-accent transition ${
            icon ? "pl-10 pr-3" : "px-3"
          }`}
        />
      </div>
    </label>
  );
}