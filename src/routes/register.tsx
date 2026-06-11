import {
  createFileRoute,
  Link,
  useNavigate,
} from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Field } from "./login";

// icons
import { User, Mail, Hash, Lock } from "lucide-react";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [{ title: "Register — PulseLab" }],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const register = useStore((s) => s.register);
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [matric, setMatric] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      return setError("Password must be at least 6 characters.");
    }

    const res = register({
      fullName,
      email,
      matric,
      password,
    });

    if (!res.ok) {
      return setError(res.error ?? "Registration failed");
    }

    navigate({ to: "/login" });
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
          Create your account
        </h1>

        <p className="text-slate-500 text-sm mt-1">
          Join the EU hardware hub.
        </p>

        {/* FORM */}
        <form onSubmit={submit} className="mt-8 space-y-4">
          <Field
            label="Full Name"
            value={fullName}
            onChange={setFullName}
            placeholder="Adekunle Adebayo"
            icon={<User size={18} />}
          />

          <Field
            label="Email"
            value={email}
            onChange={setEmail}
            type="email"
            placeholder="you@elizade.edu.ng"
            icon={<Mail size={18} />}
          />

          <Field
            label="Matric Number"
            value={matric}
            onChange={setMatric}
            placeholder="EU250102-4768"
            icon={<Hash size={18} />}
          />

          <Field
            label="Password"
            value={password}
            onChange={setPassword}
            type="password"
            placeholder="At least 6 characters"
            icon={<Lock size={18} />}
          />

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            className="w-full h-12 rounded-lg bg-brand-navy text-white font-semibold hover:bg-slate-800 transition-colors active:scale-[0.98]"
          >
            Create account
          </button>
        </form>

        {/* FOOTER */}
        <p className="text-sm text-slate-500 text-center mt-6">
          Already registered?{" "}
          <Link
            to="/login"
            className="text-brand-accent font-semibold"
          >
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}