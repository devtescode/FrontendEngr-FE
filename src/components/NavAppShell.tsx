import type { ReactNode } from "react";

import { HomePageNavbar } from "./HomePageNavbar";
import { HomeFooter } from "./home/HomeFooter";
import { ToastHost } from "./ComponentCard";

export function NavAppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <HomePageNavbar />
      <main className="flex-1">{children}</main>
      <HomeFooter />
      <ToastHost />
    </div>
  );
}
