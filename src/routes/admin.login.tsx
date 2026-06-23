import {
  createFileRoute,
  Navigate,
  useNavigate,
} from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Logo } from "@/components/Logo";
// import logoImg from "./Assets/image.webp";
import logoImg from "../components/Assets/image.webp";

const BASE_URL = "http://localhost:4500";

const SESSION_USER = "admin_user";
const SESSION_TOKEN = "admin_token";

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "Admin sign in — PulseLab" }] }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();

  const [user, setUser] = useState<any>(null);
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [networkError, setNetworkError] = useState(false);

  // -------------------------------
  // LOAD SESSION
  // -------------------------------
  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_USER);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setUser(parsed);
      } catch {
        sessionStorage.removeItem(SESSION_USER);
        sessionStorage.removeItem(SESSION_TOKEN);
      }
    }
  }, []);

  // -------------------------------
  // CHECK IF ADMIN EXISTS IN DB
  // -------------------------------
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        setNetworkError(false);

        const res = await fetch(`${BASE_URL}/admin/exists`);

        if (!res.ok) throw new Error("network");

        const data = await res.json();
        setHasAdmin(data.exists);
      } catch {
        setNetworkError(true);
      }
    };

    checkAdmin();
  }, []);

  // -------------------------------
  // REDIRECT IF ALREADY LOGGED IN
  // -------------------------------
  if (user?.role === "admin") {
    return <Navigate to="/admin" />;
  }

  // -------------------------------
  // SUBMIT LOGIN / CREATE ADMIN
  // -------------------------------
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload =
        hasAdmin === false
          ? { username, email, password }
          : { email, password };

      const url =
        hasAdmin === false
          ? `${BASE_URL}/admin/register`
          : `${BASE_URL}/admin/login`;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Request failed");
        return;
      }

      const admin = data.admin;

      // session storage
      sessionStorage.setItem(SESSION_USER, JSON.stringify(admin));
      sessionStorage.setItem(SESSION_TOKEN, data.token);

      setUser(admin);

      navigate({ to: "/admin", replace: true });
    } catch {
      setNetworkError(true);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------
  // NETWORK ERROR UI
  // -------------------------------
  if (networkError) {
    return (
      <div className="min-h-screen bg-slate-950 grid place-items-center text-white">
        <div className="text-center space-y-4">
          <p className="text-red-400">Network error. Please try again.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-brand-gold rounded"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------
  // LOADING ADMIN CHECK
  // -------------------------------
  if (hasAdmin === null) {
    return (
      <div className="min-h-screen bg-slate-950 grid place-items-center text-white">
        Loading...
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
        <div className={`flex items-center gap-2`}>
          {/* ICON */}
          <div className="size-8 rounded bg-brand-navy flex items-center justify-center overflow-hidden">
            <img
              src={logoImg}
              alt="EU Hardstore Logo"
              className="h-full w-full object-cover"
            />
          </div>

          {/* TEXT */}
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

        <form onSubmit={submit} className="mt-8 space-y-4">

          {/* SHOW ONLY IF NO ADMIN EXISTS */}
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
            <p className="text-sm text-red-400">{error}</p>
          )}

          <button
            disabled={loading}
            className="w-full text-center h-12 rounded-lg bg-brand-gold text-white font-semibold hover:bg-amber-700 active:scale-[0.98] transition"
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

// ---------------- FIELD ----------------

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