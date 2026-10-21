import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Loader2, CheckCircle2, XCircle, Ban } from "lucide-react";
import { AppShell } from "@/components/AppShell";

import { useVerifyPayment } from "@/hooks/useAuthMutations";
import { queryKeys } from "@/lib/queryKeys";
import { toErrorMessage } from "@/lib/queryClient";

export const Route = createFileRoute("/payment/callback")({
  head: () => ({ meta: [{ title: "Verifying Payment — EU Hardwarestore" }] }),
  component: PaymentCallbackPage,
});

type Status = "verifying" | "success" | "failed" | "cancelled";

function PaymentCallbackPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const verifyPayment = useVerifyPayment();

  const [status, setStatus] = useState<Status>("verifying");
  const [message, setMessage] = useState("Verifying your payment...");

  // Guard against React 18 StrictMode double-invoking the effect.
  const hasVerified = useRef(false);

  // The redirect timer must not fire after the page is gone.
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, []);

  useEffect(() => {
    if (hasVerified.current) return;
    hasVerified.current = true;

    const verify = async () => {
      const token = sessionStorage.getItem("pulselab_token");
      const params = new URLSearchParams(window.location.search);

      // Paystack can send the reference under either name.
      const reference =
        params.get("reference") ||
        params.get("trxref") ||
        sessionStorage.getItem("pulselab_pending_reference");

      // Paystack may also indicate cancellation explicitly.
      const paystackStatus = params.get("status");

      // =================================================
      // CANCELLED
      // =================================================
      // No reference AND Paystack flagged cancellation,
      // OR just no reference at all.
      if (
        paystackStatus === "cancelled" ||
        paystackStatus === "failed" ||
        !reference
      ) {
        sessionStorage.removeItem("pulselab_pending_reference");
        setStatus("cancelled");
        setMessage(
          "You cancelled the payment. Your cart is still intact."
        );

        // Auto-return to cart so the Pay button resets.
        redirectTimer.current = setTimeout(() => {
          navigate({ to: "/cart" });
        }, 2500);
        return;
      }

      // =================================================
      // NOT LOGGED IN
      // =================================================
      if (!token) {
        sessionStorage.removeItem("pulselab_pending_reference");
        setStatus("failed");
        setMessage("You are not logged in.");
        return;
      }

      // =================================================
      // VERIFY WITH BACKEND
      // =================================================
      try {
        const data = await verifyPayment.mutateAsync({ reference });

        if (!data || (data as { status?: string })?.status !== "success") {
          // Backend explicitly says payment didn't succeed.
          sessionStorage.removeItem("pulselab_pending_reference");
          setStatus("failed");
          setMessage(
            (data as { message?: string })?.message ||
              "Payment was not successful."
          );
          return;
        }

        // =================================================
        // SUCCESS
        // =================================================
        sessionStorage.removeItem("pulselab_pending_reference");

        // The order now exists and the cart was emptied server side.
        // Drop the cached copies so /orders and the cart badge are correct.
        void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
        void queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });

        setStatus("success");
        setMessage("Payment verified! Redirecting to your orders...");

        redirectTimer.current = setTimeout(() => {
          navigate({ to: "/orders" });
        }, 2000);
      } catch (error: unknown) {
        sessionStorage.removeItem("pulselab_pending_reference");
        setStatus("failed");
        setMessage(toErrorMessage(error, "Unable to verify payment."));
      }
    };

    verify();
  }, [navigate, queryClient, verifyPayment]);

  return (
    <AppShell>
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        {status === "verifying" && (
          <>
            <Loader2 className="mx-auto mb-4 size-12 animate-spin text-brand-navy" />
            <h1 className="text-xl font-semibold text-brand-navy">
              Verifying payment...
            </h1>
            <p className="mt-3 text-sm text-slate-500">{message}</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="mx-auto mb-4 size-12 text-green-600" />
            <h1 className="text-xl font-semibold text-brand-navy">
              Payment Successful
            </h1>
            <p className="mt-3 text-sm text-slate-500">{message}</p>
          </>
        )}

        {status === "cancelled" && (
          <>
            <Ban className="mx-auto mb-4 size-12 text-amber-500" />
            <h1 className="text-xl font-semibold text-brand-navy">
              Payment Cancelled
            </h1>
            <p className="mt-3 text-sm text-slate-500">{message}</p>

            <button
              onClick={() => navigate({ to: "/cart" })}
              className="mt-6 rounded-lg bg-brand-navy px-6 py-3 font-semibold text-white transition hover:bg-slate-800"
            >
              Back to Cart
            </button>
          </>
        )}

        {status === "failed" && (
          <>
            <XCircle className="mx-auto mb-4 size-12 text-red-600" />
            <h1 className="text-xl font-semibold text-brand-navy">
              Payment Not Completed
            </h1>
            <p className="mt-3 text-sm text-slate-500">{message}</p>

            <button
              onClick={() => navigate({ to: "/cart" })}
              className="mt-6 rounded-lg bg-brand-navy px-6 py-3 font-semibold text-white transition hover:bg-slate-800"
            >
              Back to Cart
            </button>
          </>
        )}
      </div>
    </AppShell>
  );
}