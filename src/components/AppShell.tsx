// import type { ReactNode } from "react";
// import { Navbar } from "./Navbar";
// import { Footer } from "./Footer";

// export function AppShell({ children }: { children: ReactNode }) {
//   return (
//     <div className="min-h-screen bg-background flex flex-col">
//       <Navbar />
//       <main className="flex-1">{children}</main>
//       {/* <Footer /> */}
//     </div>
//   );
// }
import type { ReactNode } from "react";
import { useEffect } from "react";

import { Navbar } from "./Navbar";
import { connectUserSocket } from "@/lib/socket";

export function AppShell({
  children,
}: {
  children: ReactNode;
}) {
  useEffect(() => {
    connectUserSocket();
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}