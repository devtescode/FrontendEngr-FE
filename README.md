# Landing Page — EU Hardwarestore (Elizade University Hardware Hub)

Documentation and audit of the public landing page at `/`.

- **Route:** `src/routes/index.tsx`
- **Rendered by:** `src/main.tsx` → TanStack Router → `src/routes/__root.tsx`
- **Audit date:** 2 November 2026
- **Stack:** React 19, TypeScript, TanStack Router, TanStack Query, Tailwind CSS v4, Framer Motion, Socket.IO

> Branding warning: the codebase mixes **EU Hardwarestore**, **PulseLab**, and **EU Hardstore** in page metadata, alt text, and component comments. Pick one name and apply it everywhere.

---

## 1. What the page does

The landing page introduces the campus hardware store and lets students:

1. Understand the order-and-pickup flow.
2. Browse the six newest inventory items with live stock counts.
3. Add items to a cart (authentication required).
4. Read store policies in an accordion.
5. Reach sign-up / login.

The page is public. Guests can view inventory and prices; cart actions prompt for sign-in.

## 2. At a glance

| Concern | State |
| --- | --- |
| Rendering | Client-side SPA (`index.html` + `src/main.tsx`). `src/start.ts` and `src/server.ts` exist but are **not wired into `vite.config.ts`** |
| Routing | TanStack Router file-based routes |
| Data | `GET /engineering/components` via `usePaginatedComponents` (6 per page, newest first) |
| Realtime | Socket.IO `component:created/updated/deleted` and `components:refreshed` invalidate queries |
| Auth | Token in `sessionStorage` under `pulselab_token` |
| Styling | Tailwind v4 + custom tokens in `src/styles.css` |
| Animations | Framer Motion (`Reveal`, `AnimatedCounter`, hero, cards) |
| Footer | **Disabled** in `NavAppShell` |
| Tests | None in the repository |

## 3. Running the page

```bash
# Install
npm install          # or: bun install

# Develop (Vite, port 5173)
npm run dev

# Production build / preview
npm run build
npm run preview

# Quality
npm run lint
npm run format
```

Backend URL resolution lives in `src/lib/config.ts`:

| Condition | Base URL |
| --- | --- |
| `VITE_API_URL` set and compatible | that value |
| `VITE_API_URL` is `http://` on an `https://` page | `https://backendengr-be.onrender.com` |
| Any non-local host, or HTTPS | `https://backendengr-be.onrender.com` |
| Local development | `http://localhost:4500` |

A duplicate, seemingly unused resolver also exists at `config.ts` in the project root.

## 4. Page anatomy

Rendered inside `<NavAppShell>` (navbar + main + toast host; footer commented out).

| # | Section | Source | Notes |
| --- | --- | --- | --- |
| 1 | Navbar | `src/components/HomePageNavbar.tsx` | Sticky, blurred; hides on `/admin`; logo is image-only |
| 2 | Hero | `src/routes/index.tsx` ~L240–303 | Badge, headline, description, two CTAs |
| 3 | Stats | ~L306–313 | Four counters; only "Components Listed" is data-backed |
| 4 | How it works | ~L316–345 | Four static steps in `STEPS` |
| 5 | Featured Components | `src/components/FeaturedComponents.tsx` | Live stock, status chip, refresh, pagination |
| 6 | Dashboard preview | ~L360–457 | Static fake orders and counters |
| 7 | Testimonials | ~L460–495 | Three hardcoded quotes |
| 8 | Customer Policies | ~L498–662 | Five accordion panels; content hardcoded |
| 9 | Toast host | `src/components/ComponentCard.tsx` | Global in-memory toast bus |

Each card in section 5 (`ComponentCard`) includes add-to-cart / quantity controls, optimistic cart mutations, and stock guards.

## 5. Data flow

```text
Landing page
  └─ usePaginatedComponents({ pageSize: 6, sort: "createdAt", order: "desc" })
       ├─ React Query cache (staleTime 15s, keepPreviousData)
       ├─ GET /engineering/components?page=N&limit=6
       └─ Socket.IO events → invalidate ["components"]
            └─ FeaturedComponents → ComponentCard
                 └─ useCartQuery / useCartMutations
                      ├─ GET    /engineering/cart
                      ├─ POST   /engineering/addtocart
                      ├─ PUT    /engineering/cart/:componentId
                      └─ DELETE /engineering/cart/:componentId
```

Query keys are centralized in `src/lib/queryKeys.ts`. The global QueryClient (`src/lib/queryClient.ts`) retries network/5xx failures twice and never retries 4xx.

## 6. Design system

Defined in `src/styles.css`:

