import { useRouterState } from "@tanstack/react-router";
import { ArrowRight, CreditCard, FileText, MapPin, RotateCcw, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Reveal } from "@/components/Section";

import { PolicyAccordion, type PolicyItem } from "./PolicyAccordion";

const POLICIES: PolicyItem[] = [
  {
    id: "policy-terms",
    title: "Terms & Conditions",
    icon: FileText,
    content: (
      <>
        <p>
          By using EU Hardwarestore, you agree to use the platform responsibly and provide accurate
          information when creating an account or placing an order. Orders are subject to product
          availability and successful payment confirmation.
        </p>
        <p className="mt-3">
          EU Hardwarestore reserves the right to update product availability, pricing, and service
          information when necessary.
        </p>
      </>
    ),
  },
  {
    id: "policy-privacy",
    title: "Privacy Policy",
    icon: ShieldCheck,
    content: (
      <>
        <p>
          We collect information necessary to provide our services, including your name, email
          address, matriculation number, order details, and payment-related information.
        </p>
        <p className="mt-3">
          Your information is used to process orders, provide customer support, verify transactions,
          and improve the platform. We do not sell your personal information to third parties.
        </p>
      </>
    ),
  },
  {
    id: "policy-refunds",
    title: "Refund & Cancellation",
    icon: RotateCcw,
    content: (
      <>
        <p>
          Customers may request cancellation of an order before the order has been prepared for
          collection.
        </p>
        <p className="mt-3">
          Refund requests are reviewed based on the circumstances of the order, payment status,
          product availability, and whether the order has already been collected.
        </p>
        <p className="mt-3">
          Where a refund is approved, the applicable refund will be processed through the original
          payment method where possible.
        </p>
      </>
    ),
  },
  {
    id: "policy-pickup",
    title: "Delivery & Campus Pickup",
    icon: MapPin,
    content: (
      <>
        <p>
          EU Hardwarestore currently provides campus-based pickup for orders placed through the
          platform. After successful payment verification, your order will be prepared by the lab
          team.
        </p>
        <p className="mt-3">
          Customers should provide their Order ID when collecting their items. Customers are
          responsible for collecting their orders within the applicable pickup period communicated
          by the laboratory or platform.
        </p>
      </>
    ),
  },
  {
    id: "policy-payment",
    title: "Payment Information",
    icon: CreditCard,
    content: (
      <>
        <p>
          Payments are processed through our supported payment provider. An order is considered paid
          only after the payment has been successfully verified. Customers should not make duplicate
          payments for the same order.
        </p>
        <p className="mt-3">
          If you experience a payment issue, please contact support with your transaction or order
          reference.
        </p>
      </>
    ),
  },
];

export function CustomerPolicies() {
  const [openId, setOpenId] = useState<string | null>("policy-terms");
  const routerHash = useRouterState({
    select: (state) => state.location.hash ?? "",
  });

  const openPolicyFromHash = useCallback((rawHash: string) => {
    if (typeof window === "undefined") return;

    const id = rawHash.replace(/^#/, "");
    if (!id) return;

    const match = POLICIES.find((policy) => policy.id === id);
    if (!match) return;

    setOpenId(match.id);
    const target = document.getElementById(match.id);
    const scrollToTarget = () => {
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    window.requestAnimationFrame(scrollToTarget);
    // The accordion height animation shifts the target, so settle the scroll
    // again once the panel has finished opening.
    window.setTimeout(scrollToTarget, 350);
  }, []);

  // TanStack Router updates the URL with pushState for in-app policy links,
  // which does not fire a native hashchange event.
  useEffect(() => {
    openPolicyFromHash(routerHash);
  }, [openPolicyFromHash, routerHash]);

  useEffect(() => {
    const syncFromHash = () => openPolicyFromHash(window.location.hash);
    window.addEventListener("hashchange", syncFromHash);

    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [openPolicyFromHash]);

  const handleToggle = (id: string) => {
    setOpenId((current) => (current === id ? null : id));
  };

  return (
    <section
      id="policies"
      aria-labelledby="policies-heading"
      className="relative overflow-hidden bg-slate-50 py-20 md:py-28"
    >
      {/* Decorative soft blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-10 size-72 rounded-full bg-brand-accent/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 bottom-0 size-80 rounded-full bg-brand-gold/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/3 size-64 -translate-x-1/2 rounded-full bg-brand-navy/5 blur-3xl"
      />

      <div className="relative mx-auto max-w-4xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-brand-navy text-brand-gold shadow-lg shadow-brand-navy/10">
            <ShieldCheck className="size-7" aria-hidden="true" />
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-gold">
            Customer Policies
          </p>

          <h2
            id="policies-heading"
            className="mt-3 font-display text-3xl tracking-tight text-brand-navy md:text-4xl"
          >
            Everything you need to know
          </h2>

          <p className="mt-3 text-sm leading-6 text-slate-500 md:text-base">
            Clear answers on orders, payments, refunds, privacy, and campus pickup — all in one
            place.
          </p>
        </Reveal>

        <div className="mt-10 space-y-4">
          {POLICIES.map((policy) => (
            <div key={policy.id} id={policy.id} className="scroll-mt-28">
              <PolicyAccordion
                policy={policy}
                open={openId === policy.id}
                onToggle={() => handleToggle(policy.id)}
              />
            </div>
          ))}
        </div>

        <Reveal delay={0.15} className="mt-8">
          <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-brand-navy/10 bg-brand-navy px-6 py-6 text-center shadow-lg shadow-brand-navy/10 sm:flex-row sm:text-left">
            <div>
              <p className="font-semibold text-white">Need help with an order or payment?</p>
              <p className="mt-1 text-sm text-slate-400">
                Contact our support team for assistance with your order.
              </p>
            </div>

            <a
              href="mailto:euhardwarestore@gmail.com"
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-brand-navy transition-all hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-brand-navy active:scale-95"
            >
              Contact Support
              <ArrowRight className="size-4" aria-hidden="true" />
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
