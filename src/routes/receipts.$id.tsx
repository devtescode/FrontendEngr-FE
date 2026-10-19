    import {
    createFileRoute,
    Link,
    useParams,
    useNavigate,
    } from "@tanstack/react-router";
    import { motion } from "framer-motion";
    import {
    ArrowLeft,
    Printer,
    Share2,
    CheckCircle2,
    Loader2,
    AlertCircle,
    Package,
    CreditCard,
    Building2,
    Copy,
    Check,
    Calendar,
    Hash,
    Mail,
    MapPin,
    Phone,
    Sparkles,
    Shield,
    } from "lucide-react";
    import { useEffect, useState } from "react";

    import { AppShell } from "@/components/AppShell";
    import { RequireAuth } from "@/components/RequireAuth";

    const API_URL =
    import.meta.env.VITE_API_URL || "http://localhost:4500";

    const BRAND = {
    name: "EU Hardwarestore",
    tagline: "Engineering Components Store",
    address: "Engineering Building, Room 204",
    phone: "+234 806 486 4821",
    email: "support@euhardwarestore.ng",
    };

    export const Route = createFileRoute("/receipts/$id")({
    head: () => ({ meta: [{ title: "Receipt — EU Hardwarestore" }] }),
    component: () => (
        <RequireAuth role="student">
        <ReceiptPage />
        </RequireAuth>
    ),
    });

    // =====================================================
    // TYPES
    // =====================================================

    type OrderItem = {
    componentId: string;
    name: string;
    price: number;
    quantity: number;
    image?: string | null;
    sku?: string | null;
    };

    type Order = {
    id: string;
    reference: string;
    items: OrderItem[];
    subtotal: number;
    total: number;
    currency: string;
    status: "Paid";
    channel: string | null;
    paidAt: string;
    createdAt: string;
    paystackTransactionId: string | null;
    paystackFees: number;
    customerEmail: string | null;
    };

    // =====================================================
    // HELPERS
    // =====================================================

    const formatNaira = (amount: number) =>
    new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        minimumFractionDigits: 0,
    }).format(amount);

    const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString("en-NG", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });

    // =====================================================
    // PAGE
    // =====================================================

    function ReceiptPage() {
    const { id } = useParams({ from: "/receipts/$id" });
    const navigate = useNavigate();

    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copiedRef, setCopiedRef] = useState(false);
    const [copiedShare, setCopiedShare] = useState(false);

    // ===================================================
    // FETCH
    // ===================================================
    useEffect(() => {
    let cancelled = false;

    const load = async () => {
        const token = sessionStorage.getItem("pulselab_token");

        console.log("🔍 Receipt page — id:", id);
        console.log("🔍 API_URL:", API_URL);
        console.log("🔍 Token present:", !!token);

        if (!token) {
        setError("Please login first.");
        setLoading(false);
        return;
        }

        const url = `${API_URL}/engineering/orders/${id}`;
        console.log("🔍 Fetching:", url);

        try {
        setLoading(true);

        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
        });

        console.log("🔍 Status:", response.status);
        console.log("🔍 Content-Type:", response.headers.get("content-type"));

        const rawText = await response.text();
        console.log("🔍 Raw body (first 500 chars):", rawText.slice(0, 500));

        let data: any = null;
        try {
            data = rawText ? JSON.parse(rawText) : null;
        } catch {
            throw new Error(
            `Receipt endpoint returned non-JSON (HTTP ${response.status}).`
            );
        }

        if (!response.ok) {
            throw new Error(data?.message || "Receipt not found.");
        }

        console.log("🔍 Parsed order:", data.order);

        if (!cancelled) setOrder(data.order);
        } catch (err: any) {
        console.error("🔴 Receipt load failed:", err);
        if (!cancelled) {
            setError(err?.message || "Unable to load receipt.");
        }
        } finally {
        if (!cancelled) setLoading(false);
        }
    };

    load();
    return () => {
        cancelled = true;
    };
    }, [id]);

    // ===================================================
    // ACTIONS
    // ===================================================
    const copyReference = async () => {
        if (!order) return;
        try {
        await navigator.clipboard.writeText(order.reference);
        setCopiedRef(true);
        setTimeout(() => setCopiedRef(false), 2000);
        } catch {}
    };

    const handleShare = async () => {
        if (!order) return;

        const shareText =
        `Receipt from ${BRAND.name}\n` +
        `Reference: ${order.reference}\n` +
        `Date: ${formatDateTime(order.paidAt)}\n` +
        `Total: ${formatNaira(order.total)}\n` +
        `Items: ${order.items.map((i) => `${i.name} × ${i.quantity}`).join(", ")}`;

        const shareUrl = window.location.href;

        if (navigator.share) {
        try {
            await navigator.share({
            title: `Receipt ${order.reference}`,
            text: shareText,
            url: shareUrl,
            });
            return;
        } catch {}
        }

        try {
        await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 2000);
        } catch {}
    };

    const handlePrint = () => window.print();

    // ===================================================
    // RENDER STATES
    // ===================================================
    if (loading) {
        return (
        <AppShell>
            <div className="mx-auto max-w-2xl px-6 py-24 text-center">
            <Loader2 className="mx-auto mb-4 size-10 animate-spin text-brand-navy" />
            <p className="text-slate-500">Loading your receipt...</p>
            </div>
        </AppShell>
        );
    }

    if (error || !order) {
        return (
        <AppShell>
            <div className="mx-auto max-w-2xl px-6 py-24 text-center">
            <AlertCircle className="mx-auto mb-4 size-12 text-red-500" />
            <h1 className="text-xl font-semibold text-brand-navy">
                Receipt not found
            </h1>
            <p className="mt-2 text-slate-500">
                {error || "This receipt doesn't exist."}
            </p>
            <Link
                to="/receipts"
                className="mt-6 inline-block rounded-lg bg-brand-navy px-6 py-3 font-semibold text-white transition hover:bg-slate-800"
            >
                Back to Receipts
            </Link>
            </div>
        </AppShell>
        );
    }

    const totalUnits = order.items.reduce((a, i) => a + i.quantity, 0);

    return (
        <AppShell>
        {/* PRINT STYLES */}
        <style>{`
            @media print {
            body * { visibility: hidden !important; background: white !important; }
            #receipt-print-area,
            #receipt-print-area * { visibility: visible !important; }
            #receipt-print-area {
                position: absolute !important;
                left: 0; top: 0;
                width: 100%;
                max-width: 420px;
                margin: 0 auto;
                box-shadow: none !important;
                border-radius: 0 !important;
            }
            .no-print { display: none !important; }
            }
        `}</style>

        <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
            {/* TOP BAR */}
            <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
            <button
                onClick={() => navigate({ to: "/receipts" })}
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-brand-navy"
            >
                <ArrowLeft className="size-4" />
                All Receipts
            </button>

            <div className="flex items-center gap-2">
                <button
                onClick={handleShare}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                {copiedShare ? (
                    <>
                    <Check className="size-4 text-green-600" />
                    Copied
                    </>
                ) : (
                    <>
                    <Share2 className="size-4" />
                    Share
                    </>
                )}
                </button>

                <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                <Printer className="size-4" />
                Print
                </button>
            </div>
            </div>

            {/* =====================================================
                RECEIPT CARD — OPay style
            ===================================================== */}
            <motion.div
            id="receipt-print-area"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200"
            >
            {/* =====================================================
                DARK HERO HEADER
            ===================================================== */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-brand-navy px-6 pb-8 pt-6 text-white sm:px-8 sm:pb-10 sm:pt-8">
                {/* Decorative glow */}
                <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-brand-navy/40 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-12 -left-12 size-40 rounded-full bg-emerald-500/10 blur-3xl" />

                <div className="relative">
                {/* Top row: brand + receipt badge */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                    <div className="grid size-9 place-items-center rounded-xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20">
                        <Sparkles className="size-4 text-white" />
                    </div>
                    <div>
                        <div className="text-sm font-bold tracking-tight">
                        {BRAND.name}
                        </div>
                        <div className="text-[10px] uppercase tracking-widest text-white/50">
                        {BRAND.tagline}
                        </div>
                    </div>
                    </div>

                    <div className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/20 backdrop-blur-sm">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-white/90">
                        Receipt
                    </span>
                    </div>
                </div>

                {/* Amount block */}
                <div className="mt-8 text-center">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 ring-1 ring-emerald-400/30">
                    <CheckCircle2 className="size-3.5 text-emerald-400" />
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-emerald-300">
                        Payment Successful
                    </span>
                    </div>

                    <div className="mt-4 text-[10px] uppercase tracking-widest text-white/40">
                    Amount Paid
                    </div>
                    <div className="mt-1 text-4xl font-bold tracking-tight sm:text-5xl">
                    {formatNaira(order.total)}
                    </div>

                    <div className="mt-3 text-xs text-white/50">
                    {formatDateTime(order.paidAt)}
                    </div>
                </div>
                </div>
            </div>

            {/* =====================================================
                TORN EDGE (zigzag divider)
            ===================================================== */}
            <div className="relative -mt-px h-3 bg-slate-900">
                <svg
                viewBox="0 0 400 12"
                preserveAspectRatio="none"
                className="absolute inset-0 h-full w-full"
                >
                <path
                    d="M0,0 L10,12 L20,0 L30,12 L40,0 L50,12 L60,0 L70,12 L80,0 L90,12 L100,0 L110,12 L120,0 L130,12 L140,0 L150,12 L160,0 L170,12 L180,0 L190,12 L200,0 L210,12 L220,0 L230,12 L240,0 L250,12 L260,0 L270,12 L280,0 L290,12 L300,0 L310,12 L320,0 L330,12 L340,0 L350,12 L360,0 L370,12 L380,0 L390,12 L400,0 L400,12 L0,12 Z"
                    fill="white"
                />
                </svg>
            </div>

            {/* =====================================================
                META GRID
            ===================================================== */}
            <div className="border-b border-dashed border-slate-200 px-6 py-5 sm:px-8">
                <div className="grid gap-4 sm:grid-cols-2">
                <MetaCell
                    label="Reference"
                    value={
                    <button
                        onClick={copyReference}
                        className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-700 transition hover:text-brand-navy"
                    >
                        <span className="truncate max-w-[150px]">
                        {order.reference}
                        </span>
                        {copiedRef ? (
                        <Check className="size-3 shrink-0 text-green-600" />
                        ) : (
                        <Copy className="size-3 shrink-0 text-slate-400" />
                        )}
                    </button>
                    }
                />

                <MetaCell
                    label="Payment Method"
                    value={
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium capitalize text-slate-700">
                        {order.channel === "card" ? (
                        <CreditCard className="size-3.5 text-slate-400" />
                        ) : (
                        <Building2 className="size-3.5 text-slate-400" />
                        )}
                        {order.channel?.replace("_", " ") || "—"}
                    </span>
                    }
                />

                {order.customerEmail && (
                    <MetaCell
                    label="Customer"
                    value={
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                        <Mail className="size-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">{order.customerEmail}</span>
                        </span>
                    }
                    />
                )}

                {order.paystackTransactionId && (
                    <MetaCell
                    label="Transaction ID"
                    value={
                        <span className="font-mono text-xs text-slate-700">
                        {order.paystackTransactionId}
                        </span>
                    }
                    />
                )}
                </div>
            </div>

            {/* =====================================================
                ITEMS
            ===================================================== */}
            <div className="px-6 py-6 sm:px-8">
                <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-slate-400">
                    <Package className="size-3.5" />
                    Items ({order.items.length})
                </div>
                <div className="text-[10px] uppercase tracking-widest text-slate-400">
                    {totalUnits} {totalUnits === 1 ? "unit" : "units"}
                </div>
                </div>

                <ul className="space-y-3">
                {order.items.map((item, idx) => (
                    <li
                    key={`${order.id}-${idx}`}
                    className="flex items-center gap-3 rounded-xl bg-slate-50/70 p-3 ring-1 ring-slate-100"
                    >
                    <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-white ring-1 ring-slate-100">
                        {item.image ? (
                        <img
                            src={item.image}
                            alt={item.name}
                            loading="lazy"
                            className="h-full w-full object-cover"
                        />
                        ) : (
                        <Package className="size-4 text-slate-300" />
                        )}
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-brand-navy">
                        {item.name}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
                        {item.sku && (
                            <>
                            <span className="font-mono">{item.sku}</span>
                            <span className="text-slate-300">•</span>
                            </>
                        )}
                        <span>
                            {formatNaira(item.price)} × {item.quantity}
                        </span>
                        </div>
                    </div>

                    <div className="shrink-0 text-right text-sm font-bold text-brand-navy">
                        {formatNaira(item.price * item.quantity)}
                    </div>
                    </li>
                ))}
                </ul>
            </div>

            {/* =====================================================
                TOTALS
            ===================================================== */}
            <div className="border-t border-dashed border-slate-200 px-6 py-5 sm:px-8">
                <div className="space-y-2.5 text-sm">
                <div className="flex justify-between text-slate-500">
                    <span>Subtotal</span>
                    <span className="font-semibold text-slate-700">
                    {formatNaira(order.subtotal)}
                    </span>
                </div>

                <div className="flex justify-between text-slate-500">
                    <span>Pickup</span>
                    <span className="font-semibold text-emerald-600">
                    Free
                    </span>
                </div>

                {order.paystackFees > 0 && (
                    <div className="flex justify-between text-slate-400">
                    <span className="text-xs">Gateway Fee</span>
                    <span className="text-xs">
                        {formatNaira(order.paystackFees)}
                    </span>
                    </div>
                )}

                <div className="my-4 border-t border-dashed border-slate-200" />

                <div className="flex items-center justify-between rounded-xl bg-brand-navy/5 px-4 py-3">
                    <span className="text-xs font-semibold uppercase tracking-widest text-brand-navy">
                    Total Paid
                    </span>
                    <span className="text-xl font-bold text-brand-navy">
                    {formatNaira(order.total)}
                    </span>
                </div>
                </div>
            </div>

            {/* =====================================================
                FOOTER
            ===================================================== */}
            <div className="border-t border-dashed border-slate-200 bg-slate-50/60 px-6 py-6 text-center sm:px-8">
                <div className="mx-auto mb-4 grid size-10 place-items-center rounded-full bg-emerald-100">
                <Shield className="size-5 text-emerald-600" />
                </div>

                <p className="text-sm font-semibold text-brand-navy">
                This is a computer-generated receipt
                </p>
                <p className="mt-1 text-xs text-slate-500">
                No signature required. Keep this for your records.
                </p>

                <div className="mt-5 grid gap-2 text-[11px] text-slate-500 sm:grid-cols-3">
                <div className="flex items-center justify-center gap-1.5">
                    <MapPin className="size-3 text-slate-400" />
                    <span>{BRAND.address}</span>
                </div>
                <div className="flex items-center justify-center gap-1.5">
                    <Phone className="size-3 text-slate-400" />
                    <span>{BRAND.phone}</span>
                </div>
                <div className="flex items-center justify-center gap-1.5">
                    <Mail className="size-3 text-slate-400" />
                    <span>{BRAND.email}</span>
                </div>
                </div>

                <div className="mt-6 flex items-center justify-center gap-3">
                <div className="h-px w-10 bg-slate-300" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-slate-400">
                    Thank you
                </span>
                <div className="h-px w-10 bg-slate-300" />
                </div>
            </div>
            </motion.div>

            {/* =====================================================
                QUICK ACTIONS BELOW
            ===================================================== */}
            <div className="no-print mt-6 grid gap-3 sm:grid-cols-3">
            <Link
                to="/receipts"
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
                <ArrowLeft className="size-4" />
                All Receipts
            </Link>

            <button
                onClick={handleShare}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
                <Share2 className="size-4" />
                Share Receipt
            </button>

            <button
                onClick={handlePrint}
                className="flex items-center justify-center gap-2 rounded-xl bg-brand-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
                <Printer className="size-4" />
                Print / Save
            </button>
            </div>
        </div>
        </AppShell>
    );
    }

    /* ============================================================
    META CELL
    ============================================================ */

    function MetaCell({
    label,
    value,
    }: {
    label: string;
    value: React.ReactNode;
    }) {
    return (
        <div className="min-w-0">
        <div className="text-[10px] font-medium uppercase tracking-widest text-slate-400">
            {label}
        </div>
        <div className="mt-1 truncate">{value}</div>
        </div>
    );
    }