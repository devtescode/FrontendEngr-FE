import type { ReactNode } from "react";
import { useEffect } from "react";

import { Navbar } from "./Navbar";
import { connectUserSocket } from "@/lib/socket";
import { useStore } from "@/lib/store";
import { ToastHost } from "./ComponentCard";

export function AppShell({
  children,
}: {
  children: ReactNode;
}) {
  // Rehydrate the current user into the Zustand store
  // from sessionStorage on mount. Runs once per AppShell
  // mount, so after a page refresh the store knows who
  // the user is without needing a login round-trip.
  useEffect(() => {
    const savedUser = sessionStorage.getItem("pulselab_user");
    if (!savedUser) return;

    try {
      const parsed = JSON.parse(savedUser);
      const userId = parsed?.id ?? parsed?._id ?? parsed?.userId;

      if (!userId) return;

      useStore.setState((state) => ({
        currentUserId: userId,
        users: state.users.some((u) => u.id === userId)
          ? state.users
          : [...state.users, parsed],
      }));
    } catch (err) {
      console.error("Failed to rehydrate user:", err);
      sessionStorage.removeItem("pulselab_user");
    }
  }, []);

  // Connect the socket as the current user.
  useEffect(() => {
    connectUserSocket();
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1">
        {children}
      </main>

      {/* Global toast stack — renders once for the whole app */}
      <ToastHost />
    </div>
  );
}