| Token | Value | Use |
| --- | --- | --- |
| `--brand-navy` | `#0f172a` | Primary text, buttons, dark sections |
| `--brand-gold` | `#d97706` | Accents, badges |
| `--brand-accent` | `#3b82f6` | Links, icons, highlights |
| `--brand-blue` | `#2563eb` | Secondary accent |
| `--brand-green` | `#006b3c` | Success accent |
| `--font-display` | Bebas Neue | Headings (currently **not loaded**) |
| `--font-sans` | Inter | Body (currently **not loaded**) |
| `--radius` | `0.75rem` | Base radius |

Utilities include `.bg-circuit`, `.animate-float-soft`, `.pulselab-card`, `.pulselab-input`, and `.pulselab-container`.

---

## 7. Audit summary

### Critical / high priority

| ID | Finding | Impact |
| --- | --- | --- |
| H1 | Route-level SEO metadata never reaches the document | Search engines and social previews see the static `index.html` tags only |
| H2 | Fonts referenced by CSS are never loaded | Headings/body silently fall back to system fonts |
| H3 | Stats and social proof are hardcoded/misleading | Trust and accuracy risk |
| H4 | No footer on the landing page | Dead end; no contact, legal, or navigation links |
| H5 | `PolicyAccordion` is declared inside the page component | Accordion state resets on every parent render |
| H6 | Missing policy routes referenced by dead code | `/terms`, `/privacy`, `/refund-policy`, `/shipping-policy` return 404 if ever linked |

### Medium

| ID | Finding | Impact |
| --- | --- | --- |
| M1 | Hero has no search; mobile menu has no page links | Discoverability |
| M2 | Guest "Add to Cart" only shows a toast | No path to login; dead-end interaction |
| M3 | Images lack `loading`, `decoding`, and dimensions | Slower LCP, layout shift |
| M4 | Page is a 734-line file with inline sections and components | Maintainability |
| M5 | `CUSTOMER_POLICIES` is unused and duplicates inline accordion content | Dead code drift |
| M6 | Animations ignore `prefers-reduced-motion` except for one ping | Accessibility |
| M7 | Socket connects for every anonymous visitor | Unnecessary network/CPU on marketing traffic |
| M8 | Stats/dashboard/testimonials are static marketing data | Misleading if presented as live |

### Low

| ID | Finding |
| --- | --- |
| L1 | `user-scalable=no, maximum-scale=1` blocks zoom |
| L2 | Favicon points to `/vite.svg`; no `public/` directory exists |
| L3 | No pagination state in the URL (reload resets to page 1) |
| L4 | Redundant auth buttons between 640–767 px (desktop CTAs + hamburger) |
| L5 | Logo wordmark is commented out; navbar shows icon only |
| L6 | Repo hygiene: `fix_socket.cjs`, `update_*.cjs`, `update_api.js`, `Untitled-1.md` at root |
| L7 | Duplicate API base URL resolver (`config.ts` and `src/lib/config.ts`) |
| L8 | No favicon/OG image asset in the repo |

---

## 8. Detailed findings

### H1 — Metadata and rendering model

`src/routes/__root.tsx` imports `HeadContent` but never renders it:

```tsx
import { HeadContent } from "@tanstack/react-router";
// ...
return (
  <QueryClientProvider client={queryClient}>
    <Outlet />
  </QueryClientProvider>
);
```

`src/routes/index.tsx` defines `head()` with title, description, and OG tags, but without `<HeadContent />` in the root component those tags are never mounted. In practice the browser keeps the static `<title>EU Hardwarestore</title>` from `index.html`, and there is **no meta description** there.

Additionally, `vite.config.ts` registers only `react`, `tsconfigPaths`, and `tailwindcss`. The TanStack Start entry points (`src/start.ts`, `src/server.ts`) and the `@tanstack/react-start` dependency are present but unused by the checked-in config. `vercel.json` rewrites every path to `index.html`, confirming SPA deployment.

**Fix:** Either add `<HeadContent />` to `RootComponent` (and keep SPA), or wire the TanStack Start Vite plugin so route heads render during SSR. Then add real title/description/OG assets to `index.html` as a fallback.

### H2 — Font mismatch

`src/styles.css` asks for:

```css
--font-display: "Bebas Neue", system-ui, sans-serif;
--font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
```

But `__root.tsx` loads **Outfit** and **JetBrains Mono** from Google Fonts, and neither `@fontsource/bebas-neue` nor `@fontsource/inter` is imported anywhere, despite being dependencies. Headings therefore render in `system-ui`, not Bebas Neue.

**Fix:** Import the two fontsource packages in `src/main.tsx` (or `styles.css`), or swap the Google Fonts request to Bebas Neue + Inter and remove the unused dependencies. The mono stack also references JetBrains Mono, which *is* loaded — keep that.

