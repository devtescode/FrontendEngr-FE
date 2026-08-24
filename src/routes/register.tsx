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
import {
  User,
  Mail,
  Hash,
  Lock,
  Users,
  Phone,
  Loader2
} from "lucide-react";
import { API_URLS } from "@/utils/apiConfig";

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
  const [gender, setGender] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);
  setLoading(true);

  const formattedMatric = matric.trim().toUpperCase();

  const matricRegex = /^EU\d{6}-\d{4}$/i;

  if (!matricRegex.test(formattedMatric)) {
    setLoading(false);
    return setError(
      "Matric number must be in the format EU250102-4768"
    );
  }

  if (!phoneNumber.trim()) {
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

  try {
    const response = await fetch(
      API_URLS.usersignup,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          email,
          matric: formattedMatric,
          phoneNumber,
          gender,
          password,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      setLoading(false);
      return setError(data.message || "Registration failed");
    }

    navigate({ to: "/login" });
  } catch (error) {
    setLoading(false);
    setError("Unable to connect to server");
  }
};
  return (
    <div className="min-h-screen flex items-center justify-center px-2 bg-slate-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-sm bg-white p-6 shadow-sm"
      >
        {/* HEADER */}
        <h1 className="text-3xl font-bold text-brand-navy">
          Create your account
        </h1>

        <p className="text-slate-500 text-sm mt-1">
          Join the EU Hardware Hub.
        </p>

        {/* FORM */}
        <form onSubmit={submit} className="mt-8 space-y-4">
          <Field
            label="Full Name"
            value={fullName}
            onChange={setFullName}
            placeholder="Agboola Teslim"
            icon={<User size={18} />}
          />

          <Field
            label="Email"
            value={email}
            onChange={setEmail}
            type="email"
            placeholder="name@gmail.com"
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
            label="Phone Number"
            value={phoneNumber}
            onChange={setPhoneNumber}
            placeholder="08064864821"
            icon={<Phone size={18} />}
          />

          {/* Gender */}
          <label className="block">
            <span className="text-xs font-mono uppercase tracking-widest text-slate-500">
              Gender
            </span>

            <div className="relative mt-1">
              <Users
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                required
                className="w-full h-11 rounded-sm border border-slate-200 bg-white pl-10 pr-3 text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-accent/10 focus:border-brand-accent transition"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </label>

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
                <span>Creating Account...</span>
              </>
            ) : (
              "Create Account"
            )}
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