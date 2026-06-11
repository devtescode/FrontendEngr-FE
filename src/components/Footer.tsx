import { useRouterState } from "@tanstack/react-router";
import { Logo } from "./Logo";

export function Footer() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname.startsWith("/admin")) return null;
  return (
    <footer className="border-t border-slate-200 bg-white py-12 mt-20">
      <div className="mx-auto max-w-7xl px-6 flex flex-col items-center justify-between gap-6 md:flex-row">
        <Logo />
        <p className="text-sm text-slate-500 text-center">
          © {new Date().getFullYear()} Elizade University · Department of Electrical & Electronics Engineering.
        </p>
        <div className="flex gap-6">
          <a className="text-slate-400 hover:text-brand-navy transition-colors text-sm" href="#">Support</a>
          <a className="text-slate-400 hover:text-brand-navy transition-colors text-sm" href="#">Inventory Policy</a>
        </div>
      </div>
    </footer>
  );
}