### H3 — Stats and social proof

In `src/routes/index.tsx`:

```tsx
const totalOrders = 0;
const totalStudents = 0;
// ...
<Stat label="Orders Fulfilled" value={totalOrders + 1248} />
<Stat label="Components Listed" value={pagination.totalItems} />
<Stat label="Students Served" value={totalStudents + 840} />
<Stat label="Avg Pickup" value={12} suffix=" min" />
```

- Orders, students, and pickup time are invented constants.
- Testimonials use fabricated names/quotes.
- The "Admin Dashboard View" shows fake orders and fake counters as if live.
- "Same-day pickup", "Lab-verified stock", and "12 min average" are unverified claims.

**Fix:** Fetch real aggregates from an analytics/stats endpoint, or clearly label the numbers as illustrative. Replace fake testimonials with real, consented quotes or remove the section.

### H4 — Footer is disabled

`src/components/NavAppShell.tsx`:

```tsx
// import { Footer } from "./Footer";
// ...
{/* <Footer /> */}
```

A `Footer.tsx` exists in `src/components`. The landing page ends after the policy section, with no footer navigation, contact address, or legal links.

**Fix:** Enable the footer after auditing its links, or build a landing-specific footer.

### H5 — Accordion remounts on every render

`PolicyAccordion` is defined **inside** `Index`:

```tsx
function Index() {
  // ...
  function PolicyAccordion({ ... }) {
    const [open, setOpen] = React.useState(defaultOpen);
    // ...
  }
}
```

Every render of `Index` creates a new component identity. React unmounts and remounts all accordion instances, discarding `open` state. This triggers on pagination, socket refreshes, cart changes, etc. Only the first panel (`defaultOpen={index === 0}`) reopens, so a student reading the refund policy loses it when live stock refreshes.

**Fix:** Move `PolicyAccordion` to module scope (or a separate file) and pass props.

### H6 — Policies and dead links

`CUSTOMER_POLICIES` (lines ~88–117) is declared but never used. It points to `/terms`, `/privacy`, `/refund-policy`, and `/shipping-policy`; none of those route files exist. The rendered accordion duplicates the content inline, so the array is stale dead code waiting to send users to 404s.

**Fix:** Delete `CUSTOMER_POLICIES`, or create the policy routes and link to them from the accordion/footer.

### M1 — Navigation gaps

- No search input in the hero, even though the catalog supports `search`.
- The mobile menu contains only Sign up / Login. There are no links to inventory, orders, or support.
- The navbar hides on `/admin` but shows auth CTAs even for signed-in users (no logged-in state).
- Between 640 px and 767 px, both the desktop auth buttons and the hamburger appear.

**Fix:** Add `Browse`, `Orders`, `Support` links; show the account/cart state when a token exists; hide the redundant control set at the `sm` breakpoint.

### M2 — Guest add-to-cart dead end

`ComponentCard.handleAddToCart` calls `pushToast("info", "Sign in to add your cart.")` and returns. There is no link or redirect to `/login`. The same applies to quantity controls.

**Fix:** Make the toast actionable ("Sign in" link) or navigate to `/login?redirect=/`.

### M3 — Image performance

- `ComponentCard` renders `<img src={c.image} alt={c.name} className="h-full w-full object-cover ...">` with no `loading="lazy"`, `decoding="async"`, or intrinsic dimensions.
- `Logo` renders a WebP with no width/height.
- Backend image URLs are used directly (no CDN sizing, srcset, or format negotiation).

**Fix:** Add lazy loading, async decoding, and aspect-ratio containers or width/height attributes. Consider a CDN resizer.

### M4 — Maintainability

`src/routes/index.tsx` is ~734 lines and contains the page, the accordion component, `Stat`, `FakeOrder`, constants, and all section markup. Split into:

```text
src/components/landing/
  Hero.tsx
  StatsSection.tsx
  HowItWorks.tsx
  LogisticsPreview.tsx
  Testimonials.tsx
  PoliciesSection.tsx
  PolicyAccordion.tsx
```

### M5 — Realtime connection for everyone

`socket.ts` calls `io(SOCKET_URL, { autoConnect: true, ... })` at module load. Importing `usePaginatedComponents` on the public landing page opens a persistent WebSocket for every anonymous visitor, even though anonymous users cannot add to cart.

**Fix:** Connect lazily when the featured section mounts, or gate the socket on a visible/live section. Also consider polling or HTTP cache headers for anonymous stock display.

### M6 — Reduced motion

`Reveal`, `AnimatedCounter`, the floating blobs, and card hover lifts ignore `prefers-reduced-motion`. Only the status ping includes `motion-reduce:animate-none`.

