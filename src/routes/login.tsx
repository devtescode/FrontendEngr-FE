import {
  createFileRoute,
  Link,
  useNavigate,
  // Navigate,
} from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  useEffect,
  useState,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import {  useStore } from "@/lib/store";
import { connectUserSocket, socket } from "@/lib/socket";
import { useUserLogin } from "@/hooks/useAuthMutations";
import { toErrorMessage } from "@/lib/queryClient";
import { Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Sign in — PulseLab" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  // const user = useCurrentUser();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loginMutation = useUserLogin();

  // --------------------------------
  // RESTORE USER SESSION
  // --------------------------------
  useEffect(() => {
    const savedUser = sessionStorage.getItem("pulselab_user");
    const savedToken = sessionStorage.getItem("pulselab_token");

    if (!savedUser || !savedToken) {
      return;
    }

    try {
      const parsedUser = JSON.parse(savedUser);

      const userId =
        parsedUser?.id ??
        parsedUser?._id ??
        parsedUser?.userId;

      if (userId) {
        useStore.setState({
          currentUserId: userId,
        });
      }
    } catch (error) {
      console.error("Failed to restore session:", error);

      sessionStorage.removeItem("pulselab_user");
      sessionStorage.removeItem("pulselab_token");
    }
  }, []);

  // --------------------------------
  // REDIRECT IF ALREADY LOGGED IN
  // --------------------------------
  // if (user) {
  //   return (
  //     <Navigate
  //       to={user.role === "admin" ? "/admin" : "/dashboard"}
  //     />
  //   );
  // }

  // --------------------------------
  // LOGIN
  // --------------------------------
  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError(null);

    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      // The mutation performs the request, clears every cached response
      // from the previous account and writes the new session.
      const response = await loginMutation.mutateAsync({
        email: cleanEmail,
        password,
      });

      const userData = response.user as {
        id?: string;
        role?: string;
      };

      const userId = String(userData?.id ?? "");

      // =================================================
      // CLEAR PREVIOUS USER'S CACHES
      // =================================================
      // A new login means we're switching users (or
      // re-authenticating the same user). The login mutation
      // already cleared every cached response; this tears down
      // the previous user's socket connection.
      //
      // If a socket is already connected as the previous
      // user, tear it down before joining the new room.
      // (connectUserSocket will reconnect below.)
      if (socket.connected) {
        socket.disconnect();
      }

      // --------------------------------
      // UPDATE ZUSTAND
      // --------------------------------
      useStore.setState({
        currentUserId: userId,
      });

      // --------------------------------
      // CONNECT SOCKET
      // --------------------------------
      // Reconnect and join the room under the new
      // user's ID. `connectUserSocket` reads the token
      // from sessionStorage, so it must run AFTER the
      // token was stored by the mutation.
      //
      socket.connect();
      connectUserSocket();

      // --------------------------------
      // REDIRECT
      // --------------------------------
      if (userData.role === "admin") {
        await navigate({
          to: "/admin",
          replace: true,
        });
      } else {
        await navigate({
          to: "/dashboard",
          replace: true,
        });
      }
    } catch (mutationError) {
      console.error("Login error:", mutationError);

      setError(toErrorMessage(mutationError, "Unable to sign in. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-2 bg-slate-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-sm bg-white p-6 shadow-sm"
      >
        <h1 className="text-3xl font-bold text-brand-navy">
          Welcome back
        </h1>

        <p className="text-slate-500 mt-1 text-sm">
          Sign in with your details
        </p>

        <form
          onSubmit={submit}
          className="mt-8 space-y-4"
        >
          <Field
            label="Email"
            value={email}
            onChange={setEmail}
            type="email"
            // placeholder="you@elizade.edu.ng"
            placeholder="teslimagboola09@gmail.com"
            icon={<Mail size={18} />}
          />

          <div>
            <Field
              label="Password"
              value={password}
              onChange={setPassword}
              type="password"
              placeholder="••••••••"
              icon={<Lock size={18} />}
            />

            <div className="mt-2 flex justify-end">
              <Link
                to="/forgot-password"
                className="rounded-sm text-sm font-medium text-brand-accent transition hover:text-brand-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full h-12 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
              loading
                ? "bg-slate-400 text-white cursor-not-allowed"
                : "bg-brand-navy text-white hover:bg-slate-800"
            }`}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        <p className="text-sm text-slate-500 text-center mt-6">
          No account?{" "}
          <Link
            to="/register"
            className="text-brand-accent font-semibold"
          >
            Register
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

// --------------------------------
// FIELD COMPONENT
// --------------------------------

export function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  icon,
  autoComplete,
  autoFocus,
  disabled,
  invalid,
  describedBy,
  revealable,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  icon?: ReactNode;
  autoComplete?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  /** Adds a show/hide toggle to password fields. */
  revealable?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const canReveal = revealable && type === "password";

  return (
    <label className="block">
      <span className="text-xs font-mono uppercase tracking-widest text-slate-500">
        {label}
      </span>

      <div className="relative mt-1">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </div>
        )}

        <input
          type={canReveal && visible ? "text" : type}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
          }}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          required
          className={`w-full h-11 rounded-sm border bg-white text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-accent/10 focus:border-brand-accent transition disabled:cursor-not-allowed disabled:bg-slate-50 ${
            invalid ? "border-red-400" : "border-slate-200"
          } ${icon ? "pl-10" : "pl-3"} ${canReveal ? "pr-11" : "pr-3"}`}
        />

        {canReveal && (
          <button
            type="button"
            onClick={() => setVisible((isVisible) => !isVisible)}
            aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
            aria-pressed={visible}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-sm text-slate-400 transition hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </label>
  );
}