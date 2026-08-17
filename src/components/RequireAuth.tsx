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
      // ----------------------------------
      // USE ROLE-SPECIFIC SESSION KEYS
      // ----------------------------------
      const tokenKey =
        role === "admin"
          ? "admin_token"
          : "pulselab_token";

      const userKey =
        role === "admin"
          ? "admin_user"
          : "pulselab_user";

      const token = sessionStorage.getItem(tokenKey);
      const savedUser = sessionStorage.getItem(userKey);

      console.log("AUTH CHECK:", {
        role,
        tokenExists: !!token,
        userExists: !!savedUser,
      });

      // ----------------------------------
      // NO TOKEN / USER
      // ----------------------------------
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

        sessionStorage.removeItem(userKey);
        sessionStorage.removeItem(tokenKey);

        setUser(null);
      }

      setLoading(false);
    };

    checkAuth();

    // Check again when user returns to the page
    window.addEventListener("pageshow", checkAuth);
    window.addEventListener("focus", checkAuth);

    return () => {
      window.removeEventListener("pageshow", checkAuth);
      window.removeEventListener("focus", checkAuth);
    };
  }, [role]);

  // ----------------------------------
  // AUTH CHECK LOADING
  // ----------------------------------
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-brand-navy" />
      </div>
    );
  }

  // ----------------------------------
  // NO AUTH
  // ----------------------------------
  const tokenKey =
    role === "admin"
      ? "admin_token"
      : "pulselab_token";

  const token = sessionStorage.getItem(tokenKey);

  if (!user || !token) {
    return (
      <Navigate
        to={role === "student" ? "/login" : "/admin/login"}
        replace
      />
    );
  }

  // ----------------------------------
  // WRONG ROLE
  // ----------------------------------
  if (role && user.role !== role) {
    return <Navigate to="/" replace />;
  }

  // ----------------------------------
  // AUTHENTICATED
  // ----------------------------------
  return <>{children}</>;
}