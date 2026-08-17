  import {
    createFileRoute,
    useNavigate,
  } from "@tanstack/react-router";
  import { motion } from "framer-motion";
  import { useEffect, useState } from "react";
  import logoImg from "../components/Assets/image.webp";

  const BASE_URL = "http://localhost:4500";

  const SESSION_USER = "admin_user";
  const SESSION_TOKEN = "admin_token";

  export const Route = createFileRoute("/admin/login")({
    head: () => ({
      meta: [{ title: "Admin sign in — PulseLab" }],
    }),
    component: AdminLogin,
  });

  function AdminLogin() {
    const navigate = useNavigate();

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

      const checkAdmin = async () => {
        try {
          const res = await fetch(`${BASE_URL}/admin/exists`);

          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }

          const data = await res.json();

          console.log("ADMIN EXISTS RESPONSE:", data);

          if (mounted) {
            setHasAdmin(data.exists === true);
          }
        } catch (error) {
          console.error("ADMIN EXISTS ERROR:", error);

          if (mounted) {
            // If the endpoint fails, don't leave the page loading forever.
            setHasAdmin(true);
            setError(
              "Unable to check admin status. You can still try signing in."
            );
          }
        }
      };

      checkAdmin();

      return () => {
        mounted = false;
      };
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
      const registerRes = await fetch(
        `${BASE_URL}/admin/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: username.trim(),
            email: email.trim(),
            password,
          }),
        }
      );

      const registerData = await registerRes.json();

      console.log("REGISTER RESPONSE:", registerData);

      if (!registerRes.ok) {
        setError(
          registerData?.message ||
            registerData?.error ||
            "Unable to create admin"
        );
        return;
      }

      // ----------------------------------
      // ADMIN CREATED
      // NOW LOGIN AUTOMATICALLY
      // ----------------------------------
      console.log("Admin created successfully. Logging in...");

      const loginRes = await fetch(
        `${BASE_URL}/admin/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        }
      );

      const loginData = await loginRes.json();

      console.log("AUTO LOGIN RESPONSE:", loginData);

      if (!loginRes.ok) {
        setError(
          loginData?.message ||
            "Admin created, but automatic login failed."
        );
        return;
      }

      // ----------------------------------
      // GET ADMIN + TOKEN
      // ----------------------------------
      const admin = loginData?.admin;
      const token = loginData?.token;

      if (!admin) {
        setError(
          "Admin was created but server did not return admin information."
        );
        return;
      }

      if (!token) {
        setError(
          "Admin was created but server did not return an authentication token."
        );
        return;
      }

      // ----------------------------------
      // SAVE SESSION
      // ----------------------------------
      const adminUser = {
        ...admin,
        role: "admin",
      };

      sessionStorage.setItem(
        SESSION_USER,
        JSON.stringify(adminUser)
      );

      sessionStorage.setItem(
        SESSION_TOKEN,
        String(token)
      );

      console.log("ADMIN SESSION CREATED");

      // ----------------------------------
      // GO TO DASHBOARD
      // ----------------------------------
      await navigate({
        to: "/admin",
        replace: true,
      });

      return;
    }

    // ----------------------------------
    // NORMAL ADMIN LOGIN
    // ----------------------------------
    const loginRes = await fetch(
      `${BASE_URL}/admin/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      }
    );

    const loginData = await loginRes.json();

    console.log("LOGIN RESPONSE:", loginData);

    if (!loginRes.ok) {
      setError(
        loginData?.message ||
          loginData?.error ||
          "Invalid email or password"
      );
      return;
    }

    const admin = loginData?.admin;
    const token = loginData?.token;

    if (!admin) {
      setError("Server did not return admin information.");
      return;
    }

    if (!token) {
      setError("Server did not return an authentication token.");
      return;
    }

    // ----------------------------------
    // SAVE SESSION
    // ----------------------------------
    const adminUser = {
      ...admin,
      role: "admin",
    };

    sessionStorage.setItem(
      SESSION_USER,
      JSON.stringify(adminUser)
    );

    sessionStorage.setItem(
      SESSION_TOKEN,
      String(token)
    );

    console.log("ADMIN LOGIN SESSION SAVED");

    // ----------------------------------
    // GO TO DASHBOARD
    // ----------------------------------
    await navigate({
      to: "/admin",
      replace: true,
    });
  } catch (error) {
    console.error("AUTH ERROR:", error);

    setError(
      "Unable to connect to the server. Make sure your backend is running."
    );
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