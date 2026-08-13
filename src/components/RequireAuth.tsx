// import { Navigate } from "@tanstack/react-router";
// import { useEffect, useState } from "react";
// import type { ReactNode } from "react";

// type Role = "student" | "admin";

// export function RequireAuth({
//   children,
//   role,
// }: {
//   children: ReactNode;
//   role?: Role;
// }) {
//   const [user, setUser] = useState<any>(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const saved = sessionStorage.getItem("pulselab_user");

//     if (!saved) {
//       setLoading(false);
//       return;
//     }

//     try {
//       const parsed = JSON.parse(saved);
//       setUser(parsed);
//     } catch {
//       sessionStorage.removeItem("pulselab_user");
//       sessionStorage.removeItem("pulselab_token");
//     }

//     setLoading(false);
//   }, []);

//   if (loading) return null;

//   // 🔒 not logged in
//   if (!user) {
//     return <Navigate to={role === "student" ? "/login" :  "/admin/login"} />;
//   }

//   // 🔒 role protection
//   if (role && user.role !== role) {
//     return <Navigate to="/" />;
//   }

//   return <>{children}</>;
// }

import { Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

type Role = "student" | "admin";

export function RequireAuth({
  children,
  role,
}: {
  children: ReactNode;
  role?: Role;
}) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const token = sessionStorage.getItem("pulselab_token");
      const savedUser = sessionStorage.getItem("pulselab_user");

      // No token = definitely logged out
      if (!token || !savedUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const parsedUser = JSON.parse(savedUser);

        setUser(parsedUser);
      } catch (error) {
        console.error("Invalid saved user:", error);

        sessionStorage.removeItem("pulselab_user");
        sessionStorage.removeItem("pulselab_token");

        setUser(null);
      }

      setLoading(false);
    };

    checkAuth();

    // Check again when user comes back to the tab/page
    window.addEventListener("pageshow", checkAuth);
    window.addEventListener("focus", checkAuth);

    return () => {
      window.removeEventListener("pageshow", checkAuth);
      window.removeEventListener("focus", checkAuth);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-brand-navy" />
      </div>
    );
  }

  // 🔒 No token or user = logged out
  if (!user || !sessionStorage.getItem("pulselab_token")) {
    return (
      <Navigate
        to={role === "student" ? "/login" : "/admin/login"}
        replace
      />
    );
  }

  // 🔒 Wrong role
  if (role && user.role !== role) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}