import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, ShoppingCart, LogOut } from "lucide-react";
import { useState, useMemo } from "react";
import { Logo } from "./Logo";
import { useCurrentUser, useStore } from "@/lib/store";

export function HomePageNavbar() {
  const user = useCurrentUser();

  // ✅ SAFE: raw stable store slices only
  const cart = useStore((s) => s.cart);
  const notifications = useStore((s) => s.notifications);
  const logout = useStore((s) => s.logout);
  const markRead = useStore((s) => s.markNotificationRead);

  const navigate = useNavigate();

  // ✅ FIXED: ALWAYS ensure string fallback
  const pathname = useRouterState({
    select: (s) => s.location.pathname ?? "",
  });

  const [notifOpen, setNotifOpen] = useState(false);

  // ✅ derived values moved OUTSIDE Zustand selectors
  const cartCount = useMemo(
    () => cart.reduce((a, c) => a + c.quantity, 0),
    [cart]
  );

  const userNotifications = useMemo(() => {
    if (!user) return [];
    return notifications.filter((n) => n.userId === user.id);
  }, [notifications, user]);

  const unread = useMemo(
    () => userNotifications.filter((n) => !n.read).length,
    [userNotifications]
  );

  // ✅ SAFE guard (prevents runtime crash)
  if (typeof pathname !== "string") return null;

  if (pathname.startsWith("/admin")) return null;

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/">
          <Logo />
        </Link>

        {/* NAV LINKS */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          
          {/* <HomePageNavLink to="/components">Home</HomePageNavLink>

          {user?.role === "student" && (
            <HomePageNavLink to="/dashboard">Dashboard</HomePageNavLink>
          )}

          {user?.role === "student" && (
            <HomePageNavLink to="/orders">My Orders</HomePageNavLink>
          )}

          {user?.role === "admin" && (
            <HomePageNavLink to="/admin">Admin</HomePageNavLink>
          )} */}
        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-2">

          {/* CART */}
          {/* <Link
            to="/cart"
            className="relative size-10 rounded-full hover:bg-slate-100 flex items-center justify-center"
          >
            <ShoppingCart className="size-5 text-brand-navy" />

            {cartCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-0.5 -right-0.5 bg-brand-gold text-white text-[10px] font-bold rounded-full size-5 flex items-center justify-center"
              >
                {cartCount}
              </motion.span>
            )}
          </Link> */}

          {/* NOTIFICATIONS */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setNotifOpen((o) => !o)}
                className="relative size-10 rounded-full hover:bg-slate-100 flex items-center justify-center"
              >
                <Bell className="size-5 text-brand-navy" />

                {unread > 0 && (
                  <span className="absolute top-2 right-2 size-2 rounded-full bg-brand-gold animate-pulse" />
                )}
              </button>

              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute right-0 mt-2 w-80 rounded-xl bg-white border shadow-xl p-2 max-h-96 overflow-auto"
                  >
                    <div className="px-3 py-2 text-xs uppercase text-slate-400">
                      Notifications
                    </div>

                    {userNotifications.length === 0 && (
                      <div className="p-4 text-sm text-slate-500 text-center">
                        No notifications yet.
                      </div>
                    )}

                    {userNotifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => {
                          markRead(n.id);

                          if (n.orderId) {
                            setNotifOpen(false);
                            navigate({ to: "/orders" });
                          }
                        }}
                        className={`w-full text-left p-3 rounded-lg hover:bg-slate-50 ${
                          !n.read ? "bg-brand-accent/5" : ""
                        }`}
                      >
                        <p className="text-sm text-brand-navy">
                          {n.message}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {new Date(n.createdAt).toLocaleString()}
                        </p>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* USER */}
          {user ? (
            <div className="flex items-center gap-2 ml-2">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-semibold text-brand-navy">
                  {user.fullName}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {user.matric}
                </span>
              </div>

              <button
                onClick={() => {
                  logout();
                  navigate({ to: "/" });
                }}
                className="size-10 rounded-full hover:bg-slate-100 flex items-center justify-center"
              >
                <LogOut className="size-4 text-slate-500" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="ml-2 rounded-full bg-brand-navy px-5 py-2 text-sm font-semibold text-white"
            >
              {/* Student Portal */}
              Login
            </Link>
          )}
        </div>
      </div>
    </motion.nav>
  );
}


function HomePageNavLink({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="text-slate-500 hover:text-brand-navy transition-colors"
      activeProps={{
        className: "text-brand-navy font-semibold",
      }}
    >
      {children}
    </Link>
  );
}