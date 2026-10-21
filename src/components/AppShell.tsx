import type { ReactNode } from "react";
import { useEffect } from "react";

import { Navbar } from "./Navbar";
import { useStore } from "@/lib/store";
import { ToastHost } from "./ComponentCard";

export function AppShell({ children }: { children: ReactNode }) {
  // Rehydrate the session id into the client store on mount.
  useEffect(() => {
    const savedUser = sessionStorage.getItem("pulselab_user");
    if (!savedUser) return;

    try {
      const parsed = JSON.parse(savedUser);
      const userId = parsed?.id ?? parsed?._id ?? parsed?.userId;

      if (!userId) return;

      useStore.setState({ currentUserId: String(userId) });
    } catch (err) {
      console.error("Failed to rehydrate user:", err);
      sessionStorage.removeItem("pulselab_user");
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">{children}</main>
      <ToastHost />
    </div>
  );
}