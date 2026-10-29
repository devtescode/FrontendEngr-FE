import { ChevronLeft, ChevronRight } from "lucide-react";

type PageItem = number | "ellipsis";

type PaginationProps = {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  itemLabel?: string;
  className?: string;
  /** Overrides the nav's accessible name. */
  ariaLabel?: string;
  /** Hide the "Showing X–Y of Z" line when the page already shows one. */
  showSummary?: boolean;
  /** Colour scheme: "light" (default) for storefront pages, "dark" for the admin shell. */
  variant?: PaginationVariant;
};

export type PaginationVariant = "light" | "dark";

/**
 * Desktop window: first page, last page and a moving block of pages around
 * the active one. Ellipses collapse the unreachable middle of a long list.
 */
export function getPaginationItems(page: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const start = Math.max(2, Math.min(page - 1, totalPages - 4));
  const end = Math.min(totalPages - 1, Math.max(page + 1, 4));

  const items: PageItem[] = [1];

  if (start > 2) items.push("ellipsis");

  for (let current = start; current <= end; current += 1) {
    items.push(current);
  }

  if (end < totalPages - 1) items.push("ellipsis");

  items.push(totalPages);

  return items;
}

/**
 * Mobile window: at most four slots so the control never overflows a narrow
 * viewport. The active page is always present and the first/last page stay
 * one tap away.
 */
export function getCompactPaginationItems(page: number, totalPages: number): PageItem[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const start = Math.max(1, page - 1);
  const end = Math.min(totalPages, page + 1);

  const items: PageItem[] = [];

  if (start > 1) {
    items.push(1, "ellipsis");
  }

  for (let current = start; current <= end; current += 1) {
    items.push(current);
  }

  if (end < totalPages) {
    items.push("ellipsis", totalPages);
  }

  return items;
}

const controlClass =
  "inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-300 sm:px-3";

const pageButtonClass =
  "grid size-9 shrink-0 place-items-center rounded-lg text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40";

const ellipsisClass = "grid size-9 shrink-0 place-items-center text-sm text-slate-400";

type VariantClasses = {
  nav: string;
  summary: string;
  summaryStrong: string;
  pageInfo: string;
  pageInfoStrong: string;
  control: string;
  pageButton: string;
  pageActive: string;
  pageInactive: string;
  ellipsis: string;
};

const lightClasses: VariantClasses = {
  nav: "mt-10 flex flex-col gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between",
  summary: "text-sm text-slate-500",
  summaryStrong: "font-semibold text-slate-700",
  pageInfo: "text-sm font-medium text-slate-500 sm:ml-1",
  pageInfoStrong: "font-bold text-slate-700",
  control: controlClass,
  pageButton: pageButtonClass,
  pageActive: "bg-brand-navy text-white shadow-sm",
  pageInactive:
    "border border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-brand-navy",
  ellipsis: ellipsisClass,
};

const darkClasses: VariantClasses = {
  nav: "mt-8 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between",
  summary: "text-sm text-slate-500",
  summaryStrong: "font-semibold text-slate-200",
  pageInfo: "text-sm font-medium text-slate-500 sm:ml-1",
  pageInfoStrong: "font-bold text-slate-200",
  control:
    "inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-slate-900/70 px-2.5 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-white/[0.02] disabled:text-slate-600 sm:px-3",
  pageButton:
    "grid size-9 shrink-0 place-items-center rounded-lg text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-40",
  pageActive: "border border-brand-accent/40 bg-brand-accent text-white shadow-sm",
  pageInactive: "border border-transparent text-slate-300 hover:border-white/10 hover:bg-white/10 hover:text-white",
  ellipsis: "grid size-9 shrink-0 place-items-center text-sm text-slate-600",
};

export function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  disabled = false,
  itemLabel = "components",
  className = "",
  ariaLabel,
  showSummary = true,
  variant = "light",
}: PaginationProps) {
  // A single page needs no controls at all.
  if (totalPages <= 1) return null;

  const styles = variant === "dark" ? darkClasses : lightClasses;
  const safePage = Math.min(Math.max(1, page), totalPages);
  const rangeStart = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, totalItems);
  const desktopItems = getPaginationItems(safePage, totalPages);
  const compactItems = getCompactPaginationItems(safePage, totalPages);

  const goTo = (nextPage: number) => {
    if (disabled || nextPage === safePage) return;
    if (nextPage < 1 || nextPage > totalPages) return;

    onPageChange(nextPage);
  };

  const renderItem = (item: PageItem, keyPrefix: string) => {
    if (item === "ellipsis") {
      return (
        <span key={`${keyPrefix}-ellipsis`} aria-hidden="true" className={styles.ellipsis}>
          …
        </span>
      );
    }

    return (
      <button
        key={`${keyPrefix}-${item}`}
        type="button"
        onClick={() => goTo(item)}
        disabled={disabled}
        aria-label={`Go to page ${item}`}
        aria-current={item === safePage ? "page" : undefined}
        className={`${styles.pageButton} ${
          item === safePage ? styles.pageActive : styles.pageInactive
        }`}
      >
        {item}
      </button>
    );
  };

  return (
    <nav
      aria-label={ariaLabel ?? `Component ${itemLabel} pagination`}
      className={`${styles.nav} ${className}`}
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
        {showSummary && (
          <p className={styles.summary} aria-live="polite">
            Showing{" "}
            <span className={styles.summaryStrong}>
              {rangeStart}–{rangeEnd}
            </span>{" "}
            of{" "}
            <span className={styles.summaryStrong}>
              {totalItems.toLocaleString("en-NG")}
            </span>{" "}
            {itemLabel}
          </p>
        )}

        <p aria-live="polite" className={styles.pageInfo}>
          Page <span className={styles.pageInfoStrong}>{safePage}</span> of{" "}
          <span className={styles.pageInfoStrong}>{totalPages}</span>
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <button
          type="button"
          onClick={() => goTo(safePage - 1)}
          disabled={disabled || safePage <= 1}
          className={styles.control}
          aria-label="Go to previous page"
        >
          <ChevronLeft className="size-4" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        {/* Compact window for narrow screens — never more than four slots. */}
        <div className="flex items-center justify-center gap-0.5 sm:hidden">
          {compactItems.map((item) => renderItem(item, "compact"))}
        </div>

        {/* Wider window for tablet and desktop. */}
        <div className="hidden items-center gap-1 sm:flex">
          {desktopItems.map((item) => renderItem(item, "desktop"))}
        </div>

        <button
          type="button"
          onClick={() => goTo(safePage + 1)}
          disabled={disabled || safePage >= totalPages}
          className={styles.control}
          aria-label="Go to next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="size-4" />
        </button>
      </div>
    </nav>
  );
}
