import { normalizeOrder, useStore } from "@/lib/store";

import { API_BASE_URL } from "./config";

const API_URL = API_BASE_URL;

export async function fetchAdminOverview() {
  const token = sessionStorage.getItem("admin_token");

  const res = await fetch(`${API_URL}/admin/overview`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch((e) => {
      console.error("Failed to parse admin overview error:", e);
      return {};
    });
    throw new Error(err.message || `Overview failed (${res.status})`);
  }

  const data = await res.json().catch((e) => {
    console.error("Failed to parse admin overview response:", e);
    throw new Error("Failed to parse response from server");
  });

  // Normalize and store users if provided
  const users = Array.isArray(data.users)
    ? data.users.map((u: any) => ({
        id: String(u.id ?? u._id ?? ""),
        fullName: u.fullName ?? "",
        email: u.email ?? "",
        matric: u.matric ?? "",
        password: u.password ?? "",
        role: u.role ?? "student",
      }))
    : undefined;

  useStore.setState((state) => ({
    orders: (data.orders ?? []).map(normalizeOrder),
    components: (data.components ?? []).map((c: any) => ({
      ...c,
      id: String(c.id ?? c._id),
      stock: Number(c.stock ?? 0),
    })),
    ...(users ? { users: [...state.users.filter((u) => u.role === "admin"), ...users] } : {}),
  }));

  return data;
}

export async function fetchAdminUsers() {
  const token = sessionStorage.getItem("admin_token");

  const res = await fetch(`${API_URL}/admin/getallusers`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Failed to load users");
  }

  const users = Array.isArray(data.users) ? data.users : [];

  useStore.setState((state) => ({
    users: [...state.users.filter((u) => u.role === "admin"), ...users.map((u: any) => ({
      id: String(u.id ?? u._id ?? ""),
      fullName: u.fullName ?? "",
      email: u.email ?? "",
      matric: u.matric ?? "",
      password: u.password ?? "",
      role: u.role ?? "student",
    }))],
  }));

  return users;
}