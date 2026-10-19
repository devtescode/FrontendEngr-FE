import { normalizeOrder, useStore } from "@/lib/store";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4500";

export async function fetchAdminOverview() {
  const token = sessionStorage.getItem("admin_token");

  const res = await fetch(`${API_URL}/admin/overview`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Overview failed (${res.status})`);
  }

  const data = await res.json();

  useStore.setState({
    orders: (data.orders ?? []).map(normalizeOrder),
    components: (data.components ?? []).map((c: any) => ({
      ...c,
      id: String(c.id ?? c._id),
      stock: Number(c.stock ?? 0),
    })),
  });

  return data;
}