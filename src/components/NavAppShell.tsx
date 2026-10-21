import type { ReactNode } from "react";
import { HomePageNavbar } from "./HomePageNavbar";
import { ToastHost } from "./ComponentCard";
// import { Footer } from "./Footer";

export function NavAppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <HomePageNavbar />
      <main className="flex-1">{children}</main>
      {/* <Footer /> */}
      <ToastHost />
    </div>
  );
}