import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { useCurrentUser, useStore } from "@/lib/store";

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "Admin sign in — PulseLab" }] }),
  component: AdminLogin,
});

function AdminLogin() {
  const user = useCurrentUser();
  const login = useStore((s) => s.login);
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@elizade.edu.ng");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState<string | null>(null);

  if (user?.role === "admin") return <Navigate to="/admin" />;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = login(email, password);
    if (!res.ok || res.role !== "admin") return setError("Invalid admin credentials.");
    navigate({ to: "/admin" });
  };

  return (
    <div className="min-h-screen bg-slate-950 grid place-items-center px-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 p-8">
        <Logo />
        <h1 className="text-2xl font-bold text-white mt-6">Admin Console</h1>
        <p className="text-slate-500 text-sm mt-1">Restricted access for lab administrators.</p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <DarkField label="Email" value={email} onChange={setEmail} type="email" />
          <DarkField label="Password" value={password} onChange={setPassword} type="password" />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button className="w-full h-12 rounded-lg bg-brand-gold text-white font-semibold hover:bg-amber-700 active:scale-[0.98] transition">Sign in</button>
        </form>
        <p className="text-[11px] font-mono text-slate-600 mt-6 text-center">DEMO · admin@elizade.edu.ng / admin123</p>
      </motion.div>
    </div>
  );
}

function DarkField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">{label}</span>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)} required
        className="mt-1 w-full h-11 rounded-lg bg-slate-950 border border-white/10 px-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent transition"
      />
    </label>
  );
}