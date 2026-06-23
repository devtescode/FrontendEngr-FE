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
    const saved = sessionStorage.getItem("pulselab_user");

    if (!saved) {
      setLoading(false);
      return;
    }

    try {
      const parsed = JSON.parse(saved);
      setUser(parsed);
    } catch {
      sessionStorage.removeItem("pulselab_user");
      sessionStorage.removeItem("pulselab_token");
    }

    setLoading(false);
  }, []);

  if (loading) return null;

  // 🔒 not logged in
  if (!user) {
    return <Navigate to={role === "student" ? "/admin/login" : "/login"} />;
  }

  // 🔒 role protection
  if (role && user.role !== role) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
}