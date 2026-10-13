import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2, CheckCircle2, XCircle, Ban } from "lucide-react";
import { AppShell } from "@/components/AppShell";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4500";

export const Route = createFileRoute("/payment/callback")({
  head: () => ({ meta: [{ title: "Verifying Payment — PulseLab" }] }),
  component: PaymentCallbackPage,
});

type Status = "verifying" | "success" | "failed" | "cancelled";

function PaymentCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("verifying");
  const [message, setMessage] = useState("Verifying your payment...");

  // Guard against React 18 StrictMode double-invoking the effect.
  const hasVerified = useRef(false);

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
        setTimeout(() => {
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
        const response = await fetch(
          `${API_URL}/api/paystack/verify?reference=${encodeURIComponent(reference)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const rawText = await response.text();
        let data: any = null;
        try {
          data = rawText ? JSON.parse(rawText) : null;
        } catch {
          throw new Error(
            `Verification endpoint not found (HTTP ${response.status}).`
          );
        }

        if (!response.ok || data?.status !== "success") {
          // Backend explicitly says payment didn't succeed.
          sessionStorage.removeItem("pulselab_pending_reference");
          setStatus("failed");
          setMessage(
            data?.message || "Payment was not successful."
          );
          return;
        }

        // =================================================
        // SUCCESS
        // =================================================
        localStorage.removeItem("pulselab_cart");
        sessionStorage.removeItem("pulselab_pending_reference");

        setStatus("success");
        setMessage("Payment verified! Redirecting to your orders...");

        setTimeout(() => {
          navigate({ to: "/orders" });
        }, 2000);
      } catch (error: any) {
        sessionStorage.removeItem("pulselab_pending_reference");
        setStatus("failed");
        setMessage(error?.message || "Unable to verify payment.");
      }
    };

    verify();
  }, [navigate]);

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