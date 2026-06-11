import { Navigate } from "@tanstack/react-router";
import { useCurrentUser } from "@/lib/store";
import type { ReactNode } from "react";

export function RequireAuth({ children, role }: { children: ReactNode; role?: "student" | "admin" }) {
  const user = useCurrentUser();
  if (!user) return <Navigate to={role === "admin" ? "/admin/login" : "/login"} />;
  if (role && user.role !== role) return <Navigate to="/" />;
  return <>{children}</>;
}