**Fix:** Wrap the app in `<MotionConfig reducedMotion="user">`, or add `@media (prefers-reduced-motion: reduce)` overrides for `.animate-float-soft` and transforms.

### M7 — Accessibility details

- `index.html` sets `maximum-scale=1.0, user-scalable=no`, which prevents pinch-zoom (WCAG 1.4.4).
- Accordion triggers set `aria-expanded` but have no `aria-controls`/panel `id`.
- Mobile menu has no Escape handler, focus trap, or `aria-controls`; the backdrop is click-only.
- The logo `<img>` alt says "EU Hardstore Logo" (branding mismatch), and the visible wordmark is commented out.
- Small text (`text-slate-400`, `text-brand-gold` on light backgrounds) is likely below WCAG AA contrast.
- `AnimatedCounter` exposes the interpolated number to assistive tech while animating.

**Fix:** Remove zoom restrictions, add panel ids/controls, add Escape/focus management to the mobile menu, strengthen contrast, and mark decorative elements `aria-hidden`.

### L1 — Hardening / repo notes

- `index.html` also sets `Cache-Control`/`Pragma`/`Expires` via `<meta http-equiv>`, which browsers do not reliably honor. Keep the `vercel.json` headers instead.
- No CSP or security headers in `vercel.json`.
- Root-level one-off scripts and `Untitled-1.md` should be removed or moved to `scripts/`.
- No tests exist for pagination clamping, optimistic cart rollback, or socket invalidation.

---

## 9. Recommended fix order

1. **Render `HeadContent`** or enable TanStack Start SSR; add real meta/OG assets. (H1)
2. **Load the fonts the CSS asks for** and remove unused font dependencies. (H2)
3. **Hoist `PolicyAccordion`** to module scope. (H5)
4. **Remove fake stats/testimonials** or replace with real API data. (H3)
5. **Enable a footer** and add mobile/nav links. (H4, M1)
6. **Delete `CUSTOMER_POLICIES`** or add the policy routes. (H6)
7. **Improve guest cart UX**, image loading, and reduced-motion support. (M2, M3, M6)
8. **Split `index.tsx`** into section components. (M4)
9. **Fix accessibility blockers** (`user-scalable`, contrast, accordion/menu semantics). (M7)

## 10. Customization guide

| Change | Where |
| --- | --- |
| Hero copy / CTAs | `src/routes/index.tsx` ~L240–303 |
| Steps | `STEPS` array, ~L45–66 |
| Stats | `<Stat>` calls, ~L306–313 |
| Testimonials | `TESTIMONIALS`, ~L68–86 |
| Policy text | Accordion array, ~L520–637 |
| Featured count | `pageSize: 6`, ~L138 |
| Brand colors | `:root` in `src/styles.css` |
| Backend URL | `VITE_API_URL` or `src/lib/config.ts` |
| Navbar | `src/components/HomePageNavbar.tsx` |
| Page shell / footer | `src/components/NavAppShell.tsx` |

## 11. File map

| Path | Role |
| --- | --- |
| `src/routes/index.tsx` | Landing page route, sections, accordion, stats |
| `src/routes/__root.tsx` | Query provider, socket bootstrap, 404, global head tags |
| `src/components/NavAppShell.tsx` | Navbar + main + toast host (footer disabled) |
| `src/components/HomePageNavbar.tsx` | Sticky nav, auth CTAs, mobile menu |
| `src/components/FeaturedComponents.tsx` | Live inventory panel, status, pagination |
| `src/components/ComponentCard.tsx` | Product card, cart controls, toast bus |
| `src/components/Pagination.tsx` | Desktop/compact page controls |
| `src/components/AnimatedCounter.tsx` | In-view number animation |
| `src/components/Section.tsx` | `Reveal` scroll animation wrapper |
| `src/hooks/usePaginatedComponents.ts` | Server pagination + socket invalidation |
| `src/hooks/useCartQuery.ts` | Cart query + optimistic mutations |
| `src/lib/api.ts` | Catalog API calls and types |
| `src/lib/apiClient.ts` | Fetch wrapper, auth, timeout, error types |
| `src/lib/socket.ts` | Socket.IO singleton and room join |
| `src/lib/config.ts` | API base URL resolution |
| `src/styles.css` | Design tokens, utilities, global base |
| `index.html` | SPA shell, static meta, favicon |
| `vercel.json` | SPA rewrites, cache headers |

---

## 12. Bottom line

The landing page has a strong visual foundation: clear hierarchy, real-time inventory, sensible pagination, and a coherent brand palette. The biggest risks are not cosmetic — they are **invisible SEO metadata**, **fonts that never load**, **fabricated trust signals**, and **small correctness bugs** like the accordion remount. Fixing the top four items would materially improve discoverability, brand accuracy, and reliability without redesigning the page.
