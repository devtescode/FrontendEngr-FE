import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  ShoppingCart,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState, useMemo } from "react";
import { Logo } from "./Logo";
import { useCurrentUser, useStore } from "@/lib/store";


export function Navbar() {
  const user = useCurrentUser();

  const cart = useStore((s) => s.cart);
  const notifications = useStore((s) => s.notifications);
  const logout = useStore((s) => s.logout);
  const markRead = useStore((s) => s.markNotificationRead);

  const navigate = useNavigate();

  const pathname = useRouterState({
    select: (s) => s.location.pathname ?? "",
  });

  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const cartCount = useMemo(
    () => cart.reduce((a, c) => a + c.quantity, 0),
    [cart]
  );

  const userNotifications = useMemo(() => {
    if (!user) return [];

    return notifications.filter(
      (n) => n.userId === user.id
    );
  }, [notifications, user]);

  const unread = useMemo(
    () => userNotifications.filter((n) => !n.read).length,
    [userNotifications]
  );

  if (typeof pathname !== "string") return null;

  if (pathname.startsWith("/admin")) return null;

  const closeMobileMenu = () => {
    setMobileOpen(false);
  };

  const toggleMobileMenu = () => {
    setMobileOpen((open) => !open);
    setNotifOpen(false);
  };

  // const navigate = useNavigate();
  const Logout = () => {
    navigate({ to: "/login" });
    logout();
    sessionStorage.clear();
    // localStorage.clear();
  }

  return (
    <>
      {/* =====================================================
          MOBILE BACKDROP
          Does NOT affect dashboard layout
      ===================================================== */}

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeMobileMenu}
            className="
              fixed
              inset-0
              top-16
              z-40
              bg-slate-950/20
              backdrop-blur-sm
              md:hidden
            "
          />
        )}
      </AnimatePresence>

      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{
          duration: 0.5,
          ease: "easeOut",
        }}
        className="
          sticky
          top-0
          z-50
          border-b
          border-slate-200
          bg-white/80
          backdrop-blur-md
        "
      >
        {/* =====================================================
            NAVBAR CONTENT
        ===================================================== */}

        <div
          className="
            mx-auto
            flex
            h-16
            max-w-7xl
            items-center
            justify-between
            px-4
            sm:px-6
          "
        >
          {/* =====================================================
              LOGO
          ===================================================== */}

          <Link
            to="/dashboard"
            onClick={closeMobileMenu}
            className="shrink-0"
          >
            <Logo />
          </Link>

          {/* =====================================================
              DESKTOP NAVIGATION
          ===================================================== */}

          <div className="hidden items-center gap-8 text-sm font-medium md:flex">
            <NavLink to="/components">
              Components
            </NavLink>

            <NavLink to="/change-password">
              Change Password
            </NavLink>

            <NavLink to="/cart">
              Add to cart
            </NavLink>

            {user?.role === "student" && (
              <NavLink to="/dashboard">
                Dashboard
              </NavLink>
            )}

            {user?.role === "student" && (
              <NavLink to="/orders">
                My Orders
              </NavLink>
            )}

            {user?.role === "admin" && (
              <NavLink to="/admin">
                Admin
              </NavLink>
            )}
          </div>

          {/* =====================================================
              RIGHT SIDE
          ===================================================== */}

          <div className="flex items-center gap-1 sm:gap-2">

            {/* =================================================
                CART
            ================================================= */}

            <Link
              to="/cart"
              className="
                relative
                flex
                size-10
                items-center
                justify-center
                rounded-full
                transition-colors
                hover:bg-slate-100
              "
              onClick={closeMobileMenu}
            >
              <ShoppingCart className="size-5 text-brand-navy" />

              {cartCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="
                    absolute
                    -right-0.5
                    -top-0.5
                    flex
                    size-5
                    items-center
                    justify-center
                    rounded-full
                    bg-brand-gold
                    text-[10px]
                    font-bold
                    text-white
                  "
                >
                  {cartCount}
                </motion.span>
              )}
            </Link>

            {/* =================================================
                NOTIFICATIONS
            ================================================= */}

            {user && (
              <div className="relative">
                <button
                  onClick={() => {
                    setNotifOpen((open) => !open);
                    setMobileOpen(false);
                  }}
                  className="
                    relative
                    flex
                    size-10
                    items-center
                    justify-center
                    rounded-full
                    transition-colors
                    hover:bg-slate-100
                  "
                  aria-label="Notifications"
                >
                  <Bell className="size-5 text-brand-navy" />

                  {unread > 0 && (
                    <span
                      className="
                        absolute
                        right-2
                        top-2
                        size-2
                        rounded-full
                        bg-brand-gold
                        animate-pulse
                      "
                    />
                  )}
                </button>

                {/* NOTIFICATION DROPDOWN */}

                <AnimatePresence>
                  {notifOpen && (
                    <motion.div
                      initial={{
                        opacity: 0,
                        y: -8,
                        scale: 0.98,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        scale: 1,
                      }}
                      exit={{
                        opacity: 0,
                        y: -8,
                        scale: 0.98,
                      }}
                      transition={{
                        duration: 0.2,
                        ease: "easeOut",
                      }}
                      className="
                        absolute
                        right-0
                        mt-2
                        w-[min(20rem,calc(100vw-2rem))]
                        overflow-hidden
                        rounded-xl
                        border
                        border-slate-200
                        bg-white
                        p-2
                        shadow-xl
                      "
                    >
                      <div
                        className="
                          px-3
                          py-2
                          text-xs
                          uppercase
                          tracking-wider
                          text-slate-400
                        "
                      >
                        Notifications
                      </div>

                      {userNotifications.length === 0 && (
                        <div className="p-4 text-center text-sm text-slate-500">
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

                              navigate({
                                to: "/orders",
                              });
                            }
                          }}
                          className={`
                            w-full
                            rounded-lg
                            p-3
                            text-left
                            transition-colors
                            hover:bg-slate-50
                            ${!n.read
                              ? "bg-brand-accent/5"
                              : ""
                            }
                          `}
                        >
                          <p className="text-sm text-brand-navy">
                            {n.message}
                          </p>

                          <p className="mt-1 text-[10px] text-slate-400">
                            {new Date(
                              n.createdAt
                            ).toLocaleString()}
                          </p>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* =================================================
                USER
            ================================================= */}

            {user ? (
              <div className="ml-1 flex items-center gap-1 sm:ml-2 sm:gap-2">
                <div className="hidden flex-col items-end sm:flex">
                  <span className="text-xs font-semibold text-brand-navy">
                    {user.fullName}
                  </span>

                  <span className="font-mono text-[10px] text-slate-500">
                    {user.matric}
                  </span>
                </div>

                <button
                  onClick={() => {
                    logout();
                    closeMobileMenu();

                    navigate({
                      to: "/",
                    });
                  }}
                  className="
                    flex
                    size-10
                    items-center
                    justify-center
                    rounded-full
                    transition-colors
                    hover:bg-slate-100
                  "
                  title="Logout"
                >
                  <LogOut className="size-4 text-slate-500" />
                </button>
              </div>
            ) : (
              <div
                //  className="hidden sm:flex"
                // >

                onClick={Logout}
                className="
                  ml-1
                  rounded-full
                  bg-brand-navy
                  px-4
                  py-2
                  text-sm
                  font-semibold
                  text-white
                  transition
                  hover:opacity-90
                  sm:ml-2
                  sm:px-5
                "
              >
                Log Out
              </div>
            )}

            {/* =================================================
                MOBILE MENU BUTTON
            ================================================= */}

            <button
              onClick={toggleMobileMenu}
              className="
                ml-1
                flex
                size-10
                items-center
                justify-center
                rounded-full
                transition-colors
                hover:bg-slate-100
                md:hidden
              "
              aria-label={
                mobileOpen
                  ? "Close navigation menu"
                  : "Open navigation menu"
              }
              aria-expanded={mobileOpen}
            >
              <AnimatePresence
                mode="wait"
                initial={false}
              >
                {mobileOpen ? (
                  <motion.div
                    key="close"
                    initial={{
                      rotate: -90,
                      opacity: 0,
                    }}
                    animate={{
                      rotate: 0,
                      opacity: 1,
                    }}
                    exit={{
                      rotate: 90,
                      opacity: 0,
                    }}
                    transition={{
                      duration: 0.15,
                    }}
                  >
                    <X className="size-5 text-brand-navy" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{
                      rotate: 90,
                      opacity: 0,
                    }}
                    animate={{
                      rotate: 0,
                      opacity: 1,
                    }}
                    exit={{
                      rotate: -90,
                      opacity: 0,
                    }}
                    transition={{
                      duration: 0.15,
                    }}
                  >
                    <Menu className="size-5 text-brand-navy" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>

        {/* =====================================================
            FLOATING MOBILE MENU

            IMPORTANT:
            absolute + top-full means this menu overlays
            the dashboard instead of pushing it down.
        ===================================================== */}

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{
                opacity: 0,
                y: -12,
                scale: 0.98,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: -12,
                scale: 0.98,
              }}
              transition={{
                duration: 0.25,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="
                absolute
                left-0
                right-0
                top-full
                z-50
                border-t
                border-slate-200
                bg-white
                shadow-xl
                md:hidden
              "
            >
              <div className="px-4 py-4 sm:px-6">

                {/* NAVIGATION LINKS */}

                <div className="flex flex-col gap-1">

                  <MobileNavLink
                    to="/components"
                    onClick={closeMobileMenu}
                  >
                    Components
                  </MobileNavLink>

                  <MobileNavLink
                    to="/change-password"
                    onClick={closeMobileMenu}
                  >
                    Change Password
                  </MobileNavLink>

                  <MobileNavLink
                    to="/cart"
                    onClick={closeMobileMenu}
                  >
                    Add to cart
                  </MobileNavLink>

                  {user?.role === "student" && (
                    <MobileNavLink
                      to="/dashboard"
                      onClick={closeMobileMenu}
                    >
                      Dashboard
                    </MobileNavLink>
                  )}

                  {user?.role === "student" && (
                    <MobileNavLink
                      to="/orders"
                      onClick={closeMobileMenu}
                    >
                      My Orders
                    </MobileNavLink>
                  )}

                  {user?.role === "admin" && (
                    <MobileNavLink
                      to="/admin"
                      onClick={closeMobileMenu}
                    >
                      Admin
                    </MobileNavLink>
                  )}

                </div>

                {/* USER INFORMATION */}

                {user && (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <div
                      className="
                        flex
                        items-center
                        justify-between
                        rounded-xl
                        bg-slate-50
                        p-3
                      "
                    >
                      <div>
                        <p className="text-sm font-semibold text-brand-navy">
                          {user.fullName}
                        </p>

                        <p className="mt-0.5 font-mono text-[10px] text-slate-500">
                          {user.matric}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          logout();
                          closeMobileMenu();

                          navigate({
                            to: "/",
                          });
                        }}
                        className="
                          flex
                          size-9
                          items-center
                          justify-center
                          rounded-full
                          bg-white
                          text-slate-500
                          shadow-sm
                          transition
                          hover:text-red-500
                        "
                        title="Logout"
                      >
                        <LogOut className="size-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </>
  );
}

/* ============================================================
   DESKTOP NAV LINK
============================================================ */

function NavLink({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="
        text-slate-500
        transition-colors
        hover:text-brand-navy
      "
      activeProps={{
        className:
          "text-brand-navy font-semibold",
      }}
    >
      {children}
    </Link>
  );
}

/* ============================================================
   MOBILE NAV LINK
============================================================ */

function MobileNavLink({
  to,
  children,
  onClick,
}: {
  to: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="
        rounded-xl
        px-4
        py-3
        text-sm
        font-medium
        text-slate-600
        transition-colors
        hover:bg-slate-50
        hover:text-brand-navy
      "
      activeProps={{
        className: `
          rounded-xl
          px-4
          py-3
          text-sm
          font-semibold
          bg-brand-accent/5
          text-brand-navy
        `,
      }}
    >
      {children}
    </Link>
  );
}
