import {
  createFileRoute,
  Link,
  useNavigate,
  Navigate,
} from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useCurrentUser, useStore } from "@/lib/store";
import { Mail, Lock, Loader2 } from "lucide-react";
import { ReactNode } from "react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Sign in — PulseLab" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const user = useCurrentUser();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);


  useEffect(() => {
    const saved = sessionStorage.getItem("pulselab_user");

    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);

      if (parsed?.id) {
        useStore.setState({
          currentUserId: parsed.id,
        });
      }
    } catch {
      sessionStorage.removeItem("pulselab_user");
    }
  }, []);

  // -----------------------------
  // AUTO REDIRECT IF LOGGED IN
  // -----------------------------
  if (user) {
    return (
      <Navigate
        to={user.role === "admin" ? "/admin" : "/dashboard"}
      />
    );
  }

  // -----------------------------
  // LOGIN SUBMIT
  // -----------------------------
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(
        "http://localhost:4500/engineering/userlogin",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setLoading(false);
        return setError(data.message || "Login failed");
      }

      const userData = data.user;
      console.log(data.user);
      

      // -----------------------------
      // SAVE SESSION
      // -----------------------------
      sessionStorage.setItem(
        "pulselab_user",
        JSON.stringify(userData)
      );

      sessionStorage.setItem("pulselab_token", data.token);

      // -----------------------------
      // FIXED ZUSTAND UPDATE
      // -----------------------------
      useStore.setState({
        currentUserId: userData.id,
      });

      // -----------------------------
      // NAVIGATE
      // -----------------------------
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      setLoading(false);
      setError("Server not reachable");
    }
  };

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div className="min-h-screen flex items-center justify-center px-2 bg-slate-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-sm bg-white p-6 shadow-sm"
      >
        <h1 className="text-3xl font-bold text-brand-navy">
          Welcome back
        </h1>

        <p className="text-slate-500 mt-1 text-sm">
          Sign in with your details
        </p>

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
            disabled={loading}
            className={`w-full h-12 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
              loading
                ? "bg-slate-400 text-white cursor-not-allowed"
                : "bg-brand-navy text-white hover:bg-slate-800"
            }`}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        <p className="text-sm text-slate-500 text-center mt-6">
          No account?{" "}
          <Link
            to="/register"
            className="text-brand-accent font-semibold"
          >
            Register
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

/* ---------------- FIELD COMPONENT ---------------- */

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