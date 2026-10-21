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
};

/**
 * Desktop window: first page, last page and a moving block of pages around
 * the active one. Ellipses collapse the unreachable middle of a long list.
 */
export function getPaginationItems(
  page: number,
  totalPages: number,
): PageItem[] {
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
export function getCompactPaginationItems(
  page: number,
  totalPages: number,
): PageItem[] {
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

const ellipsisClass =
  "grid size-9 shrink-0 place-items-center text-sm text-slate-400";

export function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  disabled = false,
  itemLabel = "components",
  className = "",
}: PaginationProps) {
  // A single page needs no controls at all.
  if (totalPages <= 1) return null;

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
        <span key={`${keyPrefix}-ellipsis`} aria-hidden="true" className={ellipsisClass}>
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
        className={`${pageButtonClass} ${
          item === safePage
            ? "bg-brand-navy text-white shadow-sm"
            : "border border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-brand-navy"
        }`}
      >
        {item}
      </button>
    );
  };

  return (
    <nav
      aria-label={`Component ${itemLabel} pagination`}
      className={`mt-10 flex flex-col gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
        <p className="text-sm text-slate-500" aria-live="polite">
          Showing{" "}
          <span className="font-semibold text-slate-700">
            {rangeStart}–{rangeEnd}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-slate-700">
            {totalItems.toLocaleString("en-NG")}
          </span>{" "}
          {itemLabel}
        </p>

        <p
          aria-live="polite"
          className="text-sm font-medium text-slate-500 sm:ml-1"
        >
          Page <span className="font-bold text-slate-700">{safePage}</span> of{" "}
          <span className="font-bold text-slate-700">{totalPages}</span>
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <button
          type="button"
          onClick={() => goTo(safePage - 1)}
          disabled={disabled || safePage <= 1}
          className={controlClass}
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
          className={controlClass}
          aria-label="Go to next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="size-4" />
        </button>
      </div>
    </nav>
  );
}
